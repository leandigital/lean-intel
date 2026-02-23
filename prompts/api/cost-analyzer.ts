/**
 * Cost & Scalability Analyzer - API-optimized prompt
 * Adapted from: ../../analyzer/COST_SCALABILITY_ANALYZER.md
 */

import { z } from 'zod';

export const costAnalyzerMetadata = {
  name: 'cost',
  version: '1.0',
  description: 'Analyzes unit economics, scaling bottlenecks, and cost projections',
  estimatedTokens: {
    input: { small: 55000, medium: 87000, large: 140000 },
    output: { small: 3000, medium: 5000, large: 8000 },
  },
};

// Output schema
export const costAnalyzerOutputSchema = z.object({
  overallGrade: z.enum(['A', 'B', 'C', 'D', 'F']),
  score: z.number().min(0).max(100),
  summary: z.string(),
  unitEconomics: z.object({
    costPerUser: z.string(),
    costPerRequest: z.string(),
    costPerTransaction: z.string().optional(),
    breakdown: z.array(
      z.object({
        category: z.string(),
        costPerMonth: z.string(),
        costPerUser: z.string(),
        percentage: z.number(),
      })
    ),
  }),
  currentScale: z.object({
    mau: z.union([z.number(), z.string()]).optional(),
    dau: z.union([z.number(), z.string()]).optional(),
    requestsPerMonth: z.union([z.number(), z.string()]).optional(),
    monthlyCost: z.string(),
  }),
  scalingProjections: z.array(
    z.object({
      scale: z.string(),
      users: z.coerce.number(),
      estimatedCost: z.string(),
      grossMargin: z.string(),
      notes: z.string(),
    })
  ),
  bottlenecks: z.array(
    z.object({
      bottleneck: z.string(),
      severity: z.string(), // Allow any severity descriptor
      currentImpact: z.string(),
      scaleLimit: z.string(),
      costAtScale: z.string(),
      remediation: z.string(),
      remediationCost: z.string(),
    })
  ),
  infrastructure: z.object({
    compute: z.object({
      type: z.string(),
      current: z.string(),
      scalability: z.string(),
      notes: z.string(),
    }),
    database: z.object({
      type: z.string(),
      current: z.string(),
      scalability: z.string(),
      notes: z.string(),
    }),
    storage: z.object({
      type: z.string(),
      current: z.string(),
      scalability: z.string(),
      notes: z.string(),
    }),
    cdn: z.object({
      enabled: z.union([z.boolean(), z.string()]), // Allow both boolean and string (e.g., "false", "true", "Yes", "No")
      scalability: z.string(),
      notes: z.string(),
    }),
  }),
  recommendations: z.array(
    z.object({
      priority: z.string(), // Allow any priority descriptor
      action: z.string(),
      currentCost: z.string(),
      projectedSavings: z.string(),
      effort: z.string(),
    })
  ),
  viabilityAssessment: z.object({
    isViable: z.union([z.boolean(), z.string(), z.null()]), // Allow boolean, string, and null
    breakeven: z.string(),
    concerns: z.array(z.string()),
    priceIncreaseSuggestion: z.string().optional(),
  }),
});

export type CostAnalyzerOutput = z.infer<typeof costAnalyzerOutputSchema>;

interface CostAnalyzerContext {
  projectType: string;
  frameworks: string[];
  languages: string[];
  hasDatabase: boolean;
  databaseType?: string;
  hasCache: boolean;
  cacheType?: string;
  hasCDN: boolean;
  infrastructureFiles: string[];
  dockerfiles: string[];
  terraformFiles: string[];
  kubernetesFiles: string[];
  sampleAPICode: Record<string, string>;
  sampleDatabaseQueries: Record<string, string>;
  // User-provided metrics
  monthlyActiveUsers?: number;
  requestsPerMonth?: number;
  currentMonthlyCost?: number;
  pricePerUser?: number;
  // Mobile-specific
  isMobile?: boolean;
  mobileFramework?: 'react-native' | 'expo' | 'flutter' | 'ios-native' | 'android-native';
  appBundleSize?: string;
  hasInAppPurchases?: boolean;
}

/**
 * Generate cost & scalability analyzer prompt
 */
