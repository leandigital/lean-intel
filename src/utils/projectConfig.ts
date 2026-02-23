/**
 * Project-level configuration management
 * Stores config in .lean-intel.json in project root
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';

export interface GenerationMetadata {
  commitHash: string;
  timestamp: string;
  documentationTier: 'minimal' | 'standard' | 'comprehensive';
  generatedFiles: string[];
  projectType: string;
}

interface ProjectConfig {
  projectName?: string;
  projectDescription?: string;
  industry?: string;
  defaultAssistant?: 'claude-code' | 'cursor' | 'copilot' | 'chatgpt' | 'gemini';
  llmProvider?: 'anthropic' | 'openai' | 'google' | 'xai';
  llmModel?: string;
  apiKey?: string;
  lastGeneration?: GenerationMetadata;
}

export class ProjectConfigManager {
  private configPath: string;
  private config: ProjectConfig = {};

  constructor(projectRoot: string = process.cwd()) {
    this.configPath = join(projectRoot, '.lean-intel.json');
    this.load();
  }

  private load(): void {
    if (existsSync(this.configPath)) {
      try {
        const content = readFileSync(this.configPath, 'utf-8');
        this.config = JSON.parse(content);
      } catch (_error) {
        // Invalid JSON, start fresh
        this.config = {};
      }
    }
  }

  save(): void {
    writeFileSync(this.configPath, JSON.stringify(this.config, null, 2), 'utf-8');
    this.ensureGitignored();
  }

  /**
   * Ensure .lean-intel* wildcard is in .gitignore (covers config, cache, etc.).
   * Creates .gitignore if it doesn't exist.
   */
  private ensureGitignored(): void {
    const entry = '.lean-intel*';
    const gitignorePath = join(dirname(this.configPath), '.gitignore');

    if (existsSync(gitignorePath)) {
      const content = readFileSync(gitignorePath, 'utf-8');
      const lines = content.split('\n').map(l => l.trim());
      // Already covered by wildcard or exact match
      if (lines.some(line => line === entry || line === '.lean-intel*')) {
        return;
      }
      const newline = content.endsWith('\n') ? '' : '\n';
      writeFileSync(gitignorePath, content + newline + entry + '\n', 'utf-8');
    } else {
      writeFileSync(gitignorePath, entry + '\n', 'utf-8');
    }
  }

  get(key: Exclude<keyof ProjectConfig, 'lastGeneration'>): string | undefined {
    return this.config[key] as string | undefined;
  }

  set(key: Exclude<keyof ProjectConfig, 'lastGeneration'>, value: string): void {
    (this.config as Record<string, unknown>)[key] = value;
  }

  has(key: Exclude<keyof ProjectConfig, 'lastGeneration'>): boolean {
    const value = this.config[key];
    return value !== undefined && value !== '';
  }

  getAll(): ProjectConfig {
    return { ...this.config };
  }

  setAll(config: Partial<ProjectConfig>): void {
    this.config = { ...this.config, ...config };
  }

  exists(): boolean {
    return existsSync(this.configPath);
  }

  getPath(): string {
    return this.configPath;
  }

  getLastGeneration(): GenerationMetadata | undefined {
    return this.config.lastGeneration;
  }

  setLastGeneration(metadata: GenerationMetadata): void {
    this.config.lastGeneration = metadata;
  }

  clearLastGeneration(): void {
    delete this.config.lastGeneration;
  }
}
