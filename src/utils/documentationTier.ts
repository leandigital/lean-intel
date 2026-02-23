/**
 * Determines documentation tier based on codebase size and characteristics
 */

export type DocumentationTier = 'minimal' | 'standard' | 'comprehensive';

export interface TierConfig {
  tier: DocumentationTier;
  description: string;
  fileRange: string;
  docsFileCount: string;
  aiAssistantSizeMode: 'compact' | 'standard' | 'max';
}

const TIER_CONFIGS: Record<DocumentationTier, TierConfig> = {
  minimal: {
    tier: 'minimal',
    description: 'Small codebase - focused documentation',
    fileRange: '< 20 source files',
    docsFileCount: '2-3 files (SUMMARY.md, AI_ASSISTANT.md)',
    aiAssistantSizeMode: 'compact',
  },
  standard: {
    tier: 'standard',
    description: 'Medium codebase - balanced documentation',
    fileRange: '20-200 source files',
    docsFileCount: '5-8 files (core documentation)',
    aiAssistantSizeMode: 'standard',
  },
  comprehensive: {
    tier: 'comprehensive',
    description: 'Large codebase - full documentation suite',
    fileRange: '200+ source files',
    docsFileCount: '10-20 files (complete suite)',
    aiAssistantSizeMode: 'max',
  },
};

/**
 * Determine documentation tier based on codebase characteristics
 */
export function determineDocumentationTier(
  sourceFileCount: number,
  options?: {
    industry?: string;
    projectType?: string;
    isMonorepo?: boolean;
    hasComplexDomain?: boolean;
  }
): DocumentationTier {
  const { industry, isMonorepo, hasComplexDomain } = options || {};

  // Industry overrides - healthcare/finance always get comprehensive
  if (industry?.match(/health|medical|fhir|hipaa|finance|fintech|banking/i)) {
    return 'comprehensive';
  }

  // Monorepo structure always gets comprehensive
  if (isMonorepo) {
    return 'comprehensive';
  }

  // Complex domain (e.g., lots of state management, complex routing) bumps up tier
  if (hasComplexDomain && sourceFileCount >= 15) {
    // 15-20 files with complexity → standard instead of minimal
    return sourceFileCount < 150 ? 'standard' : 'comprehensive';
  }

  // File count-based tiers
  if (sourceFileCount < 20) {
    return 'minimal';
  }

  if (sourceFileCount < 200) {
    return 'standard';
  }

  return 'comprehensive';
}

/**
 * Get tier configuration
 */
export function getTierConfig(tier: DocumentationTier): TierConfig {
  return TIER_CONFIGS[tier];
}

/**
 * Determine AI assistant size mode based on BOTH AI assistant type AND codebase size
 */
export function determineAIAssistantSizeMode(
  aiAssistant: 'claude-code' | 'cursor' | 'copilot' | 'chatgpt' | 'gemini',
  codebaseTier: DocumentationTier,
  manualOverride?: 'compact' | 'standard' | 'max'
): 'compact' | 'standard' | 'max' {
  // Manual override takes precedence
  if (manualOverride) {
    return manualOverride;
  }

  // AI assistant capability limits (minimum mode for this assistant)
  const aiAssistantMinMode: Record<string, 'compact' | 'standard' | 'max'> = {
    'claude-code': 'standard', // Can handle max, but start with standard for medium codebases
    cursor: 'standard',
    chatgpt: 'standard',
    gemini: 'standard',
    copilot: 'compact', // Limited context, keep compact
  };

  // Codebase tier recommendation
  const tierRecommendation: Record<DocumentationTier, 'compact' | 'standard' | 'max'> = {
    minimal: 'compact',
    standard: 'standard',
    comprehensive: 'max',
  };

  const minMode = aiAssistantMinMode[aiAssistant] || 'standard';
  const tierMode = tierRecommendation[codebaseTier];

  // Use the LOWER of the two constraints
  // Example: copilot + comprehensive codebase → compact (copilot can't handle max)
  // Example: claude + minimal codebase → compact (minimal doesn't need max)
  const modes = ['compact', 'standard', 'max'];
  const minIndex = modes.indexOf(minMode);
  const tierIndex = modes.indexOf(tierMode);

  return modes[Math.max(minIndex, tierIndex)] as 'compact' | 'standard' | 'max';
}
