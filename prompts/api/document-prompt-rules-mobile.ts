/**
 * Documentation Prompt Rules - Mobile
 * Sophisticated prompt rules for mobile documentation
 * Used for individual file generation with full verification standards
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
 * Mobile-specific rules
 */
export const MOBILE_SPECIFIC_RULES = `## Mobile-Specific Verification Rules

### Navigation Documentation
- ✅ Only document screens found in screenFiles
- ✅ Verify navigation library from dependencies (React Navigation, Flutter Navigation, etc.)
- ✅ Document actual navigation patterns from code
- ❌ Don't invent screen hierarchies
- ❌ Don't assume navigation structure

### Platform-Specific Code Documentation
- ✅ Document actual iOS-specific code (Swift, Objective-C bridges)
- ✅ Document actual Android-specific code (Kotlin, Java bridges)
- ✅ Verify platform-specific modules in native directories
- ❌ Don't assume platform features without evidence
- ❌ Don't invent native module bridges

### State Management Documentation
- ✅ Verify state management library (Redux, Zustand, MobX, Context API)
- ✅ Only document stores/slices found in stateFiles
- ✅ Document actual async storage patterns (AsyncStorage, MMKV, etc.)
- ❌ Don't invent state patterns
- ❌ Don't assume storage mechanisms

### Native Module Documentation
- ✅ Only document native modules found in ios/ and android/ directories
- ✅ Verify native module bridges in code
- ✅ Document actual native functionality
- ❌ Don't invent native features
- ❌ Don't assume native capabilities

### Security & Secrets
- ⚠️ NEVER include bundle IDs in plain text (redact as [BUNDLE_ID])
- ⚠️ NEVER include provisioning profiles or certificates
- ⚠️ NEVER include API keys or secrets
- ⚠️ NEVER include absolute file paths
- ✅ ALWAYS use relative paths from project root`;

/**
 * Mobile file definitions
 */
export const MOBILE_FILE_DEFINITIONS: DocumentFileDefinition[] = [
  {
    filename: 'ARCHITECTURE.md',
    description: 'Mobile app architecture, tech stack, and structure',
    requiredFor: 'minimal',
    sections: [
      'App Overview',
      'Tech Stack',
      'Project Structure',
      'Architecture Pattern',
      'Key Dependencies',
      'Platform Support',
    ],
  },
  {
    filename: 'NAVIGATION.md',
    description: 'Navigation structure, screen flow, and routing',
    requiredFor: 'standard',
    sections: [
      'Navigation Overview',
      'Navigation Library',
      'Screen Structure',
      'Navigation Flow',
      'Deep Linking',
      'Navigation Guards',
    ],
  },
  {
    filename: 'SCREENS.md',
    description: 'Screen components, layouts, and UI structure',
    requiredFor: 'standard',
    sections: [
      'Screens Overview',
      'Screen Structure',
      'Screen Components',
      'Screen Props',
      'Screen State',
      'Screen Patterns',
    ],
  },
  {
    filename: 'STATE_MANAGEMENT.md',
    description: 'State management, data flow, and persistence',
    requiredFor: 'standard',
    sections: [
      'State Overview',
      'State Library',
      'Store Structure',
      'Actions & Reducers',
      'Local Storage',
      'Async State',
    ],
  },
  {
    filename: 'API_INTEGRATION.md',
    description: 'API integration, network calls, and data fetching',
    requiredFor: 'standard',
    sections: [
      'API Overview',
      'HTTP Client',
      'Endpoints',
      'Request Handling',
      'Offline Support',
      'Cache Strategy',
    ],
  },
  {
    filename: 'NATIVE_MODULES.md',
    description: 'Native modules, platform-specific code, and bridges',
    requiredFor: 'comprehensive',
    sections: [
      'Native Modules Overview',
      'iOS Native Code',
      'Android Native Code',
      'Native Bridges',
      'Platform APIs',
      'Permissions',
    ],
  },
  {
    filename: 'STYLING.md',
    description: 'Styling approach, design system, and theming',
    requiredFor: 'comprehensive',
    sections: [
      'Styling Overview',
      'Styling Library',
      'Design Tokens',
      'Component Styles',
      'Responsive Design',
      'Dark Mode',
    ],
  },
  {
    filename: 'AUTHENTICATION.md',
    description: 'Authentication flow and user session management',
    requiredFor: 'standard',
    sections: [
      'Auth Overview',
      'Auth Flow',
      'Token Management',
      'Biometric Auth',
      'Secure Storage',
      'Session Handling',
    ],
  },
  {
    filename: 'BUILD_DEPLOYMENT.md',
    description: 'Build process, deployment, and release procedures',
    requiredFor: 'comprehensive',
    sections: [
      'Build Overview',
      'iOS Build',
      'Android Build',
      'Environment Config',
      'Release Process',
      'App Store Deployment',
    ],
  },
  {
    filename: 'DEVELOPMENT_PATTERNS.md',
    description: 'Common patterns, conventions, and best practices',
    requiredFor: 'standard',
    sections: [
      'Code Conventions',
      'Project Structure',
      'Naming Conventions',
      'Common Patterns',
      'Common Issues',
      'Development Tips',
    ],
  },
];

