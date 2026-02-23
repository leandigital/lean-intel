/**
 * File generator - Creates markdown files from analyzer outputs
 */

import * as fs from 'fs-extra';
import * as path from 'path';
import { AnalyzerResult } from '../types';
import { logger } from '../utils/logger';

// ============================================
// Local types for analyzer report formats
// These match the exact structure expected from LLM outputs
// ============================================

// Security analyzer types
interface SecurityReportIssue {
  issue: string;
  severity: string;
  category: string;
  location: string;
  cveId?: string | null;
  impact: string;
  remediation: string;
}

interface SecurityReportDependency {
  package: string;
  currentVersion: string;
  vulnerability: string;
  severity: string;
  fixedVersion?: string;
  cveId?: string | null;
}

interface SecurityReportSecret {
  type: string;
  file: string;
  line?: number;
  pattern: string;
}

interface SecurityReportPattern {
  pattern: string;
  file: string;
  line?: number;
  risk: string;
}

interface SecurityReportData {
  overallGrade: string;
  score?: number;
  summary?: string;
  criticalIssues?: SecurityReportIssue[];
  vulnerabilities?: {
    dependencies?: SecurityReportDependency[];
    hardcodedSecrets?: SecurityReportSecret[];
    insecurePatterns?: SecurityReportPattern[];
  };
  recommendations?: string[];
}

// License analyzer types (matches Zod schema in license-analyzer.ts)
interface LicenseReportDealbreaker {
  package: string;
  version: string;
  license: string;
  risk: string;
  impact: string;
  remediation: string;
}

interface LicenseReportRisk {
  severity: string;
  category: string;
  issue: string;
  packages: string[];
  impact: string;
  remediation: string;
}

interface LicenseReportData {
  overallGrade: string;
  score?: number;
  summary?: string;
  dealbreakers?: LicenseReportDealbreaker[];
  risks?: LicenseReportRisk[];
  recommendations?: string[];
  maImpact?: {
    blocking: boolean;
    concerns: string[];
    remediationCost: string;
  };
}

// Quality analyzer types (matches Zod schema in quality-analyzer.ts)
interface QualityReportTechnicalDebtIssue {
  type: string;
  description: string;
  location?: string;
  impact: string;
  effortToFix: string;
  cost: string;
}

interface QualityReportCodeSmell {
  smell: string;
  severity: string;
  occurrences: number;
  files: string[];
  impact: string;
  refactoringEffort: string;
}

interface QualityReportData {
  overallGrade: string;
  score?: number;
  summary?: string;
  technicalDebtPercentage?: number;
  metrics?: {
    linesOfCode?: number;
    codeFiles?: number;
    testFiles?: number;
    testCoverage?: number | null;
    avgFileSize?: number;
    complexFunctions?: number;
  };
  technicalDebt?: {
    category?: string;
    severity?: string;
    issues?: QualityReportTechnicalDebtIssue[];
    totalRemediationCost?: string;
    totalRemediationTime?: string;
  };
  codeSmells?: QualityReportCodeSmell[];
  recommendations?: (string | { priority: string; action: string; effort: string; impact: string })[];
}

// Cost analyzer types (matches Zod schema in cost-analyzer.ts)
interface CostReportBottleneck {
  bottleneck: string;
  severity: string;
  currentImpact: string;
  scaleLimit: string;
  costAtScale: string;
  remediation: string;
  remediationCost: string;
}

interface CostReportRecommendation {
  priority: string;
  action: string;
  currentCost: string;
  projectedSavings: string;
  effort: string;
}

interface CostReportData {
  overallGrade: string;
  score?: number;
  summary?: string;
  currentScale?: {
    mau?: number | string;
    dau?: number | string;
    requestsPerMonth?: number | string;
    monthlyCost?: string;
  };
  scalingProjections?: Array<{
    scale: string;
    users: number;
    estimatedCost: string;
    grossMargin: string;
    notes: string;
  }>;
  bottlenecks?: CostReportBottleneck[];
  viabilityAssessment?: {
    isViable: boolean | string;
    breakeven?: string;
    concerns?: string[];
  };
  recommendations?: (string | CostReportRecommendation)[];
}

