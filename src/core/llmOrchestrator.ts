/**
 * LLM Orchestrator - Uses API-optimized prompts with multi-provider support
 */

import { jsonrepair } from 'jsonrepair';
import { ProjectContext, AnalysisOptions, AnalyzerResult, DocumentationContext } from '../types';
import { ContextGatherer } from './contextGatherer';
import { CodebaseInventory } from './codebaseInventory';
import { OutputValidator } from './outputValidator';
import { logger } from '../utils/logger';
import { LLMProvider, ProviderFactory, ProviderConfig } from '../providers';
import {
  generateSecurityAnalyzerPrompt,
  securityAnalyzerOutputSchema,
} from '../../prompts/api/security-analyzer';
import {
  generateLicenseAnalyzerPrompt,
  licenseAnalyzerOutputSchema,
} from '../../prompts/api/license-analyzer';
import {
  generateQualityAnalyzerPrompt,
  qualityAnalyzerOutputSchema,
} from '../../prompts/api/quality-analyzer';
import {
  generateCostAnalyzerPrompt,
  costAnalyzerOutputSchema,
} from '../../prompts/api/cost-analyzer';
import {
  generateHIPAAAnalyzerPrompt,
  hipaaAnalyzerOutputSchema,
} from '../../prompts/api/hipaa-analyzer';
// Note: Documentation generation now creates files individually using specialized prompt rules
import { generateSummaryGeneratorPrompt } from '../../prompts/api/summary-generator';
import {
  generateAIAssistantGeneratorPrompt,
  generateAIAssistantUpdatePrompt,
} from '../../prompts/api/ai-assistant-generator';
import {
  getFrontendFilesToGenerate,
  generateFrontendFilePrompt,
} from '../../prompts/api/document-prompt-rules-frontend';
import {
  getBackendFilesToGenerate,
  generateBackendFilePrompt,
} from '../../prompts/api/document-prompt-rules-backend';
import {
  getMobileFilesToGenerate,
  generateMobileFilePrompt,
} from '../../prompts/api/document-prompt-rules-mobile';
import {
  getDevOpsFilesToGenerate,
  generateDevOpsFilePrompt,
} from '../../prompts/api/document-prompt-rules-devops';
import {
  getGenericFilesToGenerate,
  generateGenericFilePrompt,
} from '../../prompts/api/document-prompt-rules-generic';
import { LLMCache } from '../utils/llmCache';
import { CompletionOptions, CompletionResult } from '../providers/types';
import { parallelLimitWithProgress } from '../utils/concurrency';

export interface OrchestratorOptions {
  skipCache?: boolean;
}

export class LLMOrchestrator {
  private provider: LLMProvider;
  private contextGatherer: ContextGatherer;
  private projectPath: string;
  private cache: LLMCache;
  private skipCache: boolean;

  constructor(providerConfig: ProviderConfig, projectPath: string, options: OrchestratorOptions = {}) {
    this.provider = ProviderFactory.createProvider(providerConfig);
    this.contextGatherer = new ContextGatherer(projectPath);
    this.projectPath = projectPath;
    this.cache = new LLMCache(projectPath);
    this.skipCache = options.skipCache ?? false;

    logger.debug(`Initialized LLM provider: ${this.provider.getName()} (${this.provider.getModel()})`);
    if (this.skipCache) {
      logger.debug('Cache disabled for this session');
    }
  }

  /**
   * Generate completion with caching support
   */
  private async cachedCompletion(prompt: string, options: CompletionOptions): Promise<CompletionResult> {
    const model = this.provider.getModel();

    // Check cache first
    if (!this.skipCache) {
      const cached = await this.cache.get(prompt, model, options.maxTokens, options.temperature);
      if (cached) {
        logger.info('(cached)');
        return cached;
      }
    }

    // Call LLM
    const result = await this.provider.generateCompletion(prompt, options);

    // Store in cache
    if (!this.skipCache) {
      await this.cache.set(prompt, model, options.maxTokens, options.temperature, result);
    }

    return result;
  }

  /**
   * Run documentation generation (API-optimized)
   * Generates files in parallel for maximum speed while maintaining reliability
   */
  async generateDocumentation(
    context: ProjectContext,
    projectName: string,
    projectDescription: string,
    industry: string,
    _aiAssistant: 'claude-code' | 'cursor' | 'copilot' | 'chatgpt' | 'gemini',
    options?: { concurrency?: number }
  ): Promise<AnalyzerResult> {
    const concurrency = options?.concurrency ?? 3;
    logger.info(`Generating documentation for ${context.projectType} project...`);
    logger.info(`Strategy: Parallel generation with concurrency ${concurrency}`);

    const startTime = Date.now();

    try {
      // Gather comprehensive context once
      const fullContext = await this.contextGatherer.gatherDocumentationContext(context) as unknown as DocumentationContext;

      // Define files to generate based on project type and documentation tier
      const documentationTier = context.documentationTier || 'comprehensive';
      const filesToGenerate = this.getFilesToGenerate(context.projectType, documentationTier);

      logger.info(`Generating ${documentationTier} documentation (${filesToGenerate.length} files)`);

      // Generate files in parallel
      const generatedFiles: Array<{ filename: string; content: string }> = [];
      let totalTokens = 0;
      let totalCost = 0;
      let completedCount = 0;

      // Step 1: Generate ARCHITECTURE.md first (foundational file)
      const archFile = filesToGenerate.find(f => f.filename === 'ARCHITECTURE.md');
      const remainingFiles = filesToGenerate.filter(f => f.filename !== 'ARCHITECTURE.md');

      if (archFile) {
        logger.info(`[1/${filesToGenerate.length}] Generating ${archFile.filename} (foundational)...`);
        try {
          const result = await this.generateSingleFile(
            archFile,
            fullContext,
            projectName,
            projectDescription,
            industry,
            context.projectType,
            documentationTier
          );

          generatedFiles.push({
            filename: archFile.filename,
            content: result.content,
          });

          totalTokens += result.tokensUsed;
          totalCost += result.cost;
          completedCount++;

          logger.success(`Generated ${archFile.filename} (${result.tokensUsed.toLocaleString()} tokens, $${result.cost.toFixed(4)})`);
        } catch (error) {
          logger.error(`Failed to generate ${archFile.filename}`, error as Error);
          completedCount++;
        }
      }

      // Step 2: Generate remaining files in parallel
      if (remainingFiles.length > 0) {
        logger.info(`Generating ${remainingFiles.length} files in parallel (concurrency: ${concurrency})...`);

        const tasks = remainingFiles.map(file => async () => {
          const result = await this.generateSingleFile(
            file,
            fullContext,
            projectName,
            projectDescription,
            industry,
            context.projectType,
            documentationTier
          );
          return { file, result };
        });

        const results = await parallelLimitWithProgress(
          tasks,
          concurrency,
          (_completed, _total, result) => {
            completedCount++;
            const adjustedTotal = filesToGenerate.length;
            if (result.status === 'fulfilled' && result.value) {
              const { file, result: fileResult } = result.value;
              logger.success(`[${completedCount}/${adjustedTotal}] Generated ${file.filename} (${fileResult.tokensUsed.toLocaleString()} tokens, $${fileResult.cost.toFixed(4)})`);
            } else if (result.status === 'rejected') {
              logger.error(`[${completedCount}/${adjustedTotal}] Failed to generate a file`, result.reason);
            }
          }
        );

        // Aggregate results
        for (const result of results) {
          if (result.status === 'fulfilled' && result.value) {
            const { file, result: fileResult } = result.value;
            generatedFiles.push({
              filename: file.filename,
              content: fileResult.content,
            });
            totalTokens += fileResult.tokensUsed;
            totalCost += fileResult.cost;
          }
        }
      }

      const duration = (Date.now() - startTime) / 1000;

      if (generatedFiles.length === 0) {
        throw new Error('Failed to generate any documentation files');
      }

      logger.success(`Generated ${generatedFiles.length}/${filesToGenerate.length} files`);
      logger.info(`Total: ${totalTokens.toLocaleString()} tokens, $${totalCost.toFixed(4)}, ${duration.toFixed(1)}s`);

      return {
        name: 'documentation',
        status: 'success',
        output: JSON.stringify({ files: generatedFiles }),
        tokensUsed: totalTokens,
        cost: totalCost,
        duration,
      };
    } catch (error) {
      const duration = (Date.now() - startTime) / 1000;
      logger.error('Documentation generation failed', error as Error);

      return {
        name: 'documentation',
        status: 'error',
        error: (error as Error).message,
        tokensUsed: 0,
        cost: 0,
        duration,
      };
    }
  }

