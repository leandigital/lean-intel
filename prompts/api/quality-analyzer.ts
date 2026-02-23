/**
 * Code Quality Analyzer - API-optimized prompt
 * Adapted from: ../../analyzer/CODE_QUALITY_ANALYZER.md
 * Version: 1.3
 *
 * Changelog v1.3:
 * - Added Executive Summary at top of output (TLDR, top 3 issues, recommendation, key metrics)
 * - Added overallAssessment enum (Excellent/Good/Acceptable/Needs Improvement/Poor/Critical)
 * - Added recommendation enum for M&A context (Recommend/Acceptable/Caution/Not Recommended/Reject)
 * - Increased output token estimates for expanded summary
 *
 * Changelog v1.2:
 * - Consolidated duplicate critical rules into single comprehensive rule
 * - Added Tools & Methodology section (prioritize ESLint, radon, lizard, jscpd)
 * - Added new analysis categories: Type Safety, Error Handling, Performance, Accessibility
 * - Added Documentation Quality and Configuration/Environment analysis
 * - Enhanced output schema with Risk Assessment, Success Criteria, Compliance Analysis
 * - Added Framework-Specific and Industry-Specific considerations
 */

import { z } from 'zod';

export const qualityAnalyzerMetadata = {
  name: 'quality',
  version: '1.3',
  description: 'Analyzes code quality, technical debt, and maintainability with tools-first approach',
  estimatedTokens: {
    input: { small: 55000, medium: 85000, large: 145000 },
    output: { small: 4500, medium: 7500, large: 13000 },
  },
};

// Output schema
export const qualityAnalyzerOutputSchema = z.object({
  executiveSummary: z.object({
    tldr: z.string(), // 2-3 sentence summary for executives
    overallAssessment: z.enum([
      'Excellent',
      'Good',
      'Acceptable',
      'Needs Improvement',
      'Poor',
      'Critical',
    ]),
    topIssues: z
      .array(
        z.object({
          issue: z.string(),
          severity: z.string(), // "Critical", "High", etc.
          impact: z.string(),
          estimatedCost: z.string(),
        })
      )
      .max(3),
    recommendation: z.enum([
      'Recommend - Minor improvements needed',
      'Acceptable - Some refactoring required',
      'Caution - Significant technical debt',
      'Not Recommended - Major refactoring required',
      'Reject - Dealbreaker issues present',
    ]),
    keyMetrics: z.object({
      qualityScore: z.string(), // e.g., "C (72/100)"
      technicalDebtRatio: z.string(), // e.g., "35%"
      testCoverage: z.string(), // e.g., "42%"
      remediationCost: z.string(), // e.g., "$45K-$65K"
      timeToRemediate: z.string(), // e.g., "6-8 weeks"
    }),
  }),
  overallGrade: z.string(),
  score: z.number().min(0).max(100),
  qualityScore: z.number().min(0).max(100),
  technicalDebtPercentage: z.number().min(0).max(100),
  summary: z.string(),
  metrics: z.object({
    linesOfCode: z.number(),
    codeFiles: z.number(),
    testFiles: z.number(),
    testCoverage: z.number().nullish(), // LLM may return null when coverage is unknown
    avgFileSize: z.number(),
    complexFunctions: z.number(),
  }),
  technicalDebt: z.object({
    category: z.string(),
    severity: z.string(), // Allow any severity descriptor (Critical, High, Medium, Low, Medium-High, etc.)
    issues: z.array(
      z.object({
        type: z.string(),
        description: z.string(),
        location: z.string().optional(),
        impact: z.string(),
        effortToFix: z.string(),
        cost: z.string(),
      })
    ),
    totalRemediationCost: z.string(),
    totalRemediationTime: z.string(),
  }),
  codeSmells: z.array(
    z.object({
      smell: z.string(),
      severity: z.string(), // Allow any severity descriptor
      occurrences: z.number(),
      files: z.array(z.string()),
      impact: z.string(),
      refactoringEffort: z.string(),
    })
  ),
  antiPatterns: z.array(
    z.object({
      pattern: z.string(),
      severity: z.string(), // Allow any severity descriptor
      locations: z.array(z.string()),
      why: z.string(),
      howToFix: z.string(),
    })
  ),
  testingQuality: z.object({
    hasTests: z.boolean(),
    testFramework: z.string().optional(),
    coverage: z.string(),
    testTypes: z.array(z.string()),
    gaps: z.array(z.string()),
  }),
  maintainability: z.object({
    score: z.number().min(0).max(100),
    factors: z.array(
      z.object({
        factor: z.string(),
        rating: z.string(), // Allow any rating descriptor (Excellent, Good, Fair, Poor, etc.)
        notes: z.string(),
      })
    ),
  }),
  toolsUsed: z.object({
    staticAnalysis: z.array(z.string()).nullish(), // e.g., ["ESLint", "radon", "jscpd"] or null if none used
    methodology: z.string(), // e.g., "Tools-based (ESLint, jscpd)" or "Bash scripts (rough estimates)"
    limitations: z.string().optional(), // Limitations of the methodology used
  }),
  riskAssessment: z.object({
    highRisk: z.array(
      z.object({
        risk: z.string(),
        probability: z.string(), // e.g., "High (60-80%)"
        impact: z.string(), // e.g., "$50K-$200K in lost revenue"
        mitigation: z.string(), // e.g., "Immediate fix (Week 1-2) - $15K-$25K"
      })
    ),
    mediumRisk: z.array(
      z.object({
        risk: z.string(),
        probability: z.string(),
        impact: z.string(),
        mitigation: z.string(),
      })
    ),
    lowRisk: z.array(
      z.object({
        risk: z.string(),
        probability: z.string(),
        impact: z.string(),
        mitigation: z.string(),
      })
    ),
  }),
  successCriteria: z.object({
    phase1: z.array(z.string()), // Immediate (Week 1-2)
    phase2: z.array(z.string()), // Short-term (Month 1-2)
    phase3: z.array(z.string()), // Medium-term (Month 3-6)
    phase4: z.array(z.string()), // Ongoing
  }),
  complianceAnalysis: z
    .object({
      hasDocumentedStandards: z.boolean(),
      violations: z.array(
        z.union([
          z.string(),
          z.object({
            // Accept either format: (rule, status, impact) or (standard, violation, severity, location)
            rule: z.string().optional(),
            standard: z.string().optional(),
            status: z.string().optional(),
            violation: z.string().optional(),
            impact: z.string().optional(),
            severity: z.string().optional(),
            location: z.string().optional(),
          }),
        ])
      ),
      recommendations: z.array(z.string()),
    })
    .optional(),
  recommendations: z.array(
    z.object({
      priority: z.string(), // Allow any priority descriptor
      action: z.string(),
      effort: z.string(),
      impact: z.string(),
    })
  ),
});

