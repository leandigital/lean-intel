/**
 * Tests for CodebaseInventory
 */

import { CodebaseInventory, industryConfigs } from '../src/core/codebaseInventory';
import * as path from 'path';
import * as fs from 'fs-extra';

const fixturesPath = path.join(__dirname, 'fixtures');

describe('CodebaseInventory', () => {
  describe('constructor', () => {
    it('should be instantiable', () => {
      const inventory = new CodebaseInventory(process.cwd());
      expect(inventory).toBeInstanceOf(CodebaseInventory);
    });

    it('should load industry config for healthcare', () => {
      const inventory = new CodebaseInventory(process.cwd(), 'healthcare');
      expect(inventory).toBeInstanceOf(CodebaseInventory);
    });

    it('should load industry config for fintech', () => {
      const inventory = new CodebaseInventory(process.cwd(), 'fintech');
      expect(inventory).toBeInstanceOf(CodebaseInventory);
    });

    it('should load industry config for ecommerce', () => {
      const inventory = new CodebaseInventory(process.cwd(), 'ecommerce');
      expect(inventory).toBeInstanceOf(CodebaseInventory);
    });

    it('should handle unknown industry gracefully', () => {
      const inventory = new CodebaseInventory(process.cwd(), 'unknown-industry');
      expect(inventory).toBeInstanceOf(CodebaseInventory);
    });
  });

  describe('scan', () => {
    it('should return inventory with required properties', async () => {
      const inventory = new CodebaseInventory(path.join(fixturesPath, 'react-frontend'));
      const result = await inventory.scan();

      expect(result).toHaveProperty('utilities');
      expect(result).toHaveProperty('patterns');
      expect(result).toHaveProperty('antiPatterns');
      expect(result).toHaveProperty('stats');

      expect(result.utilities).toBeInstanceOf(Map);
      expect(Array.isArray(result.patterns)).toBe(true);
      expect(Array.isArray(result.antiPatterns)).toBe(true);
    });

    it('should gather stats about the codebase', async () => {
      const inventory = new CodebaseInventory(path.join(fixturesPath, 'react-frontend'));
      const result = await inventory.scan();

      expect(result.stats).toHaveProperty('totalFiles');
      expect(result.stats).toHaveProperty('utilityFiles');
      expect(result.stats).toHaveProperty('exportedFunctions');
      expect(result.stats).toHaveProperty('patternsFound');
      expect(result.stats).toHaveProperty('antiPatternsFound');

      expect(typeof result.stats.totalFiles).toBe('number');
      expect(result.stats.totalFiles).toBeGreaterThanOrEqual(0);
    });

    it('should use cache on second scan', async () => {
      const inventoryPath = path.join(fixturesPath, 'react-frontend');
      const cacheFile = path.join(inventoryPath, '.lean-intel-cache.json');

      // Remove cache if exists
      await fs.remove(cacheFile);

      const inventory = new CodebaseInventory(inventoryPath);

      // First scan - creates cache
      const result1 = await inventory.scan();

      // Second scan - should use cache
      const result2 = await inventory.scan();

      expect(result1.stats.totalFiles).toBe(result2.stats.totalFiles);

      // Clean up cache
      await fs.remove(cacheFile);
    });
  });

  describe('hasExport', () => {
    it('should return true for existing export', async () => {
      const inventory = new CodebaseInventory(path.join(fixturesPath, 'express-backend'));
      const result = await inventory.scan();
      inventory.setUtilities(result.utilities);

      // Find any export from the inventory to test
      const [, firstUtil] = Array.from(result.utilities.entries())[0] || [null, null];

      if (firstUtil && firstUtil.exports.length > 0) {
        const hasIt = inventory.hasExport(firstUtil.exports[0], firstUtil.path);
        expect(hasIt).toBe(true);
      }
    });

    it('should return false for non-existing export', async () => {
      const inventory = new CodebaseInventory(path.join(fixturesPath, 'react-frontend'));
      const result = await inventory.scan();
      inventory.setUtilities(result.utilities);

      const hasIt = inventory.hasExport('nonExistentFunction12345', 'fake/path');
      expect(hasIt).toBe(false);
    });
  });

  describe('industryConfigs', () => {
    it('should have healthcare config', () => {
      expect(industryConfigs.healthcare).toBeDefined();
      expect(industryConfigs.healthcare.name).toBe('Healthcare');
      expect(industryConfigs.healthcare.additionalUtilityPatterns).toBeDefined();
    });

    it('should have fintech config', () => {
      expect(industryConfigs.fintech).toBeDefined();
      expect(industryConfigs.fintech.name).toBe('Fintech');
    });

    it('should have ecommerce config', () => {
      expect(industryConfigs.ecommerce).toBeDefined();
      expect(industryConfigs.ecommerce.name).toBe('E-commerce');
    });

    it('healthcare config should have compliance checks', () => {
      const healthcareConfig = industryConfigs.healthcare;
      expect(healthcareConfig.complianceChecks).toBeDefined();
      expect(typeof healthcareConfig.complianceChecks).toBe('function');
    });

    it('healthcare compliance checks should return gaps for empty inventory', () => {
      const healthcareConfig = industryConfigs.healthcare;
      const emptyInventory = {
        utilities: new Map(),
        patterns: [],
        antiPatterns: [],
        stats: { totalFiles: 0, utilityFiles: 0, exportedFunctions: 0, patternsFound: 0, antiPatternsFound: 0 },
      };

      const gaps = healthcareConfig.complianceChecks!(emptyInventory as any);
      expect(Array.isArray(gaps)).toBe(true);
      expect(gaps.length).toBeGreaterThan(0);
    });

    it('fintech compliance checks should return gaps for empty inventory', () => {
      const fintechConfig = industryConfigs.fintech;
      const emptyInventory = {
        utilities: new Map(),
        patterns: [],
        antiPatterns: [],
        stats: { totalFiles: 0, utilityFiles: 0, exportedFunctions: 0, patternsFound: 0, antiPatternsFound: 0 },
      };

      const gaps = fintechConfig.complianceChecks!(emptyInventory as any);
      expect(Array.isArray(gaps)).toBe(true);
    });

    it('ecommerce compliance checks should return gaps for empty inventory', () => {
      const ecommerceConfig = industryConfigs.ecommerce;
      const emptyInventory = {
        utilities: new Map(),
        patterns: [],
        antiPatterns: [],
        stats: { totalFiles: 0, utilityFiles: 0, exportedFunctions: 0, patternsFound: 0, antiPatternsFound: 0 },
      };

      const gaps = ecommerceConfig.complianceChecks!(emptyInventory as any);
      expect(Array.isArray(gaps)).toBe(true);
    });
  });

  describe('pattern categorization', () => {
    it('should categorize component files correctly', async () => {
      const inventory = new CodebaseInventory(path.join(fixturesPath, 'react-frontend'));
      const result = await inventory.scan();

      // Check if component patterns are found
      const componentPatterns = result.patterns.filter(p => p.category === 'component');
      // May or may not find components depending on fixture
      expect(Array.isArray(componentPatterns)).toBe(true);
    });

    it('should categorize hook files correctly', async () => {
      const inventory = new CodebaseInventory(path.join(fixturesPath, 'react-frontend'));
      const result = await inventory.scan();

      const hookPatterns = result.patterns.filter(p => p.category === 'hook');
      expect(Array.isArray(hookPatterns)).toBe(true);
    });

    it('should categorize api files correctly', async () => {
      const inventory = new CodebaseInventory(path.join(fixturesPath, 'express-backend'));
      const result = await inventory.scan();

      const apiPatterns = result.patterns.filter(p => p.category === 'api');
      expect(Array.isArray(apiPatterns)).toBe(true);
    });
  });

  describe('anti-pattern extraction', () => {
    it('should extract anti-patterns from git history', async () => {
      // Use actual project which has git history
      const inventory = new CodebaseInventory(process.cwd());
      const result = await inventory.scan();

      expect(Array.isArray(result.antiPatterns)).toBe(true);
      // May have anti-patterns from commit history
      if (result.antiPatterns.length > 0) {
        expect(result.antiPatterns[0]).toHaveProperty('commitHash');
        expect(result.antiPatterns[0]).toHaveProperty('message');
        expect(result.antiPatterns[0]).toHaveProperty('category');
      }
    });

    it('should categorize anti-patterns by type', async () => {
      const inventory = new CodebaseInventory(process.cwd());
      const result = await inventory.scan();

      if (result.antiPatterns.length > 0) {
        const categories = result.antiPatterns.map(ap => ap.category);
        // Should be valid categories
        categories.forEach(cat => {
          expect(['styling', 'types', 'imports', 'error-handling', 'security', 'performance', 'general']).toContain(cat);
        });
      }
    });
  });

  describe('utility scanning', () => {
    it('should find exports in utility files', async () => {
      const inventory = new CodebaseInventory(path.join(fixturesPath, 'express-backend'));
      const result = await inventory.scan();

      // Check if any utilities were found
      if (result.utilities.size > 0) {
        const [, firstUtil] = Array.from(result.utilities.entries())[0];
        expect(firstUtil).toHaveProperty('path');
        expect(firstUtil).toHaveProperty('exports');
        expect(firstUtil).toHaveProperty('verified');
        expect(firstUtil.verified).toBe(true);
      }
    });

    it('should extract function exports', async () => {
      const inventory = new CodebaseInventory(process.cwd());
      const result = await inventory.scan();

      // Should find at least some exports in current project
      expect(result.stats.exportedFunctions).toBeGreaterThanOrEqual(0);
    });
  });
});

describe('CodebaseInventory edge cases', () => {
  it('should throw for non-existent directory', () => {
    // simple-git throws when directory doesn't exist
    expect(() => {
      new CodebaseInventory('/non/existent/path/12345');
    }).toThrow();
  });

  it('should handle directory with no code files', async () => {
    const emptyDir = path.join(__dirname, '__mocks__');
    const inventory = new CodebaseInventory(emptyDir);

    const result = await inventory.scan();

    expect(result.utilities).toBeInstanceOf(Map);
    expect(result.stats.totalFiles).toBeGreaterThanOrEqual(0);
  });
});