  /**
   * Generate incremental documentation (only specific files)
   * Used by the update command for efficient partial regeneration
   */
  async generateIncrementalDocumentation(
    context: ProjectContext,
    filesToUpdate: string[],
    projectName: string,
    projectDescription: string,
    industry: string,
    _aiAssistant: 'claude-code' | 'cursor' | 'copilot' | 'chatgpt' | 'gemini',
    options?: { concurrency?: number }
  ): Promise<AnalyzerResult> {
    const concurrency = options?.concurrency ?? 3;
    logger.info(`Incrementally updating ${filesToUpdate.length} documentation files...`);
    logger.info(`Strategy: Parallel generation with concurrency ${concurrency}`);

    const startTime = Date.now();

    try {
      // Gather comprehensive context once
      const fullContext = await this.contextGatherer.gatherDocumentationContext(context) as unknown as DocumentationContext;

      // Get all possible files for this project type and tier
      const documentationTier = context.documentationTier || 'comprehensive';
      const allFiles = this.getFilesToGenerate(context.projectType, documentationTier);

      // Filter to only the files we need to update
      const filesToGenerate = allFiles.filter(f =>
        filesToUpdate.some(toUpdate =>
          toUpdate === f.filename || toUpdate.endsWith(f.filename)
        )
      );

      if (filesToGenerate.length === 0) {
        logger.warn('No matching files found to update');
        return {
          name: 'documentation',
          status: 'skipped',
          output: JSON.stringify({ files: [] }),
          error: 'No matching documentation files found for the requested update',
          tokensUsed: 0,
          cost: 0,
          duration: 0,
        };
      }

      logger.info(`Regenerating ${filesToGenerate.length} files: ${filesToGenerate.map(f => f.filename).join(', ')}`);

      // Generate files in parallel
      const generatedFiles: Array<{ filename: string; content: string }> = [];
      let totalTokens = 0;
      let totalCost = 0;
      let completedCount = 0;

      // Check if ARCHITECTURE.md is in the list (generate it first if so)
      const archFile = filesToGenerate.find(f => f.filename === 'ARCHITECTURE.md');
      const remainingFiles = filesToGenerate.filter(f => f.filename !== 'ARCHITECTURE.md');

      if (archFile) {
        logger.info(`[1/${filesToGenerate.length}] Regenerating ${archFile.filename} (foundational)...`);
        try {
          const result = await this.generateSingleFile(
            archFile,
            fullContext,
            projectName,
            projectDescription,
            industry,
            context.projectType,
            documentationTier
          );

          generatedFiles.push({
            filename: archFile.filename,
            content: result.content,
          });

          totalTokens += result.tokensUsed;
          totalCost += result.cost;
          completedCount++;

          logger.success(`Regenerated ${archFile.filename} (${result.tokensUsed.toLocaleString()} tokens, $${result.cost.toFixed(4)})`);
        } catch (error) {
          logger.error(`Failed to regenerate ${archFile.filename}`, error as Error);
          completedCount++;
        }
      }

      // Generate remaining files in parallel
      if (remainingFiles.length > 0) {
        logger.info(`Regenerating ${remainingFiles.length} files in parallel (concurrency: ${concurrency})...`);

        const tasks = remainingFiles.map(file => async () => {
          const result = await this.generateSingleFile(
            file,
            fullContext,
            projectName,
            projectDescription,
            industry,
            context.projectType,
            documentationTier
          );
          return { file, result };
        });

        const results = await parallelLimitWithProgress(
          tasks,
          concurrency,
          (_completed, _total, result) => {
            completedCount++;
            const adjustedTotal = filesToGenerate.length;
            if (result.status === 'fulfilled' && result.value) {
              const { file, result: fileResult } = result.value;
              logger.success(`[${completedCount}/${adjustedTotal}] Regenerated ${file.filename} (${fileResult.tokensUsed.toLocaleString()} tokens, $${fileResult.cost.toFixed(4)})`);
            } else if (result.status === 'rejected') {
              logger.error(`[${completedCount}/${adjustedTotal}] Failed to regenerate a file`, result.reason);
            }
          }
        );

        // Aggregate results
        for (const result of results) {
          if (result.status === 'fulfilled' && result.value) {
            const { file, result: fileResult } = result.value;
            generatedFiles.push({
              filename: file.filename,
              content: fileResult.content,
            });
            totalTokens += fileResult.tokensUsed;
            totalCost += fileResult.cost;
          }
        }
      }

      const duration = (Date.now() - startTime) / 1000;

      if (generatedFiles.length === 0) {
        throw new Error('Failed to regenerate any documentation files');
      }

      logger.success(`Regenerated ${generatedFiles.length}/${filesToGenerate.length} files`);
      logger.info(`Total: ${totalTokens.toLocaleString()} tokens, $${totalCost.toFixed(4)}, ${duration.toFixed(1)}s`);

      return {
        name: 'documentation',
        status: 'success',
        output: JSON.stringify({ files: generatedFiles }),
        tokensUsed: totalTokens,
        cost: totalCost,
        duration,
      };
    } catch (error) {
      const duration = (Date.now() - startTime) / 1000;
      logger.error('Incremental documentation generation failed', error as Error);

      return {
        name: 'documentation',
        status: 'error',
        error: (error as Error).message,
        tokensUsed: 0,
        cost: 0,
        duration,
      };
    }
  }

