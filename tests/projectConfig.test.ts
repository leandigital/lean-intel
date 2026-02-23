/**
 * Tests for ProjectConfigManager
 */

import { ProjectConfigManager, GenerationMetadata } from '../src/utils/projectConfig';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('ProjectConfigManager', () => {
  let tempDir: string;
  let configManager: ProjectConfigManager;

  beforeEach(() => {
    // Create temp directory for each test
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lean-intel-test-'));
    configManager = new ProjectConfigManager(tempDir);
  });

  afterEach(() => {
    // Clean up temp directory
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('constructor', () => {
    it('should be instantiable', () => {
      expect(configManager).toBeInstanceOf(ProjectConfigManager);
    });

    it('should use default cwd if no path provided', () => {
      const manager = new ProjectConfigManager();
      expect(manager.getPath()).toContain('.lean-intel.json');
    });
  });

  describe('basic operations', () => {
    it('should set and get a value', () => {
      configManager.set('projectName', 'test-project');
      expect(configManager.get('projectName')).toBe('test-project');
    });

    it('should check if key exists', () => {
      configManager.set('industry', 'healthcare');
      expect(configManager.has('industry')).toBe(true);
    });

    it('should return false for non-existent key', () => {
      expect(configManager.has('projectName')).toBe(false);
    });

    it('should return false for empty value', () => {
      configManager.set('projectName', '');
      expect(configManager.has('projectName')).toBe(false);
    });

    it('should return undefined for non-existent key', () => {
      expect(configManager.get('projectName')).toBeUndefined();
    });
  });

  describe('save and load', () => {
    it('should save config to file', () => {
      configManager.set('projectName', 'test-project');
      configManager.set('industry', 'fintech');
      configManager.save();

      const configPath = path.join(tempDir, '.lean-intel.json');
      expect(fs.existsSync(configPath)).toBe(true);

      const content = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      expect(content.projectName).toBe('test-project');
      expect(content.industry).toBe('fintech');
    });

    it('should load existing config on construction', () => {
      // Create config file first
      const configPath = path.join(tempDir, '.lean-intel.json');
      fs.writeFileSync(
        configPath,
        JSON.stringify({ projectName: 'existing-project', industry: 'healthcare' }),
        'utf-8'
      );

      // Create new manager which should load existing config
      const newManager = new ProjectConfigManager(tempDir);

      expect(newManager.get('projectName')).toBe('existing-project');
      expect(newManager.get('industry')).toBe('healthcare');
    });

    it('should handle invalid JSON in config file', () => {
      // Create invalid JSON file
      const configPath = path.join(tempDir, '.lean-intel.json');
      fs.writeFileSync(configPath, 'not valid json {{{', 'utf-8');

      // Should not throw, just start with empty config
      const newManager = new ProjectConfigManager(tempDir);

      expect(newManager.get('projectName')).toBeUndefined();
    });
  });

  describe('getAll and setAll', () => {
    it('should return all config', () => {
      configManager.set('projectName', 'test');
      configManager.set('industry', 'saas');

      const all = configManager.getAll();

      expect(all.projectName).toBe('test');
      expect(all.industry).toBe('saas');
    });

    it('should set multiple values at once', () => {
      configManager.setAll({
        projectName: 'multi-test',
        projectDescription: 'A test project',
        industry: 'ecommerce',
      });

      expect(configManager.get('projectName')).toBe('multi-test');
      expect(configManager.get('projectDescription')).toBe('A test project');
      expect(configManager.get('industry')).toBe('ecommerce');
    });

    it('should merge with existing config', () => {
      configManager.set('projectName', 'original');
      configManager.setAll({ industry: 'new-industry' });

      expect(configManager.get('projectName')).toBe('original');
      expect(configManager.get('industry')).toBe('new-industry');
    });
  });

  describe('exists and getPath', () => {
    it('should return false when config does not exist', () => {
      expect(configManager.exists()).toBe(false);
    });

    it('should return true after save', () => {
      configManager.set('projectName', 'test');
      configManager.save();

      expect(configManager.exists()).toBe(true);
    });

    it('should return correct path', () => {
      const expectedPath = path.join(tempDir, '.lean-intel.json');
      expect(configManager.getPath()).toBe(expectedPath);
    });
  });

  describe('lastGeneration', () => {
    const mockMetadata: GenerationMetadata = {
      commitHash: 'abc1234',
      timestamp: '2025-01-29T12:00:00Z',
      documentationTier: 'standard',
      generatedFiles: ['ARCHITECTURE.md', 'API.md'],
      projectType: 'frontend',
    };

    it('should return undefined when no last generation', () => {
      expect(configManager.getLastGeneration()).toBeUndefined();
    });

    it('should set and get last generation metadata', () => {
      configManager.setLastGeneration(mockMetadata);

      const retrieved = configManager.getLastGeneration();

      expect(retrieved).toEqual(mockMetadata);
    });

    it('should persist last generation after save', () => {
      configManager.setLastGeneration(mockMetadata);
      configManager.save();

      // Load fresh
      const newManager = new ProjectConfigManager(tempDir);
      const retrieved = newManager.getLastGeneration();

      expect(retrieved).toEqual(mockMetadata);
    });

    it('should clear last generation', () => {
      configManager.setLastGeneration(mockMetadata);
      expect(configManager.getLastGeneration()).toBeDefined();

      configManager.clearLastGeneration();
      expect(configManager.getLastGeneration()).toBeUndefined();
    });

    it('should handle all documentation tiers', () => {
      const tiers: Array<'minimal' | 'standard' | 'comprehensive'> = [
        'minimal',
        'standard',
        'comprehensive',
      ];

      for (const tier of tiers) {
        configManager.setLastGeneration({
          ...mockMetadata,
          documentationTier: tier,
        });

        expect(configManager.getLastGeneration()?.documentationTier).toBe(tier);
      }
    });
  });

  describe('defaultAssistant', () => {
    it('should set and get default assistant', () => {
      configManager.set('defaultAssistant', 'claude-code');
      expect(configManager.get('defaultAssistant')).toBe('claude-code');
    });

    it('should accept various assistant types', () => {
      const assistants = ['claude-code', 'cursor', 'copilot', 'chatgpt', 'gemini'];

      for (const assistant of assistants) {
        configManager.set('defaultAssistant', assistant);
        expect(configManager.get('defaultAssistant')).toBe(assistant);
      }
    });
  });
});
