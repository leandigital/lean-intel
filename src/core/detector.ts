/**
 * Project type detection logic
 * Analyzes codebase to determine if it's frontend, backend, or devops
 */

import * as fs from 'fs-extra';
import * as path from 'path';
import { glob } from 'glob';
import { ProjectContext, ProjectType } from '../types';
import { determineDocumentationTier } from '../utils/documentationTier';

// Type for package.json structure
interface PackageJson {
  name?: string;
  version?: string;
  description?: string;
  main?: string;
  scripts?: Record<string, string>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  workspaces?: string[] | { packages: string[] };
}

export class ProjectDetector {
  private rootPath: string;

  constructor(rootPath: string) {
    this.rootPath = rootPath;
  }

  async detect(): Promise<ProjectContext> {
    const packageJson = await this.readPackageJson();
    const files = await this.scanFiles();

    // Detect project type
    const projectType = this.detectProjectType(packageJson, files);

    // Detect package manager
    const packageManager = await this.detectPackageManager();

    // Detect frameworks and languages
    const frameworks = this.detectFrameworks(packageJson, files);
    const languages = this.detectLanguages(files);

    // Check for various features
    const hasDatabase = this.hasDatabase(packageJson, files);
    const hasTests = this.hasTests(packageJson, files);
    const hasCICD = this.hasCICD(files);

    // Count files and lines (estimate)
    const { fileCount, lineCount } = await this.countFilesAndLines();

    // Detect if monorepo
    const isMonorepo = files.some(f => f.includes('packages/') || f.includes('apps/'));

    // Determine documentation tier based on codebase size
    const documentationTier = determineDocumentationTier(fileCount, {
      projectType,
      isMonorepo,
      hasComplexDomain: frameworks.length > 2 || hasDatabase, // Multiple frameworks or database = complex
    });

    return {
      projectType,
      rootPath: this.rootPath,
      packageManager,
      frameworks,
      languages,
      hasDatabase,
      hasTests,
      hasCICD,
      dependencies: packageJson?.dependencies || {},
      devDependencies: packageJson?.devDependencies || {},
      fileCount,
      lineCount,
      documentationTier,
    };
  }

  private async readPackageJson(): Promise<PackageJson | null> {
    const packageJsonPath = path.join(this.rootPath, 'package.json');
    if (await fs.pathExists(packageJsonPath)) {
      return fs.readJson(packageJsonPath) as Promise<PackageJson>;
    }
    return null;
  }

