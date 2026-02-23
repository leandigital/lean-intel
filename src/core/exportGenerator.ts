/**
 * Export Generator for PDF/HTML reports
 * Orchestrates generation of professional executive and detailed reports
 */

import * as fs from 'fs-extra';
import * as path from 'path';
import { HTMLBuilder } from './htmlBuilder';
import { PDFBuilder } from './pdfBuilder';
import { REPORT_CSS } from '../templates/report.css';
import {
  ExportOptions,
  ExportResult,
  ExecutiveSummary,
  AnalyzerSummary,
  RecommendationLevel,
  SecurityAnalyzerOutput,
  LicenseAnalyzerOutput,
  QualityAnalyzerOutput,
  CostAnalyzerOutput,
  HIPAAAnalyzerOutput,
} from '../types';
import { Logger } from '../utils/logger';

// Union type for all analyzer outputs
type AnalyzerOutput =
  | SecurityAnalyzerOutput
  | LicenseAnalyzerOutput
  | QualityAnalyzerOutput
  | CostAnalyzerOutput
  | HIPAAAnalyzerOutput;

interface AnalyzerResultWithOutput {
  name: string;
  status: 'success' | 'error' | 'skipped';
  output?: string; // JSON string of analyzer output
  error?: string;
}

export class ExportGenerator {
  private projectPath: string;
  private pdfBuilder: PDFBuilder;
  private logger: Logger;

  constructor(projectPath: string) {
    this.projectPath = projectPath;
    this.pdfBuilder = new PDFBuilder();
    this.logger = new Logger();
  }

  /**
   * Generate exports from analyzer results
   */
  async generateExports(
    results: AnalyzerResultWithOutput[],
    options: ExportOptions
  ): Promise<ExportResult[]> {
    const exportResults: ExportResult[] = [];

    // Ensure output directory exists
    const outputDir = path.join(this.projectPath, options.outputDir);
    await fs.ensureDir(outputDir);

    // Parse analyzer outputs
    const parsedResults = this.parseAnalyzerResults(results);

    if (parsedResults.length === 0) {
      this.logger.warn('No analyzer results available for export');
      return exportResults;
    }

    // Generate executive summary
    const executiveSummary = this.generateExecutiveSummary(
      parsedResults,
      options.projectName,
      options.industry
    );

    // Generate HTML for executive summary
    const executiveHTML = this.generateExecutiveHTML(executiveSummary);

    // Generate HTML for full analysis
    const fullAnalysisHTML = this.generateFullAnalysisHTML(
      executiveSummary,
      parsedResults,
      options.projectName
    );

    // Check PDF availability
    const pdfAvailable = await this.pdfBuilder.isAvailable();

    // Generate requested formats
    for (const format of options.formats) {
      if (format === 'html') {
        // Executive summary HTML
        const execHtmlPath = path.join(outputDir, 'EXECUTIVE_SUMMARY.html');
        await fs.writeFile(execHtmlPath, executiveHTML);
        const execHtmlStats = await fs.stat(execHtmlPath);
        exportResults.push({
          format: 'html',
          path: execHtmlPath,
          size: execHtmlStats.size,
        });

        // Full analysis HTML
        const fullHtmlPath = path.join(outputDir, 'FULL_ANALYSIS.html');
        await fs.writeFile(fullHtmlPath, fullAnalysisHTML);
        const fullHtmlStats = await fs.stat(fullHtmlPath);
        exportResults.push({
          format: 'html',
          path: fullHtmlPath,
          size: fullHtmlStats.size,
        });
      }

      if (format === 'pdf') {
        if (!pdfAvailable) {
          this.logger.warn('PDF generation unavailable (Puppeteer issue). Skipping PDF exports.');
          continue;
        }

        try {
          // Executive summary PDF
          const execPdfPath = path.join(outputDir, 'EXECUTIVE_SUMMARY.pdf');
          await this.pdfBuilder.generateExecutivePDF(executiveHTML, execPdfPath);
          const execPdfStats = await fs.stat(execPdfPath);
          exportResults.push({
            format: 'pdf',
            path: execPdfPath,
            size: execPdfStats.size,
          });

          // Full analysis PDF
          const fullPdfPath = path.join(outputDir, 'FULL_ANALYSIS.pdf');
          await this.pdfBuilder.generateFullAnalysisPDF(fullAnalysisHTML, fullPdfPath);
          const fullPdfStats = await fs.stat(fullPdfPath);
          exportResults.push({
            format: 'pdf',
            path: fullPdfPath,
            size: fullPdfStats.size,
          });
        } catch (error) {
          this.logger.warn(`PDF generation failed: ${(error as Error).message}`);
        }
      }
    }

    // Cleanup
    await this.pdfBuilder.close();

    return exportResults;
  }