// HIPAA analyzer types
interface HIPAAReportViolation {
  violation: string;
  regulation: string;
  severity: string;
  penalty?: string;
  evidence?: string;
  remediation: string;
}

interface HIPAAReportPHIField {
  field: string;
  location: string;
  type: string;
  sensitivity: string;
}

interface HIPAAReportTransmission {
  from: string;
  to: string;
  encrypted: boolean;
  protocol: string;
  concern?: string;
}

interface HIPAAReportGap {
  requirement: string;
  regulation: string;
  status: string;
  risk: string;
  finding: string;
  remediation: string;
  cost: string;
}

interface HIPAAReportSafeguard {
  regulation?: string;
  status: string;
  findings?: string[];
}

interface HIPAAReportRecommendation {
  priority: string;
  action: string;
  regulation: string;
  effort: string;
  cost: string;
  rationale?: string;
}

interface HIPAAReportData {
  overallGrade: string;
  score?: number;
  summary?: string;
  criticalViolations?: HIPAAReportViolation[];
  phiDataFlow?: {
    phiFields?: HIPAAReportPHIField[];
    phiTransmission?: HIPAAReportTransmission[];
  };
  complianceGaps?: HIPAAReportGap[];
  technicalSafeguards?: {
    accessControl?: HIPAAReportSafeguard;
    auditControls?: HIPAAReportSafeguard;
    integrityControls?: HIPAAReportSafeguard;
    transmissionSecurity?: HIPAAReportSafeguard;
  };
  physicalSafeguards?: {
    facilityAccess?: HIPAAReportSafeguard;
    workstationSecurity?: HIPAAReportSafeguard;
  };
  administrativeSafeguards?: {
    securityManagement?: HIPAAReportSafeguard;
    workforceTraining?: HIPAAReportSafeguard;
    baaCompliance?: HIPAAReportSafeguard;
  };
  recommendations?: (string | HIPAAReportRecommendation)[];
  regulatoryRisk?: {
    fineRisk?: string;
    litigationRisk?: string;
    reputationalRisk?: string;
    breachNotificationRisk?: string;
    overallAssessment?: string;
  };
}

// Union type for all analyzer report types
type AnalyzerReportData =
  | SecurityReportData
  | LicenseReportData
  | QualityReportData
  | CostReportData
  | HIPAAReportData;

export class FileGenerator {
  private readonly outputDir: string;

  constructor(projectRoot: string, outputDir = 'lean-reports', subdirectory?: string) {
    this.outputDir = subdirectory
      ? path.join(projectRoot, outputDir, subdirectory)
      : path.join(projectRoot, outputDir);
  }

  /**
   * Generate all documentation and report files
   */
  async generateFiles(results: AnalyzerResult[]): Promise<string[]> {
    // Ensure output directory exists
    await fs.ensureDir(this.outputDir);

    const generatedFiles: string[] = [];

    for (const result of results) {
      if (result.status === 'success' && result.output) {
        const files = await this.parseAndCreateFiles(result.name, result.output);
        generatedFiles.push(...files);
      }
    }

    return generatedFiles;
  }

