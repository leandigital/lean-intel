/**
 * Security Analyzer - API-optimized prompt
 * Adapted from: ../../analyzer/SECURITY_ANALYZER.md
 */

import { z } from 'zod';
import { gradeSchema, severitySchema, vulnerabilitySchema, type PromptMetadata } from './shared';

export const securityAnalyzerMetadata: PromptMetadata = {
  name: 'security',
  version: '1.0',
  description: 'Analyzes security vulnerabilities, CVEs, and hardcoded secrets',
  estimatedTokens: {
    input: { small: 40000, medium: 62000, large: 100000 },
    output: { small: 2000, medium: 3500, large: 5000 },
  },
};

// Output schema for validation (using shared schemas where applicable)
export const securityAnalyzerOutputSchema = z.object({
  overallGrade: gradeSchema,
  score: z.number().min(0).max(100),
  summary: z.string(),
  criticalIssues: z.array(
    z.object({
      severity: severitySchema,
      category: z.string(),
      issue: z.string(),
      location: z.string(),
      impact: z.string(),
      remediation: z.string(),
      cveId: z.string().nullable().optional(),
    })
  ),
  vulnerabilities: z.object({
    dependencies: z.array(vulnerabilitySchema),
    hardcodedSecrets: z.array(
      z.object({
        type: z.string(),
        file: z.string(),
        line: z.number().nullable().optional(),
        pattern: z.string(),
      })
    ),
    insecurePatterns: z.array(
      z.object({
        pattern: z.string(),
        file: z.string(),
        line: z.number().nullable().optional(),
        risk: z.string(),
      })
    ),
  }),
  recommendations: z.array(z.string()),
});

export type SecurityAnalyzerOutput = z.infer<typeof securityAnalyzerOutputSchema>;

interface SecurityAnalyzerContext {
  projectType: string;
  frameworks: string[];
  languages: string[];
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
  fileTree: string;
  packageJsonContent?: string;
  requirementsTxtContent?: string;
  hasDatabase: boolean;
  hasAuthentication: boolean;
  hasAPIEndpoints: boolean;
  environmentFiles: string[];
  configFiles: string[];
  isMobile?: boolean;
  mobileFramework?: 'react-native' | 'expo' | 'flutter' | 'ios-native' | 'android-native';
  // NEW: Real security data
  npmAuditOutput?: string | null;
  codeSamples?: Record<string, string>; // file path -> content
}

/**
 * Generate security analyzer prompt
 */
