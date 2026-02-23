/**
 * Documentation Prompt Rules - DevOps
 * Sophisticated prompt rules for DevOps/infrastructure documentation
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
 * DevOps-specific rules
 */
export const DEVOPS_SPECIFIC_RULES = `## DevOps-Specific Verification Rules

### Infrastructure Documentation
- ✅ Only document resources found in terraformFiles or k8sFiles
- ✅ Verify actual resource definitions in IaC files
- ✅ Document actual infrastructure patterns from code
- ❌ Don't invent cloud resources
- ❌ Don't assume infrastructure without evidence

### Network Documentation
- ✅ Only document networks, VPCs, subnets found in IaC files
- ✅ Verify actual network configuration
- ✅ Document actual security groups and firewall rules
- ❌ Don't invent network topology
- ❌ Don't assume network configuration

### Security & IAM Documentation
- ✅ Only document IAM roles and policies found in IaC files
- ✅ Verify actual security configurations
- ✅ Document actual access controls
- ❌ Don't invent security policies
- ❌ Don't assume permissions

### CI/CD Documentation
- ✅ Only document pipelines found in cicdFiles
- ✅ Verify actual pipeline stages and steps
- ✅ Document actual deployment workflows
- ❌ Don't invent pipeline stages
- ❌ Don't assume deployment processes

### Security & Secrets
- ⚠️ NEVER include account IDs, API keys, or secrets
- ⚠️ NEVER include actual IP addresses (use placeholders)
- ⚠️ NEVER include resource ARNs with account numbers
- ✅ Redact sensitive values as [ACCOUNT_ID], [API_KEY], etc.
- ✅ Document security best practices`;

/**
 * DevOps file definitions
 */