  /**
   * Parse LLM output and create individual markdown files
   * The LLM output may contain multiple files separated by file markers
   */
  private async parseAndCreateFiles(
    analyzerName: string,
    output: string
  ): Promise<string[]> {
    const files: string[] = [];

    // Try to parse as JSON first (for documentation generator and analyzers)
    try {
      const parsed = JSON.parse(output);

      if (parsed.files && Array.isArray(parsed.files)) {
        // JSON format with files array (documentation generator)
        logger.info(`Found JSON format with ${parsed.files.length} files`);
        for (const file of parsed.files) {
          if (file.filename && file.content) {
            const filepath = await this.createFile(file.filename, file.content);
            files.push(filepath);
          }
        }
        return files;
      } else if (parsed.error) {
        // Error in parsing - write as-is for debugging
        logger.warn(`Skipping ${analyzerName}: ${parsed.error}`);
        const filename = this.getDefaultFilename(analyzerName);
        const content = `# ${analyzerName.toUpperCase()} - Error\n\n${parsed.error}\n\n## Raw Output\n\n\`\`\`json\n${JSON.stringify(parsed, null, 2)}\n\`\`\``;
        const filepath = await this.createFile(filename, content);
        files.push(filepath);
        return files;
      } else if (parsed.overallGrade) {
        // Structured analyzer report - convert to markdown
        logger.info(`Converting ${analyzerName} JSON report to markdown`);
        const markdown = this.convertAnalyzerReportToMarkdown(analyzerName, parsed);
        const filename = this.getDefaultFilename(analyzerName);
        const filepath = await this.createFile(filename, markdown);
        files.push(filepath);
        return files;
      }
    } catch {
      // Not JSON, continue with other formats
      logger.info('Output is not JSON, checking for file markers');
    }

    // Check if output contains multiple file markers
    // Format: ### FILE: filename.md
    const fileMarkerRegex = /### FILE: (.+\.md)\n([\s\S]+?)(?=### FILE: |$)/g;
    const matches = Array.from(output.matchAll(fileMarkerRegex));

    if (matches.length > 0) {
      // Output contains multiple files
      logger.info(`Found ${matches.length} files with markers`);
      for (const match of matches) {
        const filename = match[1].trim();
        const content = match[2].trim();
        const filepath = await this.createFile(filename, content);
        files.push(filepath);
      }
    } else {
      // Output is a single file (markdown already)
      logger.info('No file markers found, creating single file');
      const filename = this.getDefaultFilename(analyzerName);
      const filepath = await this.createFile(filename, output);
      files.push(filepath);
    }

    return files;
  }

  /**
   * Convert analyzer JSON report to formatted markdown
   * Handles security, license, quality, cost, and HIPAA analyzers
   */
  private convertAnalyzerReportToMarkdown(analyzerName: string, data: AnalyzerReportData): string {
    const { overallGrade, score, summary } = data;

    let markdown = `# ${this.getAnalyzerTitle(analyzerName)}\n\n`;
    markdown += `**Overall Grade:** ${overallGrade}`;
    if (score !== undefined) {
      markdown += ` (${score}/100)`;
    }
    markdown += `\n\n## Summary\n\n${summary || 'No summary provided.'}\n\n---\n\n`;

    // Analyzer-specific sections
    if (analyzerName === 'security') {
      markdown += this.formatSecurityReport(data as SecurityReportData);
    } else if (analyzerName === 'license') {
      markdown += this.formatLicenseReport(data as LicenseReportData);
    } else if (analyzerName === 'quality') {
      markdown += this.formatQualityReport(data as QualityReportData);
    } else if (analyzerName === 'cost') {
      markdown += this.formatCostReport(data as CostReportData);
    } else if (analyzerName === 'hipaa') {
      markdown += this.formatHIPAAReport(data as HIPAAReportData);
    } else {
      // Generic fallback
      markdown += `\`\`\`json\n${JSON.stringify(data, null, 2)}\n\`\`\`\n`;
    }

    markdown += `\n---\n\n_Generated by [lean-intel](https://github.com/leandigital/lean-intel) on ${new Date().toISOString()}_\n`;

    return markdown;
  }

  private getAnalyzerTitle(analyzerName: string): string {
    const titles: Record<string, string> = {
      security: 'Security Analysis Report',
      license: 'License Compliance Report',
      quality: 'Code Quality Report',
      cost: 'Cost & Scalability Report',
      hipaa: 'HIPAA Compliance Report',
    };
    return titles[analyzerName] || `${analyzerName.toUpperCase()} Report`;
  }

