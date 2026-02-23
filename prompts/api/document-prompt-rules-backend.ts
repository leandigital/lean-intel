/**
 * Documentation Prompt Rules - Backend
 * Sophisticated prompt rules for backend documentation
 * Used for individual file generation with full verification standards
 */

import { CRITICAL_RULE_0, CRITICAL_RULE_1 } from './document-prompt-rules-frontend';

export { CRITICAL_RULE_0, CRITICAL_RULE_1 };

export interface DocumentFileDefinition {
  filename: string;
  description: string;
  requiredFor: 'minimal' | 'standard' | 'comprehensive';
  sections?: string[];
}

/**
 * Backend-specific rules
 */
export const BACKEND_SPECIFIC_RULES = `## Backend-Specific Verification Rules

### API Documentation
- ✅ Only document endpoints found in routeFiles and controllerFiles
- ✅ Verify HTTP methods and paths from actual route definitions
- ✅ Document actual request/response schemas from code
- ❌ Don't invent endpoints that don't exist
- ❌ Don't assume REST conventions without verification

### Database Documentation
- ✅ Verify database type from dependencies (PostgreSQL, MySQL, MongoDB, etc.)
- ✅ Only document models/entities found in modelFiles
- ✅ Document actual schema from code (Prisma schema, TypeORM entities, Mongoose models)
- ❌ Don't invent database tables or collections
- ❌ Don't assume database relationships without evidence

### Authentication Documentation
- ✅ Verify auth library from dependencies (Passport, JWT, etc.)
- ✅ Only document auth strategies found in code
- ✅ Document actual auth flow from middleware and route guards
- ❌ Don't invent auth patterns
- ❌ Don't assume authentication approach

### Middleware Documentation
- ✅ Only document middleware found in middlewareFiles
- ✅ Verify middleware order from actual configuration
- ✅ Document actual middleware logic from code
- ❌ Don't invent middleware chains
- ❌ Don't assume middleware without evidence

### Service Layer Documentation
- ✅ Only document services found in serviceFiles
- ✅ Verify service methods from actual code
- ✅ Document actual business logic patterns
- ❌ Don't invent service patterns
- ❌ Don't assume service structure`;

/**
 * Backend file definitions
 */
export const BACKEND_FILE_DEFINITIONS: DocumentFileDefinition[] = [
  {
    filename: 'ARCHITECTURE.md',
    description: 'Project architecture, tech stack, and system design',
    requiredFor: 'minimal',
    sections: [
      'Project Overview',
      'Tech Stack',
      'Architecture Pattern',
      'System Components',
      'Data Flow',
      'Key Dependencies',
    ],
  },
  {
    filename: 'API.md',
    description: 'API endpoints, request/response formats, and API design',
    requiredFor: 'standard',
    sections: [
      'API Overview',
      'Endpoints',
      'Request/Response Formats',
      'Authentication',
      'Error Responses',
      'API Versioning',
    ],
  },
  {
    filename: 'DATABASE.md',
    description: 'Database schema, models, and data layer',
    requiredFor: 'standard',
    sections: [
      'Database Overview',
      'Schema',
      'Models/Entities',
      'Relationships',
      'Migrations',
      'Queries',
    ],
  },
  {
    filename: 'AUTHENTICATION.md',
    description: 'Authentication and authorization strategy',
    requiredFor: 'standard',
    sections: [
      'Auth Overview',
      'Auth Strategy',
      'Token Management',
      'Auth Middleware',
      'User Sessions',
      'Security',
    ],
  },
  {
    filename: 'AUTHORIZATION.md',
    description: 'Authorization, RBAC, and permissions',
    requiredFor: 'comprehensive',
    sections: [
      'Authorization Overview',
      'Roles & Permissions',
      'Access Control',
      'Policy Enforcement',
      'Guards',
    ],
  },
  {
    filename: 'MIDDLEWARE.md',
    description: 'Middleware chain, request processing, and middleware configuration',
    requiredFor: 'standard',
    sections: [
      'Middleware Overview',
      'Middleware Chain',
      'Custom Middleware',
      'Error Handling Middleware',
      'Logging Middleware',
    ],
  },
  {
    filename: 'VALIDATION.md',
    description: 'Input validation and data validation patterns',
    requiredFor: 'comprehensive',
    sections: [
      'Validation Overview',
      'Validation Libraries',
      'Request Validation',
      'Schema Validation',
      'Custom Validators',
    ],
  },
  {
    filename: 'ERROR_HANDLING.md',
    description: 'Error handling strategy and error responses',
    requiredFor: 'standard',
    sections: [
      'Error Handling Overview',
      'Error Types',
      'Error Middleware',
      'Error Responses',
      'Logging Errors',
    ],
  },
  {
    filename: 'TESTING.md',
    description: 'Testing approach, test coverage, and test patterns',
    requiredFor: 'comprehensive',
    sections: [
      'Testing Overview',
      'Unit Tests',
      'Integration Tests',
      'E2E Tests',
      'Test Utilities',
      'Test Coverage',
    ],
  },
  {
    filename: 'SECURITY.md',
    description: 'Security best practices and security implementation',
    requiredFor: 'comprehensive',
    sections: [
      'Security Overview',
      'Input Sanitization',
      'CORS Configuration',
      'Rate Limiting',
      'Security Headers',
      'Secrets Management',
    ],
  },
  {
    filename: 'DEVELOPMENT_PATTERNS.md',
    description: 'Common development patterns, conventions, and best practices',
    requiredFor: 'standard',
    sections: [
      'Code Conventions',
      'Project Structure',
      'Naming Conventions',
      'Common Patterns',
      'Common Issues',
      'Development Tips',
    ],
  },
];

