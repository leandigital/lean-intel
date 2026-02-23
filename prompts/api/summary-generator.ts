/**
 * Summary Generator - API-optimized prompt
 * Adapted from: ../../documentation/SUMMARY_GENERATOR.md
 */

import { z } from 'zod';

export const summaryGeneratorMetadata = {
  name: 'summary',
  version: '1.0',
  description: 'Generates a concise SUMMARY.md file (150-300 lines) for quick project onboarding',
  estimatedTokens: {
    input: { small: 30000, medium: 50000, large: 80000 },
    output: { small: 2000, medium: 3000, large: 5000 },
  },
};

// Output schema - single file with SUMMARY.md content
export const summaryGeneratorOutputSchema = z.object({
  filename: z.literal('SUMMARY.md'),
  content: z.string(),
  metadata: z.object({
    lineCount: z.number(),
    sectionsCount: z.number(),
    commonIssuesCount: z.number(),
    commandsVerified: z.number(),
    dependenciesListed: z.number(),
  }),
});

export type SummaryGeneratorOutput = z.infer<typeof summaryGeneratorOutputSchema>;

interface SummaryGeneratorContext {
  projectName: string;
  projectDescription: string;
  industry: string;
  projectType: 'frontend' | 'backend' | 'devops' | 'fullstack' | 'other';
  targetAudience: string[]; // e.g., ["New developers", "External contributors", "AI assistants"]
  documentationTier?: 'minimal' | 'standard' | 'comprehensive'; // Auto-detected or manual override

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

  // Scripts and commands
  scriptsFromPackageJson: Record<string, string>;

  // Git history for common issues
  gitRecentCommits: string; // Last 30 commits with 'fix', 'bug', 'issue', 'error'

  // Optional: existing comprehensive docs
  hasComprehensiveDocs: boolean;
  architectureContent?: string; // If ARCHITECTURE.md exists
  claudeContent?: string; // If CLAUDE.md exists

  // Environment config
  hasEnvExample: boolean;
  envVariables: string[]; // Variable names only, no values

  // Key features (detected from codebase)
  keyFeatures: string[]; // 4-6 main features
}

/**
 * Generate summary documentation prompt
 */
