/**
 * Documentation Prompt Rules - Frontend
 * Sophisticated prompt rules extracted from docs-generator-frontend.ts
 * Used for individual file generation with full verification standards
 */

export interface DocumentFileDefinition {
  filename: string;
  description: string;
  requiredFor: 'minimal' | 'standard' | 'comprehensive';
  sections?: string[]; // Suggested sections for this file
}

/**
 * Critical Rule #0: Zero Invented Code
 */
export const CRITICAL_RULE_0 = `🚨 CRITICAL RULE #0: ZERO INVENTED CODE - ONLY ACTUAL CODEBASE REFERENCES

**MOST CRITICAL RULE**: NEVER invent, fabricate, or create code examples. EVERY code snippet must be COPIED VERBATIM from actual files in the codebase.

FORBIDDEN (Invented Code Examples):
❌ ANY code example you write yourself (even if it looks "correct")
❌ "Here's how you should do X..." with invented code
❌ "✅ CORRECT:" followed by code you made up
❌ Template examples like "const Button = () => { ... }"
❌ "Best practice" examples not from the codebase
❌ Showing "how to fix" with invented code
❌ ANY function/class/component you didn't find in actual files

FORBIDDEN (Generic Placeholders):
❌ "your-app/src/..."
❌ "YourComponent.tsx"
❌ "[project-name]"
❌ "example-service"
❌ "@/utils/something" (when path doesn't exist)
❌ "import { X } from 'Y'" (when import doesn't exist)

REQUIRED (ONLY Actual Code):
✅ Code COPIED from actual files (with file:line citation)
✅ Actual project name from context (not placeholders)
✅ "Button.tsx:10-25" (cite actual file:line where code was found)
✅ Actual imports from actual files verified in componentFiles
✅ Actual component names from componentFiles array
✅ Patterns found in 3+ actual files (cite all 3+)

VERIFICATION BEFORE WRITING ANY CODE:
1. Is this code copied from an actual file? → If NO, DELETE IT
2. Do I have file:line reference? → If NO, DELETE IT
3. Can I cite the source file? → If NO, DELETE IT
4. Does this import/function exist? → If NO, DELETE IT

HOW TO SHOW PATTERNS:
❌ WRONG: Invent "correct" example code

✅ CORRECT: Cite actual files
"Pattern found in 3 files:
- src/components/Header.tsx:15-22 (actual code usage)
- src/components/Footer.tsx:8-15 (actual code usage)
- src/components/Nav.tsx:45-52 (actual code usage)"

If pattern doesn't exist, write:
"[Pattern] - Not found in codebase. Consider implementing if needed."

**ABSOLUTE RULE**: If you didn't READ it from a FILE, DON'T WRITE IT.`;

/**
 * Critical Rule #1: Zero Hallucination Tolerance
 */
export const CRITICAL_RULE_1 = `🚨 CRITICAL RULE #1: ZERO HALLUCINATION TOLERANCE

NEVER EVER mention any component, class, function, file, endpoint, package, or code artifact that you haven't verified exists in the actual codebase.

FORBIDDEN Examples:
- ❌ Mentioning "ErrorBoundary component" when it doesn't exist
- ❌ Documenting "POST /api/users endpoint" when it doesn't exist
- ❌ Claiming "Uses Tailwind CSS" when Tailwind isn't in package.json
- ❌ Referencing "UserService class" when there is no UserService

VERIFICATION REQUIRED:
- File exists? → Check the fileTree and componentFiles/routingFiles/etc. provided in context
- Package exists? → Check dependencies and devDependencies provided
- Component/Class/Function exists? → Must be present in the file lists or code samples
- Configuration value? → Must be visible in package.json or other configs

FORMAT REQUIREMENT: Every code reference must include file path
Example: "ErrorBoundary (src/components/ErrorBoundary.tsx)"

IF NOT FOUND: Do NOT mention it. Document only what actually exists.`;

/**
 * Frontend-specific rules
 */
export const FRONTEND_SPECIFIC_RULES = `## Frontend-Specific Verification Rules

### Component Documentation
- ✅ Only document components found in componentFiles array
- ✅ Verify component imports exist in the files
- ✅ Check for actual prop types/interfaces in the code
- ❌ Don't invent component hierarchies
- ❌ Don't assume component patterns without evidence

### Routing Documentation
- ✅ Only document routes found in routingFiles
- ✅ Verify route paths from actual routing configuration
- ✅ Document actual navigation patterns from code
- ❌ Don't invent route structures
- ❌ Don't assume routing library without checking dependencies

### State Management Documentation
- ✅ Verify state management library in dependencies (Redux, Zustand, MobX, Context API)
- ✅ Only document stores/slices found in stateManagementFiles
- ✅ Document actual state structure from code
- ❌ Don't invent state patterns
- ❌ Don't assume state management approach

### Styling Documentation
- ✅ Verify styling approach from dependencies (CSS Modules, Styled Components, Tailwind, etc.)
- ✅ Document actual styling files from stylingFiles array
- ✅ Include actual theme/design tokens from code
- ❌ Don't invent CSS patterns
- ❌ Don't assume design system without evidence

### API Layer Documentation
- ✅ Only document API calls found in apiFiles
- ✅ Verify HTTP client library in dependencies (axios, fetch, etc.)
- ✅ Document actual endpoint calls from code
- ❌ Don't invent API endpoints
- ❌ Don't assume API structure`;

