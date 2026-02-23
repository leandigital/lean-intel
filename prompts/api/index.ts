/**
 * API-Optimized Prompts - Index
 *
 * Export all prompt generators and schemas
 */

// ========================================
// DOCUMENTATION PROMPT RULES
// ========================================

// Note: Documentation generation now uses document-prompt-rules-* files
// These provide sophisticated prompts for individual file generation
export {
  getFrontendFilesToGenerate,
  generateFrontendFilePrompt,
  CRITICAL_RULE_0,
  CRITICAL_RULE_1,
} from './document-prompt-rules-frontend';

export {
  getBackendFilesToGenerate,
  generateBackendFilePrompt,
} from './document-prompt-rules-backend';

export {
  getMobileFilesToGenerate,
  generateMobileFilePrompt,
} from './document-prompt-rules-mobile';

export {
  getDevOpsFilesToGenerate,
  generateDevOpsFilePrompt,
} from './document-prompt-rules-devops';

// ========================================
// CODE ANALYZERS
// ========================================

// Security Analyzer
export {
  generateSecurityAnalyzerPrompt,
  securityAnalyzerMetadata,
  securityAnalyzerOutputSchema,
  type SecurityAnalyzerOutput,
} from './security-analyzer';

// License Compliance Analyzer
export {
  generateLicenseAnalyzerPrompt,
  licenseAnalyzerMetadata,
  licenseAnalyzerOutputSchema,
  type LicenseAnalyzerOutput,
} from './license-analyzer';

// Code Quality Analyzer
export {
  generateQualityAnalyzerPrompt,
  qualityAnalyzerMetadata,
  qualityAnalyzerOutputSchema,
  type QualityAnalyzerOutput,
} from './quality-analyzer';

// Cost & Scalability Analyzer
export {
  generateCostAnalyzerPrompt,
  costAnalyzerMetadata,
  costAnalyzerOutputSchema,
  type CostAnalyzerOutput,
} from './cost-analyzer';

// HIPAA Compliance Analyzer
export {
  generateHIPAAAnalyzerPrompt,
  hipaaAnalyzerMetadata,
  hipaaAnalyzerOutputSchema,
  type HIPAAAnalyzerOutput,
} from './hipaa-analyzer';

// ========================================
// SUMMARY GENERATOR
// ========================================

// Summary Generator
export {
  generateSummaryGeneratorPrompt,
  summaryGeneratorMetadata,
  summaryGeneratorOutputSchema,
  type SummaryGeneratorOutput,
} from './summary-generator';

// ========================================
// UTILITY FUNCTIONS
// ========================================

/**
 * Get all available analyzers
 */
export function getAnalyzers() {
  return {
    security: {
      metadata: require('./security-analyzer').securityAnalyzerMetadata,
      generate: require('./security-analyzer').generateSecurityAnalyzerPrompt,
      schema: require('./security-analyzer').securityAnalyzerOutputSchema,
    },
    license: {
      metadata: require('./license-analyzer').licenseAnalyzerMetadata,
      generate: require('./license-analyzer').generateLicenseAnalyzerPrompt,
      schema: require('./license-analyzer').licenseAnalyzerOutputSchema,
    },
    quality: {
      metadata: require('./quality-analyzer').qualityAnalyzerMetadata,
      generate: require('./quality-analyzer').generateQualityAnalyzerPrompt,
      schema: require('./quality-analyzer').qualityAnalyzerOutputSchema,
    },
    cost: {
      metadata: require('./cost-analyzer').costAnalyzerMetadata,
      generate: require('./cost-analyzer').generateCostAnalyzerPrompt,
      schema: require('./cost-analyzer').costAnalyzerOutputSchema,
    },
    hipaa: {
      metadata: require('./hipaa-analyzer').hipaaAnalyzerMetadata,
      generate: require('./hipaa-analyzer').generateHIPAAAnalyzerPrompt,
      schema: require('./hipaa-analyzer').hipaaAnalyzerOutputSchema,
    },
  };
}

/**
 * Get analyzer metadata by name
 */
export function getAnalyzerMetadata(name: string) {
  const analyzers: Record<string, { metadata: unknown }> = getAnalyzers();
  return analyzers[name]?.metadata;
}

/**
 * Get summary generator
 */
export function getSummaryGenerator() {
  return {
    metadata: require('./summary-generator').summaryGeneratorMetadata,
    generate: require('./summary-generator').generateSummaryGeneratorPrompt,
    schema: require('./summary-generator').summaryGeneratorOutputSchema,
  };
}
