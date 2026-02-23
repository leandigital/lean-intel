/**
 * docs command - Generate documentation
 */

import { Command } from 'commander';
import ora from 'ora';
import { ProjectDetector } from '../core/detector';
import { LLMOrchestrator } from '../core/llmOrchestrator';
import { FileGenerator } from '../core/fileGenerator';
import { GenerationMetadata } from '../utils/projectConfig';
import { ensureProjectConfigured } from '../utils/providerPrompt';
import { CommitManager } from '../git/commit';
import { estimateCost, formatCost } from '../utils/costEstimator';
import { logger } from '../utils/logger';
import chalk from 'chalk';

export const docsCommand = new Command('docs')
  .description('Generate comprehensive documentation')
  .option('-p, --path <path>', 'Project path', process.cwd())
  .option('--name <name>', 'Project name')
  .option('--description <description>', 'Project description')
  .option('--industry <industry>', 'Industry/domain (e.g., Healthcare, Fintech, E-commerce)')
  .option(
    '--assistant <assistant>',
    'AI assistant (claude-code, cursor, copilot, chatgpt, gemini)',
    'claude-code'
  )
  .option(
    '--documentation-tier <tier>',
    'Documentation tier: minimal (2-3 files), standard (5-8 files), comprehensive (10-20 files). Auto-detected by default.'
  )
  .option('--dry-run', 'Show cost estimate without running')
  .option('--skip-cache', 'Skip cache and regenerate everything')
  .option('--skip-prompts', 'Skip interactive prompts and use provided values')
  .option('--concurrency <number>', 'Max parallel file generations (default: 3)', '3')
  .action(async (options) => {
    const spinner = ora('Detecting project type...').start();

    try {
      // Detect project
      const detector = new ProjectDetector(options.path);
      const context = await detector.detect();

      // Apply manual documentation tier override if provided
      if (options.documentationTier) {
        const validTiers = ['minimal', 'standard', 'comprehensive'];
        if (!validTiers.includes(options.documentationTier)) {
          spinner.fail('Invalid documentation tier');
          logger.error(
            `Invalid tier "${options.documentationTier}". Must be one of: minimal, standard, comprehensive`
          );
          process.exit(1);
        }
        context.documentationTier = options.documentationTier as 'minimal' | 'standard' | 'comprehensive';
      }

      spinner.succeed(
        `Detected: ${context.projectType} project (${context.frameworks.join(', ') || 'no frameworks'}) - ${context.documentationTier || 'comprehensive'} tier`
      );

      // Ensure project is configured (runs init setup if .lean-intel.json is missing)
      const { projectConfig, providerConfig } = await ensureProjectConfigured(options.path, {
        skipPrompts: options.skipPrompts,
      });

      // Read project info from config (CLI flags override)
      const projectName = options.name || projectConfig.get('projectName') || context.rootPath.split('/').pop() || 'Project';
      const projectDescription = options.description || projectConfig.get('projectDescription') || 'A software project';
      const industry = options.industry || projectConfig.get('industry') || 'Software';
      const aiAssistant = options.assistant || projectConfig.get('defaultAssistant') || 'claude-code';

      // Estimate cost using actual provider pricing
      const estimate = estimateCost(context, {
        docs: true,
        security: false,
        license: false,
        quality: false,
        cost: false,
        hipaa: false,
        createPR: false,
        dryRun: false,
        skipCache: options.skipCache || false,
      }, { type: providerConfig.type, model: providerConfig.model });

      logger.newLine();
      logger.box('Cost Estimate', [
        `Provider: ${providerConfig.type} (${providerConfig.model || 'default'})`,
        `Pricing: ${estimate.pricingInfo}`,
        `Input Tokens:  ${estimate.inputTokens.toLocaleString()}`,
        `Output Tokens: ${estimate.outputTokens.toLocaleString()}`,
        `Estimated Cost: ${formatCost(estimate.estimatedCost)}`,
      ]);
      logger.newLine();

      if (options.dryRun) {
        logger.info('Dry run complete. Use without --dry-run to generate documentation.');
        return;
      }

      // Confirm
      logger.warn(
        `This will cost approximately ${formatCost(estimate.estimatedCost)}.`
      );
      logger.log('');
      logger.log('Press Ctrl+C to cancel or wait 3 seconds to continue...');
      logger.log('');

      await new Promise(resolve => setTimeout(resolve, 3000));

      // Generate documentation
      const orchestrator = new LLMOrchestrator(providerConfig, options.path, {
        skipCache: options.skipCache,
      });

      logger.newLine();
      logger.section('Generating Documentation');
      logger.newLine();

      const concurrency = parseInt(options.concurrency, 10) || 3;
      const docSpinner = ora(`Running documentation generator (concurrency: ${concurrency})...`).start();
      const startTime = Date.now();
      const result = await orchestrator.generateDocumentation(
        context,
        projectName,
        projectDescription,
        industry,
        aiAssistant as 'claude-code' | 'cursor' | 'copilot' | 'chatgpt' | 'gemini',
        { concurrency }
      );
      const totalDuration = (Date.now() - startTime) / 1000;

      if (result.status === 'error') {
        docSpinner.fail('Documentation generation failed');
        logger.error(result.error || 'Unknown error');
        process.exit(1);
      }

      docSpinner.succeed(`Documentation generated in ${totalDuration.toFixed(1)} seconds`);

      // Generate files
      const fileGenerator = new FileGenerator(options.path, 'lean-reports', 'docs');
      const files = await fileGenerator.generateFiles([result]);

      // Save generation metadata for incremental updates
      const documentationTier = context.documentationTier || 'comprehensive';
      try {
        const commitManager = new CommitManager(options.path);
        const currentCommit = await commitManager.getLastCommitHash();

        const metadata: GenerationMetadata = {
          commitHash: currentCommit,
          timestamp: new Date().toISOString(),
          documentationTier,
          generatedFiles: files,
          projectType: context.projectType,
        };

        projectConfig.setLastGeneration(metadata);
        projectConfig.save();
        logger.debug('Saved generation metadata for incremental updates');
      } catch (metadataError) {
        logger.debug('Failed to save generation metadata: ' + (metadataError as Error).message);
      }

      logger.newLine();
      logger.success(
        `Generated ${files.length} file${files.length !== 1 ? 's' : ''} in ${fileGenerator.getOutputDir()}`
      );

      logger.newLine();
      logger.log(chalk.bold('Summary:'));
      logger.table({
        Cost: formatCost(result.cost),
        Duration: `${result.duration.toFixed(1)}s`,
        Tokens: result.tokensUsed.toLocaleString(),
        Files: files.length,
      });

      logger.newLine();
      logger.log('Review the generated files and commit them when ready.');
      logger.log(
        'Run ' +
          chalk.cyan('lean-intel full --create-pr') +
          ' to automatically create a PR.'
      );
    } catch (error) {
      spinner.fail('Documentation generation failed');
      logger.error((error as Error).message);
      process.exit(1);
    }
  });
