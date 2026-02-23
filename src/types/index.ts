/**
 * Core types for lean-intel CLI
 */

export type ProjectType = 'frontend' | 'backend' | 'devops' | 'mobile' | 'unknown';

export type AIAssistant = 'claude-code' | 'cursor' | 'copilot' | 'chatgpt' | 'gemini';

export type LLMProviderType = 'anthropic' | 'openai' | 'google' | 'xai';

export type DocumentationTier = 'minimal' | 'standard' | 'comprehensive';

export interface ProjectContext {
  projectType: ProjectType;
  rootPath: string;
  packageManager?: 'npm' | 'yarn' | 'pnpm' | 'bun';
  frameworks: string[];
  languages: string[];
  hasDatabase: boolean;
  databaseType?: string;
  hasTests: boolean;
  hasCICD: boolean;
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
  fileCount: number;
  lineCount: number;
  documentationTier?: DocumentationTier; // Auto-determined based on codebase size
}

/**
 * Global config (~/.lean-intel/config.json) — shared across projects.
 * Project-specific config (provider, model, API key, etc.) lives in .lean-intel.json.
 */
export interface Config {
  githubToken?: string;
  bitbucketToken?: string;
}

export interface AnalysisOptions {
  docs: boolean;
  security: boolean;
  license: boolean;
  quality: boolean;
  cost: boolean;
  hipaa: boolean;
  createPR: boolean;
  dryRun: boolean;
  skipCache: boolean;
}

export interface AnalyzerResult {
  name: string;
  status: 'success' | 'error' | 'skipped';
  output?: string;
  error?: string;
  tokensUsed: number;
  cost: number;
  duration: number;
}

export interface AnalysisResults {
  projectContext: ProjectContext;
  analyzers: AnalyzerResult[];
  generatedFiles: string[];
  totalCost: number;
  totalDuration: number;
  timestamp: string;
}

export interface CostEstimate {
  inputTokens: number;
  outputTokens: number;
  estimatedCost: number;
  estimatedDuration: number; // in minutes
  pricingInfo?: string; // e.g., "$3/$15 per M"
}

export interface PromptTemplate {
  name: string;
  version: string;
  content: string;
  projectType: ProjectType;
  requiredContext: string[];
}

export interface PROptions {
  branch: string;
  title: string;
  description: string;
  labels?: string[];
}

export interface GitHubPRResponse {
  url: string;
  number: number;
}

// ============================================
// Context Types for Gatherers
// ============================================

export interface DocumentationContext {
  projectName: string;
  projectDescription: string;
  industry: string;
  documentationTier: DocumentationTier;
  fileTree: string;
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
  gitRecentCommits: string;
  packageJsonContent: string;
  requirementsTxtContent?: string;
  // File lists
  componentFiles: string[];
  routingFiles: string[];
  routeFiles?: string[]; // Alias for routingFiles
  stateManagementFiles: string[];
  apiFiles: string[];
  stylingFiles: string[];
  controllerFiles: string[];
  serviceFiles: string[];
  modelFiles: string[];
  middlewareFiles: string[];
  screenFiles: string[];
  navigationFiles: string[];
  nativeModuleFiles: string[];
  terraformFiles: string[];
  k8sFiles: string[];
  cicdFiles: string[];
  dockerFiles: string[];
  // File contents (optional)
  componentFileContents?: Record<string, string>;
  routingFileContents?: Record<string, string>;
  stateFileContents?: Record<string, string>;
  apiFileContents?: Record<string, string>;
  controllerFileContents?: Record<string, string>;
  serviceFileContents?: Record<string, string>;
  modelFileContents?: Record<string, string>;
  entryPointContent?: string | null;
  // Flags
  hasDatabase?: boolean;
  databaseType?: string;
  hasAuthentication?: boolean;
  hasKubernetes?: boolean;
  hasTerraform?: boolean;
  cloudProvider?: string;
  mobilePlatform?: string;
}

export interface SecurityContext {
  projectType: string;
  frameworks: string[];
  languages: string[];
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
  fileTree: string;
  packageJsonContent?: string;
  requirementsTxtContent?: string;
  hasDatabase: boolean;
  hasAuthentication: boolean;
  hasAPIEndpoints: boolean;
  environmentFiles: string[];
  configFiles: string[];
  isMobile?: boolean;
  mobileFramework?: 'react-native' | 'expo' | 'flutter' | 'ios-native' | 'android-native';
  npmAuditOutput?: string | null;
  codeSamples?: Record<string, string>;
}

export interface LicenseContext {
  projectType: string;
  frameworks: string[];
  languages: string[];
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
  packageJsonContent?: string;
  requirementsTxtContent?: string;
  licenseFiles: string[];
  hasCommercialUse: boolean;
  isOpenSource: boolean;
  licenseCheckerOutput?: string | null;
  dependencyLicenses?: Record<string, string>;
}

// ============================================
// Analyzer Output Types
// ============================================

export type AnalyzerGrade = 'A' | 'B' | 'C' | 'D' | 'F';
export type IssueSeverity = 'Critical' | 'High' | 'Medium' | 'Low' | 'Informational';

export interface SecurityIssue {
  severity: IssueSeverity;
  category: string;
  issue: string;
  location: string;
  impact: string;
  remediation: string;
  cveId?: string | null;
}

