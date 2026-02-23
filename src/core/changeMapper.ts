/**
 * Maps source file changes to affected documentation files
 */

import { ChangeCategories } from '../git/diff';

/**
 * Documentation file mappings by project type
 */
const FRONTEND_DOCS = {
  components: ['COMPONENTS.md', 'ARCHITECTURE.md'],
  routes: ['ROUTING.md'],
  api: ['API_LAYER.md'],
  config: ['ARCHITECTURE.md', 'DEVELOPMENT_PATTERNS.md'],
  styling: ['STYLING.md'],
  forms: ['FORMS.md'],
  auth: ['AUTHENTICATION.md'],
  state: ['STATE_MANAGEMENT.md'],
};

const BACKEND_DOCS = {
  api: ['API.md', 'ARCHITECTURE.md'],
  database: ['DATABASE.md'],
  auth: ['AUTHENTICATION.md', 'AUTHORIZATION.md'],
  middleware: ['MIDDLEWARE.md'],
  validation: ['VALIDATION.md'],
  errors: ['ERROR_HANDLING.md'],
  config: ['ARCHITECTURE.md', 'DEVELOPMENT_PATTERNS.md'],
  security: ['SECURITY.md'],
  tests: ['TESTING.md'],
};

const MOBILE_DOCS = {
  components: ['SCREENS.md', 'ARCHITECTURE.md'],
  navigation: ['NAVIGATION.md'],
  state: ['STATE_MANAGEMENT.md'],
  api: ['API_INTEGRATION.md'],
  native: ['NATIVE_MODULES.md'],
  config: ['ARCHITECTURE.md'],
};

// DevOps docs mapping is handled inline in mapDevOpsChanges
// due to the file-path-based detection pattern

/**
 * Map changed files to affected documentation files
 */
export function mapChangesToDocs(
  categories: ChangeCategories,
  projectType: string,
  existingDocs: string[]
): string[] {
  const affectedDocs = new Set<string>();

  // Always include ARCHITECTURE.md if significant changes
  const significantChanges =
    categories.components.length +
    categories.routes.length +
    categories.api.length +
    categories.database.length;

  if (significantChanges > 0) {
    affectedDocs.add('ARCHITECTURE.md');
  }

  switch (projectType) {
    case 'frontend':
      mapFrontendChanges(categories, affectedDocs);
      break;
    case 'backend':
      mapBackendChanges(categories, affectedDocs);
      break;
    case 'mobile':
      mapMobileChanges(categories, affectedDocs);
      break;
    case 'devops':
      mapDevOpsChanges(categories, affectedDocs);
      break;
    default:
      // For unknown types, use frontend as default
      mapFrontendChanges(categories, affectedDocs);
  }

  // Filter to only include docs that were previously generated
  const result = Array.from(affectedDocs).filter(doc =>
    existingDocs.some(existing => existing.endsWith(doc))
  );

  return result;
}

function mapFrontendChanges(categories: ChangeCategories, affectedDocs: Set<string>): void {
  if (categories.components.length > 0) {
    FRONTEND_DOCS.components.forEach(doc => affectedDocs.add(doc));
  }

  if (categories.routes.length > 0) {
    affectedDocs.add('ROUTING.md');
  }

  if (categories.api.length > 0) {
    FRONTEND_DOCS.api.forEach(doc => affectedDocs.add(doc));
  }

  if (categories.styling.length > 0) {
    affectedDocs.add('STYLING.md');
  }

  if (categories.config.length > 0) {
    FRONTEND_DOCS.config.forEach(doc => affectedDocs.add(doc));
  }

  // Check for specific patterns in changed files
  const allFiles = [
    ...categories.components,
    ...categories.api,
    ...categories.other,
  ];

  for (const file of allFiles) {
    const lower = file.toLowerCase();
    if (lower.includes('form') || lower.includes('input') || lower.includes('validation')) {
      affectedDocs.add('FORMS.md');
    }
    if (lower.includes('auth') || lower.includes('login') || lower.includes('session')) {
      affectedDocs.add('AUTHENTICATION.md');
    }
    if (lower.includes('store') || lower.includes('redux') || lower.includes('zustand') || lower.includes('context')) {
      affectedDocs.add('STATE_MANAGEMENT.md');
    }
  }
}