/**
 * Get files to generate based on tier
 */
export function getBackendFilesToGenerate(
  tier: 'minimal' | 'standard' | 'comprehensive'
): DocumentFileDefinition[] {
  if (tier === 'minimal') {
    return BACKEND_FILE_DEFINITIONS.filter((f) => f.requiredFor === 'minimal');
  }

  if (tier === 'standard') {
    return BACKEND_FILE_DEFINITIONS.filter(
      (f) => f.requiredFor === 'minimal' || f.requiredFor === 'standard'
    );
  }

  return BACKEND_FILE_DEFINITIONS;
}

/**
 * Generate prompt for a single backend documentation file
 */
export function generateBackendFilePrompt(
  file: { filename: string; description: string },
  context: {
    projectName: string;
    projectDescription: string;
    industry: string;
    documentationTier: 'minimal' | 'standard' | 'comprehensive';
    fileTree: string;
    dependencies: Record<string, string>;
    devDependencies: Record<string, string>;
    apiFiles: string[];
    controllerFiles: string[];
    routeFiles: string[];
    serviceFiles: string[];
    modelFiles: string[];
    middlewareFiles: string[];
    hasDatabase: boolean;
    databaseType?: string;
    hasAuthentication: boolean;
    gitRecentCommits: string;
    packageJsonContent?: string;
    requirementsTxtContent?: string;
    // NEW: Actual file contents for accurate documentation
    controllerFileContents?: Record<string, string>;
    routeFileContents?: Record<string, string>;
    serviceFileContents?: Record<string, string>;
    modelFileContents?: Record<string, string>;
    middlewareFileContents?: Record<string, string>;
    entryPointContent?: string | null;
  }
): string {
  const {
    projectName,
    projectDescription,
    industry,
    documentationTier,
    fileTree,
    dependencies,
    apiFiles,
    controllerFiles,
    routeFiles,
    serviceFiles,
    modelFiles,
    middlewareFiles,
    hasDatabase,
    databaseType,
    hasAuthentication,
    gitRecentCommits,
    packageJsonContent,
    requirementsTxtContent,
    controllerFileContents,
    routeFileContents,
    serviceFileContents,
    modelFileContents,
    middlewareFileContents,
    entryPointContent,
  } = context;

  // Format file contents for prompt
  const formatFileContents = (contents: Record<string, string> | undefined, maxFiles = 10): string => {
    if (!contents || Object.keys(contents).length === 0) {
      return 'No file contents available';
    }
    return Object.entries(contents)
      .slice(0, maxFiles)
      .map(([path, content]) => `### ${path}\n\`\`\`typescript\n${content.substring(0, 3000)}\n\`\`\``)
      .join('\n\n');
  };

  // Detect frameworks
  const hasExpress = dependencies['express'];
  const hasNestJS = dependencies['@nestjs/core'];
  const hasFastify = dependencies['fastify'];
  const hasKoa = dependencies['koa'];

  const frameworkName = hasNestJS
    ? 'NestJS'
    : hasExpress
      ? 'Express'
      : hasFastify
        ? 'Fastify'
        : hasKoa
          ? 'Koa'
          : 'Node.js';

  // Build tier guidance
  const tierGuidance =
    documentationTier === 'minimal'
      ? `**DOCUMENTATION TIER: MINIMAL** (<20 files) - Keep focused and concise. Aim for 200-400 lines.`
      : documentationTier === 'standard'
        ? `**DOCUMENTATION TIER: STANDARD** (20-200 files) - Provide balanced coverage. Aim for 300-500 lines.`
        : `**DOCUMENTATION TIER: COMPREHENSIVE** (200+ files) - Provide detailed coverage. Aim for 400-600 lines.`;

  return `${CRITICAL_RULE_0}

---

${CRITICAL_RULE_1}

---

${BACKEND_SPECIFIC_RULES}

---

# Backend Documentation: ${file.filename}

## Project Context

**Project Name:** ${projectName}
**Description:** ${projectDescription}
**Industry:** ${industry}
**Framework:** ${frameworkName}
**Documentation Tier:** ${documentationTier}

${tierGuidance}

## Tech Stack

**Key Backend Dependencies:**
${Object.entries(dependencies)
  .filter(([pkg]) =>
    [
      'express',
      '@nestjs/core',
      'fastify',
      'koa',
      'prisma',
      'typeorm',
      'sequelize',
      'mongoose',
      'pg',
      'mysql2',
      'passport',
      'jsonwebtoken',
      'bcrypt',
      'redis',
      'graphql',
    ].some((key) => pkg.includes(key))
  )
  .map(([pkg, ver]) => `- ${pkg}: ${ver}`)
  .join('\n')}

**Total Dependencies:** ${Object.keys(dependencies).length} packages

## Project Structure

**File Tree:**
\`\`\`
${fileTree.substring(0, 3000)}
\`\`\`

${packageJsonContent ? `**package.json:**\n\`\`\`json\n${packageJsonContent.substring(0, 1500)}\n\`\`\`` : ''}
${requirementsTxtContent ? `**requirements.txt:**\n\`\`\`\n${requirementsTxtContent.substring(0, 1000)}\n\`\`\`` : ''}

