/**
 * summary command - Generate concise SUMMARY.md file
 */

import { Command } from 'commander';
import ora from 'ora';
import { ProjectDetector } from '../core/detector';
import { LLMOrchestrator } from '../core/llmOrchestrator';
import { ensureProjectConfigured } from '../utils/providerPrompt';
import { logger } from '../utils/logger';
import chalk from 'chalk';

export const summaryCommand = new Command('summary')
  .description('Generate concise SUMMARY.md file for quick project onboarding')
  .option('-p, --path <path>', 'Project path', process.cwd())
  .option('--name <name>', 'Project name')
  .option('--description <description>', 'Project description')
  .option('--industry <industry>', 'Industry/domain (e.g., Healthcare, Fintech, E-commerce)')
  .option(
    '--audience <audience>',
    'Target audience (comma-separated: "New developers,AI assistants")',
    'New developers,AI assistants'
  )
  .option('--skip-prompts', 'Skip interactive prompts and use provided values')
  .option('--skip-cache', 'Skip cache and regenerate')
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
      const targetAudience = cmdOptions.audience.split(',').map((a: string) => a.trim());

      logger.newLine();
      logger.box('Summary Configuration', [
        `Project Name: ${projectName}`,
        `Description: ${projectDescription}`,
        `Industry: ${industry}`,
        `Target Audience: ${targetAudience.join(', ')}`,
      ]);
      logger.newLine();

      logger.info('Estimated cost: $0.10-$0.30');
      logger.info('Estimated duration: 30-60 seconds');
      logger.newLine();

      logger.log('Press Ctrl+C to cancel or wait 3 seconds to continue...');
      logger.log('');

      await new Promise(resolve => setTimeout(resolve, 3000));

      const orchestrator = new LLMOrchestrator(providerConfig, cmdOptions.path, {
        skipCache: cmdOptions.skipCache,
      });

      logger.newLine();
      logger.section('Generating Summary');
      logger.newLine();

      const summarySpinner = ora('Generating SUMMARY.md...').start();

      const startTime = Date.now();
      const result = await orchestrator.generateSummary(
        context,
        projectName,
        projectDescription,
        industry,
        targetAudience
      );
      const totalDuration = (Date.now() - startTime) / 1000;

      if (result.status === 'error') {
        summarySpinner.fail('Summary generation failed');
        logger.error(result.error || 'Unknown error');
        process.exit(1);
      }

      summarySpinner.succeed(`Summary generated in ${totalDuration.toFixed(1)} seconds`);

      // Write SUMMARY.md to project root (result.output contains direct markdown)
      const fs = await import('fs-extra');
      const path = await import('path');
      const summaryPath = path.join(cmdOptions.path, 'SUMMARY.md');
      await fs.writeFile(summaryPath, result.output!);

      const lineCount = result.output!.split('\n').length;

      logger.newLine();
      logger.success(`Generated SUMMARY.md in project root (${lineCount} lines)`);

      logger.newLine();
      logger.table({
        'Cost': `$${result.cost.toFixed(4)}`,
        'Duration': `${totalDuration.toFixed(1)}s`,
        'Tokens Used': result.tokensUsed.toLocaleString(),
        'Lines': lineCount.toLocaleString(),
      });

      logger.newLine();
      logger.log(`Summary saved to: ${chalk.cyan('SUMMARY.md')}`);
      logger.log('');
      logger.log(
        'This concise summary provides quick onboarding info. For comprehensive documentation, run:'
      );
      logger.log(chalk.cyan('lean-intel docs'));
    } catch (error) {
      spinner.fail('Summary generation failed');
      logger.error((error as Error).message);
      if (process.env.DEBUG) {
        console.error(error);
      }
      process.exit(1);
    }
  });
