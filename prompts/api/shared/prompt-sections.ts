/**
 * Shared prompt sections for analyzers and generators
 * Centralizes common prompt text patterns to reduce duplication
 */

/**
 * Critical Rule #0 - Zero invented code (used in documentation generators)
 */
export const CRITICAL_RULE_ZERO = `
## CRITICAL RULE #0: Zero Invented Code

THE MOST IMPORTANT RULE - You must NEVER:
- Invent, fabricate, or write code examples that don't exist in the codebase
- Use generic placeholders like "your-app/src/...", "YourComponent.tsx", "[project-name]"
- Create template code that doesn't exist in the actual codebase

You MUST ONLY:
- Use code COPIED VERBATIM from actual files with file:line citations
- Use actual project names from the configuration
- Cite patterns found in 3+ actual files (cite all sources)

Golden Rule: "If you didn't READ it from a FILE, DON'T WRITE IT."
`;

/**
 * Output formatting instructions (used in all analyzers)
 */
export const OUTPUT_FORMAT_JSON = `
## Output Format

Return a single JSON object matching the schema exactly. Do not include:
- Markdown code fences
- Explanatory text before or after the JSON
- Comments inside the JSON

The response must be valid, parseable JSON.
`;

/**
 * Output formatting for markdown content
 */
export const OUTPUT_FORMAT_MARKDOWN = `
## Output Format

Return raw markdown content starting with a # header. Do not:
- Wrap in code fences
- Add explanatory text before the content
- Include any prefix or suffix outside the markdown

Start directly with the markdown header.
`;

/**
 * Verification instructions for analyzers
 */
export const VERIFICATION_INSTRUCTIONS = `
## Verification Requirements

For EVERY finding, you must:
1. Cite the exact file path and line number where the issue was found
2. Include the actual code snippet (copied verbatim)
3. Explain the specific risk or impact
4. Provide actionable remediation steps

Do NOT report issues without file:line evidence.
`;

/**
 * M&A context for analyzers
 */
export const MA_CONTEXT = `
## M&A Due Diligence Context

This analysis is being conducted for M&A, VC funding, or enterprise sales evaluation.
Focus on:
- Deal-blocking issues that could affect valuation
- Hidden technical debt that impacts maintenance costs
- Security vulnerabilities that create liability
- License compliance issues that affect IP ownership
- Scalability concerns that limit growth potential

Assign severity based on business impact, not just technical severity.
`;

/**
 * Project type indicators (used in detection)
 */
export function getProjectTypeIndicators(projectType: string): string {
  const indicators: Record<string, string> = {
    frontend: 'React, Vue, Angular, Svelte, Next.js, Nuxt, component libraries, CSS frameworks',
    backend: 'Express, NestJS, FastAPI, Django, Flask, Spring Boot, database ORMs, API frameworks',
    mobile: 'React Native, Expo, Flutter, Swift, Kotlin, iOS/Android SDKs, native modules',
    devops: 'Terraform, Kubernetes, Helm, CloudFormation, CI/CD pipelines, Docker, cloud providers',
  };
  return indicators[projectType] || 'General software project';
}

/**
 * Generate severity distribution guidance
 */
export const SEVERITY_GUIDANCE = `
## Severity Classification

- **Critical**: Immediate action required. Security breach, data loss, or compliance violation imminent.
- **High**: Urgent attention needed. Significant risk if not addressed within days.
- **Medium**: Should be addressed in current sprint. Moderate risk or degraded functionality.
- **Low**: Can be addressed in backlog. Minor issues or code quality improvements.
- **Informational**: No immediate action needed. Best practice suggestions.
`;

/**
 * Generate common dependencies context
 */
export function formatDependenciesContext(
  dependencies: Record<string, string>,
  devDependencies: Record<string, string>
): string {
  const depCount = Object.keys(dependencies).length;
  const devDepCount = Object.keys(devDependencies).length;

  let context = `Dependencies: ${depCount} production, ${devDepCount} development\n\n`;

  if (depCount > 0) {
    context += `Production dependencies:\n`;
    context += Object.entries(dependencies)
      .slice(0, 50)
      .map(([name, version]) => `- ${name}@${version}`)
      .join('\n');
    if (depCount > 50) {
      context += `\n... and ${depCount - 50} more`;
    }
    context += '\n\n';
  }

  if (devDepCount > 0) {
    context += `Dev dependencies:\n`;
    context += Object.entries(devDependencies)
      .slice(0, 30)
      .map(([name, version]) => `- ${name}@${version}`)
      .join('\n');
    if (devDepCount > 30) {
      context += `\n... and ${devDepCount - 30} more`;
    }
  }

  return context;
}
