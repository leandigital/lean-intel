/**
 * OutputValidator - Validates generated AI assistant files
 * Catches fabricated imports, oversized files, placeholders
 */

import { VerifiedInventory } from './codebaseInventory';

export interface ValidationIssue {
  type:
    | 'fabricated_import'
    | 'fabricated_function'
    | 'oversized'
    | 'placeholder'
    | 'generic_name';
  severity: 'error' | 'warning';
  line?: number;
  function?: string;
  from?: string;
  message: string;
  suggestion?: string;
  fixable: boolean;
}

export interface ValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
  fixable: number; // Count of auto-fixable issues
  stats: {
    totalLines: number;
    totalChars: number;
    imports: number;
    fabricatedImports: number;
    placeholders: number;
  };
}

export class OutputValidator {
  /**
   * Validate generated output against codebase inventory
   */
  validate(
    generated: string,
    inventory: VerifiedInventory,
    sizeMode: 'compact' | 'standard' | 'max'
  ): ValidationResult {
    const issues: ValidationIssue[] = [];

    // 1. Check fabricated imports
    issues.push(...this.validateImports(generated, inventory));

    // 2. Check file size
    issues.push(...this.validateSize(generated, sizeMode));

    // 3. Check for placeholders
    issues.push(...this.validateNoPlaceholders(generated));

    // 4. Check for generic names
    issues.push(...this.validateNoGenericNames(generated));

    const stats = this.gatherStats(generated, issues);

    return {
      valid: issues.filter((i) => i.severity === 'error').length === 0,
      issues,
      fixable: issues.filter((i) => i.fixable).length,
      stats,
    };
  }

