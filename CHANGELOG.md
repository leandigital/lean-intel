# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-02-23

### Added

- **Documentation Generation** with 4 specialized generators (Frontend, Backend, Mobile, DevOps)
- **Code Due Diligence** with 5 parallel analyzers (Security, License, Quality, Cost, HIPAA)
- **Multi-provider LLM support**: Anthropic Claude, OpenAI, Google Gemini, xAI Grok
- **8 CLI commands**: `init`, `detect`, `docs`, `update`, `analyze`, `summary`, `ai-helper`, `full`
- **Parallel documentation generation** with configurable concurrency (3-5x speedup)
- **Incremental updates** via `lean-intel update` — only regenerates affected files (80-90% token reduction)
- **Executive report export** to PDF/HTML with `--export` flag
- **Context-optimized sizing** for AI assistant files (Compact/Standard/Maximum)
- **Mode-based generation**: Strict, Synthesis, or Hybrid (auto-detected)
- **15 standalone Markdown prompts** for manual use with any AI assistant
- **11 TypeScript prompt generators** with Zod-validated structured outputs