export type QualityAnalyzerOutput = z.infer<typeof qualityAnalyzerOutputSchema>;

interface QualityAnalyzerContext {
  projectType: string;
  frameworks: string[];
  languages: string[];
  fileCount: number;
  lineCount: number;
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
  fileTree: string;
  hasTests: boolean;
  testFramework?: string;
  gitCommitsAnalysis: string;
  sampleCodeFiles: Record<string, string>; // Sample of actual code
  componentFiles: string[];
  configFiles: string[];
  isMobile?: boolean;
  mobileFramework?: 'react-native' | 'expo' | 'flutter' | 'ios-native' | 'android-native';
  appBundleSize?: string;
}

/**
 * Generate code quality analyzer prompt
 */
export function generateQualityAnalyzerPrompt(context: QualityAnalyzerContext): string {
  const {
    projectType,
    frameworks,
    languages,
    fileCount,
    lineCount,
    dependencies,
    devDependencies,
    fileTree,
    hasTests,
    testFramework,
    gitCommitsAnalysis,
    sampleCodeFiles,
    componentFiles,
  } = context;

  return `# Code Quality & Technical Debt Analysis

🚨 CRITICAL RULE: Zero Hallucination - Evidence-Based Analysis Only

**THIS IS THE ABSOLUTE MOST CRITICAL RULE. READ THIS FIRST.**

Every code quality finding MUST be verified in actual code with file:line references.

### ✅ REQUIRED - Evidence-Based Approach

- ✅ **Read actual code** from the file before reporting any issue
- ✅ **Provide file:line references** for every finding
- ✅ **Measure actual metrics** (count lines, calculate complexity from real code)
- ✅ **Cite 3+ examples** before claiming something is a pattern
- ✅ **Copy code verbatim** when showing examples (with file:line citation)
- ✅ **Verify all claims** with the provided context and sample files

### ❌ FORBIDDEN - Hallucinations & Invented Issues

- ❌ **Invented code examples** you write yourself
- ❌ **Estimated metrics** without actual measurement ("probably 300 lines", "around 25 complexity")
- ❌ **Generic placeholders** like "your-app/src/...", "YourClass.tsx", "[project-name]"
- ❌ **Made-up function/class names** not found in the codebase
- ❌ **Template refactoring examples** you created (use actual code instead)
- ❌ **Assumed issues** ("likely has no error handling", "probably duplicated")

### 🎯 Verification Checklist

Before reporting ANY code quality issue, ask yourself:

1. **Did I see this in the provided code samples?** → If NO, DON'T REPORT IT
2. **Do I have exact file:line reference?** → If NO, DON'T REPORT IT
3. **Did I measure/count from actual code?** → If NO, MEASURE IT FIRST
4. **Can I cite specific examples?** → If NO, FIND THEM FIRST

### 📋 Correct Reporting Format

**❌ WRONG** (vague, no evidence):
> "There are type safety issues in the codebase"

**✅ CORRECT** (specific, with evidence):
> "File \`src/services/mappers/mapRowToProps.ts:5\` uses 'any' type for parameter 'item', defeating TypeScript's type checking"

**❌ WRONG** (invented metric):
> "The UserService class is probably around 800 lines and needs refactoring"

**✅ CORRECT** (measured):
> "File \`src/services/UserService.ts:1-847\` contains 847 lines (measured from sample), violating the 500-line limit"

### 🚫 Golden Rule

**"If you didn't SEE it in the PROVIDED CODE, DON'T WRITE IT in the report."**

---

You are a senior software architect conducting a comprehensive code quality assessment.

## Project Context

**Project Type:** ${projectType}
**Frameworks:** ${frameworks.join(', ') || 'None'}
**Languages:** ${languages.join(', ')}
**Code Files:** ${fileCount}
**Lines of Code:** ${lineCount.toLocaleString()}
**Has Tests:** ${hasTests ? `Yes (${testFramework || 'framework unknown'})` : 'No'}
${context.isMobile ? `**Mobile Platform:** ${context.mobileFramework || 'Unknown'}` : ''}
${context.appBundleSize ? `**App Bundle Size:** ${context.appBundleSize}` : ''}

### Dependencies

**Production:** ${Object.keys(dependencies).length} packages
**Dev:** ${Object.keys(devDependencies).length} packages

Key dependencies:
${Object.entries(dependencies)
  .slice(0, 20)
  .map(([pkg, ver]) => `- ${pkg}@${ver}`)
  .join('\n')}

### File Structure

\`\`\`
${fileTree}
\`\`\`

### Component Files

${componentFiles.slice(0, 20).map(f => `- ${f}`).join('\n')}
${componentFiles.length > 20 ? `... and ${componentFiles.length - 20} more` : ''}

### Sample Code Analysis

${Object.entries(sampleCodeFiles)
  .slice(0, 5)
  .map(([file, content]) => `\n#### ${file}\n\`\`\`\n${content.substring(0, 1000)}\n...\n\`\`\``)
  .join('\n')}

