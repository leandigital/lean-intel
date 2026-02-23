/**
 * AI Assistant Generator - API-optimized prompt
 * Adapted from: ../../documentation/AI_ASSISTANT_GENERATOR.md
 *
 * Version 2.0 - AI-OPTIMIZED FORMAT
 * - Explicit rules (ALWAYS/NEVER) instead of suggestions
 * - Complete code templates (no partial examples)
 * - Validation checklists for AI self-verification
 * - Decision trees for architectural choices
 * - Anti-patterns with wrong/right examples
 * - Project-type-specific adaptations
 */

export const aiAssistantGeneratorMetadata = {
  name: 'ai-assistant',
  version: '2.0',
  description: 'Generates AI-optimized assistant instruction file (CLAUDE.md, COPILOT.md, etc.) with explicit rules, validation checklists, and complete code templates',
  estimatedTokens: {
    input: { small: 40000, medium: 60000, large: 90000 },
    output: { small: 4000, medium: 6000, large: 8000 }, // Increased for comprehensive optimization content
  },
};

interface AIAssistantGeneratorContext {
  projectName: string;
  projectDescription: string;
  industry: string;
  projectType: 'frontend' | 'backend' | 'mobile' | 'devops' | 'fullstack' | 'other';
  aiAssistant: 'claude-code' | 'cursor' | 'copilot' | 'chatgpt' | 'gemini';
  sizeMode?: 'compact' | 'standard' | 'max'; // Optional override, auto-detected from aiAssistant + codebase size
  documentationTier?: 'minimal' | 'standard' | 'comprehensive'; // Auto-determined based on codebase size

  // Codebase data
  fileTree: string;
  primaryLanguage: string;
  frameworks: string[];
  languages: string[];
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
  packageJsonContent?: string;
  requirementsTxtContent?: string;

  // Project structure
  mainDirectories: string[];
  entryPoint?: string;
  hasTests: boolean;
  hasDocker: boolean;
  hasDatabase: boolean;
  databaseType?: string;

  // File counts
  fileCount?: number;
  componentFiles?: string[];
  apiFiles?: string[];
  stateManagementFiles?: string[];
  routingFiles?: string[];
  testFiles?: string[];

  // Scripts and commands
  scriptsFromPackageJson: Record<string, string>;

  // Git history for common issues
  gitRecentCommits: string;
  gitCommitCount?: number; // Total commit count for mode detection

  // Existing documentation
  hasComprehensiveDocs: boolean;
  architectureContent?: string;
  existingDocsFiles?: string[];

  // Environment config
  hasEnvExample: boolean;
  envVariables: string[];

  // Key features (detected from codebase)
  keyFeatures: string[];

  // Critical patterns (detected)
  stateManagementApproach?: string;
  apiApproach?: string;
  routingApproach?: string;
  stylingApproach?: string;
  authenticationApproach?: string;
}

import type { VerifiedInventory } from '../../src/core/codebaseInventory';

/**
 * Generate AI assistant file prompt
 */
export function generateAIAssistantGeneratorPrompt(
  context: AIAssistantGeneratorContext,
  inventory: VerifiedInventory
): string {
  const {
    projectName,
    projectDescription,
    industry,
    projectType,
    aiAssistant,
    sizeMode: userSizeMode,
    documentationTier,
    fileTree = '',
    primaryLanguage = 'javascript',
    frameworks = [],
    languages = [],
    dependencies = {},
    scriptsFromPackageJson = {},
    mainDirectories = [],
    entryPoint,
    hasTests = false,
    hasDocker = false,
    hasDatabase = false,
    databaseType,
    gitRecentCommits = 'No recent commits found',
    gitCommitCount = 0,
    hasComprehensiveDocs = false,
    architectureContent,
    existingDocsFiles = [],
    hasEnvExample = false,
    envVariables = [],
    keyFeatures = [],
    fileCount,
    testFiles,
    stateManagementApproach,
    apiApproach,
    routingApproach,
    stylingApproach,
    authenticationApproach,
  } = context;

  // Auto-detect size mode based on BOTH AI assistant type AND codebase size (can be overridden by user)
  const autoDetectedSizeMode: 'compact' | 'standard' | 'max' = (() => {
    // If we have documentation tier, use it to inform size mode
    if (documentationTier) {
      // Map documentation tier to recommended size mode
      const tierRecommendation: Record<string, 'compact' | 'standard' | 'max'> = {
        minimal: 'compact',
        standard: 'standard',
        comprehensive: 'max',
      };
      const recommendedMode = tierRecommendation[documentationTier];

      // AI assistant capability limits (what this assistant CAN handle)
      const aiAssistantMaxMode: Record<string, 'compact' | 'standard' | 'max'> = {
        'claude-code': 'max',
        cursor: 'max',
        chatgpt: 'standard',
        gemini: 'standard',
        copilot: 'compact',
      };
      const maxCapability = aiAssistantMaxMode[aiAssistant] || 'standard';

      // Use the LOWER of tier recommendation and AI capability
      // Example: copilot + comprehensive → compact (copilot can't handle max)
      // Example: claude + minimal → compact (minimal doesn't need max)
      const modes = ['compact', 'standard', 'max'];
      const recIndex = modes.indexOf(recommendedMode);
      const maxIndex = modes.indexOf(maxCapability);
      return modes[Math.min(recIndex, maxIndex)] as 'compact' | 'standard' | 'max';
    }

    // Fallback to AI assistant-only detection (legacy behavior)
    switch (aiAssistant) {
      case 'claude-code':
      case 'cursor':
        return 'max';
      case 'chatgpt':
      case 'gemini':
        return 'standard';
      case 'copilot':
        return 'compact';
      default:
        return 'standard';
    }
  })();

  const sizeMode = userSizeMode || autoDetectedSizeMode;

  const frameworkList = frameworks.length > 0 ? frameworks.join(', ') : 'None detected';
  const aiAssistantNames: Record<string, string> = {
    'claude-code': 'Claude Code',
    'cursor': 'Cursor AI',
    'copilot': 'GitHub Copilot',
    'chatgpt': 'ChatGPT',
    'gemini': 'Google Gemini',
  };
  const aiAssistantName = aiAssistantNames[aiAssistant] || 'AI Assistant';
  const filename = `${aiAssistant.toUpperCase().replace('-', '_')}.md`;

  // Size mode configuration
  const sizeModeConfig = {
    compact: {
      name: 'Compact',
      targetLines: '200-300 lines',
      targetChars: '8k-12k characters',
      maxLines: 350,
      maxChars: 15000,
      description: 'Optimized for GitHub Copilot and low-context assistants',
    },
    standard: {
      name: 'Standard',
      targetLines: '350-500 lines',
      targetChars: '20k-30k characters',
      maxLines: 600,
      maxChars: 35000,
      description: 'Balanced for ChatGPT and Google Gemini',
    },
    max: {
      name: 'Maximum',
      targetLines: '500-700 lines',
      targetChars: '45k-60k characters',
      maxLines: 800,
      maxChars: 64000,
      description: 'Comprehensive for Claude Code and Cursor (high-context models)',
    },
  };

  const currentSizeConfig = sizeModeConfig[sizeMode];

  // Auto-detect generation mode based on codebase maturity
  const generationMode: 'strict' | 'synthesis' | 'hybrid' = (() => {
    const fc = fileCount || 0;
    const cc = gitCommitCount || 0;

    // Strict Mode: 200+ files AND 100+ commits (mature codebase)
    if (fc >= 200 && cc >= 100) {
      return 'strict';
    }
    // Synthesis Mode: < 50 files OR < 20 commits (new/small codebase)
    if (fc < 50 || cc < 20) {
      return 'synthesis';
    }
    // Hybrid Mode (default): between thresholds
    return 'hybrid';
  })();

  const generationModeNames = {
    strict: 'Strict (Copy-Only)',
    synthesis: 'Synthesis (Propose Patterns)',
    hybrid: 'Hybrid (Copy + Propose)',
  };

  return `🚨 CRITICAL: ${generationMode === 'strict' ? 'STRICT MODE - ZERO FABRICATION' : generationMode === 'synthesis' ? 'SYNTHESIS MODE - PROPOSE PATTERNS' : 'HYBRID MODE - COPY FIRST'}

${generationMode === 'strict' ? `**STRICT MODE RULES**:
❌ NEVER invent code - ONLY copy from actual files with citations (file:line)
❌ NEVER write imports/functions that don't exist (e.g., \`import { validateFHIR } from '@/utils/fhir'\` if not found)
❌ If pattern doesn't exist: Write "[Pattern] - Not found in codebase"
✅ ONLY use code verified in actual files
✅ All code must have source citation
` : generationMode === 'synthesis' ? `**SYNTHESIS MODE RULES**:
✅ Propose patterns based on ${frameworkList} best practices
✅ ALL proposed code MUST have ⚠️ PROPOSED marker
✅ Use actual project name (${projectName}) and dependencies
❌ NEVER claim proposed code exists in codebase
` : `**HYBRID MODE RULES**:
✅ Copy code where patterns exist (cite file:line)
✅ Propose patterns (⚠️ PROPOSED) only if < 3 templates available
✅ Label ALL code: 📋 COPIED or ⚠️ PROPOSED
❌ Never mix copied and proposed in same template
`}

---

## 🎯 CODE GENERATION MODE (Auto-Detected)

**⚠️ DETECTED MODE**: **${generationModeNames[generationMode]}**

**Codebase Maturity Analysis**:
- **File Count**: ${fileCount || 0} code files
- **Commit Count**: ${gitCommitCount || 0} commits
- **Selected Mode**: **${generationMode.toUpperCase()}**

**Mode Selection Criteria**:
- **Strict Mode**: 200+ files AND 100+ commits → Copy ONLY from actual codebase, NO fabricated code
- **Synthesis Mode**: < 50 files OR < 20 commits → Propose patterns clearly labeled "⚠️ PROPOSED"
- **Hybrid Mode**: 50-200 files OR 20-100 commits → Copy where patterns exist, propose with labels

**YOUR INSTRUCTIONS FOR ${generationMode.toUpperCase()} MODE**: See sections below for specific rules.

${generationMode === 'strict' ? `
🚨 **YOU ARE IN STRICT MODE** 🚨
- **ONLY copy code from actual files** - NO fabrication allowed
- **All code must cite source** (file:line)
- **If pattern doesn't exist**: Write "[Pattern] - Not found in codebase"
- **NO ⚠️ PROPOSED markers allowed** - Everything must be from actual code
` : generationMode === 'synthesis' ? `
📝 **YOU ARE IN SYNTHESIS MODE** 📝
- **Propose patterns** based on ${frameworkList} best practices
- **ALL proposed code MUST have ⚠️ PROPOSED marker**
- **Use actual project name**: ${projectName}
- **Clearly label**: "Not found in codebase - proposed"
` : `
🔀 **YOU ARE IN HYBRID MODE** 🔀
- **Copy first**: Use actual code where patterns exist (cite file:line)
- **Propose when needed**: If < 3 templates, supplement with ⚠️ PROPOSED patterns
- **Clear labeling**: 📋 COPIED or ⚠️ PROPOSED for every template
`}

---

## ✅ VERIFIED CODEBASE INVENTORY (Pre-Scanned)

**⚠️ CRITICAL**: This section contains VERIFIED exports/functions/patterns from the actual codebase. ONLY reference items listed here.

### Verified Utilities (${inventory.stats.utilityFiles} files, ${inventory.stats.exportedFunctions} exports)

${
  Array.from(inventory.utilities.entries())
    .slice(0, 20) // Show top 20
    .map(([name, util]) => `- **${name}**: \`${util.path}\`\n  Exports: ${util.exports.join(', ')}`)
    .join('\n') || 'No utility files found'
}
${inventory.utilities.size > 20 ? `\n... and ${inventory.utilities.size - 20} more utility files` : ''}

