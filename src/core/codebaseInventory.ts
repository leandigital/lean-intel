/**
 * CodebaseInventory - Pre-scans codebase to verify what exists
 * Used to prevent AI from fabricating imports/functions
 */

import { glob } from 'glob';
import * as path from 'path';
import * as fs from 'fs-extra';
import simpleGit from 'simple-git';
import { logger } from '../utils/logger';

export interface UtilityInfo {
  path: string;
  exports: string[]; // Exported function/class/const names
  verified: boolean;
}

export interface CodePattern {
  category: 'component' | 'hook' | 'api' | 'util' | 'config' | 'other';
  name: string;
  files: string[]; // Files where this pattern appears
  commonImports: string[]; // Common imports in these files
  usageCount: number;
  snippet?: string; // Small code sample
}

export interface AntiPattern {
  commitHash: string;
  message: string;
  category: string; // Extracted from commit message
  fileChanged: string;
}

export interface VerifiedInventory {
  utilities: Map<string, UtilityInfo>;
  patterns: CodePattern[];
  antiPatterns: AntiPattern[];
  stats: {
    totalFiles: number;
    utilityFiles: number;
    exportedFunctions: number;
    patternsFound: number;
    antiPatternsFound: number;
  };
  industryGaps?: string[]; // Optional compliance gaps
}

/**
 * Industry-specific configuration for scanning
 */
export interface IndustryConfig {
  name: string;
  additionalUtilityPatterns?: string[]; // Extra directories to scan for utilities
  additionalCodePatterns?: string[]; // Extra directories to analyze for patterns
  requiredUtilities?: string[]; // Expected utility names
  criticalPatterns?: string[]; // Important patterns to look for
  complianceChecks?: (inventory: VerifiedInventory) => string[]; // Custom validation
}

/**
 * Industry-specific configurations (opt-in, easily extensible)
 */
export const industryConfigs: Record<string, IndustryConfig> = {
  healthcare: {
    name: 'Healthcare',
    additionalUtilityPatterns: [
      'src/security/**/*.{ts,tsx,js,jsx}',
      'src/compliance/**/*.{ts,tsx,js,jsx}',
      'src/validators/**/*.{ts,tsx,js,jsx}',
      'api/mappers/**/*.{ts,tsx,js,jsx}',
      'api/record/**/*.{ts,tsx,js,jsx}',
      'common/mappers/**/*.{ts,tsx,js,jsx}',
      'src/fhir/**/*.{ts,tsx,js,jsx}',
      'src/phi/**/*.{ts,tsx,js,jsx}',
    ],
    additionalCodePatterns: [
      'src/security/**/*.{ts,tsx,js,jsx}',
      'src/compliance/**/*.{ts,tsx,js,jsx}',
      'api/mappers/**/*.{ts,tsx,js,jsx}',
    ],
    requiredUtilities: ['hashIdentifier', 'validateFHIR', 'sanitizePHI'],
    criticalPatterns: ['PHI handling', 'FHIR validation', 'patient data encryption'],
    complianceChecks: (inv) => {
      const gaps: string[] = [];
      // Check for security utilities
      const hasSecurityUtils = Array.from(inv.utilities.keys()).some((k) =>
        k.includes('security')
      );
      if (!hasSecurityUtils) {
        gaps.push('No security utilities found for PHI handling');
      }
      // Check for FHIR mappers
      const hasFHIRMappers = Array.from(inv.utilities.keys()).some(
        (k) => k.includes('mapper') || k.includes('fhir')
      );
      if (!hasFHIRMappers) {
        gaps.push('No FHIR mappers found for healthcare data transformation');
      }
      return gaps;
    },
  },
  fintech: {
    name: 'Fintech',
    additionalUtilityPatterns: [
      'src/payments/**/*.{ts,tsx,js,jsx}',
      'src/transactions/**/*.{ts,tsx,js,jsx}',
      'src/billing/**/*.{ts,tsx,js,jsx}',
      'src/stripe/**/*.{ts,tsx,js,jsx}',
      'src/encryption/**/*.{ts,tsx,js,jsx}',
    ],
    additionalCodePatterns: [
      'src/payments/**/*.{ts,tsx,js,jsx}',
      'src/transactions/**/*.{ts,tsx,js,jsx}',
    ],
    requiredUtilities: ['encryptPII', 'validatePayment', 'calculateFee'],
    criticalPatterns: ['PCI compliance', 'payment validation', 'transaction idempotency'],
    complianceChecks: (inv) => {
      const gaps: string[] = [];
      const hasPaymentUtils = Array.from(inv.utilities.keys()).some((k) =>
        k.includes('payment')
      );
      if (!hasPaymentUtils) {
        gaps.push('No payment utilities found for financial transactions');
      }
      return gaps;
    },
  },
  ecommerce: {
    name: 'E-commerce',
    additionalUtilityPatterns: [
      'src/cart/**/*.{ts,tsx,js,jsx}',
      'src/checkout/**/*.{ts,tsx,js,jsx}',
      'src/inventory/**/*.{ts,tsx,js,jsx}',
      'src/orders/**/*.{ts,tsx,js,jsx}',
    ],
    additionalCodePatterns: [
      'src/cart/**/*.{ts,tsx,js,jsx}',
      'src/checkout/**/*.{ts,tsx,js,jsx}',
    ],
    requiredUtilities: ['validateInventory', 'calculateShipping', 'processOrder'],
    criticalPatterns: ['cart management', 'inventory validation', 'order processing'],
    complianceChecks: (inv) => {
      const gaps: string[] = [];
      const hasInventoryUtils = Array.from(inv.utilities.keys()).some((k) =>
        k.includes('inventory')
      );
      if (!hasInventoryUtils) {
        gaps.push('No inventory utilities found for stock management');
      }
      return gaps;
    },
  },
};

