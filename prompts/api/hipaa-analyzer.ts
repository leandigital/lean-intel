/**
 * HIPAA Compliance Analyzer - API-optimized prompt
 * Adapted from: ../../analyzer/HIPAA_ANALYZER.md
 */

import { z } from 'zod';

export const hipaaAnalyzerMetadata = {
  name: 'hipaa',
  version: '1.0',
  description: 'Analyzes HIPAA compliance for healthcare applications',
  estimatedTokens: {
    input: { small: 45000, medium: 71000, large: 110000 },
    output: { small: 3000, medium: 5000, large: 8000 },
  },
};

// Output schema - uses passthrough() to allow LLM to add additional fields
export const hipaaAnalyzerOutputSchema = z.object({
  overallGrade: z.enum(['A', 'B', 'C', 'D', 'F']),
  score: z.number().min(0).max(100),
  summary: z.string(),
  phiDataFlow: z.object({
    phiFields: z.array(
      z.object({
        field: z.string(),
        location: z.string(),
        type: z.string(),
        sensitivity: z.string(), // Allow any sensitivity descriptor (High, Medium, Low, Medium-High, etc.)
        evidence: z.string().optional(),
        notes: z.string().optional(), // LLM may add notes
      }).passthrough()
    ),
    phiTransmission: z.array(
      z.object({
        from: z.string(),
        to: z.string(),
        encrypted: z.union([z.boolean(), z.string()]), // Allow "Unknown"
        protocol: z.string(),
        evidence: z.string().optional(),
        concern: z.string().optional(),
      }).passthrough()
    ),
    phiInLogs: z.array(
      z.object({
        location: z.string(),
        risk: z.string(),
        concern: z.string().optional(),
      }).passthrough()
    ).optional(),
    phiInStorage: z.array(
      z.object({
        location: z.string(),
        encrypted: z.boolean(),
        evidence: z.string().optional(),
        concern: z.string().optional(),
      }).passthrough()
    ).optional(),
    // LLM may add frontend-specific analysis fields
    clientStorageAnalysis: z.record(z.string(), z.any()).optional(),
    urlParameterAnalysis: z.record(z.string(), z.any()).optional(),
  }).passthrough(),
  complianceGaps: z.array(
    z.object({
      regulation: z.string(), // §164.312(a)(1)
      requirement: z.string(),
      status: z.string(), // Allow flexible status values
      finding: z.string(),
      evidence: z.string().optional(),
      risk: z.string(), // Allow any risk level (Critical, High, Medium, Low, Medium-High, Low-Medium, etc.)
      penalty: z.string().optional(),
      remediation: z.string(),
      cost: z.string(),
    })
  ),
  technicalSafeguards: z.object({
    accessControl: z.object({
      status: z.string(),
      findings: z.array(z.string()),
      regulation: z.string(),
      evidence: z.string().optional(),
      grade: z.string().optional(), // LLM may add grade
      notes: z.string().optional(), // LLM may add notes
    }).passthrough(),
    auditControls: z.object({
      status: z.string(),
      findings: z.array(z.string()),
      regulation: z.string(),
      evidence: z.string().optional(),
      grade: z.string().optional(),
      notes: z.string().optional(),
    }).passthrough(),
    integrityControls: z.object({
      status: z.string(),
      findings: z.array(z.string()),
      regulation: z.string(),
      evidence: z.string().optional(),
      grade: z.string().optional(),
    }).passthrough(),
    transmissionSecurity: z.object({
      status: z.string(),
      findings: z.array(z.string()),
      regulation: z.string(),
      evidence: z.string().optional(),
      grade: z.string().optional(),
    }).passthrough(),
    personAuthentication: z.object({
      status: z.string(),
      findings: z.array(z.string()),
      regulation: z.string(),
      evidence: z.string().optional(),
    }).passthrough().optional(),
  }).passthrough(),
  physicalSafeguards: z.object({
    facilityAccess: z.object({
      status: z.string(),
      findings: z.array(z.string()),
      regulation: z.string().optional(),
      evidence: z.string().optional(),
      notes: z.string().optional(),
    }).passthrough(),
    workstationSecurity: z.object({
      status: z.string(),
      findings: z.array(z.string()),
      regulation: z.string().optional(),
    }).passthrough().optional(),
    deviceMediaControls: z.object({
      status: z.string(),
      findings: z.array(z.string()),
      regulation: z.string().optional(),
      evidence: z.string().optional(),
    }).passthrough().optional(),
  }).passthrough(),
  administrativeSafeguards: z.object({
    securityManagement: z.object({
      status: z.string(),
      findings: z.array(z.string()),
      regulation: z.string().optional(),
      evidence: z.string().optional(),
    }).passthrough(),
    assignedSecurityResponsibility: z.object({
      status: z.string(),
      findings: z.array(z.string()),
      regulation: z.string().optional(),
    }).passthrough().optional(),
    workforceTraining: z.object({
      status: z.string(),
      findings: z.array(z.string()),
      regulation: z.string().optional(),
      evidence: z.string().optional(),
    }).passthrough(),
    baaCompliance: z.object({
      required: z.boolean(),
      status: z.string(),
      findings: z.array(z.string()),
      regulation: z.string().optional(),
      evidence: z.string().optional(),
    }).passthrough(),
    contingencyPlan: z.object({
      status: z.string(),
      findings: z.array(z.string()),
      regulation: z.string().optional(),
    }).passthrough().optional(),
  }).passthrough(),
  criticalViolations: z.array(
    z.object({
      violation: z.string(),
      regulation: z.string(),
      severity: z.string(), // Allow any severity descriptor (Critical, High, Medium-High, etc.)
      penalty: z.string(),
      evidence: z.string().optional(),
      remediation: z.string(),
    }).passthrough()
  ),
  recommendations: z.array(
    z.object({
      priority: z.string(), // Allow any string for flexible priority formats
      action: z.string(),
      regulation: z.string(),
      effort: z.string(),
      cost: z.string(),
      rationale: z.string().optional(),
      implementation: z.string().optional(), // LLM may add implementation details
    }).passthrough()
  ),
  regulatoryRisk: z.object({
    fineRisk: z.string(),
    litigationRisk: z.string(),
    reputationalRisk: z.string(),
    breachNotificationRisk: z.string().optional(),
    ocr_audit_risk: z.string().optional(),
    overallAssessment: z.string(),
    immediateActions: z.array(z.string()).optional(),
  }).passthrough(),
  // LLM may add frontend-specific findings for frontend projects
  frontendSpecificFindings: z.record(z.string(), z.any()).optional(),
  // LLM may add grading rationale explaining the score
  gradingRationale: z.object({
    score: z.number().optional(),
    grade: z.string().optional(),
    reasoning: z.string().optional(),
  }).passthrough().optional(),
}).passthrough(); // Allow additional top-level fields