  /**
   * Get list of files to generate based on project type and tier
   * Uses specialized prompt rules for each project type
   * Note: AI assistant file (CLAUDE.md, etc.) is NOT included here
   * Use generateAIAssistant() separately or as part of full generation
   */
  private getFilesToGenerate(
    projectType: string,
    documentationTier: 'minimal' | 'standard' | 'comprehensive' = 'comprehensive'
  ): Array<{ filename: string; description: string }> {
    if (projectType === 'frontend') {
      return getFrontendFilesToGenerate(documentationTier);
    }

    if (projectType === 'backend') {
      return getBackendFilesToGenerate(documentationTier);
    }

    if (projectType === 'mobile') {
      return getMobileFilesToGenerate(documentationTier);
    }

    if (projectType === 'devops') {
      return getDevOpsFilesToGenerate(documentationTier);
    }

    // Fallback: use generic documentation for unknown project types
    return getGenericFilesToGenerate(documentationTier);
  }

  /**
   * Generate a single documentation file
   */
  private async generateSingleFile(
    file: { filename: string; description: string },
    context: DocumentationContext,
    projectName: string,
    projectDescription: string,
    industry: string,
    projectType: string,
    documentationTier: 'minimal' | 'standard' | 'comprehensive' = 'comprehensive'
  ): Promise<{ content: string; tokensUsed: number; cost: number }> {
    // Create focused prompt for this specific file
    const prompt = this.generateSingleFilePrompt(
      file,
      context,
      projectName,
      projectDescription,
      industry,
      projectType,
      documentationTier
    );

    const result = await this.cachedCompletion(prompt, {
      maxTokens: 8000, // Per-file limit (more than enough for rich content)
      temperature: 0.3,
    });

    // Smart extraction: Check if output starts with markdown header (LLM followed instructions)
    // If not, try to extract from outer code block wrapper
    let content: string;
    const trimmed = result.content.trim();

    if (trimmed.startsWith('#')) {
      // LLM returned raw markdown as requested - use directly
      content = trimmed;
    } else if (trimmed.startsWith('```markdown')) {
      // LLM wrapped in ```markdown block - extract everything between markers
      // Remove first line (```markdown) and last line (```)
      const lines = trimmed.split('\n');
      const contentLines = lines.slice(1, -1); // Remove first and last lines
      content = contentLines.join('\n').trim();
    } else if (trimmed.startsWith('```')) {
      // LLM wrapped in generic ``` block
      const lines = trimmed.split('\n');
      const contentLines = lines.slice(1, -1);
      content = contentLines.join('\n').trim();
    } else {
      // Fallback to raw output
      content = trimmed;
    }

    return {
      content,
      tokensUsed: result.inputTokens + result.outputTokens,
      cost: result.cost
    };
  }

  /**
   * Generate prompt for a single file using specialized prompt rules
   */
  private generateSingleFilePrompt(
    file: { filename: string; description: string },
    context: DocumentationContext,
    projectName: string,
    projectDescription: string,
    industry: string,
    projectType: string,
    documentationTier: 'minimal' | 'standard' | 'comprehensive' = 'comprehensive'
  ): string {
    // Use specialized prompt generators based on project type
    if (projectType === 'frontend') {
      return generateFrontendFilePrompt(file, {
        projectName,
        projectDescription,
        industry,
        documentationTier,
        fileTree: context.fileTree || '',
        dependencies: context.dependencies || {},
        devDependencies: context.devDependencies || {},
        componentFiles: context.componentFiles || [],
        routingFiles: context.routingFiles || [],
        stateManagementFiles: context.stateManagementFiles || [],
        apiFiles: context.apiFiles || [],
        stylingFiles: context.stylingFiles || [],
        gitRecentCommits: context.gitRecentCommits || '',
        packageJsonContent: context.packageJsonContent || '',
      });
    }

    if (projectType === 'backend') {
      return generateBackendFilePrompt(file, {
        projectName,
        projectDescription,
        industry,
        documentationTier,
        fileTree: context.fileTree || '',
        dependencies: context.dependencies || {},
        devDependencies: context.devDependencies || {},
        apiFiles: context.apiFiles || [],
        controllerFiles: context.controllerFiles || [],
        routeFiles: context.routeFiles || [],
        serviceFiles: context.serviceFiles || [],
        modelFiles: context.modelFiles || [],
        middlewareFiles: context.middlewareFiles || [],
        hasDatabase: context.hasDatabase || false,
        databaseType: context.databaseType,
        hasAuthentication: context.hasAuthentication || false,
        gitRecentCommits: context.gitRecentCommits || '',
        packageJsonContent: context.packageJsonContent,
        requirementsTxtContent: context.requirementsTxtContent,
      });
    }

    if (projectType === 'mobile') {
      return generateMobileFilePrompt(file, {
        projectName,
        projectDescription,
        industry,
        documentationTier,
        fileTree: context.fileTree || '',
        dependencies: context.dependencies || {},
        devDependencies: context.devDependencies || {},
        screenFiles: context.screenFiles || [],
        navigationFiles: context.navigationFiles || [],
        stateFiles: context.stateManagementFiles || [],
        apiFiles: context.apiFiles || [],
        nativeModuleFiles: context.nativeModuleFiles || [],
        stylingFiles: context.stylingFiles || [],
        mobilePlatform: context.mobilePlatform || 'react-native',
        gitRecentCommits: context.gitRecentCommits || '',
        packageJsonContent: context.packageJsonContent,
      });
    }

    if (projectType === 'devops') {
      return generateDevOpsFilePrompt(file, {
        projectName,
        projectDescription,
        industry,
        documentationTier,
        fileTree: context.fileTree || '',
        terraformFiles: context.terraformFiles || [],
        k8sFiles: context.k8sFiles || [],
        cicdFiles: context.cicdFiles || [],
        dockerFiles: context.dockerFiles || [],
        cloudProvider: context.cloudProvider || 'AWS',
        hasKubernetes: context.hasKubernetes || false,
        hasTerraform: context.hasTerraform || false,
        gitRecentCommits: context.gitRecentCommits || '',
      });
    }

    // Fallback: use generic prompt for unknown project types
    return generateGenericFilePrompt(file, {
      projectName,
      projectDescription,
      industry,
      documentationTier,
      fileTree: context.fileTree || '',
      dependencies: context.dependencies || {},
      devDependencies: context.devDependencies || {},
      gitRecentCommits: context.gitRecentCommits || '',
      packageJsonContent: context.packageJsonContent,
    });
  }

