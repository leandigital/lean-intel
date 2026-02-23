/**
 * Context Gatherer - Collects all necessary information from codebase
 * This feeds data into API-optimized prompts
 */

import * as fs from 'fs-extra';
import * as path from 'path';
import { glob } from 'glob';
import simpleGit, { SimpleGit } from 'simple-git';
import { ProjectContext } from '../types';
import { logger } from '../utils/logger';

// Type for execSync errors which may contain stdout/stderr
interface ExecError extends Error {
  stdout?: Buffer;
  stderr?: Buffer;
  status?: number;
}

function isExecError(error: unknown): error is ExecError {
  return error instanceof Error && 'stdout' in error;
}

export class ContextGatherer {
  private rootPath: string;
  private git: SimpleGit;

  constructor(rootPath: string) {
    this.rootPath = rootPath;
    this.git = simpleGit(rootPath);
  }

  /**
   * Gather comprehensive context for documentation generation
   * Now includes actual file content for accurate documentation
   * Project-type-aware: gathers type-specific files for backend/mobile/devops
   */
  async gatherDocumentationContext(projectContext: ProjectContext): Promise<Record<string, unknown>> {
    logger.info('Gathering project context...');

    // Common context gathered for all project types
    const [
      fileTree,
      packageJson,
      requirementsTxt,
      componentFiles,
      routingFiles,
      stateManagementFiles,
      apiFiles,
      stylingFiles,
      gitCommits,
      gitCommitCount,
    ] = await Promise.all([
      this.getFileTree(),
      this.getPackageJsonContent(),
      this.getRequirementsTxtContent(),
      this.findComponentFiles(),
      this.findRoutingFiles(),
      this.findStateManagementFiles(),
      this.findAPIFiles(),
      this.findStylingFiles(),
      this.getRecentGitCommits(30),
      this.getGitCommitCount(),
    ]);

    // Read common file contents
    logger.info('Reading key file contents for documentation...');
    const [
      componentFileContents,
      routingFileContents,
      stateFileContents,
      apiFileContents,
      entryPointContent,
    ] = await Promise.all([
      this.readPrioritizedFiles(componentFiles, 50, 50000),
      this.readPrioritizedFiles(routingFiles, 20, 30000),
      this.readPrioritizedFiles(stateManagementFiles, 30, 50000),
      this.readPrioritizedFiles(apiFiles, 30, 50000),
      this.readEntryPointContent(),
    ]);

    // Base context (common to all project types)
    const baseContext: Record<string, unknown> = {
      ...projectContext,
      fileTree,
      packageJsonContent: packageJson,
      requirementsTxtContent: requirementsTxt,
      componentFiles,
      routingFiles,
      routeFiles: routingFiles, // Alias used by backend generator
      stateManagementFiles,
      apiFiles,
      stylingFiles,
      gitRecentCommits: gitCommits,
      gitCommitCount,
      componentFileContents,
      routingFileContents,
      stateFileContents,
      apiFileContents,
      entryPointContent,
    };

    // Gather project-type-specific context
    const projectType = projectContext.projectType;

    if (projectType === 'backend') {
      return this.gatherBackendSpecificContext(baseContext);
    } else if (projectType === 'mobile') {
      return this.gatherMobileSpecificContext(baseContext);
    } else if (projectType === 'devops') {
      return this.gatherDevOpsSpecificContext(baseContext);
    }

    // Frontend (default) - base context is sufficient
    return baseContext;
  }

  /**
   * Gather backend-specific context fields
   */
  private async gatherBackendSpecificContext(baseContext: Record<string, unknown>): Promise<Record<string, unknown>> {
    logger.info('Gathering backend-specific context...');

    const [controllerFiles, serviceFiles, modelFiles, middlewareFiles, hasAuthentication] =
      await Promise.all([
        this.findControllerFiles(),
        this.findServiceFiles(),
        this.findModelFiles(),
        this.findMiddlewareFiles(),
        this.detectAuthentication(),
      ]);

    const [controllerFileContents, serviceFileContents, modelFileContents, middlewareFileContents] =
      await Promise.all([
        this.readPrioritizedFiles(controllerFiles, 30, 50000),
        this.readPrioritizedFiles(serviceFiles, 30, 50000),
        this.readPrioritizedFiles(modelFiles, 30, 50000),
        this.readPrioritizedFiles(middlewareFiles, 20, 30000),
      ]);

    return {
      ...baseContext,
      controllerFiles,
      serviceFiles,
      modelFiles,
      middlewareFiles,
      hasAuthentication,
      controllerFileContents,
      routeFileContents: baseContext.routingFileContents,
      serviceFileContents,
      modelFileContents,
      middlewareFileContents,
    };
  }

  /**
   * Gather mobile-specific context fields
   */
  private async gatherMobileSpecificContext(baseContext: Record<string, unknown>): Promise<Record<string, unknown>> {
    logger.info('Gathering mobile-specific context...');

    const [screenFiles, navigationFiles, nativeModuleFiles, mobilePlatform] = await Promise.all([
      this.findScreenFiles(),
      this.findNavigationFiles(),
      this.findNativeModuleFiles(),
      this.detectMobilePlatform(baseContext),
    ]);

    const [screenFileContents, navigationFileContents] = await Promise.all([
      this.readPrioritizedFiles(screenFiles, 30, 50000),
      this.readPrioritizedFiles(navigationFiles, 20, 30000),
    ]);

    return {
      ...baseContext,
      screenFiles,
      navigationFiles,
      nativeModuleFiles,
      mobilePlatform,
      stateFiles: baseContext.stateManagementFiles,
      screenFileContents,
      navigationFileContents,
    };
  }

