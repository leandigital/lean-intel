import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { ensureProjectConfigured } from '../src/utils/providerPrompt';
import { ProjectConfigManager } from '../src/utils/projectConfig';
import { runProjectSetup } from '../src/utils/setupProject';

jest.mock('../src/utils/setupProject', () => ({
  runProjectSetup: jest.fn(),
}));

jest.mock('../src/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    newLine: jest.fn(),
  },
}));

describe('ensureProjectConfigured', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lean-intel-provider-prompt-'));
    jest.restoreAllMocks();
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('throws in non-interactive mode when project is missing provider config', async () => {
    const manager = new ProjectConfigManager(tempDir);
    manager.setAll({
      projectName: 'demo',
      projectDescription: 'A demo project for tests',
      industry: 'Software',
    });
    manager.save();

    await expect(
      ensureProjectConfigured(tempDir, { skipPrompts: true })
    ).rejects.toThrow(
      'Project is not configured. Run "lean-intel init" first, or re-run without --skip-prompts.'
    );
  });

  it('uses existing config and falls back to default model when llmModel is missing', async () => {
    const manager = new ProjectConfigManager(tempDir);
    manager.setAll({
      projectName: 'demo',
      projectDescription: 'A demo project for tests',
      industry: 'Software',
      llmProvider: 'openai',
      apiKey: 'sk-test-key',
    });
    manager.save();

    const result = await ensureProjectConfigured(tempDir, { skipPrompts: true });

    expect(result.providerConfig).toEqual({
      type: 'openai',
      apiKey: 'sk-test-key',
      model: 'gpt-4.1',
    });
  });

  it('runs setup when config is missing and returns the configured manager', async () => {
    const configuredManager = new ProjectConfigManager(tempDir);
    configuredManager.setAll({
      projectName: 'configured',
      projectDescription: 'Configured project from setup flow',
      industry: 'Software',
      llmProvider: 'anthropic',
      llmModel: 'claude-sonnet-4-5-20250929',
      apiKey: 'sk-ant-configured',
    });

    const setupSpy = runProjectSetup as jest.MockedFunction<typeof runProjectSetup>;
    setupSpy.mockResolvedValue(configuredManager);

    const result = await ensureProjectConfigured(tempDir);

    expect(setupSpy).toHaveBeenCalledWith(tempDir);
    expect(result.projectConfig).toBe(configuredManager);
    expect(result.providerConfig).toEqual({
      type: 'anthropic',
      apiKey: 'sk-ant-configured',
      model: 'claude-sonnet-4-5-20250929',
    });
  });
});