export type HIPAAAnalyzerOutput = z.infer<typeof hipaaAnalyzerOutputSchema>;

interface HIPAAAnalyzerContext {
  projectType: string;
  frameworks: string[];
  languages: string[];
  hasDatabase: boolean;
  databaseType?: string;
  hasAuthentication: boolean;
  hasEncryption: boolean;
  hasAuditLogging: boolean;
  sampleDatabaseSchema: Record<string, string>;
  sampleAuthCode: Record<string, string>;
  sampleAPICode: Record<string, string>;
  environmentFiles: string[];
  configFiles: string[];
  hasBAA: boolean;
  cloudProvider?: string;
  isMobile?: boolean;
  mobileFramework?: 'react-native' | 'expo' | 'flutter' | 'ios-native' | 'android-native';
}

/**
 * Generate HIPAA analyzer prompt
 */
export function generateHIPAAAnalyzerPrompt(context: HIPAAAnalyzerContext): string {
  const {
    projectType,
    frameworks,
    languages,
    hasDatabase,
    databaseType,
    hasAuthentication,
    hasEncryption,
    hasAuditLogging,
    sampleDatabaseSchema,
    sampleAuthCode,
    sampleAPICode,
    hasBAA,
    cloudProvider,
  } = context;

  return `# HIPAA Compliance Analysis

🚨 CRITICAL RULE #0: ZERO INVENTED CODE - ONLY ACTUAL CODEBASE REFERENCES

**MOST CRITICAL RULE**: NEVER invent, fabricate, or create code examples for HIPAA issues. EVERY finding must cite ACTUAL code from ACTUAL files.

FORBIDDEN (Invented Code Examples):
❌ ANY "here's how to implement encryption" code you write
❌ "✅ CORRECT:" followed by code you made up
❌ Template examples for "HIPAA-compliant" code
❌ "Best practice" code not from the codebase
❌ ANY compliance fix code you didn't find in actual files

FORBIDDEN (Generic Placeholders):
❌ "your-app/models/..."
❌ "SamplePatient.ts"
❌ "example-phi-field"

REQUIRED (ONLY Actual Code/Findings):
✅ Code COPIED from actual files showing ACTUAL PHI handling
✅ "src/models/Patient.ts:23-30" (cite actual code)
✅ Actual PHI field names from actual schema
✅ Actual database encryption config from actual files

VERIFICATION BEFORE REPORTING:
1. Did I find this HIPAA issue in actual code? → If NO, DON'T REPORT IT
2. Do I have file:line reference? → If NO, DON'T REPORT IT
3. Can I show actual PHI fields? → If NO, DON'T REPORT IT

**ABSOLUTE RULE**: If you didn't READ the HIPAA ISSUE from a FILE, DON'T REPORT IT.

---

🚨 CRITICAL: ZERO HALLUCINATION TOLERANCE FOR HIPAA COMPLIANCE

NEVER report PHI exposure, missing encryption, or HIPAA violations without verifying in actual code/config with file:line references.

FORBIDDEN:
- ❌ "PHI in plaintext" without verifying database schema
- ❌ "No audit logging" when logging exists elsewhere
- ❌ "SSN in logs" without finding actual logging code

REQUIRED: Verify database schemas, configs, PHI handling code.
FORMAT: "[HIPAA §XXX]: [Issue] in [File:Line] - [Evidence]"

---

You are a healthcare compliance expert analyzing HIPAA technical compliance.

## Project Context

**Project Type:** ${projectType}
**Industry:** Healthcare (HIPAA-regulated)
**Frameworks:** ${frameworks.join(', ') || 'None'}
**Languages:** ${languages.join(', ')}
**Cloud Provider:** ${cloudProvider || 'Unknown'}

### Current Security Posture

**Database:** ${hasDatabase ? `Yes (${databaseType || 'type unknown'})` : 'No'}
**Authentication:** ${hasAuthentication ? 'Yes' : 'No'}
**Encryption:** ${hasEncryption ? 'Yes (needs verification)' : 'No/Unknown'}
**Audit Logging:** ${hasAuditLogging ? 'Yes' : 'No'}
**BAA with Cloud Provider:** ${hasBAA ? 'Yes' : 'Unknown'}

### Database Schema (PHI Detection)

${Object.entries(sampleDatabaseSchema)
  .map(([table, schema]) => `\n**Table: ${table}**\n\`\`\`sql\n${schema.substring(0, 800)}\n\`\`\``)
  .join('\n')}

