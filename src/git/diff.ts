/**
 * Git diff management for incremental documentation updates
 */

import simpleGit, { SimpleGit, DiffResultTextFile } from 'simple-git';

export interface ChangedFile {
  path: string;
  status: 'added' | 'modified' | 'deleted' | 'renamed';
  oldPath?: string;
}

export interface ChangeCategories {
  components: string[];
  routes: string[];
  api: string[];
  config: string[];
  database: string[];
  styling: string[];
  tests: string[];
  other: string[];
}

export class DiffManager {
  private git: SimpleGit;

  constructor(repoPath: string) {
    this.git = simpleGit(repoPath);
  }

  /**
   * Get files changed since a specific commit hash
   */
  async getChangedFilesSince(commitHash: string): Promise<ChangedFile[]> {
    try {
      // Get the diff summary between the commit and HEAD
      const diff = await this.git.diffSummary([commitHash, 'HEAD']);

      const changedFiles: ChangedFile[] = [];

      for (const file of diff.files) {
        const textFile = file as DiffResultTextFile;
        let status: ChangedFile['status'] = 'modified';

        // Determine status based on changes
        if (textFile.insertions > 0 && textFile.deletions === 0) {
          // Check if it's a new file by looking at the binary flag or file name
          const isNewFile = await this.isNewFileSince(commitHash, textFile.file);
          status = isNewFile ? 'added' : 'modified';
        } else if (textFile.insertions === 0 && textFile.deletions > 0) {
          status = 'deleted';
        } else {
          status = 'modified';
        }

        // Check for renames (file contains " => ")
        if (textFile.file.includes(' => ')) {
          const [oldPath, newPath] = textFile.file.split(' => ');
          changedFiles.push({
            path: newPath.replace(/[{}]/g, ''),
            status: 'renamed',
            oldPath: oldPath.replace(/[{}]/g, ''),
          });
        } else {
          changedFiles.push({
            path: textFile.file,
            status,
          });
        }
      }

      return changedFiles;
    } catch (error) {
      throw new Error(`Failed to get changed files: ${(error as Error).message}`);
    }
  }

  /**
   * Check if a file is new since the given commit
   */
  private async isNewFileSince(commitHash: string, filePath: string): Promise<boolean> {
    try {
      // Try to show the file at the old commit - if it fails, file is new
      await this.git.show([`${commitHash}:${filePath}`]);
      return false;
    } catch {
      return true;
    }
  }

  /**
   * Get current HEAD commit hash
   */
  async getCurrentCommitHash(): Promise<string> {
    const log = await this.git.log({ maxCount: 1 });
    return log.latest?.hash || '';
  }

  /**
   * Check if commit hash exists
   */
  async isValidCommit(commitHash: string): Promise<boolean> {
    try {
      await this.git.revparse([commitHash]);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get short commit hash (7 characters)
   */
  shortHash(hash: string): string {
    return hash.substring(0, 7);
  }

  /**
   * Categorize changed files by their type/purpose
   */
  categorizeChanges(files: ChangedFile[]): ChangeCategories {
    const categories: ChangeCategories = {
      components: [],
      routes: [],
      api: [],
      config: [],
      database: [],
      styling: [],
      tests: [],
      other: [],
    };

    for (const file of files) {
      const path = file.path.toLowerCase();

      // Skip deleted files from categorization (they don't need doc updates)
      if (file.status === 'deleted') {
        continue;
      }

      // Components (React, Vue, Angular, Svelte)
      if (
        path.includes('/components/') ||
        path.includes('/component/') ||
        path.match(/\.(tsx|jsx|vue|svelte)$/)
      ) {
        categories.components.push(file.path);
      }
      // Routes
      else if (
        path.includes('/routes/') ||
        path.includes('/router/') ||
        path.includes('/pages/') ||
        path.includes('app-routing') ||
        path.match(/routes?\.(ts|js|tsx|jsx)$/)
      ) {
        categories.routes.push(file.path);
      }
      // API layer
      else if (
        path.includes('/api/') ||
        path.includes('/services/') ||
        path.includes('/controllers/') ||
        path.includes('/endpoints/') ||
        path.includes('/handlers/')
      ) {
        categories.api.push(file.path);
      }
      // Configuration files
      else if (
        path.includes('config') ||
        path.match(/\.(json|yaml|yml|toml|env)$/) ||
        path.includes('package.json') ||
        path.includes('tsconfig') ||
        path.includes('webpack') ||
        path.includes('vite.config') ||
        path.includes('next.config')
      ) {
        categories.config.push(file.path);
      }
      // Database
      else if (
        path.includes('/models/') ||
        path.includes('/entities/') ||
        path.includes('/schema/') ||
        path.includes('/migrations/') ||
        path.includes('/prisma/') ||
        path.includes('/drizzle/')
      ) {
        categories.database.push(file.path);
      }
      // Styling
      else if (
        path.includes('/styles/') ||
        path.includes('/css/') ||
        path.match(/\.(css|scss|sass|less|styled)/) ||
        path.includes('tailwind')
      ) {
        categories.styling.push(file.path);
      }
      // Tests
      else if (
        path.includes('/test/') ||
        path.includes('/tests/') ||
        path.includes('__tests__') ||
        path.match(/\.(test|spec)\.(ts|js|tsx|jsx)$/)
      ) {
        categories.tests.push(file.path);
      }
      // Other
      else {
        categories.other.push(file.path);
      }
    }

    return categories;
  }

  /**
   * Get summary of changes
   */
  getChangeSummary(files: ChangedFile[]): {
    added: number;
    modified: number;
    deleted: number;
    renamed: number;
    total: number;
  } {
    return {
      added: files.filter(f => f.status === 'added').length,
      modified: files.filter(f => f.status === 'modified').length,
      deleted: files.filter(f => f.status === 'deleted').length,
      renamed: files.filter(f => f.status === 'renamed').length,
      total: files.length,
    };
  }
}
