/**
 * update command - Incrementally update documentation based on code changes
 */

import { Command } from 'commander';
import ora from 'ora';
import chalk from 'chalk';
import { ProjectDetector } from '../core/detector';
import { LLMOrchestrator } from '../core/llmOrchestrator';
import { FileGenerator } from '../core/fileGenerator';
import { DiffManager, ChangedFile } from '../git/diff';
import { mapChangesToDocs, estimateImpactLevel, shouldFullRegenerate } from '../core/changeMapper';
import {
  getFrontendFilesToGenerate,
} from '../../prompts/api/document-prompt-rules-frontend';
import {
  getBackendFilesToGenerate,
} from '../../prompts/api/document-prompt-rules-backend';
import {
  getMobileFilesToGenerate,
} from '../../prompts/api/document-prompt-rules-mobile';
import {
  getDevOpsFilesToGenerate,
} from '../../prompts/api/document-prompt-rules-devops';
import { ProjectConfigManager, GenerationMetadata } from '../utils/projectConfig';
import { ensureProjectConfigured } from '../utils/providerPrompt';
import { CommitManager } from '../git/commit';
import { estimateCost, formatCost } from '../utils/costEstimator';
import { gatherContextPreview, showContextWarningAndConfirm } from '../utils/contextWarning';
import { logger } from '../utils/logger';