### Authentication Code

${Object.entries(sampleAuthCode)
  .slice(0, 2)
  .map(([file, code]) => `\n**${file}:**\n\`\`\`\n${code.substring(0, 600)}\n...\n\`\`\``)
  .join('\n')}

### API Code (PHI Transmission)

${Object.entries(sampleAPICode)
  .slice(0, 3)
  .map(([file, code]) => `\n**${file}:**\n\`\`\`\n${code.substring(0, 600)}\n...\n\`\`\``)
  .join('\n')}

---

## Your Task

⚠️ **CRITICAL: DO NOT SKIP ANY ANALYSIS CATEGORIES**

You MUST analyze ALL HIPAA compliance aspects listed below. This is NON-NEGOTIABLE:
- ✅ Analyze EVERY safeguard category, even if you find no issues
- ✅ For categories with no issues, document "Compliant - No issues detected"
- ✅ DO NOT skip categories because you think they're "not applicable"
- ❌ Partial analysis is NOT acceptable
- ❌ Skipping categories will result in INVALID output

**Consequence**: Incomplete analysis will be rejected and must be regenerated.

Analyze HIPAA compliance across the Security Rule requirements:

## 🚨 PROJECT-TYPE-SPECIFIC ANALYSIS REQUIREMENTS

**CRITICAL:** Adjust your analysis based on project type. DO NOT report violations for features that don't apply to this project type.