  /**
   * Gather devops-specific context fields
   */
  private async gatherDevOpsSpecificContext(baseContext: Record<string, unknown>): Promise<Record<string, unknown>> {
    logger.info('Gathering DevOps-specific context...');

    const [terraformFiles, k8sFiles, cicdFiles, dockerFiles] = await Promise.all([
      this.findTerraformFiles(),
      this.findK8sFiles(),
      this.findCICDFiles(),
      this.findDockerfiles(),
    ]);

    const [terraformFileContents, k8sFileContents, cicdFileContents, dockerFileContents] =
      await Promise.all([
        this.readPrioritizedFiles(terraformFiles, 30, 50000),
        this.readPrioritizedFiles(k8sFiles, 20, 30000),
        this.readPrioritizedFiles(cicdFiles, 20, 30000),
        this.readPrioritizedFiles(dockerFiles, 10, 30000),
      ]);

    const cloudProvider = await this.detectCloudProvider(terraformFiles, k8sFiles);

    return {
      ...baseContext,
      terraformFiles,
      k8sFiles,
      cicdFiles,
      dockerFiles,
      cloudProvider,
      hasKubernetes: k8sFiles.length > 0,
      hasTerraform: terraformFiles.length > 0,
      terraformFileContents,
      k8sFileContents,
      cicdFileContents,
      dockerFileContents,
    };
  }

  /**
   * Read prioritized files with content
   * Prioritizes: entry points, index files, main files, then by size (smaller first)
   */
  private async readPrioritizedFiles(
    files: string[],
    maxFiles: number,
    maxSizePerFile: number
  ): Promise<Record<string, string>> {
    // Prioritize files
    const prioritized = this.prioritizeFiles(files);
    const toRead = prioritized.slice(0, maxFiles);

    const contents: Record<string, string> = {};
    let totalSize = 0;
    const maxTotalSize = maxFiles * maxSizePerFile; // Cap total context size

    for (const file of toRead) {
      if (totalSize >= maxTotalSize) break;

      const content = await this.readFileContent(file, maxSizePerFile);
      if (content) {
        contents[file] = content;
        totalSize += content.length;
      }
    }

    logger.debug(`Read ${Object.keys(contents).length} files (${(totalSize / 1024).toFixed(1)}KB)`);
    return contents;
  }

