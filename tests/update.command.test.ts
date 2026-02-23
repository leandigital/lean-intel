import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { ProjectConfigManager } from '../src/utils/projectConfig';
import { ensureProjectConfigured } from '../src/utils/providerPrompt';

const mockSpinner = {
  start: jest.fn(),
  succeed: jest.fn(),
  fail: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
};
mockSpinner.start.mockReturnValue(mockSpinner);

jest.mock('ora', () => ({
  __esModule: true,
  default: jest.fn(() => mockSpinner),
}));

jest.mock('../src/utils/providerPrompt', () => ({
  ensureProjectConfigured: jest.fn(),
}));

jest.mock('../src/core/detector', () => ({
  ProjectDetector: jest.fn().mockImplementation(() => ({
    detect: jest.fn().mockResolvedValue({
      projectType: 'frontend',
      rootPath: '/tmp/project',
      frameworks: ['react'],
      languages: ['typescript'],
      hasDatabase: false,
      hasTests: true,
      hasCICD: false,
      dependencies: {},
      devDependencies: {},
      fileCount: 20,
      lineCount: 2000,
      documentationTier: 'standard',
    }),
  })),
}));

jest.mock('../src/git/diff', () => ({
  DiffManager: jest.fn().mockImplementation(() => ({
    isValidCommit: jest.fn().mockResolvedValue(true),
    shortHash: jest.fn((hash: string) => hash.slice(0, 7)),
    getChangedFilesSince: jest.fn().mockResolvedValue([
      { path: 'src/app.ts', status: 'modified' },
    ]),
    categorizeChanges: jest.fn().mockReturnValue({}),
    getChangeSummary: jest.fn().mockReturnValue({
      total: 1,
      added: 0,
      modified: 1,
      deleted: 0,
    }),
  })),
}));

jest.mock('../src/core/changeMapper', () => ({
  mapChangesToDocs: jest.fn().mockReturnValue(['ARCHITECTURE.md']),
  estimateImpactLevel: jest.fn().mockReturnValue('minimal'),
  shouldFullRegenerate: jest.fn().mockReturnValue({ should: false, reason: '' }),
}));

jest.mock('../src/core/llmOrchestrator', () => ({
  LLMOrchestrator: jest.fn().mockImplementation(() => ({
    generateIncrementalDocumentation: jest.fn().mockResolvedValue({
      name: 'documentation',
      status: 'success',
      output: '## Updated docs',
      cost: 0.12,
      duration: 2.3,
      tokensUsed: 1234,
    }),
  })),
}));

jest.mock('../src/core/fileGenerator', () => ({
  FileGenerator: jest.fn().mockImplementation(() => ({
    generateFiles: jest.fn().mockResolvedValue(['lean-reports/docs/ARCHITECTURE.md']),
    getOutputDir: jest.fn().mockReturnValue('lean-reports/docs'),
  })),
}));

jest.mock('../src/git/commit', () => ({
  CommitManager: jest.fn().mockImplementation(() => ({
    getLastCommitHash: jest.fn().mockResolvedValue('newcommit123'),
  })),
}));

jest.mock('../src/utils/costEstimator', () => ({
  estimateCost: jest.fn().mockReturnValue({
    pricingInfo: '$3/$15 per M',
    inputTokens: 1000,
    outputTokens: 500,
    estimatedCost: 1.25,
    estimatedDuration: 1,
  }),
  formatCost: jest.fn((value: number) => `$${value.toFixed(2)}`),
}));

jest.mock('../src/utils/logger', () => ({
  logger: {
    newLine: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    section: jest.fn(),
    log: jest.fn(),
    success: jest.fn(),
    box: jest.fn(),
    error: jest.fn(),
    table: jest.fn(),
    debug: jest.fn(),
  },
}));

import { updateCommand } from '../src/commands/update';

describe('update command config retention', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lean-intel-update-command-'));
    jest.clearAllMocks();

    const initialConfig = new ProjectConfigManager(tempDir);
    initialConfig.setAll({
      projectName: 'old-project',
      projectDescription: 'Old project description used before setup',
      industry: 'Software',
      defaultAssistant: 'claude-code',
    });
    initialConfig.setLastGeneration({
      commitHash: 'abc1234',
      timestamp: '2026-02-10T12:00:00.000Z',
      documentationTier: 'standard',
      generatedFiles: ['lean-reports/docs/ARCHITECTURE.md'],
      projectType: 'frontend',
    });
    initialConfig.save();
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
    jest.restoreAllMocks();
  });

  it('persists fields from the configured manager returned by setup', async () => {
    const configuredManager = new ProjectConfigManager(tempDir);
    configuredManager.setAll({
      projectName: 'new-project',
      projectDescription: 'Configured through setup flow',
      industry: 'Healthcare',
      defaultAssistant: 'cursor',
      llmProvider: 'anthropic',
      llmModel: 'claude-sonnet-4-5-20250929',
      apiKey: 'sk-ant-updated',
    });

    const ensureMock = ensureProjectConfigured as jest.MockedFunction<
      typeof ensureProjectConfigured
    >;
    ensureMock.mockResolvedValue({
      projectConfig: configuredManager,
      providerConfig: {
        type: 'anthropic',
        apiKey: 'sk-ant-updated',
        model: 'claude-sonnet-4-5-20250929',
      },
    });

    jest.useFakeTimers();

    const actionPromise = updateCommand.parseAsync(
      ['node', 'update-test', '--path', tempDir],
      { from: 'node' }
    );

    await jest.runAllTimersAsync();
    await actionPromise;
    jest.useRealTimers();

    const persisted = JSON.parse(
      fs.readFileSync(path.join(tempDir, '.lean-intel.json'), 'utf-8')
    );

    expect(persisted.llmProvider).toBe('anthropic');
    expect(persisted.llmModel).toBe('claude-sonnet-4-5-20250929');
    expect(persisted.apiKey).toBe('sk-ant-updated');
    expect(persisted.projectName).toBe('new-project');
    expect(persisted.lastGeneration?.commitHash).toBe('newcommit123');
  });
});