export function generateCostAnalyzerPrompt(context: CostAnalyzerContext): string {
  const {
    projectType,
    frameworks,
    languages,
    hasDatabase,
    databaseType,
    hasCache,
    cacheType,
    hasCDN,
    infrastructureFiles,
    dockerfiles,
    terraformFiles,
    kubernetesFiles,
    sampleAPICode,
    sampleDatabaseQueries,
    monthlyActiveUsers,
    requestsPerMonth,
    currentMonthlyCost,
    pricePerUser,
  } = context;

  return `# Cost & Scalability Analysis

🚨 CRITICAL RULE #0: ZERO INVENTED CODE - ONLY ACTUAL CODEBASE REFERENCES

**MOST CRITICAL RULE**: NEVER invent, fabricate, or create cost estimates without ACTUAL infrastructure code. EVERY finding must cite ACTUAL resources from ACTUAL files.

FORBIDDEN (Invented Findings):
❌ ANY cost estimate for resources you didn't find
❌ Hypothetical bottlenecks you didn't verify in code
❌ "Example N+1 query" you made up
❌ Infrastructure resources you didn't find in Terraform/configs

FORBIDDEN (Generic Placeholders):
❌ "your-database"
❌ "example-instance"
❌ "generic-resource"

REQUIRED (ONLY Actual Findings):
✅ Resources from ACTUAL Terraform/K8s/config files
✅ "aws_instance.web (terraform/main.tf:45-50)" (cite actual resource)
✅ Actual N+1 queries found in actual code (cite file:line)
✅ Actual database config from actual files

VERIFICATION BEFORE REPORTING:
1. Did I find this resource in actual infrastructure code? → If NO, DON'T REPORT IT
2. Do I have file:line reference? → If NO, DON'T REPORT IT
3. Can I cite the actual config? → If NO, DON'T REPORT IT

**ABSOLUTE RULE**: If the RESOURCE isn't in ACTUAL CODE, DON'T REPORT IT.

---

🚨 CRITICAL: ZERO HALLUCINATION TOLERANCE FOR COST ANALYSIS

NEVER report cost estimates, resource usage, or bottlenecks without verifying in actual infrastructure code/configs.

FORBIDDEN:
- ❌ "N+1 query in UserController" when pattern doesn't exist
- ❌ "Uses t3.2xlarge instances" without verifying Terraform/config
- ❌ "Database costs $500/month" without verifying config
- ❌ "Bundle size 5MB" without checking build output

REQUIRED: Verify infrastructure configs, read actual code, cite configs.
FORMAT: "[Cost/Bottleneck]: [Issue] in [File:Line] - [Evidence + Calc]"

---

You are a senior DevOps/FinOps engineer analyzing unit economics and scaling bottlenecks.

## Project Context

**Project Type:** ${projectType}
**Frameworks:** ${frameworks.join(', ') || 'None'}
**Languages:** ${languages.join(', ')}

### Infrastructure

**Database:** ${hasDatabase ? `Yes (${databaseType || 'type unknown'})` : 'No'}
**Cache:** ${hasCache ? `Yes (${cacheType || 'type unknown'})` : 'No'}
**CDN:** ${hasCDN ? 'Yes' : 'No'}

**Infrastructure Files:**
${infrastructureFiles.length > 0 ? infrastructureFiles.map(f => `- ${f}`).join('\n') : 'None detected'}

${dockerfiles.length > 0 ? `\n**Dockerfiles:** ${dockerfiles.length} found` : ''}
${terraformFiles.length > 0 ? `\n**Terraform:** ${terraformFiles.length} files` : ''}
${kubernetesFiles.length > 0 ? `\n**Kubernetes:** ${kubernetesFiles.length} manifests` : ''}

### Current Metrics (if provided)

${monthlyActiveUsers ? `**MAU:** ${monthlyActiveUsers.toLocaleString()}` : '**MAU:** Not provided'}
${requestsPerMonth ? `**Requests/Month:** ${requestsPerMonth.toLocaleString()}` : '**Requests/Month:** Not provided'}
${currentMonthlyCost ? `**Current Monthly Cost:** $${currentMonthlyCost.toLocaleString()}` : '**Current Cost:** Not provided'}
${pricePerUser ? `**Price per User:** $${pricePerUser}/month` : '**Price per User:** Not provided'}

### Sample Code Analysis

#### API Endpoints

${Object.entries(sampleAPICode)
  .slice(0, 3)
  .map(([file, code]) => `\n**${file}:**\n\`\`\`\n${code.substring(0, 800)}\n...\n\`\`\``)
  .join('\n')}