  /**
   * Generate summary documentation (API-optimized)
   * Returns markdown content directly (no JSON wrapper)
   */
  async generateSummary(
    context: ProjectContext,
    projectName: string,
    projectDescription: string,
    industry: string,
    targetAudience: string[]
  ): Promise<AnalyzerResult> {
    logger.info(`Generating SUMMARY.md for ${context.projectType} project...`);

    const startTime = Date.now();

    try {
      // Gather summary context
      const summaryContext = await this.contextGatherer.gatherSummaryContext(context);

      // Generate prompt (using the same prompt generator but instructing for markdown output)
      const prompt = generateSummaryGeneratorPrompt({
        ...summaryContext,
        projectName,
        projectDescription,
        industry,
        projectType: context.projectType as 'frontend' | 'backend' | 'devops' | 'mobile' | 'other' | 'fullstack',
        targetAudience,
        documentationTier: context.documentationTier,
      } as Parameters<typeof generateSummaryGeneratorPrompt>[0]);

      logger.debug('Calling LLM API...');

      // Call LLM API (with caching)
      const result = await this.cachedCompletion(prompt, {
        maxTokens: 8000,
        temperature: 0.3, // Low temperature for consistent summaries
      });

      const duration = (Date.now() - startTime) / 1000;

      // Extract markdown content (same logic as generateSingleFile)
      let content: string;
      const trimmed = result.content.trim();

      if (trimmed.startsWith('#')) {
        // LLM returned raw markdown as requested - use directly
        content = trimmed;
      } else if (trimmed.startsWith('```markdown')) {
        // LLM wrapped in ```markdown block - extract everything between markers
        const lines = trimmed.split('\n');
        const contentLines = lines.slice(1, -1); // Remove first and last lines
        content = contentLines.join('\n').trim();
      } else if (trimmed.startsWith('```')) {
        // LLM wrapped in generic ``` block
        const lines = trimmed.split('\n');
        const contentLines = lines.slice(1, -1);
        content = contentLines.join('\n').trim();
      } else {
        // Fallback to raw output
        content = trimmed;
      }

      logger.success(`Summary generated: ${content.split('\n').length} lines`);
      logger.info(`Summary completed in ${duration.toFixed(1)}s for $${result.cost.toFixed(4)}`);

      return {
        name: 'summary',
        status: 'success',
        output: content, // Direct markdown content, no JSON wrapper
        tokensUsed: result.inputTokens + result.outputTokens,
        cost: result.cost,
        duration,
      };
    } catch (error) {
      const duration = (Date.now() - startTime) / 1000;
      logger.error('Summary generation failed', error as Error);

      return {
        name: 'summary',
        status: 'error',
        error: (error as Error).message,
        tokensUsed: 0,
        cost: 0,
        duration,
      };
    }
  }

  /**
   * Generate AI assistant instruction file (API-optimized)
   * Returns markdown content directly (no JSON wrapper)
   */
  async generateAIAssistant(
    context: ProjectContext,
    projectName: string,
    projectDescription: string,
    industry: string,
    aiAssistant: 'claude-code' | 'cursor' | 'copilot' | 'chatgpt' | 'gemini',
    sizeMode?: 'compact' | 'standard' | 'max'
  ): Promise<AnalyzerResult> {
    const filenameMap: Record<string, string> = {
      'claude-code': 'CLAUDE.md',
      'cursor': 'CURSOR.md',
      'copilot': 'COPILOT.md',
      'chatgpt': 'CHATGPT.md',
      'gemini': 'GEMINI.md',
    };
    const filename = filenameMap[aiAssistant] || 'CLAUDE.md';

    logger.info(`Generating ${filename} for ${context.projectType} project...`);

    const startTime = Date.now();

    try {
      // STEP 1: Build codebase inventory (pre-verification)
      logger.info('Scanning codebase for verified utilities and patterns...');
      const inventoryScanner = new CodebaseInventory(this.projectPath, industry);
      const inventory = await inventoryScanner.scan();

      logger.success(
        `Inventory: ${inventory.stats.utilityFiles} utility files, ${inventory.stats.exportedFunctions} exports, ${inventory.stats.patternsFound} patterns`
      );

      // STEP 2: Gather AI assistant context (reuse documentation context which has everything we need)
      const aiAssistantContext = await this.contextGatherer.gatherDocumentationContext(context);

      // STEP 3: Generate prompt with verified inventory
      const prompt = generateAIAssistantGeneratorPrompt(
        {
          ...aiAssistantContext,
          projectName,
          projectDescription,
          industry,
          projectType: context.projectType as 'frontend' | 'backend' | 'devops' | 'mobile' | 'other' | 'fullstack',
          aiAssistant,
          sizeMode, // Will be auto-detected if not provided
          documentationTier: context.documentationTier, // Used to auto-determine size mode
        } as Parameters<typeof generateAIAssistantGeneratorPrompt>[0],
        inventory // Pass verified inventory
      );

      logger.debug('Calling LLM API...');

      // STEP 4: Call LLM API (with caching)
      const result = await this.cachedCompletion(prompt, {
        maxTokens: 20000, // Increased limit to ensure complete AI assistant file with all sections (validation checklist, decision trees, templates, etc.)
        temperature: 0.3,
      });

      const duration = (Date.now() - startTime) / 1000;

      // STEP 5: Extract markdown content (same logic as generateSingleFile)
      let content: string;
      const trimmed = result.content.trim();

      if (trimmed.startsWith('#')) {
        // LLM returned raw markdown as requested - use directly
        content = trimmed;
      } else if (trimmed.startsWith('```markdown')) {
        // LLM wrapped in ```markdown block - extract everything between markers
        const lines = trimmed.split('\n');
        const contentLines = lines.slice(1, -1); // Remove first and last lines
        content = contentLines.join('\n').trim();
      } else if (trimmed.startsWith('```')) {
        // LLM wrapped in generic ``` block
        const lines = trimmed.split('\n');
        const contentLines = lines.slice(1, -1);
        content = contentLines.join('\n').trim();
      } else {
        // Fallback to raw output
        content = trimmed;
      }

      // STEP 6: Validate output against inventory
      const validator = new OutputValidator();
      const validation = validator.validate(content, inventory, sizeMode || 'max');

      logger.newLine();
      logger.section('Validation Results');

      if (validation.valid) {
        logger.success(`✅ ${filename} passed all validation checks`);
      } else {
        const errorCount = validation.issues.filter((i) => i.severity === 'error').length;
        const warningCount = validation.issues.filter((i) => i.severity === 'warning').length;

        logger.warn(`⚠️  ${filename} has ${errorCount} errors, ${warningCount} warnings:`);

        // Show up to 10 issues
        validation.issues.slice(0, 10).forEach((issue) => {
          const icon = issue.severity === 'error' ? '❌' : '⚠️ ';
          const location = issue.line ? ` (line ${issue.line})` : '';
          logger.warn(`   ${icon} ${issue.type}${location}: ${issue.message}`);
          if (issue.suggestion) {
            logger.info(`      → ${issue.suggestion}`);
          }
        });

        if (validation.issues.length > 10) {
          logger.warn(`   ... and ${validation.issues.length - 10} more issues`);
        }

        // STEP 7: Auto-fix if possible
        if (validation.fixable > 0) {
          logger.newLine();
          logger.info(`Attempting to auto-fix ${validation.fixable} issues...`);
          content = validator.autoFix(content, validation.issues, inventory);
          logger.success(`✅ Auto-fixed ${validation.fixable} issues (replaced with actual codebase examples)`);
        }
      }

      // Final stats
      logger.newLine();
      logger.section('Generation Summary');
      logger.info(`File: ${filename}`);
      logger.info(`Lines: ${validation.stats.totalLines}`);
      logger.info(`Characters: ${validation.stats.totalChars}`);
      logger.info(`Imports: ${validation.stats.imports}`);
      if (validation.stats.fabricatedImports > 0) {
        logger.warn(`Fabricated imports: ${validation.stats.fabricatedImports} (auto-fixed)`);
      } else {
        logger.success(`Fabricated imports: 0`);
      }
      logger.info(`Duration: ${duration.toFixed(1)}s`);
      logger.info(`Cost: $${result.cost.toFixed(4)}`);

      return {
        name: 'ai-assistant',
        status: 'success',
        output: content, // Direct markdown content, validated and potentially auto-fixed
        tokensUsed: result.inputTokens + result.outputTokens,
        cost: result.cost,
        duration,
      };
    } catch (error) {
      const duration = (Date.now() - startTime) / 1000;
      logger.error(`${filename} generation failed`, error as Error);

      return {
        name: 'ai-assistant',
        status: 'error',
        error: (error as Error).message,
        tokensUsed: 0,
        cost: 0,
        duration,
      };
    }
  }

