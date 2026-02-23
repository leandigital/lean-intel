/**
 * Logger utility with colored output
 *
 * Environment Variables:
 *   DEBUG            - Enable debug output
 *   LEAN_INTEL_DEBUG - Enable debug output (alias for DEBUG)
 */

import chalk from 'chalk';

/**
 * Check if debug mode is enabled via environment variables
 */
function isDebugEnabled(): boolean {
  return !!(process.env.DEBUG || process.env.LEAN_INTEL_DEBUG);
}

export class Logger {
  private silent: boolean;

  constructor(silent = false) {
    this.silent = silent;
  }

  info(message: string): void {
    if (!this.silent) {
      console.log(chalk.blue('ℹ'), message);
    }
  }

  success(message: string): void {
    if (!this.silent) {
      console.log(chalk.green('✓'), message);
    }
  }

  warn(message: string): void {
    if (!this.silent) {
      console.log(chalk.yellow('⚠'), message);
    }
  }

  error(message: string, error?: Error): void {
    if (!this.silent) {
      console.log(chalk.red('✗'), message);
      if (error && error.stack) {
        console.log(chalk.gray(error.stack));
      }
    }
  }

  debug(message: string): void {
    if (!this.silent && isDebugEnabled()) {
      console.log(chalk.gray('🔍'), chalk.gray(message));
    }
  }

  header(message: string): void {
    if (!this.silent) {
      console.log();
      console.log(chalk.bold.cyan(message));
      console.log(chalk.cyan('─'.repeat(message.length)));
    }
  }

  section(message: string): void {
    if (!this.silent) {
      console.log();
      console.log(chalk.bold(message));
    }
  }

  log(message: string): void {
    if (!this.silent) {
      console.log(message);
    }
  }

  newLine(): void {
    if (!this.silent) {
      console.log();
    }
  }

  table(data: Record<string, string | number>): void {
    if (!this.silent) {
      const maxKeyLength = Math.max(...Object.keys(data).map(k => k.length));
      Object.entries(data).forEach(([key, value]) => {
        const paddedKey = key.padEnd(maxKeyLength);
        console.log(`  ${chalk.gray(paddedKey)} ${chalk.white(value)}`);
      });
    }
  }

  box(title: string, content: string[]): void {
    if (!this.silent) {
      const maxLength = Math.max(title.length, ...content.map(c => c.length));
      const border = '─'.repeat(maxLength + 4);

      console.log(chalk.cyan(`┌${border}┐`));
      console.log(chalk.cyan('│ ') + chalk.bold(title.padEnd(maxLength + 2)) + chalk.cyan(' │'));
      console.log(chalk.cyan(`├${border}┤`));

      content.forEach(line => {
        console.log(chalk.cyan('│ ') + line.padEnd(maxLength + 2) + chalk.cyan(' │'));
      });

      console.log(chalk.cyan(`└${border}┘`));
    }
  }
}

export const logger = new Logger();