function mapBackendChanges(categories: ChangeCategories, affectedDocs: Set<string>): void {
  if (categories.api.length > 0) {
    BACKEND_DOCS.api.forEach(doc => affectedDocs.add(doc));
  }

  if (categories.database.length > 0) {
    affectedDocs.add('DATABASE.md');
  }

  if (categories.config.length > 0) {
    BACKEND_DOCS.config.forEach(doc => affectedDocs.add(doc));
  }

  // Check for specific patterns
  const allFiles = [
    ...categories.api,
    ...categories.database,
    ...categories.other,
  ];

  for (const file of allFiles) {
    const lower = file.toLowerCase();
    if (lower.includes('middleware')) {
      affectedDocs.add('MIDDLEWARE.md');
    }
    if (lower.includes('auth')) {
      affectedDocs.add('AUTHENTICATION.md');
      affectedDocs.add('AUTHORIZATION.md');
    }
    if (lower.includes('valid')) {
      affectedDocs.add('VALIDATION.md');
    }
    if (lower.includes('error') || lower.includes('exception')) {
      affectedDocs.add('ERROR_HANDLING.md');
    }
    if (lower.includes('security') || lower.includes('crypto') || lower.includes('encrypt')) {
      affectedDocs.add('SECURITY.md');
    }
  }

  if (categories.tests.length > 0) {
    affectedDocs.add('TESTING.md');
  }
}

function mapMobileChanges(categories: ChangeCategories, affectedDocs: Set<string>): void {
  if (categories.components.length > 0) {
    MOBILE_DOCS.components.forEach(doc => affectedDocs.add(doc));
  }

  if (categories.routes.length > 0) {
    affectedDocs.add('NAVIGATION.md');
  }

  if (categories.api.length > 0) {
    affectedDocs.add('API_INTEGRATION.md');
  }

  if (categories.config.length > 0) {
    affectedDocs.add('ARCHITECTURE.md');
  }

  if (categories.styling.length > 0) {
    affectedDocs.add('STYLING.md');
  }

  // Check for specific patterns
  const allFiles = [
    ...categories.components,
    ...categories.other,
  ];

  for (const file of allFiles) {
    const lower = file.toLowerCase();
    if (lower.includes('native') || lower.includes('bridge')) {
      affectedDocs.add('NATIVE_MODULES.md');
    }
    if (lower.includes('store') || lower.includes('redux') || lower.includes('mobx')) {
      affectedDocs.add('STATE_MANAGEMENT.md');
    }
    if (lower.includes('style') || lower.includes('theme')) {
      affectedDocs.add('STYLING.md');
    }
    if (lower.includes('auth') || lower.includes('login') || lower.includes('session')) {
      affectedDocs.add('AUTHENTICATION.md');
    }
    if (lower.includes('build') || lower.includes('deploy') || lower.includes('release') || lower.includes('fastlane') || lower.includes('codepush')) {
      affectedDocs.add('BUILD_DEPLOYMENT.md');
    }
    if (lower.includes('pattern') || lower.includes('convention') || lower.includes('util') || lower.includes('helper')) {
      affectedDocs.add('DEVELOPMENT_PATTERNS.md');
    }
  }

  // Config changes affect build/deployment and development patterns
  if (categories.config.length > 0) {
    affectedDocs.add('DEVELOPMENT_PATTERNS.md');
    affectedDocs.add('BUILD_DEPLOYMENT.md');
  }
}

