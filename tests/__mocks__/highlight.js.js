/**
 * Mock for highlight.js ESM module
 */

module.exports = {
  default: {
    highlight: (code, { language }) => ({
      value: code, // Return code as-is for testing
    }),
    getLanguage: (lang) => lang !== 'invalid', // Return truthy for most languages
  },
  highlight: (code, { language }) => ({
    value: code,
  }),
  getLanguage: (lang) => lang !== 'invalid',
};