### Common Patterns (${inventory.patterns.length} patterns found)

${
  inventory.patterns
    .slice(0, 15) // Show top 15
    .map((p) => {
      const base = `- **${p.category}**: ${p.name} (used in ${p.usageCount} files)`;
      if (p.snippet) {
        return `${base}\n  \`\`\`typescript\n  ${p.snippet}\n  \`\`\``;
      }
      return base;
    })
    .join('\n') || 'No common patterns found'
}
${inventory.patterns.length > 15 ? `\n... and ${inventory.patterns.length - 15} more patterns` : ''}

### Anti-Patterns from Git History (${inventory.antiPatterns.length} found)

${
  inventory.antiPatterns
    .slice(0, 10) // Show top 10
    .map((ap) => {
      const file = ap.fileChanged ? ` [${ap.fileChanged}]` : '';
      return `- **${ap.commitHash}**: ${ap.message} (${ap.category})${file}`;
    })
    .join('\n') || 'No anti-patterns found in git history'
}
${inventory.antiPatterns.length > 10 ? `\n... and ${inventory.antiPatterns.length - 10} more anti-patterns` : ''}

**RULE**: ${generationMode === 'strict' ? 'ONLY reference utilities listed above. If a function is not listed, write "[Function] - Not found in codebase"' : 'Reference utilities above when available, propose alternatives if needed (with ⚠️ PROPOSED label)'}

---

## 📏 FILE SIZE MODES (Context-Optimized)

**⚠️ CRITICAL**: Different AI assistants have different context limits. Select size mode based on target assistant.

### Auto-Detected Size Mode for ${aiAssistantName}

**Selected Mode**: **${currentSizeConfig.name}** (${sizeMode})
**Reason**: ${currentSizeConfig.description}

**Target Size**: ${currentSizeConfig.targetLines}, ${currentSizeConfig.targetChars}
**Maximum Size**: ${currentSizeConfig.maxLines} lines, ${currentSizeConfig.maxChars} characters (HARD LIMIT)

---

### Size Mode Comparison

| Mode | For | Limits | Focus |
|------|-----|--------|-------|
| 📦 **Compact** | Copilot, GPT-3.5 | 200-300 lines, 8k-12k chars | Core rules (R1-R8), 2 templates, minimal reference |
| 📊 **Standard** | GPT-4, Gemini | 350-500 lines, 20k-30k chars | Full rules (R1-R12), 3 templates, condensed reference |
| 📚 **Maximum** | Claude Code, Cursor | 500-700 lines, 45k-60k chars | Complete rules (R1-R15), 3-4 templates, full reference |

---

**CURRENT GENERATION**: Using **${currentSizeConfig.name}** mode
**MUST NOT EXCEED**: ${currentSizeConfig.maxLines} lines, ${currentSizeConfig.maxChars} characters

---

🚨 CRITICAL RULE #1: ZERO HALLUCINATION TOLERANCE

NEVER EVER mention any component, class, function, file, endpoint, package, or code artifact that you haven't verified exists in the actual codebase.

FORBIDDEN:
- ❌ Inventing component/class/function names
- ❌ Documenting endpoints that don't exist
- ❌ Claiming packages are used without verifying in manifests
- ❌ Referencing files without verifying they exist

VERIFICATION REQUIRED: Every code reference MUST be verified with actual file reads/searches.

FORMAT: Include file:line for all code references
Example: "Button component (src/components/Button.tsx:10-50)"

IF NOT FOUND: Do NOT document it.

---

# AI Assistant File Generation

You are generating a comprehensive AI assistant instruction file for a ${projectType} project.

## Project Context

**Project Name:** ${projectName}
**Description:** ${projectDescription}
**Industry/Domain:** ${industry}
**Project Type:** ${projectType}
**AI Assistant:** ${aiAssistantName}
**Filename:** ${filename}

### Tech Stack

**Primary Language:** ${primaryLanguage}
**Frameworks:** ${frameworkList}
**All Languages:** ${languages.join(', ')}

**Key Dependencies** (${Object.keys(dependencies).length} total):
${Object.entries(dependencies)
  .slice(0, 15)
  .map(([pkg, ver]) => `- ${pkg}: ${ver}`)
  .join('\n')}

### Project Structure

**Main Directories:**
${mainDirectories.map(dir => `- ${dir}`).join('\n')}

**Entry Point:** ${entryPoint || 'Unknown'}

**File Tree:**
\`\`\`
${fileTree}
\`\`\`

### Available Scripts

${Object.entries(scriptsFromPackageJson)
  .map(([name, cmd]) => `**${name}:** \`${cmd}\``)
  .join('\n')}

### Features Detected

**Database:** ${hasDatabase ? `Yes (${databaseType || 'type unknown'})` : 'No'}
**Testing:** ${hasTests ? 'Yes' : 'No'}
**Docker:** ${hasDocker ? 'Yes' : 'No'}

**Environment Variables Required:**
${hasEnvExample ? envVariables.map(v => `- ${v}`).join('\n') : 'None detected'}

**Key Features** (from codebase analysis):
${keyFeatures.length > 0 ? keyFeatures.map(f => `- ${f}`).join('\n') : 'To be detected from codebase analysis'}

### Architectural Patterns Detected

${stateManagementApproach ? `**State Management:** ${stateManagementApproach}` : ''}
${apiApproach ? `**API Communication:** ${apiApproach}` : ''}
${routingApproach ? `**Routing:** ${routingApproach}` : ''}
${stylingApproach ? `**Styling:** ${stylingApproach}` : ''}
${authenticationApproach ? `**Authentication:** ${authenticationApproach}` : ''}

### Recent Git History (Common Issues)

\`\`\`
${gitRecentCommits}
\`\`\`

${hasComprehensiveDocs ? `### Existing Comprehensive Documentation

**Status:** Comprehensive documentation exists

**Files:**
${existingDocsFiles?.map(f => `- ${f}`).join('\n') || 'Documentation files detected'}

**Architecture Overview:**
\`\`\`
${architectureContent?.substring(0, 1500) || 'See ARCHITECTURE.md'}
...
\`\`\`

**Note:** Reference these files in the "Documentation Reference" section.` : '### Comprehensive Documentation\n\n**Status:** No comprehensive documentation detected. Suggest running documentation generator.'}

---

## 🚨 CRITICAL INSTRUCTION: Mandatory AI-Optimization Sections

**BEFORE YOU BEGIN**: When generating this ${filename} file, you **MUST** include these AI-optimization sections in this **EXACT ORDER** immediately after the project overview:

### Required Sections (Positions 1-7):

1. **AI Meta-Instructions** (Position 1 - HTML comment at line 1)
   - Execution order (5 steps)
   - Critical context (framework, language, architecture, domain)
   - TOP 10 absolute rules (ALWAYS/NEVER format)
   - Domain-specific critical rules (if applicable for ${industry})

2. **File Header & Quick Context** (Position 2 - 20-30 lines max)
   - Project metadata
   - Condensed tech stack overview
   - Platform-specific note for ${aiAssistantName}

3. **ABSOLUTE CODE GENERATION RULES** (Position 3 - R1-R15 minimum)
   - 8-15 numbered rules with explicit severity (NEVER BREAK/ALWAYS FOLLOW/MUST HAVE)
   - Each rule includes concrete examples from codebase
   - All rules use ALWAYS/NEVER/MUST language (not "prefer" or "should")

4. **ANTI-PATTERNS** (Position 4 - 6-10 wrong vs right examples)
   - Complete ❌ WRONG code examples (from git history)
   - Complete ✅ CORRECT code examples (from current codebase)
   - Explanations of why wrong and why correct
   - NO placeholders - all code must be complete