export class CodebaseInventory {
  private rootPath: string;
  private git: ReturnType<typeof simpleGit>;
  private industryConfig?: IndustryConfig;

  constructor(rootPath: string, industry?: string) {
    this.rootPath = rootPath;
    this.git = simpleGit(rootPath);

    // Load industry-specific config if provided
    if (industry) {
      const normalizedIndustry = industry.toLowerCase();
      this.industryConfig = industryConfigs[normalizedIndustry];
      if (this.industryConfig) {
        logger.debug(`Loaded ${this.industryConfig.name} industry configuration`);
      }
    }
  }

  /**
   * Scan codebase and build verified inventory (with caching)
   */
  async scan(): Promise<VerifiedInventory> {
    const cacheFile = path.join(this.rootPath, '.lean-intel-cache.json');

    // Try to use cache
    const cachedInventory = await this.loadCache(cacheFile);
    if (cachedInventory) {
      logger.info('Using cached inventory (cache is fresh)');
      return cachedInventory;
    }

    const industryLabel = this.industryConfig ? ` (${this.industryConfig.name})` : '';
    logger.info(`Building codebase inventory${industryLabel}...`);

    const [utilities, patterns, antiPatterns] = await Promise.all([
      this.scanUtilities(),
      this.extractPatterns(),
      this.extractAntiPatterns(),
    ]);

    const stats = {
      totalFiles: await this.countTotalFiles(),
      utilityFiles: utilities.size,
      exportedFunctions: Array.from(utilities.values()).reduce(
        (sum, util) => sum + util.exports.length,
        0
      ),
      patternsFound: patterns.length,
      antiPatternsFound: antiPatterns.length,
    };

    logger.success(
      `Inventory complete: ${stats.utilityFiles} utility files, ${stats.exportedFunctions} exports, ${stats.patternsFound} patterns, ${stats.antiPatternsFound} anti-patterns`
    );

    const inventory: VerifiedInventory = { utilities, patterns, antiPatterns, stats };

    // Run industry-specific compliance checks if configured
    if (this.industryConfig?.complianceChecks) {
      const gaps = this.industryConfig.complianceChecks(inventory);
      if (gaps.length > 0) {
        inventory.industryGaps = gaps;
        logger.warn(`${this.industryConfig.name} compliance gaps found: ${gaps.length}`);
        gaps.forEach((gap) => logger.warn(`  - ${gap}`));
      }
    }

    // Save to cache
    await this.saveCache(cacheFile, inventory);

    return inventory;
  }

