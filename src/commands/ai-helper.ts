/**
 * ai-helper command - Generate AI assistant instruction file
 */

import { Command } from 'commander';
import ora from 'ora';
import { ProjectDetector } from '../core/detector';
import { LLMOrchestrator } from '../core/llmOrchestrator';
import { ensureProjectConfigured } from '../utils/providerPrompt';
import { gatherContextPreview, showContextWarningAndConfirm } from '../utils/contextWarning';
import { logger } from '../utils/logger';
import chalk from 'chalk';

export const aiHelperCommand = new Command('ai-helper')
  .description('Generate AI assistant instruction file (CLAUDE.md, COPILOT.md, etc.)')
  .option('-p, --path <path>', 'Project path', process.cwd())
  .option('--name <name>', 'Project name')
  .option('--description <description>', 'Project description')
  .option('--industry <industry>', 'Industry/domain (e.g., Healthcare, Fintech, E-commerce)')
  .option(
    '--assistant <assistant>',
    'AI assistant (claude-code, cursor, copilot, chatgpt, gemini)'
  )
  .option(
    '--size-mode <mode>',
    'File size mode (compact, standard, max) - auto-detected from assistant if not specified'
  )
  .option('--skip-prompts', 'Skip interactive prompts and use provided values')
  .option('--skip-cache', 'Skip cache and regenerate')
  .option('--force', 'Force regeneration even if file exists (skip update prompt)')
  .option('-y, --yes', 'Auto-confirm prompts (skip confirmation)')
  .option('--skip-redact', 'Disable secret/PII redaction')
  .option('--include-sensitive', 'Include sensitive files (.env, keys, etc.)')
  .action(async (cmdOptions) => {
    const spinner = ora('Detecting project type...').start();

    try {
      // Detect project
      const detector = new ProjectDetector(cmdOptions.path);
      const context = await detector.detect();

      spinner.succeed(
        `Detected: ${context.projectType} project (${context.frameworks.join(', ') || 'no frameworks'})`
      );

      // Ensure project is configured (runs init setup if .lean-intel.json is missing)
      const { projectConfig, providerConfig } = await ensureProjectConfigured(cmdOptions.path, {
        skipPrompts: cmdOptions.skipPrompts,
      });

      // Read project info from config (CLI flags override)
      const projectName = cmdOptions.name || projectConfig.get('projectName') || context.rootPath.split('/').pop() || 'Project';
      const projectDescription = cmdOptions.description || projectConfig.get('projectDescription') || 'A software project';
      const industry = cmdOptions.industry || projectConfig.get('industry') || 'Software';
      const aiAssistant = cmdOptions.assistant || projectConfig.get('defaultAssistant') || 'claude-code';

      // Determine filename based on AI assistant
      const filenameMap: Record<string, string> = {
        'claude-code': 'CLAUDE.md',
        'cursor': 'CURSOR.md',
        'copilot': 'COPILOT.md',
        'chatgpt': 'CHATGPT.md',
        'gemini': 'GEMINI.md',
      };
      const filename = filenameMap[aiAssistant] || 'CLAUDE.md';

      // Check for existing file
      const fs = await import('fs-extra');
      const path = await import('path');
      const outputPath = path.join(cmdOptions.path, filename);
      let existingContent: string | null = null;
      let isUpdateMode = false;

      if (await fs.pathExists(outputPath)) {
        existingContent = await fs.readFile(outputPath, 'utf-8');

        if (!cmdOptions.force && !cmdOptions.skipPrompts) {
          logger.newLine();
          logger.info(`Found existing ${chalk.cyan(filename)} (${existingContent.split('\n').length} lines)`);
          logger.newLine();

          const { importInquirer } = await import('../utils/esm');
          const inquirer = await importInquirer();
          const { action } = await inquirer.prompt([
            {
              type: 'select',
              name: 'action',
              message: `What would you like to do with ${filename}?`,
              choices: [
                {
                  name: 'Update - Analyze existing file, preserve customizations, refresh outdated content',
                  value: 'update',
                },
                {
                  name: 'Regenerate - Create from scratch (overwrites existing)',
                  value: 'regenerate',
                },
              ],
              default: 'update',
            },
          ]);

          isUpdateMode = action === 'update';
        }
      }

      logger.newLine();
      logger.box(isUpdateMode ? 'AI Assistant File Update' : 'AI Assistant File Generation', [
        `Project Name: ${projectName}`,
        `Description: ${projectDescription}`,
        `Industry: ${industry}`,
        `AI Assistant: ${aiAssistant}`,
        `Output File: ${filename}`,
      ]);
      logger.newLine();

      if (isUpdateMode) {
        logger.info('Estimated cost: $0.20-$0.50 (includes analysis)');
        logger.info('Estimated duration: 60-120 seconds');
      } else {
        logger.info('Estimated cost: $0.15-$0.40');
        logger.info('Estimated duration: 45-90 seconds');
      }
      logger.newLine();

      // Context preview and confirmation
      const contextPreview = await gatherContextPreview(cmdOptions.path, {
        includeSensitive: cmdOptions.includeSensitive,
        noRedact: cmdOptions.skipRedact,
      });

      const confirmed = await showContextWarningAndConfirm(contextPreview, {
        autoConfirm: cmdOptions.yes,
      });
      if (!confirmed) {
        logger.info('Cancelled.');
        return;
      }

      const orchestrator = new LLMOrchestrator(providerConfig, cmdOptions.path, {
        skipCache: cmdOptions.skipCache,
        includeSensitive: cmdOptions.includeSensitive,
        noRedact: cmdOptions.skipRedact,
      });

      logger.newLine();
      logger.section(isUpdateMode ? `Updating ${filename}` : `Generating ${filename}`);
      logger.newLine();

      const aiHelperSpinner = ora(
        isUpdateMode ? `Analyzing and updating ${filename}...` : `Generating ${filename}...`
      ).start();

      const startTime = Date.now();
      let result;

      if (isUpdateMode && existingContent) {
        result = await orchestrator.updateAIAssistant(
          context,
          existingContent,
          projectName,
          projectDescription,
          industry,
          aiAssistant as 'claude-code' | 'cursor' | 'copilot' | 'chatgpt' | 'gemini',
          cmdOptions.sizeMode as 'compact' | 'standard' | 'max' | undefined
        );
      } else {
        result = await orchestrator.generateAIAssistant(
          context,
          projectName,
          projectDescription,
          industry,
          aiAssistant as 'claude-code' | 'cursor' | 'copilot' | 'chatgpt' | 'gemini',
          cmdOptions.sizeMode as 'compact' | 'standard' | 'max' | undefined
        );
      }
      const totalDuration = (Date.now() - startTime) / 1000;

      if (result.status === 'error') {
        aiHelperSpinner.fail(`${filename} ${isUpdateMode ? 'update' : 'generation'} failed`);
        logger.error(result.error || 'Unknown error');
        process.exit(1);
      }

      aiHelperSpinner.succeed(
        `${filename} ${isUpdateMode ? 'updated' : 'generated'} in ${totalDuration.toFixed(1)} seconds`
      );

      // Write file to project root (result.output contains direct markdown)
      await fs.writeFile(outputPath, result.output!);

      const lineCount = result.output!.split('\n').length;

      logger.newLine();
      logger.success(`${isUpdateMode ? 'Updated' : 'Generated'} ${filename} in project root (${lineCount} lines)`);

      logger.newLine();
      logger.table({
        'Cost': `$${result.cost.toFixed(4)}`,
        'Duration': `${totalDuration.toFixed(1)}s`,
        'Tokens Used': result.tokensUsed.toLocaleString(),
        'Lines': lineCount.toLocaleString(),
      });

      logger.newLine();
      logger.log(`AI assistant file saved to: ${chalk.cyan(filename)}`);
      logger.log('');
      logger.log('This file provides comprehensive project context for your AI assistant.');
      logger.log('');

      // Platform-specific usage instructions
      const usageInstructions: Record<string, string> = {
        'claude-code': 'Claude Code will auto-load this file when working in this repository.',
        'cursor': 'Reference this file in Cursor using @CURSOR.md in your prompts.',
        'copilot': 'Open this file alongside your code to provide context to Copilot Chat.',
        'chatgpt': 'Paste the contents of this file at the start of a ChatGPT coding session.',
        'gemini': 'Upload or paste this file to provide context to Google Gemini.',
      };

      logger.log(chalk.gray(usageInstructions[aiAssistant]));
      logger.newLine();

      logger.log('For comprehensive documentation, run:');
      logger.log(chalk.cyan('lean-intel docs'));
    } catch (error) {
      spinner.fail('AI assistant file generation failed');
      logger.error((error as Error).message);
      if (process.env.DEBUG) {
        console.error(error);
      }
      process.exit(1);
    }
  });
