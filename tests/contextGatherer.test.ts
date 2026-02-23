/**
 * Tests for ContextGatherer
 */

import { ContextGatherer } from '../src/core/contextGatherer';
import * as path from 'path';

const fixturesPath = path.join(__dirname, 'fixtures');

describe('ContextGatherer', () => {
  describe('constructor', () => {
    it('should be instantiable', () => {
      const gatherer = new ContextGatherer(process.cwd());
      expect(gatherer).toBeInstanceOf(ContextGatherer);
    });
  });

  describe('gatherDocumentationContext', () => {
    it('should gather documentation context for React project', async () => {
      const gatherer = new ContextGatherer(path.join(fixturesPath, 'react-frontend'));
      const mockContext = {
        rootPath: path.join(fixturesPath, 'react-frontend'),
        projectType: 'frontend' as const,
        frameworks: ['React'],
        languages: ['TypeScript'],
        dependencies: { react: '^18.0.0' },
        devDependencies: { vite: '^4.0.0' },
        hasTests: false,
        hasDatabase: false,
        hasCICD: false,
        lineCount: 100,
        fileCount: 10,
      };

      const result = await gatherer.gatherDocumentationContext(mockContext);

      expect(result).toHaveProperty('fileTree');
      expect(result).toHaveProperty('componentFiles');
      expect(result).toHaveProperty('routingFiles');
      expect(result).toHaveProperty('stateManagementFiles');
      expect(result).toHaveProperty('apiFiles');
      expect(result).toHaveProperty('stylingFiles');
      expect(result).toHaveProperty('gitRecentCommits');
    }, 30000);

    it('should gather documentation context for Express project', async () => {
      const gatherer = new ContextGatherer(path.join(fixturesPath, 'express-backend'));
      const mockContext = {
        rootPath: path.join(fixturesPath, 'express-backend'),
        projectType: 'backend' as const,
        frameworks: ['Express'],
        languages: ['TypeScript'],
        dependencies: { express: '^4.0.0' },
        devDependencies: {},
        hasTests: false,
        hasDatabase: false,
        hasCICD: false,
        lineCount: 100,
        fileCount: 10,
      };

      const result = await gatherer.gatherDocumentationContext(mockContext);

      expect(result).toHaveProperty('fileTree');
      expect(result).toHaveProperty('apiFiles');
      expect(typeof result.fileTree).toBe('string');
    }, 30000);
  });

  describe('gatherSecurityContext', () => {
    it('should gather security context', async () => {
      const gatherer = new ContextGatherer(path.join(fixturesPath, 'react-frontend'));
      const mockContext = {
        rootPath: path.join(fixturesPath, 'react-frontend'),
        projectType: 'frontend' as const,
        frameworks: ['React'],
        languages: ['TypeScript'],
        dependencies: { react: '^18.0.0' },
        devDependencies: {},
        hasTests: false,
        hasDatabase: false,
        hasCICD: false,
        lineCount: 100,
        fileCount: 10,
      };

      const result = await gatherer.gatherSecurityContext(mockContext);

      expect(result).toHaveProperty('projectType');
      expect(result).toHaveProperty('frameworks');
      expect(result).toHaveProperty('dependencies');
      expect(result).toHaveProperty('fileTree');
      expect(result).toHaveProperty('environmentFiles');
      expect(result).toHaveProperty('configFiles');
      expect(result).toHaveProperty('hasAuthentication');
      expect(result).toHaveProperty('hasAPIEndpoints');
    }, 30000);
  });

  describe('gatherLicenseContext', () => {
    it('should gather license context', async () => {
      const gatherer = new ContextGatherer(path.join(fixturesPath, 'react-frontend'));
      const mockContext = {
        rootPath: path.join(fixturesPath, 'react-frontend'),
        projectType: 'frontend' as const,
        frameworks: ['React'],
        languages: ['TypeScript'],
        dependencies: { react: '^18.0.0', 'react-dom': '^18.0.0' },
        devDependencies: { vite: '^4.0.0' },
        hasTests: false,
        hasDatabase: false,
        hasCICD: false,
        lineCount: 100,
        fileCount: 10,
      };

      const result = await gatherer.gatherLicenseContext(mockContext);

      expect(result).toHaveProperty('dependencies');
      expect(result).toHaveProperty('devDependencies');
      expect(result).toHaveProperty('fileTree');
      expect(result).toHaveProperty('licenseFiles');
    }, 30000);
  });

  describe('gatherQualityContext', () => {
    it('should gather quality context', async () => {
      const gatherer = new ContextGatherer(path.join(fixturesPath, 'react-frontend'));
      const mockContext = {
        rootPath: path.join(fixturesPath, 'react-frontend'),
        projectType: 'frontend' as const,
        frameworks: ['React'],
        languages: ['TypeScript'],
        dependencies: { react: '^18.0.0' },
        devDependencies: { jest: '^29.0.0' },
        hasTests: true,
        testFramework: 'jest',
        hasDatabase: false,
        hasCICD: false,
        lineCount: 100,
        fileCount: 10,
      };

      const result = await gatherer.gatherQualityContext(mockContext);

      expect(result).toHaveProperty('projectType');
      expect(result).toHaveProperty('frameworks');
      expect(result).toHaveProperty('languages');
      expect(result).toHaveProperty('fileCount');
      expect(result).toHaveProperty('lineCount');
      expect(result).toHaveProperty('dependencies');
      expect(result).toHaveProperty('devDependencies');
      expect(result).toHaveProperty('fileTree');
      expect(result).toHaveProperty('hasTests');
      expect(result).toHaveProperty('gitCommitsAnalysis');
      expect(result).toHaveProperty('sampleCodeFiles');
      expect(result).toHaveProperty('componentFiles');
      expect(result).toHaveProperty('configFiles');
    }, 30000);
  });

  describe('gatherCostContext', () => {
    it('should gather cost context', async () => {
      const gatherer = new ContextGatherer(path.join(fixturesPath, 'react-frontend'));
      const mockContext = {
        rootPath: path.join(fixturesPath, 'react-frontend'),
        projectType: 'frontend' as const,
        frameworks: ['React'],
        languages: ['TypeScript'],
        dependencies: { react: '^18.0.0' },
        devDependencies: {},
        hasTests: false,
        hasDatabase: false,
        hasCICD: false,
        lineCount: 1000,
        fileCount: 50,
      };

      const result = await gatherer.gatherCostContext(mockContext);

      expect(result).toHaveProperty('projectType');
      expect(result).toHaveProperty('frameworks');
      expect(result).toHaveProperty('fileCount');
      expect(result).toHaveProperty('lineCount');
      expect(result).toHaveProperty('dependencies');
      expect(result).toHaveProperty('infrastructureFiles');
      expect(result).toHaveProperty('fileTree');
      expect(result).toHaveProperty('sampleAPICode');
    }, 30000);
  });

  describe('gatherHIPAAContext', () => {
    it('should gather HIPAA context', async () => {
      const gatherer = new ContextGatherer(path.join(fixturesPath, 'express-backend'));
      const mockContext = {
        rootPath: path.join(fixturesPath, 'express-backend'),
        projectType: 'backend' as const,
        frameworks: ['Express'],
        languages: ['TypeScript'],
        dependencies: { express: '^4.0.0' },
        devDependencies: {},
        hasTests: false,
        hasDatabase: false,
        hasCICD: false,
        lineCount: 100,
        fileCount: 10,
      };

      const result = await gatherer.gatherHIPAAContext(mockContext);

      expect(result).toHaveProperty('projectType');
      expect(result).toHaveProperty('frameworks');
      expect(result).toHaveProperty('languages');
      expect(result).toHaveProperty('fileTree');
      expect(result).toHaveProperty('sampleDatabaseSchema');
      expect(result).toHaveProperty('sampleAuthCode');
      expect(result).toHaveProperty('sampleAPICode');
      expect(result).toHaveProperty('environmentFiles');
      expect(result).toHaveProperty('hasBAA');
    }, 30000);
  });

  describe('gatherSummaryContext', () => {
    it('should gather summary context', async () => {
      const gatherer = new ContextGatherer(path.join(fixturesPath, 'react-frontend'));
      const mockContext = {
        rootPath: path.join(fixturesPath, 'react-frontend'),
        projectType: 'frontend' as const,
        frameworks: ['React'],
        languages: ['TypeScript'],
        dependencies: { react: '^18.0.0' },
        devDependencies: { vite: '^4.0.0' },
        hasTests: false,
        hasDatabase: false,
        hasCICD: false,
        lineCount: 500,
        fileCount: 25,
      };

      const result = await gatherer.gatherSummaryContext(mockContext);

      expect(result).toHaveProperty('projectType');
      expect(result).toHaveProperty('frameworks');
      expect(result).toHaveProperty('dependencies');
      expect(result).toHaveProperty('devDependencies');
      expect(result).toHaveProperty('fileTree');
      expect(result).toHaveProperty('entryPoint');
      expect(result).toHaveProperty('mainDirectories');
    }, 30000);
  });

});