export interface DependencyVulnerability {
  package: string;
  currentVersion: string;
  vulnerability: string;
  severity: IssueSeverity;
  fixedVersion: string;
  cveId?: string | null;
}

export interface HardcodedSecret {
  type: string;
  file: string;
  line?: number | null;
  pattern: string;
}

export interface InsecurePattern {
  pattern: string;
  file: string;
  line?: number | null;
  risk: string;
}

export interface SecurityAnalyzerOutput {
  overallGrade: AnalyzerGrade;
  score: number;
  summary: string;
  criticalIssues: SecurityIssue[];
  vulnerabilities: {
    dependencies: DependencyVulnerability[];
    hardcodedSecrets: HardcodedSecret[];
    insecurePatterns: InsecurePattern[];
  };
  recommendations: string[];
}

export interface LicenseDealbreaker {
  package: string;
  version: string;
  license: string;
  risk: string;
  impact: string;
  remediation: string;
}

export interface LicenseBreakdown {
  name: string;
  count: number;
  examples: string[];
}

export interface LicenseRisk {
  severity: IssueSeverity;
  category: string;
  issue: string;
  packages: string[];
  impact: string;
  remediation: string;
}

export interface LicenseAnalyzerOutput {
  overallGrade: AnalyzerGrade;
  score: number;
  summary: string;
  dealbreakers: LicenseDealbreaker[];
  licenseBreakdown: {
    permissive: LicenseBreakdown[];
    weakCopyleft: LicenseBreakdown[];
    strongCopyleft: LicenseBreakdown[];
    proprietary: LicenseBreakdown[];
    unknown: Array<{ package: string; version: string }>;
  };
  risks: LicenseRisk[];
  recommendations: string[];
  maImpact: {
    blocking: boolean;
    concerns: string[];
    remediationCost: string;
  };
}

export interface QualityTechnicalDebtIssue {
  type: string;
  description: string;
  location?: string;
  impact: string;
  effortToFix: string;
  cost: string;
}

export interface QualityCodeSmell {
  smell: string;
  severity: string;
  occurrences: number;
  files: string[];
  impact: string;
  refactoringEffort: string;
}

export interface QualityAnalyzerOutput {
  overallGrade: AnalyzerGrade;
  score: number;
  summary: string;
  technicalDebtPercentage: number;
  metrics: {
    linesOfCode: number;
    codeFiles: number;
    testFiles: number;
    testCoverage: number | null;
    avgFileSize: number;
    complexFunctions: number;
  };
  technicalDebt: {
    category: string;
    severity: string;
    issues: QualityTechnicalDebtIssue[];
    totalRemediationCost: string;
    totalRemediationTime: string;
  };
  codeSmells: QualityCodeSmell[];
  recommendations: Array<string | { priority: string; action: string; effort: string; impact: string }>;
}

export interface CostScalingProjection {
  scale: string;
  users: number;
  estimatedCost: string;
  grossMargin: string;
  notes: string;
}

export interface CostBottleneck {
  bottleneck: string;
  severity: string;
  currentImpact: string;
  scaleLimit: string;
  costAtScale: string;
  remediation: string;
  remediationCost: string;
}

export interface CostAnalyzerOutput {
  overallGrade: AnalyzerGrade;
  score: number;
  summary: string;
  currentScale: {
    mau?: number | string;
    dau?: number | string;
    requestsPerMonth?: number | string;
    monthlyCost: string;
  };
  scalingProjections: CostScalingProjection[];
  bottlenecks: CostBottleneck[];
  recommendations: Array<string | { priority: string; action: string; currentCost: string; projectedSavings: string; effort: string }>;
  viabilityAssessment: {
    isViable: boolean | string;
    breakeven: string;
    concerns: string[];
  };
}

export interface HIPAAViolation {
  severity: IssueSeverity;
  category: string;
  description: string;
  regulation: string;
  location: string;
  remediation: string;
}

export interface PHIField {
  field: string;
  location: string;
  dataType: string;
  sensitivity: string;
}

export interface PHITransmission {
  endpoint: string;
  method: string;
  phiFields: string[];
  encryption: boolean;
  concerns: string;
}

export interface HIPAAGap {
  area: string;
  requirement: string;
  currentState: string;
  remediation: string;
  priority: string;
}

export interface HIPAAAnalyzerOutput {
  overallGrade: AnalyzerGrade;
  score: number;
  summary: string;
  criticalViolations: HIPAAViolation[];
  phiInventory: {
    fields: PHIField[];
    transmission: PHITransmission[];
  };
  gaps: HIPAAGap[];
  recommendations: string[];
}

// ============================================
// Export Types
// ============================================

export type ExportFormat = 'pdf' | 'html';

export type RecommendationLevel =
  | 'Proceed'
  | 'Proceed with Caution'
  | 'Significant Concerns'
  | 'Not Recommended';

export interface ExportOptions {
  formats: ExportFormat[];
  includeSections: string[];
  outputDir: string;
  projectName: string;
  industry: string;
}

export interface ExportResult {
  format: ExportFormat;
  path: string;
  size: number; // bytes
}

export interface AnalyzerSummary {
  name: string;
  grade: string;
  score: number;
  topIssues: string[];
}

export interface ExecutiveSummary {
  projectName: string;
  generatedDate: string;
  overallGrade: string;
  overallScore: number;
  recommendation: RecommendationLevel;
  analyzerSummaries: AnalyzerSummary[];
  keyRisks: string[];
  keyStrengths: string[];
}