export const DEVOPS_FILE_DEFINITIONS: DocumentFileDefinition[] = [
  {
    filename: 'ARCHITECTURE.md',
    description: 'Infrastructure architecture and cloud platform overview',
    requiredFor: 'minimal',
    sections: [
      'Infrastructure Overview',
      'Cloud Platform',
      'Architecture Diagram',
      'Key Components',
      'Technology Stack',
      'Design Decisions',
    ],
  },
  {
    filename: 'INFRASTRUCTURE.md',
    description: 'IaC definitions, resource configuration, and infrastructure setup',
    requiredFor: 'standard',
    sections: [
      'Infrastructure Overview',
      'Resource Definitions',
      'Terraform/Pulumi Modules',
      'Resource Dependencies',
      'State Management',
      'Infrastructure Patterns',
    ],
  },
  {
    filename: 'NETWORKING.md',
    description: 'Network architecture, VPCs, subnets, and connectivity',
    requiredFor: 'standard',
    sections: [
      'Network Overview',
      'VPC Configuration',
      'Subnets & Routing',
      'Network Security',
      'Load Balancers',
      'DNS Configuration',
    ],
  },
  {
    filename: 'SECURITY.md',
    description: 'Security policies, IAM, and access controls',
    requiredFor: 'standard',
    sections: [
      'Security Overview',
      'IAM Roles & Policies',
      'Security Groups',
      'Encryption',
      'Secrets Management',
      'Compliance',
    ],
  },
  {
    filename: 'COMPUTE.md',
    description: 'Compute resources, containers, and scaling configuration',
    requiredFor: 'comprehensive',
    sections: [
      'Compute Overview',
      'EC2/ECS/EKS Resources',
      'Container Configuration',
      'Auto-Scaling',
      'Load Balancing',
      'Instance Types',
    ],
  },
  {
    filename: 'STORAGE.md',
    description: 'Storage resources, databases, and data persistence',
    requiredFor: 'comprehensive',
    sections: [
      'Storage Overview',
      'Database Resources',
      'Object Storage',
      'Block Storage',
      'Backup Strategy',
      'Data Retention',
    ],
  },
  {
    filename: 'CI_CD.md',
    description: 'CI/CD pipelines, automation, and deployment workflows',
    requiredFor: 'standard',
    sections: [
      'CI/CD Overview',
      'Pipeline Configuration',
      'Build Process',
      'Test Automation',
      'Deployment Stages',
      'Pipeline Triggers',
    ],
  },
  {
    filename: 'DEPLOYMENT.md',
    description: 'Deployment procedures, strategies, and rollback processes',
    requiredFor: 'standard',
    sections: [
      'Deployment Overview',
      'Deployment Strategy',
      'Environments',
      'Deployment Steps',
      'Rollback Procedures',
      'Blue-Green/Canary',
    ],
  },
  {
    filename: 'MONITORING.md',
    description: 'Monitoring, logging, and alerting configuration',
    requiredFor: 'comprehensive',
    sections: [
      'Monitoring Overview',
      'Metrics & Dashboards',
      'Logging Configuration',
      'Alerting Rules',
      'Observability Tools',
      'Log Aggregation',
    ],
  },
  {
    filename: 'DISASTER_RECOVERY.md',
    description: 'Backup, disaster recovery, and business continuity',
    requiredFor: 'comprehensive',
    sections: [
      'DR Overview',
      'Backup Strategy',
      'Recovery Procedures',
      'RTO & RPO',
      'Failover Process',
      'DR Testing',
    ],
  },
  {
    filename: 'SCALING.md',
    description: 'Auto-scaling configuration and capacity planning',
    requiredFor: 'comprehensive',
    sections: [
      'Scaling Overview',
      'Auto-Scaling Policies',
      'Capacity Planning',
      'Performance Targets',
      'Scaling Triggers',
      'Cost Optimization',
    ],
  },
  {
    filename: 'COST_OPTIMIZATION.md',
    description: 'Cost analysis, optimization strategies, and budget management',
    requiredFor: 'comprehensive',
    sections: [
      'Cost Overview',
      'Resource Costs',
      'Cost Optimization',
      'Reserved Instances',
      'Cost Monitoring',
      'Budget Alerts',
    ],
  },
  {
    filename: 'ENVIRONMENTS.md',
    description: 'Environment configurations and environment-specific settings',
    requiredFor: 'comprehensive',
    sections: [
      'Environments Overview',
      'Dev Environment',
      'Staging Environment',
      'Production Environment',
      'Environment Differences',
      'Promotion Process',
    ],
  },
  {
    filename: 'RUNBOOKS.md',
    description: 'Operational runbooks and incident response procedures',
    requiredFor: 'comprehensive',
    sections: [
      'Runbooks Overview',
      'Common Operations',
      'Incident Response',
      'Troubleshooting',
      'Maintenance Procedures',
      'Emergency Contacts',
    ],
  },
  {
    filename: 'DEVELOPMENT_PATTERNS.md',
    description: 'Common patterns, conventions, and best practices',
    requiredFor: 'standard',
    sections: [
      'IaC Conventions',
      'Naming Conventions',
      'Tagging Strategy',
      'Common Patterns',
      'Common Issues',
      'Development Tips',
    ],
  },
];

/**
 * Get files to generate based on tier
 */
export function getDevOpsFilesToGenerate(
  tier: 'minimal' | 'standard' | 'comprehensive'
): DocumentFileDefinition[] {
  if (tier === 'minimal') {
    return DEVOPS_FILE_DEFINITIONS.filter((f) => f.requiredFor === 'minimal');
  }

  if (tier === 'standard') {
    return DEVOPS_FILE_DEFINITIONS.filter(
      (f) => f.requiredFor === 'minimal' || f.requiredFor === 'standard'
    );
  }

  return DEVOPS_FILE_DEFINITIONS;
}

/**
 * Generate prompt for a single devops documentation file
 */
