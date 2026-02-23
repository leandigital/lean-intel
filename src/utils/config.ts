/**
 * Global configuration management for lean-intel
 * Stores settings shared across projects in ~/.lean-intel/config.json
 *
 * Currently only used for GitHub token (shared across all projects).
 * Project-specific config (provider, model, API key, etc.) is in .lean-intel.json
 * managed by ProjectConfigManager.
 */

// @ts-expect-error - Conf is an ESM module with types, but TypeScript's 'node' moduleResolution has issues with it
import Conf from 'conf';
import { Config } from '../types';

const schema = {
  githubToken: {
    type: 'string',
  },
  bitbucketToken: {
    type: 'string',
  },
} as const;

class ConfigManager {
  private config: Conf<Config>;

  constructor() {
    const configPath = process.env.LEAN_INTEL_CONFIG_PATH;

    this.config = new Conf({
      projectName: 'lean-intel',
      schema,
      ...(configPath && { cwd: configPath }),
    });
  }

  get<K extends keyof Config>(key: K): Config[K] {
    return this.config.get(key);
  }

  set<K extends keyof Config>(key: K, value: Config[K]): void {
    this.config.set(key, value);
  }

  has(key: keyof Config): boolean {
    return this.config.has(key);
  }

  getPath(): string {
    return this.config.path;
  }
}

export const configManager = new ConfigManager();