${projectType === 'frontend' ? `
### Frontend Project Analysis Guidelines

**THIS IS A FRONTEND-ONLY PROJECT** - Adjust expectations accordingly:

**✅ FOCUS ON (Frontend Responsibilities):**
- Client-side storage security (localStorage, sessionStorage, cookies, IndexedDB)
- PHI transmission security to backend APIs (HTTPS/TLS)
- Form input validation and sanitization
- Authentication token handling
- PHI in browser console logs or error messages
- Third-party script security (analytics, chat widgets)
- Client-side encryption before sending to backend
- Session timeout and automatic logout

**❌ DO NOT EXPECT (Backend Responsibilities):**
- ❌ Database encryption at rest (NO DATABASE IN FRONTEND)
- ❌ Server-side audit logging (frontend cannot implement server logs)
- ❌ Backend access controls (not a frontend concern)
- ❌ Database connection encryption (frontend has no database connection)
- ❌ Server-side session management (unless using server-rendered app)

**Frontend-Specific HIPAA Concerns:**
1. **Client Storage:** Is PHI stored in localStorage/cookies? (HIPAA violation if unencrypted)
2. **Transmission:** Are API calls using HTTPS/TLS 1.2+?
3. **URL Parameters:** Is PHI in URL query params? (visible in browser history)
4. **Console Logs:** Is PHI logged to browser console?
5. **Form Validation:** Client-side validation present? (not a compliance requirement, but good practice)
6. **Third-Party Scripts:** Are analytics/chat widgets capturing PHI?

**Grade Fairly for Frontend:**
- Don't penalize for missing database encryption (no database exists)
- Don't penalize for missing server-side audit logs (cannot implement)
- Focus on transmission security, client storage, and PHI exposure in frontend code

` : projectType === 'backend' ? `
### Backend Project Analysis Guidelines

**THIS IS A BACKEND/API PROJECT** - Full HIPAA requirements apply:

**✅ EXPECT (Backend Must Have):**
- Database encryption at rest
- Audit logging of all PHI access
- Access controls and authorization
- Encrypted database connections
- Session management and timeout
- Secure password storage (bcrypt, argon2)
- Rate limiting
- Input validation and sanitization
- API authentication (JWT, OAuth)

**❌ DO NOT EXPECT (Frontend Responsibilities):**
- ❌ Form UI validation (backend has no forms)
- ❌ Client-side storage concerns (backend has no browser storage)

**Backend-Specific HIPAA Concerns:**
1. **Database Encryption at Rest:** Required for all PHI
2. **Audit Logging:** Must log who accessed what PHI when
3. **Access Controls:** Role-based access to PHI
4. **Connection Security:** Database connections encrypted
5. **API Security:** Authentication, authorization on all PHI endpoints
6. **Backup Security:** Encrypted backups required

` : projectType === 'devops' ? `
### DevOps/Infrastructure Project Analysis Guidelines

**THIS IS A DEVOPS/INFRASTRUCTURE PROJECT** - Focus on infrastructure compliance:

**✅ FOCUS ON:**
- Infrastructure encryption (RDS encryption, EBS encryption, S3 encryption)
- Network security (VPC, security groups, NACLs)
- IAM policies and least privilege
- Backup and disaster recovery
- Logging and monitoring infrastructure
- Cloud provider BAAs (AWS, GCP, Azure)

**❌ DO NOT EXPECT:**
- ❌ Application code security (no application code in IaC)
- ❌ Frontend/backend specific issues

` : ''}

${context.isMobile ? `
### Mobile Project Analysis Guidelines

**THIS IS A MOBILE APPLICATION** - Mobile-specific HIPAA requirements apply:

**✅ MOBILE-SPECIFIC REQUIREMENTS:**
- Encrypted device storage (Keychain, EncryptedSharedPreferences, SecureStore)
- Backup exclusion for PHI (iCloud/Google Drive backups)
- Screenshot prevention on PHI screens
- Biometric authentication
- Certificate pinning for API calls
- Root/jailbreak detection
- Secure clipboard handling

**❌ DO NOT EXPECT:**
- ❌ Database encryption at rest (unless mobile app has local SQLite with PHI)
- ❌ Server-side audit logging (mobile app cannot implement backend logs)

` : ''}