  /**
   * Load cached inventory if valid
   */
  private async loadCache(cacheFile: string): Promise<VerifiedInventory | null> {
    try {
      const exists = await fs.pathExists(cacheFile);
      if (!exists) {
        return null;
      }

      const stats = await fs.stat(cacheFile);
      const ageSeconds = (Date.now() - stats.mtimeMs) / 1000;

      // Cache is valid for 1 hour
      if (ageSeconds > 3600) {
        logger.debug(`Cache expired (${Math.round(ageSeconds / 60)} minutes old)`);
        return null;
      }

      // Check if code changed since cache was created
      const codeChanged = await this.isCodeChangedSince(stats.mtimeMs);
      if (codeChanged) {
        logger.debug('Cache invalidated (code changed since last scan)');
        return null;
      }

      const cacheData = await fs.readFile(cacheFile, 'utf-8');
      const parsed = JSON.parse(cacheData);

      // Convert utilities Map (stored as object in JSON)
      const utilities = new Map(Object.entries(parsed.utilities)) as Map<string, UtilityInfo>;

      return {
        utilities,
        patterns: parsed.patterns,
        antiPatterns: parsed.antiPatterns,
        stats: parsed.stats,
        industryGaps: parsed.industryGaps,
      };
    } catch (error) {
      logger.debug(`Cache load failed: ${(error as Error).message}`);
      return null;
    }
  }

  /**
   * Save inventory to cache
   */
  private async saveCache(cacheFile: string, inventory: VerifiedInventory): Promise<void> {
    try {
      // Convert Map to object for JSON serialization
      const cacheData = {
        utilities: Object.fromEntries(inventory.utilities),
        patterns: inventory.patterns,
        antiPatterns: inventory.antiPatterns,
        stats: inventory.stats,
        industryGaps: inventory.industryGaps,
      };

      await fs.writeFile(cacheFile, JSON.stringify(cacheData, null, 2), 'utf-8');
      logger.debug('Inventory cached to disk');
    } catch (error) {
      logger.debug(`Cache save failed: ${(error as Error).message}`);
    }
  }

  /**
   * Check if code changed since given timestamp (using git)
   */
  private async isCodeChangedSince(timestamp: number): Promise<boolean> {
    try {
      const log = await this.git.log({ maxCount: 1 });
      if (log.all.length === 0) {
        return false;
      }

      const lastCommitDate = new Date(log.all[0].date);
      return lastCommitDate.getTime() > timestamp;
    } catch (_error) {
      // If git fails, assume code changed (safe default)
      return true;
    }
  }

  /**
   * Auto-detect which utility directories exist in the codebase
   */
  private async detectUtilityDirectories(): Promise<string[]> {
    // Possible utility directories (ordered by likelihood)
    const possibleDirs = [
      'src/utils',
      'src/lib',
      'src/helpers',
      'src/core',
      'src/common',
      'src/shared',
      'utils',
      'lib',
      'helpers',
      'common',
      'shared',
      'src/services',
      'src/api',
      'src/auth',
      'src/guards',
      'src/middleware',
      'src/repositories',
      'src/database',
      'services',
      'api/services',
    ];

    const foundPatterns: string[] = [];

    for (const dir of possibleDirs) {
      try {
        const dirPath = path.join(this.rootPath, dir);
        const exists = await fs.pathExists(dirPath);
        if (exists) {
          foundPatterns.push(`${dir}/**/*.{ts,tsx,js,jsx}`);
        }
      } catch (_error) {
        // Directory doesn't exist, skip
      }
    }

    if (foundPatterns.length > 0) {
      logger.debug(`Auto-detected ${foundPatterns.length} utility directories`);
    }

    return foundPatterns;
  }

