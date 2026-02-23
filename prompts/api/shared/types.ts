/**
 * Shared types for prompt generators
 * Centralizes common type patterns used across multiple generators
 */

// Token estimates by project size
export interface TokenEstimates {
  input: {
    small: number;
    medium: number;
    large: number;
  };
  output: {
    small: number;
    medium: number;
    large: number;
  };
}

// Prompt generator metadata
export interface PromptMetadata {
  name: string;
  version: string;
  description: string;
  estimatedTokens: TokenEstimates;
}

// Base context properties shared across generators
export interface BaseContext {
  projectType: string;
  frameworks: string[];
  languages: string[];
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
  fileTree: string;
}

// Extended context with package info
export interface PackageContext extends BaseContext {
  packageJsonContent?: string;
  requirementsTxtContent?: string;
  composerJsonContent?: string;
  pomXmlContent?: string;
  goModContent?: string;
}

// Context with database/auth info
export interface InfraContext extends BaseContext {
  hasDatabase: boolean;
  databaseType?: string;
  hasAuthentication: boolean;
  hasAPIEndpoints: boolean;
}

// Context with git info
export interface GitContext {
  gitRecentCommits: string;
  gitCommitCount?: number;
}

// Documentation tier
export type DocumentationTier = 'minimal' | 'standard' | 'comprehensive';

// AI assistant types
export type AIAssistant = 'claude-code' | 'cursor' | 'copilot' | 'chatgpt' | 'gemini';

// Size mode for generated content
export type SizeMode = 'compact' | 'standard' | 'max';

// Project types
export type ProjectType = 'frontend' | 'backend' | 'mobile' | 'devops' | 'fullstack' | 'other';