### Git Commit History (Technical Debt Signals)

\`\`\`
${gitCommitsAnalysis}
\`\`\`

---

## 🛠️ Tools & Methodology

**IMPORTANT**: This analysis is based on the code samples provided above. For production use, recommend static analysis tools for accurate metrics.

### Recommended Tools for Production Analysis

**JavaScript/TypeScript:**
- **ESLint** - Code quality, complexity detection, unused vars
- **TypeScript compiler** - Type safety, strict mode violations
- **ts-prune** - Dead code detection
- **jscpd** - Code duplication analysis
- **Jest/Vitest** - Test coverage reports

**Python:**
- **radon** - Complexity and maintainability metrics
- **pylint** - Code quality, duplicate code
- **mypy** - Type checking
- **vulture** - Dead code detection

**Multi-Language:**
- **lizard** - Complexity analysis for 20+ languages
- **SonarQube** - Comprehensive quality analysis
- **PMD CPD** - Copy-paste detection

**Accessibility (Frontend):**
- **axe-cli** - WCAG compliance testing
- **pa11y** - Accessibility testing
- **Lighthouse** - Performance + accessibility

### Analysis Methodology

Based on the provided context:
- **Code Samples**: Analyzing ${Object.keys(sampleCodeFiles).length} sample files
- **File Tree**: Analyzing structure of ${fileCount} files
- **Dependencies**: Reviewing ${Object.keys(dependencies).length} production dependencies

**Limitations**:
- Analysis based on samples (not full codebase scan)
- Complexity estimated from code structure (not measured with tools)
- Duplication inferred from patterns (not measured with jscpd/PMD)
- Dead code suspected from naming patterns (not measured with ts-prune/vulture)

**Recommendation**: Run ESLint, radon, lizard, and jscpd for precise metrics.

---

## Your Task

⚠️ **CRITICAL: DO NOT SKIP ANY ANALYSIS CATEGORIES**

You MUST analyze ALL code quality aspects listed below. This is NON-NEGOTIABLE:
- ✅ Analyze EVERY category, even if you find no issues
- ✅ For categories with no issues, document "No issues detected"
- ✅ DO NOT skip categories because you think they're "not applicable"
- ❌ Partial analysis is NOT acceptable
- ❌ Skipping categories will result in INVALID output

**Consequence**: Incomplete analysis will be rejected and must be regenerated.

Analyze code quality across these dimensions:

### 1. Code Metrics

- **Lines of Code:** ${lineCount.toLocaleString()}
- **Files:** ${fileCount}
- **Average File Size:** Calculate from LOC/files
- **Complex Functions:** Identify functions >50 LOC or high cyclomatic complexity

### 2. Technical Debt Assessment

Identify and quantify:

**Architectural Debt:**
- Monolithic components (>500 LOC)
- Tight coupling
- Missing abstraction layers
- Circular dependencies

**Code Debt:**
- Duplicated code (DRY violations)
- Magic numbers/strings
- Commented-out code
- TODO/FIXME comments
- Overly complex functions

**Test Debt:**
- Missing unit tests
- Low test coverage
- No integration tests
- Manual testing only

**Documentation Debt:**
- Missing function comments
- No README sections
- Outdated docs

**Dependency Debt:**
- Outdated packages
- Deprecated APIs
- Unnecessary dependencies

**Estimate Remediation:**
For each debt category, provide:
- Number of occurrences
- Time to fix (dev hours)
- Cost estimate (hours × $100/hour)

### 3. New Analysis Categories (v1.2)

**Type Safety Issues** ${languages.includes('TypeScript') || languages.includes('Python') ? '(APPLICABLE)' : '(Skip if not applicable)'}:
${languages.includes('TypeScript') ? `
- 'any' type usage (should be < 2%)
- Missing return type annotations
- Strict mode disabled (check tsconfig.json)
- Type assertions overuse
- Missing null checks
` : languages.includes('Python') ? `
- Missing type hints (check function signatures)
- Type coverage percentage
- mypy violations
` : '- N/A for this project'}

**Error Handling Coverage**:
- Async operations without try-catch
- Promises without .catch()
- Missing error boundaries (React)
- Generic error catching (catch(e) without specificity)
- Critical paths (auth, payments) without error handling

**Performance Issues**:
- N+1 queries (loops with database calls)
- Missing pagination on large datasets
- No caching strategy
- Large unoptimized assets (images > 500KB)
- Blocking operations (synchronous file I/O)

${projectType === 'frontend' ? `
**Accessibility Issues (Frontend)**:
- Missing alt text on images
- Non-semantic HTML (excessive div usage)
- Missing keyboard navigation
- Missing ARIA labels
- Color contrast issues
- WCAG AA compliance gaps
` : ''}

**Documentation Quality**:
- Missing README sections (installation, usage, API docs, testing)
- Inline documentation coverage (JSDoc/docstrings)
- Outdated comments with dates
- Missing architecture documentation

**Configuration & Environment**:
- .env file management (.env.example exists?)
- Hardcoded credentials/URLs
- Missing environment variable validation
- Configuration not in environment variables

### 4. Code Smells

Identify common code smells:

${projectType === 'frontend' ? `
**Frontend-Specific:**
- God components (>500 LOC)
- Prop drilling (>3 levels)
- Inline styling
- Uncontrolled components
- Missing keys in lists
- Huge bundle sizes
` : projectType === 'backend' ? `
**Backend-Specific:**
- God classes/services
- N+1 query problems
- Missing error handling
- Synchronous I/O blocking
- No input validation
- SQL injection risks
` : ''}
${context.isMobile ? `
**Mobile-Specific Code Smells:**
- MQ1: Large Screen Components (>300 LOC for mobile screens)
- MQ2: Inline Styles (StyleSheet.create not used in React Native)
- MQ3: Missing Memoization (unnecessary re-renders)
- MQ4: Large App Bundle Size (${context.appBundleSize || 'unknown'})
  - iOS: >50MB affects download conversion
  - Android: >100MB affects download conversion