  /**
   * Scan utility files and extract exports
   */
  private async scanUtilities(): Promise<Map<string, UtilityInfo>> {
    const utilities = new Map<string, UtilityInfo>();

    // Auto-detect base utility directories
    const baseUtilPatterns = await this.detectUtilityDirectories();

    // Merge base patterns with industry-specific patterns (if configured)
    const utilPatterns = [...baseUtilPatterns];
    if (this.industryConfig?.additionalUtilityPatterns) {
      // Only add industry patterns if their directories exist
      for (const pattern of this.industryConfig.additionalUtilityPatterns) {
        const dir = pattern.split('/**')[0]; // Extract directory path
        try {
          const dirPath = path.join(this.rootPath, dir);
          const exists = await fs.pathExists(dirPath);
          if (exists) {
            utilPatterns.push(pattern);
          }
        } catch (_error) {
          // Directory doesn't exist, skip
        }
      }
      const addedCount = utilPatterns.length - baseUtilPatterns.length;
      if (addedCount > 0) {
        logger.debug(
          `Added ${addedCount} ${this.industryConfig.name}-specific utility patterns`
        );
      }
    }

    for (const pattern of utilPatterns) {
      try {
        const files = await glob(pattern, {
          cwd: this.rootPath,
          ignore: ['**/node_modules/**', '**/dist/**', '**/build/**'],
        });

        for (const file of files) {
          const fullPath = path.join(this.rootPath, file);
          const exports = await this.extractExportsFromFile(fullPath);

          if (exports.length > 0) {
            const key = file.replace(/\.(ts|tsx|js|jsx)$/, ''); // Remove extension
            utilities.set(key, {
              path: file,
              exports,
              verified: true,
            });
          }
        }
      } catch (_error) {
        // Pattern might not match any files, continue
        logger.debug(`No files found for pattern: ${pattern}`);
      }
    }

    return utilities;
  }

  /**
   * Extract exported functions/classes/consts from a file
   */
  private async extractExportsFromFile(filePath: string): Promise<string[]> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const exports: string[] = [];