function mapDevOpsChanges(categories: ChangeCategories, affectedDocs: Set<string>): void {
  const allFiles = [
    ...categories.config,
    ...categories.other,
  ];

  for (const file of allFiles) {
    const lower = file.toLowerCase();
    if (lower.includes('.tf') || lower.includes('terraform')) {
      affectedDocs.add('INFRASTRUCTURE.md');
    }
    if (lower.includes('k8s') || lower.includes('kubernetes') || lower.includes('helm')) {
      affectedDocs.add('COMPUTE.md');
      affectedDocs.add('NETWORKING.md');
    }
    if (lower.includes('docker') || lower.includes('container')) {
      affectedDocs.add('COMPUTE.md');
      affectedDocs.add('DEPLOYMENT.md');
    }
    if (lower.includes('ci') || lower.includes('pipeline') || lower.includes('workflow') || lower.includes('github/workflows')) {
      affectedDocs.add('CI_CD.md');
    }
    if (lower.includes('monitor') || lower.includes('alert') || lower.includes('prometheus') || lower.includes('grafana')) {
      affectedDocs.add('MONITORING.md');
    }
    if (lower.includes('security') || lower.includes('vault') || lower.includes('secret')) {
      affectedDocs.add('SECURITY.md');
    }
    if (lower.includes('storage') || lower.includes('s3') || lower.includes('bucket') || lower.includes('database')) {
      affectedDocs.add('STORAGE.md');
    }
    if (lower.includes('deploy') || lower.includes('release')) {
      affectedDocs.add('DEPLOYMENT.md');
    }
    if (lower.includes('scale') || lower.includes('autoscal') || lower.includes('replica')) {
      affectedDocs.add('SCALING.md');
    }
    if (lower.includes('disaster') || lower.includes('backup') || lower.includes('recovery')) {
      affectedDocs.add('DISASTER_RECOVERY.md');
    }
    if (lower.includes('cost') || lower.includes('budget')) {
      affectedDocs.add('COST_OPTIMIZATION.md');
    }
    if (lower.includes('env') || lower.includes('staging') || lower.includes('production')) {
      affectedDocs.add('ENVIRONMENTS.md');
    }
    if (lower.includes('runbook') || lower.includes('playbook') || lower.includes('procedure')) {
      affectedDocs.add('RUNBOOKS.md');
    }
    if (lower.includes('pattern') || lower.includes('convention') || lower.includes('util') || lower.includes('helper') || lower.includes('script')) {
      affectedDocs.add('DEVELOPMENT_PATTERNS.md');
    }
  }

  if (categories.config.length > 0) {
    affectedDocs.add('ARCHITECTURE.md');
    affectedDocs.add('DEVELOPMENT_PATTERNS.md');
  }
}

/**
 * Estimate the impact level of changes
 */
export function estimateImpactLevel(
  categories: ChangeCategories
): 'minimal' | 'moderate' | 'significant' | 'major' {
  const totalChanges =
    categories.components.length +
    categories.routes.length +
    categories.api.length +
    categories.config.length +
    categories.database.length +
    categories.styling.length +
    categories.other.length;

  // Config changes can have outsized impact
  const configWeight = categories.config.length * 2;
  const weightedTotal = totalChanges + configWeight;

  if (weightedTotal <= 2) return 'minimal';
  if (weightedTotal <= 5) return 'moderate';
  if (weightedTotal <= 15) return 'significant';
  return 'major';
}

/**
 * Check if changes warrant a full regeneration
 */
export function shouldFullRegenerate(
  categories: ChangeCategories,
  projectType: string
): { should: boolean; reason?: string } {
  // Major config changes warrant full regen
  const criticalConfigs = categories.config.filter(f => {
    const lower = f.toLowerCase();
    return (
      lower.includes('package.json') ||
      lower.includes('tsconfig') ||
      lower.includes('webpack.config') ||
      lower.includes('vite.config') ||
      lower.includes('next.config') ||
      lower.includes('pubspec.yaml') ||
      lower.includes('build.gradle')
    );
  });

  if (criticalConfigs.length > 0) {
    return {
      should: true,
      reason: `Critical config file changed: ${criticalConfigs[0]}`,
    };
  }

  // Too many changes across too many categories
  const activeCategories = [
    categories.components,
    categories.routes,
    categories.api,
    categories.database,
    categories.styling,
  ].filter(c => c.length > 0).length;

  if (activeCategories >= 4) {
    return {
      should: true,
      reason: 'Changes span too many areas of the codebase',
    };
  }

  // DevOps: infrastructure changes are usually significant
  if (projectType === 'devops' && categories.config.length > 3) {
    return {
      should: true,
      reason: 'Multiple infrastructure configuration changes',
    };
  }

  return { should: false };
}
