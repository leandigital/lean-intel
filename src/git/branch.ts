/**
 * Git branch management
 */

import simpleGit, { SimpleGit } from 'simple-git';
import { logger } from '../utils/logger';

export class BranchManager {
  private git: SimpleGit;

  constructor(repoPath: string) {
    this.git = simpleGit(repoPath);
  }

  /**
   * Create a new branch for lean-intel output
   */
  async createBranch(baseName = 'lean-intel'): Promise<string> {
    const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const branchName = `${baseName}/${timestamp}`;

    try {
      // Check if branch already exists
      const branches = await this.git.branchLocal();

      if (branches.all.includes(branchName)) {
        // Branch exists, add time suffix
        const timeSuffix = new Date().toTimeString().split(' ')[0].replace(/:/g, '-');
        const uniqueBranchName = `${branchName}-${timeSuffix}`;

        logger.info(`Branch ${branchName} exists, creating ${uniqueBranchName}`);
        await this.git.checkoutLocalBranch(uniqueBranchName);
        return uniqueBranchName;
      }

      // Create and checkout new branch
      await this.git.checkoutLocalBranch(branchName);
      logger.success(`Created branch: ${branchName}`);

      return branchName;
    } catch (error) {
      logger.error('Failed to create branch', error as Error);
      throw error;
    }
  }

  /**
   * Get current branch name
   */
  async getCurrentBranch(): Promise<string> {
    const status = await this.git.status();
    return status.current || 'unknown';
  }

  /**
   * Check if working directory is clean
   */
  async isClean(): Promise<boolean> {
    const status = await this.git.status();
    return status.isClean();
  }

  /**
   * Get the default/main branch name
   */
  async getMainBranch(): Promise<string> {
    try {
      // Try to get default branch from remote
      const remotes = await this.git.getRemotes(true);
      if (remotes.length > 0) {
        const remote = remotes[0].name;
        const refs = await this.git.listRemote(['--symref', remote, 'HEAD']);

        // Parse output like: "ref: refs/heads/main	HEAD"
        const match = refs.match(/ref: refs\/heads\/(\S+)/);
        if (match) {
          return match[1];
        }
      }

      // Fallback: check if 'main' or 'master' exists locally
      const branches = await this.git.branchLocal();
      if (branches.all.includes('main')) {
        return 'main';
      }
      if (branches.all.includes('master')) {
        return 'master';
      }

      // Default to 'main' if can't determine
      return 'main';
    } catch (_error) {
      logger.debug('Could not determine main branch, defaulting to "main"');
      return 'main';
    }
  }

  /**
   * Switch to a branch
   */
  async checkout(branchName: string): Promise<void> {
    await this.git.checkout(branchName);
    logger.info(`Switched to branch: ${branchName}`);
  }
}