  private formatSecurityReport(data: SecurityReportData): string {
    let md = `## Critical Issues\n\n`;
    const issues = data.criticalIssues || [];

    if (issues.length === 0) {
      md += '_No critical issues found._\n\n';
    } else {
      issues.forEach((issue: SecurityReportIssue, index: number) => {
        md += `### ${index + 1}. ${issue.issue}\n\n`;
        md += `- **Severity:** ${issue.severity}\n`;
        md += `- **Category:** ${issue.category}\n`;
        md += `- **Location:** \`${issue.location}\`\n`;
        if (issue.cveId) md += `- **CVE ID:** ${issue.cveId}\n`;
        md += `\n**Impact:**\n${issue.impact}\n\n`;
        md += `**Remediation:**\n${issue.remediation}\n\n`;
      });
    }

    md += `---\n\n## Vulnerabilities\n\n`;
    const vuln = data.vulnerabilities || {};

    md += `### Dependency Vulnerabilities\n\n`;
    const deps = vuln.dependencies || [];
    if (deps.length === 0) {
      md += '_No dependency vulnerabilities found._\n\n';
    } else {
      md += `| Package | Current | Vulnerability | Severity | Fixed Version | CVE |\n`;
      md += `|---------|---------|---------------|----------|---------------|-----|\n`;
      deps.forEach((dep: SecurityReportDependency) => {
        md += `| ${dep.package} | ${dep.currentVersion} | ${dep.vulnerability} | ${dep.severity} | ${dep.fixedVersion || 'N/A'} | ${dep.cveId || '-'} |\n`;
      });
      md += `\n`;
    }

    md += `### Hardcoded Secrets\n\n`;
    const secrets = vuln.hardcodedSecrets || [];
    if (secrets.length === 0) {
      md += '_No hardcoded secrets detected._\n\n';
    } else {
      secrets.forEach((secret: SecurityReportSecret) => {
        md += `- **${secret.type}** in \`${secret.file}\`${secret.line ? `:${secret.line}` : ''}\n`;
        md += `  - Pattern: \`${secret.pattern}\`\n`;
      });
      md += `\n`;
    }

    md += `### Insecure Patterns\n\n`;
    const patterns = vuln.insecurePatterns || [];
    if (patterns.length === 0) {
      md += '_No insecure patterns detected._\n\n';
    } else {
      patterns.forEach((pattern: SecurityReportPattern) => {
        md += `- **${pattern.pattern}**\n`;
        md += `  - File: \`${pattern.file}\`${pattern.line ? `:${pattern.line}` : ''}\n`;
        md += `  - Risk: ${pattern.risk}\n`;
      });
      md += `\n`;
    }

    md += `---\n\n## Recommendations\n\n`;
    const recs = data.recommendations || [];
    if (recs.length === 0) {
      md += '_No recommendations provided._\n\n';
    } else {
      recs.forEach((rec: string, index: number) => {
        md += `${index + 1}. ${rec}\n`;
      });
    }
    md += `\n`;

    return md;
  }

  private formatLicenseReport(data: LicenseReportData): string {
    let md = `## Dealbreakers\n\n`;
    const dealbreakers = data.dealbreakers || [];

    if (dealbreakers.length === 0) {
      md += '_No dealbreakers found._\n\n';
    } else {
      dealbreakers.forEach((item: LicenseReportDealbreaker, index: number) => {
        md += `### ${index + 1}. ${item.package}@${item.version}\n\n`;
        md += `- **License:** ${item.license}\n`;
        md += `- **Risk:** ${item.risk}\n\n`;
        md += `**Impact:**\n${item.impact}\n\n`;
        md += `**Remediation:**\n${item.remediation}\n\n`;
      });
    }

    md += `---\n\n## License Risks\n\n`;
    const risks = data.risks || [];
    if (risks.length === 0) {
      md += '_No significant license risks found._\n\n';
    } else {
      risks.forEach((risk: LicenseReportRisk, index: number) => {
        md += `### ${index + 1}. ${risk.issue}\n\n`;
        md += `- **Severity:** ${risk.severity}\n`;
        md += `- **Category:** ${risk.category}\n`;
        md += `- **Packages:** ${risk.packages.join(', ')}\n\n`;
        md += `**Impact:**\n${risk.impact}\n\n`;
        md += `**Remediation:**\n${risk.remediation}\n\n`;
      });
    }

    if (data.maImpact) {
      md += `---\n\n## M&A Impact Assessment\n\n`;
      md += `- **Blocking:** ${data.maImpact.blocking ? 'Yes' : 'No'}\n`;
      md += `- **Remediation Cost:** ${data.maImpact.remediationCost}\n\n`;
      if (data.maImpact.concerns.length > 0) {
        md += `**Concerns:**\n`;
        data.maImpact.concerns.forEach(concern => {
          md += `- ${concern}\n`;
        });
      }
      md += `\n`;
    }

    if (data.recommendations && data.recommendations.length > 0) {
      md += `---\n\n## Recommendations\n\n`;
      data.recommendations.forEach((rec: string, index: number) => {
        md += `${index + 1}. ${rec}\n`;
      });
      md += `\n`;
    }

    return md;
  }