  /**
   * Update AI assistant file (API-optimized)
   * Analyzes existing content against current codebase, preserves customizations, updates outdated info
   */
  async updateAIAssistant(
    context: ProjectContext,
    existingContent: string,
    projectName: string,
    projectDescription: string,
    industry: string,
    aiAssistant: 'claude-code' | 'cursor' | 'copilot' | 'chatgpt' | 'gemini',
    sizeMode?: 'compact' | 'standard' | 'max'
  ): Promise<AnalyzerResult> {
    const filenameMap: Record<string, string> = {
      'claude-code': 'CLAUDE.md',
      'cursor': 'CURSOR.md',
      'copilot': 'COPILOT.md',
      'chatgpt': 'CHATGPT.md',
      'gemini': 'GEMINI.md',
    };
    const filename = filenameMap[aiAssistant] || 'CLAUDE.md';

    logger.info(`Updating ${filename} for ${context.projectType} project...`);
    logger.info(`Existing file: ${existingContent.split('\n').length} lines`);

    const startTime = Date.now();

    try {
      // STEP 1: Build codebase inventory (pre-verification)
      logger.info('Scanning codebase for verified utilities and patterns...');
      const inventoryScanner = new CodebaseInventory(this.projectPath, industry);
      const inventory = await inventoryScanner.scan();

      logger.success(
        `Inventory: ${inventory.stats.utilityFiles} utility files, ${inventory.stats.exportedFunctions} exports, ${inventory.stats.patternsFound} patterns`
      );

      // STEP 2: Gather AI assistant context
      const aiAssistantContext = await this.contextGatherer.gatherDocumentationContext(context);

      // STEP 3: Generate UPDATE prompt with existing content and verified inventory
      const prompt = generateAIAssistantUpdatePrompt(
        {
          ...aiAssistantContext,
          projectName,
          projectDescription,
          industry,
          projectType: context.projectType as 'frontend' | 'backend' | 'devops' | 'mobile' | 'other' | 'fullstack',
          aiAssistant,
          sizeMode,
          documentationTier: context.documentationTier,
        } as Parameters<typeof generateAIAssistantUpdatePrompt>[0],
        inventory,
        existingContent
      );

      logger.debug('Calling LLM API for update...');

      // STEP 4: Call LLM API (with caching)
      const result = await this.cachedCompletion(prompt, {
        maxTokens: 20000,
        temperature: 0.3,
      });

      const duration = (Date.now() - startTime) / 1000;

      // STEP 5: Extract markdown content
      let content: string;
      const trimmed = result.content.trim();

      if (trimmed.startsWith('#')) {
        content = trimmed;
      } else if (trimmed.startsWith('```markdown')) {
        const lines = trimmed.split('\n');
        const contentLines = lines.slice(1, -1);
        content = contentLines.join('\n').trim();
      } else if (trimmed.startsWith('```')) {
        const lines = trimmed.split('\n');
        const contentLines = lines.slice(1, -1);
        content = contentLines.join('\n').trim();
      } else {
        content = trimmed;
      }

      // STEP 6: Validate output against inventory
      const validator = new OutputValidator();
      const validation = validator.validate(content, inventory, sizeMode || 'max');

      logger.newLine();
      logger.section('Update Validation Results');

      if (validation.valid) {
        logger.success(`✅ ${filename} update passed all validation checks`);
      } else {
        const errorCount = validation.issues.filter((i) => i.severity === 'error').length;
        const warningCount = validation.issues.filter((i) => i.severity === 'warning').length;

        logger.warn(`⚠️  ${filename} update has ${errorCount} errors, ${warningCount} warnings:`);

        validation.issues.slice(0, 10).forEach((issue) => {
          const icon = issue.severity === 'error' ? '❌' : '⚠️ ';
          const location = issue.line ? ` (line ${issue.line})` : '';
          logger.warn(`   ${icon} ${issue.type}${location}: ${issue.message}`);
          if (issue.suggestion) {
            logger.info(`      → ${issue.suggestion}`);
          }
        });

        if (validation.issues.length > 10) {
          logger.warn(`   ... and ${validation.issues.length - 10} more issues`);
        }

        // STEP 7: Auto-fix if possible
        if (validation.fixable > 0) {
          logger.newLine();
          logger.info(`Attempting to auto-fix ${validation.fixable} issues...`);
          content = validator.autoFix(content, validation.issues, inventory);
          logger.success(`✅ Auto-fixed ${validation.fixable} issues (replaced with actual codebase examples)`);
        }
      }

      // Final stats
      logger.newLine();
      logger.section('Update Summary');
      logger.info(`File: ${filename}`);
      logger.info(`Lines: ${validation.stats.totalLines} (was ${existingContent.split('\n').length})`);
      logger.info(`Characters: ${validation.stats.totalChars}`);
      logger.info(`Imports: ${validation.stats.imports}`);
      if (validation.stats.fabricatedImports > 0) {
        logger.warn(`Fabricated imports: ${validation.stats.fabricatedImports} (auto-fixed)`);
      } else {
        logger.success(`Fabricated imports: 0`);
      }
      logger.info(`Duration: ${duration.toFixed(1)}s`);
      logger.info(`Cost: $${result.cost.toFixed(4)}`);

      return {
        name: 'ai-assistant-update',
        status: 'success',
        output: content,
        tokensUsed: result.inputTokens + result.outputTokens,
        cost: result.cost,
        duration,
      };
    } catch (error) {
      const duration = (Date.now() - startTime) / 1000;
      logger.error(`${filename} update failed`, error as Error);

      return {
        name: 'ai-assistant-update',
        status: 'error',
        error: (error as Error).message,
        tokensUsed: 0,
        cost: 0,
        duration,
      };
    }
  }