export function generateSummaryGeneratorPrompt(context: SummaryGeneratorContext): string {
  const {
    projectName,
    projectDescription,
    industry,
    projectType,
    targetAudience,
    documentationTier,
    fileTree,
    primaryLanguage,
    frameworks,
    languages,
    dependencies,
    scriptsFromPackageJson,
    mainDirectories,
    entryPoint,
    hasTests,
    hasDocker,
    hasDatabase,
    databaseType,
    gitRecentCommits,
    hasComprehensiveDocs,
    architectureContent,
    hasEnvExample,
    envVariables,
    keyFeatures,
  } = context;

  const frameworkList = frameworks.length > 0 ? frameworks.join(', ') : 'None detected';
  const audienceList = targetAudience.join(', ');

  return `🚨 CRITICAL RULE #0: ZERO INVENTED CODE - ONLY ACTUAL CODEBASE REFERENCES

**MOST CRITICAL RULE**: NEVER invent, fabricate, or create code examples. EVERY code snippet must be COPIED VERBATIM from actual files in the codebase.

FORBIDDEN (Invented Code Examples):
❌ ANY code example you write yourself
❌ "✅ CORRECT:" followed by code you made up
❌ Template examples
❌ "Best practice" examples not from the codebase
❌ ANY function/component you didn't find in actual files

FORBIDDEN (Generic Placeholders):
❌ "your-app"
❌ "[project-name]"
❌ "YourComponent"
❌ "example-service"

REQUIRED (ONLY Actual Code):
✅ Code COPIED from actual files (with file:line citation)
✅ "${projectName}" (actual project name from context)
✅ Actual file names from fileTree
✅ Patterns found in 3+ actual files (cite all 3+)

VERIFICATION BEFORE WRITING ANY CODE:
1. Is this code copied from an actual file? → If NO, DELETE IT
2. Do I have file:line reference? → If NO, DELETE IT
3. Can I cite the source file? → If NO, DELETE IT

HOW TO SHOW PATTERNS:
❌ WRONG: Invent example code

✅ CORRECT: Cite actual files
"Pattern found in 3 files:
- src/fileA.ts:10-15
- src/fileB.ts:20-25
- src/fileC.ts:30-35"

If pattern doesn't exist, write:
"[Pattern] - Not found in codebase."

**ABSOLUTE RULE**: If you didn't READ it from a FILE, DON'T WRITE IT.

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

# Project Summary Generation

You are a technical writer creating a concise, user-friendly SUMMARY.md file for quick project onboarding.

## Project Context

**Project Name:** ${projectName}
**Description:** ${projectDescription}
**Industry/Domain:** ${industry}
**Project Type:** ${projectType}
**Target Audience:** ${audienceList}
**Documentation Tier:** ${documentationTier || 'comprehensive'} (${
    documentationTier === 'minimal'
      ? 'Small codebase - SUMMARY.md is one of the primary docs'
      : documentationTier === 'standard'
      ? 'Medium codebase - This summary complements 5-8 core documentation files'
      : 'Large codebase - This summary complements 10-20 comprehensive documentation files'
  })

### Tech Stack

**Primary Language:** ${primaryLanguage}
**Frameworks:** ${frameworkList}
**All Languages:** ${languages.join(', ')}

**Key Dependencies:**
${Object.entries(dependencies)
  .slice(0, 10)
  .map(([pkg, ver]) => `- ${pkg}: ${ver}`)
  .join('\n')}

**Total Dependencies:** ${Object.keys(dependencies).length}

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

**Key Features (from codebase analysis):**
${keyFeatures.map(f => `- ${f}`).join('\n')}

### Recent Git History (Fixes & Issues)

\`\`\`
${gitRecentCommits}
\`\`\`

${hasComprehensiveDocs ? `### Existing Comprehensive Documentation

**Status:** Comprehensive documentation exists (ARCHITECTURE.md, CLAUDE.md, etc.)

**Architecture Overview:**
\`\`\`
${architectureContent?.substring(0, 1500) || 'N/A'}
...
\`\`\`

**Note:** Use this as a verified source of information. The summary should be consistent with comprehensive docs.` : '### Comprehensive Documentation\n\n**Status:** No comprehensive documentation detected. Generate summary from codebase analysis.'}

---

## Your Task

⚠️ **CRITICAL: DO NOT SKIP ANY SECTIONS**

You MUST include ALL required sections. This is NON-NEGOTIABLE:
- ✅ Include EVERY section listed below
- ✅ Keep it concise (150-300 lines) but complete
- ✅ If a section has limited data, write a brief note with available info
- ✅ DO NOT skip sections because you think they're "optional"
- ❌ Partial completion is NOT acceptable
- ❌ Skipping sections will result in INVALID output

**Consequence of skipping**: The entire file will be rejected and must be regenerated.

Generate a concise, user-friendly **SUMMARY.md** file that provides a quick overview and getting-started guide.

### Requirements

**Length:** 150-300 lines (concise and scannable)
**Tone:** User-friendly, accessible, practical
**Target:** ${audienceList}

### Documentation Tier Guidance

${
  documentationTier === 'minimal'
    ? `**MINIMAL TIER** - This is a PRIMARY documentation file:
- This codebase has <20 source files
- SUMMARY.md + AI_ASSISTANT.md are the main docs (2-3 files total)
- Be more comprehensive since there are fewer other docs
- Include more architectural details and design decisions
- This file needs to serve as the main reference`
    : documentationTier === 'standard'
    ? `**STANDARD TIER** - This complements core documentation:
- This codebase has 20-200 source files
- 5-8 core documentation files exist (ARCHITECTURE.md, COMPONENTS.md, etc.)
- Focus on quick-start and common workflows
- Reference other docs for detailed information: "For detailed component patterns, see COMPONENTS.md"`
    : `**COMPREHENSIVE TIER** - This is part of extensive documentation:
- This codebase has 200+ source files
- 10-20 comprehensive documentation files exist
- Keep this summary high-level and focused on getting started
- Frequently reference other docs: "For API details, see API.md" / "For security, see SECURITY.md"`
}

### File Structure

Create SUMMARY.md with the following sections:

1. **Project Title & Description**
   - One-line description
   - Last updated date
   - "What Is This?" (2-4 sentences)
   - Industry/Domain

