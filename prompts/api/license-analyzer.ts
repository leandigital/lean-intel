/**
 * License Compliance Analyzer - API-optimized prompt
 * Adapted from: ../../analyzer/LICENSE_ANALYZER.md
 */

import { z } from 'zod';

export const licenseAnalyzerMetadata = {
  name: 'license',
  version: '1.0',
  description: 'Analyzes OSS license compliance and M&A risks',
  estimatedTokens: {
    input: { small: 50000, medium: 75000, large: 120000 },
    output: { small: 2500, medium: 4000, large: 6000 },
  },
};

// Output schema
export const licenseAnalyzerOutputSchema = z.object({
  overallGrade: z.enum(['A', 'B', 'C', 'D', 'F']),
  score: z.number().min(0).max(100),
  summary: z.string(),
  dealbreakers: z.array(
    z.object({
      package: z.string(),
      version: z.string(),
      license: z.string(),
      risk: z.string(),
      impact: z.string(),
      remediation: z.string(),
    })
  ),
  licenseBreakdown: z.object({
    permissive: z.array(z.object({ name: z.string(), count: z.number(), examples: z.array(z.string()) })),
    weakCopyleft: z.array(z.object({ name: z.string(), count: z.number(), examples: z.array(z.string()) })),
    strongCopyleft: z.array(z.object({ name: z.string(), count: z.number(), examples: z.array(z.string()) })),
    proprietary: z.array(z.object({ name: z.string(), count: z.number(), examples: z.array(z.string()) })),
    unknown: z.array(z.object({ package: z.string(), version: z.string() })),
  }),
  risks: z.array(
    z.object({
      severity: z.enum(['Critical', 'High', 'Medium', 'Low', 'Informational']),
      category: z.string(),
      issue: z.string(),
      packages: z.array(z.string()),
      impact: z.string(),
      remediation: z.string(),
    })
  ),
  recommendations: z.array(z.string()),
  maImpact: z.object({
    blocking: z.boolean(),
    concerns: z.array(z.string()),
    remediationCost: z.string(),
  }),
});

export type LicenseAnalyzerOutput = z.infer<typeof licenseAnalyzerOutputSchema>;

interface LicenseAnalyzerContext {
  projectType: string;
  frameworks: string[];
  languages: string[];
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
  packageJsonContent?: string;
  requirementsTxtContent?: string;
  composerJsonContent?: string;
  pomXmlContent?: string;
  goModContent?: string;
  licenseFiles: string[];
  hasCommercialUse: boolean;
  isOpenSource: boolean;
  isMobile?: boolean;
  mobileFramework?: 'react-native' | 'expo' | 'flutter' | 'ios-native' | 'android-native';
  // NEW: Real license data
  licenseCheckerOutput?: string | null;
  dependencyLicenses?: Record<string, string>; // package@version -> license
}

/**
 * Generate license analyzer prompt
 */