  /**
   * Run security analyzer (API-optimized)
   */
  async runSecurityAnalyzer(context: ProjectContext): Promise<AnalyzerResult> {
    logger.info('Running security analyzer...');

    const startTime = Date.now();

    try {
      // Gather security-specific context
      const securityContext = await this.contextGatherer.gatherSecurityContext(context);

      // Generate prompt
      const prompt = generateSecurityAnalyzerPrompt(securityContext as unknown as Parameters<typeof generateSecurityAnalyzerPrompt>[0]);

      logger.debug('Calling LLM API...');

      // Call LLM API (with caching)
      const result = await this.cachedCompletion(prompt, {
        maxTokens: 12000, // Generous limit for comprehensive security analysis
        temperature: 0.1, // Very low temperature for consistent security analysis
      });

      const duration = (Date.now() - startTime) / 1000;

      logger.debug('Parsing and validating security report...');

      // Parse and validate JSON response
      let parsedOutput;
      let jsonString = '';
      let parseFailed = false;
      try {
        jsonString = this.extractJSON(result.content);
        logger.debug('After extractJSON (first 100 chars): ' + jsonString.substring(0, 100));

        // Repair malformed JSON from LLM
        const repairedJson = jsonrepair(jsonString);
        logger.debug('After jsonrepair (first 100 chars): ' + repairedJson.substring(0, 100));

        parsedOutput = JSON.parse(repairedJson);
        logger.debug('JSON.parse succeeded');

        // Clean emojis from severity fields
        if (parsedOutput.criticalIssues && Array.isArray(parsedOutput.criticalIssues)) {
          parsedOutput.criticalIssues = parsedOutput.criticalIssues.map((issue: Record<string, unknown>) => ({
            ...issue,
            severity: this.cleanSeverityValue(String(issue.severity ?? '')),
          }));
        }
        if (parsedOutput.otherIssues && Array.isArray(parsedOutput.otherIssues)) {
          parsedOutput.otherIssues = parsedOutput.otherIssues.map((issue: Record<string, unknown>) => ({
            ...issue,
            severity: this.cleanSeverityValue(String(issue.severity ?? '')),
          }));
        }

        // Validate against schema
        const validated = securityAnalyzerOutputSchema.parse(parsedOutput);
        logger.debug('Zod validation succeeded');

        logger.success(
          `Security analysis complete: Grade ${validated.overallGrade}, ${validated.criticalIssues.length} issues found`
        );
      } catch (error) {
        parseFailed = true;
        logger.error('Failed to parse security report', error as Error);
        logger.debug('Extracted JSON (first 200 chars): ' + (jsonString || result.content).substring(0, 200));
        parsedOutput = { error: 'Failed to parse response', raw: jsonString || result.content };
      }

      logger.info(`Security analysis completed in ${duration.toFixed(1)}s for $${result.cost.toFixed(4)}`);

      return {
        name: 'security',
        status: parseFailed ? 'error' : 'success',
        output: JSON.stringify(parsedOutput),
        tokensUsed: result.inputTokens + result.outputTokens,
        cost: result.cost,
        duration,
      };
    } catch (error) {
      const duration = (Date.now() - startTime) / 1000;
      logger.error('Security analysis failed', error as Error);

      return {
        name: 'security',
        status: 'error',
        error: (error as Error).message,
        tokensUsed: 0,
        cost: 0,
        duration,
      };
    }
  }

  /**
   * Run license compliance analyzer (API-optimized)
   */
  async runLicenseAnalyzer(context: ProjectContext): Promise<AnalyzerResult> {
    logger.info('Running license compliance analyzer...');

    const startTime = Date.now();

    try {
      const licenseContext = await this.contextGatherer.gatherLicenseContext(context);
      const prompt = generateLicenseAnalyzerPrompt(licenseContext as unknown as Parameters<typeof generateLicenseAnalyzerPrompt>[0]);

      logger.debug('Calling LLM API...');

      // Call LLM API (with caching)
      const result = await this.cachedCompletion(prompt, {
        maxTokens: 12000, // Generous limit for comprehensive license analysis
        temperature: 0.1,
      });

      const duration = (Date.now() - startTime) / 1000;

      logger.debug('Parsing and validating license report...');

      let parsedOutput;
      let jsonString = '';
      let parseFailed = false;
      try {
        jsonString = this.extractJSON(result.content);
        logger.debug('After extractJSON (first 100 chars): ' + jsonString.substring(0, 100));

        // Repair malformed JSON from LLM
        const repairedJson = jsonrepair(jsonString);
        logger.debug('After jsonrepair (first 100 chars): ' + repairedJson.substring(0, 100));

        parsedOutput = JSON.parse(repairedJson);
        logger.debug('JSON.parse succeeded');

        // Clean emojis from severity fields (LLM sometimes adds them despite instructions)
        if (parsedOutput.risks && Array.isArray(parsedOutput.risks)) {
          parsedOutput.risks = parsedOutput.risks.map((risk: Record<string, unknown>) => ({
            ...risk,
            severity: this.cleanSeverityValue(String(risk.severity ?? '')),
          }));
        }

        const validated = licenseAnalyzerOutputSchema.parse(parsedOutput);
        logger.debug('Zod validation succeeded');

        logger.success(
          `License analysis complete: Grade ${validated.overallGrade}, ${validated.dealbreakers.length} dealbreakers found`
        );
      } catch (error) {
        parseFailed = true;
        logger.error('Failed to parse license report', error as Error);
        logger.debug('Extracted JSON (first 200 chars): ' + (jsonString || result.content).substring(0, 200));
        parsedOutput = { error: 'Failed to parse response', raw: jsonString || result.content };
      }

      logger.info(`License analysis completed in ${duration.toFixed(1)}s for $${result.cost.toFixed(4)}`);

      return {
        name: 'license',
        status: parseFailed ? 'error' : 'success',
        output: JSON.stringify(parsedOutput),
        tokensUsed: result.inputTokens + result.outputTokens,
        cost: result.cost,
        duration,
      };
    } catch (error) {
      const duration = (Date.now() - startTime) / 1000;
      logger.error('License analysis failed', error as Error);

      return {
        name: 'license',
        status: 'error',
        error: (error as Error).message,
        tokensUsed: 0,
        cost: 0,
        duration,
      };
    }
  }