5. **AI VALIDATION CHECKLIST** (Position 5 - 15-20 items, REDUCED to eliminate redundancy)
   - Grouped by category (File Structure, Type Safety, Imports, ${projectType.charAt(0).toUpperCase() + projectType.slice(1)}-Specific, Error Handling, Security)
   - Items REFERENCE rules instead of repeating them (e.g., "File naming follows R1")
   - "IF ANY CHECKBOX UNCHECKED" warning

6. **DECISION TREES** (Position 6 - 2-4 architectural decision flowcharts)
   - START: [Action] → Questions → Paths with actual directory names
   - Reference actual files as examples
   - Complete decision logic (no dead ends)

7. **COMPLETE CODE TEMPLATES** (Position 7 - 3-4 copy-paste ready templates)
   - Each template cites 1+ source files (can cite multiple if pattern spans files)
   - ALL imports included (no "...")
   - FULL implementation (no "// logic here")
   - COMPLETE error handling (try-catch with logging)
   - ALL types/interfaces (5-8 properties)
   - **LENGTH**: Max 120 lines / 3000 characters per template
   - **IMPORTANT**: Limit to 3-4 templates total to keep file length under 800 lines/64k chars

### Critical Requirements:

- ✅ **Completeness**: NO placeholders ("...", "// logic here", "// implementation")
- ✅ **Explicitness**: Use ALWAYS/NEVER/MUST (not "prefer", "consider", "try")
- ✅ **Verification**: All code examples copied from actual files
- ✅ **Order**: Sections 1-7 MUST appear BEFORE detailed documentation/reference material

### What Comes After (Positions 8-26):

After the 7 mandatory AI-optimization sections, include traditional reference material (see sections 8-26 below).

**IF ANY OF SECTIONS 1-7 ARE MISSING OR INCOMPLETE, THE GENERATED FILE IS INVALID.**

**NOTE**: Codebase verification is complete - all data is pre-verified in the VERIFIED CODEBASE INVENTORY section above. Use that data as your source of truth.

---

## Your Task

⚠️ **CRITICAL: DO NOT SKIP ANY SECTIONS**

After completing Phase 1 verification above, you MUST include ALL sections listed below. This is NON-NEGOTIABLE:
- ✅ Include EVERY section, even if information seems limited
- ✅ This file should be 800-1500 lines and comprehensive
- ✅ If a section has limited data, write "Documentation to be added" with context
- ✅ DO NOT skip sections because you think they're "optional" or "not applicable"
- ❌ Partial completion is NOT acceptable
- ❌ Skipping sections will result in INVALID output

**Consequence of skipping**: The entire file will be rejected and must be regenerated.

Generate an **AI-OPTIMIZED** ${filename} file for ${aiAssistantName} to use as primary project context.

**⚠️ CRITICAL: TARGET AUDIENCE**

This file is **FOR AI ASSISTANTS**, not human developers.

**Primary audience**: AI coding assistants (${aiAssistantName})
**Secondary audience**: Human developers (as reference)

**Why this matters**: AI assistants need **structure and explicitness** over prose and explanation. They need:
- Clear execution order (read rules first, then trees, then templates)
- Consolidated rules in ONE place (not scattered across 5 sections)
- Complete code examples (no "..." placeholders to fill in)
- Decision trees (explicit if/then logic)
- Anti-patterns (know what NOT to generate)
- Validation checklists (self-verify before returning code)

### Requirements

**Format:** AI-Optimized Assistant File (v2.0)
**Size Mode:** ${currentSizeConfig.name} (auto-detected for ${aiAssistantName})
**Target Length:** ${currentSizeConfig.targetLines}, ${currentSizeConfig.targetChars}
**Maximum Length:** ${currentSizeConfig.maxLines} lines, ${currentSizeConfig.maxChars} characters (HARD LIMIT)

**⚠️ SIZE LIMITS**: Target ${currentSizeConfig.targetLines}, MAX ${currentSizeConfig.maxLines} lines / ${currentSizeConfig.maxChars} chars

**Tone:** Explicit, precise, actionable (use ALWAYS/NEVER, not "prefer")
**Target:** AI coding assistants (${aiAssistantName})
**Project Type:** ${projectType} - MUST include ${projectType}-specific adaptations
**Optimization Level:** ${sizeMode === 'compact' ? 'Focused' : sizeMode === 'standard' ? 'Balanced' : 'Maximum'} (explicit rules, complete templates, validation)

### CRITICAL: AI-Optimization Principles

1. **Explicit over Implicit**: Use ALWAYS/NEVER/MUST, not "prefer", "consider", "try"
2. **Complete over Partial**: NO "...", "// logic here", "// implementation" - ALL code examples must be complete
3. **Validation-First**: Include checklists for AI self-verification
4. **Decision Guidance**: Provide clear if/then logic for architectural choices
5. **Anti-Pattern Aware**: Show both wrong (❌) and right (✅) examples from actual codebase
6. **Project-Type-Specific**: Apply ${projectType}-specific patterns, not generic advice

### CRITICAL: Section Ordering for AI

**⚠️ AI assistants read top-to-bottom. Put ACTIONABLE content FIRST, reference material LAST.**

