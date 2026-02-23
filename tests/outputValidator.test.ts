/**
 * Tests for OutputValidator
 */

import { OutputValidator } from '../src/core/outputValidator';
import { VerifiedInventory, UtilityInfo } from '../src/core/codebaseInventory';

// Helper to create a mock inventory
function createMockInventory(
  utilities: Record<string, { path: string; exports: string[] }>
): VerifiedInventory {
  const utilitiesMap = new Map<string, UtilityInfo>();
  for (const [key, value] of Object.entries(utilities)) {
    utilitiesMap.set(key, {
      path: value.path,
      exports: value.exports,
      verified: true,
    });
  }
  return {
    utilities: utilitiesMap,
    patterns: [],
    antiPatterns: [],
    stats: {
      totalFiles: 100,
      utilityFiles: Object.keys(utilities).length,
      exportedFunctions: Object.values(utilities).reduce((sum, u) => sum + u.exports.length, 0),
      patternsFound: 0,
      antiPatternsFound: 0,
    },
  };
}

describe('OutputValidator', () => {
  let validator: OutputValidator;

  beforeEach(() => {
    validator = new OutputValidator();
  });

  describe('validate', () => {
    describe('import validation', () => {
      it('should pass valid imports that exist in inventory', () => {
        const inventory = createMockInventory({
          'src/utils/helpers': {
            path: 'src/utils/helpers.ts',
            exports: ['formatDate', 'parseJSON'],
          },
        });

        const generated = `import { formatDate } from '@/utils/helpers';

// Some content
const date = formatDate(new Date());`;

        const result = validator.validate(generated, inventory, 'max');

        expect(result.valid).toBe(true);
        expect(result.issues.filter((i) => i.type === 'fabricated_import')).toHaveLength(0);
      });

      it('should detect fabricated imports not in inventory', () => {
        const inventory = createMockInventory({
          'src/utils/helpers': {
            path: 'src/utils/helpers.ts',
            exports: ['formatDate'],
          },
        });

        const generated = `import { nonExistentFunction } from '@/utils/helpers';`;

        const result = validator.validate(generated, inventory, 'max');

        expect(result.valid).toBe(false);
        expect(result.issues).toContainEqual(
          expect.objectContaining({
            type: 'fabricated_import',
            severity: 'error',
            function: 'nonExistentFunction',
          })
        );
      });

      it('should skip node_modules imports', () => {
        const inventory = createMockInventory({});

        const generated = `import { useState } from 'react';
import { z } from 'zod';`;

        const result = validator.validate(generated, inventory, 'max');

        expect(result.issues.filter((i) => i.type === 'fabricated_import')).toHaveLength(0);
      });

      it('should handle multiple imports from same file', () => {
        const inventory = createMockInventory({
          'src/utils/auth': {
            path: 'src/utils/auth.ts',
            exports: ['login', 'logout'],
          },
        });

        const generated = `import { login, logout, fakeFunction } from '@/utils/auth';`;

        const result = validator.validate(generated, inventory, 'max');

        expect(result.issues.filter((i) => i.type === 'fabricated_import')).toHaveLength(1);
        expect(result.issues[0].function).toBe('fakeFunction');
      });

      it('should handle aliased imports', () => {
        const inventory = createMockInventory({
          'src/utils/helpers': {
            path: 'src/utils/helpers.ts',
            exports: ['formatDate'],
          },
        });

        const generated = `import { formatDate as fd } from '@/utils/helpers';`;

        const result = validator.validate(generated, inventory, 'max');

        expect(result.issues.filter((i) => i.type === 'fabricated_import')).toHaveLength(0);
      });
    });

    describe('size validation', () => {
      it('should pass files within compact limits', () => {
        const inventory = createMockInventory({});
        const generated = 'Line\n'.repeat(300); // 300 lines

        const result = validator.validate(generated, inventory, 'compact');

        expect(result.issues.filter((i) => i.type === 'oversized')).toHaveLength(0);
      });

      it('should warn for files exceeding compact limits', () => {
        const inventory = createMockInventory({});
        const generated = 'Line\n'.repeat(400); // 400 lines > 350 limit

        const result = validator.validate(generated, inventory, 'compact');

        expect(result.issues).toContainEqual(
          expect.objectContaining({
            type: 'oversized',
            severity: 'warning',
          })
        );
      });

      it('should use different limits for standard mode', () => {
        const inventory = createMockInventory({});
        const generated = 'Line\n'.repeat(500); // 500 lines < 600 limit

        const result = validator.validate(generated, inventory, 'standard');

        expect(result.issues.filter((i) => i.type === 'oversized')).toHaveLength(0);
      });

      it('should use different limits for max mode', () => {
        const inventory = createMockInventory({});
        const generated = 'Line\n'.repeat(750); // 750 lines < 800 limit

        const result = validator.validate(generated, inventory, 'max');

        expect(result.issues.filter((i) => i.type === 'oversized')).toHaveLength(0);
      });
    });

    describe('placeholder validation', () => {
      it('should detect unfilled placeholders', () => {
        const inventory = createMockInventory({});
        const generated = `# Project Documentation

Lines: [Actual line count]
Date: [Date]`;

        const result = validator.validate(generated, inventory, 'max');

        expect(result.issues.filter((i) => i.type === 'placeholder')).toHaveLength(2);
      });

      it('should detect TODO placeholders', () => {
        const inventory = createMockInventory({});
        const generated = `# Setup

[TODO: Add installation steps]`;

        const result = validator.validate(generated, inventory, 'max');

        expect(result.issues).toContainEqual(
          expect.objectContaining({
            type: 'placeholder',
            severity: 'error',
          })
        );
      });

      it('should pass content without placeholders', () => {
        const inventory = createMockInventory({});
        const generated = `# Real Documentation

This is actual content with no placeholders.`;

        const result = validator.validate(generated, inventory, 'max');

        expect(result.issues.filter((i) => i.type === 'placeholder')).toHaveLength(0);
      });
    });

    describe('generic name validation', () => {
      it('should detect generic placeholder names', () => {
        const inventory = createMockInventory({});
        const generated = `import { Component } from 'your-app/components';

class YourComponent extends Component {}`;

        const result = validator.validate(generated, inventory, 'max');

        expect(result.issues.filter((i) => i.type === 'generic_name').length).toBeGreaterThan(0);
      });

      it('should pass content with real names', () => {
        const inventory = createMockInventory({});
        const generated = `import { UserProfile } from './components/UserProfile';

class AuthService {}`;

        const result = validator.validate(generated, inventory, 'max');

        expect(result.issues.filter((i) => i.type === 'generic_name')).toHaveLength(0);
      });
    });

    describe('stats gathering', () => {
      it('should count imports correctly', () => {
        const inventory = createMockInventory({
          'src/utils/a': { path: 'src/utils/a.ts', exports: ['funcA'] },
          'src/utils/b': { path: 'src/utils/b.ts', exports: ['funcB'] },
        });

        const generated = `import { funcA } from '@/utils/a';
import { funcB } from '@/utils/b';
import { useState } from 'react';

const x = 1;`;

        const result = validator.validate(generated, inventory, 'max');

        expect(result.stats.imports).toBe(3);
        expect(result.stats.totalLines).toBe(5);
      });

      it('should count fabricated imports', () => {
        const inventory = createMockInventory({
          'src/utils/helpers': { path: 'src/utils/helpers.ts', exports: ['real'] },
        });

        const generated = `import { real, fake1, fake2 } from '@/utils/helpers';`;

        const result = validator.validate(generated, inventory, 'max');

        expect(result.stats.fabricatedImports).toBe(2);
      });
    });
  });

  describe('autoFix', () => {
    it('should comment out fabricated imports when no inventory provided', () => {
      const issues = [
        {
          type: 'fabricated_import' as const,
          severity: 'error' as const,
          line: 1,
          function: 'fakeFunc',
          from: '@/utils/fake',
          message: 'Not found',
          fixable: true,
        },
      ];

      const generated = `import { fakeFunc } from '@/utils/fake';
const x = 1;`;

      const fixed = validator.autoFix(generated, issues);

      expect(fixed).toContain('// REMOVED:');
      expect(fixed).toContain('const x = 1;');
    });

    it('should replace fabricated imports with matching exports from inventory', () => {
      const inventory = createMockInventory({
        'src/utils/validation': {
          path: 'src/utils/validation.ts',
          exports: ['validateEmail', 'validatePhone'],
        },
      });

      const issues = [
        {
          type: 'fabricated_import' as const,
          severity: 'error' as const,
          line: 1,
          function: 'validateUser',
          from: '@/utils/fake',
          message: 'Not found',
          fixable: true,
        },
      ];

      const generated = `import { validateUser } from '@/utils/fake';
const x = 1;`;

      const fixed = validator.autoFix(generated, issues, inventory);

      // Should replace with similar function (validateEmail or validatePhone)
      expect(fixed).toContain('validate');
      expect(fixed).toContain('const x = 1;');
    });

    it('should provide examples when no match found', () => {
      const inventory = createMockInventory({
        'src/utils/helpers': {
          path: 'src/utils/helpers.ts',
          exports: ['formatDate', 'parseJSON'],
        },
      });

      const issues = [
        {
          type: 'fabricated_import' as const,
          severity: 'error' as const,
          line: 1,
          function: 'completelyDifferentFunction',
          from: '@/utils/fake',
          message: 'Not found',
          fixable: true,
        },
      ];

      const generated = `import { completelyDifferentFunction } from '@/utils/fake';`;

      const fixed = validator.autoFix(generated, issues, inventory);

      // Should show available utilities as examples
      expect(fixed).toContain('// REPLACED:');
      expect(fixed).toContain('Actual utilities available');
    });

    it('should not modify non-fixable issues', () => {
      const issues = [
        {
          type: 'oversized' as const,
          severity: 'warning' as const,
          message: 'File too big',
          fixable: false,
        },
      ];

      const generated = 'const x = 1;';

      const fixed = validator.autoFix(generated, issues);

      expect(fixed).toBe(generated);
    });

    it('should handle multiple fabricated imports on different lines', () => {
      const issues = [
        {
          type: 'fabricated_import' as const,
          severity: 'error' as const,
          line: 1,
          function: 'fake1',
          from: '@/utils/a',
          message: 'Not found',
          fixable: true,
        },
        {
          type: 'fabricated_import' as const,
          severity: 'error' as const,
          line: 2,
          function: 'fake2',
          from: '@/utils/b',
          message: 'Not found',
          fixable: true,
        },
      ];

      const generated = `import { fake1 } from '@/utils/a';
import { fake2 } from '@/utils/b';
const x = 1;`;

      const fixed = validator.autoFix(generated, issues);

      expect(fixed.split('\n').filter((l) => l.includes('// REMOVED:'))).toHaveLength(2);
      expect(fixed).toContain('const x = 1;');
    });
  });

  describe('extractKeywords', () => {
    it('should extract keywords from camelCase', () => {
      // Access private method through any cast for testing
      const keywords = (validator as any).extractKeywords('validateUserEmail');

      expect(keywords).toContain('validate');
      expect(keywords).toContain('user');
      expect(keywords).toContain('email');
    });

    it('should extract keywords from PascalCase', () => {
      const keywords = (validator as any).extractKeywords('UserAuthService');

      expect(keywords).toContain('user');
      expect(keywords).toContain('auth');
      expect(keywords).toContain('service');
    });

    it('should filter out short keywords', () => {
      const keywords = (validator as any).extractKeywords('getAB');

      // 'get' should be included (3 chars), 'a' and 'b' should be filtered
      expect(keywords).toContain('get');
      expect(keywords).not.toContain('a');
      expect(keywords).not.toContain('b');
    });
  });

  describe('formatImportPath', () => {
    it('should remove file extensions', () => {
      const formatted = (validator as any).formatImportPath('src/utils/helpers.ts');

      expect(formatted).not.toContain('.ts');
    });

    it('should convert src/ to @/', () => {
      const formatted = (validator as any).formatImportPath('src/utils/helpers.ts');

      expect(formatted).toBe('@/utils/helpers');
    });

    it('should add ./ prefix for non-standard paths', () => {
      const formatted = (validator as any).formatImportPath('utils/helpers.ts');

      expect(formatted).toBe('./utils/helpers');
    });

    it('should preserve @ prefix', () => {
      const formatted = (validator as any).formatImportPath('@/components/Button.tsx');

      expect(formatted).toBe('@/components/Button');
    });
  });

  describe('findBestMatchingUtility', () => {
    it('should find exact match', () => {
      const inventory = createMockInventory({
        'src/utils/auth': {
          path: 'src/utils/auth.ts',
          exports: ['login', 'logout'],
        },
      });

      const match = (validator as any).findBestMatchingUtility('login', inventory);

      expect(match).not.toBeNull();
      expect(match.export).toBe('login');
    });

    it('should find prefix match', () => {
      const inventory = createMockInventory({
        'src/utils/validation': {
          path: 'src/utils/validation.ts',
          exports: ['validateEmail', 'validatePhone'],
        },
      });

      const match = (validator as any).findBestMatchingUtility('validate', inventory);

      expect(match).not.toBeNull();
      expect(match.export).toMatch(/^validate/);
    });

    it('should find keyword match', () => {
      const inventory = createMockInventory({
        'src/utils/user': {
          path: 'src/utils/user.ts',
          exports: ['getUserById', 'updateUserProfile'],
        },
      });

      const match = (validator as any).findBestMatchingUtility('fetchUser', inventory);

      expect(match).not.toBeNull();
      expect(match.export).toContain('User');
    });

    it('should return null for no match', () => {
      const inventory = createMockInventory({
        'src/utils/math': {
          path: 'src/utils/math.ts',
          exports: ['add', 'subtract'],
        },
      });

      const match = (validator as any).findBestMatchingUtility('completelyUnrelatedFunction', inventory);

      expect(match).toBeNull();
    });
  });
});
