# Contributing to lean-intel

Thank you for your interest in contributing to lean-intel! This guide will help you get started.

## Getting Started

### Prerequisites

- **Node.js >= 22.0.0**
- npm (included with Node.js)
- Git

### Development Setup

```bash
# Clone the repository
git clone https://github.com/leandigital/lean-intel.git
cd lean-intel

# Install dependencies
npm install

# Build the project
npm run build

# Link for local development
npm link
```

### Available Scripts

| Script | Description |
|--------|-------------|
| `npm run build` | Compile TypeScript |
| `npm run dev` | Run CLI in development mode (via tsx) |
| `npm run watch` | Watch mode for TypeScript compilation |
| `npm test` | Run tests |
| `npm run test:watch` | Run tests in watch mode |
| `npm run lint` | Lint source files |
| `npm run format` | Format source files with Prettier |
| `npm run relink` | Rebuild and relink the CLI globally |

## How to Contribute

### Reporting Issues

- Use [GitHub Issues](https://github.com/leandigital/lean-intel/issues)
- Include steps to reproduce, expected vs actual behavior, and your environment

### Submitting Changes

1. Fork the repository
2. Create a feature branch from `main` (`git checkout -b feature/your-feature`)
3. Make your changes
4. Run `npm run build` and `npm test` to verify
5. Commit with a clear, descriptive message
6. Push to your fork and open a Pull Request against `main`

### Pull Request Guidelines

- Keep PRs focused — one feature or fix per PR
- Update documentation if your change affects user-facing behavior
- Ensure the build passes and tests are green
- Add tests for new functionality where applicable

## Project Structure

- `src/` — CLI source code (TypeScript)
- `prompts/api/` — TypeScript prompt generators with Zod validation
- `documentation/` — Standalone Markdown prompts for documentation generation
- `analyzer/` — Standalone Markdown prompts for code analysis

## Working on Prompts

If you're modifying prompt files (`documentation/` or `analyzer/`):

- Test changes by running a full generation on a real codebase
- Maintain the 100% codebase verification principle — never add assumptions or invented code
- Ensure bash commands work cross-platform (Mac and Linux)
- See [CLAUDE.md](./CLAUDE.md) for detailed prompt engineering guidelines

## License

By contributing, you agree that your contributions will be licensed under the [Apache License 2.0](./LICENSE).