  private async scanFiles(): Promise<string[]> {
    // Get all files, ignoring common directories
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
      ],
      nodir: true,
      absolute: false,
    });

    return files;
  }

  private detectProjectType(packageJson: PackageJson | null, files: string[]): ProjectType {
    // Mobile detection (check first to avoid confusion with web frontend)
    const mobileIndicators = [
      // React Native
      packageJson?.dependencies?.['react-native'],
      files.some(f => f === 'metro.config.js' || f === 'metro.config.ts'),
      files.some(f => f === 'app.json'), // React Native config
      files.some(f => f.includes('ios/') || f.includes('android/')),
      // Flutter
      files.some(f => f === 'pubspec.yaml'),
      files.some(f => f.includes('lib/') && f.endsWith('.dart')),
      // iOS Native (Swift)
      files.some(f => f.includes('.xcodeproj') || f.includes('.xcworkspace')),
      files.some(f => f.endsWith('.swift')),
      files.some(f => f === 'Info.plist'),
      // Android Native (Kotlin/Java)
      files.some(f => f === 'build.gradle' && files.some(g => g.includes('android'))),
      files.some(f => f === 'AndroidManifest.xml'),
      files.some(f => f.endsWith('.kt') || (f.endsWith('.java') && f.includes('app/src/'))),
    ];

    // Frontend detection
    // Check dependencies, devDependencies, and peerDependencies (component libraries often use peer deps)
    const hasReact = (packageJson?.dependencies?.['react'] ||
                      packageJson?.devDependencies?.['react'] ||
                      packageJson?.peerDependencies?.['react']) &&
                     !packageJson?.dependencies?.['react-native'];
    const hasVue = packageJson?.dependencies?.['vue'] ||
                   packageJson?.devDependencies?.['vue'] ||
                   packageJson?.peerDependencies?.['vue'];
    const hasAngular = packageJson?.dependencies?.['@angular/core'] ||
                       packageJson?.devDependencies?.['@angular/core'];

    const frontendIndicators = [
      // Framework dependencies (exclude React Native)
      hasReact,
      hasVue,
      hasAngular,
      packageJson?.dependencies?.['svelte'],
      packageJson?.dependencies?.['next'],
      packageJson?.dependencies?.['nuxt'],
      // Bundlers with frameworks (strong signal)
      packageJson?.devDependencies?.['rollup'] && (hasReact || hasVue || hasAngular),
      packageJson?.devDependencies?.['webpack'] && (hasReact || hasVue || hasAngular),
      packageJson?.devDependencies?.['vite'] && (hasReact || hasVue || hasAngular),
      // Framework component files
      files.some(f => f.includes('components/') && (f.endsWith('.jsx') || f.endsWith('.tsx') || f.endsWith('.vue'))),
      files.some(f => f.endsWith('.jsx') || f.endsWith('.tsx')),
      files.some(f => f.endsWith('.vue')),
      files.some(f => f.includes('pages/') && (f.endsWith('.jsx') || f.endsWith('.tsx') || f.endsWith('.vue'))),
      // Vanilla JS / non-framework frontend indicators
      // Frontend CSS build tooling (devDependencies — almost exclusively frontend)
      packageJson?.devDependencies?.['css-loader'] || packageJson?.devDependencies?.['style-loader'] || packageJson?.devDependencies?.['sass-loader'],
      packageJson?.devDependencies?.['html-webpack-plugin'] || packageJson?.devDependencies?.['html-bundler-webpack-plugin'],
      // Frontend UI/animation libraries (dependencies)
      packageJson?.dependencies?.['gsap'] || packageJson?.dependencies?.['swiper'] || packageJson?.dependencies?.['jquery'] || packageJson?.dependencies?.['bootstrap'] || packageJson?.dependencies?.['three'],
      // Tailwind or PostCSS config files (exclusively frontend)
      files.some(f => f === 'tailwind.config.js' || f === 'tailwind.config.ts' || f === 'postcss.config.js' || f === 'postcss.config.ts' || f === 'postcss.config.mjs'),
      // SCSS/SASS/LESS source files in source directories
      files.some(f => (f.startsWith('src/') || f.includes('styles/')) && (f.endsWith('.scss') || f.endsWith('.sass') || f.endsWith('.less'))),
      // HTML template files in source directories
      files.some(f => (f.startsWith('src/') || f.includes('views/')) && f.endsWith('.html')),
    ];

    // Backend detection
    const backendIndicators = [
      // Node.js frameworks
      packageJson?.dependencies?.['express'],
      packageJson?.dependencies?.['@nestjs/core'],
      packageJson?.dependencies?.['fastify'],
      packageJson?.dependencies?.['koa'],
      // Additional Node.js/JS server frameworks
      packageJson?.dependencies?.['hono'] || packageJson?.dependencies?.['elysia'] || packageJson?.dependencies?.['h3'] || packageJson?.dependencies?.['hapi'] || packageJson?.dependencies?.['@hapi/hapi'],
      // Python
      files.some(f => f === 'requirements.txt'),
      files.some(f => f === 'pyproject.toml'),
      files.some(f => f.includes('manage.py')),
      // Java
      files.some(f => f === 'pom.xml'),
      files.some(f => f === 'build.gradle'),
      // PHP
      files.some(f => f === 'composer.json'),
      // Go
      files.some(f => f === 'go.mod'),
      // Rust
      files.some(f => f === 'Cargo.toml'),
      // Ruby
      files.some(f => f === 'Gemfile'),
      // .NET
      files.some(f => f.endsWith('.csproj') || f.endsWith('.sln')),
      // Database/API patterns
      files.some(f => f.includes('controllers/') || f.includes('routes/')),
      files.some(f => f.includes('models/') && !f.includes('components/')),
      files.some(f => f.includes('middleware/')),
      // Frameworkless backend indicators
      // Database client libraries (almost exclusively backend)
      packageJson?.dependencies?.['pg'] || packageJson?.dependencies?.['mysql2'] || packageJson?.dependencies?.['mongodb'] || packageJson?.dependencies?.['mongoose'],
      packageJson?.dependencies?.['prisma'] || packageJson?.dependencies?.['@prisma/client'] || packageJson?.dependencies?.['typeorm'] || packageJson?.dependencies?.['sequelize'] || packageJson?.dependencies?.['drizzle-orm'],
      packageJson?.dependencies?.['redis'] || packageJson?.dependencies?.['ioredis'] || packageJson?.dependencies?.['bullmq'],
      // Server/API utilities (almost exclusively backend)
      packageJson?.dependencies?.['cors'] || packageJson?.dependencies?.['helmet'] || packageJson?.dependencies?.['morgan'] || packageJson?.dependencies?.['compression'],
      packageJson?.dependencies?.['jsonwebtoken'] || packageJson?.dependencies?.['bcrypt'] || packageJson?.dependencies?.['bcryptjs'] || packageJson?.dependencies?.['passport'],
      packageJson?.dependencies?.['nodemailer'] || packageJson?.dependencies?.['socket.io'] || packageJson?.dependencies?.['ws'],
      // GraphQL server
      packageJson?.dependencies?.['graphql'] || packageJson?.dependencies?.['@apollo/server'] || packageJson?.dependencies?.['type-graphql'],
    ];

    // DevOps detection - ONLY infrastructure-as-code patterns
    // NOTE: CI/CD files are NOT included as they're standard in all modern projects
    const devopsIndicators = [
      // Infrastructure as Code
      files.some(f => f.endsWith('.tf')),
      files.some(f => f.includes('terraform/')),
      files.some(f => f.endsWith('.yaml') && f.includes('k8s')),
      files.some(f => f.includes('kubernetes/')),
      files.some(f => f.includes('helm/')),
      files.some(f => f.endsWith('cloudformation.yml')),
      files.some(f => f.endsWith('cloudformation.yaml')),
      // Docker ONLY if combined with IaC (checked separately below)
      files.some(f => f === 'Dockerfile' && (
        files.some(tf => tf.endsWith('.tf')) ||
        files.some(k8s => k8s.includes('kubernetes/') || k8s.includes('k8s'))
      )),
      files.some(f => f === 'docker-compose.yml' && (
        files.some(tf => tf.endsWith('.tf')) ||
        files.some(k8s => k8s.includes('kubernetes/') || k8s.includes('k8s'))
      )),
    ];

    const mobileScore = mobileIndicators.filter(Boolean).length;
    const frontendScore = frontendIndicators.filter(Boolean).length;
    const backendScore = backendIndicators.filter(Boolean).length;
    const devopsScore = devopsIndicators.filter(Boolean).length;

    // Check for strong IaC indicators (Terraform, K8s, etc.)
    const hasTerraform = files.some(f => f.endsWith('.tf'));
    const hasK8s = files.some(f => f.includes('kubernetes/') || (f.endsWith('.yaml') && f.includes('k8s')));
    const hasHelm = files.some(f => f.includes('helm/'));
    const strongIaCIndicator = hasTerraform || hasK8s || hasHelm;

    // Determine primary type
    // Mobile gets priority if score >= 2 (need strong indicators)
    if (mobileScore >= 2) {
      return 'mobile';
    }
    // DevOps gets priority if:
    // - Has strong IaC indicators (Terraform, K8s, Helm) with score >= 1, OR
    // - Score >= 2 and >= other categories
    else if ((strongIaCIndicator && devopsScore >= 1) ||
             (devopsScore >= 2 && devopsScore >= frontendScore && devopsScore >= backendScore)) {
      return 'devops';
    } else if (backendScore > frontendScore) {
      return 'backend';
    } else if (frontendScore > 0) {
      return 'frontend';
    }

    return 'unknown';
  }

  private async detectPackageManager(): Promise<
    'npm' | 'yarn' | 'pnpm' | 'bun' | undefined
  > {
    if (await fs.pathExists(path.join(this.rootPath, 'bun.lockb'))) {
      return 'bun';
    }
    if (await fs.pathExists(path.join(this.rootPath, 'pnpm-lock.yaml'))) {
      return 'pnpm';
    }
    if (await fs.pathExists(path.join(this.rootPath, 'yarn.lock'))) {
      return 'yarn';
    }
    if (await fs.pathExists(path.join(this.rootPath, 'package-lock.json'))) {
      return 'npm';
    }
    return undefined;
  }

  private detectFrameworks(packageJson: PackageJson | null, files: string[]): string[] {
    const frameworks: string[] = [];

    // Mobile frameworks
    if (packageJson?.dependencies?.['react-native']) frameworks.push('React Native');
    if (packageJson?.dependencies?.['expo']) frameworks.push('Expo');
    if (files.some(f => f === 'pubspec.yaml')) frameworks.push('Flutter');
    if (files.some(f => f.includes('.xcodeproj') || f.includes('.xcworkspace'))) {
      frameworks.push('iOS (Swift/Objective-C)');
    }
    if (files.some(f => f === 'AndroidManifest.xml')) frameworks.push('Android (Kotlin/Java)');

    // Frontend frameworks
    if (packageJson?.dependencies?.['react'] && !packageJson?.dependencies?.['react-native']) {
      frameworks.push('React');
    }
    if (packageJson?.dependencies?.['vue']) frameworks.push('Vue');
    if (packageJson?.dependencies?.['@angular/core']) frameworks.push('Angular');
    if (packageJson?.dependencies?.['svelte']) frameworks.push('Svelte');
    if (packageJson?.dependencies?.['next']) frameworks.push('Next.js');
    if (packageJson?.dependencies?.['nuxt']) frameworks.push('Nuxt');

    // Backend frameworks
    if (packageJson?.dependencies?.['express']) frameworks.push('Express');
    if (packageJson?.dependencies?.['@nestjs/core']) frameworks.push('NestJS');
    if (packageJson?.dependencies?.['fastify']) frameworks.push('Fastify');
    if (packageJson?.dependencies?.['koa']) frameworks.push('Koa');

    // State management
    if (packageJson?.dependencies?.['redux']) frameworks.push('Redux');
    if (packageJson?.dependencies?.['@reduxjs/toolkit']) frameworks.push('Redux Toolkit');
    if (packageJson?.dependencies?.['zustand']) frameworks.push('Zustand');
    if (packageJson?.dependencies?.['mobx']) frameworks.push('MobX');

    // Python frameworks
    if (files.some(f => f.includes('django'))) frameworks.push('Django');
    if (files.some(f => f.includes('flask'))) frameworks.push('Flask');
    if (files.some(f => f.includes('fastapi'))) frameworks.push('FastAPI');

    // Infrastructure
    if (files.some(f => f.endsWith('.tf'))) frameworks.push('Terraform');
    if (files.some(f => f.includes('kubernetes/'))) frameworks.push('Kubernetes');

    return frameworks;
  }

  private detectLanguages(files: string[]): string[] {
    const languages = new Set<string>();

    files.forEach(file => {
      const ext = path.extname(file);
      switch (ext) {
        case '.ts':
        case '.tsx':
          languages.add('TypeScript');
          break;
        case '.js':
        case '.jsx':
          languages.add('JavaScript');
          break;
        case '.dart':
          languages.add('Dart');
          break;
        case '.swift':
          languages.add('Swift');
          break;
        case '.kt':
          languages.add('Kotlin');
          break;
        case '.py':
          languages.add('Python');
          break;
        case '.java':
          languages.add('Java');
          break;
        case '.go':
          languages.add('Go');
          break;
        case '.rb':
          languages.add('Ruby');
          break;
        case '.php':
          languages.add('PHP');
          break;
        case '.rs':
          languages.add('Rust');
          break;
        case '.tf':
          languages.add('HCL');
          break;
      }
    });

    return Array.from(languages);
  }

  private hasDatabase(packageJson: PackageJson | null, files: string[]): boolean {
    const dbIndicators = [
      // Package dependencies
      packageJson?.dependencies?.['pg'],
      packageJson?.dependencies?.['mysql2'],
      packageJson?.dependencies?.['mongodb'],
      packageJson?.dependencies?.['mongoose'],
      packageJson?.dependencies?.['sequelize'],
      packageJson?.dependencies?.['typeorm'],
      packageJson?.dependencies?.['prisma'],
      // Files
      files.some(f => f.includes('prisma/schema.prisma')),
      files.some(f => f.includes('migrations/')),
    ];

    return dbIndicators.some(Boolean);
  }

  private hasTests(packageJson: PackageJson | null, files: string[]): boolean {
    const testIndicators = [
      packageJson?.devDependencies?.['jest'],
      packageJson?.devDependencies?.['vitest'],
      packageJson?.devDependencies?.['mocha'],
      packageJson?.devDependencies?.['@testing-library/react'],
      packageJson?.devDependencies?.['cypress'],
      packageJson?.devDependencies?.['playwright'],
      files.some(f => f.includes('test/') || f.includes('tests/')),
      files.some(f => f.includes('.test.') || f.includes('.spec.')),
    ];

    return testIndicators.some(Boolean);
  }

  private hasCICD(files: string[]): boolean {
    return files.some(
      f =>
        f.includes('.github/workflows/') ||
        f.includes('.gitlab-ci.yml') ||
        f.includes('.circleci/') ||
        f.includes('Jenkinsfile')
    );
  }

  private async countFilesAndLines(): Promise<{ fileCount: number; lineCount: number }> {
    const files = await this.scanFiles();
    const codeFiles = files.filter(f => {
      const ext = path.extname(f);
      return [
        '.ts',
        '.tsx',
        '.js',
        '.jsx',
        '.dart',
        '.swift',
        '.kt',
        '.py',
        '.java',
        '.go',
        '.rb',
        '.php',
        '.tf',
      ].includes(ext);
    });

    let lineCount = 0;

    // Sample up to 100 files for line count estimation
    const sampleSize = Math.min(100, codeFiles.length);
    const sampleFiles = codeFiles.slice(0, sampleSize);

    for (const file of sampleFiles) {
      try {
        const content = await fs.readFile(path.join(this.rootPath, file), 'utf-8');
        lineCount += content.split('\n').length;
      } catch (_error) {
        // Skip files that can't be read
      }
    }

    // Guard against division by zero when no code files sampled
    if (sampleSize === 0) {
      return { fileCount: 0, lineCount: 0 };
    }

    // Extrapolate to all files
    const averageLinesPerFile = lineCount / sampleSize;
    const estimatedTotalLines = Math.round(averageLinesPerFile * codeFiles.length);

    return {
      fileCount: codeFiles.length,
      lineCount: estimatedTotalLines,
    };
  }
}