**CORRECT ORDER** (AI-optimized):
\`\`\`
1. HTML Meta-Instructions (AI execution order)
2. Quick Context
3. 🚨 ABSOLUTE CODE GENERATION RULES ← AI READS FIRST!
4. 🚫 ANTI-PATTERNS ← AI checks before generating
5. ✅ AI VALIDATION CHECKLIST ← AI self-verifies
6. 🌳 DECISION TREES ← AI uses for architectural choices
7. 📦 COMPLETE CODE TEMPLATES ← AI copies from here
8. 🗺️ TYPE MAPPINGS (if typed language)
9. 📚 IMPORT PATTERNS
10. 🐛 COMMON ERRORS & FIXES (MERGED into Anti-Patterns - see Section 4)
11. 🔧 TOOL-SPECIFIC NOTES
--- REFERENCE MATERIAL BELOW ---
12-26. Project overview, tech stack, architecture, tasks, etc.
\`\`\`

**WRONG ORDER** (traditional docs):
\`\`\`
❌ Project Overview first
❌ Tech Stack second
❌ Critical Rules buried at line 600+
❌ No decision trees or anti-patterns
\`\`\`

**Why**: AI needs rules immediately when generating code, not after reading 500 lines of context.

### File Structure

Create ${filename} with the following **AI-OPTIMIZED** structure:

**⚠️ CONDITIONAL SECTIONS**: Not all projects need all 26 sections. Include sections based on project context:

**CORE SECTIONS (ALWAYS INCLUDE - Sections 1-7, 9, 11)**:
- Sections 1-7: AI-critical (Meta-instructions, Context, Rules, Anti-patterns, Validation, Decision Trees, Templates)
- Section 9: Import Patterns
- Section 11: Tool-Specific Notes

**CONDITIONAL SECTIONS (Include based on project)**:
- **Section 8 (Type Mappings)**: ONLY if ${primaryLanguage === 'typescript' || primaryLanguage === 'java' || primaryLanguage === 'kotlin' || primaryLanguage === 'swift' || primaryLanguage === 'go' ? '✅ INCLUDE - Typed language detected' : '❌ SKIP - Not a typed language'}
- **Section 18 (Auth & Security)**: ${authenticationApproach ? '✅ INCLUDE - Authentication detected' : industry?.match(/health|medical|fhir|hipaa|finance|fintech|bank/i) ? '✅ INCLUDE - Security-sensitive industry' : '⚠️ OPTIONAL - Include if security features detected'}
- **Section 19 (Documentation Reference)**: ${hasComprehensiveDocs ? '✅ INCLUDE - Existing docs found' : '❌ SKIP - No existing comprehensive docs'}
- **Section 23 (Critical Rules Reference)**: ❌ SKIP in ${sizeMode} mode - Redundant with Section 3
- **Section 24 (Learning Resources)**: ${sizeMode === 'compact' ? '❌ SKIP - Compact mode' : '✅ INCLUDE - Standard/Max mode'}

**REFERENCE SECTIONS (ALWAYS INCLUDE - Sections 12-17, 20-22, 25-26)**:
- Project metadata, tech stack, structure, patterns, tasks, stats, success criteria

**SIZE MODE ADJUSTMENTS**:
${sizeMode === 'compact' ? '- **Compact Mode**: Include Sections 1-7, 12-17, 20-22, 25-26 only (skip 8-11, 18-19, 23-24)' :
  sizeMode === 'standard' ? '- **Standard Mode**: Include all applicable sections, condense 12-26' :
  '- **Max Mode**: Include all applicable sections with full detail'}

---

## 🚨 SECTION 1: AI META-INSTRUCTIONS (Position 1, HTML comment at top of file)

**Template** (place immediately after title, before project metadata):

\`\`\`html
# ${aiAssistantName} Instructions for ${projectName}

<!--
🤖 AI ASSISTANT: READ THIS FIRST

EXECUTION ORDER:
1. Read "ABSOLUTE CODE GENERATION RULES" (section 3)
2. Check "DECISION TREES" (section 6) for architectural choices
3. Use "COMPLETE CODE TEMPLATES" (section 7) for boilerplate
4. Validate ALL output against "AI VALIDATION CHECKLIST" (section 5)
5. Check "ANTI-PATTERNS" (section 4) before returning code

CRITICAL CONTEXT:
- Framework: [framework name and version, e.g., "React 18.2"]
- Language: [primary language, e.g., "TypeScript 5.1 (strict mode)"]
- Key Technologies: [2-3 most important dependencies, e.g., "Redux Toolkit, React Query, TailwindCSS"]
- Architecture Pattern: [e.g., "Component-based (presentational/container)", "MVC", "Microservices"]
- Industry/Domain: [if applicable, e.g., "Healthcare (HIPAA-regulated)", "Fintech (PCI-DSS)"]

ABSOLUTE RULES (TOP 10):
1. [Most critical rule, e.g., "ALWAYS sanitize user input before database queries"]
2. [Second most critical, e.g., "NEVER commit secrets to version control"]
3. [Third most critical, e.g., "ALWAYS use TypeScript strict mode"]
4. [Fourth rule]
5. [Fifth rule]
6. [Sixth rule]
7. [Seventh rule]
8. [Eighth rule]
9. [Ninth rule]
10. [Tenth rule]

DOMAIN-SPECIFIC CRITICAL RULES (if applicable):
${industry?.match(/health|medical|fhir|hipaa/i) ? `- HIPAA: Never log PHI (protected health information)
- FHIR R4 compliance required for all health resources
- Use FHIR resource mappers (src/common/mappers/)
- All external EHR API calls require retry logic with exponential backoff
- Patient identifiers must be hashed before logging` : ''}${industry?.match(/financ|trading|bank|payment/i) ? `- Financial: Use Decimal types for currency (NEVER float/double)
- All transactions must be idempotent (safe to retry)
- Audit logging required for all financial operations
- PCI-DSS compliance for payment card data
- Never expose full account numbers in logs or UI` : ''}${industry?.match(/ecommerce|commerce|retail|shop/i) ? `- E-commerce: Inventory checks required before order confirmation
- Cart operations use optimistic UI updates
- PCI compliance for payment handling
- All price calculations server-side (never trust client)
- Order idempotency tokens required` : ''}${industry?.match(/real-?time|iot|streaming|websocket/i) ? `- Real-time: Connection reconnection logic mandatory
- Message ordering guarantees documented
- Backpressure handling for high-frequency events
- Graceful degradation when real-time unavailable
- Event timestamps in UTC` : ''}${industry?.match(/accessibility|wcag|a11y/i) ? `- Accessibility: WCAG 2.1 AA compliance required
- All interactive elements keyboard accessible
- ARIA labels for screen readers
- Color contrast ratios verified (4.5:1 minimum)
- Focus management for modals/dialogs` : ''}
-->
\`\`\`

**Instructions**: Extract TOP 10 ALWAYS/NEVER rules from git history (fix/bug commits), config files (strict mode, linting), framework requirements, security patterns, and ${industry}-specific needs. Include domain rules for healthcare/finance/e-commerce/real-time/accessibility projects.

---

## SECTION 2: File Header & Quick Context (Position 2 - BRIEF 20-30 lines)

**Header:**
- Project name: ${projectName}
- Description: ${projectDescription}
- Project Type: ${projectType.charAt(0).toUpperCase() + projectType.slice(1)} Application
- Framework: ${frameworkList}
- Industry/Domain: ${industry}
- AI Assistant: ${aiAssistantName}
- Last Updated: [Current date YYYY-MM-DD]
- Platform-specific note for ${aiAssistantName}

**Quick Context Section:**
- **Tech Stack**: Framework v[version], Language v[version], 4-6 key dependencies
- **Architecture Patterns**: 4-6 key patterns with brief descriptions
- **Key Paths**: 4-6 critical directories
- **Critical Files**: 3-5 most important files with descriptions

**⚠️ Keep this BRIEF (20-30 lines max)**. Full details appear in reference sections below (sections 12-26).

---

## SECTIONS 3-11: AI-OPTIMIZATION SECTIONS (MANDATORY - IMMEDIATELY AFTER QUICK CONTEXT)

**⚠️ CRITICAL**: These sections MUST appear here (positions 3-11), BEFORE all traditional reference material.

---

### SECTION 3: 🚨 ABSOLUTE CODE GENERATION RULES (Position 3)

**Format**: Numbered rules (R1-R15) with severity: **(NEVER BREAK)** / **(ALWAYS FOLLOW)** / **(MUST HAVE)**

Create 8-15 rules: File Structure, Type Safety, Imports, Framework Pattern, Security, Error Handling, Validation, Testing, Performance, ${projectType}-specific critical patterns${industry?.match(/health|medical|fhir|hipaa|finance|fintech|bank/i) ? ', Domain-specific security' : ''}

---

### SECTION 4: 🚫 ANTI-PATTERNS (NEVER GENERATE THIS CODE) (Position 4)

**⚠️ DOMAIN-SPECIFIC ANTI-PATTERNS REQUIRED**

AI: If you're about to generate code matching these patterns, STOP and revise.

**⚠️ MODE-AWARE GENERATION**:
- **Strict Mode**: Only include anti-patterns from git history with commit citations (minimum 3)
- **Synthesis Mode**: Propose framework-specific anti-patterns based on ${frameworkList} conventions (clearly labeled as "⚠️ PROPOSED ANTI-PATTERN")
- **Hybrid Mode** (DEFAULT): Git history first (1+), supplement with proposed patterns if < 5 total

Create 5-10 anti-patterns with:
- ❌ WRONG: [Complete bad code - from git history OR proposed based on framework]
- ✅ CORRECT: [Complete good code - from codebase OR proposed best practice]
- **Source**: [Commit hash] OR **⚠️ PROPOSED** based on ${frameworkList} conventions
- **Why wrong**: [Explanation]
- **Why correct**: [Explanation]

**${projectType.charAt(0).toUpperCase() + projectType.slice(1)}-specific anti-patterns**:
${projectType === 'frontend' ? `
1. Client-side data fetching when SSR/SSG required
2. Missing CSS modules (inline styles)
3. Missing accessibility attributes
4. Unsafe data access (no optional chaining)
5. Hardcoded text (missing i18n)
6. Any types (TypeScript)
` : projectType === 'backend' ? `
1. Business logic in controller (violates separation) - CRITICAL
2. Unprotected endpoints (missing auth)
3. DTO without validation (security risk)
4. Raw SQL queries (SQL injection risk)
5. Exposing internal errors to clients
6. Schema changes without migrations
${industry?.match(/health|medical|fhir|hipaa/i) ? `7. Logging PHI (protected health information) - HEALTHCARE CRITICAL
8. Inline FHIR transformations (not using mappers) - HEALTHCARE CRITICAL` : ''}
` : projectType === 'mobile' ? `
1. Inline styles (not using StyleSheet.create)
2. Missing permission checks before platform API access
3. Synchronous AsyncStorage access (should be async)
4. Missing null checks for native modules
5. Hardcoded dimensions (not responsive)
6. Missing platform-specific code guards (Platform.OS)
` : `
1. Hardcoded values instead of variables
2. Missing tags/labels
3. No resource naming standards
4. Missing outputs
5. Inline secrets (should use secrets manager)
`}

**All projects include**:
- Missing error handling
- Any types (TypeScript)
- Hardcoded secrets/API keys

---

### SECTION 5: ✅ AI CODE VALIDATION CHECKLIST (Position 5)

**⚠️ CRITICAL: AI SELF-VERIFICATION**

**Purpose**: For AI to verify its own generated code BEFORE returning to user.

**AI Instruction**: Before returning ANY generated code:
1. Run through this ENTIRE checklist
2. Verify EVERY item is checked ✅
3. If ANY item unchecked ❌, DO NOT return code
4. Instead: Request clarification

Create 20-30 checklist items grouped by:
- File Structure (4-5 items)
- Type Safety (3-4 items if applicable)
- Imports (2-3 items) - MUST include: "No fabricated imports (all imports verified to exist)"
- ${projectType}-Specific (10-15 items - CRITICAL)
- Error Handling (3-4 items)
- Security (3-4 items)
- Code Source (2-3 items) - ${generationMode === 'strict' ? 'MUST include: "All code copied from actual files (no fabricated examples)"' : 'MUST include: "All proposed code labeled with ⚠️ PROPOSED marker"'}

**🔴 CRITICAL VALIDATION - ZERO FABRICATED CODE**:
${generationMode === 'strict' ? `
You are in STRICT MODE. Before returning the file:
- [ ] Search your generated content for ANY import statements
- [ ] For EACH import, verify you can cite the actual file where it exists
- [ ] If you wrote ANY import you cannot cite → DELETE IT and write "Import not found in codebase"
- [ ] Check for utility function calls (hashIdentifier, validateFHIR, etc.) - can you cite where they exist?
- [ ] If NO → DELETE THEM and write "[Function] - Not found in codebase"
` : ''}

**IF ANY CHECKBOX UNCHECKED: Request clarification instead of generating incomplete code.**

---

### SECTION 6: 🌳 DECISION TREES (Position 6)

**⚠️ PROJECT-TYPE-SPECIFIC TREES REQUIRED**

Create 2-4 decision trees with:
- START: [Action user wants to take]
- Use actual directory paths from file tree
- Reference actual files as examples
- Show complete decision logic (no dead ends)

**${projectType.charAt(0).toUpperCase() + projectType.slice(1)} projects need**:
${projectType === 'frontend' ? `
1. Component placement (which directory?)
2. Data fetching strategy (SSR/SSG/CSR?)
3. State management location (local/context/global?)
4. Styling approach (module/component/utility?)
` : projectType === 'backend' ? `
1. Module organization (new module or add to existing?)
2. Logic placement (controller vs service vs repository?) - CRITICAL
3. Guard selection (which guard for which endpoint type?)
4. Database query strategy (find vs query builder vs transaction?)
${industry?.match(/health|medical|fhir|hipaa/i) ? '5. FHIR mapper pattern (use existing or create new?) - HEALTHCARE CRITICAL' : ''}
` : projectType === 'mobile' ? `
1. Screen vs component placement (screens/ vs components/ vs navigation/)
2. State management location (local state vs Redux vs Context?)
3. Platform-specific code (Platform.select vs separate files?)
4. Storage strategy (AsyncStorage vs MMKV vs SQLite?)
5. Navigation structure (stack vs tab vs drawer?)
` : `
1. Resource vs module decision
2. Variable location (local vs remote state?)
3. Configuration management (ConfigMap vs Secret?)
4. When to create new namespace
`}

---

### SECTION 7: 📦 COMPLETE CODE TEMPLATES (Position 7)

**⚠️ CRITICAL: LENGTH AND COMPLETENESS BALANCE**

**⚠️ MODE-AWARE GENERATION**:
- **Strict Mode**: Only copy templates from actual files (3-4 templates, all with file:line citations)
- **Synthesis Mode**: Generate proposed templates based on ${frameworkList} conventions (3-4 templates, clearly labeled "⚠️ PROPOSED TEMPLATE")
- **Hybrid Mode** (DEFAULT): Copy templates where patterns exist (1+), synthesize additional templates to reach 3-4 total (clearly labeled)

**🚨 STRICT LENGTH REQUIREMENTS 🚨**
- **MAXIMUM 120 lines per template** (increased from 80 to allow complete examples)
- **MAXIMUM 3000 characters per template/code sample** (ABSOLUTE HARD LIMIT - enforced with automated counter)

**⚠️ CRITICAL**: Count EVERY character including whitespace, comments, newlines. If you generate a template over 3000 characters, it WILL be rejected.

**Template Source Labeling** (MANDATORY):
- **Copied**: Start with \`// 📋 Source: src/path/to/file.ts:10-80\`
- **Proposed**: Start with \`// ⚠️ PROPOSED TEMPLATE - Based on ${frameworkList} conventions\`

Templates must be:
- ✅ **COMPLETE**: No placeholders (\`...\`, \`// logic here\`, \`// implementation\`)
- ✅ **CONCISE**: Focus on COMMON use case, not edge cases
- ✅ **ESSENTIAL**: Core functionality only, not every possible feature
- ✅ **MINIMAL COMMENTS**: Only essential comments, not comprehensive documentation

**WHAT TO INCLUDE** (Essential):
- ✅ ALL imports (real imports, not "// import statements")
- ✅ PRIMARY functionality (the most common use case)
- ✅ COMPLETE error handling (try-catch with proper logging)
- ✅ ALL types/interfaces (TypeScript projects - no any types)
- ✅ Core implementation (complete main logic flow)
- ✅ Essential validation (input validation at boundaries)

**Keep under 120 lines / 3000 chars**: Exclude edge cases, multiple variations, extensive docs, complex nested logic. Show 5-8 key props for common use case only.

Create 3-4 complete templates for most common file types (LIMIT to 3-4 to control file length):
${projectType === 'frontend' ? '(Component, Custom Hook OR Context Provider, API Service, Form - optional)' :
  projectType === 'backend' ? '(Controller/Route, Service Class, Database Model, Validator - combine with controller if possible)' :
  projectType === 'mobile' ? '(Screen Component with Navigation, Custom Hook OR Context Provider, Native Module Bridge - if applicable, API Service)' :
  '(Terraform Module, Kubernetes Deployment OR Helm Chart, CI/CD Pipeline, Monitoring Config - optional)'}

Each template MUST:
- **SOURCE LABELING** (CRITICAL):
  - **Strict/Hybrid (copied)**: \`// 📋 Source: src/path/to/file.ts:10-80\` at top of code block
  - **Synthesis/Hybrid (proposed)**: \`// ⚠️ PROPOSED TEMPLATE - Based on ${frameworkList} conventions\` at top
- **LENGTH**: 120 lines MAXIMUM (allows complete examples with proper structure)
- **CHARACTER COUNT**: 3000 characters ABSOLUTE MAXIMUM (count ALL characters including whitespace, comments, newlines)
- **VERIFICATION**: Before including template, COUNT characters - if over 3000, CUT IT DOWN
- Include ALL imports (no "..." placeholders)
- Include COMPLETE implementation (core flow + error handling)
- Include COMPLETE error handling (try-catch with proper logging)
- Include ALL essential types/interfaces (5-8 properties)
- Show 5-8 key props/parameters (the most commonly used ones)
- **FOCUSED COMMENTS**: Brief inline comments for clarity, no extensive JSDoc
- Be immediately copy-paste usable for COMMON scenarios
- **For Proposed Templates**: Use actual project name (${projectName}), actual dependencies from package.json, actual directory structure

---

### SECTION 8: 🗺️ TYPE MAPPINGS (Position 8 - CONDITIONAL)

**⚠️ CONDITIONAL SECTION**: ${primaryLanguage === 'typescript' || primaryLanguage === 'java' || primaryLanguage === 'kotlin' || primaryLanguage === 'swift' || primaryLanguage === 'go' || industry?.match(/health|medical|fhir|hipaa/i) ? '✅ INCLUDE this section' : '❌ SKIP this section entirely - Not a typed language'}

**INCLUDE this section if**:
- Typed language (TypeScript, Java, Kotlin, Swift, Go, Rust, C#)
- GraphQL/gRPC projects (schema mappings needed)
- Healthcare/FHIR projects (FHIR R4 → TypeScript mappings)
- Complex external API integrations

**SKIP this section if**:
- JavaScript-only projects (no TypeScript)
- Python projects (unless Pydantic)
- Ruby projects
- Compact mode AND no critical type mappings

**CRITICAL for** (MUST include if present):
${industry?.match(/health|medical|fhir|hipaa/i) ? `- Healthcare/FHIR projects (FHIR R4 → TypeScript) - REQUIRED!` : ''}
- GraphQL projects (schema → TypeScript)
- gRPC/Protocol Buffers
- Financial/trading systems

${industry?.match(/health|medical|fhir|hipaa/i) ? `
**Healthcare/FHIR Type Mappings** (MANDATORY):
- FHIR R4 Types → TypeScript type table
- HumanName, Identifier, CodeableConcept, Reference mappings
- Complete FHIR mapper example with toFHIR/fromFHIR methods
` : ''}

---

### SECTION 9: 📚 IMPORT PATTERNS (Position 9)

Create 5-8 complete import examples:
- Copy EXACT import blocks from actual files
- Common scenarios for ${projectType}
- NO partial examples - show ALL imports
- Cite source files

---

### SECTION 10: 🐛 COMMON ERRORS & FIXES (MERGED into Anti-Patterns)

**⚠️ NOTE**: This section has been MERGED into ANTI-PATTERNS (Section 4) to eliminate redundancy.

**Instructions**: Git history errors should be included in Section 4 as anti-patterns with commit citations:
- Extract from: \`git log --grep="fix|bug|error" -30\`
- Each anti-pattern should cite commit hash where fix occurred: "Fixed in commit: abc1234"
- Error message (if available)
- Cause (from commit message/code)
- ❌ WRONG code (what caused error)
- ✅ CORRECT code (the fix)

**This eliminates 200-300 lines of redundant content** while maintaining all critical information in a single, consolidated location (Anti-Patterns section).

---

### SECTION 11: 🔧 TOOL-SPECIFIC NOTES (Position 11)

**For ${aiAssistantName}**:
[Platform-specific notes]

**For All AI Assistants**:
- ALWAYS read "ABSOLUTE CODE GENERATION RULES" first
- ALWAYS validate against "CODE VALIDATION CHECKLIST"
- ALWAYS check "ANTI-PATTERNS" before returning code
- When uncertain, ask for clarification

---

<!-- ==================== REFERENCE MATERIAL BELOW ==================== -->
<!-- AI: Sections above are AI-CRITICAL (rules, patterns, templates). -->
<!-- Sections below are REFERENCE MATERIAL for context and understanding. -->

---

## SECTIONS 12-26: REFERENCE MATERIAL (Traditional Content)

**⚠️ These sections appear AFTER all AI-critical content**

---

### SECTION 12: 🎯 Project Overview

**Core Value Proposition**: [2-3 sentence description]

**Key Features**:
- [Feature 1 - verified from codebase]
- [Feature 2]
- [Feature 3]
- [Feature 4]
- [Feature 5]

**Target Users**: [Describe end users]

**Project Scale**:
- [X] [file types] ([verified count])
- [X] dependencies
- [X] test files
- Team size: [If determinable]

---

### SECTION 13: 🏗️ Technology Stack

### Core Technologies

**${primaryLanguage}** v[version] ([strict/standard] mode)
- [Key compiler/runtime details]

**${frameworkList}** v[version]
- [Why this framework]
- [Key framework approaches]

### [Category 1 - Frontend/Data Layer/Infrastructure]

| Tool/Library | Version | Purpose |
|--------------|---------|---------|
| [Tool 1] | [version] | [Purpose] |
| [Tool 2] | [version] | [Purpose] |

### Development Tools

- **Testing**: [Framework(s)] ([version])
- **Linting**: [Tool(s)] ([version])
- **Build**: [Tool(s)] ([version])

---

### SECTION 14: 📁 Project Structure

\`\`\`
[project-root]/
├── [directory1]/          # [Description] ([X] files)
│   ├── [subdirectory]/    # [Description]
│   └── [subdirectory]/    # [Description]
├── [directory2]/          # [Description] ([X] files)
├── [config-file1]         # [Purpose]
└── [config-file2]         # [Purpose]
\`\`\`

### Key Directories

**[directory1]/**: [Detailed description]
- [Subdirectory 1]: [Purpose and contents]
- [Subdirectory 2]: [Purpose and contents]

**[directory2]/**: [Detailed description]
- [Pattern]: [Purpose]

---

### SECTION 15: 🔑 Critical Architectural Patterns

### [Pattern Category 1]

**Approach**: [How it's implemented]
**Location**: [File path]
**Configuration**:
\`\`\`${primaryLanguage.toLowerCase()}
// EXACT code copied from file
[Actual configuration code]
\`\`\`

**Key Points**:
- [Implementation detail 1]
- [Implementation detail 2]

[Repeat for 3-4 key patterns]

---

### SECTION 16: ⚠️ Common Issues & Solutions

*(Extracted from git history)*

### Issue 1: [Issue Name] ([X]% of fix commits)

**Symptom**: [What developer experiences]
**Cause**: [Why it happens]
**Solution**:
\`\`\`${primaryLanguage.toLowerCase()}
// Solution code from fix
[Code example]
\`\`\`
**Examples**: Commits [hash1], [hash2]

[Repeat for 3-5 issues]

---

### SECTION 17: 💡 ${projectType.charAt(0).toUpperCase() + projectType.slice(1)}-Specific Patterns

${projectType === 'frontend' ? `
**Component Patterns**:
- [Organization approach]
- [Naming conventions]
- [Key reusable components]

