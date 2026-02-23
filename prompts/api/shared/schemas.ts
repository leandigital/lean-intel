/**
 * Shared Zod schemas for analyzer prompts
 * Centralizes common schema patterns used across multiple analyzers
 */

import { z } from 'zod';

// Common grade schema (A-F)
export const gradeSchema = z.enum(['A', 'B', 'C', 'D', 'F']);
export type Grade = z.infer<typeof gradeSchema>;

// Common severity schema
export const severitySchema = z.enum(['Critical', 'High', 'Medium', 'Low']);
export type Severity = z.infer<typeof severitySchema>;

// Extended severity with Informational
export const extendedSeveritySchema = z.enum(['Critical', 'High', 'Medium', 'Low', 'Informational']);
export type ExtendedSeverity = z.infer<typeof extendedSeveritySchema>;

// Quality assessment schema
export const assessmentSchema = z.enum([
  'Excellent',
  'Good',
  'Acceptable',
  'Needs Improvement',
  'Poor',
  'Critical',
]);
export type Assessment = z.infer<typeof assessmentSchema>;

// M&A recommendation schema
export const recommendationSchema = z.enum([
  'Recommend - Minor improvements needed',
  'Acceptable - Some refactoring required',
  'Caution - Significant technical debt',
  'Not Recommended - Major refactoring required',
  'Reject - Dealbreaker issues present',
]);
export type Recommendation = z.infer<typeof recommendationSchema>;

// Common issue schema pattern
export const issueSchema = z.object({
  severity: severitySchema,
  category: z.string(),
  issue: z.string(),
  location: z.string().optional(),
  impact: z.string(),
  remediation: z.string(),
});
export type Issue = z.infer<typeof issueSchema>;

// Common vulnerability schema pattern
export const vulnerabilitySchema = z.object({
  package: z.string(),
  currentVersion: z.string(),
  vulnerability: z.string(),
  severity: z.string(),
  fixedVersion: z.string().nullable().optional(),
  cveId: z.string().nullable().optional(),
});
export type Vulnerability = z.infer<typeof vulnerabilitySchema>;

// Common executive summary pattern
export const executiveSummaryBaseSchema = z.object({
  tldr: z.string(),
  overallAssessment: assessmentSchema,
  recommendation: recommendationSchema,
});

// Score and grade base schema
export const scoreBaseSchema = z.object({
  overallGrade: gradeSchema,
  score: z.number().min(0).max(100),
  summary: z.string(),
});