- MQ5: Heavy Re-Renders (Missing React.memo, useMemo, useCallback)
- MQ6: Platform-Specific Code Duplication (no proper abstraction)
- MQ7: Excessive API Calls (screen focus refetch without caching)

Platform-Specific Quality Issues:
${context.mobileFramework === 'react-native' || context.mobileFramework === 'expo' ? `
- Inline styles instead of StyleSheet.create (performance issue)
- FlatList without proper optimizations (initialNumToRender, maxToRenderPerBatch)
- Images without proper sizing (causes layout shifts)
- Missing Hermes engine (slower JS performance)
- Large animated values without useNativeDriver
` : context.mobileFramework === 'flutter' ? `
- Rebuilding entire widget tree instead of targeted updates
- Missing const constructors (performance impact)
- Large image assets without proper caching
- Synchronous file I/O on main thread
` : context.mobileFramework === 'ios-native' || context.mobileFramework === 'android-native' ? `
- Memory leaks (retain cycles, missing weak references)
- Blocking main thread with heavy operations
- Missing view recycling in lists
- Unoptimized image loading
` : ''}
` : ''}

**General Smells:**
- Long parameter lists
- Large classes/files
- Feature envy
- Data clumps
- Shotgun surgery

### 4. Anti-Patterns

${projectType === 'frontend' ? `
**Frontend Anti-Patterns:**
- Prop drilling instead of context/state
- Fetch on render (infinite loops)
- Missing error boundaries
- Directly mutating state
- No code splitting
` : projectType === 'backend' ? `
**Backend Anti-Patterns:**
- Fat controllers
- Anemic domain models
- God objects
- Spaghetti code
- Missing middleware
` : ''}

### 5. Testing Quality

Assess test coverage and quality:
- Unit test presence
- Integration test presence
- E2E test presence
- Test maintainability
- Mocking strategies

### 6. Maintainability Factors

Rate these factors (Excellent/Good/Fair/Poor):
- **Readability:** Code clarity, naming conventions
- **Modularity:** Component separation, SRP adherence
- **Testability:** How easy to add tests
- **Extensibility:** How easy to add features
- **Documentation:** Code comments, README quality

---

## Executive Summary Requirements

**CRITICAL**: The \`executiveSummary\` field appears FIRST in the JSON output. This is the most important section for decision-makers.

### TLDR (2-3 sentences)
Provide a concise summary suitable for executives who won't read the full report:
- State overall quality level and technical debt percentage
- Mention 1-2 most critical issues
- Include total remediation cost and time

**Example**: "Codebase shows moderate technical debt (35%) with 12 god components and low test coverage (42%). Main concerns: missing error handling in critical paths and poor accessibility. Estimated remediation: $45K-$65K over 6-8 weeks."

### Overall Assessment (Enum)
Choose the assessment that best matches the codebase state:
- **Excellent**: A-grade, production-ready, minimal issues
- **Good**: B-grade, solid quality with minor improvements needed
- **Acceptable**: C-grade, functional but needs some refactoring
- **Needs Improvement**: D-grade, significant issues that should be addressed
- **Poor**: D/F-grade, major refactoring required before production use
- **Critical**: F-grade, dealbreaker issues present (security, data loss risks)

### Top 3 Issues (Array, max 3)
Select the 3 most critical issues that:
- Have highest impact on business (security > functionality > quality)
- Require immediate or near-term attention
- Would be dealbreakers or major concerns in M&A due diligence

For each issue, provide:
- **issue**: Clear, concise description (1 sentence)
- **severity**: "Critical", "High", "Medium"
- **impact**: Business/technical impact (1 sentence)
- **estimatedCost**: Dollar range and timeline

### Recommendation (Enum)
Choose the appropriate recommendation:
- **"Recommend - Minor improvements needed"**: A/B grade, safe to proceed
- **"Acceptable - Some refactoring required"**: C grade, acceptable with plan to improve
- **"Caution - Significant technical debt"**: D grade, proceed with caution and budget for fixes
- **"Not Recommended - Major refactoring required"**: F grade, high risk
- **"Reject - Dealbreaker issues present"**: Critical security/stability issues

### Key Metrics (Object)
Provide formatted strings for quick scanning:
- **qualityScore**: Letter grade + number (e.g., "C (72/100)")
- **technicalDebtRatio**: Percentage (e.g., "35%")
- **testCoverage**: Percentage (e.g., "42%")
- **remediationCost**: Dollar range (e.g., "$45K-$65K")
- **timeToRemediate**: Time estimate (e.g., "6-8 weeks")

---

## Output Format

Return a JSON object with **Executive Summary FIRST** for quick scanning:

\`\`\`json
{
  "executiveSummary": {
    "tldr": "Codebase shows moderate technical debt (35%) with 12 god components and low test coverage (42%). Main concerns: missing error handling in critical paths, high complexity functions, and poor accessibility. Estimated remediation: $45K-$65K over 6-8 weeks.",
    "overallAssessment": "Acceptable",
    "topIssues": [
      {
        "issue": "Missing error handling in auth and payment flows",
        "severity": "Critical",
        "impact": "High risk of production crashes and data loss",
        "estimatedCost": "$15K-$25K (immediate fix required)"
      },
      {
        "issue": "12 god components exceed 500 LOC",
        "severity": "High",
        "impact": "Slow development velocity, high bug rate",
        "estimatedCost": "$8K-$12K (2-3 weeks)"
      },
      {
        "issue": "Low test coverage (42%) with critical paths untested",
        "severity": "Critical",
        "impact": "Risky deployments, hard to refactor safely",
        "estimatedCost": "$12K-$27K (3-4 weeks)"
      }
    ],
    "recommendation": "Acceptable - Some refactoring required",
    "keyMetrics": {
      "qualityScore": "C (72/100)",
      "technicalDebtRatio": "35%",
      "testCoverage": "42%",
      "remediationCost": "$45K-$65K",
      "timeToRemediate": "6-8 weeks"
    }
  },
  "overallGrade": "C",
  "score": 72,
  "qualityScore": 68,
  "technicalDebtPercentage": 35,
  "summary": "Codebase has moderate quality with some architectural issues that need addressing",
  "metrics": {
    "linesOfCode": 25000,
    "codeFiles": 247,
    "testFiles": 45,
    "testCoverage": 42,
    "avgFileSize": 101,
    "complexFunctions": 18
  },
  "technicalDebt": {
    "category": "Medium-High",
    "severity": "High",
    "issues": [
      {
        "type": "Architectural Debt",
        "description": "12 components exceed 500 LOC (god components)",
        "location": "src/components/Dashboard.tsx (847 LOC)",
        "impact": "Hard to maintain, high bug risk, slow feature development",
        "effortToFix": "80 hours",
        "cost": "$8,000"
      }
    ],
    "totalRemediationCost": "$45,000-$65,000",
    "totalRemediationTime": "6-8 weeks"
  },
  "codeSmells": [
    {
      "smell": "God Components",
      "severity": "High",
      "occurrences": 12,
      "files": ["Dashboard.tsx", "UserProfile.tsx"],
      "impact": "Difficult to test, high coupling, slow development",
      "refactoringEffort": "4-6 hours per component"
    }
  ],
  "antiPatterns": [
    {
      "pattern": "Prop Drilling",
      "severity": "Medium",
      "locations": ["App.tsx → Dashboard → UserCard → Avatar"],
      "why": "Makes refactoring hard, tight coupling",
      "howToFix": "Use Context API or Redux for shared state"
    }
  ],
  "testingQuality": {
    "hasTests": true,
    "testFramework": "Jest + React Testing Library",
    "coverage": "42% (needs improvement)",
    "testTypes": ["Unit tests", "Component tests"],
    "gaps": ["No integration tests", "No E2E tests", "Missing error case tests"]
  },
  "maintainability": {
    "score": 65,
    "factors": [
      {
        "factor": "Readability",
        "rating": "Good",
        "notes": "Consistent naming, but some complex functions"
      },
      {
        "factor": "Modularity",
        "rating": "Fair",
        "notes": "Too many large components, needs better separation"
      }
    ]
  },
  "toolsUsed": {
    "staticAnalysis": null,
    "methodology": "Manual analysis of code samples (5 files analyzed)",
    "limitations": "Analysis based on samples, not full codebase. Recommend running ESLint, jscpd, and radon for precise metrics."
  },
  "riskAssessment": {
    "highRisk": [
      {
        "risk": "Production Stability - Missing error handling in critical paths (auth, payments)",
        "probability": "High (60-80% chance of production incident in next 6 months)",
        "impact": "$50K-$200K in lost revenue + reputation damage",
        "mitigation": "Immediate fix (Week 1-2) - $15K-$25K investment"
      }
    ],
    "mediumRisk": [
      {
        "risk": "Technical Debt Accumulation - God classes and long functions make changes risky",
        "probability": "Certain (already happening)",
        "impact": "30-50% slower development, 20-30% higher turnover",
        "mitigation": "Ongoing refactoring - $40K-$60K over 3 months"
      }
    ],
    "lowRisk": [
      {
        "risk": "Developer Experience - Missing documentation, inconsistent code style",
        "probability": "Low-Medium",
        "impact": "10-20% productivity loss",
        "mitigation": "Continuous improvement - $10K-$20K"
      }
    ]
  },
  "successCriteria": {
    "phase1": [
      "All critical TODOs/FIXMEs resolved",
      "Error handling added to auth and payment flows",
      "Top 3 most complex functions refactored",
      "Dead code removed",
      "Success Metric: 0 CRITICAL issues, Quality Score C+ or higher"
    ],
    "phase2": [
      "Test coverage reaches 60% overall, 80% for critical paths",
      "Top 3 god classes refactored",
      "Code duplication reduced to < 8%",
      "All high-complexity functions addressed",
      "Success Metric: 0 CRITICAL, < 10 HIGH issues, Quality Score B- or higher"
    ],
    "phase3": [
      "Test coverage reaches 70%+",
      "All god classes refactored",
      "Code duplication reduced to < 5%",
      "All long functions (> 50 lines) addressed",
      "Performance issues resolved (N+1 queries, caching implemented)",
      "Success Metric: Quality Score A- or higher, Tech Debt Ratio < 20%"
    ],
    "phase4": [
      "Maintain 70%+ test coverage",
      "Enforce complexity limits in CI/CD (reject PRs with complexity > 20)",
      "Automated code quality checks pass",
      "Quarterly technical debt reviews conducted",
      "Success Metric: Quality Score A maintained, no new HIGH/CRITICAL issues"
    ]
  },
  "complianceAnalysis": {
    "hasDocumentedStandards": false,
    "violations": [],
    "recommendations": [
      "Create CONTRIBUTING.md with coding standards",
      "Add ESLint configuration to enforce rules",
      "Document architectural decisions in ADR format"
    ]
  },
  "recommendations": [
    {
      "priority": "Critical",
      "action": "Break down 12 god components into smaller, focused components",
      "effort": "80 hours, $8K",
      "impact": "Improves maintainability by 30%, reduces bug rate"
    },
    {
      "priority": "High",
      "action": "Install and run ESLint, jscpd, and radon for accurate metrics",
      "effort": "2 hours setup, ongoing",
      "impact": "Provides precise complexity, duplication, and quality metrics for future analysis"
    }
  ]
}
\`\`\`

### Recommendations Formatting

**IMPORTANT:** Format recommendations as clear, actionable text within each field:

- **priority**: Use descriptive priority levels (e.g., "Critical", "High", "Medium", "Low")
- **action**: Write as clear, imperative statement (e.g., "Break down 12 god components...")
- **effort**: Include time and cost estimate (e.g., "80 hours, $8K")
- **impact**: Describe the positive outcome (e.g., "Improves maintainability by 30%")

All text should be plain, readable strings - NO nested markdown, NO special formatting within JSON values.

## 📝 Formatting & Presentation Guidelines

**IMPORTANT:** Structure your JSON content for maximum readability and impact.

### Emoji Usage (Minimal & Professional)

Use emojis sparingly in text values to enhance scanning:
- **NEVER in severity field** - Must be exact enum: "Critical", "High", "Medium", "Low", "Informational"
- **Categories**: 💻 Code Quality | 📦 Dependencies | 🧪 Testing | 📐 Architecture | 🔧 Maintainability
- **In descriptions**: 🚨 for critical issues, ⚠️ for warnings, ✅ for good practices

### Content Writing Style

**In summary and issue descriptions, be**:
- **Concise**: 2-3 sentences max per paragraph
- **Specific**: Include exact file:line references, LOC counts, complexity metrics
- **Actionable**: Every issue needs clear remediation with effort estimates
- **Professional but engaging**: Avoid dry technical jargon
- **Helpful**: Explain impact on maintainability and development speed

**Example of well-written issue**:
"description": "🚨 God component Dashboard.tsx (847 LOC) violates SRP. Should be split into 4-5 focused components. Refactoring: 12 hours, $1,200."

### Structure Your Text

- **Use bullet points** for lists (in remediation, impact, etc.)
- **Use code formatting** (backticks) for file names, function names, code snippets
- **Use bold** (double asterisks) for emphasis on critical terms
- **Keep it scannable**: Short paragraphs, clear structure

## 🛠️ Framework-Specific Considerations

${frameworks.includes('React') || frameworks.includes('Next.js') ? `
**React / Next.js - Additional Checks**:
- Component size (< 300 lines per component)
- Hooks usage (proper dependencies in useEffect, useMemo, useCallback)
- Prop drilling vs context usage
- Re-render optimization (React.memo, useMemo)
- Server vs client components (Next.js 13+ App Router)
- Image optimization (next/image usage)
- Key props on list items