**Styling Patterns**:
- [CSS approach]
- [Theme configuration]

**Data Fetching Patterns**:
- [Query/mutation approach]
- [Loading/error states]
` : projectType === 'backend' ? `
**API Endpoint Patterns**:
- [Endpoint organization]
- [Request/response patterns]

**Database Patterns**:
- [ORM/query patterns]
- [Migration strategy]

**Middleware Patterns**:
- [Middleware chain]
- [Error handling]
` : `
**Infrastructure Patterns**:
- [Resource organization]
- [Module usage]

**Deployment Patterns**:
- [CI/CD approach]
- [Environment strategy]

**Monitoring Patterns**:
- [Observability setup]
- [Alert configuration]
`}

---

### SECTION 18: 🔐 Authentication & Security (CONDITIONAL)

${authenticationApproach ? '✅ INCLUDE' : industry?.match(/health|medical|fhir|hipaa|finance|fintech|bank/i) ? '✅ INCLUDE (security-sensitive)' : '⚠️ OPTIONAL'}

${authenticationApproach || industry?.match(/health|medical|fhir|hipaa|finance|fintech|bank/i) ? `**Auth Provider**: [Name] v[version] | **Flow**: [Login → Token storage → Refresh → Logout] | **Protection**: [Code from actual implementation] | **Best Practices**: [3-5 practices]` : ''}

---

### SECTION 19: 📚 Documentation Reference (CONDITIONAL)

${hasComprehensiveDocs ? `✅ INCLUDE | **Docs**: ${existingDocsFiles?.map(f => f).join(', ') || '[Files]'}` : `❌ SKIP (generate with \`lean-intel docs\`)`}

