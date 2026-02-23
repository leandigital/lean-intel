/**
 * Report CSS styles for PDF/HTML exports
 * Embedded as TypeScript for easy bundling
 */

export const REPORT_CSS = `
/* Reset and base styles */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
  font-size: 14px;
  line-height: 1.6;
  color: #1a1a1a;
  background: #ffffff;
  padding: 0;
}

/* Typography */
h1 {
  font-size: 28px;
  font-weight: 700;
  color: #0a0a0a;
  margin-bottom: 8px;
}

h2 {
  font-size: 22px;
  font-weight: 600;
  color: #1a1a1a;
  margin-bottom: 16px;
  padding-bottom: 8px;
  border-bottom: 2px solid #e5e7eb;
}

h3 {
  font-size: 18px;
  font-weight: 600;
  color: #374151;
  margin-bottom: 12px;
}

h4 {
  font-size: 14px;
  font-weight: 600;
  color: #4b5563;
  margin-bottom: 8px;
}

p {
  margin-bottom: 12px;
}

/* Executive Header */
.executive-header {
  background: linear-gradient(135deg, #1e3a5f 0%, #2d5a8a 100%);
  color: white;
  padding: 40px;
  border-radius: 8px;
  margin-bottom: 32px;
}

.executive-header .report-title h1 {
  color: white;
  font-size: 32px;
  margin-bottom: 4px;
}

.executive-header .report-title h2 {
  color: rgba(255, 255, 255, 0.9);
  font-size: 24px;
  border-bottom: none;
  font-weight: 400;
  margin-bottom: 8px;
}

.executive-header .generated-date {
  color: rgba(255, 255, 255, 0.7);
  font-size: 14px;
}

.overall-assessment {
  margin-top: 24px;
  padding-top: 24px;
  border-top: 1px solid rgba(255, 255, 255, 0.2);
}

.overall-grade {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 16px;
}

.overall-grade .label {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.8);
}

.overall-grade .score {
  font-size: 18px;
  font-weight: 600;
  color: white;
}

.recommendation {
  margin-top: 20px;
  padding: 16px;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.1);
}

.recommendation .label {
  font-size: 12px;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.7);
  display: block;
  margin-bottom: 4px;
}

.recommendation .value {
  font-size: 18px;
  font-weight: 600;
}

.recommendation.rec-proceed { background: rgba(34, 197, 94, 0.2); }
.recommendation.rec-proceed-caution { background: rgba(234, 179, 8, 0.2); }
.recommendation.rec-significant-concerns { background: rgba(249, 115, 22, 0.2); }
.recommendation.rec-not-recommended { background: rgba(239, 68, 68, 0.2); }

/* Grade Badges */
.grade-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  border-radius: 8px;
  font-size: 24px;
  font-weight: 700;
  color: white;
}

.grade-badge.grade-a { background: #22c55e; }
.grade-badge.grade-b { background: #3b82f6; }
.grade-badge.grade-c { background: #eab308; color: #1a1a1a; }
.grade-badge.grade-d { background: #f97316; }
.grade-badge.grade-f { background: #ef4444; }
.grade-badge.grade-unknown { background: #6b7280; }

/* Progress Bars */
.progress-bar-container {
  position: relative;
  height: 24px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 12px;
  overflow: hidden;
}

.progress-bar {
  height: 100%;
  border-radius: 12px;
  transition: width 0.3s ease;
}

.progress-bar.score-excellent { background: #22c55e; }
.progress-bar.score-good { background: #3b82f6; }
.progress-bar.score-warning { background: #eab308; }
.progress-bar.score-critical { background: #ef4444; }

.progress-text {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 12px;
  font-weight: 600;
  color: white;
}

/* Analyzer Cards */
.analyzer-cards {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 24px;
  margin-bottom: 32px;
}

.analyzer-card {
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 24px;
}

.analyzer-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.analyzer-header h3 {
  margin-bottom: 0;
}

.analyzer-header .grade-badge {
  width: 40px;
  height: 40px;
  font-size: 18px;
}

.analyzer-card .progress-bar-container {
  background: #e5e7eb;
  margin-bottom: 16px;
}

.analyzer-card .progress-text {
  color: #374151;
}

.analyzer-summary {
  font-size: 13px;
  color: #4b5563;
  margin-bottom: 16px;
}

.top-issues h4 {
  font-size: 12px;
  text-transform: uppercase;
  color: #6b7280;
  margin-bottom: 8px;
}

.issues-list {
  list-style: none;
  font-size: 13px;
}

.issues-list li {
  padding: 4px 0;
  padding-left: 16px;
  position: relative;
}

.issues-list li::before {
  content: "•";
  position: absolute;
  left: 0;
  color: #f97316;
}

.no-issues {
  font-size: 13px;
  color: #22c55e;
  font-style: italic;
}

/* Risks and Strengths */
.risks-strengths {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 32px;
  margin-bottom: 32px;
}

.risks-strengths .column {
  background: #f9fafb;
  border-radius: 8px;
  padding: 24px;
}

.risks-strengths h3 {
  font-size: 16px;
  margin-bottom: 16px;
  padding-bottom: 8px;
  border-bottom: 2px solid;
}

.risks h3 { border-color: #ef4444; color: #dc2626; }
.strengths h3 { border-color: #22c55e; color: #16a34a; }

.risks-strengths ul {
  list-style: none;
}

.risks-strengths li {
  padding: 8px 0;
  padding-left: 24px;
  position: relative;
  font-size: 14px;
}

.risk-item::before {
  content: "⚠";
  position: absolute;
  left: 0;
}

.strength-item::before {
  content: "✓";
  position: absolute;
  left: 0;
  color: #22c55e;
}

/* Tables */
.report-table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 24px;
  font-size: 13px;
}

.report-table th {
  background: #f3f4f6;
  padding: 12px 16px;
  text-align: left;
  font-weight: 600;
  color: #374151;
  border-bottom: 2px solid #e5e7eb;
}

.report-table td {
  padding: 12px 16px;
  border-bottom: 1px solid #e5e7eb;
}

.report-table tr:nth-child(even) {
  background: #f9fafb;
}

/* Severity Badges */
.severity-badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
}

.severity-critical { background: #fecaca; color: #dc2626; }
.severity-high { background: #fed7aa; color: #ea580c; }
.severity-medium { background: #fef08a; color: #ca8a04; }
.severity-low { background: #bbf7d0; color: #16a34a; }
.severity-informational { background: #e0e7ff; color: #4f46e5; }

/* Sections */
.report-section {
  margin-bottom: 40px;
  page-break-inside: avoid;
}

.section-title {
  margin-bottom: 20px;
}

.section-content {
  line-height: 1.7;
}

/* Table of Contents */
.table-of-contents {
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 24px;
  margin-bottom: 32px;
}

.table-of-contents h2 {
  font-size: 18px;
  margin-bottom: 16px;
  border-bottom: none;
  padding-bottom: 0;
}

.table-of-contents ol {
  margin-left: 20px;
}

.table-of-contents li {
  padding: 4px 0;
}

.table-of-contents a {
  color: #2563eb;
  text-decoration: none;
}

.table-of-contents a:hover {
  text-decoration: underline;
}

/* Code Blocks */
pre {
  background: #1e1e1e;
  border-radius: 6px;
  padding: 16px;
  overflow-x: auto;
  margin-bottom: 16px;
}

code {
  font-family: 'SF Mono', Monaco, 'Courier New', monospace;
  font-size: 13px;
}

pre code {
  color: #d4d4d4;
}

/* Inline code */
p code, li code {
  background: #f3f4f6;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 12px;
  color: #e11d48;
}

/* Print Styles */
@media print {
  body {
    font-size: 12px;
  }

  .executive-header {
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  .grade-badge,
  .progress-bar,
  .severity-badge {
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  .report-section {
    page-break-inside: avoid;
  }

  h2 {
    page-break-after: avoid;
  }
}

/* Highlight.js Theme (VS Code Dark+) */
.hljs {
  color: #d4d4d4;
  background: #1e1e1e;
}

.hljs-keyword { color: #569cd6; }
.hljs-string { color: #ce9178; }
.hljs-number { color: #b5cea8; }
.hljs-comment { color: #6a9955; }
.hljs-function { color: #dcdcaa; }
.hljs-class { color: #4ec9b0; }
.hljs-variable { color: #9cdcfe; }
.hljs-operator { color: #d4d4d4; }
.hljs-punctuation { color: #d4d4d4; }
.hljs-property { color: #9cdcfe; }
.hljs-attr { color: #9cdcfe; }
.hljs-tag { color: #569cd6; }
.hljs-attribute { color: #9cdcfe; }
.hljs-name { color: #4ec9b0; }
`;