  private formatQualityReport(data: QualityReportData): string {
    let md = `## Metrics\n\n`;
    md += `- **Technical Debt:** ${data.technicalDebtPercentage ?? 'N/A'}%\n`;
    if (data.metrics) {
      md += `- **Lines of Code:** ${data.metrics.linesOfCode?.toLocaleString() ?? 'N/A'}\n`;
      md += `- **Code Files:** ${data.metrics.codeFiles ?? 'N/A'}\n`;
      md += `- **Test Files:** ${data.metrics.testFiles ?? 'N/A'}\n`;
      md += `- **Test Coverage:** ${data.metrics.testCoverage != null ? `${data.metrics.testCoverage}%` : 'N/A'}\n`;
      md += `- **Avg File Size:** ${data.metrics.avgFileSize ?? 'N/A'} lines\n`;
      md += `- **Complex Functions:** ${data.metrics.complexFunctions ?? 'N/A'}\n`;
    }
    md += `\n`;

    md += `---\n\n## Technical Debt Issues\n\n`;
    const issues = data.technicalDebt?.issues || [];
    if (issues.length === 0) {
      md += '_No technical debt issues found._\n\n';
    } else {
      issues.forEach((issue: QualityReportTechnicalDebtIssue, index: number) => {
        md += `### ${index + 1}. ${issue.type}\n\n`;
        md += `- **Description:** ${issue.description}\n`;
        if (issue.location) md += `- **Location:** \`${issue.location}\`\n`;
        md += `- **Impact:** ${issue.impact}\n`;
        md += `- **Effort to Fix:** ${issue.effortToFix}\n`;
        md += `- **Cost:** ${issue.cost}\n\n`;
      });
      if (data.technicalDebt?.totalRemediationCost) {
        md += `**Total Remediation Cost:** ${data.technicalDebt.totalRemediationCost}\n`;
      }
      if (data.technicalDebt?.totalRemediationTime) {
        md += `**Total Remediation Time:** ${data.technicalDebt.totalRemediationTime}\n`;
      }
      md += `\n`;
    }

    md += `---\n\n## Code Smells\n\n`;
    const smells = data.codeSmells || [];
    if (smells.length === 0) {
      md += '_No code smells detected._\n\n';
    } else {
      smells.forEach((smell: QualityReportCodeSmell, index: number) => {
        md += `### ${index + 1}. ${smell.smell}\n\n`;
        md += `- **Severity:** ${smell.severity}\n`;
        md += `- **Occurrences:** ${smell.occurrences}\n`;
        md += `- **Files:** ${smell.files.map(f => `\`${f}\``).join(', ')}\n`;
        md += `- **Impact:** ${smell.impact}\n`;
        md += `- **Refactoring Effort:** ${smell.refactoringEffort}\n\n`;
      });
    }

    md += `---\n\n## Recommendations\n\n`;
    const recs = data.recommendations || [];
    if (recs.length === 0) {
      md += '_No recommendations provided._\n\n';
    } else {
      recs.forEach((rec: string | { priority: string; action: string; effort: string; impact: string }, index: number) => {
        if (typeof rec === 'string') {
          md += `${index + 1}. ${rec}\n`;
        } else {
          md += `${index + 1}. **[${rec.priority}]** ${rec.action}\n`;
          md += `   - **Effort:** ${rec.effort}\n`;
          md += `   - **Impact:** ${rec.impact}\n\n`;
        }
      });
    }

    return md;
  }

  private formatCostReport(data: CostReportData): string {
    let md = `## Current Scale\n\n`;
    const current = data.currentScale || {};
    md += `- **MAU:** ${current.mau || 'N/A'}\n`;
    md += `- **DAU:** ${current.dau || 'N/A'}\n`;
    md += `- **Requests/Month:** ${current.requestsPerMonth || 'N/A'}\n`;
    md += `- **Monthly Cost:** ${current.monthlyCost || 'N/A'}\n\n`;

    md += `---\n\n## Scaling Projections\n\n`;
    const projections = data.scalingProjections || [];
    if (projections.length === 0) {
      md += '_No scaling projections provided._\n\n';
    } else {
      md += `| Scale | Users | Estimated Cost | Gross Margin | Notes |\n`;
      md += `|-------|-------|---------------|-------------|-------|\n`;
      projections.forEach(proj => {
        md += `| ${proj.scale} | ${proj.users.toLocaleString()} | ${proj.estimatedCost} | ${proj.grossMargin} | ${proj.notes} |\n`;
      });
      md += `\n`;
    }

    md += `---\n\n## Bottlenecks\n\n`;
    const bottlenecks = data.bottlenecks || [];
    if (bottlenecks.length === 0) {
      md += '_No bottlenecks identified._\n\n';
    } else {
      bottlenecks.forEach((b: CostReportBottleneck, index: number) => {
        md += `### ${index + 1}. ${b.bottleneck}\n\n`;
        md += `- **Severity:** ${b.severity}\n`;
        md += `- **Current Impact:** ${b.currentImpact}\n`;
        md += `- **Scale Limit:** ${b.scaleLimit}\n`;
        md += `- **Cost at Scale:** ${b.costAtScale}\n`;
        md += `- **Remediation:** ${b.remediation}\n`;
        md += `- **Remediation Cost:** ${b.remediationCost}\n\n`;
      });
    }

    md += `---\n\n## Viability Assessment\n\n`;
    const viability = data.viabilityAssessment;
    if (viability) {
      md += `- **Is Viable:** ${viability.isViable === true || viability.isViable === 'true' || viability.isViable === 'Yes' ? 'Yes' : typeof viability.isViable === 'string' ? viability.isViable : 'No'}\n`;
      if (viability.breakeven) md += `- **Breakeven:** ${viability.breakeven}\n`;
      if (viability.concerns && viability.concerns.length > 0) {
        md += `\n**Concerns:**\n`;
        viability.concerns.forEach(c => md += `- ${c}\n`);
      }
      md += `\n`;
    } else {
      md += '_No viability assessment provided._\n\n';
    }

    md += `---\n\n## Recommendations\n\n`;
    const recs = data.recommendations || [];
    if (recs.length === 0) {
      md += '_No recommendations provided._\n\n';
    } else {
      recs.forEach((rec: string | CostReportRecommendation, index: number) => {
        if (typeof rec === 'string') {
          md += `${index + 1}. ${rec}\n`;
        } else {
          md += `${index + 1}. **[${rec.priority}]** ${rec.action}\n`;
          md += `   - **Current Cost:** ${rec.currentCost}\n`;
          md += `   - **Projected Savings:** ${rec.projectedSavings}\n`;
          md += `   - **Effort:** ${rec.effort}\n\n`;
        }
      });
    }

    return md;
  }

  private formatHIPAAReport(data: HIPAAReportData): string {
    let md = `## Critical Violations\n\n`;
    const violations = data.criticalViolations || [];

    if (violations.length === 0) {
      md += '_No critical violations found._\n\n';
    } else {
      violations.forEach((viol: HIPAAReportViolation, index: number) => {
        md += `### ${index + 1}. ${viol.violation}\n\n`;
        md += `- **Regulation:** ${viol.regulation}\n`;
        md += `- **Severity:** ${viol.severity}\n`;
        if (viol.penalty) md += `- **Penalty:** ${viol.penalty}\n`;
        if (viol.evidence) md += `- **Evidence:** ${viol.evidence}\n`;
        md += `\n**Remediation:**\n${viol.remediation}\n\n`;
      });
    }

    md += `---\n\n## PHI Data Flow\n\n`;
    const phiFlow = data.phiDataFlow || {};

    md += `### PHI Fields Identified\n\n`;
    const phiFields = phiFlow.phiFields || [];
    if (phiFields.length === 0) {
      md += '_No PHI fields identified._\n\n';
    } else {
      md += `| Field | Location | Type | Sensitivity |\n`;
      md += `|-------|----------|------|-------------|\n`;
      phiFields.forEach((field: HIPAAReportPHIField) => {
        md += `| ${field.field} | ${field.location} | ${field.type} | ${field.sensitivity} |\n`;
      });
      md += `\n`;
    }

    md += `### PHI Transmission\n\n`;
    const phiTransmission = phiFlow.phiTransmission || [];
    if (phiTransmission.length === 0) {
      md += '_No PHI transmission paths identified._\n\n';
    } else {
      phiTransmission.forEach((trans: HIPAAReportTransmission, index: number) => {
        md += `${index + 1}. **${trans.from} → ${trans.to}**\n`;
        md += `   - Encrypted: ${trans.encrypted}\n`;
        md += `   - Protocol: ${trans.protocol}\n`;
        if (trans.concern) md += `   - Concern: ${trans.concern}\n`;
        md += `\n`;
      });
    }

    md += `---\n\n## Compliance Gaps\n\n`;
    const gaps = data.complianceGaps || [];
    if (gaps.length === 0) {
      md += '_No compliance gaps identified._\n\n';
    } else {
      gaps.forEach((gap: HIPAAReportGap, index: number) => {
        md += `### ${index + 1}. ${gap.requirement}\n\n`;
        md += `- **Regulation:** ${gap.regulation}\n`;
        md += `- **Status:** ${gap.status}\n`;
        md += `- **Risk:** ${gap.risk}\n`;
        md += `\n**Finding:**\n${gap.finding}\n\n`;
        md += `**Remediation:**\n${gap.remediation}\n`;
        md += `- **Cost:** ${gap.cost}\n\n`;
      });
    }

    md += `---\n\n## Safeguards Assessment\n\n`;

    const tech = data.technicalSafeguards || {};
    md += `### Technical Safeguards\n\n`;
    if (tech.accessControl) {
      md += `**Access Control (${tech.accessControl.regulation || 'N/A'}):** ${tech.accessControl.status}\n`;
      if (tech.accessControl.findings && tech.accessControl.findings.length > 0) {
        tech.accessControl.findings.forEach((f: string) => md += `- ${f}\n`);
      }
      md += `\n`;
    }
    if (tech.auditControls) {
      md += `**Audit Controls (${tech.auditControls.regulation || 'N/A'}):** ${tech.auditControls.status}\n`;
      if (tech.auditControls.findings && tech.auditControls.findings.length > 0) {
        tech.auditControls.findings.forEach((f: string) => md += `- ${f}\n`);
      }
      md += `\n`;
    }
    if (tech.integrityControls) {
      md += `**Integrity Controls (${tech.integrityControls.regulation || 'N/A'}):** ${tech.integrityControls.status}\n`;
      if (tech.integrityControls.findings && tech.integrityControls.findings.length > 0) {
        tech.integrityControls.findings.forEach((f: string) => md += `- ${f}\n`);
      }
      md += `\n`;
    }
    if (tech.transmissionSecurity) {
      md += `**Transmission Security (${tech.transmissionSecurity.regulation || 'N/A'}):** ${tech.transmissionSecurity.status}\n`;
      if (tech.transmissionSecurity.findings && tech.transmissionSecurity.findings.length > 0) {
        tech.transmissionSecurity.findings.forEach((f: string) => md += `- ${f}\n`);
      }
      md += `\n`;
    }

    const phys = data.physicalSafeguards || {};
    md += `### Physical Safeguards\n\n`;
    if (phys.facilityAccess) {
      md += `**Facility Access:** ${phys.facilityAccess.status}\n`;
      if (phys.facilityAccess.findings && phys.facilityAccess.findings.length > 0) {
        phys.facilityAccess.findings.forEach((f: string) => md += `- ${f}\n`);
      }
      md += `\n`;
    }
    if (phys.workstationSecurity) {
      md += `**Workstation Security:** ${phys.workstationSecurity.status}\n`;
      if (phys.workstationSecurity.findings && phys.workstationSecurity.findings.length > 0) {
        phys.workstationSecurity.findings.forEach((f: string) => md += `- ${f}\n`);
      }
      md += `\n`;
    }

    const admin = data.administrativeSafeguards || {};
    md += `### Administrative Safeguards\n\n`;
    if (admin.securityManagement) {
      md += `**Security Management:** ${admin.securityManagement.status}\n`;
      if (admin.securityManagement.findings && admin.securityManagement.findings.length > 0) {
        admin.securityManagement.findings.forEach((f: string) => md += `- ${f}\n`);
      }
      md += `\n`;
    }
    if (admin.workforceTraining) {
      md += `**Workforce Training:** ${admin.workforceTraining.status}\n`;
      if (admin.workforceTraining.findings && admin.workforceTraining.findings.length > 0) {
        admin.workforceTraining.findings.forEach((f: string) => md += `- ${f}\n`);
      }
      md += `\n`;
    }
    if (admin.baaCompliance) {
      md += `**BAA Compliance:** ${admin.baaCompliance.status}\n`;
      if (admin.baaCompliance.findings && admin.baaCompliance.findings.length > 0) {
        admin.baaCompliance.findings.forEach((f: string) => md += `- ${f}\n`);
      }
      md += `\n`;
    }

    md += `---\n\n## Recommendations\n\n`;
    const recs = data.recommendations || [];
    if (recs.length === 0) {
      md += '_No recommendations provided._\n\n';
    } else {
      recs.forEach((rec: string | HIPAAReportRecommendation) => {
        // Recommendations are objects with {priority, action, regulation, effort, cost}
        if (typeof rec === 'string') {
          md += `- ${rec}\n`;
        } else {
          md += `### ${rec.priority}: ${rec.action}\n\n`;
          md += `- **Regulation:** ${rec.regulation}\n`;
          md += `- **Effort:** ${rec.effort}\n`;
          md += `- **Cost:** ${rec.cost}\n`;
          if (rec.rationale) md += `- **Rationale:** ${rec.rationale}\n`;
          md += `\n`;
        }
      });
    }

    md += `---\n\n## Regulatory Risk\n\n`;
    const risk = data.regulatoryRisk || {};
    md += `- **Fine Risk:** ${risk.fineRisk || 'N/A'}\n`;
    md += `- **Litigation Risk:** ${risk.litigationRisk || 'N/A'}\n`;
    md += `- **Reputational Risk:** ${risk.reputationalRisk || 'N/A'}\n`;
    if (risk.breachNotificationRisk) md += `- **Breach Notification Risk:** ${risk.breachNotificationRisk}\n`;
    md += `\n**Overall Assessment:**\n${risk.overallAssessment || 'N/A'}\n`;

    return md;
  }

  /**
   * Create a markdown file
   */
  private async createFile(filename: string, content: string): Promise<string> {
    const filepath = path.join(this.outputDir, filename);

    // Ensure parent directory exists
    await fs.ensureDir(path.dirname(filepath));

    // Write file
    await fs.writeFile(filepath, content, 'utf-8');

    logger.success(`Created ${filename}`);

    return filepath;
  }

  /**
   * Get default filename for an analyzer
   */
  private getDefaultFilename(analyzerName: string): string {
    const filenameMap: Record<string, string> = {
      documentation: 'ARCHITECTURE.md',
      security: 'SECURITY.md',
      license: 'LICENSE_COMPLIANCE.md',
      quality: 'CODE_QUALITY.md',
      cost: 'COST_SCALABILITY.md',
      hipaa: 'HIPAA_COMPLIANCE.md',
    };

    return filenameMap[analyzerName] || `${analyzerName.toUpperCase()}.md`;
  }


  /**
   * Get output directory path
   */
  getOutputDir(): string {
    return this.outputDir;
  }
}