### 1. PHI Data Flow Mapping

**Identify PHI (Protected Health Information):**

**18 HIPAA Identifiers:**
1. Names
2. Dates (birth, admission, discharge, death)
3. Phone/fax numbers
4. Email addresses
5. SSN
6. Medical record numbers
7. Health plan beneficiary numbers
8. Account numbers
9. Certificate/license numbers
10. Vehicle identifiers
11. Device identifiers/serial numbers
12. URLs
13. IP addresses
14. Biometric identifiers
15. Full-face photos
16. Geographic subdivisions smaller than state
17. Any unique identifying number/code
18. Age if >89 years

**Map PHI Fields:**
- Which database tables/columns contain PHI?
- What API endpoints expose PHI?
- Where is PHI logged?
- Is PHI in localStorage/cookies?

**Map PHI Transmission:**
- Client → API: Encrypted? (HTTPS/TLS 1.2+?)
- API → Database: Encrypted in transit? Encrypted at rest?
- API → Third parties: Encrypted? BAA in place?
- Email/SMS with PHI: Encrypted?
${context.isMobile ? `

### 1.1. Mobile-Specific PHI Concerns (${context.mobileFramework})

**CRITICAL Mobile PHI Risks:**

1. **PHI on Device Storage:**
   - AsyncStorage (React Native): UNENCRYPTED - CRITICAL violation
   - UserDefaults (iOS): UNENCRYPTED - CRITICAL violation
   - SharedPreferences (Android): UNENCRYPTED - CRITICAL violation
   - Must use: Keychain (iOS), EncryptedSharedPreferences (Android), expo-secure-store, react-native-encrypted-storage

2. **Mobile Backup Exposure (§164.310(d)):**
   - PHI backed up to iCloud/Google Drive = PHI disclosure to third party without BAA
   - Must exclude PHI from device backups (NSURLIsExcludedFromBackupKey, android:allowBackup=false)

3. **Screenshot/Screen Recording:**
   - PHI visible in screenshots saved to camera roll
   - Must prevent screenshots on PHI screens (FLAG_SECURE on Android)

4. **PHI in Logs/Crash Reports:**
   - Sentry, Firebase Crashlytics may capture PHI in stack traces
   - Must configure PII scrubbing in mobile crash reporting

5. **Push Notifications with PHI:**
   - "John Doe - Appointment at 3pm" in notification = PHI exposure
   - Must use generic notifications only

6. **Clipboard PHI Exposure:**
   - Patient SSN copied to clipboard accessible by other apps
   - Must disable copy on PHI fields

7. **Device Loss/Theft (§164.310(d)):**
   - Lost device = PHI breach
   - Must implement: Remote wipe, device revocation, biometric auth

**Mobile PHI Storage Examples to Check:**
- AsyncStorage.setItem('patientData', ...) ← CRITICAL
- await SecureStore.setItemAsync('patientData', ...) ← COMPLIANT
` : ''}

### 2. Technical Safeguards (§164.312)

**§164.312(a)(1) - Access Control:**
- **Unique User IDs:** Each user has unique login?
- **Emergency Access:** Break-glass procedure?
- **Automatic Logoff:** Session timeout implemented?
- **Encryption & Decryption:** PHI encrypted at rest and in transit?

**§164.312(b) - Audit Controls:**
- **Audit Logs:** Who accessed what PHI, when?
- **Tamper-Proof:** Logs cannot be modified?
- **Retention:** Logs kept for 6 years?

**§164.312(c) - Integrity:**
- **Data Integrity:** Mechanisms to ensure PHI not altered/destroyed?
- **Checksums/hashing:** Verify data hasn't changed?

**§164.312(e) - Transmission Security:**
- **TLS 1.2+:** All PHI transmissions encrypted?
- **End-to-End Encryption:** PHI encrypted from client to database?
- **No PHI in URLs:** Sensitive data not in query params?

### 3. Physical Safeguards (§164.310) - Infrastructure

**§164.310(a) - Facility Access:**
- **Data Centers:** Cloud provider HIPAA-compliant? (AWS, GCP HIPAA-eligible services?)
- **BAA Required:** Business Associate Agreement with cloud provider?