  /**
   * Run code quality analyzer (API-optimized)
   */
  async runQualityAnalyzer(context: ProjectContext): Promise<AnalyzerResult> {
    logger.info('Running code quality analyzer...');

    const startTime = Date.now();

    try {
      const qualityContext = await this.contextGatherer.gatherQualityContext(context);
      const prompt = generateQualityAnalyzerPrompt(qualityContext as unknown as Parameters<typeof generateQualityAnalyzerPrompt>[0]);

      logger.debug('Calling LLM API...');

      // Call LLM API (with caching)
      const result = await this.cachedCompletion(prompt, {
        maxTokens: 12000, // Generous limit for comprehensive quality analysis
        temperature: 0.2,
      });

      const duration = (Date.now() - startTime) / 1000;

      logger.debug('Parsing and validating quality report...');

      let parsedOutput;
      let jsonString = '';
      let parseFailed = false;
      try {
        jsonString = this.extractJSON(result.content);
        logger.debug('After extractJSON (first 100 chars): ' + jsonString.substring(0, 100));

        // Repair malformed JSON from LLM
        const repairedJson = jsonrepair(jsonString);
        logger.debug('After jsonrepair (first 100 chars): ' + repairedJson.substring(0, 100));

        parsedOutput = JSON.parse(repairedJson);
        logger.debug('JSON.parse succeeded');

        // Clean emojis from severity fields
        if (parsedOutput.issues && Array.isArray(parsedOutput.issues)) {
          parsedOutput.issues = parsedOutput.issues.map((issue: Record<string, unknown>) => ({
            ...issue,
            severity: this.cleanSeverityValue(String(issue.severity ?? '')),
          }));
        }

        const validated = qualityAnalyzerOutputSchema.parse(parsedOutput);
        logger.debug('Zod validation succeeded');

        logger.success(
          `Quality analysis complete: Grade ${validated.overallGrade}, ${validated.technicalDebtPercentage}% technical debt`
        );
      } catch (error) {
        parseFailed = true;
        logger.error('Failed to parse quality report', error as Error);
        logger.debug('Extracted JSON (first 200 chars): ' + (jsonString || result.content).substring(0, 200));
        parsedOutput = { error: 'Failed to parse response', raw: jsonString || result.content };
      }

      logger.info(`Quality analysis completed in ${duration.toFixed(1)}s for $${result.cost.toFixed(4)}`);

      return {
        name: 'quality',
        status: parseFailed ? 'error' : 'success',
        output: JSON.stringify(parsedOutput),
        tokensUsed: result.inputTokens + result.outputTokens,
        cost: result.cost,
        duration,
      };
    } catch (error) {
      const duration = (Date.now() - startTime) / 1000;
      logger.error('Quality analysis failed', error as Error);

      return {
        name: 'quality',
        status: 'error',
        error: (error as Error).message,
        tokensUsed: 0,
        cost: 0,
        duration,
      };
    }
  }

  /**
   * Run cost & scalability analyzer (API-optimized)
   */
  async runCostAnalyzer(context: ProjectContext): Promise<AnalyzerResult> {
    logger.info('Running cost & scalability analyzer...');

    const startTime = Date.now();

    try {
      const costContext = await this.contextGatherer.gatherCostContext(context);
      const prompt = generateCostAnalyzerPrompt(costContext as unknown as Parameters<typeof generateCostAnalyzerPrompt>[0]);

      logger.debug('Calling LLM API...');

      // Call LLM API (with caching)
      const result = await this.cachedCompletion(prompt, {
        maxTokens: 12000, // Generous limit for comprehensive cost analysis
        temperature: 0.2,
      });

      const duration = (Date.now() - startTime) / 1000;

      logger.debug('Parsing and validating cost report...');

      let parsedOutput;
      let jsonString = '';
      let parseFailed = false;
      try {
        jsonString = this.extractJSON(result.content);
        logger.debug('After extractJSON (first 100 chars): ' + jsonString.substring(0, 100));

        // Repair malformed JSON from LLM
        const repairedJson = jsonrepair(jsonString);
        logger.debug('After jsonrepair (first 100 chars): ' + repairedJson.substring(0, 100));

        parsedOutput = JSON.parse(repairedJson);
        logger.debug('JSON.parse succeeded');

        // Clean emojis from severity fields
        if (parsedOutput.scalabilityBottlenecks && Array.isArray(parsedOutput.scalabilityBottlenecks)) {
          parsedOutput.scalabilityBottlenecks = parsedOutput.scalabilityBottlenecks.map((issue: Record<string, unknown>) => ({
            ...issue,
            severity: this.cleanSeverityValue(String(issue.severity ?? '')),
          }));
        }

        const validated = costAnalyzerOutputSchema.parse(parsedOutput);
        logger.debug('Zod validation succeeded');

        logger.success(
          `Cost analysis complete: Grade ${validated.overallGrade}, viability: ${validated.viabilityAssessment.isViable ? 'Yes' : 'No'}`
        );
      } catch (error) {
        parseFailed = true;
        logger.error('Failed to parse cost report', error as Error);
        logger.debug('Extracted JSON (first 200 chars): ' + (jsonString || result.content).substring(0, 200));
        parsedOutput = { error: 'Failed to parse response', raw: jsonString || result.content };
      }

      logger.info(`Cost analysis completed in ${duration.toFixed(1)}s for $${result.cost.toFixed(4)}`);

      return {
        name: 'cost',
        status: parseFailed ? 'error' : 'success',
        output: JSON.stringify(parsedOutput),
        tokensUsed: result.inputTokens + result.outputTokens,
        cost: result.cost,
        duration,
      };
    } catch (error) {
      const duration = (Date.now() - startTime) / 1000;
      logger.error('Cost analysis failed', error as Error);

      return {
        name: 'cost',
        status: 'error',
        error: (error as Error).message,
        tokensUsed: 0,
        cost: 0,
        duration,
      };
    }
  }

  /**
   * Run HIPAA compliance analyzer (API-optimized)
   */
  async runHIPAAAnalyzer(context: ProjectContext): Promise<AnalyzerResult> {
    logger.info('Running HIPAA compliance analyzer...');

    const startTime = Date.now();

    try {
      const hipaaContext = await this.contextGatherer.gatherHIPAAContext(context);
      const prompt = generateHIPAAAnalyzerPrompt(hipaaContext as unknown as Parameters<typeof generateHIPAAAnalyzerPrompt>[0]);

      logger.debug('Calling LLM API...');

      // Call LLM API (with caching)
      const result = await this.cachedCompletion(prompt, {
        maxTokens: 12000, // Generous limit for comprehensive HIPAA analysis
        temperature: 0.1, // Very low for compliance accuracy
      });

      const duration = (Date.now() - startTime) / 1000;

      logger.debug('Parsing and validating HIPAA report...');

      let parsedOutput;
      let jsonString = '';
      let parseFailed = false;
      try {
        jsonString = this.extractJSON(result.content);
        logger.debug('After extractJSON (first 100 chars): ' + jsonString.substring(0, 100));

        // Repair malformed JSON from LLM
        const repairedJson = jsonrepair(jsonString);
        logger.debug('After jsonrepair (first 100 chars): ' + repairedJson.substring(0, 100));

        parsedOutput = JSON.parse(repairedJson);
        logger.debug('JSON.parse succeeded');

        // Clean emojis from severity fields
        if (parsedOutput.criticalViolations && Array.isArray(parsedOutput.criticalViolations)) {
          parsedOutput.criticalViolations = parsedOutput.criticalViolations.map((violation: Record<string, unknown>) => ({
            ...violation,
            severity: this.cleanSeverityValue(String(violation.severity ?? '')),
          }));
        }
        if (parsedOutput.gaps && Array.isArray(parsedOutput.gaps)) {
          parsedOutput.gaps = parsedOutput.gaps.map((gap: Record<string, unknown>) => ({
            ...gap,
            severity: this.cleanSeverityValue(String(gap.severity ?? '')),
          }));
        }

        const validated = hipaaAnalyzerOutputSchema.parse(parsedOutput);
        logger.debug('Zod validation succeeded');

        logger.success(
          `HIPAA analysis complete: Grade ${validated.overallGrade}, ${validated.criticalViolations.length} critical violations`
        );
      } catch (error) {
        parseFailed = true;
        logger.error('Failed to parse HIPAA report', error as Error);
        logger.debug('Extracted JSON (first 200 chars): ' + (jsonString || result.content).substring(0, 200));
        // Store the extracted version for better debugging
        parsedOutput = { error: 'Failed to parse response', raw: jsonString || result.content };
      }

      logger.info(`HIPAA analysis completed in ${duration.toFixed(1)}s for $${result.cost.toFixed(4)}`);

      return {
        name: 'hipaa',
        status: parseFailed ? 'error' : 'success',
        output: JSON.stringify(parsedOutput),
        tokensUsed: result.inputTokens + result.outputTokens,
        cost: result.cost,
        duration,
      };
    } catch (error) {
      const duration = (Date.now() - startTime) / 1000;
      logger.error('HIPAA analysis failed', error as Error);

      return {
        name: 'hipaa',
        status: 'error',
        error: (error as Error).message,
        tokensUsed: 0,
        cost: 0,
        duration,
      };
    }
  }

