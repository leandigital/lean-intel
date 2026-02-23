/**
 * Tests for FileGenerator
 */

import { FileGenerator } from '../src/core/fileGenerator';
import { AnalyzerResult } from '../src/types';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';

// Mock the logger to avoid chalk ESM issues
jest.mock('../src/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    success: jest.fn(),
    newLine: jest.fn(),
    section: jest.fn(),
  },
}));

describe('FileGenerator', () => {
  let tempDir: string;
  let generator: FileGenerator;

  beforeEach(async () => {
    // Create a temporary directory for each test
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'lean-intel-test-'));
    generator = new FileGenerator(tempDir);
  });

  afterEach(async () => {
    // Clean up temporary directory
    await fs.remove(tempDir);
  });

  describe('generateFiles', () => {
    it('should create output directory if it does not exist', async () => {
      const results: AnalyzerResult[] = [
        {
          name: 'test',
          status: 'success',
          output: '# Test File',
          tokensUsed: 100,
          cost: 0.01,
          duration: 5,
        },
      ];

      await generator.generateFiles(results);

      const reportsDirExists = await fs.pathExists(path.join(tempDir, 'lean-reports'));
      expect(reportsDirExists).toBe(true);
    });

    it('should skip results with error status', async () => {
      const results: AnalyzerResult[] = [
        {
          name: 'test',
          status: 'error',
          error: 'Test error',
          tokensUsed: 0,
          cost: 0,
          duration: 0,
        },
      ];

      const files = await generator.generateFiles(results);

      expect(files).toHaveLength(0);
    });

    it('should skip results with skipped status', async () => {
      const results: AnalyzerResult[] = [
        {
          name: 'test',
          status: 'skipped',
          tokensUsed: 0,
          cost: 0,
          duration: 0,
        },
      ];

      const files = await generator.generateFiles(results);

      expect(files).toHaveLength(0);
    });

    it('should generate files from multiple results', async () => {
      const results: AnalyzerResult[] = [
        {
          name: 'security',
          status: 'success',
          output: '# Security Report',
          tokensUsed: 100,
          cost: 0.01,
          duration: 5,
        },
        {
          name: 'license',
          status: 'success',
          output: '# License Report',
          tokensUsed: 100,
          cost: 0.01,
          duration: 5,
        },
      ];

      const files = await generator.generateFiles(results);

      expect(files).toHaveLength(2);
    });
  });

  describe('JSON Format Parsing', () => {
    describe('Files array format', () => {
      it('should parse JSON with files array', async () => {
        const jsonOutput = JSON.stringify({
          files: [
            { filename: 'TEST1.md', content: '# Test 1' },
            { filename: 'TEST2.md', content: '# Test 2' },
          ],
        });

        const results: AnalyzerResult[] = [
          {
            name: 'documentation',
            status: 'success',
            output: jsonOutput,
            tokensUsed: 100,
            cost: 0.01,
            duration: 5,
          },
        ];

        const files = await generator.generateFiles(results);

        expect(files).toHaveLength(2);
        const file1Content = await fs.readFile(files[0], 'utf-8');
        const file2Content = await fs.readFile(files[1], 'utf-8');
        expect(file1Content).toBe('# Test 1');
        expect(file2Content).toBe('# Test 2');
      });

      it('should skip files without filename', async () => {
        const jsonOutput = JSON.stringify({
          files: [
            { filename: 'TEST1.md', content: '# Test 1' },
            { content: '# Test without filename' },
          ],
        });

        const results: AnalyzerResult[] = [
          {
            name: 'documentation',
            status: 'success',
            output: jsonOutput,
            tokensUsed: 100,
            cost: 0.01,
            duration: 5,
          },
        ];

        const files = await generator.generateFiles(results);

        expect(files).toHaveLength(1);
      });

      it('should skip files without content', async () => {
        const jsonOutput = JSON.stringify({
          files: [
            { filename: 'TEST1.md', content: '# Test 1' },
            { filename: 'TEST2.md' },
          ],
        });

        const results: AnalyzerResult[] = [
          {
            name: 'documentation',
            status: 'success',
            output: jsonOutput,
            tokensUsed: 100,
            cost: 0.01,
            duration: 5,
          },
        ];

        const files = await generator.generateFiles(results);

        expect(files).toHaveLength(1);
      });
    });

    describe('Error format', () => {
      it('should handle JSON error format', async () => {
        const jsonOutput = JSON.stringify({
          error: 'Test error message',
        });

        const results: AnalyzerResult[] = [
          {
            name: 'security',
            status: 'success',
            output: jsonOutput,
            tokensUsed: 100,
            cost: 0.01,
            duration: 5,
          },
        ];

        const files = await generator.generateFiles(results);

        expect(files).toHaveLength(1);
        const content = await fs.readFile(files[0], 'utf-8');
        expect(content).toContain('SECURITY - Error');
        expect(content).toContain('Test error message');
      });
    });

    describe('Analyzer report format', () => {
      it('should convert security analyzer JSON to markdown', async () => {
        const jsonOutput = JSON.stringify({
          overallGrade: 'B',
          score: 85,
          summary: 'Good security posture',
          criticalIssues: [
            {
              issue: 'XSS Vulnerability',
              severity: 'High',
              category: 'Input Validation',
              location: 'src/utils/sanitize.ts:15',
              impact: 'Could allow script injection',
              remediation: 'Use proper input sanitization',
            },
          ],
          vulnerabilities: {
            dependencies: [
              {
                package: 'lodash',
                currentVersion: '4.17.19',
                vulnerability: 'Prototype Pollution',
                severity: 'High',
                fixedVersion: '4.17.21',
                cveId: 'CVE-2020-8203',
              },
            ],
            hardcodedSecrets: [
              {
                type: 'API Key',
                file: 'src/config.ts',
                line: 10,
                pattern: 'sk-*****',
              },
            ],
          },
        });

        const results: AnalyzerResult[] = [
          {
            name: 'security',
            status: 'success',
            output: jsonOutput,
            tokensUsed: 100,
            cost: 0.01,
            duration: 5,
          },
        ];

        const files = await generator.generateFiles(results);

        expect(files).toHaveLength(1);
        const content = await fs.readFile(files[0], 'utf-8');
        expect(content).toContain('Security Analysis Report');
        expect(content).toContain('**Overall Grade:** B (85/100)');
        expect(content).toContain('Good security posture');
        expect(content).toContain('XSS Vulnerability');
        expect(content).toContain('lodash');
        expect(content).toContain('CVE-2020-8203');
      });

      it('should handle analyzer report without score', async () => {
        const jsonOutput = JSON.stringify({
          overallGrade: 'A',
          summary: 'Excellent',
          criticalIssues: [],
        });

        const results: AnalyzerResult[] = [
          {
            name: 'license',
            status: 'success',
            output: jsonOutput,
            tokensUsed: 100,
            cost: 0.01,
            duration: 5,
          },
        ];

        const files = await generator.generateFiles(results);

        expect(files).toHaveLength(1);
        const content = await fs.readFile(files[0], 'utf-8');
        expect(content).toContain('**Overall Grade:** A');
        // Should not contain score in parentheses since score is not provided
        expect(content).not.toMatch(/\(\d+\/100\)/);
      });

      it('should handle empty critical issues', async () => {
        const jsonOutput = JSON.stringify({
          overallGrade: 'A',
          score: 95,
          summary: 'No issues',
          criticalIssues: [],
          vulnerabilities: {
            dependencies: [],
            hardcodedSecrets: [],
          },
        });

        const results: AnalyzerResult[] = [
          {
            name: 'security',
            status: 'success',
            output: jsonOutput,
            tokensUsed: 100,
            cost: 0.01,
            duration: 5,
          },
        ];

        const files = await generator.generateFiles(results);

        expect(files).toHaveLength(1);
        const content = await fs.readFile(files[0], 'utf-8');
        expect(content).toContain('No critical issues found');
        expect(content).toContain('No dependency vulnerabilities found');
        expect(content).toContain('No hardcoded secrets detected');
      });
    });
  });

  describe('Markdown Format Parsing', () => {
    describe('File markers format', () => {
      it('should parse markdown with file markers', async () => {
        const markdownOutput = `### FILE: TEST1.md
# Test 1 Content

Some content here.

### FILE: TEST2.md
# Test 2 Content

More content here.`;

        const results: AnalyzerResult[] = [
          {
            name: 'documentation',
            status: 'success',
            output: markdownOutput,
            tokensUsed: 100,
            cost: 0.01,
            duration: 5,
          },
        ];

        const files = await generator.generateFiles(results);

        expect(files).toHaveLength(2);
        const file1Content = await fs.readFile(files[0], 'utf-8');
        const file2Content = await fs.readFile(files[1], 'utf-8');
        expect(file1Content).toContain('# Test 1 Content');
        expect(file2Content).toContain('# Test 2 Content');
      });

      it('should trim whitespace from filename and content', async () => {
        const markdownOutput = `### FILE:   TEST1.md
  # Test 1 Content

Some content here.  `;

        const results: AnalyzerResult[] = [
          {
            name: 'documentation',
            status: 'success',
            output: markdownOutput,
            tokensUsed: 100,
            cost: 0.01,
            duration: 5,
          },
        ];

        const files = await generator.generateFiles(results);

        expect(files).toHaveLength(1);
        expect(path.basename(files[0])).toBe('TEST1.md');
      });
    });

    describe('Plain markdown format', () => {
      it('should handle plain markdown without markers', async () => {
        const markdownOutput = `# Security Report

This is a plain markdown file.`;

        const results: AnalyzerResult[] = [
          {
            name: 'security',
            status: 'success',
            output: markdownOutput,
            tokensUsed: 100,
            cost: 0.01,
            duration: 5,
          },
        ];

        const files = await generator.generateFiles(results);

        expect(files).toHaveLength(1);
        expect(path.basename(files[0])).toBe('SECURITY.md');
        const content = await fs.readFile(files[0], 'utf-8');
        expect(content).toBe(markdownOutput);
      });
    });
  });

  describe('Default Filenames', () => {
    it('should use correct filename for security analyzer', async () => {
      const results: AnalyzerResult[] = [
        {
          name: 'security',
          status: 'success',
          output: '# Security',
          tokensUsed: 100,
          cost: 0.01,
          duration: 5,
        },
      ];

      const files = await generator.generateFiles(results);
      expect(path.basename(files[0])).toBe('SECURITY.md');
    });

    it('should use correct filename for license analyzer', async () => {
      const results: AnalyzerResult[] = [
        {
          name: 'license',
          status: 'success',
          output: '# License',
          tokensUsed: 100,
          cost: 0.01,
          duration: 5,
        },
      ];

      const files = await generator.generateFiles(results);
      expect(path.basename(files[0])).toBe('LICENSE_COMPLIANCE.md');
    });

    it('should use correct filename for quality analyzer', async () => {
      const results: AnalyzerResult[] = [
        {
          name: 'quality',
          status: 'success',
          output: '# Quality',
          tokensUsed: 100,
          cost: 0.01,
          duration: 5,
        },
      ];

      const files = await generator.generateFiles(results);
      expect(path.basename(files[0])).toBe('CODE_QUALITY.md');
    });

    it('should use correct filename for cost analyzer', async () => {
      const results: AnalyzerResult[] = [
        {
          name: 'cost',
          status: 'success',
          output: '# Cost',
          tokensUsed: 100,
          cost: 0.01,
          duration: 5,
        },
      ];

      const files = await generator.generateFiles(results);
      expect(path.basename(files[0])).toBe('COST_SCALABILITY.md');
    });

    it('should use correct filename for HIPAA analyzer', async () => {
      const results: AnalyzerResult[] = [
        {
          name: 'hipaa',
          status: 'success',
          output: '# HIPAA',
          tokensUsed: 100,
          cost: 0.01,
          duration: 5,
        },
      ];

      const files = await generator.generateFiles(results);
      expect(path.basename(files[0])).toBe('HIPAA_COMPLIANCE.md');
    });

    it('should use uppercase filename for unknown analyzer', async () => {
      const results: AnalyzerResult[] = [
        {
          name: 'custom',
          status: 'success',
          output: '# Custom',
          tokensUsed: 100,
          cost: 0.01,
          duration: 5,
        },
      ];

      const files = await generator.generateFiles(results);
      expect(path.basename(files[0])).toBe('CUSTOM.md');
    });
  });

  describe('Subdirectory Support', () => {
    it('should create files in subdirectory when specified', async () => {
      const generatorWithSubdir = new FileGenerator(tempDir, 'lean-reports', 'analysis');

      const results: AnalyzerResult[] = [
        {
          name: 'security',
          status: 'success',
          output: '# Security',
          tokensUsed: 100,
          cost: 0.01,
          duration: 5,
        },
      ];

      const files = await generatorWithSubdir.generateFiles(results);

      expect(files[0]).toContain(path.join('lean-reports', 'analysis'));
      const fileExists = await fs.pathExists(files[0]);
      expect(fileExists).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle invalid JSON gracefully', async () => {
      const results: AnalyzerResult[] = [
        {
          name: 'security',
          status: 'success',
          output: '{ invalid json }',
          tokensUsed: 100,
          cost: 0.01,
          duration: 5,
        },
      ];

      const files = await generator.generateFiles(results);

      // Should fall back to treating as plain markdown
      expect(files).toHaveLength(1);
      const content = await fs.readFile(files[0], 'utf-8');
      expect(content).toBe('{ invalid json }');
    });

    it('should handle empty output', async () => {
      const results: AnalyzerResult[] = [
        {
          name: 'security',
          status: 'success',
          output: '',
          tokensUsed: 100,
          cost: 0.01,
          duration: 5,
        },
      ];

      const files = await generator.generateFiles(results);

      // Empty output doesn't create a file (skipped by parseAndCreateFiles)
      // The implementation only creates files when output is truthy
      expect(files).toHaveLength(0);
    });

    it('should handle special characters in filenames', async () => {
      const jsonOutput = JSON.stringify({
        files: [{ filename: 'TEST FILE.md', content: '# Test' }],
      });

      const results: AnalyzerResult[] = [
        {
          name: 'documentation',
          status: 'success',
          output: jsonOutput,
          tokensUsed: 100,
          cost: 0.01,
          duration: 5,
        },
      ];

      const files = await generator.generateFiles(results);

      expect(files).toHaveLength(1);
      const fileExists = await fs.pathExists(files[0]);
      expect(fileExists).toBe(true);
    });
  });
});
