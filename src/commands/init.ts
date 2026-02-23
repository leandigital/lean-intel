/**
 * init command - Initialize lean-intel configuration in .lean-intel.json
 */

import { Command } from 'commander';
import { ProjectConfigManager } from '../utils/projectConfig';
import { runProjectSetup } from '../utils/setupProject';
import { logger } from '../utils/logger';
import chalk from 'chalk';

export const initCommand = new Command('init')
  .description('Initialize lean-intel configuration')
  .option('--force', 'Skip existing project detection and run init')
  .action(async (options) => {
    logger.header('lean-intel Configuration');

    // Check for existing lean-intel project
    const projectConfig = new ProjectConfigManager(process.cwd());
    const lastGeneration = projectConfig.getLastGeneration();

    if (lastGeneration && !options.force) {
      const { importInquirer } = await import('../utils/esm');
      const inquirer = await importInquirer();

      logger.log('');
      logger.info(
        `Found existing lean-intel project with ${lastGeneration.generatedFiles?.length || 0} generated files.`
      );
      logger.log(chalk.gray(`Last generated: ${lastGeneration.timestamp}`));
      logger.log(chalk.gray(`Project type: ${lastGeneration.projectType}`));
      logger.log('');

      const { action } = await inquirer.prompt([
        {
          type: 'select',
          name: 'action',
          message: 'What would you like to do?',
          choices: [
            {
              name: 'Update documentation (recommended) - Refresh based on code changes',
              value: 'update',
            },
            {
              name: 'Reconfigure - Change LLM provider or settings',
              value: 'init',
            },
          ],
          default: 'update',
        },
      ]);

      if (action === 'update') {
        logger.newLine();
        logger.info('Switching to update mode...');
        logger.log('');
        const { updateCommand } = await import('./update');
        await updateCommand.parseAsync(['node', 'lean-intel', 'update']);
        return;
      }
      // Continue with init if user chose to reconfigure
    }

    logger.log('');
    logger.log(
      'This will set up lean-intel for this project. Config is saved to .lean-intel.json.'
    );
    logger.log('');

    await runProjectSetup(process.cwd());

    logger.log('You can now run:');
    logger.log(chalk.cyan('  lean-intel detect    ') + '# Detect project type');
    logger.log(chalk.cyan('  lean-intel docs      ') + '# Generate documentation');
    logger.log(chalk.cyan('  lean-intel analyze   ') + '# Run analyzer');
    logger.log(chalk.cyan('  lean-intel full      ') + '# Run everything');
  });
