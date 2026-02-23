/**
 * Tests for Export functionality (HTMLBuilder, PDFBuilder, ExportGenerator)
 */

import { HTMLBuilder } from '../src/core/htmlBuilder';

describe('HTMLBuilder', () => {
  describe('escapeHTML', () => {
    it('should escape HTML special characters', () => {
      expect(HTMLBuilder.escapeHTML('<script>alert("xss")</script>')).toBe(
        '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;'
      );
    });

    it('should escape ampersands', () => {
      expect(HTMLBuilder.escapeHTML('A & B')).toBe('A &amp; B');
    });

    it('should escape single quotes', () => {
      expect(HTMLBuilder.escapeHTML("It's")).toBe('It&#039;s');
    });
  });

  describe('markdownToHTML', () => {
    it('should convert markdown headers', () => {
      const result = HTMLBuilder.markdownToHTML('# Header 1');
      expect(result).toContain('<h1');
      expect(result).toContain('Header 1');
    });

    it('should convert markdown bold', () => {
      const result = HTMLBuilder.markdownToHTML('**bold text**');
      expect(result).toContain('<strong>bold text</strong>');
    });

    it('should convert markdown code blocks', () => {
      const result = HTMLBuilder.markdownToHTML('```typescript\nconst x = 1;\n```');
      expect(result).toContain('<pre>');
      expect(result).toContain('<code');
      expect(result).toContain('const x = 1');
    });
  });

  describe('generateGradeBadge', () => {
    it('should generate badge for grade A', () => {
      const result = HTMLBuilder.generateGradeBadge('A');
      expect(result).toContain('grade-badge');
      expect(result).toContain('grade-a');
      expect(result).toContain('A');
    });

    it('should generate badge for grade B+', () => {
      const result = HTMLBuilder.generateGradeBadge('B+');
      expect(result).toContain('grade-b');
      expect(result).toContain('B+');
    });

    it('should generate badge for grade F', () => {
      const result = HTMLBuilder.generateGradeBadge('F');
      expect(result).toContain('grade-f');
    });

    it('should handle unknown grades', () => {
      const result = HTMLBuilder.generateGradeBadge('X');
      expect(result).toContain('grade-unknown');
    });
  });

  describe('generateProgressBar', () => {
    it('should generate progress bar with percentage', () => {
      const result = HTMLBuilder.generateProgressBar(75, 100);
      expect(result).toContain('progress-bar-container');
      expect(result).toContain('width: 75%');
      expect(result).toContain('75%');
    });

    it('should cap at 100%', () => {
      const result = HTMLBuilder.generateProgressBar(150, 100);
      expect(result).toContain('width: 100%');
    });

    it('should not go below 0%', () => {
      const result = HTMLBuilder.generateProgressBar(-10, 100);
      expect(result).toContain('width: 0%');
    });

    it('should apply excellent color for high scores', () => {
      const result = HTMLBuilder.generateProgressBar(85);
      expect(result).toContain('score-excellent');
    });

    it('should apply good color for medium scores', () => {
      const result = HTMLBuilder.generateProgressBar(65);
      expect(result).toContain('score-good');
    });

    it('should apply warning color for low scores', () => {
      const result = HTMLBuilder.generateProgressBar(45);
      expect(result).toContain('score-warning');
    });

    it('should apply critical color for very low scores', () => {
      const result = HTMLBuilder.generateProgressBar(25);
      expect(result).toContain('score-critical');
    });
  });

  describe('generateTable', () => {
    it('should generate table with headers and rows', () => {
      const result = HTMLBuilder.generateTable(
        ['Name', 'Score'],
        [['Alice', '95'], ['Bob', '87']]
      );
      expect(result).toContain('<table');
      expect(result).toContain('<th>Name</th>');
      expect(result).toContain('<th>Score</th>');
      expect(result).toContain('<td>Alice</td>');
      expect(result).toContain('<td>95</td>');
    });

    it('should escape HTML in table cells', () => {
      const result = HTMLBuilder.generateTable(
        ['Input'],
        [['<script>bad</script>']]
      );
      expect(result).toContain('&lt;script&gt;');
    });
  });

  describe('generateSeverityBadge', () => {
    it('should generate critical severity badge', () => {
      const result = HTMLBuilder.generateSeverityBadge('Critical');
      expect(result).toContain('severity-badge');
      expect(result).toContain('severity-critical');
      expect(result).toContain('Critical');
    });

    it('should generate high severity badge', () => {
      const result = HTMLBuilder.generateSeverityBadge('High');
      expect(result).toContain('severity-high');
    });

    it('should generate low severity badge', () => {
      const result = HTMLBuilder.generateSeverityBadge('Low');
      expect(result).toContain('severity-low');
    });
  });

  describe('generateAnalyzerCard', () => {
    it('should generate card with all components', () => {
      const result = HTMLBuilder.generateAnalyzerCard(
        'Security Analysis',
        'B',
        78,
        'Overall security is good with minor issues.',
        ['SQL injection risk', 'Missing rate limiting']
      );

      expect(result).toContain('analyzer-card');
      expect(result).toContain('Security Analysis');
      expect(result).toContain('grade-b');
      expect(result).toContain('SQL injection risk');
      expect(result).toContain('Missing rate limiting');
    });

    it('should show no issues message when empty', () => {
      const result = HTMLBuilder.generateAnalyzerCard(
        'License',
        'A',
        95,
        'All licenses are permissive.',
        []
      );

      expect(result).toContain('No critical issues found');
    });
  });

  describe('generateExecutiveHeader', () => {
    it('should generate header with all components', () => {
      const result = HTMLBuilder.generateExecutiveHeader(
        'My Project',
        'January 4, 2026',
        'B',
        82,
        'Proceed with Caution'
      );

      expect(result).toContain('executive-header');
      expect(result).toContain('My Project');
      expect(result).toContain('January 4, 2026');
      expect(result).toContain('grade-b');
      expect(result).toContain('82/100');
      expect(result).toContain('Proceed with Caution');
    });

    it('should apply correct recommendation class', () => {
      const result = HTMLBuilder.generateExecutiveHeader(
        'Project',
        'Date',
        'A',
        90,
        'Proceed'
      );
      expect(result).toContain('rec-proceed');
    });

    it('should apply caution class for caution recommendation', () => {
      const result = HTMLBuilder.generateExecutiveHeader(
        'Project',
        'Date',
        'C',
        65,
        'Proceed with Caution'
      );
      expect(result).toContain('rec-proceed-caution');
    });

    it('should apply not-recommended class', () => {
      const result = HTMLBuilder.generateExecutiveHeader(
        'Project',
        'Date',
        'F',
        30,
        'Not Recommended'
      );
      expect(result).toContain('rec-not-recommended');
    });
  });

  describe('generateRisksStrengths', () => {
    it('should generate two-column layout', () => {
      const result = HTMLBuilder.generateRisksStrengths(
        ['High technical debt', 'No tests'],
        ['Clean architecture', 'Good documentation']
      );

      expect(result).toContain('risks-strengths');
      expect(result).toContain('risk-item');
      expect(result).toContain('strength-item');
      expect(result).toContain('High technical debt');
      expect(result).toContain('Clean architecture');
    });

    it('should handle empty risks', () => {
      const result = HTMLBuilder.generateRisksStrengths([], ['Good code']);
      expect(result).toContain('No significant risks identified');
    });

    it('should handle empty strengths', () => {
      const result = HTMLBuilder.generateRisksStrengths(['Some risk'], []);
      expect(result).toContain('Assessment pending');
    });
  });

  describe('generateTableOfContents', () => {
    it('should generate TOC with links', () => {
      const result = HTMLBuilder.generateTableOfContents([
        { id: 'executive', title: 'Executive Summary' },
        { id: 'security', title: 'Security Analysis' },
      ]);

      expect(result).toContain('table-of-contents');
      expect(result).toContain('href="#executive"');
      expect(result).toContain('Executive Summary');
      expect(result).toContain('href="#security"');
    });
  });

  describe('generateDocument', () => {
    it('should generate complete HTML document', () => {
      const result = HTMLBuilder.generateDocument(
        '<div>Content</div>',
        'My Report',
        'body { color: red; }'
      );

      expect(result).toContain('<!DOCTYPE html>');
      expect(result).toContain('<title>My Report</title>');
      expect(result).toContain('<style>body { color: red; }</style>');
      expect(result).toContain('<div>Content</div>');
    });

    it('should escape title', () => {
      const result = HTMLBuilder.generateDocument(
        'content',
        '<script>bad</script>',
        ''
      );
      expect(result).toContain('&lt;script&gt;');
    });
  });

  describe('generateSection', () => {
    it('should generate section with id', () => {
      const result = HTMLBuilder.generateSection(
        'Security',
        '<p>Details here</p>',
        'security-section'
      );

      expect(result).toContain('report-section');
      expect(result).toContain('id="security-section"');
      expect(result).toContain('Security');
      expect(result).toContain('<p>Details here</p>');
    });

    it('should work without id', () => {
      const result = HTMLBuilder.generateSection('Title', 'Content');
      expect(result).not.toContain('id=');
      expect(result).toContain('Title');
    });
  });
});
