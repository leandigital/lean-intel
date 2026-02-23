/**
 * ESM Dynamic Import Utility
 *
 * This module provides a safe way to dynamically import ESM-only modules
 * from within a CommonJS context (TypeScript compiled with module: "commonjs").
 *
 * WHY THIS IS NEEDED:
 * - Some dependencies (like inquirer v10+) are ESM-only
 * - TypeScript with "module": "commonjs" transpiles `import()` to `require()`
 * - Using `new Function('return import(...)')()` bypasses TypeScript's transpilation
 *
 * SECURITY ANALYSIS:
 * - This is SAFE because:
 *   1. The module path is hardcoded at compile time, not user input
 *   2. No user-provided strings are passed to Function()
 *   3. This is a well-known pattern for ESM interop in Node.js
 *   4. The function body is a static string literal
 *
 * - This would be UNSAFE if:
 *   1. The module path came from user input (code injection)
 *   2. The function body was constructed from user input
 *
 * ALTERNATIVES CONSIDERED:
 * - Using "module": "esnext" in tsconfig.json - breaks other dependencies
 * - Using require() - doesn't work with ESM-only modules
 * - Using eval() - functionally identical but more "scary" looking
 *
 * REFERENCES:
 * - https://github.com/microsoft/TypeScript/issues/43329
 * - https://nodejs.org/api/esm.html#interoperability-with-commonjs
 */

/**
 * Dynamically import an ESM module, bypassing TypeScript's transpilation
 *
 * @param modulePath - The module to import (must be a string literal at call site)
 * @returns Promise resolving to the module's exports
 *
 * @example
 * // Import ESM-only module
 * const inquirer = await importEsm<typeof import('inquirer')>('inquirer');
 * const answers = await inquirer.default.prompt([...]);
 */
export async function importEsm<T>(modulePath: string): Promise<T> {
  // Using Function constructor to create a dynamic import that bypasses
  // TypeScript's CommonJS transpilation. This is equivalent to:
  //   return import(modulePath);
  // But TypeScript won't transform it to require().
  const dynamicImport = new Function('modulePath', 'return import(modulePath)');
  return dynamicImport(modulePath) as Promise<T>;
}

/**
 * Import the inquirer module (commonly used for CLI prompts)
 * Returns the default export directly for convenience.
 */
export async function importInquirer(): Promise<typeof import('inquirer').default> {
  const module = await importEsm<typeof import('inquirer')>('inquirer');
  return module.default;
}