  /**
   * Parse analyzer results from JSON strings
   */
  private parseAnalyzerResults(
    results: AnalyzerResultWithOutput[]
  ): Array<{ name: string; output: AnalyzerOutput }> {
    const parsed: Array<{ name: string; output: AnalyzerOutput }> = [];

    for (const result of results) {
      if (result.status !== 'success' || !result.output) continue;

      try {
        const output = JSON.parse(result.output) as AnalyzerOutput;
        parsed.push({ name: result.name, output });
      } catch {
        // Skip invalid JSON
      }
    }

    return parsed;
  }

  /**
   * Generate executive summary from analyzer results
   */
  private generateExecutiveSummary(
    results: Array<{ name: string; output: AnalyzerOutput }>,
    projectName: string,
    _industry: string
  ): ExecutiveSummary {
    const analyzerSummaries: AnalyzerSummary[] = [];
    const keyRisks: string[] = [];
    const keyStrengths: string[] = [];
    let totalScore = 0;

    for (const { name, output } of results) {
      // Extract top issues based on analyzer type
      const topIssues = this.extractTopIssues(name, output);

      analyzerSummaries.push({
        name: this.formatAnalyzerName(name),
        grade: output.overallGrade,
        score: output.score,
        topIssues,
      });

      totalScore += output.score;

      // Extract risks and strengths
      this.extractRisksAndStrengths(name, output, keyRisks, keyStrengths);
    }

    const overallScore = results.length > 0 ? Math.round(totalScore / results.length) : 0;
    const overallGrade = this.scoreToGrade(overallScore);
    const recommendation = this.determineRecommendation(overallScore, keyRisks);

    return {
      projectName,
      generatedDate: new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
      overallGrade,
      overallScore,
      recommendation,
      analyzerSummaries,
      keyRisks: keyRisks.slice(0, 5), // Top 5 risks
      keyStrengths: keyStrengths.slice(0, 5), // Top 5 strengths
    };
  }

  /**
   * Extract top issues from analyzer output
   */
  private extractTopIssues(name: string, output: AnalyzerOutput): string[] {
    const issues: string[] = [];

    if (name.includes('security')) {
      const secOutput = output as SecurityAnalyzerOutput;
      secOutput.criticalIssues?.slice(0, 3).forEach(i => issues.push(i.issue));
    } else if (name.includes('license')) {
      const licOutput = output as LicenseAnalyzerOutput;
      licOutput.dealbreakers?.slice(0, 3).forEach(d => issues.push(`${d.package}: ${d.risk}`));
      licOutput.risks?.slice(0, 3 - issues.length).forEach(r => issues.push(r.issue));
    } else if (name.includes('quality')) {
      const qualOutput = output as QualityAnalyzerOutput;
      qualOutput.technicalDebt?.issues?.slice(0, 3).forEach(i => issues.push(i.description));
    } else if (name.includes('cost')) {
      const costOutput = output as CostAnalyzerOutput;
      costOutput.bottlenecks?.slice(0, 3).forEach(b => issues.push(b.bottleneck));
    } else if (name.includes('hipaa')) {
      const hipaaOutput = output as HIPAAAnalyzerOutput;
      hipaaOutput.criticalViolations?.slice(0, 3).forEach(v => issues.push(v.description));
    }

    return issues;
  }

