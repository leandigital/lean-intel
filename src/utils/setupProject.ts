/**
 * Core project setup logic — prompts for all project configuration.
 * Used by `lean-intel init` and auto-triggered by commands when .lean-intel.json is missing.
 */

import { ProjectConfigManager } from './projectConfig';
import { configManager } from './config';
import { ProviderFactory } from '../providers/factory';
import { getModelChoices } from '../providers/model-catalog';
import { logger } from './logger';
import { LLMProviderType } from '../types';
import chalk from 'chalk';

type ProviderType = 'anthropic' | 'openai' | 'google' | 'xai';

const PROVIDER_ENV_KEYS: Record<ProviderType, string> = {
  anthropic: 'ANTHROPIC_API_KEY',
  openai: 'OPENAI_API_KEY',
  google: 'GOOGLE_API_KEY',
  xai: 'XAI_API_KEY',
};

/**
 * Run the full project setup interactively.
 * Prompts for: project name, description, industry, AI assistant, LLM provider, model, API key.
 * Saves everything to .lean-intel.json.
 */
export async function runProjectSetup(projectPath: string): Promise<ProjectConfigManager> {
  const projectConfig = new ProjectConfigManager(projectPath);

  const { importInquirer } = await import('./esm');
  const inquirer = await importInquirer();

  // Derive a default project name from the directory
  const dirName = projectPath.split('/').pop() || 'project';

  // Phase 1: Collect project info and provider selection
  const baseAnswers = await inquirer.prompt([
    {
      type: 'input',
      name: 'projectName',
      message: 'Project name:',
      default: projectConfig.get('projectName') || dirName,
    },
    {
      type: 'input',
      name: 'projectDescription',
      message: 'Brief description (what does this project do?):',
      default: projectConfig.get('projectDescription'),
      validate: (input: string) =>
        input.length > 10 || 'Please provide a meaningful description',
    },
    {
      type: 'input',
      name: 'industry',
      message: 'Industry/domain (e.g., Healthcare, Fintech, E-commerce):',
      default: projectConfig.get('industry') || 'Software',
    },
    {
      type: 'select',
      name: 'defaultAssistant',
      message: 'Primary AI assistant you use:',
      choices: [
        { name: 'Claude Code', value: 'claude-code' },
        { name: 'Cursor', value: 'cursor' },
        { name: 'GitHub Copilot', value: 'copilot' },
        { name: 'ChatGPT', value: 'chatgpt' },
        { name: 'Google Gemini', value: 'gemini' },
      ],
      default: projectConfig.get('defaultAssistant') || 'claude-code',
    },
    {
      type: 'select',
      name: 'llmProvider',
      message: 'Select your LLM provider:',
      choices: [
        { name: 'Anthropic (Claude)', value: 'anthropic' },
        { name: 'OpenAI (ChatGPT)', value: 'openai' },
        { name: 'Google (Gemini)', value: 'google' },
        { name: 'xAI (Grok)', value: 'xai' },
      ],
      default: projectConfig.get('llmProvider') || 'anthropic',
    },
  ]);

  // Phase 2: Model selection (depends on provider choice)
  const modelAnswers = await inquirer.prompt([
    {
      type: 'select',
      name: 'model',
      message: 'Select model:',
      choices: getModelChoices(baseAnswers.llmProvider as LLMProviderType),
      default: projectConfig.get('llmModel'),
    },
    {
      type: 'input',
      name: 'customModel',
      message: 'Enter custom model ID:',
      when: (answers: Record<string, string>) => answers.model === '__custom__',
      validate: (input: string) => input.length > 0 || 'Model ID is required',
    },
  ]);

  // Phase 3: API key and tokens
  const credentialAnswers = await inquirer.prompt([
    {
      type: 'password',
      name: 'apiKey',
      message: (() => {
        const provider = baseAnswers.llmProvider as ProviderType;
        const envKey = process.env[PROVIDER_ENV_KEYS[provider]];
        if (envKey) return '';
        const placeholder = ProviderFactory.getApiKeyPlaceholder(provider as LLMProviderType);
        return `Enter your ${provider} API key (${placeholder}):`;
      })(),
      when: () => {
        const provider = baseAnswers.llmProvider as ProviderType;
        const envKey = process.env[PROVIDER_ENV_KEYS[provider]];
        if (envKey) {
          logger.info(`Found ${PROVIDER_ENV_KEYS[provider]} in environment.`);
          return false;
        }
        return true;
      },
      validate: (input: string) => {
        if (!input) return 'API key is required';
        if (!ProviderFactory.validateApiKey(baseAnswers.llmProvider as LLMProviderType, input)) {
          const placeholder = ProviderFactory.getApiKeyPlaceholder(baseAnswers.llmProvider as LLMProviderType);
          return `Invalid API key format (should start with ${placeholder})`;
        }
        return true;
      },
    },
    {
      type: 'password',
      name: 'githubToken',
      message: 'GitHub personal access token (optional, for PR creation):',
      when: () => !configManager.has('githubToken'),
    },
  ]);

  // Merge all answers
  const answers = { ...baseAnswers, ...modelAnswers, ...credentialAnswers };

  // Resolve API key: prompt answer > env var > existing config
  const provider = answers.llmProvider as ProviderType;
  const apiKey = answers.apiKey || process.env[PROVIDER_ENV_KEYS[provider]] || projectConfig.get('apiKey');
  const selectedModel = answers.model === '__custom__' ? answers.customModel : answers.model;

  if (!apiKey) {
    logger.error('No API key provided. Cannot continue.');
    process.exit(1);
  }

  // Save to .lean-intel.json
  projectConfig.setAll({
    projectName: answers.projectName,
    projectDescription: answers.projectDescription,
    industry: answers.industry,
    defaultAssistant: answers.defaultAssistant,
    llmProvider: answers.llmProvider,
    llmModel: selectedModel,
    apiKey,
  });
  projectConfig.save();

  // GitHub token goes to global config (shared across projects)
  if (answers.githubToken) {
    configManager.set('githubToken', answers.githubToken);
  }

  logger.newLine();
  logger.success('Configuration saved to .lean-intel.json');
  logger.log('');
  logger.log(chalk.gray(`Project: ${answers.projectName}`));
  logger.log(chalk.gray(`LLM Provider: ${answers.llmProvider} (${selectedModel})`));
  logger.log('');

  return projectConfig;
}