**§164.310(d) - Device/Media Controls:**
- **Backup & Recovery:** Automated backups? Encrypted backups?
- **Data Disposal:** Secure deletion of PHI? (NIST 800-88 compliant?)

### 4. Administrative Safeguards (§164.308)

**§164.308(a)(1) - Security Management:**
- **Risk Analysis:** Evidence of security risk assessment?
- **Risk Management:** Plan to mitigate risks?

**§164.308(a)(3) - Workforce Training:**
- **HIPAA Training:** Developers trained on HIPAA?
- **Security Awareness:** Policies in place?

**§164.308(b)(1) - Business Associate Agreements:**
- **Cloud Provider BAA:** AWS, GCP, Azure BAA signed?
- **Third-Party BAAs:** Email, SMS, analytics services?

### 5. Critical Violations

Identify violations with high penalties:

**Tier 4 ($50K per violation):**
- Willful neglect (no PHI encryption, no audit logs)
- No BAA with cloud provider

**Common Violations:**
- PHI in plain text
- PHI in logs (CloudWatch, Sentry)
- PHI in URLs (query parameters)
- No audit trail
- No access controls (anyone can view any patient)
- PHI sent via unencrypted email

### 6. Remediation Roadmap

For each gap:
- **Regulation:** §164.312(a)(1)
- **Finding:** "PHI not encrypted at rest in PostgreSQL"
- **Risk:** Critical
- **Penalty:** $50,000 per violation (up to $1.5M/year)
- **Remediation:** "Enable AES-256 encryption on RDS"
- **Cost:** "$0 (AWS RDS feature), 4 hours implementation"

---

## Output Format

Return a JSON object:

