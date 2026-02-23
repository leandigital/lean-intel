/**
 * Documentation Prompt Rules - Generic
 * Framework-agnostic prompt rules for unknown/undetected project types
 * Used as fallback when project type detection doesn't match frontend/backend/mobile/devops
 */

import { CRITICAL_RULE_0, CRITICAL_RULE_1 } from './document-prompt-rules-frontend';

export { CRITICAL_RULE_0, CRITICAL_RULE_1 };

export interface DocumentFileDefinition {
  filename: string;
  description: string;
  requiredFor: 'minimal' | 'standard' | 'comprehensive';
  sections?: string[];
}

/**
 * Generic-specific rules — no framework assumptions
 */
export const GENERIC_SPECIFIC_RULES = `## Generic Project Verification Rules

### General Principles
- ✅ Document what is actually found in the codebase — no framework assumptions
- ✅ Identify entry points, build processes, and project structure from actual files
- ✅ Document dependencies and their roles based on package manifests
- ✅ Describe modules, directories, and their purposes based on file contents
- ❌ Don't assume any specific framework, architecture, or pattern
- ❌ Don't invent project conventions not evidenced in code

### Source Code Documentation
- ✅ Only document modules, classes, and functions found in actual source files
- ✅ Verify entry points from package.json scripts, main/bin fields, or config files
- ✅ Document actual file organization and naming patterns
- ❌ Don't assume MVC, microservices, or any specific architecture

### Configuration Documentation
- ✅ Document configuration files found in the project root and subdirectories
- ✅ Verify build commands from package.json scripts or Makefile targets
- ✅ Document environment variable usage from actual .env files or code references
- ❌ Don't invent configuration that doesn't exist`;

/**
 * Generic file definitions — framework-agnostic documentation files
 */
export const GENERIC_FILE_DEFINITIONS: DocumentFileDefinition[] = [
  {
    filename: 'ARCHITECTURE.md',
    description: 'Project overview, tech stack, and structure',
    requiredFor: 'minimal',
    sections: [
      'Project Overview',
      'Tech Stack',
      'Project Structure',
      'Key Directories',
      'Entry Points',
      'Key Dependencies',
    ],
  },
  {
    filename: 'CODEBASE.md',
    description: 'Source code organization, key modules, and entry points',
    requiredFor: 'standard',
    sections: [
      'Source Organization',
      'Key Modules',
      'Entry Points',
      'Module Dependencies',
      'Code Conventions',
    ],
  },
  {
    filename: 'DEPENDENCIES.md',
    description: 'Dependencies, configuration, and build setup',
    requiredFor: 'standard',
    sections: [
      'Production Dependencies',
      'Development Dependencies',
      'Build Configuration',
      'Scripts and Commands',
      'Environment Configuration',
    ],
  },
  {
    filename: 'AUTHENTICATION.md',
    description: 'Authentication implementation if present',
    requiredFor: 'standard',
    sections: [
      'Auth Overview',
      'Auth Strategy',
      'Token Management',
      'Auth Flow',
      'Security Considerations',
    ],
  },
  {
    filename: 'ERROR_HANDLING.md',
    description: 'Error handling patterns and logging',
    requiredFor: 'standard',
    sections: [
      'Error Handling Overview',
      'Error Types',
      'Error Propagation',
      'Logging Strategy',
      'Error Recovery',
    ],
  },
  {
    filename: 'TESTING.md',
    description: 'Test setup, patterns, and coverage',
    requiredFor: 'comprehensive',
    sections: [
      'Testing Overview',
      'Test Framework',
      'Test Structure',
      'Test Patterns',
      'Running Tests',
      'Test Coverage',
    ],
  },
  {
    filename: 'SECURITY.md',
    description: 'Security practices and considerations',
    requiredFor: 'comprehensive',
    sections: [
      'Security Overview',
      'Input Validation',
      'Authentication & Authorization',
      'Secrets Management',
      'Security Dependencies',
    ],
  },
  {
    filename: 'DEVELOPMENT_PATTERNS.md',
    description: 'Conventions, patterns, and common issues',
    requiredFor: 'standard',
    sections: [
      'Code Conventions',
      'Project Patterns',
      'Common Issues',
      'Development Setup',
      'Development Tips',
    ],
  },
];

/**
 * Get files to generate based on tier
 */
