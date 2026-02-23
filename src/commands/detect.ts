/**
 * detect command - Detect project type and show context
 */

import { Command } from 'commander';
import ora from 'ora';
import { ProjectDetector } from '../core/detector';
import { logger } from '../utils/logger';
import chalk from 'chalk';

export const detectCommand = new Command('detect')
  .description('Detect project type and analyze codebase')
  .option('-p, --path <path>', 'Project path', process.cwd())
  .action(async (options) => {
    const spinner = ora('Analyzing project...').start();

    try {
      const detector = new ProjectDetector(options.path);
      const context = await detector.detect();

      spinner.succeed('Project analysis complete');

      logger.newLine();
      logger.header('Project Context');
      logger.newLine();

      // Project Type
      const typeEmoji =
        context.projectType === 'frontend'
          ? '🎨'
          : context.projectType === 'backend'
            ? '⚙️'
            : context.projectType === 'mobile'
              ? '📱'
              : context.projectType === 'devops'
                ? '🏗️'
                : '❓';

      logger.log(
        chalk.bold('Project Type:      ') +
          typeEmoji +
          ' ' +
          chalk.cyan(context.projectType.toUpperCase())
      );

      // Frameworks
      if (context.frameworks.length > 0) {
        logger.log(
          chalk.bold('Frameworks:        ') + chalk.white(context.frameworks.join(', '))
        );
      }

      // Languages
      if (context.languages.length > 0) {
        logger.log(
          chalk.bold('Languages:         ') + chalk.white(context.languages.join(', '))
        );
      }

      // Package Manager
      if (context.packageManager) {
        logger.log(
          chalk.bold('Package Manager:   ') + chalk.white(context.packageManager)
        );
      }

      // Features
      logger.newLine();
      logger.log(chalk.bold('Features:'));
      logger.log(
        `  ${context.hasDatabase ? '✓' : '✗'} ${context.hasDatabase ? chalk.green('Database') : chalk.gray('Database')}`
      );
      logger.log(
        `  ${context.hasTests ? '✓' : '✗'} ${context.hasTests ? chalk.green('Tests') : chalk.gray('Tests')}`
      );
      logger.log(
        `  ${context.hasCICD ? '✓' : '✗'} ${context.hasCICD ? chalk.green('CI/CD') : chalk.gray('CI/CD')}`
      );

      // Stats
      logger.newLine();
      logger.log(chalk.bold('Code Statistics:'));
      logger.table({
        'Files': context.fileCount.toLocaleString(),
        'Lines (estimated)': context.lineCount.toLocaleString(),
        'Dependencies': Object.keys(context.dependencies).length.toLocaleString(),
        'Dev Dependencies': Object.keys(context.devDependencies).length.toLocaleString(),
      });

      // Recommendations
      logger.newLine();
      logger.log(chalk.bold('Recommended Analyzers:'));

      if (context.projectType === 'frontend') {
        logger.log(chalk.cyan('  • Documentation Generator (Frontend)'));
        logger.log(chalk.gray('    Includes: Components, Routing, State Management, Styling'));
      } else if (context.projectType === 'backend') {
        logger.log(chalk.cyan('  • Documentation Generator (Backend)'));
        logger.log(
          chalk.gray('    Includes: API Endpoints, Database, Authentication, Middleware')
        );
      } else if (context.projectType === 'mobile') {
        logger.log(chalk.cyan('  • Documentation Generator (Mobile)'));
        logger.log(
          chalk.gray('    Includes: Navigation, Screens, Native Modules, Build & Deployment')
        );
      } else if (context.projectType === 'devops') {
        logger.log(chalk.cyan('  • Documentation Generator (DevOps)'));
        logger.log(
          chalk.gray('    Includes: Infrastructure, Networking, Security, Deployment')
        );
      }

      logger.log(chalk.cyan('  • Security Analyzer'));
      logger.log(chalk.cyan('  • License Compliance'));
      logger.log(chalk.cyan('  • Code Quality'));
      logger.log(chalk.cyan('  • Cost & Scalability'));

      if (context.projectType === 'backend' && context.hasDatabase) {
        logger.log(chalk.cyan('  • HIPAA Compliance') + chalk.gray(' (if healthcare)'));
      }

      logger.newLine();
      logger.log('Run ' + chalk.cyan('lean-intel full') + ' to generate all documentation and reports.');
    } catch (error) {
      spinner.fail('Failed to analyze project');
      logger.error((error as Error).message);
      process.exit(1);
    }
  });
