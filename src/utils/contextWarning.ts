/**
 * Context Warning - Pre-send confirmation and context preview.
 * Shows users what will be sent to LLM providers and asks for confirmation.
 */

import * as fs from 'fs-extra';
import * as path from 'path';
import { glob } from 'glob';
import { logger } from './logger';
import { ContentRedactor } from './contentRedactor';
import { LeanIgnore, BINARY_FILE_PATTERNS, DEFAULT_IGNORE_PATTERNS } from './leanignore';

export interface ContextSummary {
  fileCount: number;
  totalSizeBytes: number;
  fileTypeBreakdown: Record<string, number>;
  estimatedRedactions: number;
  redactionBreakdown: Record<string, number>;
  sensitiveFilesExcluded: number;
}

export interface ContextPreviewOptions {
  includeSensitive?: boolean;
  noRedact?: boolean;
  sampleSize?: number;
}

/**
 * Perform a lightweight scan of the project to build a context preview.
 * Samples a subset of files to estimate redaction counts.
 */
export async function gatherContextPreview(
  projectPath: string,
  options: ContextPreviewOptions = {}
): Promise<ContextSummary> {
  const sampleSize = options.sampleSize ?? 20;

  // Set up LeanIgnore to count excluded files
  const leanIgnore = new LeanIgnore(projectPath, {
    includeSensitive: options.includeSensitive,
  });
  await leanIgnore.load();

  const baseIgnores = [
    ...DEFAULT_IGNORE_PATTERNS,
    ...BINARY_FILE_PATTERNS,
  ];

  // Get all candidate files (without sensitive ignores)
  const allFiles = await glob('**/*', {
    cwd: projectPath,
    ignore: baseIgnores,
    nodir: true,
    dot: true,
    maxDepth: 6,
  });

  // Get files after applying sensitive + leanignore patterns
  const filteredFiles = await glob('**/*', {
    cwd: projectPath,
    ignore: leanIgnore.mergeWith(baseIgnores),
    nodir: true,
    dot: true,
    maxDepth: 6,
  });

  const sensitiveFilesExcluded = allFiles.length - filteredFiles.length;

  // Build file type breakdown and total size
  const fileTypeBreakdown: Record<string, number> = {};
  let totalSizeBytes = 0;

  for (const file of filteredFiles) {
    const ext = path.extname(file) || '(no ext)';
    fileTypeBreakdown[ext] = (fileTypeBreakdown[ext] || 0) + 1;

    try {
      const stats = await fs.stat(path.join(projectPath, file));
      totalSizeBytes += stats.size;
    } catch {
      // Skip files we can't stat
    }
  }

  // Sample-based redaction estimate
  let estimatedRedactions = 0;
  const redactionBreakdown: Record<string, number> = {};

  if (!options.noRedact) {
    const redactor = new ContentRedactor();
    const textExtensions = new Set([
      '.ts', '.tsx', '.js', '.jsx', '.json', '.md', '.yml', '.yaml',
      '.env', '.cfg', '.conf', '.ini', '.toml', '.xml', '.html', '.css',
      '.py', '.rb', '.java', '.go', '.rs', '.php', '.sh', '.bash',
    ]);

    const textFiles = filteredFiles.filter(f => {
      const ext = path.extname(f).toLowerCase();
      return textExtensions.has(ext) || !ext;
    });

    // Sample a subset of text files
    const sampled = textFiles.sort(() => Math.random() - 0.5).slice(0, sampleSize);
    let sampledRedactions = 0;

    for (const file of sampled) {
      try {
        const content = await fs.readFile(path.join(projectPath, file), 'utf-8');
        const result = redactor.redact(content);
        sampledRedactions += result.redactionCount;
      } catch {
        // Skip unreadable files
      }
    }

    // Extrapolate from sample
    if (sampled.length > 0 && textFiles.length > 0) {
      const ratio = textFiles.length / sampled.length;
      estimatedRedactions = Math.round(sampledRedactions * ratio);
    }

    const stats = redactor.getStats();
    Object.assign(redactionBreakdown, stats.byType);
  }

  return {
    fileCount: filteredFiles.length,
    totalSizeBytes,
    fileTypeBreakdown,
    estimatedRedactions,
    redactionBreakdown,
    sensitiveFilesExcluded,
  };
}

/**
 * Build a ContextSummary from pre-gathered file content records.
 * Useful when content has already been read and you want stats.
 */
export function buildContextSummary(
  fileContents: Record<string, string>,
  options: { noRedact?: boolean } = {}
): ContextSummary {
  const fileTypeBreakdown: Record<string, number> = {};
  let totalSizeBytes = 0;
  let estimatedRedactions = 0;
  const redactionBreakdown: Record<string, number> = {};

  const redactor = options.noRedact ? null : new ContentRedactor();

  for (const [filePath, content] of Object.entries(fileContents)) {
    const ext = path.extname(filePath) || '(no ext)';
    fileTypeBreakdown[ext] = (fileTypeBreakdown[ext] || 0) + 1;
    totalSizeBytes += Buffer.byteLength(content, 'utf-8');

    if (redactor) {
      const result = redactor.redact(content);
      estimatedRedactions += result.redactionCount;
    }
  }

  if (redactor) {
    Object.assign(redactionBreakdown, redactor.getStats().byType);
  }

  return {
    fileCount: Object.keys(fileContents).length,
    totalSizeBytes,
    fileTypeBreakdown,
    estimatedRedactions,
    redactionBreakdown,
    sensitiveFilesExcluded: 0,
  };
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Display context summary and prompt user for confirmation.
 * Returns true if user confirms, false otherwise.
 */
export async function showContextWarningAndConfirm(
  summary: ContextSummary,
  options: { autoConfirm?: boolean } = {}
): Promise<boolean> {
  // Build the info box
  const lines: string[] = [
    `Files to process: ${summary.fileCount.toLocaleString()}`,
    `Total size: ${formatBytes(summary.totalSizeBytes)}`,
  ];

  if (summary.sensitiveFilesExcluded > 0) {
    lines.push(`Sensitive files excluded: ${summary.sensitiveFilesExcluded}`);
  }

  if (summary.estimatedRedactions > 0) {
    lines.push(`Estimated redactions: ~${summary.estimatedRedactions}`);
    const topTypes = Object.entries(summary.redactionBreakdown)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([type, count]) => `${type}: ${count}`)
      .join(', ');
    if (topTypes) {
      lines.push(`  Top types: ${topTypes}`);
    }
  } else if (summary.estimatedRedactions === 0) {
    lines.push('Estimated redactions: none detected');
  }

  // Top file types
  const topExtensions = Object.entries(summary.fileTypeBreakdown)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([ext, count]) => `${ext}(${count})`)
    .join(', ');
  if (topExtensions) {
    lines.push(`File types: ${topExtensions}`);
  }

  logger.box('Context Preview', lines);
  logger.newLine();

  if (options.autoConfirm) {
    logger.info('Auto-confirmed (--yes flag)');
    return true;
  }

  const { importInquirer } = await import('./esm');
  const inquirer = await importInquirer();
  const { confirmed } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirmed',
      message: 'Send this context to LLM provider?',
      default: false,
    },
  ]);

  return confirmed;
}
