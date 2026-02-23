/**
 * analyze command - Run analyzers
 */

import { Command } from 'commander';
import ora from 'ora';
import { ProjectDetector } from '../core/detector';
import { LLMOrchestrator } from '../core/llmOrchestrator';
import { FileGenerator } from '../core/fileGenerator';
import { ensureProjectConfigured } from '../utils/providerPrompt';
import { estimateCost, formatCost } from '../utils/costEstimator';
import { logger } from '../utils/logger';
import { AnalysisOptions } from '../types';
import chalk from 'chalk';

export const analyzeCommand = new Command('analyze')
  .description('Run analyzers (runs all by default)')
  .option('-p, --path <path>', 'Project path', process.cwd())
  .option('--security', 'Run only security analyzer')
  .option('--license', 'Run only license compliance analyzer')
  .option('--quality', 'Run only code quality analyzer')
  .option('--cost', 'Run only cost & scalability analyzer')
  .option('--hipaa', 'Run only HIPAA compliance analyzer')
  .option('--all', 'Run all analyzers (auto-includes HIPAA for healthcare projects)')
  .option('--dry-run', 'Show cost estimate without running')
  .option('--skip-cache', 'Skip cache and reanalyze everything')
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
      const { projectConfig, providerConfig } = await ensureProjectConfigured(cmdOptions.path);

      const projectDescription = projectConfig.get('projectDescription') || '';
      const industry = projectConfig.get('industry') || '';

      // Detect if project is healthcare-related
      const isHealthcareProject =
        /health|medical|patient|hipaa|hospital|clinic|doctor|pharmacy/i.test(projectDescription) ||
        /health|medical/i.test(industry);

      // Determine which analyzers to run
      const hasSpecificAnalyzers =
        cmdOptions.security ||
        cmdOptions.license ||
        cmdOptions.quality ||
        cmdOptions.cost ||
        cmdOptions.hipaa;

      // If no specific analyzers provided, use --all behavior
      const useAllBehavior = !hasSpecificAnalyzers || cmdOptions.all;

      const options: AnalysisOptions = {
        docs: false,
        security: useAllBehavior || cmdOptions.security || false,
        license: useAllBehavior || cmdOptions.license || false,
        quality: useAllBehavior || cmdOptions.quality || false,
        cost: useAllBehavior || cmdOptions.cost || false,
        // HIPAA: Include if explicitly requested, OR if --all and healthcare project
        hipaa: cmdOptions.hipaa || (useAllBehavior && isHealthcareProject) || false,
        createPR: false,
        dryRun: cmdOptions.dryRun || false,
        skipCache: cmdOptions.skipCache || false,
      };

      if (isHealthcareProject && options.hipaa && useAllBehavior) {
        logger.info('Healthcare project detected - including HIPAA compliance analyzer');
        logger.newLine();
      }

      // Count enabled analyzers
      const enabledCount = [
        options.security,
        options.license,
        options.quality,
        options.cost,
        options.hipaa,
      ].filter(Boolean).length;

      if (enabledCount === 0) {
        logger.error('No analyzers selected. Use --all or specify individual analyzers.');
        process.exit(1);
      }

      // Estimate cost using actual provider pricing
      const estimate = estimateCost(context, options, {
        type: providerConfig.type,
        model: providerConfig.model,
      });

      logger.newLine();
      logger.box('Cost Estimate', [
        `Provider: ${providerConfig.type} (${providerConfig.model || 'default'})`,
        `Pricing: ${estimate.pricingInfo}`,
        `Analyzers: ${enabledCount}`,
        `Input Tokens:  ${estimate.inputTokens.toLocaleString()}`,
        `Output Tokens: ${estimate.outputTokens.toLocaleString()}`,
        `Estimated Cost: ${formatCost(estimate.estimatedCost)}`,
      ]);
      logger.newLine();

      logger.info('Analyzers will run in parallel for optimal performance.');
      logger.newLine();

      if (options.dryRun) {
        logger.info('Dry run complete. Use without --dry-run to run analysis.');
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

      // Run analyzers
      const orchestrator = new LLMOrchestrator(providerConfig, cmdOptions.path, {
        skipCache: cmdOptions.skipCache,
      });

      logger.newLine();
      logger.section('Running Analyzers');
      logger.newLine();

      const analysisSpinner = ora('Running analyzers in parallel...').start();

      const startTime = Date.now();
      const results = await orchestrator.runAllAnalyzers(context, options);
      const totalDuration = (Date.now() - startTime) / 1000 / 60;

      analysisSpinner.succeed(`All analyzers completed in ${totalDuration.toFixed(1)} minutes`);

      // Generate files
      const fileGenerator = new FileGenerator(cmdOptions.path, 'lean-reports', 'analyzer');
      const files = await fileGenerator.generateFiles(results);

      logger.newLine();
      logger.success(
        `Generated ${files.length} report${files.length !== 1 ? 's' : ''} in ${fileGenerator.getOutputDir()}`
      );

      // Show summary
      logger.newLine();
      logger.section('Analysis Summary');
      logger.newLine();

      const totalCost = results.reduce((sum, r) => sum + r.cost, 0);
      const successCount = results.filter(r => r.status === 'success').length;
      const errorCount = results.filter(r => r.status === 'error').length;

      results.forEach(result => {
        const icon = result.status === 'success' ? '✓' : '✗';
        const color = result.status === 'success' ? chalk.green : chalk.red;

        logger.log(
          color(
            `${icon} ${result.name.padEnd(15)} ${formatCost(result.cost).padEnd(8)} ${result.duration.toFixed(0)}s`
          )
        );
      });

      logger.newLine();
      logger.table({
        'Total Cost': formatCost(totalCost),
        'Total Duration': `${totalDuration.toFixed(1)} min`,
        'Success': successCount,
        'Errors': errorCount,
        'Files Generated': files.length,
      });

      if (errorCount > 0) {
        logger.newLine();
        logger.warn(`${errorCount} analyzer${errorCount !== 1 ? 's' : ''} failed. Check the output for details.`);
      }

      logger.newLine();
      logger.log('Review the generated reports in the reports/ directory.');
      logger.log(
        'Run ' + chalk.cyan('lean-intel full --create-pr') + ' to create a PR with all reports.'
      );
    } catch (error) {
      spinner.fail('Analysis failed');
      logger.error((error as Error).message);
      process.exit(1);
    }
  });