/**
 * Frontend file definitions
 */
export const FRONTEND_FILE_DEFINITIONS: DocumentFileDefinition[] = [
  {
    filename: 'ARCHITECTURE.md',
    description: 'Project architecture, tech stack, and overall structure',
    requiredFor: 'minimal',
    sections: [
      'Project Overview',
      'Tech Stack',
      'Project Structure',
      'Architecture Patterns',
      'Key Dependencies',
      'Build & Development',
    ],
  },
  {
    filename: 'COMPONENTS.md',
    description: 'Component architecture, patterns, and component library',
    requiredFor: 'standard',
    sections: [
      'Component Overview',
      'Component Structure',
      'Reusable Components',
      'Component Patterns',
      'Props & Interfaces',
      'Component Testing',
    ],
  },
  {
    filename: 'ROUTING.md',
    description: 'Routing structure, navigation, and route configuration',
    requiredFor: 'standard',
    sections: [
      'Routing Overview',
      'Route Structure',
      'Route Configuration',
      'Navigation Patterns',
      'Route Guards',
      'Dynamic Routes',
    ],
  },
  {
    filename: 'STATE_MANAGEMENT.md',
    description: 'State management approach, stores, and data flow',
    requiredFor: 'standard',
    sections: [
      'State Management Overview',
      'Store Structure',
      'State Slices',
      'Actions & Reducers',
      'Selectors',
      'Async State',
    ],
  },
  {
    filename: 'API_LAYER.md',
    description: 'API integration, data fetching, and API client configuration',
    requiredFor: 'standard',
    sections: [
      'API Overview',
      'API Client Setup',
      'Endpoints',
      'Request/Response Handling',
      'Error Handling',
      'API Utilities',
    ],
  },
  {
    filename: 'STYLING.md',
    description: 'Styling approach, design system, and CSS architecture',
    requiredFor: 'comprehensive',
    sections: [
      'Styling Overview',
      'Styling Approach',
      'Design Tokens',
      'Component Styles',
      'Global Styles',
      'Responsive Design',
    ],
  },
  {
    filename: 'FORMS.md',
    description: 'Form handling, validation, and form libraries',
    requiredFor: 'comprehensive',
    sections: [
      'Forms Overview',
      'Form Libraries',
      'Form Components',
      'Validation',
      'Form State',
      'Error Handling',
    ],
  },
  {
    filename: 'AUTHENTICATION.md',
    description: 'Authentication and authorization implementation',
    requiredFor: 'standard',
    sections: [
      'Auth Overview',
      'Auth Flow',
      'Auth State',
      'Protected Routes',
      'Token Management',
      'Auth Utilities',
    ],
  },
  {
    filename: 'DEVELOPMENT_PATTERNS.md',
    description: 'Common development patterns, conventions, and best practices',
    requiredFor: 'standard',
    sections: [
      'Code Conventions',
      'Common Patterns',
      'File Organization',
      'Naming Conventions',
      'Common Issues',
      'Development Tips',
    ],
  },
];

/**
 * Get files to generate based on tier
 */
export function getFrontendFilesToGenerate(
  tier: 'minimal' | 'standard' | 'comprehensive'
): DocumentFileDefinition[] {
  if (tier === 'minimal') {
    return FRONTEND_FILE_DEFINITIONS.filter((f) => f.requiredFor === 'minimal');
  }

  if (tier === 'standard') {
    return FRONTEND_FILE_DEFINITIONS.filter(
      (f) => f.requiredFor === 'minimal' || f.requiredFor === 'standard'
    );
  }

  return FRONTEND_FILE_DEFINITIONS;
}

/**
 * Generate prompt for a single frontend documentation file
 * Now includes actual file contents for accurate documentation
 */
