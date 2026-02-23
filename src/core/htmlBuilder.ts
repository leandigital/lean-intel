/**
 * HTML Builder for export generation
 * Converts markdown to styled HTML with syntax highlighting
 */

import { marked } from 'marked';
import hljs from 'highlight.js';

// Configure marked to use highlight.js for code blocks
marked.setOptions({
  async: false,
  breaks: true,
  gfm: true,
});

// Custom renderer for syntax highlighting
const renderer = new marked.Renderer();
renderer.code = ({ text, lang }: { text: string; lang?: string }) => {
  const language = lang && hljs.getLanguage(lang) ? lang : 'plaintext';
  const highlighted = hljs.highlight(text, { language }).value;
  return `<pre><code class="hljs language-${language}">${highlighted}</code></pre>`;
};

marked.use({ renderer });

export class HTMLBuilder {
  /**
   * Convert markdown to styled HTML
   */
  static markdownToHTML(markdown: string): string {
    return marked.parse(markdown) as string;
  }

  /**
   * Generate a complete HTML document with styles
   */
  static generateDocument(content: string, title: string, css: string): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${this.escapeHTML(title)}</title>
  <style>${css}</style>
</head>
<body>
  ${content}
</body>
</html>`;
  }

  /**
   * Generate a table from headers and rows
   */
  static generateTable(headers: string[], rows: string[][]): string {
    const headerRow = headers.map(h => `<th>${this.escapeHTML(h)}</th>`).join('');
    const bodyRows = rows
      .map(
        row => `<tr>${row.map(cell => `<td>${this.escapeHTML(cell)}</td>`).join('')}</tr>`
      )
      .join('\n');

    return `<table class="report-table">
  <thead><tr>${headerRow}</tr></thead>
  <tbody>${bodyRows}</tbody>
</table>`;
  }

  /**
   * Generate a grade badge with appropriate color
   */
  static generateGradeBadge(grade: string): string {
    const colorMap: Record<string, string> = {
      A: 'grade-a',
      B: 'grade-b',
      C: 'grade-c',
      D: 'grade-d',
      F: 'grade-f',
    };

    // Extract letter grade (handles A+, B-, etc.)
    const letterGrade = grade.charAt(0).toUpperCase();
    const colorClass = colorMap[letterGrade] || 'grade-unknown';

    return `<span class="grade-badge ${colorClass}">${this.escapeHTML(grade)}</span>`;
  }

  /**
   * Generate a progress bar for scores
   */
  static generateProgressBar(score: number, max: number = 100): string {
    const percentage = Math.min(100, Math.max(0, (score / max) * 100));
    const colorClass = this.getScoreColorClass(percentage);

    return `<div class="progress-bar-container">
  <div class="progress-bar ${colorClass}" style="width: ${percentage}%"></div>
  <span class="progress-text">${Math.round(percentage)}%</span>
</div>`;
  }

  /**
   * Generate an analyzer summary card
   */
  static generateAnalyzerCard(
    name: string,
    grade: string,
    score: number,
    summary: string,
    topIssues: string[]
  ): string {
    const issuesList = topIssues.length
      ? `<ul class="issues-list">${topIssues.map(i => `<li>${this.escapeHTML(i)}</li>`).join('')}</ul>`
      : '<p class="no-issues">No critical issues found</p>';

    return `<div class="analyzer-card">
  <div class="analyzer-header">
    <h3>${this.escapeHTML(name)}</h3>
    ${this.generateGradeBadge(grade)}
  </div>
  ${this.generateProgressBar(score)}
  <p class="analyzer-summary">${this.escapeHTML(summary)}</p>
  <div class="top-issues">
    <h4>Key Findings</h4>
    ${issuesList}
  </div>
</div>`;
  }

  /**
   * Generate the executive summary header
   */
  static generateExecutiveHeader(
    projectName: string,
    generatedDate: string,
    overallGrade: string,
    overallScore: number,
    recommendation: string
  ): string {
    const recommendationClass = this.getRecommendationClass(recommendation);

    return `<header class="executive-header">
  <div class="report-title">
    <h1>Technical Due Diligence Report</h1>
    <h2>${this.escapeHTML(projectName)}</h2>
    <p class="generated-date">Generated: ${this.escapeHTML(generatedDate)}</p>
  </div>
  <div class="overall-assessment">
    <div class="overall-grade">
      <span class="label">Overall Assessment</span>
      ${this.generateGradeBadge(overallGrade)}
      <span class="score">${overallScore}/100</span>
    </div>
    ${this.generateProgressBar(overallScore)}
    <div class="recommendation ${recommendationClass}">
      <span class="label">Recommendation:</span>
      <span class="value">${this.escapeHTML(recommendation)}</span>
    </div>
  </div>
</header>`;
  }

  /**
   * Generate a section with title and content
   */
  static generateSection(title: string, content: string, id?: string): string {
    const idAttr = id ? ` id="${this.escapeHTML(id)}"` : '';
    return `<section class="report-section"${idAttr}>
  <h2 class="section-title">${this.escapeHTML(title)}</h2>
  <div class="section-content">${content}</div>
</section>`;
  }

  /**
   * Generate a two-column layout for risks and strengths
   */
  static generateRisksStrengths(risks: string[], strengths: string[]): string {
    const risksList = risks.map(r => `<li class="risk-item">${this.escapeHTML(r)}</li>`).join('');
    const strengthsList = strengths
      .map(s => `<li class="strength-item">${this.escapeHTML(s)}</li>`)
      .join('');

    return `<div class="risks-strengths">
  <div class="column risks">
    <h3>Key Risks</h3>
    <ul>${risksList || '<li>No significant risks identified</li>'}</ul>
  </div>
  <div class="column strengths">
    <h3>Key Strengths</h3>
    <ul>${strengthsList || '<li>Assessment pending</li>'}</ul>
  </div>
</div>`;
  }

  /**
   * Generate table of contents
   */
  static generateTableOfContents(sections: { id: string; title: string }[]): string {
    const items = sections.map(s => `<li><a href="#${s.id}">${this.escapeHTML(s.title)}</a></li>`).join('');

    return `<nav class="table-of-contents">
  <h2>Table of Contents</h2>
  <ol>${items}</ol>
</nav>`;
  }

  /**
   * Generate severity badge
   */
  static generateSeverityBadge(severity: string): string {
    const severityLower = severity.toLowerCase();
    return `<span class="severity-badge severity-${severityLower}">${this.escapeHTML(severity)}</span>`;
  }

  /**
   * Escape HTML special characters
   */
  static escapeHTML(text: string): string {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;',
    };
    return text.replace(/[&<>"']/g, char => map[char]);
  }

  /**
   * Get color class based on score percentage
   */
  private static getScoreColorClass(percentage: number): string {
    if (percentage >= 80) return 'score-excellent';
    if (percentage >= 60) return 'score-good';
    if (percentage >= 40) return 'score-warning';
    return 'score-critical';
  }

  /**
   * Get recommendation class for styling
   */
  private static getRecommendationClass(recommendation: string): string {
    const lower = recommendation.toLowerCase();
    if (lower.includes('not recommended')) return 'rec-not-recommended';
    if (lower.includes('significant')) return 'rec-significant-concerns';
    if (lower.includes('caution')) return 'rec-proceed-caution';
    return 'rec-proceed';
  }
}
