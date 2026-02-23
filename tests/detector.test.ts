/**
 * Tests for ProjectDetector
 */

import { ProjectDetector } from '../src/core/detector';
import * as path from 'path';

const fixturesPath = path.join(__dirname, 'fixtures');

describe('ProjectDetector', () => {
  it('should be instantiable', () => {
    const detector = new ProjectDetector(process.cwd());
    expect(detector).toBeInstanceOf(ProjectDetector);
  });

  describe('Frontend Project Detection', () => {
    describe('React projects', () => {
      it('should detect React frontend project', async () => {
        const detector = new ProjectDetector(path.join(fixturesPath, 'react-frontend'));
        const context = await detector.detect();

        expect(context.projectType).toBe('frontend');
        expect(context.frameworks).toContain('React');
        expect(context.languages).toContain('TypeScript');
      });

      it('should include React in dependencies', async () => {
        const detector = new ProjectDetector(path.join(fixturesPath, 'react-frontend'));
        const context = await detector.detect();

        expect(context.dependencies['react']).toBeDefined();
        expect(context.dependencies['react-dom']).toBeDefined();
      });

      it('should detect vite as dev dependency', async () => {
        const detector = new ProjectDetector(path.join(fixturesPath, 'react-frontend'));
        const context = await detector.detect();

        expect(context.devDependencies['vite']).toBeDefined();
      });
    });

    describe('Vue projects', () => {
      it('should detect Vue frontend project', async () => {
        const detector = new ProjectDetector(path.join(fixturesPath, 'vue-frontend'));
        const context = await detector.detect();

        expect(context.projectType).toBe('frontend');
        expect(context.frameworks).toContain('Vue');
        expect(context.languages).toContain('TypeScript');
      });

      it('should include Vue in dependencies', async () => {
        const detector = new ProjectDetector(path.join(fixturesPath, 'vue-frontend'));
        const context = await detector.detect();

        expect(context.dependencies['vue']).toBeDefined();
      });
    });
  });

  describe('Backend Project Detection', () => {
    describe('Express projects', () => {
      it('should detect Express backend project', async () => {
        const detector = new ProjectDetector(path.join(fixturesPath, 'express-backend'));
        const context = await detector.detect();

        expect(context.projectType).toBe('backend');
        expect(context.frameworks).toContain('Express');
        expect(context.languages).toContain('TypeScript');
      });

      it('should include Express in dependencies', async () => {
        const detector = new ProjectDetector(path.join(fixturesPath, 'express-backend'));
        const context = await detector.detect();

        expect(context.dependencies['express']).toBeDefined();
      });

      it('should detect database (PostgreSQL)', async () => {
        const detector = new ProjectDetector(path.join(fixturesPath, 'express-backend'));
        const context = await detector.detect();

        expect(context.hasDatabase).toBe(true);
        // Note: databaseType property currently not implemented in detector
        // The hasDatabase flag indicates presence of database dependencies
      });
    });

    describe('NestJS projects', () => {
      it('should detect NestJS backend project', async () => {
        const detector = new ProjectDetector(path.join(fixturesPath, 'nestjs-backend'));
        const context = await detector.detect();

        expect(context.projectType).toBe('backend');
        expect(context.frameworks).toContain('NestJS');
        expect(context.languages).toContain('TypeScript');
      });

      it('should include NestJS in dependencies', async () => {
        const detector = new ProjectDetector(path.join(fixturesPath, 'nestjs-backend'));
        const context = await detector.detect();

        expect(context.dependencies['@nestjs/core']).toBeDefined();
        expect(context.dependencies['@nestjs/common']).toBeDefined();
      });
    });
  });

  describe('Mobile Project Detection', () => {
    describe('React Native projects', () => {
      it('should detect React Native mobile project', async () => {
        const detector = new ProjectDetector(path.join(fixturesPath, 'react-native-mobile'));
        const context = await detector.detect();

        expect(context.projectType).toBe('mobile');
        expect(context.frameworks).toContain('React Native');
        expect(context.languages).toContain('JavaScript');
      });

      it('should include React Native in dependencies', async () => {
        const detector = new ProjectDetector(path.join(fixturesPath, 'react-native-mobile'));
        const context = await detector.detect();

        expect(context.dependencies['react-native']).toBeDefined();
      });

      it('should not confuse React Native with React web', async () => {
        const detector = new ProjectDetector(path.join(fixturesPath, 'react-native-mobile'));
        const context = await detector.detect();

        expect(context.projectType).toBe('mobile');
        expect(context.projectType).not.toBe('frontend');
      });
    });

    describe('Flutter projects', () => {
      it('should detect Flutter mobile project', async () => {
        const detector = new ProjectDetector(path.join(fixturesPath, 'flutter-mobile'));
        const context = await detector.detect();

        expect(context.projectType).toBe('mobile');
        expect(context.frameworks).toContain('Flutter');
        expect(context.languages).toContain('Dart');
      });

      it('should not have package.json for Flutter projects', async () => {
        const detector = new ProjectDetector(path.join(fixturesPath, 'flutter-mobile'));
        const context = await detector.detect();

        expect(Object.keys(context.dependencies)).toHaveLength(0);
        expect(Object.keys(context.devDependencies)).toHaveLength(0);
      });
    });
  });

  describe('DevOps Project Detection', () => {
    describe('Terraform projects', () => {
      it('should detect Terraform devops project', async () => {
        const detector = new ProjectDetector(path.join(fixturesPath, 'terraform-devops'));
        const context = await detector.detect();

        expect(context.projectType).toBe('devops');
        expect(context.frameworks).toContain('Terraform');
      });

      it('should not have package.json for Terraform projects', async () => {
        const detector = new ProjectDetector(path.join(fixturesPath, 'terraform-devops'));
        const context = await detector.detect();

        expect(Object.keys(context.dependencies)).toHaveLength(0);
        expect(Object.keys(context.devDependencies)).toHaveLength(0);
      });
    });
  });

  describe('Project Context Information', () => {
    it('should include root path', async () => {
      const testPath = path.join(fixturesPath, 'react-frontend');
      const detector = new ProjectDetector(testPath);
      const context = await detector.detect();

      expect(context.rootPath).toBe(testPath);
    });

    it('should detect file and line count', async () => {
      const detector = new ProjectDetector(path.join(fixturesPath, 'react-frontend'));
      const context = await detector.detect();

      expect(context.fileCount).toBeGreaterThan(0);
      expect(context.lineCount).toBeGreaterThanOrEqual(0);
    });

    it('should provide frameworks array', async () => {
      const detector = new ProjectDetector(path.join(fixturesPath, 'react-frontend'));
      const context = await detector.detect();

      expect(Array.isArray(context.frameworks)).toBe(true);
      expect(context.frameworks.length).toBeGreaterThan(0);
    });

    it('should provide languages array', async () => {
      const detector = new ProjectDetector(path.join(fixturesPath, 'react-frontend'));
      const context = await detector.detect();

      expect(Array.isArray(context.languages)).toBe(true);
      expect(context.languages.length).toBeGreaterThan(0);
    });

    it('should detect test presence', async () => {
      const detector = new ProjectDetector(path.join(fixturesPath, 'react-frontend'));
      const context = await detector.detect();

      // hasTests might be false for our minimal fixtures, but should be a boolean
      expect(typeof context.hasTests).toBe('boolean');
    });

    it('should detect CI/CD presence', async () => {
      const detector = new ProjectDetector(path.join(fixturesPath, 'react-frontend'));
      const context = await detector.detect();

      // hasCICD might be false for our minimal fixtures, but should be a boolean
      expect(typeof context.hasCICD).toBe('boolean');
    });
  });

  describe('Package Manager Detection', () => {
    it('should return undefined when no lock file exists', async () => {
      const detector = new ProjectDetector(path.join(fixturesPath, 'react-frontend'));
      const context = await detector.detect();

      // Our fixtures don't have lock files
      expect(context.packageManager).toBeUndefined();
    });
  });

  describe('Database Detection', () => {
    it('should detect database from pg dependency', async () => {
      const detector = new ProjectDetector(path.join(fixturesPath, 'express-backend'));
      const context = await detector.detect();

      expect(context.hasDatabase).toBe(true);
    });

    it('should return false for projects without database', async () => {
      const detector = new ProjectDetector(path.join(fixturesPath, 'react-frontend'));
      const context = await detector.detect();

      expect(context.hasDatabase).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    it('should handle projects without package.json', async () => {
      const detector = new ProjectDetector(path.join(fixturesPath, 'terraform-devops'));
      const context = await detector.detect();

      expect(context.projectType).toBe('devops');
      expect(context.dependencies).toEqual({});
      expect(context.devDependencies).toEqual({});
    });

    it('should handle empty project directories', async () => {
      const detector = new ProjectDetector(path.join(fixturesPath, 'empty-project'));
      const context = await detector.detect();

      expect(context.projectType).toBe('unknown');
      expect(context.frameworks).toEqual([]);
    });
  });

  describe('Framework Detection Details', () => {
    it('should detect multiple frameworks in a project', async () => {
      const detector = new ProjectDetector(path.join(fixturesPath, 'react-frontend'));
      const context = await detector.detect();

      // React frontend typically has React, might have state management
      expect(context.frameworks.length).toBeGreaterThan(0);
      expect(context.frameworks).toContain('React');
    });

    it('should detect TypeScript in frameworks list', async () => {
      const detector = new ProjectDetector(path.join(fixturesPath, 'react-frontend'));
      const context = await detector.detect();

      expect(context.languages).toContain('TypeScript');
    });
  });

  describe('Priority Detection', () => {
    it('should prioritize mobile over frontend when react-native is present', async () => {
      const detector = new ProjectDetector(path.join(fixturesPath, 'react-native-mobile'));
      const context = await detector.detect();

      // Even though React Native has React, it should be detected as mobile
      expect(context.projectType).toBe('mobile');
    });

    it('should prioritize devops when terraform files are present', async () => {
      const detector = new ProjectDetector(path.join(fixturesPath, 'terraform-devops'));
      const context = await detector.detect();

      expect(context.projectType).toBe('devops');
    });
  });
});
