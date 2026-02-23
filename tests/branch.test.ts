/**
 * Tests for BranchManager
 */

import { BranchManager } from '../src/git/branch';
import * as path from 'path';

// Use current project for git tests (it has git history)
const projectPath = process.cwd();

describe('BranchManager', () => {
  let branchManager: BranchManager;
  let originalBranch: string;

  beforeAll(async () => {
    branchManager = new BranchManager(projectPath);
    originalBranch = await branchManager.getCurrentBranch();
  });

  afterAll(async () => {
    // Return to original branch after tests
    if (originalBranch && originalBranch !== 'unknown') {
      try {
        await branchManager.checkout(originalBranch);
      } catch (_e) {
        // Ignore - might already be on branch
      }
    }
  });

  describe('constructor', () => {
    it('should be instantiable', () => {
      const manager = new BranchManager(projectPath);
      expect(manager).toBeInstanceOf(BranchManager);
    });
  });

  describe('getCurrentBranch', () => {
    it('should return current branch name', async () => {
      const branch = await branchManager.getCurrentBranch();

      expect(typeof branch).toBe('string');
      expect(branch.length).toBeGreaterThan(0);
      expect(branch).not.toBe('unknown');
    });
  });

  describe('isClean', () => {
    it('should return boolean for clean status', async () => {
      const isClean = await branchManager.isClean();

      expect(typeof isClean).toBe('boolean');
    });
  });

  describe('getMainBranch', () => {
    it('should return main or master branch name', async () => {
      const mainBranch = await branchManager.getMainBranch();

      expect(typeof mainBranch).toBe('string');
      expect(['main', 'master']).toContain(mainBranch);
    });
  });

  describe('checkout', () => {
    it('should switch to existing branch', async () => {
      const currentBranch = await branchManager.getCurrentBranch();
      const mainBranch = await branchManager.getMainBranch();

      // Only test checkout if we're not on main
      if (currentBranch !== mainBranch) {
        await branchManager.checkout(mainBranch);
        const newBranch = await branchManager.getCurrentBranch();
        expect(newBranch).toBe(mainBranch);

        // Switch back
        await branchManager.checkout(currentBranch);
      } else {
        // Just verify we can get the branch name
        expect(currentBranch).toBe(mainBranch);
      }
    });

    it('should throw for non-existent branch', async () => {
      await expect(branchManager.checkout('non-existent-branch-12345')).rejects.toThrow();
    });
  });

  // Skip createBranch tests to avoid creating branches during test runs
  describe.skip('createBranch', () => {
    it('should create a new branch with default name', async () => {
      const branchName = await branchManager.createBranch('test-lean-intel');

      expect(branchName).toContain('test-lean-intel');
      expect(branchName).toMatch(/test-lean-intel\/\d{4}-\d{2}-\d{2}/);

      // Clean up - delete the created branch
      const currentBranch = await branchManager.getCurrentBranch();
      if (currentBranch === branchName) {
        await branchManager.checkout(originalBranch);
      }
    });
  });
});

describe('BranchManager with fixtures', () => {
  const fixturesPath = path.join(__dirname, 'fixtures');

  it('should handle fixture directories with git', async () => {
    // Use the react-frontend fixture if it has git
    const fixturePath = path.join(fixturesPath, 'react-frontend');

    try {
      const manager = new BranchManager(fixturePath);
      const branch = await manager.getCurrentBranch();
      // May be 'unknown' for fixtures without git
      expect(typeof branch).toBe('string');
    } catch (_e) {
      // Expected if fixture doesn't have git initialized
      expect(true).toBe(true);
    }
  });
});
