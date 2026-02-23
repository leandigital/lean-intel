/**
 * Tests for ChangeMapper
 */

import {
  mapChangesToDocs,
  estimateImpactLevel,
  shouldFullRegenerate,
} from '../src/core/changeMapper';
import { ChangeCategories } from '../src/git/diff';
import { getFrontendFilesToGenerate } from '../prompts/api/document-prompt-rules-frontend';
import { getBackendFilesToGenerate } from '../prompts/api/document-prompt-rules-backend';
import { getMobileFilesToGenerate } from '../prompts/api/document-prompt-rules-mobile';
import { getDevOpsFilesToGenerate } from '../prompts/api/document-prompt-rules-devops';

describe('ChangeMapper', () => {
  describe('mapChangesToDocs', () => {
    const existingDocs = [
      'lean-reports/docs/ARCHITECTURE.md',
      'lean-reports/docs/COMPONENTS.md',
      'lean-reports/docs/ROUTING.md',
      'lean-reports/docs/STATE_MANAGEMENT.md',
      'lean-reports/docs/API_LAYER.md',
      'lean-reports/docs/STYLING.md',
      'lean-reports/docs/FORMS.md',
      'lean-reports/docs/AUTHENTICATION.md',
      'lean-reports/docs/DEVELOPMENT_PATTERNS.md',
    ];

    it('should map component changes to frontend docs', () => {
      const categories: ChangeCategories = {
        components: ['src/components/Button.tsx', 'src/components/Modal.tsx'],
        routes: [],
        api: [],
        config: [],
        database: [],
        styling: [],
        tests: [],
        other: [],
      };

      const affectedDocs = mapChangesToDocs(categories, 'frontend', existingDocs);

      expect(affectedDocs).toContain('COMPONENTS.md');
      expect(affectedDocs).toContain('ARCHITECTURE.md');
    });

    it('should map route changes to routing docs', () => {
      const categories: ChangeCategories = {
        components: [],
        routes: ['src/routes/index.ts'],
        api: [],
        config: [],
        database: [],
        styling: [],
        tests: [],
        other: [],
      };

      const affectedDocs = mapChangesToDocs(categories, 'frontend', existingDocs);

      expect(affectedDocs).toContain('ROUTING.md');
      expect(affectedDocs).toContain('ARCHITECTURE.md');
    });

    it('should map API changes to API docs', () => {
      const categories: ChangeCategories = {
        components: [],
        routes: [],
        api: ['src/api/users.ts'],
        config: [],
        database: [],
        styling: [],
        tests: [],
        other: [],
      };

      const affectedDocs = mapChangesToDocs(categories, 'frontend', existingDocs);

      expect(affectedDocs).toContain('API_LAYER.md');
    });

    it('should map styling changes to styling docs', () => {
      const categories: ChangeCategories = {
        components: [],
        routes: [],
        api: [],
        config: [],
        database: [],
        styling: ['src/styles/global.css'],
        tests: [],
        other: [],
      };

      const affectedDocs = mapChangesToDocs(categories, 'frontend', existingDocs);

      expect(affectedDocs).toContain('STYLING.md');
    });

    it('should map config changes to architecture docs', () => {
      const categories: ChangeCategories = {
        components: [],
        routes: [],
        api: [],
        config: ['tsconfig.json'],
        database: [],
        styling: [],
        tests: [],
        other: [],
      };

      const affectedDocs = mapChangesToDocs(categories, 'frontend', existingDocs);

      expect(affectedDocs).toContain('ARCHITECTURE.md');
      expect(affectedDocs).toContain('DEVELOPMENT_PATTERNS.md');
    });

    it('should detect auth-related files', () => {
      const categories: ChangeCategories = {
        components: ['src/components/LoginForm.tsx'],
        routes: [],
        api: [],
        config: [],
        database: [],
        styling: [],
        tests: [],
        other: [],
      };

      const affectedDocs = mapChangesToDocs(categories, 'frontend', existingDocs);

      expect(affectedDocs).toContain('AUTHENTICATION.md');
    });

    it('should detect form-related files', () => {
      const categories: ChangeCategories = {
        components: ['src/components/ContactForm.tsx'],
        routes: [],
        api: [],
        config: [],
        database: [],
        styling: [],
        tests: [],
        other: [],
      };

      const affectedDocs = mapChangesToDocs(categories, 'frontend', existingDocs);

      expect(affectedDocs).toContain('FORMS.md');
    });

    it('should detect state management files', () => {
      const categories: ChangeCategories = {
        components: [],
        routes: [],
        api: [],
        config: [],
        database: [],
        styling: [],
        tests: [],
        other: ['src/store/userSlice.ts'],
      };

      const affectedDocs = mapChangesToDocs(categories, 'frontend', existingDocs);

      expect(affectedDocs).toContain('STATE_MANAGEMENT.md');
    });

    it('should only return docs that were previously generated', () => {
      const limitedExistingDocs = [
        'lean-reports/docs/ARCHITECTURE.md',
        'lean-reports/docs/COMPONENTS.md',
      ];

      const categories: ChangeCategories = {
        components: ['src/components/Button.tsx'],
        routes: ['src/routes/index.ts'],
        api: [],
        config: [],
        database: [],
        styling: [],
        tests: [],
        other: [],
      };

      const affectedDocs = mapChangesToDocs(categories, 'frontend', limitedExistingDocs);

      // Should include COMPONENTS.md and ARCHITECTURE.md
      expect(affectedDocs).toContain('COMPONENTS.md');
      expect(affectedDocs).toContain('ARCHITECTURE.md');
      // Should NOT include ROUTING.md since it wasn't in existingDocs
      expect(affectedDocs).not.toContain('ROUTING.md');
    });

    it('should handle backend project type', () => {
      const backendDocs = [
        'lean-reports/docs/ARCHITECTURE.md',
        'lean-reports/docs/API.md',
        'lean-reports/docs/DATABASE.md',
        'lean-reports/docs/AUTHENTICATION.md',
        'lean-reports/docs/MIDDLEWARE.md',
      ];

      const categories: ChangeCategories = {
        components: [],
        routes: [],
        api: ['src/controllers/users.ts'],
        config: [],
        database: ['src/models/User.ts'],
        styling: [],
        tests: [],
        other: [],
      };

      const affectedDocs = mapChangesToDocs(categories, 'backend', backendDocs);

      expect(affectedDocs).toContain('API.md');
      expect(affectedDocs).toContain('DATABASE.md');
      expect(affectedDocs).toContain('ARCHITECTURE.md');
    });

    it('should handle mobile project type', () => {
      const mobileDocs = [
        'lean-reports/docs/ARCHITECTURE.md',
        'lean-reports/docs/SCREENS.md',
        'lean-reports/docs/NAVIGATION.md',
        'lean-reports/docs/STATE_MANAGEMENT.md',
      ];

      const categories: ChangeCategories = {
        components: ['src/screens/Home.tsx'],
        routes: ['src/navigation/index.ts'],
        api: [],
        config: [],
        database: [],
        styling: [],
        tests: [],
        other: [],
      };

      const affectedDocs = mapChangesToDocs(categories, 'mobile', mobileDocs);

      expect(affectedDocs).toContain('SCREENS.md');
      expect(affectedDocs).toContain('NAVIGATION.md');
    });
  });

  describe('estimateImpactLevel', () => {
    it('should return minimal for few changes', () => {
      const categories: ChangeCategories = {
        components: ['file1.tsx'],
        routes: [],
        api: [],
        config: [],
        database: [],
        styling: [],
        tests: [],
        other: [],
      };

      expect(estimateImpactLevel(categories)).toBe('minimal');
    });

    it('should return moderate for medium changes', () => {
      const categories: ChangeCategories = {
        components: ['file1.tsx', 'file2.tsx'],
        routes: ['routes.ts'],
        api: ['api.ts'],
        config: [],
        database: [],
        styling: [],
        tests: [],
        other: [],
      };

      expect(estimateImpactLevel(categories)).toBe('moderate');
    });

    it('should return significant for many changes', () => {
      const categories: ChangeCategories = {
        components: ['file1.tsx', 'file2.tsx', 'file3.tsx'],
        routes: ['routes.ts', 'nav.ts'],
        api: ['api.ts', 'fetch.ts'],
        config: [],
        database: ['model.ts'],
        styling: [],
        tests: [],
        other: ['util.ts'],
      };

      expect(estimateImpactLevel(categories)).toBe('significant');
    });

    it('should return major for extensive changes', () => {
      const categories: ChangeCategories = {
        components: Array(5).fill('comp.tsx'),
        routes: Array(3).fill('route.ts'),
        api: Array(3).fill('api.ts'),
        config: Array(2).fill('config.json'),
        database: Array(2).fill('model.ts'),
        styling: Array(2).fill('style.css'),
        tests: [],
        other: Array(3).fill('other.ts'),
      };

      expect(estimateImpactLevel(categories)).toBe('major');
    });

    it('should weight config changes more heavily', () => {
      const categories: ChangeCategories = {
        components: [],
        routes: [],
        api: [],
        config: ['config1.json', 'config2.json', 'config3.json'],
        database: [],
        styling: [],
        tests: [],
        other: [],
      };

      // 3 config files + 3*2 weight = 9 total, should be "significant"
      expect(estimateImpactLevel(categories)).toBe('significant');
    });
  });

  describe('shouldFullRegenerate', () => {
    it('should recommend full regen for package.json changes', () => {
      const categories: ChangeCategories = {
        components: [],
        routes: [],
        api: [],
        config: ['package.json'],
        database: [],
        styling: [],
        tests: [],
        other: [],
      };

      const result = shouldFullRegenerate(categories, 'frontend');

      expect(result.should).toBe(true);
      expect(result.reason).toContain('package.json');
    });

    it('should recommend full regen for tsconfig changes', () => {
      const categories: ChangeCategories = {
        components: [],
        routes: [],
        api: [],
        config: ['tsconfig.json'],
        database: [],
        styling: [],
        tests: [],
        other: [],
      };

      const result = shouldFullRegenerate(categories, 'frontend');

      expect(result.should).toBe(true);
      expect(result.reason).toContain('tsconfig');
    });

    it('should recommend full regen for webpack config changes', () => {
      const categories: ChangeCategories = {
        components: [],
        routes: [],
        api: [],
        config: ['webpack.config.js'],
        database: [],
        styling: [],
        tests: [],
        other: [],
      };

      const result = shouldFullRegenerate(categories, 'frontend');

      expect(result.should).toBe(true);
      expect(result.reason).toContain('webpack.config');
    });

    it('should recommend full regen when many categories affected', () => {
      const categories: ChangeCategories = {
        components: ['comp.tsx'],
        routes: ['route.ts'],
        api: ['api.ts'],
        config: [],
        database: ['model.ts'],
        styling: ['style.css'],
        tests: [],
        other: [],
      };

      const result = shouldFullRegenerate(categories, 'frontend');

      // 5 categories have files
      expect(result.should).toBe(true);
      expect(result.reason).toContain('too many areas');
    });

    it('should not recommend full regen for minor changes', () => {
      const categories: ChangeCategories = {
        components: ['Button.tsx', 'Modal.tsx'],
        routes: [],
        api: [],
        config: [],
        database: [],
        styling: [],
        tests: [],
        other: [],
      };

      const result = shouldFullRegenerate(categories, 'frontend');

      expect(result.should).toBe(false);
    });

    it('should handle DevOps config changes specially', () => {
      const categories: ChangeCategories = {
        components: [],
        routes: [],
        api: [],
        config: ['file1.tf', 'file2.tf', 'file3.tf', 'file4.tf'],
        database: [],
        styling: [],
        tests: [],
        other: [],
      };

      const result = shouldFullRegenerate(categories, 'devops');

      expect(result.should).toBe(true);
      expect(result.reason).toContain('infrastructure configuration');
    });
  });

  describe('prompt-rules parity', () => {
    /**
     * Helper: fire every category so the mapper has a chance to emit all docs.
     * existingDocs lists every filename so the filter doesn't suppress anything.
     */
    function allReachableDocs(projectType: string): string[] {
      const trigger: ChangeCategories = {
        components: [
          'src/components/Button.tsx',
          'src/screens/Home.tsx',
          'src/components/LoginForm.tsx',       // auth
          'src/components/ContactForm.tsx',      // form
        ],
        routes: ['src/routes/index.ts'],
        api: ['src/api/users.ts'],
        config: [
          'tsconfig.json',
          'file.tf',                            // terraform
          'k8s/deploy.yaml',                    // kubernetes
          'Dockerfile',                         // docker
          '.github/workflows/ci.yml',           // ci
        ],
        database: ['src/models/User.ts'],
        styling: ['src/styles/global.css'],
        tests: ['src/tests/foo.test.ts'],
        other: [
          'src/store/userSlice.ts',             // state
          'src/native/Bridge.ts',               // native
          'src/middleware/auth.ts',              // middleware
          'src/validators/input.ts',            // validation
          'src/errors/handler.ts',              // error
          'src/security/encrypt.ts',            // security
          'src/utils/helper.ts',                // patterns/util
          'src/auth/login.ts',                  // auth
          'src/build/release.ts',               // build/deploy
          'monitoring/alertmanager.yaml',        // monitor
          'storage/s3-config.json',             // storage
          'scaling/autoscaler.yaml',            // scaling
          'disaster/backup.sh',                 // disaster recovery
          'cost/budget.yaml',                   // cost
          'env/staging.env',                    // environments
          'runbooks/deploy-procedure.md',       // runbooks
        ],
      };

      // Build existingDocs containing every possible filename so filter passes all
      const allPossibleDocs = [
        ...getFrontendFilesToGenerate('comprehensive'),
        ...getBackendFilesToGenerate('comprehensive'),
        ...getMobileFilesToGenerate('comprehensive'),
        ...getDevOpsFilesToGenerate('comprehensive'),
      ].map(f => `lean-reports/docs/${f.filename}`);

      return mapChangesToDocs(trigger, projectType, allPossibleDocs);
    }

    it('should cover every frontend prompt-rules filename', () => {
      const reachable = new Set(allReachableDocs('frontend'));
      const expected = getFrontendFilesToGenerate('comprehensive').map(f => f.filename);

      const missing = expected.filter(f => !reachable.has(f));
      expect(missing).toEqual([]);
    });

    it('should cover every backend prompt-rules filename', () => {
      const reachable = new Set(allReachableDocs('backend'));
      const expected = getBackendFilesToGenerate('comprehensive').map(f => f.filename);

      const missing = expected.filter(f => !reachable.has(f));
      expect(missing).toEqual([]);
    });

    it('should cover every mobile prompt-rules filename', () => {
      const reachable = new Set(allReachableDocs('mobile'));
      const expected = getMobileFilesToGenerate('comprehensive').map(f => f.filename);

      const missing = expected.filter(f => !reachable.has(f));
      expect(missing).toEqual([]);
    });

    it('should cover every devops prompt-rules filename', () => {
      const reachable = new Set(allReachableDocs('devops'));
      const expected = getDevOpsFilesToGenerate('comprehensive').map(f => f.filename);

      const missing = expected.filter(f => !reachable.has(f));
      expect(missing).toEqual([]);
    });
  });
});