/**
 * Get files to generate based on tier
 */
export function getMobileFilesToGenerate(
  tier: 'minimal' | 'standard' | 'comprehensive'
): DocumentFileDefinition[] {
  if (tier === 'minimal') {
    return MOBILE_FILE_DEFINITIONS.filter((f) => f.requiredFor === 'minimal');
  }

  if (tier === 'standard') {
    return MOBILE_FILE_DEFINITIONS.filter(
      (f) => f.requiredFor === 'minimal' || f.requiredFor === 'standard'
    );
  }

  return MOBILE_FILE_DEFINITIONS;
}

/**
 * Generate prompt for a single mobile documentation file
 */
export function generateMobileFilePrompt(
  file: { filename: string; description: string },
  context: {
    projectName: string;
    projectDescription: string;
    industry: string;
    documentationTier: 'minimal' | 'standard' | 'comprehensive';
    fileTree: string;
    dependencies: Record<string, string>;
    devDependencies: Record<string, string>;
    screenFiles: string[];
    navigationFiles: string[];
    stateFiles: string[];
    apiFiles: string[];
    nativeModuleFiles: string[];
    stylingFiles: string[];
    mobilePlatform: string;
    gitRecentCommits: string;
    packageJsonContent?: string;
    // NEW: Actual file contents for accurate documentation
    screenFileContents?: Record<string, string>;
    navigationFileContents?: Record<string, string>;
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
    screenFiles,
    navigationFiles,
    stateFiles,
    apiFiles,
    nativeModuleFiles,
    stylingFiles,
    mobilePlatform,
    gitRecentCommits,
    packageJsonContent,
    screenFileContents,
    navigationFileContents,
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

${MOBILE_SPECIFIC_RULES}

---

# Mobile Documentation: ${file.filename}

## Project Context

**Project Name:** ${projectName}
**Description:** ${projectDescription}
**Industry:** ${industry}
**Platform:** ${mobilePlatform}
**Documentation Tier:** ${documentationTier}

${tierGuidance}

## Tech Stack

**Key Dependencies:**
${Object.entries(dependencies)
  .slice(0, 15)
  .map(([pkg, ver]) => `- ${pkg}: ${ver}`)
  .join('\n')}

## Project Structure

**File Tree:**
\`\`\`
${fileTree.substring(0, 3000)}
\`\`\`

${packageJsonContent ? `**package.json:**\n\`\`\`json\n${packageJsonContent.substring(0, 1500)}\n\`\`\`` : ''}

## Codebase Context

**Screen Files (${screenFiles.length} total):**
${screenFiles.slice(0, 20).map((f) => `- ${f}`).join('\n')}

**Navigation Files (${navigationFiles.length} total):**
${navigationFiles.map((f) => `- ${f}`).join('\n')}

**State Files (${stateFiles.length} total):**
${stateFiles.slice(0, 10).map((f) => `- ${f}`).join('\n')}

**API Files (${apiFiles.length} total):**
${apiFiles.slice(0, 10).map((f) => `- ${f}`).join('\n')}

**Native Module Files (${nativeModuleFiles.length} total):**
${nativeModuleFiles.map((f) => `- ${f}`).join('\n')}

**Styling Files (${stylingFiles.length} total):**
${stylingFiles.slice(0, 10).map((f) => `- ${f}`).join('\n')}

## Actual File Contents (USE THESE FOR CODE REFERENCES)

**CRITICAL**: The following sections contain ACTUAL CODE from the codebase. You MUST copy code verbatim from these sections when providing examples. NEVER invent code.

### Screen Files
${formatFileContents(screenFileContents, 12)}

### Navigation Files
${formatFileContents(navigationFileContents, 6)}

### State Management Files
${formatFileContents(stateFileContents, 8)}

### API Layer Files
${formatFileContents(apiFileContents, 6)}

${entryPointContent ? `### Entry Point\n\`\`\`typescript\n${entryPointContent.substring(0, 2000)}\n\`\`\`` : ''}

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
3. **FILE-BASED EVIDENCE** - Reference specific files with file:line format
4. **SECURITY** - Redact bundle IDs, secrets, and absolute paths
5. **FILE-SPECIFIC FOCUS** - Focus on: ${file.description}
6. **INFER PATTERNS** - Document patterns found in 3+ files (cite all sources)
7. **NO FUTURE CONTENT** - Do NOT add "Future Considerations" or "Roadmap"

**DO's:**
- ✅ Reference specific files by relative path
- ✅ Include actual version numbers from dependencies
- ✅ Use ${industry} domain terminology
- ✅ Provide file:line citations for all code
- ✅ Document ONLY current state of the app

**DON'Ts:**
- ❌ Include bundle IDs, secrets, or API keys
- ❌ Use absolute file paths
- ❌ Invent features that don't exist
- ❌ Use generic placeholders or invented code
- ❌ Include speculative or future content

**FORMAT:** Return ONLY the markdown content. No JSON wrapper, no outer code blocks. Start directly with:

# ${file.filename.replace('.md', '')}

Generate the documentation now.`;
}
