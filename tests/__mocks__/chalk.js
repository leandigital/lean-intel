/**
 * Mock for chalk (ESM-only module)
 * Returns strings as-is for testing
 */

const identity = (str) => str;

const chalk = {
  blue: identity,
  green: identity,
  yellow: identity,
  red: identity,
  gray: identity,
  cyan: identity,
  white: identity,
  bold: identity,
  dim: identity,
  italic: identity,
  underline: identity,
  bgRed: identity,
  bgGreen: identity,
  bgBlue: identity,
  bgYellow: identity,
};

// Make chainable
Object.keys(chalk).forEach((key) => {
  chalk[key] = Object.assign(identity, chalk);
});

module.exports = chalk;
module.exports.default = chalk;