2. **Tech Stack**
   - Project type (${projectType})
   - Core technologies with versions
   - Key dependencies (top 3-5)

3. **Quick Start**
   - Prerequisites with versions
   - Installation steps
   - Running the project (dev mode)
   - Access URL (e.g., http://localhost:3000)
   - Production build (if applicable)

4. **Project Structure**
   - Simple directory tree
   - Key directories explanation
   - Entry point

5. **Common Commands**
   - Development commands
   - Testing commands
   - Building commands
   - Database commands (if applicable)
   - Linting/formatting

6. **Common Issues & Solutions**
   - Extract 3-5 issues from git history (commits with 'fix', 'bug', 'error')
   - Each issue: Symptom, Cause (if clear), Solution
   - Reference commit hashes

7. **Key Features**
   - List 4-6 main features (verified from codebase)

8. **Testing** (if tests detected)
   - Test framework
   - Run tests command
   - Test coverage info

9. **Deployment** (if applicable)
   - Brief deployment summary
   - Key commands
   - Environment variables (names only, NO values)

10. **Additional Documentation** (if comprehensive docs exist)
    - Links to ARCHITECTURE.md, CLAUDE.md, docs/
    ${hasComprehensiveDocs ? '- "For detailed information, see comprehensive documentation"' : '- "For comprehensive documentation, run the documentation generator"'}

11. **Contributing** (brief 2-3 lines)

12. **License**

---

## Output Format

**IMPORTANT:** Return ONLY the markdown content for SUMMARY.md. No JSON wrapper, no outer code blocks.

Start directly with the markdown header:

\`\`\`markdown
# ${projectName}

> [One-line description]

**Last Updated**: YYYY-MM-DD

---

## 📖 What Is This?

[2-4 sentences]...
\`\`\`

## Critical Rules

1. **CONCISE:** Keep 150-300 lines total (no more!)
2. **VERIFIED:** All versions from package.json, all commands from scripts
3. **GIT INSIGHTS:** Common issues MUST come from actual git commits
4. **USER-FRIENDLY:** Accessible language, clear structure, practical
5. **ACTIONABLE:** User can clone and run project from summary alone
6. **SAFE:** ⚠️ **NEVER include:**
   - API keys or secrets
   - Database passwords
   - Actual environment variable values
   - Absolute paths with usernames
   - Repository URLs with credentials

### Style Guidelines

- **Active voice**: "Run this command" not "This command should be run"
- **Second person**: "You can..." not "One can..."
- **Present tense**: "The app uses..." not "The app used..."
- **Be specific**: "${Object.keys(dependencies).length} dependencies" not "many dependencies"
- **Emoji section headers**: Improve scannability (📖 🛠️ 🚀 📁 🔧 ⚠️ 🔍 🧪 📦 📚 🤝 📄)

### DO's ✅
- Use emojis for section headers
- Verify all versions from config files
- Extract issues from git history with commit hashes
- Use ${industry} domain terminology
- Include actual script commands from package.json
- Verify all directory paths
- Link to comprehensive docs if they exist
- Add "Last Updated" date (today)

### DON'Ts ❌
- Write more than 300 lines
- Include secrets or API keys
- Make assumptions about unverified features
- Use jargon without explanation
- Include deep technical explanations (save for comprehensive docs)
- List all API endpoints (save for API.md)
- Show architectural diagrams (save for ARCHITECTURE.md)

### Common Issues Section (CRITICAL)

Extract from git history:
1. Find commits with "fix", "bug", "issue", "error" keywords
2. Group similar issues
3. For each issue:
   - **Symptom:** What user experiences
   - **Cause:** Why it happens (if clear from commit message)
   - **Solution:** How to fix (commands or code changes)
   - **Reference:** Commit hash

Example:
\`\`\`markdown
### Issue: Port already in use

**Symptom**: Error "EADDRINUSE: address already in use :::3000"

**Cause**: Previous dev server not properly terminated

**Solution**:
\`\`\`bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9
npm run dev
\`\`\`

[From commit e7a92f1: "fix: handle port conflicts in dev server"]
\`\`\`

Generate the SUMMARY.md file now. Return ONLY the markdown content (no JSON wrapper, no outer code blocks).`;
}