export function generateSecurityAnalyzerPrompt(context: SecurityAnalyzerContext): string {
  const {
    projectType,
    frameworks,
    languages,
    dependencies,
    devDependencies,
    fileTree,
    packageJsonContent,
    requirementsTxtContent,
    hasDatabase,
    hasAuthentication,
    hasAPIEndpoints,
    environmentFiles,
    configFiles,
  } = context;

  return `# Security Vulnerability Analysis

🚨 CRITICAL RULE #0: ZERO INVENTED CODE - ONLY ACTUAL CODEBASE REFERENCES

**MOST CRITICAL RULE**: NEVER invent, fabricate, or create code examples for security issues. EVERY finding must cite ACTUAL code from ACTUAL files.

FORBIDDEN (Invented Code Examples):
❌ ANY "here's how to fix it" code you write
❌ "✅ CORRECT:" followed by code you made up
❌ Template examples for "secure" implementation
❌ "Best practice" code not from the codebase
❌ ANY security fix code you didn't find in actual files

FORBIDDEN (Generic Placeholders):
❌ "your-app/config.ts"
❌ "YourController.ts"
❌ "example-service"
❌ "import { X } from 'Y'" (when import doesn't exist)

REQUIRED (ONLY Actual Code/Findings):
✅ Code COPIED from actual files showing ACTUAL vulnerability
✅ "src/config/database.ts:45-50" (cite actual vulnerable code)
✅ "axios@0.21.1" (actual version from dependencies)
✅ Actual CVE numbers for actual packages
✅ Hardcoded secrets found in actual files (with file:line)

VERIFICATION BEFORE REPORTING:
1. Did I find this vulnerability in actual code? → If NO, DON'T REPORT IT
2. Do I have file:line reference? → If NO, DON'T REPORT IT
3. Can I show the actual vulnerable code? → If NO, DON'T REPORT IT
4. Is this package actually in dependencies? → If NO, DON'T REPORT IT

HOW TO REPORT VULNERABILITIES:
❌ WRONG: Invent "how to fix" code

✅ CORRECT: Cite actual vulnerable code
"SQL Injection in src/controllers/UserController.ts:45-52:
\`\`\`typescript
// ACTUAL CODE FROM FILE (lines 45-52)
const query = \`SELECT * FROM users WHERE id = \${req.params.id}\`;
\`\`\`
This code uses string interpolation without parameterization."

**ABSOLUTE RULE**: If you didn't READ the VULNERABILITY from a FILE, DON'T REPORT IT.

---

🚨 CRITICAL: ZERO HALLUCINATION TOLERANCE FOR SECURITY FINDINGS

NEVER report a security vulnerability, CVE, hardcoded secret, or security issue without verifying it exists in actual code with file:line references.

FORBIDDEN:
- ❌ "Hardcoded API key in config.ts" when no key exists
- ❌ "SQL injection in UserController" when no such code exists
- ❌ "Vulnerable axios@0.19.0" without verifying actual version
- ❌ "XSS vulnerability" without showing actual vulnerable code

REQUIRED: Every security finding MUST include file:line + code evidence.
FORMAT: "[Issue]: [Description] in [File:Line] - [Evidence]"

False security findings cause panic and loss of trust. Verify everything.

---

You are a senior security engineer conducting a comprehensive security audit of a ${projectType} project.

## Project Context

**Project Type:** ${projectType}
**Frameworks:** ${frameworks.join(', ') || 'None'}
**Languages:** ${languages.join(', ')}
**Database:** ${hasDatabase ? 'Yes' : 'No'}
**Authentication:** ${hasAuthentication ? 'Yes' : 'No'}
**API Endpoints:** ${hasAPIEndpoints ? 'Yes' : 'No'}
${context.isMobile ? `**Mobile Platform:** ${context.mobileFramework || 'Unknown'}` : ''}

### Dependencies

**Production Dependencies:**
${Object.entries(dependencies)
  .slice(0, 50)
  .map(([pkg, ver]) => `- ${pkg}: ${ver}`)
  .join('\n')}
${Object.keys(dependencies).length > 50 ? `... and ${Object.keys(dependencies).length - 50} more` : ''}

**Dev Dependencies:**
${Object.entries(devDependencies)
  .slice(0, 30)
  .map(([pkg, ver]) => `- ${pkg}: ${ver}`)
  .join('\n')}

### File Structure

\`\`\`
${fileTree}
\`\`\`

${packageJsonContent ? `### package.json\n\`\`\`json\n${packageJsonContent}\n\`\`\`` : ''}
${requirementsTxtContent ? `### requirements.txt\n\`\`\`\n${requirementsTxtContent}\n\`\`\`` : ''}

### Environment & Config Files

${environmentFiles.length > 0 ? environmentFiles.join('\n') : 'None detected'}
${configFiles.length > 0 ? '\n\nConfig files:\n' + configFiles.join('\n') : ''}

${context.npmAuditOutput ? `### NPM Audit Results (REAL CVE DATA)

**IMPORTANT:** Use these REAL CVE findings as your primary source for dependency vulnerabilities.
This is the output from \`npm audit --json\`:

\`\`\`json
${context.npmAuditOutput.substring(0, 8000)}
\`\`\`
` : ''}

${context.codeSamples && Object.keys(context.codeSamples).length > 0 ? `### Code Samples for Pattern Analysis

**CRITICAL**: The following contains ACTUAL CODE from the codebase. Analyze these files for security vulnerabilities:

${Object.entries(context.codeSamples)
  .slice(0, 15)
  .map(([path, content]) => `#### ${path}\n\`\`\`typescript\n${content.substring(0, 2500)}\n\`\`\``)
  .join('\n\n')}
` : ''}

---

## Your Task

⚠️ **CRITICAL: DO NOT SKIP ANY ANALYSIS CATEGORIES**

You MUST analyze ALL security aspects listed below. This is NON-NEGOTIABLE:
- ✅ Analyze EVERY category, even if you find no issues
- ✅ For categories with no issues, document "No issues detected"
- ✅ DO NOT skip categories because you think they're "not applicable"
- ❌ Partial analysis is NOT acceptable
- ❌ Skipping categories will result in INVALID output

**Consequence**: Incomplete analysis will be rejected and must be regenerated.

Perform a comprehensive security analysis focusing on:

### 1. Dependency Vulnerabilities
- Check all dependencies for known CVEs
- Identify outdated packages with security issues
- Flag transitive dependency vulnerabilities
- Provide CVE IDs where applicable
- Recommend version upgrades

### 2. Hardcoded Secrets
- Scan for API keys, tokens, passwords
- Check for database connection strings
- Look for AWS/GCP/Azure credentials
- Identify private keys or certificates
- Check environment files for exposed secrets

### 3. Insecure Code Patterns
${projectType === 'backend' ? `
- SQL injection vulnerabilities
- Command injection risks
- Path traversal vulnerabilities
- Insecure deserialization
- Missing input validation
- Authentication/authorization flaws
- Session management issues
- CORS misconfiguration
- Rate limiting absence
` : projectType === 'frontend' ? `
- XSS vulnerabilities
- Insecure data storage (localStorage with sensitive data)
- Exposed API keys in client code
- Missing CSP headers
- Insecure third-party scripts
- CSRF vulnerabilities
- Clickjacking risks
` : projectType === 'devops' ? `
- Overly permissive IAM policies
- Unencrypted storage
- Public S3 buckets
- Missing network security groups
- Hardcoded credentials in IaC
- Insecure default configurations
- Missing encryption at rest/transit
` : ''}
${context.isMobile ? `
### Mobile-Specific Security Checks (${context.mobileFramework})

**Critical Mobile Vulnerabilities:**
- M1: Insecure Local Storage (AsyncStorage, UserDefaults, SharedPreferences without encryption)
- M2: Hardcoded Secrets in mobile configs (Info.plist, AndroidManifest.xml, app.json)
- M3: Insecure Deep Link Handling (URL scheme vulnerabilities)
- M4: Insecure Network Communication (HTTP instead of HTTPS, missing certificate pinning)
- M5: Missing Certificate Pinning for API calls
- M6: Missing Root/Jailbreak Detection
- M7: Insecure WebView Configuration (JavaScript injection)
- M8: Exposed API Keys in mobile code
- M9: Insecure Biometric Authentication
- M10: Missing Binary Protection (code obfuscation, reverse engineering)

**Platform-Specific Checks:**
${context.mobileFramework === 'react-native' || context.mobileFramework === 'expo' ? `
- Check for plaintext AsyncStorage usage with sensitive data
- Verify secure storage usage (react-native-keychain, expo-secure-store)
- Check for hardcoded secrets in app.json, app.config.js
- Verify deep link validation in linking configuration
- Check for __DEV__ mode code leaks to production
- Verify Hermes bytecode or other obfuscation
` : context.mobileFramework === 'flutter' ? `
- Check for plaintext SharedPreferences usage
- Verify flutter_secure_storage usage for sensitive data
- Check for hardcoded secrets in pubspec.yaml
- Verify SSL certificate validation (not bypassed)
- Check for debug print statements with sensitive data
` : context.mobileFramework === 'ios-native' ? `
- Check for plaintext UserDefaults usage
- Verify Keychain Services usage for credentials
- Check for hardcoded secrets in Info.plist
- Verify NSAppTransportSecurity configuration
- Check for jailbreak detection implementation
- Verify binary protection (anti-debugging, code signing)
` : context.mobileFramework === 'android-native' ? `
- Check for plaintext SharedPreferences usage
- Verify EncryptedSharedPreferences or Keystore usage
- Check for hardcoded secrets in AndroidManifest.xml, build.gradle
- Verify network security config (cleartext traffic)
- Check for root detection implementation
- Verify ProGuard/R8 obfuscation configuration
` : ''}
` : ''}

### 4. Security Best Practices
- HTTPS/TLS configuration
- Dependency update strategy
- Security headers
- Error handling (information disclosure)
- Logging sensitive data
- Secret management approach

---

## Output Format

Provide your analysis as a JSON object matching this structure:

\`\`\`json
{
  "overallGrade": "A" | "B" | "C" | "D" | "F",
  "score": 85,
  "summary": "Brief 2-3 sentence summary of security posture",
  "criticalIssues": [
    {
      "severity": "Critical" | "High" | "Medium" | "Low",
      "category": "Dependency Vulnerability" | "Hardcoded Secret" | "Insecure Pattern" | "Configuration",
      "issue": "Detailed description of the issue",
      "location": "package.json -> express@4.16.0" | "src/config/db.ts:15" | "terraform/main.tf:45",
      "impact": "What happens if exploited",
      "remediation": "Specific steps to fix",
      "cveId": "CVE-2021-12345" // if applicable
    }
  ],
  "vulnerabilities": {
    "dependencies": [
      {
        "package": "express",
        "currentVersion": "4.16.0",
        "vulnerability": "Denial of Service via malformed Accept-Encoding header",
        "severity": "High",
        "fixedVersion": "4.17.3",
        "cveId": "CVE-2022-24999"
      }
    ],
    "hardcodedSecrets": [
      {
        "type": "AWS Access Key",
        "file": "src/config/aws.ts",
        "line": 12,
        "pattern": "AKIA..."
      }
    ],
    "insecurePatterns": [
      {
        "pattern": "SQL query concatenation without parameterization",
        "file": "src/services/users.ts",
        "line": 45,
        "risk": "SQL injection vulnerability"
      }
    ]
  },
  "recommendations": [
    "Upgrade express to 4.17.3+ to fix CVE-2022-24999",
    "Move hardcoded AWS credentials to environment variables",
    "Implement parameterized queries in src/services/users.ts",
    "Add helmet.js for security headers",
    "Implement rate limiting on API endpoints"
  ]
}
\`\`\`

### Recommendations Formatting

**IMPORTANT:** Format recommendations as clear, actionable strings:

- Write each recommendation as a complete, imperative sentence
- Include specific version numbers, file paths, or package names where relevant
- Be concise but descriptive (e.g., "Upgrade express to 4.17.3+ to fix CVE-2022-24999")
- Prioritize critical security issues first in the array

All recommendations should be plain text strings - NO nested markdown, NO special formatting.

## 📝 Formatting & Presentation Guidelines

**IMPORTANT:** Structure your JSON content for maximum readability and impact.

### Emoji Usage (Minimal & Professional)

Use emojis sparingly in text values to enhance scanning:
- **NEVER in severity field** - Must be exact enum: "Critical", "High", "Medium", "Low", "Informational"
- **Categories**: 🔐 Security | 💾 Data | 🌐 Network | 📱 Mobile | 🏗️ Infrastructure | 📦 Dependencies
- **In descriptions**: 🚨 for critical issues, ⚠️ for warnings, ✅ for secure/resolved

### Content Writing Style

**In summary and issue descriptions, be**:
- **Concise**: 2-3 sentences max per paragraph
- **Specific**: Include exact file:line references
- **Actionable**: Every issue needs clear remediation
- **Professional but engaging**: Avoid dry technical jargon
- **Helpful**: Explain "why" it matters, not just "what" is wrong

**Example of well-written issue**:
"issue": "🚨 Hardcoded AWS credentials in src/config/aws.ts:15 expose your entire AWS account. The access key AKIA... is visible in source code."

**vs. dry version**:
"issue": "AWS credentials found in configuration file"

### Structure Your Text

- **Use bullet points** for lists (in remediation, impact, etc.)
- **Use code formatting** (backticks) for file names, package names, code snippets
- **Use bold** (double asterisks) for emphasis on critical terms
- **Keep it scannable**: Short paragraphs, clear structure

## Critical Rules

1. **BE SPECIFIC:** Include exact file paths, line numbers, package names, versions
2. **BE ACCURATE:** Only report issues you can verify from the provided context
3. **PRIORITIZE:** Focus on Critical and High severity issues first
4. **BE ACTIONABLE:** Every issue must have a clear remediation step
5. **NO ASSUMPTIONS:** If you can't verify an issue from the context, don't report it
6. **CVE IDs:** Include CVE identifiers for known vulnerabilities
7. **ENGAGING FORMAT:** Use emojis and clear language to make reports scannable
8. **GRADE CRITERIA:**
   - A (90-100): No critical/high issues, excellent security practices
   - B (80-89): Minor issues, good security practices
   - C (70-79): Several medium issues or 1-2 high issues
   - D (60-69): Multiple high issues or 1 critical issue
   - F (<60): Multiple critical issues or severe security gaps

Focus on issues that are ACTUALLY PRESENT in the provided context. Do not speculate about issues in files you cannot see.

## Output Instructions

Return ONLY valid JSON. Do not wrap in markdown code blocks. Do not include \`\`\`json or any other formatting.
Start your response directly with { and end with }.`;
}