export function generateDevOpsFilePrompt(
  file: { filename: string; description: string },
  context: {
    projectName: string;
    projectDescription: string;
    industry: string;
    documentationTier: 'minimal' | 'standard' | 'comprehensive';
    fileTree: string;
    terraformFiles: string[];
    k8sFiles: string[];
    cicdFiles: string[];
    dockerFiles: string[];
    cloudProvider: string;
    hasKubernetes: boolean;
    hasTerraform: boolean;
    gitRecentCommits: string;
    // NEW: Actual file contents for accurate documentation
    terraformFileContents?: Record<string, string>;
    k8sFileContents?: Record<string, string>;
    cicdFileContents?: Record<string, string>;
    dockerFileContents?: Record<string, string>;
  }
): string {
  const {
    projectName,
    projectDescription,
    industry,
    documentationTier,
    fileTree,
    terraformFiles,
    k8sFiles,
    cicdFiles,
    dockerFiles,
    cloudProvider,
    hasKubernetes,
    hasTerraform,
    gitRecentCommits,
    terraformFileContents,
    k8sFileContents,
    cicdFileContents,
    dockerFileContents,
  } = context;

  // Format file contents for prompt
  const formatFileContents = (contents: Record<string, string> | undefined, maxFiles = 10, lang = 'hcl'): string => {
    if (!contents || Object.keys(contents).length === 0) {
      return 'No file contents available';
    }
    return Object.entries(contents)
      .slice(0, maxFiles)
      .map(([path, content]) => `### ${path}\n\`\`\`${lang}\n${content.substring(0, 3000)}\n\`\`\``)
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

${DEVOPS_SPECIFIC_RULES}

---

# DevOps Documentation: ${file.filename}

## Project Context

**Project Name:** ${projectName}
**Description:** ${projectDescription}
**Industry:** ${industry}
**Cloud Provider:** ${cloudProvider}
**Documentation Tier:** ${documentationTier}

${tierGuidance}

## Infrastructure Stack

**Kubernetes:** ${hasKubernetes ? 'Yes' : 'No'}
**Terraform:** ${hasTerraform ? 'Yes' : 'No'}

## Project Structure

**File Tree:**
\`\`\`
${fileTree.substring(0, 3000)}
\`\`\`

## Infrastructure Context

**Terraform Files (${terraformFiles.length} total):**
${terraformFiles.map((f) => `- ${f}`).join('\n')}

**Kubernetes Files (${k8sFiles.length} total):**
${k8sFiles.map((f) => `- ${f}`).join('\n')}

**CI/CD Files (${cicdFiles.length} total):**
${cicdFiles.map((f) => `- ${f}`).join('\n')}

**Docker Files (${dockerFiles.length} total):**
${dockerFiles.map((f) => `- ${f}`).join('\n')}

## Actual File Contents (USE THESE FOR CODE REFERENCES)

**CRITICAL**: The following sections contain ACTUAL CODE from the codebase. You MUST copy code verbatim from these sections when providing examples. NEVER invent code.

### Terraform Files
${formatFileContents(terraformFileContents, 10, 'hcl')}

### Kubernetes Files
${formatFileContents(k8sFileContents, 8, 'yaml')}

### CI/CD Files
${formatFileContents(cicdFileContents, 6, 'yaml')}

### Docker Files
${formatFileContents(dockerFileContents, 4, 'dockerfile')}

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
3. **FILE-BASED EVIDENCE** - Reference specific IaC files with file:line format
4. **SECURITY** - Redact account IDs, secrets, and sensitive values
5. **FILE-SPECIFIC FOCUS** - Focus on: ${file.description}
6. **INFER PATTERNS** - Document patterns found in 3+ files (cite all sources)
7. **NO FUTURE CONTENT** - Do NOT add "Future Considerations" or "Roadmap"

**DO's:**
- ✅ Reference specific IaC files by path
- ✅ Document actual resource configurations
- ✅ Use ${industry} domain terminology
- ✅ Provide file:line citations for all resources
- ✅ Document ONLY current infrastructure state

**DON'Ts:**
- ❌ Include account IDs or secrets
- ❌ Invent resources that don't exist
- ❌ Assume infrastructure without evidence
- ❌ Use placeholders for actual resource names
- ❌ Include speculative or future content

**FORMAT:** Return ONLY the markdown content. No JSON wrapper, no outer code blocks. Start directly with:

# ${file.filename.replace('.md', '')}

Generate the documentation now.`;
}