  /**
   * Extract risks and strengths from analyzer outputs
   */
  private extractRisksAndStrengths(
    name: string,
    output: AnalyzerOutput,
    risks: string[],
    strengths: string[]
  ): void {
    // Add critical findings as risks
    if (output.score < 60) {
      risks.push(`${this.formatAnalyzerName(name)}: ${output.summary}`);
    }

    // Add high scores as strengths
    if (output.score >= 80) {
      strengths.push(`Strong ${this.formatAnalyzerName(name).toLowerCase()} profile (${output.score}/100)`);
    }

    // Extract specific recommendations as insights
    if (output.recommendations?.length > 0) {
      const recStrings = output.recommendations
        .map(r => typeof r === 'string' ? r : ('action' in r ? r.action : String(r)))
        .filter((r): r is string => typeof r === 'string');
      const criticalRecs = recStrings.filter(
        r => r.toLowerCase().includes('critical') || r.toLowerCase().includes('immediately')
      );
      risks.push(...criticalRecs.slice(0, 2));
    }
  }

  /**
   * Generate HTML for executive summary
   */
  private generateExecutiveHTML(summary: ExecutiveSummary): string {
    // Generate analyzer cards
    const analyzerCards = summary.analyzerSummaries
      .map(a =>
        HTMLBuilder.generateAnalyzerCard(a.name, a.grade, a.score, '', a.topIssues)
      )
      .join('\n');

    const content = `
      ${HTMLBuilder.generateExecutiveHeader(
        summary.projectName,
        summary.generatedDate,
        summary.overallGrade,
        summary.overallScore,
        summary.recommendation
      )}

      <main class="report-content">
        ${HTMLBuilder.generateSection(
          'Analyzer Grades',
          `<div class="analyzer-cards">${analyzerCards}</div>`,
          'analyzer-grades'
        )}

        ${HTMLBuilder.generateSection(
          'Key Findings',
          HTMLBuilder.generateRisksStrengths(summary.keyRisks, summary.keyStrengths),
          'key-findings'
        )}
      </main>
    `;

    return HTMLBuilder.generateDocument(
      content,
      `Executive Summary - ${summary.projectName}`,
      REPORT_CSS
    );
  }

  /**
   * Generate HTML for full analysis report
   */
  private generateFullAnalysisHTML(
    summary: ExecutiveSummary,
    results: Array<{ name: string; output: AnalyzerOutput }>,
    projectName: string
  ): string {
    // Generate table of contents
    const tocSections = [
      { id: 'executive-summary', title: 'Executive Summary' },
      ...results.map(r => ({
        id: this.formatAnalyzerName(r.name).toLowerCase().replace(/\s+/g, '-'),
        title: this.formatAnalyzerName(r.name),
      })),
    ];

    // Generate detailed sections for each analyzer
    const analyzerSections = results
      .map(({ name, output }) => this.generateAnalyzerSection(name, output))
      .join('\n');

    // Generate analyzer cards for executive section
    const analyzerCards = summary.analyzerSummaries
      .map(a =>
        HTMLBuilder.generateAnalyzerCard(a.name, a.grade, a.score, '', a.topIssues)
      )
      .join('\n');

    const content = `
      ${HTMLBuilder.generateExecutiveHeader(
        projectName,
        summary.generatedDate,
        summary.overallGrade,
        summary.overallScore,
        summary.recommendation
      )}

      <main class="report-content">
        ${HTMLBuilder.generateTableOfContents(tocSections)}

        ${HTMLBuilder.generateSection(
          'Executive Summary',
          `
            <div class="analyzer-cards">${analyzerCards}</div>
            ${HTMLBuilder.generateRisksStrengths(summary.keyRisks, summary.keyStrengths)}
          `,
          'executive-summary'
        )}

        ${analyzerSections}
      </main>
    `;

    return HTMLBuilder.generateDocument(
      content,
      `Full Analysis - ${projectName}`,
      REPORT_CSS
    );
  }