\`\`\`json
{
  "overallGrade": "D",
  "score": 55,
  "summary": "Critical HIPAA violations: PHI not encrypted at rest, no audit logging, PHI in application logs.",
  "phiDataFlow": {
    "phiFields": [
      {
        "field": "patients.ssn",
        "location": "PostgreSQL database",
        "type": "Social Security Number",
        "sensitivity": "High"
      }
    ],
    "phiTransmission": [
      {
        "from": "React Frontend",
        "to": "Express API",
        "encrypted": true,
        "protocol": "HTTPS (TLS 1.3)"
      },
      {
        "from": "Express API",
        "to": "PostgreSQL",
        "encrypted": false,
        "protocol": "Unencrypted connection"
      }
    ]
  },
  "complianceGaps": [
    {
      "regulation": "§164.312(a)(2)(iv)",
      "requirement": "Encryption of PHI at rest",
      "status": "Non-Compliant",
      "finding": "PostgreSQL database does not have encryption at rest enabled",
      "risk": "Critical",
      "remediation": "Enable AWS RDS encryption with AES-256",
      "cost": "$0 (AWS feature), 4 hours"
    }
  ],
  "technicalSafeguards": {
    "accessControl": {
      "status": "Partial",
      "findings": [
        "✓ Unique user IDs (JWT authentication)",
        "✗ No automatic session timeout",
        "✗ PHI not encrypted at rest"
      ],
      "regulation": "§164.312(a)(1)"
    },
    "auditControls": {
      "status": "Non-Compliant",
      "findings": [
        "✗ No audit logging of PHI access",
        "✗ Cannot track who viewed patient records"
      ],
      "regulation": "§164.312(b)"
    },
    "integrityControls": {
      "status": "Partial",
      "findings": [
        "✓ Database constraints prevent invalid data",
        "✗ No checksums or digital signatures"
      ],
      "regulation": "§164.312(c)(1)"
    },
    "transmissionSecurity": {
      "status": "Partial",
      "findings": [
        "✓ HTTPS/TLS 1.3 for API",
        "✗ Database connection not encrypted",
        "✗ PHI found in CloudWatch logs"
      ],
      "regulation": "§164.312(e)(1)"
    }
  },
  "physicalSafeguards": {
    "facilityAccess": {
      "status": "Unknown",
      "findings": [
        "? BAA status with AWS unknown",
        "? Using HIPAA-eligible AWS services?"
      ]
    },
    "workstationSecurity": {
      "status": "N/A",
      "findings": ["Web application, not applicable"]
    }
  },
  "administrativeSafeguards": {
    "securityManagement": {
      "status": "Unknown",
      "findings": [
        "? No evidence of risk analysis",
        "? No documented security policies"
      ]
    },
    "workforceTraining": {
      "status": "Unknown",
      "findings": ["? No evidence of HIPAA training"]
    },
    "baaCompliance": {
      "required": true,
      "status": "Unknown",
      "findings": [
        "? AWS BAA status unknown",
        "? No BAA with logging service (CloudWatch)"
      ]
    }
  },
  "criticalViolations": [
    {
      "violation": "PHI not encrypted at rest",
      "regulation": "§164.312(a)(2)(iv)",
      "severity": "Critical",
      "penalty": "$50,000 per violation (Tier 4 - Willful Neglect)",
      "remediation": "Enable RDS encryption immediately"
    }
  ],
  "recommendations": [
    {
      "priority": "Critical",
      "action": "Enable database encryption at rest (AWS RDS encryption)",
      "regulation": "§164.312(a)(2)(iv)",
      "effort": "4 hours",
      "cost": "$0"
    },
    {
      "priority": "Critical",
      "action": "Implement audit logging for all PHI access",
      "regulation": "§164.312(b)",
      "effort": "2 weeks",
      "cost": "$5K"
    }
  ],
  "regulatoryRisk": {
    "fineRisk": "$100K-$500K (multiple Tier 4 violations)",
    "litigationRisk": "High (data breach = class action lawsuit)",
    "reputationalRisk": "Severe (healthcare trust is critical)",
    "overallAssessment": "HIPAA violations make this app legally unusable in healthcare setting. Must remediate before any patient data is processed."
  }
}
\`\`\`

## 📝 Formatting & Presentation Guidelines

**IMPORTANT:** Structure your JSON content for maximum readability and impact.

### Emoji Usage (Minimal & Professional)

Use emojis sparingly in text values to enhance scanning:
- **NEVER in severity field** - Must be exact enum: "Critical", "High", "Medium", "Low", "Informational"
- **Categories**: 🔐 Security | 💾 Data | 🏥 Healthcare | 📋 Compliance | ⚖️ Regulatory
- **In descriptions**: 🚨 for critical violations, ⚠️ for warnings, ✅ for compliant items

### Content Writing Style

**In summary and finding descriptions, be**:
- **Concise**: 2-3 sentences max per paragraph
- **Specific**: Include exact regulation citations (§164.312)
- **Actionable**: Every gap needs clear remediation
- **Professional but engaging**: Avoid dry legalese
- **Helpful**: Explain compliance importance, not just rules

**Example of well-written finding**:
"finding": "🚨 PHI stored in plain text in PostgreSQL (patients.ssn column). §164.312(a)(2)(iv) requires encryption at rest. Potential fine: $50K per violation."

### Structure Your Text

- **Use bullet points** for lists (in findings, remediation, etc.)
- **Use code formatting** (backticks) for table names, regulations, technical terms
- **Use bold** (double asterisks) for emphasis on critical terms
- **Keep it scannable**: Short paragraphs, clear structure

## Critical Rules

1. **BE SPECIFIC:** Reference exact §regulations, database fields, code files
2. **PHI FOCUS:** Map all 18 HIPAA identifiers found in the system
3. **REGULATORY ACCURACY:** Use correct HIPAA regulation numbers
4. **PENALTY AWARENESS:** Note potential fines (up to $50K/violation)
5. **ACTIONABLE:** Every gap must have remediation + cost
6. **ENGAGING FORMAT:** Use emojis and clear language to make reports scannable
7. **GRADE CRITERIA:**
   - A (90-100): Full compliance, encryption everywhere, audit logs, BAAs in place
   - B (80-89): Minor gaps, mostly compliant, some documentation missing
   - C (70-79): Several gaps, partial encryption, audit logs incomplete
   - D (60-69): Major gaps, PHI unencrypted or in logs, no audit trail
   - F (<60): Critical violations, no encryption, no BAA, PHI exposed

**WARNING:** Any "Critical" violation should result in grade D or F.

## Output Instructions

Return ONLY valid JSON. Do not wrap in markdown code blocks. Do not include \`\`\`json or any other formatting.
Start your response directly with { and end with }.`;
}
