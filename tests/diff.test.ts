/**
 * Tests for DiffManager
 */

import { DiffManager, ChangedFile } from '../src/git/diff';

describe('DiffManager', () => {
  describe('categorizeChanges', () => {
    let diffManager: DiffManager;

    beforeEach(() => {
      // Create DiffManager with current directory (for method testing only)
      diffManager = new DiffManager(process.cwd());
    });

    it('should categorize component files', () => {
      const files: ChangedFile[] = [
        { path: 'src/components/Button.tsx', status: 'modified' },
        { path: 'src/components/Modal.vue', status: 'added' },
        { path: 'app/component/Header.svelte', status: 'modified' },
      ];

      const categories = diffManager.categorizeChanges(files);

      expect(categories.components).toHaveLength(3);
      expect(categories.components).toContain('src/components/Button.tsx');
      expect(categories.components).toContain('src/components/Modal.vue');
      expect(categories.components).toContain('app/component/Header.svelte');
    });

    it('should categorize route files', () => {
      const files: ChangedFile[] = [
        { path: 'src/routes/index.ts', status: 'modified' },
        { path: 'app/router/config.js', status: 'modified' },
        { path: 'src/pages/about.ts', status: 'added' },
      ];

      const categories = diffManager.categorizeChanges(files);

      expect(categories.routes).toHaveLength(3);
      expect(categories.routes).toContain('src/routes/index.ts');
      expect(categories.routes).toContain('app/router/config.js');
      expect(categories.routes).toContain('src/pages/about.ts');
    });

    it('should categorize API files', () => {
      const files: ChangedFile[] = [
        { path: 'src/api/users.ts', status: 'modified' },
        { path: 'src/services/auth.ts', status: 'modified' },
        { path: 'app/controllers/product.js', status: 'added' },
        { path: 'src/handlers/webhook.ts', status: 'modified' },
      ];

      const categories = diffManager.categorizeChanges(files);

      expect(categories.api).toHaveLength(4);
      expect(categories.api).toContain('src/api/users.ts');
      expect(categories.api).toContain('src/services/auth.ts');
      expect(categories.api).toContain('app/controllers/product.js');
    });

    it('should categorize config files', () => {
      const files: ChangedFile[] = [
        { path: 'config/database.json', status: 'modified' },
        { path: 'tsconfig.json', status: 'modified' },
        { path: 'webpack.config.js', status: 'modified' },
      ];

      const categories = diffManager.categorizeChanges(files);

      expect(categories.config).toHaveLength(3);
      expect(categories.config).toContain('config/database.json');
      expect(categories.config).toContain('tsconfig.json');
      expect(categories.config).toContain('webpack.config.js');
    });

    it('should categorize database files', () => {
      const files: ChangedFile[] = [
        { path: 'src/models/User.ts', status: 'modified' },
        { path: 'prisma/schema/tables.ts', status: 'modified' },
        { path: 'db/migrations/001_create_users.sql', status: 'added' },
        { path: 'src/entities/Product.ts', status: 'modified' },
      ];

      const categories = diffManager.categorizeChanges(files);

      expect(categories.database).toHaveLength(4);
      expect(categories.database).toContain('src/models/User.ts');
      expect(categories.database).toContain('prisma/schema/tables.ts');
    });

    it('should categorize styling files', () => {
      const files: ChangedFile[] = [
        { path: 'src/styles/global.css', status: 'modified' },
        { path: 'src/css/theme.css', status: 'modified' },
      ];

      const categories = diffManager.categorizeChanges(files);

      expect(categories.styling).toHaveLength(2);
      expect(categories.styling).toContain('src/styles/global.css');
      expect(categories.styling).toContain('src/css/theme.css');
    });

    it('should categorize test files', () => {
      const files: ChangedFile[] = [
        { path: 'tests/unit/Button.test.ts', status: 'modified' },
        { path: 'src/__tests__/utils.spec.js', status: 'modified' },
        { path: 'test/integration/api.test.ts', status: 'added' },
      ];

      const categories = diffManager.categorizeChanges(files);

      expect(categories.tests).toHaveLength(3);
      expect(categories.tests).toContain('tests/unit/Button.test.ts');
    });

    it('should exclude deleted files from categorization', () => {
      const files: ChangedFile[] = [
        { path: 'src/components/Button.tsx', status: 'deleted' },
        { path: 'src/components/Modal.tsx', status: 'modified' },
      ];

      const categories = diffManager.categorizeChanges(files);

      // Deleted file should not be included
      expect(categories.components).toHaveLength(1);
      expect(categories.components).toContain('src/components/Modal.tsx');
      expect(categories.components).not.toContain('src/components/Button.tsx');
    });

    it('should put uncategorized files in other', () => {
      const files: ChangedFile[] = [
        { path: 'README.md', status: 'modified' },
        { path: 'LICENSE', status: 'modified' },
        { path: 'scripts/deploy.sh', status: 'added' },
      ];

      const categories = diffManager.categorizeChanges(files);

      expect(categories.other).toHaveLength(3);
      expect(categories.other).toContain('README.md');
      expect(categories.other).toContain('LICENSE');
    });
  });

  describe('getChangeSummary', () => {
    let diffManager: DiffManager;

    beforeEach(() => {
      diffManager = new DiffManager(process.cwd());
    });

    it('should count file statuses correctly', () => {
      const files: ChangedFile[] = [
        { path: 'file1.ts', status: 'added' },
        { path: 'file2.ts', status: 'added' },
        { path: 'file3.ts', status: 'modified' },
        { path: 'file4.ts', status: 'modified' },
        { path: 'file5.ts', status: 'modified' },
        { path: 'file6.ts', status: 'deleted' },
        { path: 'file7.ts', status: 'renamed', oldPath: 'old.ts' },
      ];

      const summary = diffManager.getChangeSummary(files);

      expect(summary.added).toBe(2);
      expect(summary.modified).toBe(3);
      expect(summary.deleted).toBe(1);
      expect(summary.renamed).toBe(1);
      expect(summary.total).toBe(7);
    });

    it('should handle empty array', () => {
      const summary = diffManager.getChangeSummary([]);

      expect(summary.added).toBe(0);
      expect(summary.modified).toBe(0);
      expect(summary.deleted).toBe(0);
      expect(summary.renamed).toBe(0);
      expect(summary.total).toBe(0);
    });
  });

  describe('shortHash', () => {
    let diffManager: DiffManager;

    beforeEach(() => {
      diffManager = new DiffManager(process.cwd());
    });

    it('should return first 7 characters', () => {
      const hash = 'abc1234567890def';
      expect(diffManager.shortHash(hash)).toBe('abc1234');
    });

    it('should handle short hashes', () => {
      const hash = 'abc';
      expect(diffManager.shortHash(hash)).toBe('abc');
    });
  });
});