export const updateCommand = new Command('update')
  .description('Incrementally update documentation based on code changes')
  .option('-p, --path <path>', 'Project path', process.cwd())
  .option('--since <hash>', 'Update since specific commit hash (default: last generation)')
  .option('--dry-run', 'Show what would be updated without generating')
  .option('--force', 'Force full regeneration even if no changes detected')
  .option('--skip-cache', 'Skip cache and regenerate')
  .option('--concurrency <number>', 'Max parallel file generations (default: 3)', '3')
  .option('-y, --yes', 'Auto-confirm prompts (skip confirmation)')
  .option('--skip-redact', 'Disable secret/PII redaction')
  .option('--include-sensitive', 'Include sensitive files (.env, keys, etc.)')
  .action(async (options) => {
    const spinner = ora('Checking project state...').start();

    try {
      // Load project configuration
      let projectConfig = new ProjectConfigManager(options.path);
      const lastGeneration = projectConfig.getLastGeneration();

      // Check if previous generation exists
      if (!lastGeneration && !options.force) {
        spinner.fail('No previous generation found');
        logger.newLine();
        logger.warn('No documentation generation metadata found.');
        logger.info(
          'Run ' +
            chalk.cyan('lean-intel docs') +
            ' first to generate documentation,'
        );
        logger.info(
          'then use ' + chalk.cyan('lean-intel update') + ' for incremental updates.'
        );
        logger.newLine();
        logger.info(
          'Or use ' + chalk.cyan('lean-intel update --force') + ' to force full regeneration.'
        );
        process.exit(1);
      }

      // Get commit hash to diff from
      const diffManager = new DiffManager(options.path);
      let sinceCommit = options.since;

      if (!sinceCommit && lastGeneration) {
        sinceCommit = lastGeneration.commitHash;

        // Verify the commit exists
        const isValid = await diffManager.isValidCommit(sinceCommit);
        if (!isValid) {
          spinner.warn('Previous generation commit not found in history');
          logger.warn(
            `Commit ${diffManager.shortHash(sinceCommit)} from last generation not found.`
          );
          logger.info('This may happen if the repository was rebased or history was rewritten.');
          logger.info(
            'Use ' + chalk.cyan('lean-intel update --force') + ' to force full regeneration.'
          );
          process.exit(1);
        }
      }

      // For --force without previous generation, we'll do full regeneration
      if (options.force && !sinceCommit) {
        spinner.info('Force mode: Will regenerate all documentation');
        sinceCommit = null;
      }

      // Detect project
      const detector = new ProjectDetector(options.path);
      const context = await detector.detect();

      spinner.succeed(
        `Detected: ${context.projectType} project (${context.frameworks.join(', ') || 'no frameworks'})`
      );

      // Get changed files
      let changedFiles: ChangedFile[] = [];
      let affectedDocs: string[] = [];

      if (sinceCommit) {
        const changesSpinner = ora(
          `Analyzing changes since ${diffManager.shortHash(sinceCommit)}...`
        ).start();

        changedFiles = await diffManager.getChangedFilesSince(sinceCommit);
        const categories = diffManager.categorizeChanges(changedFiles);
        const changeSummary = diffManager.getChangeSummary(changedFiles);

        changesSpinner.succeed(
          `Found ${changeSummary.total} changed files (${changeSummary.added} added, ${changeSummary.modified} modified, ${changeSummary.deleted} deleted)`
        );

        // Check if no changes
        if (changedFiles.length === 0 && !options.force) {
          logger.newLine();
          logger.success('No changes detected since last generation.');
          logger.info(
            'Use ' + chalk.cyan('lean-intel update --force') + ' to force regeneration.'
          );
          return;
        }

        // Check if changes warrant full regeneration
        const fullRegenCheck = shouldFullRegenerate(categories, context.projectType);
        if (fullRegenCheck.should && !options.force) {
          logger.newLine();
          logger.warn('Significant changes detected - full regeneration recommended.');
          logger.info(`Reason: ${fullRegenCheck.reason}`);
          logger.info(
            'Run ' +
              chalk.cyan('lean-intel docs') +
              ' for full regeneration, or'
          );
          logger.info(
            'use ' + chalk.cyan('lean-intel update --force') + ' to proceed anyway.'
          );
          return;
        }

        // Map changes to affected documentation
        const existingDocs = lastGeneration?.generatedFiles || [];
        affectedDocs = mapChangesToDocs(categories, context.projectType, existingDocs);

        // Show affected documentation
        logger.newLine();
        logger.section('Changed Files');

        // Show up to 10 changed files
        const filesToShow = changedFiles.slice(0, 10);
        for (const file of filesToShow) {
          const statusIcon =
            file.status === 'added'
              ? chalk.green('+')
              : file.status === 'deleted'
                ? chalk.red('-')
                : file.status === 'renamed'
                  ? chalk.blue('R')
                  : chalk.yellow('M');
          logger.log(`  ${statusIcon} ${file.path}`);
        }
        if (changedFiles.length > 10) {
          logger.log(`  ... and ${changedFiles.length - 10} more files`);
        }

        logger.newLine();
        logger.section('Affected Documentation');

        if (affectedDocs.length === 0 && !options.force) {
          logger.info('No documentation files need updating based on changes.');
          logger.info(
            'Use ' + chalk.cyan('lean-intel update --force') + ' to force regeneration.'
          );
          return;
        }

        const impactLevel = estimateImpactLevel(categories);
        logger.log(`  Impact level: ${chalk.bold(impactLevel)}`);
        logger.log(`  Files to update: ${affectedDocs.length}`);
        for (const doc of affectedDocs) {
          logger.log(`    - ${doc}`);
        }
      } else {
        // Force mode without commit reference - regenerate all
        logger.info('Force mode: Will regenerate all documentation files');
      }

      // In force mode, ensure affectedDocs is populated with all docs for the project type
      if (options.force && affectedDocs.length === 0) {
        const documentationTier =
          (lastGeneration?.documentationTier as 'minimal' | 'standard' | 'comprehensive') ||
          context.documentationTier ||
          'comprehensive';
        const allFilesDefs = (() => {
          switch (context.projectType) {
            case 'frontend': return getFrontendFilesToGenerate(documentationTier);
            case 'backend': return getBackendFilesToGenerate(documentationTier);
            case 'mobile': return getMobileFilesToGenerate(documentationTier);
            case 'devops': return getDevOpsFilesToGenerate(documentationTier);
            default: return getFrontendFilesToGenerate(documentationTier);
          }
        })();
        affectedDocs = allFilesDefs.map(f => f.filename);
        logger.info(`Force mode: regenerating all ${affectedDocs.length} documentation files`);
      }

      // Ensure project is configured (runs init setup if .lean-intel.json is missing)
      const configured = await ensureProjectConfigured(options.path);
      projectConfig = configured.projectConfig;
      const { providerConfig } = configured;

      // Load project metadata
      const projectName =
        projectConfig.get('projectName') ||
        lastGeneration?.generatedFiles?.[0]?.split('/').pop()?.replace('.md', '') ||
        context.rootPath.split('/').pop() ||
        'Project';
      const projectDescription =
        projectConfig.get('projectDescription') || 'A software project';
      const industry = projectConfig.get('industry') || 'Software';
      const aiAssistant = projectConfig.get('defaultAssistant') || 'claude-code';
      const documentationTier =
        (lastGeneration?.documentationTier as 'minimal' | 'standard' | 'comprehensive') ||
        context.documentationTier ||
        'comprehensive';

      // Set tier on context
      context.documentationTier = documentationTier;

      // Estimate cost using actual provider pricing
      const fullEstimate = estimateCost(context, {
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

      // Calculate incremental cost (rough estimate based on file count ratio)
      const totalDocs = lastGeneration?.generatedFiles?.length || 10;
      const docsToUpdate = affectedDocs.length || totalDocs;
      const ratio = docsToUpdate / totalDocs;

      const estimatedCost = fullEstimate.estimatedCost * ratio;
      const tokenSavings = Math.round((1 - ratio) * 100);

      logger.newLine();
      logger.box('Update Plan', [
        `Provider: ${providerConfig.type} (${providerConfig.model || 'default'})`,
        `Pricing: ${fullEstimate.pricingInfo}`,
        `Files to regenerate: ${docsToUpdate} of ${totalDocs}`,
        `Estimated Cost: ${formatCost(estimatedCost)}`,
        tokenSavings > 0 ? `Token savings: ${tokenSavings}%` : 'Full regeneration',
        `Full regeneration cost: ${formatCost(fullEstimate.estimatedCost)}`,
      ]);
      logger.newLine();

      // Context preview
      const contextPreview = await gatherContextPreview(options.path, {
        includeSensitive: options.includeSensitive,
        noRedact: options.skipRedact,
      });

      if (options.dryRun) {
        await showContextWarningAndConfirm(contextPreview, { autoConfirm: true });
        logger.newLine();
        logger.info('Dry run complete. Use without --dry-run to proceed with update.');
        return;
      }

      // Confirm
      logger.warn(
        `This will cost approximately ${formatCost(estimatedCost)}.`
      );
      logger.newLine();

      const confirmed = await showContextWarningAndConfirm(contextPreview, {
        autoConfirm: options.yes,
      });
      if (!confirmed) {
        logger.info('Cancelled.');
        return;
      }

      // Initialize orchestrator
      const orchestrator = new LLMOrchestrator(providerConfig, options.path, {
        skipCache: options.skipCache,
        includeSensitive: options.includeSensitive,
        noRedact: options.skipRedact,
      });

      logger.newLine();
      logger.section('Updating Documentation');
      logger.newLine();

      const concurrency = parseInt(options.concurrency, 10) || 3;
      const updateSpinner = ora(
        `Regenerating ${docsToUpdate} documentation file${docsToUpdate !== 1 ? 's' : ''} (concurrency: ${concurrency})...`
      ).start();
      const startTime = Date.now();

      // Generate incremental documentation
      const result = await orchestrator.generateIncrementalDocumentation(
        context,
        affectedDocs,
        projectName,
        projectDescription,
        industry,
        aiAssistant as 'claude-code' | 'cursor' | 'copilot' | 'chatgpt' | 'gemini',
        { concurrency }
      );

      const totalDuration = (Date.now() - startTime) / 1000;

      if (result.status === 'error') {
        updateSpinner.fail('Documentation update failed');
        logger.error(result.error || 'Unknown error');
        process.exit(1);
      }

      if (result.status === 'skipped') {
        updateSpinner.warn('No matching documentation files found to update');
        logger.warn(result.error || 'No files matched the requested update');
        return;
      }

      updateSpinner.succeed(`Documentation updated in ${totalDuration.toFixed(1)} seconds`);

      // Generate files
      const fileGenerator = new FileGenerator(options.path, 'lean-reports', 'docs');
      const files = await fileGenerator.generateFiles([result]);

      // Update generation metadata
      const commitManager = new CommitManager(options.path);
      const currentCommit = await commitManager.getLastCommitHash();

      // Merge with existing generated files list
      const existingGeneratedFiles = lastGeneration?.generatedFiles || [];
      const updatedGeneratedFiles = Array.from(
        new Set([...existingGeneratedFiles, ...files])
      );

      const newMetadata: GenerationMetadata = {
        commitHash: currentCommit,
        timestamp: new Date().toISOString(),
        documentationTier,
        generatedFiles: updatedGeneratedFiles,
        projectType: context.projectType,
      };

      projectConfig.setLastGeneration(newMetadata);
      projectConfig.save();

      logger.newLine();
      logger.success(
        `Updated ${files.length} file${files.length !== 1 ? 's' : ''} in ${fileGenerator.getOutputDir()}`
      );

      // Show summary
      logger.newLine();
      logger.log(chalk.bold('Summary:'));
      logger.table({
        'Files Updated': files.length,
        Cost: formatCost(result.cost),
        Duration: `${result.duration.toFixed(1)}s`,
        Tokens: result.tokensUsed.toLocaleString(),
        'Savings vs Full': `${tokenSavings}%`,
      });

      logger.newLine();
      logger.success('Documentation update complete!');
      logger.log('');
      logger.log('Review the updated files and commit them when ready.');
    } catch (error) {
      spinner.fail('Documentation update failed');
      logger.error((error as Error).message);
      process.exit(1);
    }
  });