**Common Anti-Patterns**:
- Inline event handlers causing re-renders
- Missing error boundaries
- Unoptimized images
- Fetching data in components instead of server components (Next.js 13+)
` : ''}

${frameworks.includes('Express') || projectType === 'backend' ? `
**Node.js / Express - Additional Checks**:
- Middleware order and error handling
- Async/await vs callbacks (prefer async/await)
- Connection pooling for databases
- Request validation (express-validator, joi)
- Security headers (Helmet.js)
- Rate limiting implementation

**Common Anti-Patterns**:
- Missing error handling middleware
- Synchronous operations blocking event loop
- No request size limits (DoS vulnerability)
- Database connections not pooled
` : ''}

${languages.includes('Python') ? `
**Python - Additional Checks**:
- Queryset optimization (select_related, prefetch_related for Django)
- Type hints coverage (Python 3.5+)
- Virtual environment usage
- Migration quality (Django)

**Common Anti-Patterns**:
- N+1 queries in ORM
- Missing database indexes
- Circular imports
- Mutable default arguments
` : ''}

${languages.includes('TypeScript') ? `
**TypeScript - Additional Checks**:
- Strict mode enabled (tsconfig.json)
- 'any' type usage (< 2% acceptable)
- Return type annotations
- Proper use of generics
- Type guards for union types