export function getGenericFilesToGenerate(
  tier: 'minimal' | 'standard' | 'comprehensive'
): DocumentFileDefinition[] {
  if (tier === 'minimal') {
    return GENERIC_FILE_DEFINITIONS.filter((f) => f.requiredFor === 'minimal');
  }

  if (tier === 'standard') {
    return GENERIC_FILE_DEFINITIONS.filter(
      (f) => f.requiredFor === 'minimal' || f.requiredFor === 'standard'
    );
  }

  return GENERIC_FILE_DEFINITIONS;
}

/**
 * Generate prompt for a single generic documentation file
 * Uses minimal context — only fileTree, dependencies, devDependencies, gitRecentCommits, packageJsonContent
 */
export function generateGenericFilePrompt(
  file: { filename: string; description: string },
  context: {
    projectName: string;
    projectDescription: string;
    industry: string;
    documentationTier: 'minimal' | 'standard' | 'comprehensive';
    fileTree: string;
    dependencies: Record<string, string>;
    devDependencies: Record<string, string>;
    gitRecentCommits: string;
    packageJsonContent?: string;
  }
): string {
  const {
    projectName,
    projectDescription,
    industry,
    documentationTier,
    fileTree,
    dependencies,
    devDependencies,
    gitRecentCommits,
    packageJsonContent,
  } = context;

  // Build tier guidance
  const tierGuidance =
    documentationTier === 'minimal'
      ? `**DOCUMENTATION TIER: MINIMAL** (<20 files) - Keep focused and concise. Aim for 200-400 lines.`
      : documentationTier === 'standard'
        ? `**DOCUMENTATION TIER: STANDARD** (20-200 files) - Provide balanced coverage. Aim for 300-500 lines.`
        : `**DOCUMENTATION TIER: COMPREHENSIVE** (200+ files) - Provide detailed coverage. Aim for 400-600 lines.`;

  return `${CRITICAL_RULE_0}

---

${CRITICAL_RULE_1}

---

${GENERIC_SPECIFIC_RULES}

---

# Generic Documentation: ${file.filename}

## Project Context

**Project Name:** ${projectName}
**Description:** ${projectDescription}
**Industry:** ${industry}
**Documentation Tier:** ${documentationTier}

${tierGuidance}

## Dependencies

**Production Dependencies (${Object.keys(dependencies).length} packages):**
${Object.entries(dependencies)
  .slice(0, 25)
  .map(([pkg, ver]) => `- ${pkg}: ${ver}`)
  .join('\n')}
${Object.keys(dependencies).length > 25 ? `... and ${Object.keys(dependencies).length - 25} more` : ''}

**Dev Dependencies (${Object.keys(devDependencies).length} packages):**
${Object.entries(devDependencies)
  .slice(0, 15)
  .map(([pkg, ver]) => `- ${pkg}: ${ver}`)
  .join('\n')}
${Object.keys(devDependencies).length > 15 ? `... and ${Object.keys(devDependencies).length - 15} more` : ''}

## Project Structure

**File Tree:**
\`\`\`
${fileTree.substring(0, 3000)}
\`\`\`

${packageJsonContent ? `**package.json:**\n\`\`\`json\n${packageJsonContent.substring(0, 1500)}\n\`\`\`` : ''}

## Recent Development Activity

\`\`\`
${gitRecentCommits.split('\n').slice(0, 15).join('\n')}
\`\`\`

---

## Your Task

Generate comprehensive **${file.filename}** documentation.

**Purpose:** ${file.description}

**Critical Requirements:**
1. **100% ACCURACY** - Only document what you can verify from context above
2. **DOMAIN-SPECIFIC** - Use ${industry} terminology throughout
3. **FILE-BASED EVIDENCE** - Reference specific files from the file tree above
4. **STRUCTURED** - Use clear hierarchical sections with headers (##, ###, ####)
5. **FILE-SPECIFIC FOCUS** - Focus on: ${file.description}
6. **NO FRAMEWORK ASSUMPTIONS** - Document what exists, don't assume patterns
7. **NO FUTURE CONTENT** - Do NOT add "Future Considerations", "Roadmap", or "Planned Features"

**DO's:**
- ✅ Reference specific files by path
- ✅ Include actual version numbers from dependencies
- ✅ Quote real commit messages
- ✅ Use ${industry} domain terminology
- ✅ Document ONLY current state of codebase

**DON'Ts:**
- ❌ Invent file paths that don't exist
- ❌ Assume any specific framework or architecture
- ❌ Make assumptions about unverified features
- ❌ Use generic placeholders or invented code
- ❌ Include speculative or future content

**FORMAT:** Return ONLY the markdown content. No JSON wrapper, no outer code blocks. Start directly with:

# ${file.filename.replace('.md', '')}

Generate the documentation now.`;
}