export function generateFrontendFilePrompt(
  file: { filename: string; description: string },
  context: {
    projectName: string;
    projectDescription: string;
    industry: string;
    documentationTier: 'minimal' | 'standard' | 'comprehensive';
    fileTree: string;
    dependencies: Record<string, string>;
    devDependencies: Record<string, string>;
    componentFiles: string[];
    routingFiles: string[];
    stateManagementFiles: string[];
    apiFiles: string[];
    stylingFiles: string[];
    gitRecentCommits: string;
    packageJsonContent: string;
    // NEW: Actual file contents for accurate documentation
    componentFileContents?: Record<string, string>;
    routingFileContents?: Record<string, string>;
    stateFileContents?: Record<string, string>;
    apiFileContents?: Record<string, string>;
    entryPointContent?: string | null;
  }
): string {
  const {
    projectName,
    projectDescription,
    industry,
    documentationTier,
    fileTree,
    dependencies,
    componentFiles,
    routingFiles,
    stateManagementFiles,
    apiFiles,
    stylingFiles,
    gitRecentCommits,
    packageJsonContent,
    componentFileContents,
    routingFileContents,
    stateFileContents,
    apiFileContents,
    entryPointContent,
  } = context;

  // Format file contents for prompt
  const formatFileContents = (contents: Record<string, string> | undefined, maxFiles = 10): string => {
    if (!contents || Object.keys(contents).length === 0) {
      return 'No file contents available';
    }
    return Object.entries(contents)
      .slice(0, maxFiles)
      .map(([path, content]) => `### ${path}\n\`\`\`typescript\n${content.substring(0, 3000)}\n\`\`\``)
      .join('\n\n');
  };

  // Detect frameworks
  const hasReact = dependencies['react'] || context.devDependencies?.['react'];
  const hasVue = dependencies['vue'];
  const hasAngular = dependencies['@angular/core'];
  const hasNext = dependencies['next'];

  const frameworkName = hasNext
    ? 'Next.js'
    : hasReact
      ? 'React'
      : hasVue
        ? 'Vue'
        : hasAngular
          ? 'Angular'
          : 'JavaScript';

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

${FRONTEND_SPECIFIC_RULES}

---

# Frontend Documentation: ${file.filename}

## Project Context

**Project Name:** ${projectName}
**Description:** ${projectDescription}
**Industry:** ${industry}
**Framework:** ${frameworkName}
**Documentation Tier:** ${documentationTier}

${tierGuidance}

## Tech Stack

**Dependencies:**
${Object.entries(dependencies)
  .slice(0, 15)
  .map(([pkg, ver]) => `- ${pkg}: ${ver}`)
  .join('\n')}

## Project Structure

**File Tree:**
\`\`\`
${fileTree.substring(0, 3000)}
\`\`\`

## Codebase Context

**Component Files (${componentFiles.length} total):**
${componentFiles.slice(0, 20).map((f) => `- ${f}`).join('\n')}
${componentFiles.length > 20 ? `... and ${componentFiles.length - 20} more` : ''}

**Routing Files (${routingFiles.length} total):**
${routingFiles.slice(0, 10).map((f) => `- ${f}`).join('\n')}

**State Management Files (${stateManagementFiles.length} total):**
${stateManagementFiles.slice(0, 10).map((f) => `- ${f}`).join('\n')}

**API Files (${apiFiles.length} total):**
${apiFiles.slice(0, 10).map((f) => `- ${f}`).join('\n')}

**Styling Files (${stylingFiles.length} total):**
${stylingFiles.slice(0, 10).map((f) => `- ${f}`).join('\n')}

## Actual File Contents (USE THESE FOR CODE REFERENCES)

**CRITICAL**: The following sections contain ACTUAL CODE from the codebase. You MUST copy code verbatim from these sections when providing examples. NEVER invent code.

### Component Files
${formatFileContents(componentFileContents, 15)}

### Routing Files
${formatFileContents(routingFileContents, 8)}

### State Management Files
${formatFileContents(stateFileContents, 8)}

### API Layer Files
${formatFileContents(apiFileContents, 8)}

${entryPointContent ? `### Entry Point\n\`\`\`typescript\n${entryPointContent.substring(0, 2000)}\n\`\`\`` : ''}

## Package.json

\`\`\`json
${packageJsonContent.substring(0, 1500)}
\`\`\`

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
3. **FILE-BASED EVIDENCE** - Reference specific files from the lists above with file:line format
4. **STRUCTURED** - Use clear hierarchical sections with headers (##, ###, ####)
5. **FILE-SPECIFIC FOCUS** - Focus on: ${file.description}
6. **INFER PATTERNS** - Document patterns found in 3+ files (cite all sources)
7. **NO FUTURE CONTENT** - Do NOT add "Future Considerations", "Roadmap", or "Planned Features"

**DO's:**
- ✅ Reference specific files by path
- ✅ Include actual version numbers from dependencies
- ✅ Quote real commit messages
- ✅ Use ${industry} domain terminology
- ✅ Provide file:line citations for all code
- ✅ Document ONLY current state of codebase

**DON'Ts:**
- ❌ Invent file paths that don't exist
- ❌ Guess at code patterns without evidence
- ❌ Make assumptions about unverified features
- ❌ Use generic placeholders or invented code
- ❌ Include speculative or future content

**FORMAT:** Return ONLY the markdown content. No JSON wrapper, no outer code blocks. Start directly with:

# ${file.filename.replace('.md', '')}

Generate the documentation now.`;
}
