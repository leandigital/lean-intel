/**
 * LeanIgnore - Manages .leanignore file support and sensitive file exclusion defaults.
 * Prevents sensitive files (keys, credentials, env files) from being sent to LLM providers.
 */

import * as fs from 'fs-extra';
import * as path from 'path';

/**
 * Binary file patterns that are always excluded — useless to LLMs and inflate context size.
 * Uses glob syntax compatible with the `glob` package's `ignore` option.
 */
export const BINARY_FILE_PATTERNS: string[] = [
  // Images
  '**/*.png', '**/*.jpg', '**/*.jpeg', '**/*.gif', '**/*.webp', '**/*.bmp', '**/*.ico', '**/*.svg',
  // Fonts
  '**/*.woff', '**/*.woff2', '**/*.ttf', '**/*.eot', '**/*.otf',
  // Audio/Video
  '**/*.mp3', '**/*.mp4', '**/*.webm', '**/*.mov', '**/*.avi', '**/*.wav', '**/*.ogg', '**/*.flac',
  // Archives
  '**/*.zip', '**/*.tar', '**/*.gz', '**/*.bz2', '**/*.7z', '**/*.rar',
  // Documents
  '**/*.pdf', '**/*.doc', '**/*.docx', '**/*.xls', '**/*.xlsx', '**/*.ppt', '**/*.pptx',
  // Compiled / bytecode
  '**/*.exe', '**/*.dll', '**/*.so', '**/*.dylib', '**/*.o', '**/*.a', '**/*.lib',
  '**/*.class', '**/*.jar', '**/*.war', '**/*.pyc', '**/*.pyo', '**/*.wasm',
];

/**
 * Default directory patterns that are always excluded (non-source / generated).
 * Centralised here so every glob call uses the same list.
 */
export const DEFAULT_IGNORE_PATTERNS: string[] = [
  '**/node_modules/**',
  '**/dist/**',
  '**/build/**',
  '**/.git/**',
  '**/coverage/**',
  '**/.next/**',
  '**/out/**',
  '**/__pycache__/**',
  '**/.terraform/**',
  '**/Pods/**',
  '**/.gradle/**',
  '**/vendor/**',
];

/**
 * Default patterns for sensitive files that should never be sent to LLM providers.
 * Uses glob syntax compatible with the `glob` package's `ignore` option.
 */
export const SENSITIVE_FILE_PATTERNS: string[] = [
  '**/.env',
  '**/.env.*',
  '!**/.env.example',
  '**/*.pem',
  '**/*.key',
  '**/*.p12',
  '**/*.pfx',
  '**/credentials.*',
  '**/serviceAccountKey.json',
  '**/secrets/**',
  '**/.htpasswd',
  '**/id_rsa*',
  '**/*.jks',
  '**/*.keystore',
];

export interface LeanIgnoreOptions {
  /** If true, skip sensitive file defaults (include all files) */
  includeSensitive?: boolean;
}

export class LeanIgnore {
  private rootPath: string;
  private includeSensitive: boolean;
  private leanignorePatterns: string[];

  constructor(rootPath: string, options: LeanIgnoreOptions = {}) {
    this.rootPath = rootPath;
    this.includeSensitive = options.includeSensitive ?? false;
    this.leanignorePatterns = [];
  }

  /**
   * Load .leanignore file from project root.
   * Supports .gitignore syntax: comments (#), blank lines, negation (!).
   */
  async load(): Promise<void> {
    const leanignorePath = path.join(this.rootPath, '.leanignore');

    try {
      if (await fs.pathExists(leanignorePath)) {
        const content = await fs.readFile(leanignorePath, 'utf-8');
        this.leanignorePatterns = content
          .split('\n')
          .map(line => line.trim())
          .filter(line => line.length > 0 && !line.startsWith('#'));
      }
    } catch {
      // Silently ignore read errors
    }
  }

  /**
   * Get all ignore patterns (sensitive defaults + .leanignore entries).
   * Negation patterns (!) from .leanignore can override sensitive defaults.
   */
  getIgnorePatterns(): string[] {
    const patterns: string[] = [
      ...BINARY_FILE_PATTERNS,
      ...DEFAULT_IGNORE_PATTERNS,
    ];

    if (!this.includeSensitive) {
      patterns.push(...SENSITIVE_FILE_PATTERNS);
    }

    patterns.push(...this.leanignorePatterns);
    return patterns;
  }

  /**
   * Merge ignore patterns with an existing set of base ignores.
   * Returns a combined array suitable for glob's `ignore` option.
   */
  mergeWith(baseIgnores: string[]): string[] {
    return [...baseIgnores, ...this.getIgnorePatterns()];
  }
}
