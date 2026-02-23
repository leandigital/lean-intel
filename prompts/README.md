# API Prompt Generators

TypeScript prompt generators with Zod-validated output schemas, used by the CLI.

## Structure

```
prompts/api/
├── security-analyzer.ts              # Security vulnerability scanner
├── license-analyzer.ts               # OSS license compliance
├── quality-analyzer.ts               # Code quality & technical debt
├── cost-analyzer.ts                  # Cost & scalability analysis
├── hipaa-analyzer.ts                 # HIPAA compliance
├── document-prompt-rules-frontend.ts # Frontend documentation rules
├── document-prompt-rules-backend.ts  # Backend documentation rules
├── document-prompt-rules-devops.ts   # DevOps documentation rules
├── document-prompt-rules-mobile.ts   # Mobile documentation rules
├── summary-generator.ts             # Quick-start summary
└── ai-assistant-generator.ts        # AI assistant instruction files
```

## Format

Each generator exports:

```typescript
// Output schema (Zod validation)
export const analyzerOutputSchema = z.object({ ... });
export type AnalyzerOutput = z.infer<typeof analyzerOutputSchema>;

// Prompt generator (takes pre-gathered context, returns prompt string)
export function generateAnalyzerPrompt(context: AnalyzerContext): string { ... }
```

## How It Works

1. `ContextGatherer` collects project data (file tree, dependencies, configs, etc.)
2. Prompt generator builds an optimized prompt with all context embedded
3. LLM returns structured JSON matching the Zod schema
4. Output is validated and converted to markdown files

## Token Optimization

- File trees limited to 4 levels depth, max 200 files
- Sample 5-10 representative files instead of all
- Last 30 git commits only
- Top 50 production dependencies
- Context reused across analyzers
- ~60% token reduction vs unoptimized prompts