      // Match export function/const/class declarations
      const exportPatterns = [
        /export\s+(?:async\s+)?function\s+(\w+)/g, // export function foo
        /export\s+const\s+(\w+)/g, // export const foo
        /export\s+class\s+(\w+)/g, // export class Foo
        /export\s+interface\s+(\w+)/g, // export interface Foo
        /export\s+type\s+(\w+)/g, // export type Foo
        /export\s+enum\s+(\w+)/g, // export enum Foo
        /export\s*{\s*([^}]+)\s*}/g, // export { foo, bar }
      ];

      for (const pattern of exportPatterns) {
        let match;
        while ((match = pattern.exec(content)) !== null) {
          if (match[1].includes(',')) {
            // Handle export { foo, bar }
            const names = match[1]
              .split(',')
              .map((s) => s.trim().split(/\s+as\s+/)[0].trim())
              .filter((s) => s && !s.startsWith('{') && !s.endsWith('}'));
            exports.push(...names);
          } else {
            exports.push(match[1].trim());
          }
        }
      }

      // Also check for default exports (less useful but worth tracking)
      const defaultExportMatch = content.match(/export\s+default\s+(\w+)/);
      if (defaultExportMatch) {
        exports.push(defaultExportMatch[1]);
      }

      return [...new Set(exports)]; // Deduplicate
    } catch (_error) {
      logger.debug(`Could not read file: ${filePath}`);
      return [];
    }
  }

  /**
   * Auto-detect which code pattern directories exist in the codebase
   */
  private async detectCodePatternDirectories(): Promise<string[]> {
    // Possible code pattern directories (ordered by likelihood)
    const possibleDirs = [
      'src/components',
      'src/hooks',
      'src/pages',
      'src/screens',
      'src/views',
      'api',
      'src/api',
      'src/services',
      'src/auth',
      'src/guards',
      'src/middleware',
      'components',
      'hooks',
      'pages',
      'screens',
    ];

    const foundPatterns: string[] = [];

    for (const dir of possibleDirs) {
      try {
        const dirPath = path.join(this.rootPath, dir);
        const exists = await fs.pathExists(dirPath);
        if (exists) {
          foundPatterns.push(`${dir}/**/*.{ts,tsx,js,jsx}`);
        }
      } catch (_error) {
        // Directory doesn't exist, skip
      }
    }

    return foundPatterns;
  }

  /**
   * Extract common code patterns from most-used files
   */
  private async extractPatterns(): Promise<CodePattern[]> {
    const patterns: CodePattern[] = [];

    // Auto-detect base code pattern directories
    const baseSamplePatterns = await this.detectCodePatternDirectories();

    // Merge base patterns with industry-specific patterns (if configured)
    const samplePatterns = [...baseSamplePatterns];
    if (this.industryConfig?.additionalCodePatterns) {
      // Only add industry patterns if their directories exist
      for (const pattern of this.industryConfig.additionalCodePatterns) {
        const dir = pattern.split('/**')[0]; // Extract directory path
        try {
          const dirPath = path.join(this.rootPath, dir);
          const exists = await fs.pathExists(dirPath);
          if (exists) {
            samplePatterns.push(pattern);
          }
        } catch (_error) {
          // Directory doesn't exist, skip
        }
      }
      const addedCount = samplePatterns.length - baseSamplePatterns.length;
      if (addedCount > 0) {
        logger.debug(
          `Added ${addedCount} ${this.industryConfig.name}-specific code patterns`
        );
      }
    }

    const importCounts = new Map<string, { files: Set<string>; category: string }>();

    for (const pattern of samplePatterns) {
      try {
        const files = await glob(pattern, {
          cwd: this.rootPath,
          ignore: ['**/node_modules/**', '**/dist/**', '**/build/**'],
        });

        for (const file of files.slice(0, 50)) {
          // Sample up to 50 files per pattern
          const fullPath = path.join(this.rootPath, file);
          const imports = await this.extractImportsFromFile(fullPath);

          imports.forEach((imp) => {
            if (!importCounts.has(imp)) {
              importCounts.set(imp, {
                files: new Set(),
                category: this.categorizePattern(pattern, file),
              });
            }
            importCounts.get(imp)!.files.add(file);
          });
        }
      } catch (_error) {
        logger.debug(`No files found for pattern: ${pattern}`);
      }
    }

    // Convert to patterns (used in 3+ files)
    for (const [imp, data] of importCounts.entries()) {
      if (data.files.size >= 3) {
        // Extract snippet from first file
        const snippet = await this.extractSnippetForPattern(imp, Array.from(data.files)[0]);

        patterns.push({
          category: data.category as CodePattern['category'],
          name: imp,
          files: Array.from(data.files),
          commonImports: [imp],
          usageCount: data.files.size,
          snippet,
        });
      }
    }

    return patterns;
  }

  /**
   * Extract code snippet for a pattern
   */
  private async extractSnippetForPattern(
    importName: string,
    filePath: string
  ): Promise<string | undefined> {
    try {
      const fullPath = path.join(this.rootPath, filePath);
      const content = await fs.readFile(fullPath, 'utf-8');

      // Extract function/class name from import (format: "functionName from path")
      const funcName = importName.split(' from ')[0].trim();

      // Escape special regex characters in function name
      const escapedName = funcName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

      // Check for re-exports first (no actual implementation in this file)
      const reExportMatch = content.match(new RegExp(`export\\s*\\{[^}]*${escapedName}[^}]*\\}\\s+from\\s+['"]([^'"]+)['"]`));
      if (reExportMatch) {
        return `// Re-exported from '${reExportMatch[1]}'`;
      }

      // Check for namespace exports (no actual implementation in this file)
      const namespaceExportMatch = content.match(new RegExp(`export\\s*\\*\\s+as\\s+${escapedName}\\s+from\\s+['"]([^'"]+)['"]`));
      if (namespaceExportMatch) {
        return `// Namespace export from '${namespaceExportMatch[1]}'`;
      }

      // Try multiple patterns to find the definition (ordered by likelihood in modern codebases)
      const patterns = [
        // Destructured exports
        // export const { foo, bar } = obj
        new RegExp(`export\\s+const\\s+\\{[^}]*${escapedName}[^}]*\\}\\s*=\\s*[^;]+;?`, 's'),

        // Arrow functions (most common in modern JS/TS)
        // export const foo = () => { ... }
        new RegExp(`export\\s+const\\s+${escapedName}\\s*[=:]\\s*(?:async\\s+)?\\([^)]*\\)\\s*=>\\s*\\{[\\s\\S]*?^\\}`, 'm'),
        // const foo = () => { ... }
        new RegExp(`const\\s+${escapedName}\\s*[=:]\\s*(?:async\\s+)?\\([^)]*\\)\\s*=>\\s*\\{[\\s\\S]*?^\\}`, 'm'),

        // React hooks pattern (very common)
        // export const useAuth = () => { ... }
        new RegExp(`export\\s+const\\s+${escapedName}\\s*=\\s*\\(\\)\\s*=>\\s*\\{[\\s\\S]*?^\\}`, 'm'),

        // Higher-order functions with single parameter
        // const withAuth = (Component) => { ... }
        new RegExp(`(?:export\\s+)?const\\s+${escapedName}\\s*=\\s*\\(\\w+\\)\\s*=>\\s*\\{[\\s\\S]*?^\\}`, 'm'),

        // Regular functions (traditional syntax)
        // export async function foo() { ... }
        new RegExp(`export\\s+(?:async\\s+)?function\\s+${escapedName}(?:<[^>]*>)?\\s*\\([^)]*\\)\\s*\\{[\\s\\S]*?^\\}`, 'm'),
        // function foo() { ... }
        new RegExp(`(?:async\\s+)?function\\s+${escapedName}(?:<[^>]*>)?\\s*\\([^)]*\\)\\s*\\{[\\s\\S]*?^\\}`, 'm'),

        // TypeScript function with generics
        // function map<T>(items: T[]) { ... }
        new RegExp(`(?:export\\s+)?(?:async\\s+)?function\\s+${escapedName}<[^>]+>\\s*\\([^)]*\\)\\s*\\{[\\s\\S]*?^\\}`, 'm'),

        // Classes
        // export class Foo { ... }
        new RegExp(`export\\s+class\\s+${escapedName}(?:<[^>]*>)?[^{]*\\{[\\s\\S]*?^\\}`, 'm'),
        // class Foo { ... }
        new RegExp(`class\\s+${escapedName}(?:<[^>]*>)?[^{]*\\{[\\s\\S]*?^\\}`, 'm'),

        // Const with object/function (fallback)
        // export const foo = { ... }
        new RegExp(`export\\s+const\\s+${escapedName}\\s*[=:]\\s*[^;]*;?`, 's'),
      ];

      for (const pattern of patterns) {
        const match = content.match(pattern);
        if (match) {
          // Limit to 15 lines / 500 chars
          const snippet = match[0].split('\n').slice(0, 15).join('\n');
          return snippet.length > 500 ? snippet.substring(0, 500) + '...' : snippet;
        }
      }

      return undefined;
    } catch (_error) {
      logger.debug(`Could not extract snippet for pattern: ${importName}`);
      return undefined;
    }
  }

  /**
   * Extract imports from a file
   */
  private async extractImportsFromFile(filePath: string): Promise<string[]> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const imports: string[] = [];

      // Match import statements
      const importRegex = /import\s+(?:{([^}]+)}|(\w+))\s+from\s+['"]([^'"]+)['"]/g;

      let match;
      while ((match = importRegex.exec(content)) !== null) {
        const [_, namedImports, defaultImport, from] = match;

        // Skip node_modules imports for pattern detection
        if (!from.startsWith('.') && !from.startsWith('@/')) {
          continue;
        }

        if (namedImports) {
          const names = namedImports
            .split(',')
            .map((s) => s.trim().split(/\s+as\s+/)[0].trim());
          imports.push(...names.map((n) => `${n} from ${from}`));
        }

        if (defaultImport) {
          imports.push(`${defaultImport} from ${from}`);
        }
      }

      return imports;
    } catch (_error) {
      return [];
    }
  }

  /**
   * Extract anti-patterns from git history
   */
  private async extractAntiPatterns(): Promise<AntiPattern[]> {
    try {
      const log = await this.git.log({
        maxCount: 100,
        '--grep': 'fix\\|bug\\|error\\|issue',
        '--regexp-ignore-case': null as unknown as string,
      });

      const antiPatterns: AntiPattern[] = [];

      for (const commit of log.all) {
        const msg = commit.message.toLowerCase();
        if (msg.includes('fix') || msg.includes('bug') || msg.includes('error')) {
          // Get files changed in this commit
          let fileChanged = '';
          try {
            const filesChanged = await this.git.show(['--name-only', '--format=', commit.hash]);
            // Get first file from the list (most relevant)
            fileChanged = filesChanged.split('\n').filter((f) => f.trim()).length > 0
              ? filesChanged.split('\n').filter((f) => f.trim())[0]
              : '';
          } catch (_error) {
            logger.debug(`Could not get files for commit ${commit.hash}`);
          }

          antiPatterns.push({
            commitHash: commit.hash.substring(0, 7),
            message: commit.message,
            category: this.categorizeAntiPattern(commit.message),
            fileChanged,
          });
        }
      }

      return antiPatterns;
    } catch (_error) {
      logger.debug('Could not read git history for anti-patterns');
      return [];
    }
  }

  /**
   * Categorize pattern based on file path and naming conventions
   */
  private categorizePattern(pattern: string, filePath?: string): string {
    // Use file path for more accurate categorization
    if (filePath) {
      const fileName = path.basename(filePath, path.extname(filePath));

      // React components (by directory or naming convention)
      if (
        filePath.includes('/components/') ||
        fileName.endsWith('Component') ||
        fileName.endsWith('Page') ||
        fileName.endsWith('Screen') ||
        fileName.endsWith('View') ||
        /^[A-Z]/.test(fileName) // PascalCase typically indicates component
      ) {
        return 'component';
      }

      // React hooks (by directory or naming convention)
      if (filePath.includes('/hooks/') || fileName.startsWith('use')) {
        return 'hook';
      }

      // API/Services
      if (
        filePath.includes('/api/') ||
        filePath.includes('/services/') ||
        fileName.endsWith('Api') ||
        fileName.endsWith('Service') ||
        fileName.endsWith('Client')
      ) {
        return 'api';
      }

      // Utilities/Helpers/Libraries
      if (
        filePath.includes('/utils/') ||
        filePath.includes('/lib/') ||
        filePath.includes('/helpers/') ||
        fileName.endsWith('Utils') ||
        fileName.endsWith('Helper')
      ) {
        return 'util';
      }

      // Configuration
      if (
        filePath.includes('/config/') ||
        fileName.startsWith('config') ||
        fileName.endsWith('Config') ||
        fileName === 'constants'
      ) {
        return 'config';
      }

      // Domain-specific patterns (healthcare, fintech, e-commerce)
      if (
        filePath.includes('/security/') ||
        filePath.includes('/compliance/') ||
        filePath.includes('/phi/') ||
        filePath.includes('/mappers/') ||
        filePath.includes('/fhir/') ||
        filePath.includes('/validators/') ||
        filePath.includes('/validation/') ||
        filePath.includes('/auth/') ||
        filePath.includes('/guards/') ||
        filePath.includes('/middleware/') ||
        filePath.includes('/payments/') ||
        filePath.includes('/transactions/') ||
        filePath.includes('/billing/') ||
        filePath.includes('/repositories/') ||
        filePath.includes('/cart/') ||
        filePath.includes('/checkout/') ||
        filePath.includes('/inventory/')
      ) {
        return 'util';
      }
    }

    // Fallback to glob pattern analysis if no file path provided
    if (pattern.includes('components')) return 'component';
    if (pattern.includes('hooks')) return 'hook';
    if (pattern.includes('api') || pattern.includes('services')) return 'api';
    if (pattern.includes('utils') || pattern.includes('lib') || pattern.includes('helpers')) return 'util';
    if (pattern.includes('config')) return 'config';

    return 'other';
  }

  /**
   * Categorize anti-pattern from commit message
   */
  private categorizeAntiPattern(message: string): string {
    const msg = message.toLowerCase();
    if (msg.includes('style') || msg.includes('css')) return 'styling';
    if (msg.includes('type') || msg.includes('typescript')) return 'types';
    if (msg.includes('import')) return 'imports';
    if (msg.includes('error') || msg.includes('exception')) return 'error-handling';
    if (msg.includes('security') || msg.includes('auth')) return 'security';
    if (msg.includes('performance') || msg.includes('slow')) return 'performance';
    return 'general';
  }

  /**
   * Count total code files
   */
  private async countTotalFiles(): Promise<number> {
    try {
      const files = await glob('**/*.{ts,tsx,js,jsx,py,go,java,rb,php}', {
        cwd: this.rootPath,
        ignore: ['**/node_modules/**', '**/dist/**', '**/build/**', '**/.git/**'],
      });
      return files.length;
    } catch (_error) {
      return 0;
    }
  }

  /**
   * Check if inventory has a specific export
   */
  hasExport(functionName: string, fromPath: string): boolean {
    // Normalize path
    const normalized = fromPath.replace(/^[@/]/, '').replace(/\.(ts|tsx|js|jsx)$/, '');

    for (const [key, util] of this.utilities.entries()) {
      if (key.includes(normalized) || util.path.includes(normalized)) {
        return util.exports.includes(functionName);
      }
    }

    return false;
  }

  private utilities = new Map<string, UtilityInfo>(); // Cache for hasExport

  /**
   * Set utilities cache (used after scan)
   */
  setUtilities(utilities: Map<string, UtilityInfo>) {
    this.utilities = utilities;
  }
}