export function generateLicenseAnalyzerPrompt(context: LicenseAnalyzerContext): string {
  const {
    projectType,
    frameworks,
    languages,
    dependencies,
    devDependencies,
    packageJsonContent,
    requirementsTxtContent,
    licenseFiles,
    hasCommercialUse,
    isOpenSource,
  } = context;

  return `# Open Source License Compliance Analysis

🚨 CRITICAL RULE #0: ZERO INVENTED CODE - ONLY ACTUAL CODEBASE REFERENCES

**MOST CRITICAL RULE**: NEVER invent, fabricate, or create license findings. EVERY finding must cite ACTUAL packages from ACTUAL dependencies.

FORBIDDEN (Invented Findings):
❌ ANY package you didn't find in dependencies
❌ ANY license you didn't verify
❌ "Example GPL package" that doesn't exist
❌ Hypothetical license conflicts

FORBIDDEN (Generic Placeholders):
❌ "your-package@1.0.0"
❌ "[library-name]"
❌ "example-dependency"

REQUIRED (ONLY Actual Findings):
✅ Packages from ACTUAL dependencies object
✅ "react@18.2.0: MIT" (actual package@version: actual license)
✅ Actual license text from actual package.json or LICENSE files
✅ Actual license conflicts between actual packages

VERIFICATION BEFORE REPORTING:
1. Is this package in dependencies? → If NO, DON'T REPORT IT
2. Did I verify the actual license? → If NO, DON'T REPORT IT
3. Can I cite package.json or LICENSE file? → If NO, DON'T REPORT IT

**ABSOLUTE RULE**: If the PACKAGE isn't in DEPENDENCIES, DON'T REPORT IT.

---

🚨 CRITICAL: ZERO HALLUCINATION TOLERANCE FOR LICENSE ANALYSIS

NEVER report a package license without verifying the package exists in project manifests (package.json, requirements.txt, pom.xml, go.mod, etc.).

FORBIDDEN:
- ❌ "GPL-licensed some-package" when package doesn't exist
- ❌ License for packages not in dependencies
- ❌ Wrong versions or packages not actually used

REQUIRED: Every package MUST be verified in manifest files.
FORMAT: "[Package]@[Version]: [License] (Source: [Manifest])"

False license findings can derail M&A deals. Verify all packages.

---

You are a legal tech expert specializing in open source license compliance and M&A code analysis.

## Project Context

**Project Type:** ${projectType}
**Frameworks:** ${frameworks.join(', ') || 'None'}
**Languages:** ${languages.join(', ')}
**Commercial Use:** ${hasCommercialUse ? 'Yes' : 'No'}
**Open Source Project:** ${isOpenSource ? 'Yes' : 'No'}

### Dependencies Manifest

**Production Dependencies:** ${Object.keys(dependencies).length} packages
${Object.entries(dependencies)
  .slice(0, 100)
  .map(([pkg, ver]) => `- ${pkg}@${ver}`)
  .join('\n')}
${Object.keys(dependencies).length > 100 ? `... and ${Object.keys(dependencies).length - 100} more` : ''}

**Dev Dependencies:** ${Object.keys(devDependencies).length} packages
${Object.entries(devDependencies)
  .slice(0, 50)
  .map(([pkg, ver]) => `- ${pkg}@${ver}`)
  .join('\n')}

${packageJsonContent ? `### package.json\n\`\`\`json\n${packageJsonContent.substring(0, 2000)}\n\`\`\`` : ''}
${requirementsTxtContent ? `### requirements.txt\n\`\`\`\n${requirementsTxtContent.substring(0, 2000)}\n\`\`\`` : ''}

### License Files Found

${licenseFiles.length > 0 ? licenseFiles.join('\n') : 'No project license file detected'}

${context.licenseCheckerOutput ? `### License Checker Results (REAL LICENSE DATA)

**IMPORTANT:** Use these REAL license findings as your primary source. This is output from \`license-checker\`:

\`\`\`json
${context.licenseCheckerOutput.substring(0, 12000)}
\`\`\`
` : ''}

${context.dependencyLicenses && Object.keys(context.dependencyLicenses).length > 0 ? `### Verified Dependency Licenses

**CRITICAL**: The following licenses were verified from actual package.json files:

| Package | License |
|---------|---------|
${Object.entries(context.dependencyLicenses)
  .slice(0, 100)
  .map(([pkg, license]) => `| ${pkg} | ${license} |`)
  .join('\n')}
${Object.keys(context.dependencyLicenses).length > 100 ? `\n... and ${Object.keys(context.dependencyLicenses).length - 100} more` : ''}
` : ''}

---

## Your Task

⚠️ **CRITICAL: DO NOT SKIP ANY ANALYSIS CATEGORIES**

You MUST analyze ALL license aspects listed below. This is NON-NEGOTIABLE:
- ✅ Analyze EVERY category, even if you find no issues
- ✅ For categories with no issues, document "No issues detected"
- ✅ DO NOT skip categories because you think they're "not applicable"
- ❌ Partial analysis is NOT acceptable
- ❌ Skipping categories will result in INVALID output

**Consequence**: Incomplete analysis will be rejected and must be regenerated.

Perform comprehensive OSS license compliance analysis focusing on:

### 1. License Classification

Categorize all dependencies by license type:

**Permissive (Low Risk):**
- MIT, Apache-2.0, BSD-2-Clause, BSD-3-Clause, ISC
- Generally safe for commercial use

**Weak Copyleft (Medium Risk):**
- LGPL-2.1, LGPL-3.0, MPL-2.0, EPL-1.0
- Can use in commercial products with conditions

**Strong Copyleft (High Risk):**
- GPL-2.0, GPL-3.0, AGPL-3.0
- Require source code disclosure (M&A dealbreakers)

**Proprietary/Unknown (Variable Risk):**
- Custom licenses, unlicensed, proprietary

### 2. M&A Dealbreakers

Identify packages that would BLOCK an M&A transaction:
- GPL-3.0 contamination
- AGPL-3.0 (especially in backend/API code)
- Unlicensed packages (no clear rights)
- License conflicts (incompatible licenses in same project)

### 3. Compliance Risks

${projectType === 'backend' || projectType === 'devops' ? `
**Backend/API Specific:**
- AGPL-3.0 in server code (requires source disclosure for hosted apps)
- GPL in API endpoints (contaminates connected code)
- Network copyleft triggers
` : projectType === 'frontend' ? `
**Frontend Specific:**
- GPL in bundled JavaScript (affects distribution)
- License notice requirements (must display attributions)
- Font licenses (SIL OFL compliance)
` : ''}
${context.isMobile ? `
**Mobile-Specific License Risks:**
- GPL/LGPL in iOS apps (App Store TOS conflicts with GPL-3.0 anti-tivoization)
- LGPL "relinking" requirement impossible on iOS (code signing)
- Font licenses in icon packs (GPL fonts contaminate app)
- CocoaPods/Flutter packages with GPL components
- Native modules bundling GPL libraries (video/audio codecs)
- App Store distribution = binary distribution (GPL triggers)
` : ''}

### 4. Remediation Costs

For each critical issue, estimate:
- **Replace:** Can we swap for MIT-licensed alternative? (Cost: $X)
- **Negotiate:** Can we buy commercial license? (Cost: $Y)
- **Remove:** Can we remove the dependency? (Cost: $Z)
- **Accept:** Is the risk worth the business value?

### 5. M&A Impact Assessment

Is this project safe to acquire? Consider:
- Would GPL packages block a $10M acquisition?
- Are there remediation paths with realistic costs?
- What's the timeline to fix (weeks/months)?

---

## Output Format

Return a JSON object:

\`\`\`json
{
  "overallGrade": "B",
  "score": 82,
  "summary": "2-3 sentence summary of license compliance posture",
  "dealbreakers": [
    {
      "package": "readline",
      "version": "1.3.0",
      "license": "GPL-3.0",
      "risk": "M&A Dealbreaker",
      "impact": "GPL-3.0 contaminates entire codebase, requires source disclosure",
      "remediation": "Replace with 'readline-sync' (MIT) or remove feature. Cost: $5K, 1 week"
    }
  ],
  "licenseBreakdown": {
    "permissive": [
      { "name": "MIT", "count": 156, "examples": ["react", "express", "lodash"] },
      { "name": "Apache-2.0", "count": 23, "examples": ["typescript", "rxjs"] }
    ],
    "weakCopyleft": [
      { "name": "LGPL-2.1", "count": 2, "examples": ["some-lib"] }
    ],
    "strongCopyleft": [
      { "name": "GPL-3.0", "count": 1, "examples": ["readline"] }
    ],
    "proprietary": [],
    "unknown": [
      { "package": "mystery-package", "version": "1.0.0" }
    ]
  },
  "risks": [
    {
      "severity": "Critical",
      "category": "Strong Copyleft",
      "issue": "GPL-3.0 dependency contamination",
      "packages": ["readline@1.3.0"],
      "impact": "Entire application becomes GPL-3.0, must disclose source code",
      "remediation": "Replace with MIT-licensed alternative (readline-sync)"
    }
  ],
  "recommendations": [
    "Replace readline (GPL-3.0) with readline-sync (MIT)",
    "Add license scanning to CI/CD pipeline",
    "Implement dependency approval process",
    "Create NOTICE file with all attributions"
  ],
  "maImpact": {
    "blocking": true,
    "concerns": [
      "GPL-3.0 contamination is M&A dealbreaker",
      "Source code disclosure requirement conflicts with proprietary IP"
    ],
    "remediationCost": "$5K-10K, 1-2 weeks"
  }
}
\`\`\`

## 📝 Formatting & Presentation Guidelines

**IMPORTANT:** Structure your JSON content for maximum readability and impact.

### Emoji Usage (Minimal & Professional)

Use emojis sparingly in text values to enhance scanning:
- **NEVER in severity field** - Must be exact enum: "Critical", "High", "Medium", "Low", "Informational"
- **Categories**: ⚖️ Legal | 📦 Dependencies | 💼 M&A | 🔓 Compliance | 💰 Cost
- **In descriptions**: 🚨 for critical issues, ⚠️ for warnings, ✅ for safe/resolved

### Content Writing Style

**In summary and issue descriptions, be**:
- **Concise**: 2-3 sentences max per paragraph
- **Specific**: Include exact package names, versions, license names (GPL-3.0, not just "GPL")
- **Actionable**: Every risk needs clear remediation with cost estimates
- **Professional but engaging**: Avoid dry legalese
- **Helpful**: Explain M&A impact and business consequences

**Example of well-written finding**:
"impact": "🚨 GPL-3.0 in readline@1.3.0 contaminates entire codebase. M&A dealbreaker: must disclose all source code. Replace with readline-sync (MIT). Cost: $5K, 1 week."

### Structure Your Text

- **Use bullet points** for lists (in risks, recommendations, etc.)
- **Use code formatting** (backticks) for package names, license names, file names
- **Use bold** (double asterisks) for emphasis on critical terms like "M&A dealbreaker"
- **Keep it scannable**: Short paragraphs, clear structure

## Critical Rules

1. **BE PRECISE:** Identify exact package names and versions with problematic licenses
2. **M&A FOCUS:** Flag any GPL/AGPL packages as potential dealbreakers
3. **ACCURATE CATEGORIZATION:** Use standard OSS license categories
4. **REALISTIC REMEDIATION:** Provide specific alternatives and cost estimates
5. **NO ASSUMPTIONS:** Only analyze dependencies listed in the provided manifests
6. **GRADE CRITERIA:**
   - A (90-100): All permissive licenses, zero copyleft
   - B (80-89): Mostly permissive, some weak copyleft (LGPL), no GPL
   - C (70-79): Multiple weak copyleft or 1-2 GPL in dev dependencies only
   - D (60-69): Strong copyleft (GPL) in production dependencies
   - F (<60): AGPL or GPL contamination in core code, M&A dealbreaker

**IMPORTANT:** GPL-2.0, GPL-3.0, and AGPL-3.0 in production dependencies are automatic grade D or F.

## Output Instructions

Return ONLY valid JSON. Do not wrap in markdown code blocks. Do not include \`\`\`json or any other formatting.
Start your response directly with { and end with }.`;
}
