/**
 * full command - Run everything (docs + all analyzers) and optionally create PR
 */

import { Command } from 'commander';
import ora from 'ora';
import * as path from 'path';
import { ProjectDetector } from '../core/detector';
import { LLMOrchestrator } from '../core/llmOrchestrator';
import { FileGenerator } from '../core/fileGenerator';
import { BranchManager } from '../git/branch';
import { CommitManager } from '../git/commit';
import { PRManager } from '../git/pr';
import { configManager } from '../utils/config';
import { GenerationMetadata } from '../utils/projectConfig';
import { ensureProjectConfigured } from '../utils/providerPrompt';
import { estimateCost, formatCost, formatDuration } from '../utils/costEstimator';
import { gatherContextPreview, showContextWarningAndConfirm } from '../utils/contextWarning';
import { logger } from '../utils/logger';
import { AnalysisOptions, AnalysisResults, ExportFormat } from '../types';
import { ExportGenerator } from '../core/exportGenerator';
import chalk from 'chalk';

export const fullCommand = new Command('full')
  .description('Generate documentation and run all analyzers')
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
  .option('--skip-docs', 'Skip documentation generation')
  .option('--skip-security', 'Skip security analyzer')
  .option('--skip-license', 'Skip license analyzer')
  .option('--skip-quality', 'Skip quality analyzer')
  .option('--skip-cost', 'Skip cost analyzer')
  .option('--hipaa', 'Include HIPAA analyzer (healthcare projects)')
  .option('--create-pr', 'Create pull request with results')
  .option('--dry-run', 'Show cost estimate without running')
  .option('--skip-cache', 'Skip cache and regenerate everything')
  .option('--skip-prompts', 'Skip interactive prompts and use provided values')
  .option('--concurrency <number>', 'Max parallel file generations for docs (default: 3)', '3')
  .option('--export <formats>', 'Export formats: pdf, html, or both (comma-separated)')
  .option('-y, --yes', 'Auto-confirm prompts (skip confirmation)')
  .option('--skip-redact', 'Disable secret/PII redaction')
  .option('--include-sensitive', 'Include sensitive files (.env, keys, etc.)')
  .action(async (cmdOptions) => {
    const spinner = ora('Detecting project type...').start();

    try {
      // Detect project
      const detector = new ProjectDetector(cmdOptions.path);
      const context = await detector.detect();

      // Apply manual documentation tier override if provided
      if (cmdOptions.documentationTier) {
        const validTiers = ['minimal', 'standard', 'comprehensive'];
        if (!validTiers.includes(cmdOptions.documentationTier)) {
          spinner.fail('Invalid documentation tier');
          logger.error(
            `Invalid tier "${cmdOptions.documentationTier}". Must be one of: minimal, standard, comprehensive`
          );
          process.exit(1);
        }
        context.documentationTier = cmdOptions.documentationTier as 'minimal' | 'standard' | 'comprehensive';
      }

      spinner.succeed(
        `Detected: ${context.projectType} project (${context.frameworks.join(', ') || 'no frameworks'}) - ${context.documentationTier || 'comprehensive'} tier`
      );

      // Determine what to run
      const options: AnalysisOptions = {
        docs: !cmdOptions.skipDocs,
        security: !cmdOptions.skipSecurity,
        license: !cmdOptions.skipLicense,
        quality: !cmdOptions.skipQuality,
        cost: !cmdOptions.skipCost,
        hipaa: cmdOptions.hipaa || false,
        createPR: cmdOptions.createPR || false,
        dryRun: cmdOptions.dryRun || false,
        skipCache: cmdOptions.skipCache || false,
      };

      // Ensure project is configured (runs init setup if .lean-intel.json is missing)
      const { projectConfig, providerConfig } = await ensureProjectConfigured(cmdOptions.path, {
        skipPrompts: cmdOptions.skipPrompts,
      });

      // Read project info from config (CLI flags override)
      const projectName = cmdOptions.name || projectConfig.get('projectName') || context.rootPath.split('/').pop() || 'Project';
      const projectDescription = cmdOptions.description || projectConfig.get('projectDescription') || 'A software project';
      const industry = cmdOptions.industry || projectConfig.get('industry') || 'Software';
      const aiAssistant = cmdOptions.assistant || projectConfig.get('defaultAssistant') || 'claude-code';

      // Estimate cost using actual provider pricing
      const estimate = estimateCost(context, options, {
        type: providerConfig.type,
        model: providerConfig.model,
      });

      const enabledItems: string[] = [];
      if (options.docs) enabledItems.push('Documentation');
      if (options.security) enabledItems.push('Security');
      if (options.license) enabledItems.push('License');
      if (options.quality) enabledItems.push('Quality');
      if (options.cost) enabledItems.push('Cost');
      if (options.hipaa) enabledItems.push('HIPAA');

      logger.newLine();
      logger.box('Full Analysis Plan', [
        `Provider: ${providerConfig.type} (${providerConfig.model || 'default'})`,
        `Pricing: ${estimate.pricingInfo}`,
        `Items: ${enabledItems.join(', ')}`,
        `Input Tokens:  ${estimate.inputTokens.toLocaleString()}`,
        `Output Tokens: ${estimate.outputTokens.toLocaleString()}`,
        `Estimated Cost: ${formatCost(estimate.estimatedCost)}`,
        options.createPR ? 'Will create pull request' : 'Manual commit (no PR)',
      ]);
      logger.newLine();

      // Context preview
      const contextPreview = await gatherContextPreview(cmdOptions.path, {
        includeSensitive: cmdOptions.includeSensitive,
        noRedact: cmdOptions.skipRedact,
      });

      if (options.dryRun) {
        await showContextWarningAndConfirm(contextPreview, { autoConfirm: true });
        logger.newLine();
        logger.info('Dry run complete. Use without --dry-run to run full analysis.');
        return;
      }

      // Confirm
      logger.warn(
        `This will cost approximately ${formatCost(estimate.estimatedCost)}.`
      );
      logger.newLine();

      const confirmed = await showContextWarningAndConfirm(contextPreview, {
        autoConfirm: cmdOptions.yes,
      });
      if (!confirmed) {
        logger.info('Cancelled.');
        return;
      }

      // Initialize orchestrator
      const orchestrator = new LLMOrchestrator(providerConfig, cmdOptions.path, {
        skipCache: cmdOptions.skipCache,
        includeSensitive: cmdOptions.includeSensitive,
        noRedact: cmdOptions.skipRedact,
      });

      const allResults = [];
      const allFiles: string[] = [];
      const startTime = Date.now();

      // Run documentation
      if (options.docs) {
        logger.newLine();
        logger.section('1/4: Generating Documentation');
        logger.newLine();

        const concurrency = parseInt(cmdOptions.concurrency, 10) || 3;
        const docSpinner = ora(`Running documentation generator (concurrency: ${concurrency})...`).start();
        const docStartTime = Date.now();
        const docResult = await orchestrator.generateDocumentation(
          context,
          projectName,
          projectDescription,
          industry,
          aiAssistant as 'claude-code' | 'cursor' | 'copilot' | 'chatgpt' | 'gemini',
          { concurrency }
        );
        const docDuration = (Date.now() - docStartTime) / 1000;

        if (docResult.status === 'error') {
          docSpinner.fail('Documentation generation failed');
          logger.error(docResult.error || 'Unknown error');
        } else {
          docSpinner.succeed(`Documentation generated in ${docDuration.toFixed(1)} seconds`);
          allResults.push(docResult);
        }

        // Generate AI assistant file
        logger.newLine();
        logger.section('2/4: Generating AI Assistant File');
        logger.newLine();

        const filenameMap: Record<string, string> = {
          'claude-code': 'CLAUDE.md',
          'cursor': 'CURSOR.md',
          'copilot': 'COPILOT.md',
          'chatgpt': 'CHATGPT.md',
          'gemini': 'GEMINI.md',
        };
        const assistantFilename = filenameMap[aiAssistant] || 'CLAUDE.md';

        const aiHelperSpinner = ora(`Generating ${assistantFilename}...`).start();
        const aiHelperStartTime = Date.now();
        const aiHelperResult = await orchestrator.generateAIAssistant(
          context,
          projectName,
          projectDescription,
          industry,
          aiAssistant as 'claude-code' | 'cursor' | 'copilot' | 'chatgpt' | 'gemini',
          undefined // Auto-detect size mode based on AI assistant
        );
        const aiHelperDuration = (Date.now() - aiHelperStartTime) / 1000;

        if (aiHelperResult.status === 'error') {
          aiHelperSpinner.fail(`${assistantFilename} generation failed`);
          logger.error(aiHelperResult.error || 'Unknown error');
        } else {
          aiHelperSpinner.succeed(`${assistantFilename} generated in ${aiHelperDuration.toFixed(1)} seconds`);
          // Write AI assistant file immediately to project root
          const fs = await import('fs-extra');
          const aiHelperPath = path.join(cmdOptions.path, assistantFilename);
          await fs.writeFile(aiHelperPath, aiHelperResult.output!);
          allFiles.push(aiHelperPath);
          logger.success(`${assistantFilename} written to project root`);
        }

        // Generate summary
        logger.newLine();
        logger.section('3/4: Generating Summary');
        logger.newLine();

        const summarySpinner = ora('Generating SUMMARY.md...').start();
        const summaryStartTime = Date.now();
        const summaryResult = await orchestrator.generateSummary(
          context,
          projectName,
          projectDescription,
          industry,
          ['New developers', 'AI assistants']
        );
        const summaryDuration = (Date.now() - summaryStartTime) / 1000;

        if (summaryResult.status === 'error') {
          summarySpinner.fail('Summary generation failed');
          logger.error(summaryResult.error || 'Unknown error');
        } else {
          summarySpinner.succeed(`Summary generated in ${summaryDuration.toFixed(1)} seconds`);
          // Write summary file immediately to project root
          const fs = await import('fs-extra');
          const summaryPath = path.join(cmdOptions.path, 'SUMMARY.md');
          await fs.writeFile(summaryPath, summaryResult.output!);
          allFiles.push(summaryPath);
          logger.success('SUMMARY.md written to project root');
        }

        // Save generation metadata for incremental updates
        const documentationTier = context.documentationTier || 'comprehensive';
        try {
          const commitManager = new CommitManager(cmdOptions.path);
          const currentCommit = await commitManager.getLastCommitHash();

          // Parse doc result to get generated file names
          let generatedDocFiles: string[] = [];
          if (docResult.status === 'success' && docResult.output) {
            try {
              const parsed = JSON.parse(docResult.output);
              if (parsed.files && Array.isArray(parsed.files)) {
                generatedDocFiles = parsed.files.map((f: { filename: string }) =>
                  path.join(cmdOptions.path, 'lean-reports', 'docs', f.filename)
                );
              }
            } catch {
              // Ignore parse errors
            }
          }

          const metadata: GenerationMetadata = {
            commitHash: currentCommit,
            timestamp: new Date().toISOString(),
            documentationTier,
            generatedFiles: generatedDocFiles,
            projectType: context.projectType,
          };

          projectConfig.setLastGeneration(metadata);
          projectConfig.save();
          logger.debug('Saved generation metadata for incremental updates');
        } catch (metadataError) {
          logger.debug('Failed to save generation metadata: ' + (metadataError as Error).message);
        }
      }

      // Run analyzers
      logger.newLine();
      logger.section(options.docs ? '4/4: Running Analyzers' : 'Running Analyzers');
      logger.newLine();

      const analysisSpinner = ora('Running analyzers in parallel...').start();
      const analyzerResults = await orchestrator.runAllAnalyzers(context, options);
      analysisSpinner.succeed('All analyzers completed');

      allResults.push(...analyzerResults);

      const totalDuration = (Date.now() - startTime) / 1000;

      // Generate files
      logger.newLine();
      logger.info('Generating markdown files...');

      // Generate documentation files separately
      if (options.docs) {
        const docResults = allResults.filter(r => r.name === 'documentation');
        if (docResults.length > 0) {
          const docGenerator = new FileGenerator(cmdOptions.path, 'lean-reports', 'docs');
          const docFiles = await docGenerator.generateFiles(docResults);
          allFiles.push(...docFiles);
          logger.success(`Generated ${docFiles.length} documentation file${docFiles.length !== 1 ? 's' : ''} in ${docGenerator.getOutputDir()}`);
        }
      }

      // Generate analyzer files separately
      const analyzerOnlyResults = allResults.filter(r => r.name !== 'documentation');
      if (analyzerOnlyResults.length > 0) {
        const analyzerGenerator = new FileGenerator(cmdOptions.path, 'lean-reports', 'analyzer');
        const analyzerFiles = await analyzerGenerator.generateFiles(analyzerOnlyResults);
        allFiles.push(...analyzerFiles);
        logger.success(`Generated ${analyzerFiles.length} analysis report${analyzerFiles.length !== 1 ? 's' : ''} in ${analyzerGenerator.getOutputDir()}`);
      }

      const files = allFiles;

      // Generate exports if requested
      if (cmdOptions.export) {
        logger.newLine();
        logger.section('Generating Exports');
        logger.newLine();

        const formats = cmdOptions.export
          .split(',')
          .map((f: string) => f.trim().toLowerCase())
          .filter((f: string) => f === 'pdf' || f === 'html') as ExportFormat[];

        if (formats.length === 0) {
          logger.warn('No valid export formats specified. Use: pdf, html, or pdf,html');
        } else {
          const exportSpinner = ora(`Generating ${formats.join(' and ')} exports...`).start();
          try {
            const exporter = new ExportGenerator(cmdOptions.path);
            const exportedFiles = await exporter.generateExports(analyzerOnlyResults, {
              formats,
              includeSections: ['executive', 'security', 'license', 'quality', 'cost', 'hipaa'],
              outputDir: 'lean-reports/exports',
              projectName,
              industry,
            });

            if (exportedFiles.length > 0) {
              exportSpinner.succeed(`Generated ${exportedFiles.length} export file${exportedFiles.length !== 1 ? 's' : ''}`);

              // Show exported files with sizes
              for (const exp of exportedFiles) {
                const sizeKB = (exp.size / 1024).toFixed(1);
                const relativePath = exp.path.replace(cmdOptions.path + '/', '');
                logger.success(`  ${relativePath} (${sizeKB} KB)`);
              }

              allFiles.push(...exportedFiles.map(e => e.path));
            } else {
              exportSpinner.warn('No export files generated');
            }
          } catch (exportError) {
            exportSpinner.fail('Export generation failed');
            logger.error((exportError as Error).message);
          }
        }
      }

      // Prepare results summary
      const results: AnalysisResults = {
        projectContext: context,
        analyzers: allResults,
        generatedFiles: files,
        totalCost: allResults.reduce((sum, r) => sum + r.cost, 0),
        totalDuration,
        timestamp: new Date().toISOString(),
      };

      // Create PR if requested
      if (options.createPR) {
        logger.newLine();
        logger.section('Creating Pull Request');
        logger.newLine();

        const githubToken = configManager.get('githubToken');
        if (!githubToken) {
          logger.error(
            'GitHub token not configured. Run ' +
              chalk.cyan('lean-intel init') +
              ' to set it up.'
          );
          logger.info('Files are still generated in the reports/ directory.');
        } else {
          const prSpinner = ora('Creating branch and commit...').start();

          // Create branch
          const branchManager = new BranchManager(cmdOptions.path);
          const branchName = await branchManager.createBranch();

          // Commit files
          const commitManager = new CommitManager(cmdOptions.path);
          await commitManager.commitFiles(files);

          // Push branch
          await commitManager.push(branchName);

          prSpinner.succeed('Branch pushed to remote');

          // Create PR
          const prManager = new PRManager(cmdOptions.path, githubToken);
          const mainBranch = await branchManager.getMainBranch();

          const prSpinner2 = ora('Creating pull request...').start();
          const pr = await prManager.createPR(branchName, mainBranch, results);
          prSpinner2.succeed('Pull request created');

          logger.newLine();
          logger.box('Pull Request Created', [
            `URL: ${pr.url}`,
            `Number: #${pr.number}`,
            `Branch: ${branchName}`,
          ]);
        }
      }

      // Show final summary
      logger.newLine();
      logger.section('Analysis Complete');
      logger.newLine();

      const totalCost = results.totalCost;
      const successCount = allResults.filter(r => r.status === 'success').length;
      const errorCount = allResults.filter(r => r.status === 'error').length;

      logger.table({
        'Total Cost': formatCost(totalCost),
        'Total Duration': formatDuration(totalDuration),
        'Success': successCount,
        'Errors': errorCount,
        'Files Generated': files.length,
      });

      logger.newLine();
      logger.success('All done! 🎉');

      if (!options.createPR) {
        logger.log('');
        logger.log('Files are in the reports/ directory.');
        logger.log(
          'Run ' + chalk.cyan('lean-intel full --create-pr') + ' to create a pull request.'
        );
      }
    } catch (error) {
      spinner.fail('Analysis failed');
      logger.error((error as Error).message);
      process.exit(1);
    }
  });