## Codebase Context

**API Files (${apiFiles.length} total):**
${apiFiles.slice(0, 10).map((f) => `- ${f}`).join('\n')}

**Controllers (${controllerFiles.length} total):**
${controllerFiles.slice(0, 10).map((f) => `- ${f}`).join('\n')}

**Routes (${routeFiles.length} total):**
${routeFiles.slice(0, 10).map((f) => `- ${f}`).join('\n')}

**Services (${serviceFiles.length} total):**
${serviceFiles.slice(0, 10).map((f) => `- ${f}`).join('\n')}

**Models (${modelFiles.length} total):**
${modelFiles.slice(0, 10).map((f) => `- ${f}`).join('\n')}

**Middleware (${middlewareFiles.length} total):**
${middlewareFiles.map((f) => `- ${f}`).join('\n')}

**Database:** ${hasDatabase ? `Yes (${databaseType || 'detected'})` : 'No'}
**Authentication:** ${hasAuthentication ? 'Yes' : 'No'}

## Actual File Contents (USE THESE FOR CODE REFERENCES)

**CRITICAL**: The following sections contain ACTUAL CODE from the codebase. You MUST copy code verbatim from these sections when providing examples. NEVER invent code.

### Controller Files
${formatFileContents(controllerFileContents, 10)}

### Route Files
${formatFileContents(routeFileContents, 8)}

### Service Files
${formatFileContents(serviceFileContents, 10)}

### Model Files
${formatFileContents(modelFileContents, 10)}

### Middleware Files
${formatFileContents(middlewareFileContents, 5)}

${entryPointContent ? `### Entry Point\n\`\`\`typescript\n${entryPointContent.substring(0, 2000)}\n\`\`\`` : ''}

## Recent Development Activity

\`\`\`
${gitRecentCommits.split('\n').slice(0, 15).join('\n')}
\`\`\`

---

## Your Task

Generate comprehensive **${file.filename}** documentation.

**Purpose:** ${file.description}

**Critical Requirements:**
1. **100% ACCURACY** - Only document what you can verify from context above
2. **DOMAIN-SPECIFIC** - Use ${industry} terminology throughout
3. **FILE-BASED EVIDENCE** - Reference specific files from the lists above with file:line format
4. **STRUCTURED** - Use clear hierarchical sections with headers (##, ###, ####)
5. **FILE-SPECIFIC FOCUS** - Focus on: ${file.description}
6. **INFER PATTERNS** - Document patterns found in 3+ files (cite all sources)
7. **NO FUTURE CONTENT** - Do NOT add "Future Considerations", "Roadmap", or "Planned Features"

**DO's:**
- ✅ Reference specific files by path
- ✅ Include actual version numbers from dependencies
- ✅ Quote real commit messages
- ✅ Use ${industry} domain terminology
- ✅ Provide file:line citations for all code
- ✅ Document ONLY current state of codebase

**DON'Ts:**
- ❌ Invent file paths that don't exist
- ❌ Guess at endpoints or routes without evidence
- ❌ Make assumptions about unverified features
- ❌ Use generic placeholders or invented code
- ❌ Include speculative or future content

**FORMAT:** Return ONLY the markdown content. No JSON wrapper, no outer code blocks. Start directly with:

# ${file.filename.replace('.md', '')}

Generate the documentation now.`;
}