describe('ContextGatherer file finding', () => {
  it('should find component files in React project', async () => {
    const gatherer = new ContextGatherer(path.join(fixturesPath, 'react-frontend'));
    const mockContext = {
      rootPath: path.join(fixturesPath, 'react-frontend'),
      projectType: 'frontend' as const,
      frameworks: ['React'],
      languages: ['TypeScript'],
      dependencies: {},
      devDependencies: {},
      hasTests: false,
      hasDatabase: false,
      hasCICD: false,
      lineCount: 100,
      fileCount: 10,
    };

    const result = await gatherer.gatherDocumentationContext(mockContext);

    // Should return array of component files
    expect(Array.isArray(result.componentFiles)).toBe(true);
  }, 30000);

  it('should find API files in Express project', async () => {
    const gatherer = new ContextGatherer(path.join(fixturesPath, 'express-backend'));
    const mockContext = {
      rootPath: path.join(fixturesPath, 'express-backend'),
      projectType: 'backend' as const,
      frameworks: ['Express'],
      languages: ['TypeScript'],
      dependencies: {},
      devDependencies: {},
      hasTests: false,
      hasDatabase: false,
      hasCICD: false,
      lineCount: 100,
      fileCount: 10,
    };

    const result = await gatherer.gatherDocumentationContext(mockContext);

    // Should return array of API files
    expect(Array.isArray(result.apiFiles)).toBe(true);
  }, 30000);
});