  /**
   * Prioritize files for reading (most important first)
   */
  private prioritizeFiles(files: string[]): string[] {
    const scored = files.map(file => {
      let score = 0;
      const lower = file.toLowerCase();

      // High priority: entry points and index files
      if (lower.includes('index.') || lower.includes('main.')) score += 100;
      if (lower.includes('app.')) score += 90;

      // High priority: root-level src files
      if (file.match(/^src\/[^/]+\.(ts|tsx|js|jsx)$/)) score += 80;

      // Medium priority: core/common/shared directories
      if (lower.includes('/core/') || lower.includes('/common/') || lower.includes('/shared/')) score += 50;

      // Medium priority: specific patterns
      if (lower.includes('provider') || lower.includes('context')) score += 40;
      if (lower.includes('hook') || lower.includes('util')) score += 30;

      // Lower priority for deeply nested files
      const depth = (file.match(/\//g) || []).length;
      score -= depth * 5;

      return { file, score };
    });

    return scored
      .sort((a, b) => b.score - a.score)
      .map(s => s.file);
  }

  /**
   * Read entry point file content
   */
  private async readEntryPointContent(): Promise<string | null> {
    const candidates = [
      'src/index.ts', 'src/index.tsx', 'src/main.ts', 'src/main.tsx',
      'src/App.tsx', 'src/App.ts', 'src/app.ts', 'src/app.tsx',
      'index.ts', 'index.js', 'main.ts', 'main.js',
      'app.py', 'main.py', 'main.go', 'lib/main.dart',
    ];

    for (const candidate of candidates) {
      const content = await this.readFileContent(candidate, 15000);
      if (content) {
        return `// File: ${candidate}\n${content}`;
      }
    }
    return null;
  }

  /**
   * Gather context for security analysis
   * Now includes npm audit output and actual code samples
   */
  async gatherSecurityContext(projectContext: ProjectContext): Promise<Record<string, unknown>> {
    logger.info('Gathering security context...');

    const [
      fileTree,
      packageJson,
      requirementsTxt,
      environmentFiles,
      configFiles,
      npmAuditOutput,
      authFiles,
      apiFiles,
    ] = await Promise.all([
      this.getFileTree(),
      this.getPackageJsonContent(),
      this.getRequirementsTxtContent(),
      this.findEnvironmentFiles(),
      this.findConfigFiles(),
      this.runNpmAudit(),
      this.findAuthFiles(),
      this.findAPIFiles(),
    ]);

    // Read actual security-relevant code
    logger.info('Reading security-relevant code...');
    const [authCodeSamples, apiCodeSamples, configCodeSamples] = await Promise.all([
      this.readPrioritizedFiles(authFiles, 20, 50000),
      this.readPrioritizedFiles(apiFiles, 30, 50000),
      this.sampleConfigFileContents(configFiles),
    ]);

    return {
      ...projectContext,
      fileTree,
      packageJsonContent: packageJson,
      requirementsTxtContent: requirementsTxt,
      environmentFiles,
      configFiles,
      hasAuthentication: await this.detectAuthentication(),
      hasAPIEndpoints: await this.detectAPIEndpoints(),
      // NEW: Actual vulnerability data from tools
      npmAuditOutput,
      // NEW: Actual code samples for security review
      authCodeSamples,
      apiCodeSamples,
      configCodeSamples,
    };
  }

  /**
   * Run npm audit and return results
   */
  private async runNpmAudit(): Promise<string | null> {
    const packageLockPath = path.join(this.rootPath, 'package-lock.json');
    const yarnLockPath = path.join(this.rootPath, 'yarn.lock');

    try {
      // Check if we have a lockfile
      const hasNpmLock = await fs.pathExists(packageLockPath);
      const hasYarnLock = await fs.pathExists(yarnLockPath);

      if (!hasNpmLock && !hasYarnLock) {
        return 'No lockfile found - cannot run security audit';
      }

      const { execSync } = await import('child_process');

      if (hasNpmLock) {
        try {
          const result = execSync('npm audit --json 2>/dev/null', {
            cwd: this.rootPath,
            timeout: 60000, // 60 second timeout
            maxBuffer: 10 * 1024 * 1024, // 10MB buffer
          });
          return result.toString();
        } catch (error: unknown) {
          // npm audit returns non-zero exit code when vulnerabilities found
          if (isExecError(error) && error.stdout) {
            return error.stdout.toString();
          }
          return `npm audit failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
        }
      }

      if (hasYarnLock) {
        try {
          const result = execSync('yarn audit --json 2>/dev/null', {
            cwd: this.rootPath,
            timeout: 60000,
            maxBuffer: 10 * 1024 * 1024,
          });
          return result.toString();
        } catch (error: unknown) {
          if (isExecError(error) && error.stdout) {
            return error.stdout.toString();
          }
          return `yarn audit failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
        }
      }

      return null;
    } catch (_error) {
      logger.debug('Could not run security audit');
      return null;
    }
  }

  /**
   * Sample config file contents for security review
   */
  private async sampleConfigFileContents(configFiles: string[]): Promise<Record<string, string>> {
    const contents: Record<string, string> = {};

    for (const file of configFiles.slice(0, 20)) {
      const content = await this.readFileContent(file, 30000);
      if (content) {
        contents[file] = content;
      }
    }

    return contents;
  }

  /**
   * Generate file tree (limited depth for token efficiency)
   */
  private async getFileTree(maxDepth = 4): Promise<string> {
    const files = await glob('**/*', {
      cwd: this.rootPath,
      ignore: [
        '**/node_modules/**',
        '**/dist/**',
        '**/build/**',
        '**/.git/**',
        '**/coverage/**',
        '**/.next/**',
        '**/out/**',
        '**/__pycache__/**',
        '**/*.pyc',
      ],
      nodir: false,
      dot: true,
      maxDepth,
    });

    // Build tree structure
    const tree = this.buildTreeStructure(files);
    return tree;
  }

  /**
   * Build tree structure from file list
   */
  private buildTreeStructure(files: string[]): string {
    const sorted = files.sort();
    const lines: string[] = [];

    // Group by top-level directory
    const topLevel = new Set<string>();
    sorted.forEach(file => {
      const parts = file.split('/');
      if (parts.length > 0) {
        topLevel.add(parts[0]);
      }
    });

    // Limit output to avoid token bloat
    const maxFiles = 200;
    const displayed = sorted.slice(0, maxFiles);

    displayed.forEach(file => {
      const depth = (file.match(/\//g) || []).length;
      const indent = '  '.repeat(depth);
      const name = path.basename(file);
      lines.push(`${indent}${name}`);
    });

    if (files.length > maxFiles) {
      lines.push(`\n... and ${files.length - maxFiles} more files`);
    }

    return lines.join('\n');
  }

  /**
   * Read package.json content
   */
  private async getPackageJsonContent(): Promise<string | undefined> {
    const pkgPath = path.join(this.rootPath, 'package.json');
    if (await fs.pathExists(pkgPath)) {
      const content = await fs.readFile(pkgPath, 'utf-8');
      return content;
    }
    return undefined;
  }

  /**
   * Read requirements.txt content (Python)
   */
  private async getRequirementsTxtContent(): Promise<string | undefined> {
    const reqPath = path.join(this.rootPath, 'requirements.txt');
    if (await fs.pathExists(reqPath)) {
      const content = await fs.readFile(reqPath, 'utf-8');
      return content;
    }
    return undefined;
  }

  /**
   * Find component files
   */
  private async findComponentFiles(): Promise<string[]> {
    const patterns = [
      '**/components/**/*.{tsx,jsx,vue}',
      '**/src/**/*Component.{tsx,jsx}',
      '**/src/**/*component.{tsx,jsx}',
    ];

    const files = await glob(patterns, {
      cwd: this.rootPath,
      ignore: ['**/node_modules/**', '**/dist/**', '**/build/**'],
    });

    return files.slice(0, 100); // Limit to avoid token bloat
  }

  /**
   * Find routing files
   */
  private async findRoutingFiles(): Promise<string[]> {
    const patterns = [
      '**/routes/**/*.{ts,tsx,js,jsx}',
      '**/router/**/*.{ts,tsx,js,jsx}',
      '**/routing/**/*.{ts,tsx,js,jsx}',
      '**/*Router.{ts,tsx,js,jsx}',
      '**/*Routes.{ts,tsx,js,jsx}',
      '**/app/**/page.{ts,tsx,js,jsx}', // Next.js App Router
    ];

    const files = await glob(patterns, {
      cwd: this.rootPath,
      ignore: ['**/node_modules/**', '**/dist/**'],
    });

    return files;
  }

  /**
   * Find state management files
   */
  private async findStateManagementFiles(): Promise<string[]> {
    const patterns = [
      '**/store/**/*.{ts,tsx,js,jsx}',
      '**/redux/**/*.{ts,tsx,js,jsx}',
      '**/state/**/*.{ts,tsx,js,jsx}',
      '**/*Slice.{ts,tsx,js,jsx}',
      '**/*Store.{ts,tsx,js,jsx}',
      '**/context/**/*.{ts,tsx,js,jsx}',
    ];

    const files = await glob(patterns, {
      cwd: this.rootPath,
      ignore: ['**/node_modules/**', '**/dist/**'],
    });

    return files;
  }

  /**
   * Find API files
   */
  private async findAPIFiles(): Promise<string[]> {
    const patterns = [
      '**/api/**/*.{ts,tsx,js,jsx}',
      '**/services/**/*.{ts,tsx,js,jsx}',
      '**/*Api.{ts,tsx,js,jsx}',
      '**/*Service.{ts,tsx,js,jsx}',
    ];

    const files = await glob(patterns, {
      cwd: this.rootPath,
      ignore: ['**/node_modules/**', '**/dist/**'],
    });

    return files;
  }

  /**
   * Find styling files
   */
  private async findStylingFiles(): Promise<string[]> {
    const patterns = [
      '**/*.css',
      '**/*.scss',
      '**/*.sass',
      '**/*.less',
      '**/styles/**/*.{ts,tsx,js,jsx}',
      '**/*Styles.{ts,tsx,js,jsx}',
      '**/*styled.{ts,tsx,js,jsx}',
    ];

    const files = await glob(patterns, {
      cwd: this.rootPath,
      ignore: [
        '**/node_modules/**',
        '**/dist/**',
        '**/build/**',
        '**/.next/**',
      ],
    });

    return files.slice(0, 50);
  }

  /**
   * Find environment files
   */
  private async findEnvironmentFiles(): Promise<string[]> {
    const patterns = ['.env*', '**/.env*', '**/config/env.*'];

    const files = await glob(patterns, {
      cwd: this.rootPath,
      ignore: ['**/node_modules/**'],
      dot: true,
    });

    return files;
  }

  /**
   * Find config files
   */
  private async findConfigFiles(): Promise<string[]> {
    const files = [
      'package.json',
      'tsconfig.json',
      'webpack.config.js',
      'vite.config.ts',
      'next.config.js',
      '.eslintrc.js',
      'tailwind.config.js',
      'jest.config.js',
    ];

    const found: string[] = [];

    for (const file of files) {
      if (await fs.pathExists(path.join(this.rootPath, file))) {
        found.push(file);
      }
    }

    return found;
  }

  /**
   * Get recent git commits
   */
  private async getRecentGitCommits(count = 30): Promise<string> {
    try {
      const log = await this.git.log({ maxCount: count });

      const commits = log.all.map(commit => {
        return `${commit.hash.substring(0, 7)} - ${commit.message} (${commit.date})`;
      });

      return commits.join('\n');
    } catch (_error) {
      logger.debug('Could not read git history');
      return 'Git history not available';
    }
  }

  /**
   * Get total git commit count for mode detection
   */
  private async getGitCommitCount(): Promise<number> {
    try {
      const log = await this.git.log();
      return log.total;
    } catch (_error) {
      logger.debug('Could not get git commit count');
      return 0;
    }
  }

  /**
   * Detect if project has authentication
   */
  private async detectAuthentication(): Promise<boolean> {
    const authPatterns = [
      '**/auth/**',
      '**/authentication/**',
      '**/*Auth*.{ts,tsx,js,jsx,py}',
      '**/login/**',
      '**/signin/**',
    ];

    const files = await glob(authPatterns, {
      cwd: this.rootPath,
      ignore: ['**/node_modules/**'],
    });

    return files.length > 0;
  }

  /**
   * Detect if project has API endpoints
   */
  private async detectAPIEndpoints(): Promise<boolean> {
    const apiPatterns = [
      '**/api/**',
      '**/routes/**',
      '**/controllers/**',
      '**/endpoints/**',
      '**/*Controller.{ts,js,py}',
      '**/*Route.{ts,js,py}',
    ];

    const files = await glob(apiPatterns, {
      cwd: this.rootPath,
      ignore: ['**/node_modules/**'],
    });

    return files.length > 0;
  }

  /**
   * Gather context for license compliance analysis
   * Now includes license-checker output for accurate license detection
   */
  async gatherLicenseContext(projectContext: ProjectContext): Promise<Record<string, unknown>> {
    logger.info('Gathering license compliance context...');

    const [fileTree, packageJson, requirementsTxt, licenseFiles, licenseCheckerOutput, projectLicenseContent] =
      await Promise.all([
        this.getFileTree(),
        this.getPackageJsonContent(),
        this.getRequirementsTxtContent(),
        this.findLicenseFiles(),
        this.runLicenseChecker(),
        this.readProjectLicense(),
      ]);

    return {
      ...projectContext,
      fileTree,
      packageJsonContent: packageJson,
      requirementsTxtContent: requirementsTxt,
      licenseFiles,
      hasCommercialUse: null, // Unknown - not auto-detected, M&A context should verify
      isOpenSource: null, // Not auto-detected - LICENSE file presence alone is insufficient; M&A context should verify
      // NEW: Actual license data from tools
      licenseCheckerOutput,
      projectLicenseContent,
    };
  }

  /**
   * Run license-checker to get actual dependency licenses
   */
  private async runLicenseChecker(): Promise<string | null> {
    const packageJsonPath = path.join(this.rootPath, 'package.json');

    try {
      const hasPackageJson = await fs.pathExists(packageJsonPath);
      if (!hasPackageJson) {
        return 'No package.json found';
      }

      const { execSync } = await import('child_process');

      // Try npx license-checker (works without global install)
      try {
        const result = execSync(
          'npx license-checker --json --production --summary 2>/dev/null',
          {
            cwd: this.rootPath,
            timeout: 120000, // 2 minute timeout (npx may need to download)
            maxBuffer: 10 * 1024 * 1024,
          }
        );
        return result.toString();
      } catch {
        // Try alternative: read license from package.json of each dep
        logger.debug('license-checker not available, falling back to package.json parsing');
        return await this.parseDependencyLicenses();
      }
    } catch (_error) {
      logger.debug('Could not run license checker');
      return null;
    }
  }

  /**
   * Fallback: Parse licenses from node_modules package.json files
   */
  private async parseDependencyLicenses(): Promise<string> {
    const licenses: Record<string, { license: string; version: string }> = {};

    try {
      const nodeModulesPath = path.join(this.rootPath, 'node_modules');
      const exists = await fs.pathExists(nodeModulesPath);
      if (!exists) {
        return 'node_modules not installed - run npm install first';
      }

      const packageJsonContent = await this.getPackageJsonContent();
      if (!packageJsonContent) return 'No package.json';

      const pkg = JSON.parse(packageJsonContent);
      const deps = { ...pkg.dependencies, ...pkg.devDependencies };

      // Read license from top 100 dependencies
      const depNames = Object.keys(deps).slice(0, 100);

      for (const depName of depNames) {
        try {
          const depPkgPath = path.join(nodeModulesPath, depName, 'package.json');
          if (await fs.pathExists(depPkgPath)) {
            const depPkg = await fs.readJson(depPkgPath);
            licenses[depName] = {
              license: depPkg.license || 'UNKNOWN',
              version: depPkg.version || deps[depName],
            };
          }
        } catch {
          licenses[depName] = { license: 'UNKNOWN', version: deps[depName] };
        }
      }

      return JSON.stringify(licenses, null, 2);
    } catch (_error) {
      return 'Failed to parse dependency licenses';
    }
  }

  /**
   * Read the project's own LICENSE file
   */
  private async readProjectLicense(): Promise<string | null> {
    const candidates = ['LICENSE', 'LICENSE.md', 'LICENSE.txt', 'LICENCE', 'LICENCE.md'];

    for (const candidate of candidates) {
      const content = await this.readFileContent(candidate, 10000);
      if (content) {
        return content;
      }
    }

    return null;
  }

  /**
   * Gather context for code quality analysis
   */
  async gatherQualityContext(projectContext: ProjectContext): Promise<Record<string, unknown>> {
    logger.info('Gathering code quality context...');

    const [fileTree, packageJson, sampleCode, gitCommits, componentFiles, configFiles] = await Promise.all([
      this.getFileTree(),
      this.getPackageJsonContent(),
      this.sampleCodeFiles(),
      this.getRecentGitCommits(50),
      this.findComponentFiles(),
      this.findConfigFiles(),
    ]);

    return {
      ...projectContext,
      fileTree,
      packageJsonContent: packageJson,
      sampleCodeFiles: sampleCode,
      componentFiles,
      configFiles,
      gitCommitsAnalysis: gitCommits,
    };
  }

  /**
   * Gather context for cost & scalability analysis
   */
  async gatherCostContext(projectContext: ProjectContext): Promise<Record<string, unknown>> {
    logger.info('Gathering cost & scalability context...');

    const [fileTree, packageJson, cloudConfigFiles, databaseFiles, cacheFiles, dockerfiles, apiFiles] = await Promise.all([
      this.getFileTree(),
      this.getPackageJsonContent(),
      this.findCloudConfigFiles(),
      this.findDatabaseFiles(),
      this.findCacheFiles(),
      this.findDockerfiles(),
      this.findAPIFiles(),
    ]);

    // Separate cloud config files by type
    const terraformFiles = cloudConfigFiles.filter(f => f.endsWith('.tf'));
    const kubernetesFiles = cloudConfigFiles.filter(f => f.includes('k8s') || f.includes('kubernetes'));
    const infrastructureFiles = cloudConfigFiles;

    // Sample API code and database queries
    const sampleAPICode = await this.readPrioritizedFiles(apiFiles, 30, 50000);
    const sampleDatabaseQueries = await this.sampleFiles(databaseFiles.filter(f => f.endsWith('.sql')), 20);
    const sampleInfraCode = await this.sampleFiles(cloudConfigFiles, 20);

    // Detect cache type
    let cacheType: string | undefined;
    if (projectContext.dependencies['redis'] || projectContext.dependencies['ioredis']) {
      cacheType = 'Redis';
    } else if (projectContext.dependencies['memcached']) {
      cacheType = 'Memcached';
    }

    return {
      ...projectContext,
      fileTree,
      packageJsonContent: packageJson,
      infrastructureFiles,
      dockerfiles,
      terraformFiles,
      kubernetesFiles,
      sampleAPICode,
      sampleDatabaseQueries,
      sampleInfraCode, // NEW: actual infrastructure code content
      hasCache: cacheFiles.length > 0,
      cacheType,
      hasCDN: null, // Not auto-detected - would need cloud config analysis
    };
  }

  /**
   * Gather context for HIPAA compliance analysis
   */
  async gatherHIPAAContext(projectContext: ProjectContext): Promise<Record<string, unknown>> {
    logger.info('Gathering HIPAA compliance context...');

    const [fileTree, databaseFiles, authFiles, apiFiles, environmentFiles] = await Promise.all([
      this.getFileTree(),
      this.findDatabaseFiles(),
      this.findAuthFiles(),
      this.findAPIFiles(),
      this.findEnvironmentFiles(),
    ]);

    // Sample database schema files
    const sampleDatabaseSchema = await this.sampleFiles(databaseFiles, 15);

    // Sample authentication code
    const sampleAuthCode = await this.sampleFiles(authFiles, 10);

    // Sample API code
    const sampleAPICode = await this.sampleFiles(apiFiles.slice(0, 20), 15);

    return {
      ...projectContext,
      fileTree,
      sampleDatabaseSchema,
      sampleAuthCode,
      sampleAPICode,
      environmentFiles,
      hasBAA: await this.detectBAA(),
    };
  }

  /**
   * Gather context for summary generation
   */
  async gatherSummaryContext(projectContext: ProjectContext): Promise<Record<string, unknown>> {
    logger.info('Gathering summary context...');

    const [
      fileTree,
      packageJson,
      requirementsTxt,
      scriptsFromPackageJson,
      mainDirectories,
      entryPoint,
      gitCommits,
      envVariables,
      keyFeatures,
    ] = await Promise.all([
      this.getFileTree(3), // Shallower tree for summary
      this.getPackageJsonContent(),
      this.getRequirementsTxtContent(),
      this.extractPackageScripts(),
      this.getMainDirectories(),
      this.findEntryPoint(),
      this.getRecentGitCommitsWithKeywords(['fix', 'bug', 'issue', 'error'], 30),
      this.extractEnvVariables(),
      this.detectKeyFeatures(projectContext),
    ]);

    // Check if comprehensive docs exist
    const hasComprehensiveDocs = await this.checkComprehensiveDocs();
    let architectureContent: string | undefined;
    let claudeContent: string | undefined;

    if (hasComprehensiveDocs) {
      [architectureContent, claudeContent] = await Promise.all([
        this.readFileContent('ARCHITECTURE.md', 50000)
          .then(c => c || this.readFileContent('lean-reports/docs/ARCHITECTURE.md', 50000)),
        this.readFileContent('CLAUDE.md', 50000),
      ]).then(results => [results[0] || undefined, results[1] || undefined]);
    }

    return {
      ...projectContext,
      fileTree,
      packageJsonContent: packageJson,
      requirementsTxtContent: requirementsTxt,
      scriptsFromPackageJson,
      mainDirectories,
      entryPoint,
      gitRecentCommits: gitCommits,
      hasEnvExample: await this.hasEnvExample(),
      envVariables,
      keyFeatures,
      hasComprehensiveDocs,
      architectureContent,
      claudeContent,
    };
  }

  /**
   * Read specific file content (with size limit)
   */
  async readFileContent(relativePath: string, maxSize = 100000): Promise<string | null> {
    try {
      const fullPath = path.join(this.rootPath, relativePath);
      const stats = await fs.stat(fullPath);

      if (stats.size > maxSize) {
        logger.warn(`File ${relativePath} too large (${stats.size} bytes), skipping`);
        return null;
      }

      return await fs.readFile(fullPath, 'utf-8');
    } catch (_error) {
      logger.debug(`Could not read file: ${relativePath}`);
      return null;
    }
  }

  /**
   * Sample file content from multiple files (for pattern analysis)
   */
  async sampleFiles(files: string[], maxFiles = 30): Promise<Record<string, string>> {
    const sampled: Record<string, string> = {};
    const toSample = files.slice(0, maxFiles);

    for (const file of toSample) {
      const content = await this.readFileContent(file, 50000); // 50KB limit per file
      if (content) {
        sampled[file] = content;
      }
    }

    return sampled;
  }

  // ========================================
  // Project-type-specific file finders
  // ========================================

  /**
   * Find controller files (backend)
   */
  private async findControllerFiles(): Promise<string[]> {
    const patterns = [
      '**/controllers/**/*.{ts,js,py,java,go}',
      '**/*Controller.{ts,js,py,java,go}',
      '**/*controller.{ts,js,py,java,go}',
    ];
    const files = await glob(patterns, {
      cwd: this.rootPath,
      ignore: ['**/node_modules/**', '**/dist/**', '**/build/**'],
    });
    return files.slice(0, 50);
  }

  /**
   * Find service files (backend)
   */
  private async findServiceFiles(): Promise<string[]> {
    const patterns = [
      '**/services/**/*.{ts,js,py,java,go}',
      '**/*Service.{ts,js,py,java,go}',
      '**/*service.{ts,js,py,java,go}',
    ];
    const files = await glob(patterns, {
      cwd: this.rootPath,
      ignore: ['**/node_modules/**', '**/dist/**', '**/build/**'],
    });
    return files.slice(0, 50);
  }

  /**
   * Find model files (backend)
   */
  private async findModelFiles(): Promise<string[]> {
    const patterns = [
      '**/models/**/*.{ts,js,py,java,go}',
      '**/entities/**/*.{ts,js,py,java,go}',
      '**/*Model.{ts,js,py,java,go}',
      '**/*Entity.{ts,js,py,java,go}',
      '**/*.prisma',
    ];
    const files = await glob(patterns, {
      cwd: this.rootPath,
      ignore: ['**/node_modules/**', '**/dist/**', '**/build/**'],
    });
    return files.slice(0, 50);
  }

  /**
   * Find middleware files (backend)
   */
  private async findMiddlewareFiles(): Promise<string[]> {
    const patterns = [
      '**/middleware/**/*.{ts,js,py,java,go}',
      '**/middlewares/**/*.{ts,js,py,java,go}',
      '**/*Middleware.{ts,js,py,java,go}',
      '**/*middleware.{ts,js,py,java,go}',
    ];
    const files = await glob(patterns, {
      cwd: this.rootPath,
      ignore: ['**/node_modules/**', '**/dist/**', '**/build/**'],
    });
    return files.slice(0, 30);
  }

  /**
   * Find screen files (mobile)
   */
  private async findScreenFiles(): Promise<string[]> {
    const patterns = [
      '**/screens/**/*.{tsx,jsx,ts,js,dart,swift,kt}',
      '**/*Screen.{tsx,jsx,ts,js,dart,swift,kt}',
      '**/*screen.{tsx,jsx,ts,js,dart,swift,kt}',
      '**/pages/**/*.{tsx,jsx,dart}',
    ];
    const files = await glob(patterns, {
      cwd: this.rootPath,
      ignore: ['**/node_modules/**', '**/dist/**', '**/build/**'],
    });
    return files.slice(0, 50);
  }

  /**
   * Find navigation files (mobile)
   */
  private async findNavigationFiles(): Promise<string[]> {
    const patterns = [
      '**/navigation/**/*.{tsx,jsx,ts,js,dart,swift,kt}',
      '**/*Navigator.{tsx,jsx,ts,js}',
      '**/*Navigation.{tsx,jsx,ts,js}',
      '**/*navigator.{tsx,jsx,ts,js}',
    ];
    const files = await glob(patterns, {
      cwd: this.rootPath,
      ignore: ['**/node_modules/**', '**/dist/**', '**/build/**'],
    });
    return files.slice(0, 30);
  }

  /**
   * Find native module files (mobile)
   */
  private async findNativeModuleFiles(): Promise<string[]> {
    const patterns = [
      '**/native/**/*.{ts,js,swift,kt,java,m,mm}',
      '**/modules/**/*.{swift,kt,java,m,mm}',
      '**/*Bridge.{ts,js,swift,kt,java}',
      '**/*Module.{swift,kt,java,m}',
      'ios/**/*.swift',
      'android/**/*.kt',
      'android/**/*.java',
    ];
    const files = await glob(patterns, {
      cwd: this.rootPath,
      ignore: ['**/node_modules/**', '**/dist/**', '**/build/**', '**/Pods/**'],
    });
    return files.slice(0, 30);
  }

  /**
   * Find Terraform files (devops)
   */
  private async findTerraformFiles(): Promise<string[]> {
    const patterns = ['**/*.tf', '**/*.tfvars'];
    const files = await glob(patterns, {
      cwd: this.rootPath,
      ignore: ['**/node_modules/**', '**/.terraform/**'],
    });
    return files.slice(0, 50);
  }

  /**
   * Find Kubernetes files (devops)
   */
  private async findK8sFiles(): Promise<string[]> {
    const patterns = [
      '**/k8s/**/*.{yaml,yml}',
      '**/kubernetes/**/*.{yaml,yml}',
      '**/helm/**/*.{yaml,yml}',
      '**/charts/**/*.{yaml,yml}',
    ];
    const files = await glob(patterns, {
      cwd: this.rootPath,
      ignore: ['**/node_modules/**'],
    });
    return files.slice(0, 50);
  }

  /**
   * Find CI/CD files (devops)
   */
  private async findCICDFiles(): Promise<string[]> {
    const patterns = [
      '.github/workflows/**/*.{yaml,yml}',
      '.gitlab-ci.yml',
      'Jenkinsfile',
      'azure-pipelines.yml',
      '.circleci/**/*.{yaml,yml}',
      '.travis.yml',
      'bitbucket-pipelines.yml',
    ];
    const files = await glob(patterns, {
      cwd: this.rootPath,
      ignore: ['**/node_modules/**'],
      dot: true,
    });
    return files;
  }

  /**
   * Detect mobile platform from project context
   */
  private async detectMobilePlatform(context: Record<string, unknown>): Promise<string> {
    const deps = (context.dependencies || {}) as Record<string, string>;
    if (deps['react-native'] || deps['expo']) return 'react-native';
    if (await fs.pathExists(path.join(this.rootPath, 'pubspec.yaml'))) return 'flutter';
    if (await fs.pathExists(path.join(this.rootPath, 'ios'))) return 'ios';
    if (await fs.pathExists(path.join(this.rootPath, 'android'))) return 'android';
    return 'unknown';
  }

  /**
   * Detect cloud provider from infrastructure files
   */
  private async detectCloudProvider(
    terraformFiles: string[],
    k8sFiles: string[]
  ): Promise<string | undefined> {
    // Check terraform files for provider blocks
    for (const file of terraformFiles.slice(0, 5)) {
      const content = await this.readFileContent(file, 30000);
      if (content) {
        if (content.includes('provider "aws"') || content.includes('aws_')) return 'aws';
        if (content.includes('provider "google"') || content.includes('google_')) return 'gcp';
        if (content.includes('provider "azurerm"') || content.includes('azurerm_')) return 'azure';
      }
    }

    // Check k8s/docker files for cloud references
    const allFiles = [...k8sFiles.slice(0, 3)];
    for (const file of allFiles) {
      const content = await this.readFileContent(file, 30000);
      if (content) {
        if (content.includes('eks') || content.includes('ecr') || content.includes('aws')) return 'aws';
        if (content.includes('gke') || content.includes('gcr') || content.includes('gcp')) return 'gcp';
        if (content.includes('aks') || content.includes('acr') || content.includes('azure')) return 'azure';
      }
    }

    return undefined;
  }

  // ========================================
  // Helper methods for new context gatherers
  // ========================================

  /**
   * Find license files
   */
  private async findLicenseFiles(): Promise<string[]> {
    const patterns = ['LICENSE*', 'LICENCE*', '**/LICENSE*', '**/LICENCE*'];
    const files = await glob(patterns, {
      cwd: this.rootPath,
      ignore: ['**/node_modules/**'],
      dot: true,
    });
    return files;
  }


  /**
   * Sample code files for quality analysis
   */
  private async sampleCodeFiles(): Promise<Record<string, string>> {
    const patterns = ['**/src/**/*.{ts,tsx,js,jsx,py,java,go}'];
    const files = await glob(patterns, {
      cwd: this.rootPath,
      ignore: [
        '**/node_modules/**',
        '**/dist/**',
        '**/build/**',
        '**/*.test.*',
        '**/*.spec.*',
      ],
    });

    // Use prioritized reading for comprehensive coverage
    return this.readPrioritizedFiles(files, 60, 50000);
  }

  /**
   * Find cloud config files
   */
  private async findCloudConfigFiles(): Promise<string[]> {
    const patterns = [
      '**/terraform/**/*.tf',
      '**/*.tf',
      '**/cloudformation/**/*.{yaml,yml,json}',
      '**/k8s/**/*.{yaml,yml}',
      '**/kubernetes/**/*.{yaml,yml}',
      'serverless.yml',
      'serverless.yaml',
    ];
    const files = await glob(patterns, {
      cwd: this.rootPath,
      ignore: ['**/node_modules/**', '**/.terraform/**'],
    });
    return files;
  }

  /**
   * Find database files
   */
  private async findDatabaseFiles(): Promise<string[]> {
    const patterns = [
      '**/migrations/**/*.{ts,js,sql,py}',
      '**/models/**/*.{ts,js,py}',
      '**/entities/**/*.{ts,js}',
      '**/schema/**/*.{ts,js,sql,prisma}',
      '**/*.prisma',
      '**/database/**/*.{ts,js,py,sql}',
    ];
    const files = await glob(patterns, {
      cwd: this.rootPath,
      ignore: ['**/node_modules/**', '**/dist/**'],
    });
    return files;
  }

  /**
   * Find cache files
   */
  private async findCacheFiles(): Promise<string[]> {
    const patterns = ['**/cache/**/*.{ts,js,py}', '**/*Cache*.{ts,js,py}', '**/*cache*.{ts,js,py}'];
    const files = await glob(patterns, {
      cwd: this.rootPath,
      ignore: ['**/node_modules/**', '**/dist/**'],
    });
    return files;
  }

  /**
   * Find Dockerfile files
   */
  private async findDockerfiles(): Promise<string[]> {
    const patterns = ['**/Dockerfile*', '**/*.dockerfile', '**/docker-compose*.{yml,yaml}'];
    const files = await glob(patterns, {
      cwd: this.rootPath,
      ignore: ['**/node_modules/**'],
    });
    return files;
  }

  /**
   * Find authentication files
   */
  private async findAuthFiles(): Promise<string[]> {
    const patterns = [
      '**/auth/**/*.{ts,js,py}',
      '**/authentication/**/*.{ts,js,py}',
      '**/*Auth*.{ts,js,py}',
      '**/*auth*.{ts,js,py}',
    ];
    const files = await glob(patterns, {
      cwd: this.rootPath,
      ignore: ['**/node_modules/**', '**/dist/**'],
    });
    return files;
  }

  /**
   * Detect BAA (Business Associate Agreement) references
   */
  private async detectBAA(): Promise<boolean> {
    // Check for BAA mentions in documentation or config files
    const patterns = ['**/README.md', '**/COMPLIANCE.md', '**/SECURITY.md', '**/*.md'];
    const files = await glob(patterns, {
      cwd: this.rootPath,
      ignore: ['**/node_modules/**'],
    });

    for (const file of files.slice(0, 10)) {
      const content = await this.readFileContent(file);
      if (content && /BAA|Business Associate Agreement|HIPAA.*agreement/i.test(content)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Extract package scripts from package.json
   */
  private async extractPackageScripts(): Promise<Record<string, string>> {
    const pkgContent = await this.getPackageJsonContent();
    if (!pkgContent) return {};

    try {
      const pkg = JSON.parse(pkgContent);
      return pkg.scripts || {};
    } catch {
      return {};
    }
  }

  /**
   * Get main directories
   */
  private async getMainDirectories(): Promise<string[]> {
    const files = await glob('*/', {
      cwd: this.rootPath,
      ignore: ['node_modules/', 'dist/', 'build/', '.git/', '.next/', 'out/'],
    });
    return files.map(f => f.replace(/\/$/, ''));
  }

  /**
   * Find entry point file
   */
  private async findEntryPoint(): Promise<string | undefined> {
    const candidates = [
      'src/index.ts',
      'src/index.js',
      'src/main.ts',
      'src/main.js',
      'index.ts',
      'index.js',
      'main.ts',
      'main.js',
      'app.py',
      'main.py',
      'main.go',
    ];

    for (const candidate of candidates) {
      if (await fs.pathExists(path.join(this.rootPath, candidate))) {
        return candidate;
      }
    }

    return undefined;
  }

  /**
   * Get recent git commits with specific keywords
   */
  private async getRecentGitCommitsWithKeywords(
    keywords: string[],
    count = 30
  ): Promise<string> {
    try {
      const log = await this.git.log({ maxCount: count * 2 }); // Get more to filter

      const filtered = log.all.filter(commit => {
        const msg = commit.message.toLowerCase();
        return keywords.some(keyword => msg.includes(keyword.toLowerCase()));
      });

      const commits = filtered.slice(0, count).map(commit => {
        return `${commit.hash.substring(0, 7)} - ${commit.message} (${commit.date})`;
      });

      return commits.join('\n');
    } catch (_error) {
      logger.debug('Could not read git history');
      return 'Git history not available';
    }
  }

  /**
   * Extract environment variables (names only)
   */
  private async extractEnvVariables(): Promise<string[]> {
    const envExamplePath = path.join(this.rootPath, '.env.example');
    if (!(await fs.pathExists(envExamplePath))) {
      return [];
    }

    try {
      const content = await fs.readFile(envExamplePath, 'utf-8');
      const lines = content.split('\n');
      const variables: string[] = [];

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
          const match = trimmed.match(/^([A-Z_][A-Z0-9_]*)=/);
          if (match) {
            variables.push(match[1]);
          }
        }
      }

      return variables;
    } catch {
      return [];
    }
  }

  /**
   * Detect key features from codebase
   */
  private async detectKeyFeatures(projectContext: ProjectContext): Promise<string[]> {
    const features: string[] = [];

    // Based on project type and detected patterns
    if (projectContext.hasDatabase) {
      features.push(`Database integration (${projectContext.databaseType || 'detected'})`);
    }

    if (projectContext.hasTests) {
      features.push('Automated testing');
    }

    if (projectContext.hasCICD) {
      features.push('CI/CD pipeline');
    }

    if (await this.detectAuthentication()) {
      features.push('User authentication');
    }

    if (await this.detectAPIEndpoints()) {
      features.push('REST API endpoints');
    }

    // Frontend-specific
    if (projectContext.projectType === 'frontend') {
      const hasRouting = (await this.findRoutingFiles()).length > 0;
      if (hasRouting) {
        features.push('Client-side routing');
      }

      const hasStateManagement = (await this.findStateManagementFiles()).length > 0;
      if (hasStateManagement) {
        features.push('State management');
      }
    }

    // Ensure we have at least 3-6 features
    if (features.length < 3) {
      features.push('Modern development stack');
    }

    return features.slice(0, 6);
  }

  /**
   * Check if comprehensive documentation exists
   */
  private async checkComprehensiveDocs(): Promise<boolean> {
    const architectureExists = await fs.pathExists(path.join(this.rootPath, 'ARCHITECTURE.md'));
    const claudeExists = await fs.pathExists(path.join(this.rootPath, 'CLAUDE.md'));
    const docsDir = await fs.pathExists(path.join(this.rootPath, 'docs'));
    const reportsDocsDir = await fs.pathExists(path.join(this.rootPath, 'lean-reports', 'docs'));

    return architectureExists || claudeExists || docsDir || reportsDocsDir;
  }

  /**
   * Check if .env.example exists
   */
  private async hasEnvExample(): Promise<boolean> {
    return await fs.pathExists(path.join(this.rootPath, '.env.example'));
  }
}