#### Database Queries

${Object.entries(sampleDatabaseQueries)
  .slice(0, 3)
  .map(([file, code]) => `\n**${file}:**\n\`\`\`\n${code.substring(0, 500)}\n...\n\`\`\``)
  .join('\n')}

---

## Your Task

⚠️ **CRITICAL: DO NOT SKIP ANY ANALYSIS CATEGORIES**

You MUST analyze ALL cost/scalability aspects listed below. This is NON-NEGOTIABLE:
- ✅ Analyze EVERY category, even if you find no issues
- ✅ For categories with no data, provide estimates with disclaimers
- ✅ DO NOT skip categories because you think they're "not applicable"
- ❌ Partial analysis is NOT acceptable
- ❌ Skipping categories will result in INVALID output

**Consequence**: Incomplete analysis will be rejected and must be regenerated.

Analyze cost structure and scaling economics:

### 1. Unit Economics Calculation

Calculate cost per user/request/transaction across:

**Compute Costs:**
- Server/container costs
- Serverless function invocations
- Auto-scaling implications

**Database Costs:**
- Database instance costs
- Storage costs (GB/month)
- IOPS/read-write costs
- Connection pooling efficiency

**Storage Costs:**
- Object storage (S3, GCS)
- File storage
- Backup costs

**Bandwidth Costs:**
- Egress/transfer costs
- CDN costs
- API gateway costs

**Third-Party Services:**
- Payment processing
- Email/SMS services
- Monitoring/logging
- Authentication services

**Formula:**
\`\`\`
Cost per User = (Total Monthly Cost) / (Monthly Active Users)
Cost per Request = (Total Monthly Cost) / (Monthly Requests)
\`\`\`

${context.isMobile ? `

### 1.1. Mobile-Specific Cost Analysis

**CRITICAL: App Store commission (15-30%) typically exceeds ALL infrastructure costs**

**Mobile Service Costs (10K-100K MAU):**
- Firebase Push: $0-50/month
- CodePush/OTA: $50-400/month
- Sentry Mobile: $80-400/month
- OneSignal: $90-900/month
- Attribution (Branch.io): $500-5K/month
- **App Store Fees: 15-30% of revenue (LARGEST cost)**

**Mobile API Cost Impact:**
Analyze excessive API calls from:
- Screen focus refetching
- Polling patterns
- Over-fetching mobile data

Example: 10K DAU with poor patterns = $14K/month vs $600/month optimized = $13.4K savings

