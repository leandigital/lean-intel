#!/usr/bin/env node

/**
 * lean-intel CLI
 * AI-powered documentation generation and code analyzer
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { readFileSync } from 'fs';
import { join } from 'path';
import { initCommand } from './commands/init';
import { detectCommand } from './commands/detect';
import { docsCommand } from './commands/docs';
import { updateCommand } from './commands/update';
import { analyzeCommand } from './commands/analyze';
import { summaryCommand } from './commands/summary';
import { aiHelperCommand } from './commands/ai-helper';
import { fullCommand } from './commands/full';

const packageJson = JSON.parse(
  readFileSync(join(__dirname, '../../package.json'), 'utf-8')
);

const program = new Command();

program
  .name('lean-intel')
  .description(packageJson.description)
  .version(packageJson.version);

// ASCII art banner
const banner = `
${chalk.cyan('┌───────────────────────────────────┐')}
${chalk.cyan('│')}  ${chalk.bold.white('lean-intel')}                       ${chalk.cyan('│')}
${chalk.cyan('│')}  ${chalk.gray('AI-powered docs & analysis')}       ${chalk.cyan('│')}
${chalk.cyan('└───────────────────────────────────┘')}
`;

program.addHelpText('beforeAll', banner);

// Commands
program.addCommand(initCommand);
program.addCommand(detectCommand);
program.addCommand(docsCommand);
program.addCommand(updateCommand);
program.addCommand(analyzeCommand);
program.addCommand(summaryCommand);
program.addCommand(aiHelperCommand);
program.addCommand(fullCommand);

// Parse and execute
program.parse();