  /**
   * Run all analyzers in parallel (API-optimized)
   * Resilient: continues even if one analyzer fails
   */
  async runAllAnalyzers(
    context: ProjectContext,
    options: AnalysisOptions
  ): Promise<AnalyzerResult[]> {
    // Build list of analyzers to run
    const analyzersToRun: Array<{ name: string; task: () => Promise<AnalyzerResult> }> = [];

    if (options.security) {
      analyzersToRun.push({ name: 'Security', task: () => this.runSecurityAnalyzer(context) });
    }
    if (options.license) {
      analyzersToRun.push({ name: 'License', task: () => this.runLicenseAnalyzer(context) });
    }
    if (options.quality) {
      analyzersToRun.push({ name: 'Quality', task: () => this.runQualityAnalyzer(context) });
    }
    if (options.cost) {
      analyzersToRun.push({ name: 'Cost', task: () => this.runCostAnalyzer(context) });
    }
    if (options.hipaa) {
      analyzersToRun.push({ name: 'HIPAA', task: () => this.runHIPAAAnalyzer(context) });
    }

    logger.info(`Running ${analyzersToRun.length} analyzers in parallel...`);

    // Run all analyzers concurrently with individual error handling
    const results = await Promise.all(
      analyzersToRun.map(async (analyzer, index) => {
        logger.info(`[${index + 1}/${analyzersToRun.length}] Starting ${analyzer.name} analyzer...`);
        try {
          const result = await analyzer.task();
          if (result.status === 'success') {
            logger.success(
              `[${index + 1}/${analyzersToRun.length}] ${analyzer.name} complete (${result.tokensUsed.toLocaleString()} tokens, $${result.cost.toFixed(4)})`
            );
          } else {
            logger.error(`[${index + 1}/${analyzersToRun.length}] ${analyzer.name} failed: ${result.error}`);
          }
          return result;
        } catch (error) {
          logger.error(`[${index + 1}/${analyzersToRun.length}] ${analyzer.name} crashed`, error as Error);
          // Return error result instead of throwing
          return {
            name: analyzer.name.toLowerCase(),
            status: 'error' as const,
            error: (error as Error).message,
            tokensUsed: 0,
            cost: 0,
            duration: 0,
          };
        }
      })
    );

    const successCount = results.filter(r => r.status === 'success').length;
    const errorCount = results.filter(r => r.status === 'error').length;

    logger.info(`Analyzers complete: ${successCount} succeeded, ${errorCount} failed`);

    return results;
  }

  /**
   * Extract JSON from LLM response (handles various markdown code block formats)
   */
  private extractJSON(output: string): string {
    const trimmed = output.trim();

    // Try to match ```json ... ``` format
    let jsonMatch = trimmed.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      return jsonMatch[1].trim();
    }

    // Try to match ``` ... ``` format
    jsonMatch = trimmed.match(/```\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      const extracted = jsonMatch[1].trim();
      return this.stripLanguageIdentifier(extracted);
    }

    // No code blocks found - try to find JSON object boundaries
    // Look for first { and last } to extract just the JSON
    const firstBrace = trimmed.indexOf('{');
    const lastBrace = trimmed.lastIndexOf('}');

    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      // Extract everything between first { and last }
      const extracted = trimmed.substring(firstBrace, lastBrace + 1);
      return extracted;
    }

    // Fallback: apply cleanup to entire output
    return this.stripLanguageIdentifier(trimmed);
  }

  /**
   * Strip language identifier from start of string (e.g., "json\n{...}" -> "{...}")
   * Handles multiple formats and edge cases
   */
  private stripLanguageIdentifier(text: string): string {
    let cleaned = text.trim();

    // Pattern 1: "json" followed by newline at start
    // Matches: "json\n{...", "json  \n{...", "javascript\n{..."
    if (/^(json|javascript|js)\s*\n/i.test(cleaned)) {
      cleaned = cleaned.replace(/^(json|javascript|js)\s*\n/i, '').trim();
    }

    // Pattern 2: "json" as entire first line (handle different line endings)
    // Matches: "json\r\n{...", "json\r{..."
    if (/^(json|javascript|js)\s*[\r\n]+/i.test(cleaned)) {
      cleaned = cleaned.replace(/^(json|javascript|js)\s*[\r\n]+/i, '').trim();
    }

    // Pattern 3: "json" followed by whitespace and then '{' on same line
    // Matches: "json {..."
    if (/^(json|javascript|js)\s+\{/i.test(cleaned)) {
      cleaned = cleaned.replace(/^(json|javascript|js)\s+/i, '').trim();
    }

    return cleaned;
  }

  /**
   * Clean severity value by removing emojis and extra text
   * Maps "📊 Low" -> "Low", "✅ Minimal" -> "Low", etc.
   */
  private cleanSeverityValue(severity: string): string {
    if (!severity || typeof severity !== 'string') return 'Informational';

    // Remove all emojis and trim
    const cleaned = severity.replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, '').trim();

    // Map common variations to standard enum values
    const lowerCleaned = cleaned.toLowerCase();

    if (lowerCleaned.includes('critical')) return 'Critical';
    if (lowerCleaned.includes('high')) return 'High';
    if (lowerCleaned.includes('medium') || lowerCleaned.includes('moderate')) return 'Medium';
    if (lowerCleaned.includes('low') || lowerCleaned.includes('minimal')) return 'Low';
    if (lowerCleaned.includes('info')) return 'Informational';

    // If exact match after cleaning, use it
    const validSeverities = ['Critical', 'High', 'Medium', 'Low', 'Informational'];
    if (validSeverities.includes(cleaned)) return cleaned;

    // Fallback
    return 'Informational';
  }
}