  /**
   * Validate imports against inventory
   */
  private validateImports(
    generated: string,
    inventory: VerifiedInventory
  ): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    // Match import statements
    const importRegex = /import\s+{([^}]+)}\s+from\s+['"]([^'"]+)['"]/g;

    let match;
    while ((match = importRegex.exec(generated)) !== null) {
      // match[0] = full match, match[1] = imports, match[2] = from path
      const imports = match[1];
      const from = match[2];
      const functions = imports
        .split(',')
        .map((s) => s.trim().split(/\s+as\s+/)[0].trim());
      const lineNumber = this.getLineNumber(generated, match.index);

      // Skip node_modules imports (likely legitimate)
      if (!from.startsWith('.') && !from.startsWith('@/') && !from.startsWith('src/')) {
        continue;
      }

      for (const func of functions) {
        if (!this.inventoryHasExport(inventory, func, from)) {
          issues.push({
            type: 'fabricated_import',
            severity: 'error',
            line: lineNumber,
            function: func,
            from,
            message: `Import "${func}" from "${from}" not found in codebase`,
            suggestion: `Remove this import or verify it exists`,
            fixable: true, // Can be commented out or removed
          });
        }
      }
    }

    return issues;
  }

  /**
   * Check if inventory has an export
   */
  private inventoryHasExport(
    inventory: VerifiedInventory,
    functionName: string,
    fromPath: string
  ): boolean {
    // Normalize path
    const normalized = fromPath
      .replace(/^[@/]/, '')
      .replace(/^src\//, '')
      .replace(/\.(ts|tsx|js|jsx)$/, '');

    for (const [key, util] of inventory.utilities.entries()) {
      if (key.includes(normalized) || util.path.includes(normalized)) {
        return util.exports.includes(functionName);
      }
    }

    return false;
  }

  /**
   * Validate file size
   */
  private validateSize(
    generated: string,
    sizeMode: 'compact' | 'standard' | 'max'
  ): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    const sizeLimits: Record<string, { maxLines: number; maxChars: number; name: string }> = {
      compact: { maxLines: 350, maxChars: 15000, name: 'Compact' },
      standard: { maxLines: 600, maxChars: 35000, name: 'Standard' },
      max: { maxLines: 800, maxChars: 64000, name: 'Maximum' },
    };

    const limits = sizeLimits[sizeMode];
    const lineCount = generated.split('\n').length;
    const charCount = generated.length;

    if (lineCount > limits.maxLines || charCount > limits.maxChars) {
      issues.push({
        type: 'oversized',
        severity: 'warning',
        message: `File exceeds ${limits.name} mode limits: ${lineCount}/${limits.maxLines} lines, ${charCount}/${limits.maxChars} chars`,
        suggestion: `Consider reducing content or switching to larger size mode`,
        fixable: false,
      });
    }

    return issues;
  }

  /**
   * Check for unfilled placeholders
   */
  private validateNoPlaceholders(generated: string): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    const placeholderPatterns = [
      /\[Actual line count\]/g,
      /\[Actual character count\]/g,
      /\[Date\]/g,
      /\[Current date YYYY-MM-DD\]/g,
      /\[TODO:?[^\]]+\]/g,
      /\[FIXME:?[^\]]+\]/g,
      /\[Replace with[^\]]+\]/g,
      /\[Your[^\]]+\]/g,
      /\[Example[^\]]+\]/g,
    ];

    placeholderPatterns.forEach((pattern) => {
      let match;
      while ((match = pattern.exec(generated)) !== null) {
        const lineNumber = this.getLineNumber(generated, match.index);
        issues.push({
          type: 'placeholder',
          severity: 'error',
          line: lineNumber,
          message: `Unfilled placeholder found: ${match[0]}`,
          suggestion: `Replace with actual value or remove`,
          fixable: false,
        });
      }
    });

    return issues;
  }

  /**
   * Check for generic placeholder names
   */
  private validateNoGenericNames(generated: string): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    const genericPatterns = [
      /\byour-app\b/gi,
      /\bYourComponent\b/g,
      /\bYourClass\b/g,
      /\bYourService\b/g,
      /\bexample-service\b/gi,
      /\bSampleClass\b/g,
      /\bmyApp\b/g,
      /\[project-name\]/gi,
      /\[app-name\]/gi,
    ];

    genericPatterns.forEach((pattern) => {
      let match;
      while ((match = pattern.exec(generated)) !== null) {
        const lineNumber = this.getLineNumber(generated, match.index);
        issues.push({
          type: 'generic_name',
          severity: 'warning',
          line: lineNumber,
          message: `Generic placeholder name found: ${match[0]}`,
          suggestion: `Replace with actual project-specific name`,
          fixable: false,
        });
      }
    });

    return issues;
  }

  /**
   * Get line number from character index
   */
  private getLineNumber(text: string, index: number): number {
    return text.substring(0, index).split('\n').length;
  }

  /**
   * Gather statistics about generated content
   */
  private gatherStats(
    generated: string,
    issues: ValidationIssue[]
  ): ValidationResult['stats'] {
    const lines = generated.split('\n');
    const importRegex = /^import\s+/;
    const imports = lines.filter((line) => importRegex.test(line.trim())).length;

    const fabricatedImports = issues.filter((i) => i.type === 'fabricated_import').length;
    const placeholders = issues.filter((i) => i.type === 'placeholder').length;

    return {
      totalLines: lines.length,
      totalChars: generated.length,
      imports,
      fabricatedImports,
      placeholders,
    };
  }

  /**
   * Auto-fix fixable issues by replacing fabricated imports with actual examples from inventory
   */
  autoFix(generated: string, issues: ValidationIssue[], inventory?: VerifiedInventory): string {
    const lines = generated.split('\n');
    const issuesByLine = new Map<number, ValidationIssue[]>();

    // Group issues by line number
    issues
      .filter((i) => i.fixable && i.line && i.type === 'fabricated_import')
      .forEach((issue) => {
        if (issue.line) {
          const lineIndex = issue.line - 1; // 0-indexed
          if (!issuesByLine.has(lineIndex)) {
            issuesByLine.set(lineIndex, []);
          }
          issuesByLine.get(lineIndex)!.push(issue);
        }
      });

    // Fix each line with fabricated imports
    const fixed = lines
      .map((line, index) => {
        const lineIssues = issuesByLine.get(index);
        if (!lineIssues || lineIssues.length === 0) {
          return line;
        }

        // Try to find replacement from inventory
        if (inventory) {
          const replacement = this.findReplacementImport(line, lineIssues, inventory);
          if (replacement) {
            return replacement;
          }
        }

        // Fallback: comment out with explanation
        return `// REMOVED: ${line} // Reason: Import not found in codebase`;
      })
      .join('\n');

    return fixed;
  }

  /**
   * Find a replacement import from the verified inventory
   */
  private findReplacementImport(
    _originalLine: string,
    issues: ValidationIssue[],
    inventory: VerifiedInventory
  ): string | null {
    // Extract the fabricated function names from issues
    const fabricatedFunctions = issues
      .filter((i) => i.function)
      .map((i) => i.function!);

    if (fabricatedFunctions.length === 0) {
      return null;
    }

    // Find similar utilities in the inventory
    const replacements: Array<{ name: string; path: string; export: string }> = [];

    for (const funcName of fabricatedFunctions) {
      const match = this.findBestMatchingUtility(funcName, inventory);
      if (match) {
        replacements.push(match);
      }
    }

    if (replacements.length === 0) {
      // No matches found - provide a helpful comment with actual examples
      const actualExamples = this.getActualImportExamples(inventory, 2);
      if (actualExamples.length > 0) {
        return `// REPLACED: Original import not found. Actual utilities available:\n${actualExamples.map((ex) => `// ${ex}`).join('\n')}`;
      }
      return null;
    }

    // Build replacement import statement
    if (replacements.length === 1) {
      const r = replacements[0];
      return `import { ${r.export} } from '${this.formatImportPath(r.path)}'; // Source: ${r.path}`;
    }

    // Multiple replacements - group by path
    const byPath = new Map<string, string[]>();
    for (const r of replacements) {
      if (!byPath.has(r.path)) {
        byPath.set(r.path, []);
      }
      byPath.get(r.path)!.push(r.export);
    }

    const importLines: string[] = [];
    for (const [filePath, exports] of byPath.entries()) {
      importLines.push(
        `import { ${exports.join(', ')} } from '${this.formatImportPath(filePath)}'; // Source: ${filePath}`
      );
    }

    return importLines.join('\n');
  }

  /**
   * Find the best matching utility for a fabricated function name
   */
  private findBestMatchingUtility(
    funcName: string,
    inventory: VerifiedInventory
  ): { name: string; path: string; export: string } | null {
    const funcNameLower = funcName.toLowerCase();
    let bestMatch: { name: string; path: string; export: string; score: number } | null = null;

    for (const [utilName, util] of inventory.utilities.entries()) {
      for (const exportName of util.exports) {
        const exportLower = exportName.toLowerCase();

        // Calculate similarity score
        let score = 0;

        // Exact match (case-insensitive)
        if (exportLower === funcNameLower) {
          score = 100;
        }
        // Prefix match (e.g., "validate" matches "validateFHIR")
        else if (exportLower.startsWith(funcNameLower) || funcNameLower.startsWith(exportLower)) {
          score = 70;
        }
        // Contains match
        else if (exportLower.includes(funcNameLower) || funcNameLower.includes(exportLower)) {
          score = 50;
        }
        // Keyword overlap (split by camelCase)
        else {
          const funcKeywords = this.extractKeywords(funcName);
          const exportKeywords = this.extractKeywords(exportName);
          const overlap = funcKeywords.filter((k) => exportKeywords.includes(k));
          if (overlap.length > 0) {
            score = 30 * overlap.length;
          }
        }

        if (score > 0 && (!bestMatch || score > bestMatch.score)) {
          bestMatch = { name: utilName, path: util.path, export: exportName, score };
        }
      }
    }

    if (bestMatch && bestMatch.score >= 30) {
      return { name: bestMatch.name, path: bestMatch.path, export: bestMatch.export };
    }

    return null;
  }

  /**
   * Extract keywords from camelCase/PascalCase name
   */
  private extractKeywords(name: string): string[] {
    return name
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .toLowerCase()
      .split(/\s+/)
      .filter((k) => k.length > 2);
  }

  /**
   * Get actual import examples from inventory
   */
  private getActualImportExamples(inventory: VerifiedInventory, count: number): string[] {
    const examples: string[] = [];
    const entries = Array.from(inventory.utilities.entries());

    for (let i = 0; i < Math.min(count, entries.length); i++) {
      const [, util] = entries[i];
      if (util.exports.length > 0) {
        const exports = util.exports.slice(0, 3).join(', ');
        examples.push(`import { ${exports} } from '${this.formatImportPath(util.path)}';`);
      }
    }

    return examples;
  }

  /**
   * Format path for import statement
   */
  private formatImportPath(filePath: string): string {
    // Remove file extension
    let formatted = filePath.replace(/\.(ts|tsx|js|jsx)$/, '');

    // Convert to relative import if it starts with src/
    if (formatted.startsWith('src/')) {
      formatted = '@/' + formatted.substring(4);
    } else if (!formatted.startsWith('.') && !formatted.startsWith('@')) {
      formatted = './' + formatted;
    }

    return formatted;
  }
}
