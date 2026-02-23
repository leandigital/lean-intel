/**
 * Ensures the project is configured before running a command.
 * If .lean-intel.json is missing or incomplete, runs the setup flow.
 * Returns the project config and provider config ready for use.
 */

import { ProjectConfigManager } from './projectConfig';
import { MODEL_DEFAULTS } from '../providers/model-defaults';
import { logger } from './logger';

type ProviderType = 'anthropic' | 'openai' | 'google' | 'xai';

export interface ProviderConfig {
  type: ProviderType;
  apiKey: string;
  model: string;
}

export interface EnsureProjectConfigOptions {
  skipPrompts?: boolean;
}

/**
 * Check if project is configured. If not, run setup.
 * Returns projectConfig and providerConfig ready for use.
 */
export async function ensureProjectConfigured(
  projectPath: string,
  options: EnsureProjectConfigOptions = {}
): Promise<{
  projectConfig: ProjectConfigManager;
  providerConfig: ProviderConfig;
}> {
  let projectConfig = new ProjectConfigManager(projectPath);

  // Check if required fields are present
  if (!projectConfig.has('llmProvider') || !projectConfig.has('apiKey')) {
    if (options.skipPrompts) {
      throw new Error(
        'Project is not configured. Run "lean-intel init" first, or re-run without --skip-prompts.'
      );
    }

    logger.info('Project not configured. Running setup...');
    logger.newLine();

    const { runProjectSetup } = await import('./setupProject');
    projectConfig = await runProjectSetup(projectPath);
  }

  const provider = projectConfig.get('llmProvider') as ProviderType;
  const apiKey = projectConfig.get('apiKey')!;
  const model = projectConfig.get('llmModel') || MODEL_DEFAULTS[provider];

  return {
    projectConfig,
    providerConfig: { type: provider, apiKey, model },
  };
}
