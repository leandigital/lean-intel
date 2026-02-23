# 🚀 lean-intel

**AI-powered documentation generation and code analysis for any codebase**

Local-first CLI tool that uses leading LLM providers (Anthropic Claude, OpenAI ChatGPT, Google Gemini, or xAI Grok) to automatically generate comprehensive documentation and run thorough code analysis.

[![CI](https://github.com/leandigital/lean-intel/actions/workflows/ci.yml/badge.svg)](https://github.com/leandigital/lean-intel/actions/workflows/ci.yml)
[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](LICENSE)
[![Version](https://img.shields.io/badge/version-1.0.0-green.svg)]()

---

## 🎯 What It Does

lean-intel provides **two powerful features**:

### 📚 1. Documentation Generation
Automatically generate **10-20 comprehensive markdown files** that document your entire codebase:
- ✅ **100% verified** against actual code (zero assumptions)
- ✅ **Project-type optimized** (Frontend, Backend, Mobile, DevOps)
- ✅ **Domain-aware** (uses appropriate terminology for your industry)
- ✅ **AI-friendly** (generates context files for AI assistants)

**Use cases**: Developer onboarding, knowledge sharing, maintenance, AI assistant context

### 🔍 2. Code Due Diligence
Run **comprehensive technical analysis** across 5 dimensions in parallel:
- 🔒 **Security**: Vulnerabilities, CVEs, hardcoded secrets
- ⚖️ **License Compliance**: OSS license risks, GPL contamination
- 📊 **Code Quality**: Technical debt, complexity, maintainability
- 💰 **Cost & Scalability**: Unit economics, scaling bottlenecks
- 🏥 **HIPAA Compliance**: Healthcare PHI and regulatory compliance (if applicable)

**Use cases**: M&A code analysis, VC funding, enterprise sales, quarterly health checks

---

## 🚀 Quick Start

### Prerequisites

- **Node.js >= 22** required

### Installation

```bash
# Install globally
npm install -g @leandigital/lean-intel

# Or use with npx (no install required)
npx @leandigital/lean-intel init
```

### Setup

```bash
# Initialize configuration (sets up API keys)
lean-intel init

# Detect your project type
lean-intel detect

# Generate quick summary (fast onboarding)
lean-intel summary

# Generate AI assistant helper file
lean-intel ai-helper

# Generate full documentation
lean-intel docs

# Run code analysis
lean-intel analyze

# Run everything + create PR
lean-intel full --create-pr
```

---

## 🤖 Supported LLM Providers

lean-intel works with **4 major LLM providers**. Choose based on your preferences for cost, quality, and speed:

| Provider | Best For | Pricing | Quality | Speed |
|----------|----------|---------|---------|-------|
| **Anthropic Claude** | Highest quality, complex analysis | $$$ | ⭐⭐⭐⭐⭐ | ⚡⚡⚡ |
| **OpenAI ChatGPT** | Great balance of cost/quality | $$ | ⭐⭐⭐⭐ | ⚡⚡⚡⚡ |
| **Google Gemini** | Good value, fast processing | $$ | ⭐⭐⭐⭐ | ⚡⚡⚡⚡⚡ |
| **xAI Grok** | Latest features, competitive | $$$ | ⭐⭐⭐⭐ | ⚡⚡⚡ |

### Quick Comparison

```bash
# Example: Medium-sized project (100-200 files, 10-50K LOC)
Anthropic Claude Sonnet:  $2.29  # Best quality
OpenAI GPT-4.1:           $1.52  # Great balance
Google Gemini 2.5 Flash:  $0.42  # Fast, good value
xAI Grok 3:               $2.29  # Latest, competitive
```

**👉 Recommendation:**
- **Best Quality:** Anthropic Claude Sonnet 4.6
- **Best Value:** OpenAI GPT-4.1
- **Best Speed/Cost:** Google Gemini 2.5 Flash

You can **switch providers at any time** by running `lean-intel init` again.

---

## 📋 Commands

### `lean-intel init`

Initialize project configuration. All settings are stored in `.lean-intel.json` in the project root (automatically added to `.gitignore`).

**Options:**
- `--force` - Skip existing project detection and run init directly

**Smart Detection:**
If run in a project with existing lean-intel files (`.lean-intel.json`), you'll be prompted:
- **Update documentation** (recommended) - Refresh docs based on code changes
- **Reconfigure** - Re-run the full setup

**Auto-Triggered:**
If any command (e.g., `lean-intel docs`, `lean-intel full`) is run without a `.lean-intel.json`, the init setup runs automatically before proceeding.

**Setup Process:**
1. **Project Name** - Defaults to directory name
2. **Project Description** - Brief description of the project
3. **Industry/Domain** - e.g., Healthcare, Fintech, E-commerce
4. **Primary AI Assistant** - Claude Code, Cursor, Copilot, ChatGPT, or Gemini
5. **LLM Provider** - Anthropic, OpenAI, Google, or xAI
6. **Model** - Choose from available models for your provider:
   - **Anthropic**: Sonnet 4.6 (default), Opus 4.6 (premium), Haiku 4.5 (economy)
   - **OpenAI**: GPT-4.1 (default), GPT-4.1 Mini, GPT-4.1 Nano, o3, o4-mini
   - **Google**: Gemini 2.5 Flash (default), Gemini 2.5 Pro, Gemini 2.5 Flash Lite
   - **xAI**: Grok 3 (default), Grok 3 Mini

   See [Available Models](#available-models) for full details and pricing.

7. **API Key** - Skipped if the provider's environment variable is set (e.g., `ANTHROPIC_API_KEY`)
8. **GitHub Token** (optional) - For PR creation

**Example:**
```bash
lean-intel init
# Follow interactive prompts to configure project
```

---

### `lean-intel detect`

Detect project type and analyze codebase structure.

**Options:**
- `-p, --path <path>` - Project path (default: current directory)

**Example:**
```bash
lean-intel detect
lean-intel detect -p /path/to/project
```

**Output:**
- Project type (frontend, backend, mobile, devops)
- Detected frameworks
- Languages used
- Code statistics
- Recommended analyzers

---

### `lean-intel docs`

Generate comprehensive documentation for your project. The CLI automatically detects your codebase size and generates the appropriate amount of documentation.

**Options:**
- `-p, --path <path>` - Project path (default: current directory)
- `--name <name>` - Project name
- `--description <description>` - Project description
- `--industry <industry>` - Industry/domain (e.g., Healthcare, Fintech, E-commerce)
- `--assistant <assistant>` - AI assistant (claude-code, cursor, copilot, chatgpt, gemini)
- `--documentation-tier <tier>` - Override auto-detection: `minimal`, `standard`, or `comprehensive`
- `--dry-run` - Show cost estimate without running
- `--skip-cache` - Skip cache and regenerate everything
- `--skip-prompts` - Skip interactive prompts and use provided values
- `--concurrency <number>` - Max parallel file generations (default: 3)

**Documentation Tiers (Auto-Detected):**

The CLI automatically chooses the appropriate documentation level based on your codebase size:

| Tier | Codebase Size | Files Generated | Use Case |
|------|--------------|-----------------|----------|
| **Minimal** | < 20 source files | 2-3 files | Small projects, prototypes |
| **Standard** | 20-200 source files | 5-8 files | Medium projects, most apps |
| **Comprehensive** | 200+ source files | 10-20 files | Large projects, enterprise |

**Auto-Detection Overrides:**
- Healthcare/Finance projects → Always **Comprehensive**
- Monorepo structure → Always **Comprehensive**
- Complex domain (multiple frameworks, database) → Bumps up tier

**Example:**
```bash
lean-intel docs
lean-intel docs --dry-run  # Show cost first
lean-intel docs --name "MyApp" --industry "Healthcare" --skip-prompts
lean-intel docs --documentation-tier minimal  # Force minimal tier
lean-intel docs --documentation-tier comprehensive  # Force comprehensive tier
lean-intel docs --concurrency 5  # Faster generation with more parallel calls
```

**Generates (Comprehensive Tier):**
- `ARCHITECTURE.md` - Project overview
- `CLAUDE.md` / `COPILOT.md` / etc. - AI assistant guide
- `COMPONENTS.md` (frontend)
- `API_ENDPOINTS.md` (backend)
- `INFRASTRUCTURE.md` (devops)
- And 10-15 more specialized files

**Cost:** $0.10-$1.50 (depending on tier, project size, and provider)
**Duration:** ~2-10 minutes (depending on tier)

---

### `lean-intel update`

Incrementally update documentation based on code changes since last generation. Reduces token usage by 80-90% for typical updates.

**Options:**
- `-p, --path <path>` - Project path (default: current directory)
- `--since <hash>` - Update since specific commit (default: last generation)
- `--dry-run` - Show what would be updated without generating
- `--force` - Force regeneration even if no changes detected
- `--skip-cache` - Skip cache and regenerate
- `--concurrency <number>` - Max parallel file generations (default: 3)

**How it works:**
1. Tracks last generation commit in `.lean-intel.json`
2. Uses `git diff` to detect changed files since last generation
3. Maps source file changes to affected documentation files
4. Only regenerates the documentation files that need updating

**Example:**
```bash
lean-intel update                    # Update since last generation
lean-intel update --dry-run          # Preview what would be updated
lean-intel update --since abc1234    # Update since specific commit
lean-intel update --force            # Force full regeneration
```

**Typical Savings:**

| Scenario | Full Regen | Incremental | Savings |
|----------|-----------|-------------|---------|
| 1-2 files changed | $1.50 | $0.15 | 90% |
| Component refactor | $1.50 | $0.30 | 80% |
| New feature (5+ files) | $1.50 | $0.60 | 60% |
| Major restructure | $1.50 | $1.50 | 0% (suggests full) |

**Note:** Requires prior `lean-intel docs` run to establish baseline.

---

### `lean-intel summary`

Generate concise SUMMARY.md file for quick project onboarding.

**Options:**
- `-p, --path <path>` - Project path (default: current directory)
- `--name <name>` - Project name
- `--description <description>` - Project description
- `--industry <industry>` - Industry/domain (e.g., Healthcare, Fintech, E-commerce)
- `--audience <audience>` - Target audience (comma-separated: "New developers,AI assistants")
- `--skip-prompts` - Skip interactive prompts and use provided values
- `--skip-cache` - Skip cache and regenerate

**Example:**
```bash
lean-intel summary
lean-intel summary --audience "New developers,Technical managers"
```

**Generates:**
- `SUMMARY.md` - Quick-start guide (150-300 lines)

**Cost:** $0.10-$0.30 (depending on project size and provider)
**Duration:** ~3 minutes (medium project)

---

### `lean-intel ai-helper`

Generate AI assistant instruction file (CLAUDE.md, COPILOT.md, etc.) with context-optimized sizing.

**Options:**
- `-p, --path <path>` - Project path (default: current directory)
- `--name <name>` - Project name
- `--description <description>` - Project description
- `--industry <industry>` - Industry/domain (e.g., Healthcare, Fintech, E-commerce)
- `--assistant <assistant>` - AI assistant (claude-code, cursor, copilot, chatgpt, gemini)
- `--size-mode <mode>` - File size mode: `compact`, `standard`, or `max` (auto-detected if not specified)
- `--skip-prompts` - Skip interactive prompts and use provided values
- `--skip-cache` - Skip cache and regenerate
- `--force` - Force regeneration even if file exists (skip update prompt)

**Smart Update Mode:**
If an existing AI helper file is found (e.g., CLAUDE.md), you'll be prompted:
- **Update** - Analyze existing file, preserve customizations, refresh outdated content
- **Regenerate** - Create from scratch (overwrites existing)

Update mode preserves:
- Custom rules you added
- Project-specific notes
- Domain terminology
- Manual additions

**Size Modes** (auto-detected based on AI assistant):
- **Compact** (8k-12k chars): For GitHub Copilot, low-context assistants - Core rules + 2 templates
- **Standard** (20k-30k chars): For ChatGPT-4, Google Gemini - Balanced rules + 3 templates
- **Maximum** (45k-60k chars): For Claude Code, Cursor AI - Comprehensive rules + 3-4 templates

**Example:**
```bash
# Auto-detect size mode based on assistant
lean-intel ai-helper
lean-intel ai-helper --assistant cursor

# Override size mode manually
lean-intel ai-helper --assistant copilot --size-mode compact
lean-intel ai-helper --assistant claude-code --size-mode max --industry "Healthcare"

# Force regeneration (skip update prompt if file exists)
lean-intel ai-helper --force
```

**Generates:**
- `CLAUDE.md` (for Claude Code) - Auto-detects max mode
- `COPILOT.md` (for GitHub Copilot) - Auto-detects compact mode
- `CURSOR.md` (for Cursor) - Auto-detects max mode
- `CHATGPT.md` (for ChatGPT) - Auto-detects standard mode
- `GEMINI.md` (for Gemini) - Auto-detects standard mode

**Features:**
- ✅ **Context-aware**: Automatically sizes file for your AI assistant's context limits
- ✅ **Mode-based generation**: Strict (copy-only), Synthesis (propose patterns), or Hybrid (default)
- ✅ **100% verified**: Copied code with file:line citations, proposed code clearly labeled
- ✅ **Project-specific**: Uses actual project names, dependencies, and structure

**Cost:** $0.15-$0.40 (depending on project size and provider)
**Duration:** 45-90 seconds (medium project)

---

### `lean-intel analyze`

Run code analyzers.

**Options:**
- `-p, --path <path>` - Project path
- `--all` - Run all analyzers (default)
- `--security` - Run security analyzer only
- `--license` - Run license compliance only
- `--quality` - Run code quality only
- `--cost` - Run cost & scalability only
- `--hipaa` - Include HIPAA compliance (healthcare)
- `--dry-run` - Show cost estimate
- `--skip-cache` - Skip cache

**Example:**
```bash
lean-intel analyze                # All analyzers
lean-intel analyze --security     # Security only
lean-intel analyze --hipaa        # Add HIPAA compliance
```

**Generates:**
- `SECURITY.md` - Vulnerabilities, CVEs, hardcoded secrets
- `LICENSE_COMPLIANCE.md` - OSS license risks, GPL contamination
- `CODE_QUALITY.md` - Technical debt, complexity
- `COST_SCALABILITY.md` - Unit economics, scaling bottlenecks
- `HIPAA_COMPLIANCE.md` - PHI mapping, regulatory compliance (if --hipaa)

**Cost:** $1.00-$2.00 (depending on project size, provider, and analyzers)
**Duration:** ~5-10 minutes (all run in parallel)

---

### `lean-intel full`

Run everything: documentation + all analyzers, optionally create PR.

**Options:**
- `-p, --path <path>` - Project path
- `--name <name>` - Project name
- `--description <description>` - Project description
- `--industry <industry>` - Industry/domain
- `--assistant <assistant>` - AI assistant
- `--documentation-tier <tier>` - Override auto-detection: `minimal`, `standard`, or `comprehensive`
- `--skip-docs` - Skip documentation generation
- `--skip-security` - Skip security analyzer
- `--skip-license` - Skip license analyzer
- `--skip-quality` - Skip quality analyzer
- `--skip-cost` - Skip cost analyzer
- `--hipaa` - Include HIPAA analyzer
- `--create-pr` - Create pull request with results
- `--dry-run` - Show cost estimate
- `--skip-cache` - Skip cache
- `--concurrency <number>` - Max parallel file generations for docs (default: 3)
- `--skip-prompts` - Skip interactive prompts and use provided values
- `--export <formats>` - Export formats: pdf, html, or both (comma-separated)

**Example:**
```bash
lean-intel full                    # Generate everything
lean-intel full --create-pr        # Generate + create PR
lean-intel full --hipaa --create-pr # Include HIPAA + PR
lean-intel full --documentation-tier standard  # Force standard tier
lean-intel full --concurrency 5    # Faster doc generation with 5 parallel calls
lean-intel full --export pdf       # Generate + export PDF reports
lean-intel full --export pdf,html  # Generate + export PDF and HTML reports
```

**Export Options:**

When using `--export`, professional PDF and HTML reports are generated in `lean-reports/exports/`:

- `EXECUTIVE_SUMMARY.pdf` / `.html` - 1-page executive overview with grades and recommendations
- `FULL_ANALYSIS.pdf` / `.html` - Comprehensive report with all analyzer details

**Export Features:**
- Professional styling with grade badges (A=green, F=red)
- Executive summary with overall recommendation (Proceed/Caution/Concerns/Not Recommended)
- Key risks and strengths summary
- Detailed analyzer sections with tables and severity indicators
- Print-optimized PDF formatting

**Generates:** 10-25 markdown files (depending on documentation tier and analyzers)

**Cost:** $0.50-$3.00 (depending on tier, analyzers, project size, and provider)
**Duration:** ~5-20 minutes (depending on tier and analyzers)

**With `--create-pr`:**
1. Creates branch: `lean-intel/YYYY-MM-DD`
2. Commits all generated files
3. Pushes to remote
4. Creates pull request with detailed summary

---

## 💰 Cost & Performance

### Typical Costs (by Provider)

**Anthropic Claude Sonnet 4.6** ($3/M input, $15/M output):

| Project Size | Files | LOC | Documentation | Analysis | Total |
|--------------|-------|-----|---------------|----------|-------|
| **Small** | 50-100 | <10K | $0.60 | $0.90 | **$1.50** |
| **Medium** | 100-200 | 10-50K | $1.00 | $1.29 | **$2.29** |
| **Large** | 200-400 | 50-100K | $1.80 | $2.20 | **$4.00** |
| **Very Large** | 400+ | 100K+ | $3.00 | $3.80 | **$6.80** |

### Provider Pricing Comparison

| Provider | Model | Input | Output | Est. Medium Project |
|----------|-------|-------|--------|---------------------|
| **Anthropic** | Claude Sonnet 4.6 | $3/M | $15/M | **$2.29** |
| **OpenAI** | GPT-4.1 | $2/M | $8/M | **$1.52** |
| **OpenAI** | GPT-4.1-mini | $0.40/M | $1.60/M | **$0.31** |
| **Google** | Gemini 2.5 Flash | $0.30/M | $2.50/M | **$0.42** |
| **Google** | Gemini 2.5 Pro | $1.25/M | $10/M | **$1.26** |
| **xAI** | Grok 3 | $3/M | $15/M | **$2.29** |

**Recommendation:** For best quality/cost ratio, use **OpenAI GPT-4.1** or **Google Gemini 2.5 Flash**

### Performance

- **Parallel Execution:** All analyzers run simultaneously
- **Typical Duration:** ~15-20 minutes for full analysis (medium project)
- **Caching:** Subsequent runs skip unchanged files
- **Incremental Updates:** Only re-analyze modified code

---

## 📦 What You Get

### Documentation Generation Output

**Core Documentation** (all projects):
- `ARCHITECTURE.md` - Project overview, tech stack, getting started
- `[AI_ASSISTANT].md` - Complete guide for AI assistants (Claude Code, Copilot, Cursor, etc.)
- `[AI_ASSISTANT]_SETUP.md` - Developer onboarding guide
- `DEVELOPMENT_PATTERNS.md` - Common issues and solutions from git history

**Specialized Documentation** (project-type specific):

**Frontend Projects** (React, Vue, Angular, Svelte):
- `COMPONENTS.md`, `ROUTING.md`, `STATE_MANAGEMENT.md`, `API_LAYER.md`
- `STYLING.md`, `FORMS.md`, `PERFORMANCE.md`, `SEO.md`, `BROWSER_COMPATIBILITY.md`
- Optional: `ACCESSIBILITY.md`, `I18N.md`

**Backend Projects** (Node.js, Python, Java, PHP, Go, Ruby):
- `API.md`/`ENDPOINTS.md`, `DATABASE.md`, `AUTHENTICATION.md`, `MIDDLEWARE.md`
- `VALIDATION.md`, `ERROR_HANDLING.md`, `BACKGROUND_JOBS.md`, `CACHING.md`, `TESTING.md`, `SECURITY.md`
- Optional: `GRAPHQL.md`, `GRPC.md`

**Mobile Projects** (React Native, Flutter, Swift, Android):
- `COMPONENTS.md`, `NAVIGATION.md`, `STATE_MANAGEMENT.md`, `NATIVE_MODULES.md`
- `API_LAYER.md`, `STORAGE.md`, `PUSH_NOTIFICATIONS.md`, `PERMISSIONS.md`
- Optional: `OFFLINE_MODE.md`, `DEEP_LINKING.md`

**DevOps Projects** (Terraform, K8s, AWS, GCP, Azure):
- `INFRASTRUCTURE.md`, `NETWORKING.md`, `SECURITY.md`, `COMPUTE.md`, `STORAGE.md`
- `CI_CD.md`, `DEPLOYMENT.md`, `MONITORING.md`, `DISASTER_RECOVERY.md`, `SCALING.md`, `COST_OPTIMIZATION.md`
- Optional: `KUBERNETES.md`, `ENVIRONMENTS.md`, `RUNBOOKS.md`

**Optional Additions**:
- `SUMMARY.md` - Concise quick-start guide (150-300 lines)

**Total**: 10-20 comprehensive files, all 100% verified against your actual codebase

---

### Due Diligence Analysis Output

**Detailed Analyzer Reports**:
- `SECURITY.md` (200-500 lines) - Vulnerabilities, CVEs, hardcoded secrets
- `LICENSE_COMPLIANCE.md` (300-700 lines) - OSS license risks, GPL contamination, M&A dealbreakers
- `CODE_QUALITY.md` (400-800 lines) - Technical debt ($X remediation cost), complexity analysis, quality score
- `COST_SCALABILITY.md` (400-800 lines) - Unit economics, per-user costs, scaling bottlenecks, gross margin
- `HIPAA_COMPLIANCE.md` (400-800 lines) - PHI mapping, compliance gaps, regulatory risk (healthcare only)

**Total**: 4-5 detailed analyzer reports (5 if healthcare/HIPAA included)

---

## 🏗️ How It Works

### 1. Project Detection

```
lean-intel detect
  ↓
Scans package.json, files, dependencies
  ↓
Determines: frontend | backend | mobile | devops
  ↓
Identifies frameworks, languages, features
```

### 2. Documentation Generation

```
lean-intel docs
  ↓
Detects project type (frontend/backend/mobile/devops)
  ↓
Loads project-specific API-optimized prompts
  ↓
Gathers comprehensive codebase context
  ↓
Generates each documentation file individually via configured LLM provider
  ↓
Saves to lean-reports/ directory
```

### 3. Due Diligence Analysis

```
lean-intel analyze
  ↓
Launches 5 analyzers in parallel:
  ├─ Security Analyzer
  ├─ License Analyzer
  ├─ Quality Analyzer
  ├─ Cost Analyzer
  └─ HIPAA Analyzer (optional)
  ↓
Each calls configured LLM provider independently
  ↓
Aggregates results
  ↓
Generates comprehensive reports
```

### 4. PR Creation (Optional)

```
lean-intel full --create-pr
  ↓
Generates all documentation
  ↓
Creates git branch
  ↓
Commits generated files
  ↓
Pushes to remote
  ↓
Creates GitHub PR with summary
```

---

## 🎓 Use Cases

### For Teams

**Onboarding New Developers**:
- Generate comprehensive documentation in 10-20 minutes
- Give new hires `ARCHITECTURE.md` and `[AI_ASSISTANT]_SETUP.md`
- Reduce onboarding time from weeks to days

**Knowledge Sharing**:
- Document tribal knowledge before it's lost
- Create consistent terminology across the team
- Enable async communication with complete context

**Working with AI Assistants**:
- Give Claude Code/Cursor/Copilot the `[AI_ASSISTANT].md` file
- AI gets complete project context (tech stack, patterns, common issues)
- Faster, more accurate AI assistance

### For Businesses

**M&A Due Diligence**:
- Complete technical assessment in 5-10 minutes (vs weeks of manual review)
- Executive summary for deal teams
- Identify dealbreakers early (GPL contamination, non-viable unit economics)
- Calculate remediation costs and valuation discounts

**VC Funding Rounds**:
- Demonstrate technical maturity to investors
- Show unit economics and scalability
- Prove security practices and compliance
- Address technical questions proactively

**Enterprise Sales**:
- Prove security posture to Fortune 500 buyers
- Demonstrate HIPAA compliance (healthcare)
- Show scalability for large deployments
- Answer procurement security questionnaires

**Quarterly Health Checks**:
- Track technical debt over time
- Monitor code quality trends
- Identify optimization opportunities
- Proactive risk management

---

## 🔧 Configuration

Configuration is stored **per-project** in `.lean-intel.json` in the project root. This file is automatically added to `.gitignore` when created (since it contains your API key).

### Project Configuration

**Via `lean-intel init` (Recommended):**

The init command creates `.lean-intel.json` with all project settings. It also runs automatically when any command is executed without an existing config.

**Configuration Structure:**

```json
{
  "projectName": "my-app",
  "projectDescription": "A healthcare SaaS platform",
  "industry": "Healthcare",
  "defaultAssistant": "claude-code",
  "llmProvider": "anthropic",
  "llmModel": "claude-sonnet-4-6",
  "apiKey": "sk-ant-..."
}
```

**Global Config** (`~/.lean-intel/config.json`): Only stores shared tokens (GitHub, Bitbucket) that apply across all projects.

### Environment Variables

API keys can be provided via environment variables. During `lean-intel init`, if the selected provider's env var is set, the API key prompt is skipped automatically.

| Variable | Description |
|----------|-------------|
| `ANTHROPIC_API_KEY` | Anthropic API key |
| `OPENAI_API_KEY` | OpenAI API key |
| `GOOGLE_API_KEY` | Google API key |
| `XAI_API_KEY` | xAI API key |

**Priority order:** `.lean-intel.json` apiKey > environment variable

**Example (CI/CD):**
```bash
export ANTHROPIC_API_KEY="sk-ant-..."
lean-intel docs --skip-prompts --name "MyApp" --description "My app description"
```

### Switching Providers

To switch LLM providers, simply run `lean-intel init` again and select a different provider.

### Changing Your Model

**Option 1: Re-run init (easiest)**
```bash
lean-intel init
# Select your provider, then choose from available models
```

**Option 2: Edit `.lean-intel.json` directly**

Edit the `llmModel` field in your project's `.lean-intel.json`:
```json
{
  "llmProvider": "anthropic",
  "llmModel": "claude-opus-4-6",
  "apiKey": "sk-ant-..."
}
```

### Available Models

#### Anthropic (Claude)

| Model | ID | Cost (Input/Output) | Best For |
|-------|-----|---------------------|----------|
| **Sonnet 4.6** (default) | `claude-sonnet-4-6` | $3/$15 per M | Best balance of quality and cost |
| **Opus 4.6** | `claude-opus-4-6` | $5/$25 per M | Maximum quality, complex analysis |
| **Haiku 4.5** | `claude-haiku-4-5` | $1/$5 per M | Fast, economical for simple tasks |

**Cost comparison for medium project:**
- Sonnet 4.6: ~$2.29
- Opus 4.6: ~$3.81 (67% more)
- Haiku 4.5: ~$0.76 (67% less)

#### OpenAI

| Model | ID | Cost (Input/Output) | Best For |
|-------|-----|---------------------|----------|
| **GPT-4.1** (default) | `gpt-4.1` | $2/$8 per M | Latest flagship, 1M context |
| **GPT-4.1 Mini** | `gpt-4.1-mini` | $0.40/$1.60 per M | Fast, cost-efficient |
| **GPT-4.1 Nano** | `gpt-4.1-nano` | $0.10/$0.40 per M | Ultra-fast, lowest cost |
| **o3** | `o3` | $2/$8 per M | Advanced reasoning |
| **o4-mini** | `o4-mini` | $1.10/$4.40 per M | Fast reasoning |

#### Google

| Model | ID | Cost (Input/Output) | Best For |
|-------|-----|---------------------|----------|
| **Gemini 2.5 Flash** (default) | `gemini-2.5-flash` | $0.30/$2.50 per M | Fast, best price-performance |
| **Gemini 2.5 Pro** | `gemini-2.5-pro` | $1.25/$10 per M | Highest quality reasoning |
| **Gemini 2.5 Flash Lite** | `gemini-2.5-flash-lite` | $0.10/$0.40 per M | Fastest, most cost-efficient |

#### xAI

| Model | ID | Cost (Input/Output) | Best For |
|-------|-----|---------------------|----------|
| **Grok 3** (default) | `grok-3` | $3/$15 per M | Flagship reasoning and generation |
| **Grok 3 Mini** | `grok-3-mini` | $0.30/$0.50 per M | Fast, cost-efficient |

---

## 🛠️ Supported Technologies

### Frontend
React, Vue.js, Angular, Svelte, Next.js, Nuxt.js, Gatsby, Remix, Solid.js, HTML/CSS/JavaScript

### Backend
**Node.js**: Express, NestJS, Fastify, Koa
**Python**: Django, Flask, FastAPI, Tornado
**Java**: Spring Boot, Quarkus
**PHP**: Laravel, Symfony
**Go**: Gin, Echo, Fiber
**Ruby**: Rails, Sinatra
**.NET**: ASP.NET Core

### Mobile
**React Native**, **Expo**, **Flutter**, **Swift** (iOS), **Kotlin** (Android)

### DevOps/Infrastructure
**IaC**: Terraform, CloudFormation, Pulumi, AWS CDK
**Orchestration**: Kubernetes, Docker Compose, ECS, Nomad
**Cloud**: AWS, GCP, Azure, DigitalOcean, Vercel, Netlify
**CI/CD**: GitHub Actions, GitLab CI, CircleCI, Jenkins, Travis CI

### Databases
PostgreSQL, MySQL, MongoDB, Redis, DynamoDB, Elasticsearch, Cassandra, Snowflake

---

## 🛠️ Development

### Local Development

```bash
# Clone repository
git clone https://github.com/leandigital/lean-intel.git
cd lean-intel

# Install dependencies
npm install

# Build
npm run build

# Run locally
npm run dev -- detect

# Link for global testing
npm link
lean-intel detect

# Relink after making changes (unlink, rebuild, link)
npm run relink
```

### Testing

```bash
npm test
npm run test:watch
```

### Linting & Formatting

```bash
npm run lint
npm run format
```

### Available Scripts

- `npm run build` - Compile TypeScript to JavaScript
- `npm run dev -- <command>` - Run CLI locally without building (e.g., `npm run dev -- detect`)
- `npm run watch` - Watch for changes and rebuild automatically
- `npm run relink` - Unlink, rebuild, and relink globally (useful for testing changes)
- `npm run package` - Build and create tarball for distribution
- `npm run test` - Run tests
- `npm run test:watch` - Run tests in watch mode
- `npm run lint` - Check code with ESLint
- `npm run format` - Format code with Prettier

---

## 🗂️ Project Structure

```
lean-intel/
├── README.md                      # This file
├── LICENSE                        # Apache-2.0 License
├── package.json                   # npm package configuration
├── tsconfig.json                  # TypeScript configuration
│
├── src/                           # 🛠️ CLI SOURCE CODE
│   ├── commands/                  # CLI commands (init, detect, docs, update, summary, ai-helper, analyze, full)
│   ├── core/                      # Core logic (orchestrator, context gatherer, export generator, change mapper)
│   ├── git/                       # Git operations (branch, commit, PR, diff)
│   ├── providers/                 # Multi-provider LLM support (Anthropic, OpenAI, Google, xAI)
│   ├── templates/                 # Report templates (CSS styles)
│   ├── utils/                     # Utilities (logger, config, cost estimator, concurrency)
│   └── types/                     # TypeScript type definitions
│
├── prompts/api/                   # 🎯 API-OPTIMIZED PROMPTS (TypeScript + Zod)
│   ├── security-analyzer.ts       # Security vulnerability analysis
│   ├── license-analyzer.ts        # OSS license compliance
│   ├── quality-analyzer.ts        # Code quality & technical debt
│   ├── cost-analyzer.ts           # Cost & scalability analysis
│   ├── hipaa-analyzer.ts          # HIPAA compliance (healthcare)
│   ├── document-prompt-rules-*.ts # Documentation prompt rules (frontend/backend/mobile/devops)
│   ├── ai-assistant-generator.ts  # AI assistant helper file generator
│   └── summary-generator.ts       # Quick-start summary generator
│
└── tests/                         # 🧪 TEST SUITE
    └── *.test.ts                  # Jest unit and integration tests
```

---

## 🤝 Contributing

Contributions welcome!

**Ways to contribute**:
- Report issues or suggest improvements
- Submit new analyzer types (e.g., GDPR, SOC 2, PCI-DSS)
- Improve existing prompts based on real-world usage
- Extend support for new frameworks or languages

---

## 📋 Roadmap

### ✅ Completed (v1.0)
- [x] CLI tool with multi-provider support (Anthropic, OpenAI, Google, xAI)
- [x] Modular documentation generation (Frontend, Backend, Mobile, DevOps)
- [x] Parallel documentation generation (3-5x speedup)
- [x] Incremental updates (`lean-intel update` - 80-90% token savings)
- [x] Executive report export (PDF/HTML with `--export` flag)
- [x] Security analyzer
- [x] HIPAA compliance analyzer
- [x] License compliance analyzer
- [x] Code quality analyzer
- [x] Cost & scalability analyzer
- [x] Due diligence orchestrator (parallel execution)
- [x] Auto-detection of documentation tier based on project size
- [x] Context-optimized AI assistant file generation
- [x] Smart update mode for AI helper files (preserves customizations)
- [x] Existing project detection in `init` command
- [x] Centralized model pricing with provider-specific cost estimates
- [x] Environment variable configuration (API keys, provider override)
- [x] Apache 2.0 open source license

### 🚧 In Progress
- [ ] GitHub Actions integration
- [ ] Video tutorials

### 🔮 Future
- [ ] GDPR compliance analyzer
- [ ] SOC 2 compliance analyzer
- [ ] PCI-DSS compliance analyzer
- [ ] Automated testing framework
- [ ] Visual documentation browser
- [ ] VS Code extension
- [ ] CI/CD integrations (GitLab, CircleCI, Jenkins)

---

## 🆘 Troubleshooting

### "API key not configured"

```bash
lean-intel init
# Select your LLM provider and enter API key
```

### "No LLM provider configured"

Run the init command to configure a provider:
```bash
lean-intel init
```

### "GitHub token validation failed"

- Ensure token has `repo` scope
- Token must be a classic personal access token
- Check token hasn't expired

### "Failed to create pull request"

- Ensure you have push access to the repository
- Check that you're in a git repository
- Verify GitHub token permissions

### "Out of memory"

For very large codebases:
```bash
NODE_OPTIONS=--max-old-space-size=4096 lean-intel full
```

---

## 💡 Tips

1. **Start with detect:** Always run `lean-intel detect` first to see what will be analyzed

2. **Quick onboarding:** Generate a summary first for fast context:
   ```bash
   lean-intel summary
   ```

3. **AI assistant setup:** Generate helper files for your preferred AI assistant:
   ```bash
   lean-intel ai-helper --assistant cursor
   # Auto-detects max mode for Cursor (high-context)

   lean-intel ai-helper --assistant copilot
   # Auto-detects compact mode for Copilot (low-context)
   ```

4. **Override size mode:** Manually control file size for specific needs:
   ```bash
   lean-intel ai-helper --assistant chatgpt --size-mode compact
   # Force compact mode even for ChatGPT (useful for older versions)
   ```

5. **Use dry-run:** Check costs before running:
   ```bash
   lean-intel full --dry-run
   ```

6. **Run incrementally:** Generate docs first, then add analysis:
   ```bash
   lean-intel docs
   lean-intel analyze --security --license
   ```

7. **Skip prompts for automation:** Use flags to automate documentation:
   ```bash
   lean-intel docs --name "MyApp" --industry "Healthcare" --skip-prompts
   ```

8. **Cache is your friend:** Subsequent runs are faster and cheaper

9. **Review before merging:** Always review AI-generated content

---

## 📄 License

Apache License 2.0 - see [LICENSE](LICENSE) file for details.

Free for commercial and personal use. If you modify and redistribute, you must:
- Retain attribution notices
- State changes made to modified files
- Include the NOTICE file

---

## 🔗 Links

- **Repository:** https://github.com/leandigital/lean-intel
- **Issues:** https://github.com/leandigital/lean-intel/issues
- **Discussions:** https://github.com/leandigital/lean-intel/discussions

**LLM Provider Links:**
- **Anthropic Claude:** https://console.anthropic.com/
- **OpenAI:** https://platform.openai.com/
- **Google Gemini:** https://aistudio.google.com/
- **xAI Grok:** https://x.ai/api/

---

## 🙏 Acknowledgments

Built by developers frustrated with outdated documentation and time-consuming analysis processes.

Inspired by the need for:
- Accurate, maintained documentation that developers actually trust
- Fast, comprehensive code analysis for M&A and funding
- Better context for AI coding assistants

**Special thanks to**:
- The AI assistant community (Claude, Cursor, Copilot users)
- Early adopters who provided feedback
- Open source contributors

---

**Made with ❤️ for developers who hate writing docs**

**Last Updated**: 2026-02-23