---

### SECTION 20: ✅ Development Best Practices

### ${projectType === 'frontend' ? 'Component Development' : projectType === 'backend' ? 'API Development' : 'Infrastructure Management'}

**DO** ✅:
- [Specific practice from codebase]
- [Naming/organization convention]
- [Security or performance practice]
- [Testing practice]

**DON'T** ❌:
- [Anti-pattern from git history]
- [Common mistake]
- [Performance issue to avoid]
- [Security issue to avoid]

### Code Quality

**DO** ✅:
- Write meaningful variable/function names
- Add comments for complex logic
- Follow ${primaryLanguage} best practices
- Keep files under [X] lines
- Extract reusable logic

**DON'T** ❌:
- Disable linting rules without reason
- Leave console.logs/debug statements
- Skip error handling
- Create god classes/functions

---

### SECTION 21: 🚀 Common Development Tasks

### Task 1: ${projectType === 'frontend' ? 'Adding a Component' : projectType === 'backend' ? 'Adding API Endpoint' : 'Adding Infrastructure Resource'}

1. [Step 1 with actual commands]
2. [Step 2 with actual file paths]
3. [Step 3 with actual code patterns]
4. [Step 4 - testing]
5. [Step 5 - verification]

**Example**: [Code example from codebase]

[Repeat for 3-4 common tasks]

### Task: Debugging Issues

1. Check [relevant logs/console/errors]
2. Use [debugging tool for project type]
3. Check [configuration files]
4. Verify [dependencies/environment]
5. Add [logging/breakpoints]

---

### SECTION 22: 🔍 Code Search Tips

\`\`\`bash
# Find ${projectType}-specific files
find [directory] -name "[pattern]"

# Search for common patterns
grep -r "[pattern]" [directory]/

# Search git history
git log --grep="keyword" --oneline
git log -S"code snippet" --oneline

# Find imports/usage
grep -r "import.*Name" [directory]/
\`\`\`

---

### SECTION 23: 🛡️ Critical Rules (REFERENCE) - ${sizeMode === 'max' ? 'OPTIONAL' : 'SKIP'}

**⚠️ CONDITIONAL SECTION**: ${sizeMode === 'max' ? '⚠️ OPTIONAL - Max mode only, redundant with Section 3' : '❌ SKIP - Redundant with Section 3'}

**SKIP this section** - All critical rules are already in Section 3 (ABSOLUTE CODE GENERATION RULES). This section is redundant.

**For ${sizeMode} mode**: ❌ Omit this section entirely to reduce file size.

${sizeMode === 'max' ? `
**If you must include (max mode only)**:

**⚠️ NOTE**: All critical rules are CONSOLIDATED in "🚨 ABSOLUTE CODE GENERATION RULES" section (position #3). This section provides quick reference with links.

### Security → See R5: Security (NEVER BREAK)
- Input validation
- SQL injection prevention
- Secrets management
- Logging restrictions

### Performance → See R4, R6, R9, R10-R15
- Data fetching patterns
- Error handling efficiency
- Resource management

**For complete details, refer to section #3 above.**
` : ''}

---

### SECTION 24: 🎓 Learning Resources (CONDITIONAL)

**⚠️ CONDITIONAL SECTION**: ${sizeMode === 'compact' ? '❌ SKIP - Compact mode' : '✅ INCLUDE - Standard/Max mode'}

**INCLUDE this section if**: Standard or Max mode
**SKIP this section if**: Compact mode (prioritize core content)

${sizeMode !== 'compact' ? `
### Reading Order for New Developers

1. This file (${filename}) - Project context
2. [ARCHITECTURE.md] - Technical architecture (if exists)
3. [Setup doc] - Development environment
4. [Technical docs] - Core implementations
5. [Domain docs] - Feature details

### Task-Specific Documentation

- [Task type 1] → [Relevant docs]
- [Task type 2] → [Relevant docs]

### External Resources

- [Framework documentation]
- [Key library documentation]
` : ''}

---

### SECTION 25: 📊 Quick Stats

- Dependencies: ${Object.keys(dependencies).length} total
- Tests: ${testFiles?.length || 0} files
- Last major refactor: [Date/commit]

---

### SECTION 26: 🎯 Success Criteria for Code Changes

Before submitting any code changes, ensure:

- [ ] Code compiles/builds without errors
- [ ] All existing tests pass
- [ ] New tests added for new functionality
- [ ] Linting passes with no errors
- [ ] Code follows patterns from this documentation
- [ ] Security best practices followed
- [ ] Performance is acceptable
- [ ] Error handling implemented
- [ ] ${projectType}-specific criteria met
- [ ] Documentation updated (if significant changes)
- [ ] Changes reviewed (self-review or peer review)

---

**This file is maintained for ${aiAssistantName} and other AI coding assistants. All information is verified against the actual codebase. Last updated: [Date]**

---

## 📝 Document Generation Notes

This ${filename} file has been optimized for AI assistant code generation with:
- ✅ AI Meta-Instructions (HTML comment at top)
- ✅ Quick Context (condensed overview - position #2)
- ✅ ABSOLUTE CODE GENERATION RULES (position #3)
- ✅ ANTI-PATTERNS section (position #4)
- ✅ AI VALIDATION CHECKLIST (position #5)
- ✅ DECISION TREES (position #6)
- ✅ COMPLETE CODE TEMPLATES (position #7)
- ✅ TYPE MAPPINGS (position #8 - if applicable)
- ✅ IMPORT PATTERNS (position #9)
- ✅ COMMON ERRORS & FIXES (position #10 - MERGED into Anti-Patterns #4)
- ✅ TOOL-SPECIFIC NOTES (position #11)

**AI assistants should read sections 1-7 before generating any code.**

**Verification Status**:
- All code examples are complete (no placeholders)
- All rules use explicit language (ALWAYS/NEVER/MUST)
- All templates are copy-paste ready
- Copied code: All file paths verified to exist
- Proposed code: Clearly labeled with ⚠️ PROPOSED markers
- All versions verified from config files
- Project-type-specific adaptations applied (${projectType.charAt(0).toUpperCase() + projectType.slice(1)})
- **Generation Mode**: [Strict / Synthesis / Hybrid] based on codebase maturity

**Size Mode**: ${currentSizeConfig.name} (target: ${currentSizeConfig.targetLines}, ${currentSizeConfig.targetChars} | max: ${currentSizeConfig.maxLines} lines, ${currentSizeConfig.maxChars} chars)
**Optimization Level**: ${sizeMode === 'compact' ? 'Focused' : sizeMode === 'standard' ? 'Balanced' : 'Maximum'} (AI-Optimized v2.0)
**Accuracy Grade**: A++ (copied code 100% codebase-verified, proposed code clearly labeled)
**Last Updated**: [Current date YYYY-MM-DD]

---

## 🔍 FINAL PRE-OUTPUT VERIFICATION

**BEFORE RETURNING THE GENERATED FILE, VERIFY:**

### Template Length Check (CRITICAL - COUNT BEFORE INCLUDING)
- [ ] **Template 1**: Count lines - is it 120 lines or less? ✅/❌ (HARD MAX: 120)
- [ ] **Template 1**: Count characters - is it 3000 characters or less? ✅/❌ (HARD MAX: 3000)
- [ ] **Template 2**: Count lines - is it 120 lines or less? ✅/❌ (HARD MAX: 120)
- [ ] **Template 2**: Count characters - is it 3000 characters or less? ✅/❌ (HARD MAX: 3000)
- [ ] **Template 3**: Count lines - is it 120 lines or less? ✅/❌ (HARD MAX: 120)
- [ ] **Template 3**: Count characters - is it 3000 characters or less? ✅/❌ (HARD MAX: 3000)
- [ ] **Template 4** (if exists): Count lines - is it 120 lines or less? ✅/❌ (HARD MAX: 120)
- [ ] **Template 4** (if exists): Count characters - is it 3000 characters or less? ✅/❌ (HARD MAX: 3000)

**⚠️ CRITICAL**: Use a character counter tool or \`wc -c\` to verify BEFORE including template in output.

**IF ANY TEMPLATE > 120 LINES OR > 3000 CHARACTERS:** Immediately trim it by:
1. **Remove extensive JSDoc blocks** (keep brief comments only)
2. **Remove edge case handling** - focus on core flow + basic error handling
3. **Reduce props/parameters if excessive** (keep 5-8 essential ones, not 15+)
4. **Simplify complex nested logic** (maintain completeness but reduce complexity)
5. **Remove redundant documentation** - code should be self-documenting with brief comments
6. **Keep only ONE common variation** - no alternative patterns
7. **Optimize whitespace** - remove excessive blank lines while maintaining readability

### File Length Check (Size Mode: ${currentSizeConfig.name})
- [ ] Total line count: Is it ≤ ${currentSizeConfig.maxLines} lines? ✅/❌ (HARD MAX for ${sizeMode} mode)
- [ ] Total character count: Is it ≤ ${currentSizeConfig.maxChars} chars? ✅/❌ (HARD MAX for ${sizeMode} mode)
- [ ] Target range met: ${currentSizeConfig.targetLines}, ${currentSizeConfig.targetChars}? ✅/❌

**IF FILE > ${currentSizeConfig.maxLines} LINES OR > ${currentSizeConfig.maxChars} CHARS:**
${sizeMode === 'compact' ? `- IMMEDIATELY remove Sections 8-11 (keep only 1-7)
- Reduce reference sections (12-26) to 50 lines total
- Reduce Section 3 to R1-R8 (core rules only)
- Reduce Section 4 to 3-4 anti-patterns
- Reduce Section 7 to 2 templates max` : sizeMode === 'standard' ? `- Trim reference sections (12-26) by 40-50%
- Reduce Section 3 to R1-R12
- Reduce Section 4 to 5-7 anti-patterns
- Keep 3 templates max in Section 7
- Condense Sections 8-11 to 80 lines total` : `- Trim reference sections (12-26) by 20-30%
- Keep all sections but reduce examples
- Verify all templates are ≤ 120 lines / 3000 chars`}

### Completeness Check
- [ ] All 7 AI-optimization sections (1-7) present? ✅/❌
- [ ] **Mode Selection Verification**: Codebase file count and commit count checked? ✅/❌
- [ ] **Source Labeling**: All templates labeled as 📋 COPIED or ⚠️ PROPOSED? ✅/❌
- [ ] No placeholders ("...", "// logic here")? ✅/❌
- [ ] All templates have complete imports, types, and error handling? ✅/❌
- [ ] **Strict Mode Only**: All templates cite actual source files? ✅/❌/N/A
- [ ] **Synthesis/Hybrid Mode**: Proposed templates use actual project name and dependencies? ✅/❌/N/A

### Conditional Sections Check (CRITICAL)
- [ ] **Section 8 (Type Mappings)**: ${primaryLanguage === 'typescript' || primaryLanguage === 'java' || primaryLanguage === 'kotlin' || primaryLanguage === 'swift' || primaryLanguage === 'go' ? 'Included?' : 'Skipped?'} ✅/❌
- [ ] **Section 18 (Auth & Security)**: ${authenticationApproach || industry?.match(/health|medical|fhir|hipaa|finance|fintech|bank/i) ? 'Included?' : 'Skipped if no auth detected?'} ✅/❌
- [ ] **Section 19 (Documentation Reference)**: ${hasComprehensiveDocs ? 'Included?' : 'Skipped?'} ✅/❌
- [ ] **Section 23 (Critical Rules Reference)**: Skipped (redundant)? ✅/❌
- [ ] **Section 24 (Learning Resources)**: ${sizeMode === 'compact' ? 'Skipped?' : 'Included?'} ✅/❌

### Placeholder Replacement Check
- [ ] All [Current date YYYY-MM-DD] replaced with actual date? ✅/❌
- [ ] All [Date] replaced with actual date? ✅/❌

**⚠️ CRITICAL**: Do NOT return file with unreplaced placeholders like [Date]

**ONLY PROCEED TO OUTPUT IF ALL CHECKS PASS ✅**

---

## Output Format

**IMPORTANT:** Return ONLY the markdown content for ${filename}. No JSON wrapper, no outer code blocks.

Start directly with:

\`\`\`markdown
# ${aiAssistantName} Instructions for ${projectName}

<!--
AI READING THIS: [Meta-instructions]
-->

**Project**: ${projectName}
**Description**: ${projectDescription}
[... rest of content following structure above ...]
\`\`\`

---

## Critical Generation Rules

### DO ✅ - AI-Optimization Requirements

1. **MODE SELECTION:** Check file count and commit count, select Strict/Synthesis/Hybrid mode
2. **SOURCE LABELING:** Label all templates as 📋 COPIED or ⚠️ PROPOSED
3. **EXPLICIT LANGUAGE:** Use ALWAYS/NEVER/MUST - NEVER "prefer", "consider", "try"
4. **COMPLETE EXAMPLES:** All code complete - NO "...", "// logic here"
5. **VALIDATION MECHANISMS:** Include all 9 optimization sections (3-11) - MANDATORY
6. **DECISION GUIDANCE:** Clear if/then decision trees with actual directory names
7. **ANTI-PATTERN FOCUS:** Git history (Strict/Hybrid) OR framework best practices (Synthesis) - clearly labeled
8. **PROJECT-TYPE ADAPTATION:** Apply ${projectType}-specific rules
9. **TEMPLATE LENGTH:** Each template 120 lines MAX - complete with imports, types, error handling
10. **TEMPLATE COMPLETENESS:** Copied templates cite files, proposed templates use actual project context
11. **CORRECT SECTION ORDER:** Sections 3-11 (AI-critical) BEFORE sections 12-26 (reference)
12. **COMPUTE PLACEHOLDERS:** Replace [Date], [Current date YYYY-MM-DD] with real date values before returning

### DON'T ❌ - Critical Violations

**Language Violations**:
- ❌ NEVER use vague language: "should", "prefer", "consider", "typically", "usually"
- ❌ NEVER use qualifiers: "mostly", "primarily", "mainly"
- ❌ NEVER use passive voice for rules

**Code Example Violations**:
- ❌ NEVER use placeholders: "...", "// logic here", "// implementation"
- ❌ NEVER use partial imports: "// import statements"
- ❌ NEVER skip error handling
- ❌ NEVER omit types (TypeScript)

**Template Length Violations** (CRITICAL - WILL CAUSE REJECTION):
- ❌ NEVER create templates over 120 lines (HARD LIMIT - not 130, not 150, MAX 120)
- ❌ NEVER create templates over 3000 characters (ABSOLUTE HARD LIMIT - count ALL chars including whitespace, newlines, comments)
- ❌ NEVER use extensive JSDoc blocks (/** */ with 10+ lines) - keep documentation brief
- ❌ NEVER show every possible prop/parameter (show 5-8 essential ones, not 15+)
- ❌ NEVER skip error handling (templates MUST include try-catch or proper error checks)
- ❌ NEVER show multiple variations of same pattern (pick ONE common approach)
- ❌ NEVER add comprehensive inline documentation (brief focused comments only)
- ❌ NEVER include example usage or additional context in template (template code ONLY)

**Content Violations**:
- ❌ **Strict Mode**: NEVER create generic patterns not in this codebase
- ❌ **All Modes**: NEVER use generic placeholders (use actual project name: ${projectName})
- ❌ **All Modes**: NEVER skip project-type adaptation for ${projectType}
- ❌ **All Modes**: NEVER create incomplete templates
- ❌ **All Modes**: NEVER skip optimization sections (3-11)
- ❌ **All Modes**: NEVER invent git history
- ❌ **All Modes**: NEVER bury rules at bottom - they MUST be at position #3
- ❌ **Synthesis/Hybrid**: NEVER claim proposed code exists in codebase (use ⚠️ PROPOSED label)
- ❌ **Synthesis/Hybrid**: NEVER mix copied and proposed code without clear separation

**Placeholder Violations** (CRITICAL):
- ❌ **NEVER return file with unreplaced placeholders**: [Date], [Current date YYYY-MM-DD]
- ❌ **NEVER skip placeholder computation**: Replace date placeholders BEFORE returning

**Conditional Section Violations** (IMPORTANT):
- ❌ **NEVER include Section 8 (Type Mappings)** for JavaScript-only projects
- ❌ **NEVER include Section 18 (Auth & Security)** if no auth detected AND not security-sensitive industry
- ❌ **NEVER include Section 19 (Documentation Reference)** if no existing docs found
- ❌ **NEVER include Section 23 (Critical Rules Reference)** - Always redundant with Section 3
- ❌ **NEVER include Section 24 (Learning Resources)** in Compact mode
- ✅ **ALWAYS follow conditional section rules** defined at top of File Structure section

### File Size (Mode: ${currentSizeConfig.name})

**Limits**: Target ${currentSizeConfig.targetLines}, MAX ${currentSizeConfig.maxLines} lines / ${currentSizeConfig.maxChars} chars. If exceeds max: trim reference sections, reduce examples.

---

## 🔢 FINAL STEP: Compute Placeholders

**Before returning**: Replace [Current date YYYY-MM-DD] and [Date] with ${new Date().toISOString().split('T')[0]}.

---

Generate the ${filename} file now. Return ONLY the markdown content (no JSON wrapper, no outer code blocks).`;
}