**App Bundle Size Impact** ${context.appBundleSize ? `(Current: ${context.appBundleSize})` : ''}:
- >50MB iOS: 40% download rate loss
- >100MB Android: 60% download rate loss
- Affects CAC (customer acquisition cost)
` : ''}

### 2. Identify Scaling Bottlenecks

${projectType === 'backend' ? `
**Backend Bottlenecks:**
- N+1 query problems (database calls in loops)
- Missing database indexes
- No connection pooling
- Synchronous processing (should be async/queue)
- No caching layer
- Missing rate limiting
- Unoptimized database queries (full table scans)
` : projectType === 'frontend' ? `
**Frontend Bottlenecks:**
- Large bundle sizes (slow initial load)
- No code splitting
- Unoptimized images
- No CDN usage
- API over-fetching
` : projectType === 'devops' ? `
**Infrastructure Bottlenecks:**
- No auto-scaling
- Oversized instances
- Missing load balancers
- No container orchestration
- Single point of failure
` : ''}

For each bottleneck, calculate:
- **Current Impact:** Cost at current scale
- **Scale Limit:** At what user count does this break?
- **Cost at Scale:** Cost if you hit 10x users
- **Remediation:** How to fix
- **Remediation Cost:** Implementation cost

### 3. Scaling Projections

Project costs at different scales:

| Scale | Users | Est. Monthly Cost | Cost/User | Gross Margin* |
|-------|-------|-------------------|-----------|---------------|
| Current | ${monthlyActiveUsers || 'X'} | $Y | $Z | A% |
| 2x | ... | ... | ... | ...% |
| 10x | ... | ... | ... | ...% |
| 100x | ... | ... | ... | ...% |

*Gross Margin = (Revenue - Infrastructure Cost) / Revenue

**Assumptions:**
- Infrastructure scales sublinearly (not 1:1)
- Database is optimized (indexes, caching)
- CDN reduces bandwidth costs
- Auto-scaling handles spikes efficiently

### 4. Infrastructure Assessment

Rate scalability of each component:

**Compute:**
- Current: "AWS EC2 t3.medium, 2 instances"
- Scalability: Good/Fair/Poor
- Notes: "Can auto-scale to 20 instances, but..."

**Database:**
- Current: "PostgreSQL 13, db.t3.medium"
- Scalability: Good/Fair/Poor
- Notes: "No read replicas, single AZ, N+1 queries..."

**Storage:**
- Current: "S3 for files"
- Scalability: Excellent
- Notes: "S3 scales infinitely, already optimized"

**CDN:**
- Enabled: Yes/No
- Scalability: Excellent/Good/Fair/Poor
- Notes: "No CDN = high bandwidth costs at scale"

### 5. Cost Optimization Opportunities

Identify ways to reduce costs:

**Immediate (< 1 month):**
- Switch oversized instances → $X/month savings
- Enable database query caching → $Y/month savings
- Compress images → reduce S3/bandwidth costs

**Medium-term (1-3 months):**
- Add read replicas → reduce primary DB load
- Implement Redis caching → 80% fewer DB hits
- Add CDN → 70% bandwidth cost reduction

**Long-term (3-6 months):**
- Refactor N+1 queries → 90% fewer DB calls
- Migrate to serverless for spiky workloads
- Implement auto-scaling policies

### 6. Viability Assessment

Is the unit economics viable?

**Breakeven Analysis:**
- If cost per user = $A and price per user = $B
- Gross margin = (B - A) / B
- Minimum viable margin = 70% (to cover sales, support, overhead)

**Red Flags:**
- Cost per user > 50% of price per user
- Costs scale linearly (1:1 with users)
- Critical bottlenecks with no clear fix
- Single database cannot scale beyond X users

**Recommendations:**
- Increase price?
- Reduce infrastructure costs?
- Fix architectural issues?

---

## Output Format

Return a JSON object:

\`\`\`json
{
  "overallGrade": "C",
  "score": 72,
  "summary": "Unit economics are concerning at scale. N+1 queries and lack of caching will cause costs to scale linearly. Gross margin drops from 75% to 35% at 10x scale.",
  "unitEconomics": {
    "costPerUser": "$0.50/month",
    "costPerRequest": "$0.0002",
    "breakdown": [
      { "category": "Database", "costPerMonth": "$200", "costPerUser": "$0.20", "percentage": 40 },
      { "category": "Compute", "costPerMonth": "$150", "costPerUser": "$0.15", "percentage": 30 },
      { "category": "Storage", "costPerMonth": "$100", "costPerUser": "$0.10", "percentage": 20 }
    ]
  },
  "currentScale": {
    "mau": 1000,
    "requestsPerMonth": 500000,
    "monthlyCost": "$500"
  },
  "scalingProjections": [
    {
      "scale": "Current (1K users)",
      "users": 1000,
      "estimatedCost": "$500",
      "grossMargin": "75%",
      "notes": "Healthy margins at current scale"
    },
    {
      "scale": "10x (10K users)",
      "users": 10000,
      "estimatedCost": "$4,500",
      "grossMargin": "35%",
      "notes": "Margins erode due to N+1 queries, no caching"
    }
  ],
  "bottlenecks": [
    {
      "bottleneck": "N+1 Database Queries",
      "severity": "Critical",
      "currentImpact": "$80/month (40% of DB cost)",
      "scaleLimit": "10K users (database overwhelmed)",
      "costAtScale": "$800/month at 10K users",
      "remediation": "Add eager loading, implement caching layer",
      "remediationCost": "$5K-8K, 2-3 weeks"
    }
  ],
  "infrastructure": {
    "compute": {
      "type": "AWS EC2 t3.medium",
      "current": "2 instances, no auto-scaling",
      "scalability": "Fair",
      "notes": "Can scale to 20 instances but manual. Need auto-scaling."
    },
    "database": {
      "type": "PostgreSQL 13 (AWS RDS)",
      "current": "db.t3.medium, single AZ",
      "scalability": "Poor",
      "notes": "N+1 queries, no read replicas, no indexes on key columns"
    },
    "storage": {
      "type": "AWS S3",
      "current": "500GB stored",
      "scalability": "Excellent",
      "notes": "S3 scales infinitely, already cost-effective"
    },
    "cdn": {
      "enabled": false,
      "scalability": "Poor",
      "notes": "No CDN = paying full bandwidth costs. $0.09/GB egress."
    }
  },
  "recommendations": [
    {
      "priority": "Critical",
      "action": "Fix N+1 queries in user dashboard",
      "currentCost": "$80/month",
      "projectedSavings": "$720/month at 10K users",
      "effort": "2 weeks, $5K"
    },
    {
      "priority": "High",
      "action": "Add Redis caching layer",
      "currentCost": "$0 (not implemented)",
      "projectedSavings": "$300/month at 10K users",
      "effort": "1 week, $3K"
    }
  ],
  "viabilityAssessment": {
    "isViable": true,
    "breakeven": "Current scale viable (75% margin), but needs fixes before scaling",
    "concerns": [
      "Gross margin drops to 35% at 10x scale (target: 70%)",
      "N+1 queries will cause database overload",
      "No caching layer means expensive DB calls"
    ],
    "priceIncreaseSuggestion": "Consider $3/user → $5/user or fix bottlenecks"
  }
}
\`\`\`

### Recommendations Formatting

**IMPORTANT:** Format recommendations as clear, actionable text within each field:

- **priority**: Use descriptive priority levels (e.g., "Critical", "High", "Medium", "Low")
- **action**: Write as clear, imperative statement (e.g., "Fix N+1 queries in user dashboard")
- **currentCost**: Current cost or impact (e.g., "$80/month")
- **projectedSavings**: Expected savings at scale (e.g., "$720/month at 10K users")
- **effort**: Time and implementation cost (e.g., "2 weeks, $5K")

All text should be plain, readable strings - NO nested markdown, NO special formatting within JSON values.

## 📝 Formatting & Presentation Guidelines

**IMPORTANT:** Structure your JSON content for maximum readability and impact.

### Emoji Usage (Minimal & Professional)

Use emojis sparingly in text values to enhance scanning:
- **NEVER in severity field** - Must be exact enum: "Critical", "High", "Medium", "Low", "Informational"
- **Categories**: 💰 Cost | 📈 Scalability | 🏗️ Infrastructure | ⚡ Performance | 💸 Economics
- **In descriptions**: 🚨 for critical bottlenecks, ⚠️ for cost concerns, ✅ for optimizations

### Content Writing Style

**In summary and issue descriptions, be**:
- **Concise**: 2-3 sentences max per paragraph
- **Specific**: Include exact cost figures, scaling metrics (10x, 100x, 1000x)
- **Actionable**: Every bottleneck needs clear remediation with cost-benefit analysis
- **Professional but engaging**: Avoid dry financial jargon
- **Helpful**: Explain business impact and unit economics

**Example of well-written finding**:
"bottleneck": "🚨 Database query N+1 problem in user dashboard. Current: 500ms at 1K users. At 100K users: 50s timeout. Fix: Add caching layer. Cost: $3K, saves $15K/month at scale."

### Structure Your Text

- **Use bullet points** for lists (in bottlenecks, recommendations, etc.)
- **Use code formatting** (backticks) for service names, file names, technical terms
- **Use bold** (double asterisks) for emphasis on cost figures and critical metrics
- **Keep it scannable**: Short paragraphs, clear structure

## Critical Rules

1. **BE REALISTIC:** Use actual AWS/GCP pricing, industry benchmarks
2. **QUANTIFY EVERYTHING:** Provide dollar amounts, percentages, timelines
3. **SCALE IMPLICATIONS:** Show how costs change at 2x, 10x, 100x
4. **ACTIONABLE:** Every bottleneck must have remediation plan + cost
5. **VIABILITY FOCUS:** Answer "Can this business scale profitably?"
6. **GRADE CRITERIA:**
   - A (90-100): <30% cost/user, scales sublinearly, no bottlenecks, 70%+ margin at 10x
   - B (80-89): 30-40% cost/user, minor bottlenecks, 60%+ margin at 10x
   - C (70-79): 40-50% cost/user, several bottlenecks, 50%+ margin at 10x
   - D (60-69): 50-70% cost/user, critical bottlenecks, <50% margin at 10x
   - F (<60): >70% cost/user, scales linearly, unprofitable at scale

## Output Instructions

Return ONLY valid JSON. Do not wrap in markdown code blocks. Do not include \`\`\`json or any other formatting.
Start your response directly with { and end with }.`;
}