  /**
   * Generate detailed section for an analyzer
   */
  private generateAnalyzerSection(name: string, output: AnalyzerOutput): string {
    const formattedName = this.formatAnalyzerName(name);
    const sectionId = formattedName.toLowerCase().replace(/\s+/g, '-');

    let detailsHTML = '';

    // Generate details based on analyzer type
    if (name.includes('security')) {
      detailsHTML = this.generateSecurityDetails(output as SecurityAnalyzerOutput);
    } else if (name.includes('license')) {
      detailsHTML = this.generateLicenseDetails(output as LicenseAnalyzerOutput);
    } else if (name.includes('quality')) {
      detailsHTML = this.generateQualityDetails(output as QualityAnalyzerOutput);
    } else if (name.includes('cost')) {
      detailsHTML = this.generateCostDetails(output as CostAnalyzerOutput);
    } else if (name.includes('hipaa')) {
      detailsHTML = this.generateHIPAADetails(output as HIPAAAnalyzerOutput);
    }

    const headerHTML = `
      <div class="analyzer-header-full">
        ${HTMLBuilder.generateGradeBadge(output.overallGrade)}
        <span class="score-text">${output.score}/100</span>
      </div>
      <p class="analyzer-summary-full">${HTMLBuilder.escapeHTML(output.summary)}</p>
    `;

    return HTMLBuilder.generateSection(
      formattedName,
      headerHTML + detailsHTML,
      sectionId
    );
  }

  /**
   * Generate security analyzer details
   */
  private generateSecurityDetails(output: SecurityAnalyzerOutput): string {
    let html = '';

    if (output.criticalIssues?.length > 0) {
      const rows = output.criticalIssues.map(i => [
        `${HTMLBuilder.generateSeverityBadge(i.severity)}`,
        i.category,
        i.issue,
        i.location,
      ]);
      html += `<h4>Critical Issues</h4>`;
      html += HTMLBuilder.generateTable(['Severity', 'Category', 'Issue', 'Location'], rows);
    }

    if (output.recommendations?.length > 0) {
      html += `<h4>Recommendations</h4><ul>`;
      output.recommendations.forEach(r => {
        html += `<li>${HTMLBuilder.escapeHTML(r)}</li>`;
      });
      html += `</ul>`;
    }

    return html;
  }

  /**
   * Generate license analyzer details
   */
  private generateLicenseDetails(output: LicenseAnalyzerOutput): string {
    let html = '';

    if (output.dealbreakers?.length > 0) {
      const rows = output.dealbreakers.map(d => [d.package, d.license, d.risk, d.impact]);
      html += `<h4>Dealbreakers</h4>`;
      html += HTMLBuilder.generateTable(['Package', 'License', 'Risk', 'Impact'], rows);
    }

    if (output.maImpact) {
      html += `<h4>M&A Impact</h4>`;
      html += `<p><strong>Blocking:</strong> ${output.maImpact.blocking ? 'Yes' : 'No'}</p>`;
      if (output.maImpact.concerns?.length > 0) {
        html += `<ul>`;
        output.maImpact.concerns.forEach(c => {
          html += `<li>${HTMLBuilder.escapeHTML(c)}</li>`;
        });
        html += `</ul>`;
      }
    }

    return html;
  }

  /**
   * Generate quality analyzer details
   */
  private generateQualityDetails(output: QualityAnalyzerOutput): string {
    let html = '';

    if (output.metrics) {
      const rows = [
        ['Lines of Code', String(output.metrics.linesOfCode?.toLocaleString() ?? 'N/A')],
        ['Code Files', String(output.metrics.codeFiles ?? 'N/A')],
        ['Test Files', String(output.metrics.testFiles ?? 'N/A')],
        ['Test Coverage', output.metrics.testCoverage != null ? `${output.metrics.testCoverage}%` : 'N/A'],
        ['Avg File Size', `${output.metrics.avgFileSize ?? 'N/A'} lines`],
        ['Complex Functions', String(output.metrics.complexFunctions ?? 'N/A')],
      ];
      html += `<h4>Quality Metrics</h4>`;
      html += HTMLBuilder.generateTable(['Metric', 'Value'], rows);
    }

    if (output.technicalDebt?.issues?.length > 0) {
      const rows = output.technicalDebt.issues.slice(0, 10).map(i => [
        i.type,
        i.description,
        i.location || 'N/A',
        i.effortToFix,
        i.cost,
      ]);
      html += `<h4>Technical Debt Issues</h4>`;
      html += HTMLBuilder.generateTable(['Type', 'Description', 'Location', 'Effort', 'Cost'], rows);
    }

    if (output.codeSmells?.length > 0) {
      const rows = output.codeSmells.slice(0, 10).map(s => [
        s.smell,
        s.severity,
        String(s.occurrences),
        s.refactoringEffort,
      ]);
      html += `<h4>Code Smells</h4>`;
      html += HTMLBuilder.generateTable(['Smell', 'Severity', 'Occurrences', 'Effort'], rows);
    }

    return html;
  }