/**
 * Generate AI assistant file UPDATE prompt
 * Used when an existing AI assistant file is found and needs to be updated
 */
export function generateAIAssistantUpdatePrompt(
  context: AIAssistantGeneratorContext,
  inventory: VerifiedInventory,
  existingContent: string
): string {
  const {
    projectName,
    projectDescription,
    industry,
    projectType,
    aiAssistant,
    sizeMode: userSizeMode,
    documentationTier,
    fileTree = '',
    primaryLanguage = 'javascript',
    frameworks = [],
    dependencies = {},
    scriptsFromPackageJson = {},
    mainDirectories = [],
    gitRecentCommits = 'No recent commits found',
    gitCommitCount = 0,
    fileCount,
  } = context;

  // Auto-detect size mode (same logic as generate)
  const autoDetectedSizeMode: 'compact' | 'standard' | 'max' = (() => {
    if (documentationTier) {
      const tierRecommendation: Record<string, 'compact' | 'standard' | 'max'> = {
        minimal: 'compact',
        standard: 'standard',
        comprehensive: 'max',
      };
      const recommendedMode = tierRecommendation[documentationTier];
      const aiAssistantMaxMode: Record<string, 'compact' | 'standard' | 'max'> = {
        'claude-code': 'max',
        cursor: 'max',
        chatgpt: 'standard',
        gemini: 'standard',
        copilot: 'compact',
      };
      const maxCapability = aiAssistantMaxMode[aiAssistant] || 'standard';
      const modes = ['compact', 'standard', 'max'];
      const recIndex = modes.indexOf(recommendedMode);
      const maxIndex = modes.indexOf(maxCapability);
      return modes[Math.min(recIndex, maxIndex)] as 'compact' | 'standard' | 'max';
    }
    switch (aiAssistant) {
      case 'claude-code':
      case 'cursor':
        return 'max';
      case 'chatgpt':
      case 'gemini':
        return 'standard';
      case 'copilot':
        return 'compact';
      default:
        return 'standard';
    }
  })();

  const sizeMode = userSizeMode || autoDetectedSizeMode;
  const frameworkList = frameworks.length > 0 ? frameworks.join(', ') : 'None detected';
  const aiAssistantNames: Record<string, string> = {
    'claude-code': 'Claude Code',
    'cursor': 'Cursor AI',
    'copilot': 'GitHub Copilot',
    'chatgpt': 'ChatGPT',
    'gemini': 'Google Gemini',
  };
  const aiAssistantName = aiAssistantNames[aiAssistant] || 'AI Assistant';
  const filename = `${aiAssistant.toUpperCase().replace('-', '_')}.md`;

  const sizeModeConfig = {
    compact: { name: 'Compact', maxLines: 350, maxChars: 15000 },
    standard: { name: 'Standard', maxLines: 600, maxChars: 35000 },
    max: { name: 'Maximum', maxLines: 800, maxChars: 64000 },
  };
  const currentSizeConfig = sizeModeConfig[sizeMode];

  return `# AI ASSISTANT FILE UPDATE MODE

🔄 **UPDATE MODE ACTIVE** - You are updating an EXISTING AI assistant instruction file.

---

## 🎯 YOUR TASK

Analyze the existing ${filename} file, verify its content against the current codebase, preserve user customizations, and update outdated information.

---

## 📋 EXISTING FILE CONTENT

\`\`\`markdown
${existingContent}
\`\`\`

---

## 📊 CURRENT CODEBASE STATE

**Project**: ${projectName}
**Description**: ${projectDescription}
**Industry**: ${industry}
**Project Type**: ${projectType}
**AI Assistant**: ${aiAssistantName}

### Current Tech Stack
- **Primary Language**: ${primaryLanguage}
- **Frameworks**: ${frameworkList}
- **Dependencies**: ${Object.keys(dependencies).length} packages

### Current File Structure
\`\`\`
${fileTree}
\`\`\`

### Main Directories
${mainDirectories.map((dir) => `- ${dir}`).join('\n')}

### Available Scripts
${Object.entries(scriptsFromPackageJson)
  .map(([name, cmd]) => `- **${name}**: \`${cmd}\``)
  .join('\n')}

### Current Dependencies (${Object.keys(dependencies).length} total)
${Object.entries(dependencies)
  .slice(0, 20)
  .map(([pkg, ver]) => `- ${pkg}: ${ver}`)
  .join('\n')}
${Object.keys(dependencies).length > 20 ? `\n... and ${Object.keys(dependencies).length - 20} more` : ''}

### Recent Git History
\`\`\`
${gitRecentCommits}
\`\`\`

### Codebase Stats
- **File Count**: ${fileCount || 0} files
- **Commit Count**: ${gitCommitCount || 0} commits

---

## ✅ VERIFIED CODEBASE INVENTORY

### Verified Utilities (${inventory.stats.utilityFiles} files, ${inventory.stats.exportedFunctions} exports)
${
  Array.from(inventory.utilities.entries())
    .slice(0, 15)
    .map(([name, util]) => `- **${name}**: \`${util.path}\` - Exports: ${util.exports.slice(0, 5).join(', ')}${util.exports.length > 5 ? '...' : ''}`)
    .join('\n') || 'No utility files found'
}

### Common Patterns (${inventory.patterns.length} patterns)
${
  inventory.patterns
    .slice(0, 10)
    .map((p) => `- **${p.category}**: ${p.name} (${p.usageCount} files)`)
    .join('\n') || 'No patterns found'
}

### Anti-Patterns from Git (${inventory.antiPatterns.length} found)
${
  inventory.antiPatterns
    .slice(0, 5)
    .map((ap) => `- ${ap.commitHash}: ${ap.message} (${ap.category})`)
    .join('\n') || 'None found'
}

---

## 🔍 UPDATE ANALYSIS INSTRUCTIONS

### Phase 1: Analyze Existing Content

1. **Extract File Path References**
   - Find all file paths mentioned in the existing content (e.g., \`src/components/\`, \`src/utils/helper.ts:10-50\`)
   - For EACH path: Verify it exists in the current file tree above
   - Mark paths that NO LONGER EXIST

2. **Extract Dependency Versions**
   - Find all dependency versions mentioned (e.g., "React 18.2", "TypeScript 5.1")
   - Compare with current dependencies listed above
   - Mark versions that are OUTDATED

3. **Extract Code Snippets**
   - Find all code blocks in the existing file
   - Verify the source files still exist
   - Check if code patterns are still current

4. **Identify Custom Content**
   - Look for sections marked "Custom:", "Project-specific:", or similar
   - Look for content that doesn't follow standard generator structure
   - Look for user-added rules, notes, or domain-specific content
   - **PRESERVE ALL CUSTOM CONTENT**

### Phase 2: Determine What to Update

**MUST UPDATE** (Always refresh):
- [ ] Dependency versions (use current from above)
- [ ] "Last Updated" date (use ${new Date().toISOString().split('T')[0]})
- [ ] File paths that no longer exist (REMOVE them)
- [ ] Code templates if source files changed

**MUST PRESERVE** (Never change without user input):
- [ ] Custom rules added by user
- [ ] Project-specific notes
- [ ] Domain terminology and explanations
- [ ] Custom decision trees
- [ ] Any section marked as "Custom" or "Project-specific"

**SHOULD ADD** (If not present):
- [ ] New utilities from codebase inventory
- [ ] New patterns from recent commits
- [ ] New anti-patterns from git history
- [ ] New directories/files

### Phase 3: Generate Updated Content

**CRITICAL RULES**:

1. **Preserve Structure**: Keep the same section order and organization
2. **Preserve Style**: Match the writing style of the existing file
3. **Preserve Customizations**: Do NOT remove user-added content
4. **Update Accuracy**: Fix all outdated information
5. **Add New Content**: Include new patterns/utilities from inventory

---

## 🚨 UPDATE RULES

### PRESERVE (Do NOT Change)
- ✅ Custom rules the user added
- ✅ Project-specific notes and explanations
- ✅ Domain terminology (e.g., FHIR terms for healthcare)
- ✅ User-customized decision trees
- ✅ Manual additions and annotations
- ✅ Any section that appears to be user-written (not from generator)

### UPDATE (Must Refresh)
- 🔄 File/directory paths → verify against current file tree
- 🔄 Dependency versions → use versions from current package.json
- 🔄 Code templates → refresh from current inventory if sources exist
- 🔄 "Last Updated" date → ${new Date().toISOString().split('T')[0]}

### REMOVE (If No Longer Valid)
- ❌ File paths that don't exist anymore
- ❌ Dependencies that were removed
- ❌ Code patterns from deleted files
- ❌ References to removed features

### ADD (If Missing)
- ➕ New utilities from verified inventory
- ➕ New patterns discovered in codebase
- ➕ New anti-patterns from recent git history
- ➕ New directories/important files

---

## 📝 OUTPUT FORMAT

Return the COMPLETE updated ${filename} file.

**Requirements**:
- Return ONLY markdown content (no JSON wrapper)
- Keep same overall structure as existing file
- Update all outdated information
- Preserve all custom content
- Size limit: ${currentSizeConfig.maxLines} lines, ${currentSizeConfig.maxChars} chars

---

## ✅ PRE-OUTPUT VERIFICATION

Before returning, verify:
- [ ] All file paths reference files that exist
- [ ] All dependency versions match current package.json
- [ ] All code snippets have valid source citations
- [ ] Custom content is preserved unchanged
- [ ] New patterns from inventory are included
- [ ] "Last Updated" date is ${new Date().toISOString().split('T')[0]}
- [ ] Total length ≤ ${currentSizeConfig.maxLines} lines, ${currentSizeConfig.maxChars} chars

---

Generate the updated ${filename} file now. Return ONLY the markdown content.`;
}