**Common Anti-Patterns**:
- Type assertions (as keyword) overuse
- Any types defeating TypeScript benefits
- Missing null checks with optional chaining
` : ''}

## 🏢 Industry-Specific Priorities

${projectType.toLowerCase().includes('health') || projectType.toLowerCase().includes('medical') ? `
**Healthcare - High Priority Checks**:
- Error handling (patient safety critical)
- Data validation (medical accuracy)
- Audit logging (compliance)
- Accessibility (ADA compliance)
- Performance (life-critical applications)
` : ''}

${projectType.toLowerCase().includes('finance') || projectType.toLowerCase().includes('payment') ? `
**Finance/Fintech - High Priority Checks**:
- Precision in calculations (use Decimal, not Float)
- Transaction atomicity (ACID compliance)
- Audit logging (financial regulations)
- Security (authentication, authorization, encryption)
- Error handling (money must never be lost)
- Idempotent operations
` : ''}

${projectType.toLowerCase().includes('commerce') || projectType.toLowerCase().includes('store') ? `
**E-commerce - High Priority Checks**:
- Performance (conversion rates)
- Cart and checkout reliability
- Payment integration security
- Inventory synchronization
- Accessibility (broader user base)
- Race condition handling (inventory)
` : ''}

## Critical Rules

1. **EXECUTIVE SUMMARY FIRST:** The \`executiveSummary\` field MUST appear first in JSON output and contain TLDR, top 3 issues, recommendation, and key metrics
2. **DISCLOSE METHODOLOGY:** Always state in toolsUsed field whether analysis is based on code samples or static analysis tools
3. **BE SPECIFIC:** Reference actual files from provided samples, line counts, patterns found
4. **QUANTIFY EVERYTHING:** Provide numbers for LOC, occurrences, costs (based on what's visible in samples)
5. **REALISTIC ESTIMATES:** Use industry standard of $100/hour for dev time
6. **PRIORITIZE:** Focus on high-impact issues first (security > functionality > quality)
7. **ACTIONABLE:** Every issue must have clear remediation path
8. **RECOMMEND TOOLS:** Always recommend ESLint, radon, lizard, jscpd for accurate production analysis
9. **GRADE CRITERIA:**
   - A (90-100): <10% technical debt, excellent testing, clean architecture
   - B (80-89): 10-20% debt, good testing, minor issues
   - C (70-79): 20-35% debt, adequate testing, some refactoring needed
   - D (60-69): 35-50% debt, poor testing, significant issues
   - F (<60): >50% debt, little/no testing, major refactoring required

## Output Instructions

Return ONLY valid JSON following this structure:

1. **Start with \`executiveSummary\`** - This is the most important field for decision-makers
2. Include all other required fields in order
3. Ensure all enums match exactly (case-sensitive)
4. All cost and time estimates should be ranges (e.g., "$45K-$65K", "6-8 weeks")
5. All file references should include actual file:line from the provided samples

**Format Requirements:**
- Do NOT wrap in markdown code blocks
- Do NOT include \`\`\`json or any other formatting
- Start your response directly with { and end with }
- Ensure valid JSON (proper escaping, no trailing commas)

**Validation Checklist:**
- [ ] \`executiveSummary\` appears first
- [ ] \`topIssues\` has maximum 3 items
- [ ] \`recommendation\` is one of the 5 valid enum values
- [ ] \`overallAssessment\` is one of the 6 valid enum values
- [ ] \`toolsUsed.methodology\` discloses analysis approach
- [ ] All file references are from actual provided samples`;
}