  /**
   * Generate cost analyzer details
   */
  private generateCostDetails(output: CostAnalyzerOutput): string {
    let html = '';

    if (output.scalingProjections?.length > 0) {
      const rows = output.scalingProjections.map(p => [
        p.scale,
        String(p.users.toLocaleString()),
        p.estimatedCost,
        p.grossMargin,
      ]);
      html += `<h4>Scaling Projections</h4>`;
      html += HTMLBuilder.generateTable(['Scale', 'Users', 'Estimated Cost', 'Gross Margin'], rows);
    }

    if (output.bottlenecks?.length > 0) {
      const rows = output.bottlenecks.slice(0, 5).map(b => [
        b.severity,
        b.bottleneck,
        b.currentImpact,
        b.remediation,
      ]);
      html += `<h4>Bottlenecks</h4>`;
      html += HTMLBuilder.generateTable(['Severity', 'Bottleneck', 'Current Impact', 'Remediation'], rows);
    }

    return html;
  }

  /**
   * Generate HIPAA analyzer details
   */
  private generateHIPAADetails(output: HIPAAAnalyzerOutput): string {
    let html = '';

    if (output.criticalViolations?.length > 0) {
      const rows = output.criticalViolations.map(v => [
        `${HTMLBuilder.generateSeverityBadge(v.severity)}`,
        v.category,
        v.description,
        v.regulation,
      ]);
      html += `<h4>Critical Violations</h4>`;
      html += HTMLBuilder.generateTable(['Severity', 'Category', 'Description', 'Regulation'], rows);
    }

    if (output.gaps?.length > 0) {
      const rows = output.gaps.slice(0, 10).map(g => [g.area, g.requirement, g.currentState, g.priority]);
      html += `<h4>Compliance Gaps</h4>`;
      html += HTMLBuilder.generateTable(['Area', 'Requirement', 'Current State', 'Priority'], rows);
    }

    return html;
  }

  /**
   * Convert score to letter grade
   */
  private scoreToGrade(score: number): string {
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  }

  /**
   * Determine recommendation based on score and risks
   */
  private determineRecommendation(score: number, risks: string[]): RecommendationLevel {
    const criticalRisks = risks.filter(
      r =>
        r.toLowerCase().includes('critical') ||
        r.toLowerCase().includes('blocking') ||
        r.toLowerCase().includes('immediately')
    );

    if (score < 40 || criticalRisks.length >= 3) {
      return 'Not Recommended';
    }
    if (score < 60 || criticalRisks.length >= 1) {
      return 'Significant Concerns';
    }
    if (score < 75) {
      return 'Proceed with Caution';
    }
    return 'Proceed';
  }

  /**
   * Format analyzer name for display
   */
  private formatAnalyzerName(name: string): string {
    const nameMap: Record<string, string> = {
      security: 'Security Analysis',
      license: 'License Compliance',
      quality: 'Code Quality',
      cost: 'Cost & Scalability',
      hipaa: 'HIPAA Compliance',
    };

    for (const [key, value] of Object.entries(nameMap)) {
      if (name.toLowerCase().includes(key)) {
        return value;
      }
    }

    return name;
  }
}
