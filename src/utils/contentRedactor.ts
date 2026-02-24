/**
 * Content Redactor - Detects and redacts secrets and PII/PHI from content
 * before sending to LLM providers.
 */

export interface RedactionStats {
  totalRedactions: number;
  byType: Record<string, number>;
  filesProcessed: number;
}

export interface RedactionResult {
  content: string;
  redactionCount: number;
}

interface RedactionPattern {
  name: string;
  pattern: RegExp;
  replacement: string;
}

export interface ContentRedactorOptions {
  disableSecrets?: boolean;
  disablePII?: boolean;
}

const SECRET_PATTERNS: RedactionPattern[] = [
  // AWS keys
  {
    name: 'AWS_KEY',
    pattern: /(?:AKIA|ABIA|ACCA|ASIA)[0-9A-Z]{16}/g,
    replacement: '[REDACTED:AWS_KEY]',
  },
  // AWS Secret keys (40-char base64 after = sign or in quotes)
  {
    name: 'AWS_SECRET',
    pattern: /(?:aws_secret_access_key|AWS_SECRET_ACCESS_KEY)\s*[=:]\s*['"]?[A-Za-z0-9/+=]{40}['"]?/gi,
    replacement: '[REDACTED:AWS_SECRET]',
  },
  // GitHub tokens
  {
    name: 'GITHUB_TOKEN',
    pattern: /(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9_]{36,255}/g,
    replacement: '[REDACTED:GITHUB_TOKEN]',
  },
  // Slack tokens
  {
    name: 'SLACK_TOKEN',
    pattern: /xox[bpors]-[A-Za-z0-9-]{10,250}/g,
    replacement: '[REDACTED:SLACK_TOKEN]',
  },
  // JWTs (3 base64url segments separated by dots)
  {
    name: 'JWT',
    pattern: /eyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g,
    replacement: '[REDACTED:JWT]',
  },
  // Private keys (PEM format)
  {
    name: 'PRIVATE_KEY',
    pattern: /-----BEGIN (?:RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----[\s\S]*?-----END (?:RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----/g,
    replacement: '[REDACTED:PRIVATE_KEY]',
  },
  // Bearer tokens
  {
    name: 'BEARER_TOKEN',
    pattern: /Bearer\s+[A-Za-z0-9_\-.~+/]+=*/g,
    replacement: '[REDACTED:BEARER_TOKEN]',
  },
  // Connection strings (mongodb, postgres, mysql, redis, amqp)
  {
    name: 'CONNECTION_STRING',
    pattern: /(?:mongodb(?:\+srv)?|postgres(?:ql)?|mysql|redis|amqp)s?:\/\/[^\s'"`,)}\]]+/gi,
    replacement: '[REDACTED:CONNECTION_STRING]',
  },
  // Generic API keys / tokens / passwords in env-style assignments
  {
    name: 'GENERIC_SECRET',
    pattern: /(?:api_?key|api_?secret|auth_?token|access_?token|secret_?key|password|passwd|private_?key|client_?secret)\s*[=:]\s*['"]?[A-Za-z0-9_\-./+=]{8,128}['"]?/gi,
    replacement: '[REDACTED:GENERIC_SECRET]',
  },
];

const PII_PATTERNS: RedactionPattern[] = [
  // Email addresses
  {
    name: 'EMAIL',
    pattern: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
    replacement: '[REDACTED:EMAIL]',
  },
  // US phone numbers
  {
    name: 'PHONE',
    pattern: /\b(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]\d{3}[-.\s]\d{4}\b/g,
    replacement: '[REDACTED:PHONE]',
  },
  // SSN
  {
    name: 'SSN',
    pattern: /\b\d{3}-\d{2}-\d{4}\b/g,
    replacement: '[REDACTED:SSN]',
  },
  // IPv4 addresses (skip common non-sensitive ones like 0.0.0.0, 127.0.0.1, localhost patterns)
  {
    name: 'IP_ADDRESS',
    pattern: /\b(?!0\.0\.0\.0|127\.\d{1,3}\.\d{1,3}\.\d{1,3}|255\.255\.255\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(?:1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3})\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g,
    replacement: '[REDACTED:IP_ADDRESS]',
  },
];

export class ContentRedactor {
  private patterns: RedactionPattern[];
  private stats: RedactionStats;

  constructor(options: ContentRedactorOptions = {}) {
    this.patterns = [];

    if (!options.disableSecrets) {
      this.patterns.push(...SECRET_PATTERNS);
    }

    if (!options.disablePII) {
      this.patterns.push(...PII_PATTERNS);
    }

    this.stats = {
      totalRedactions: 0,
      byType: {},
      filesProcessed: 0,
    };
  }

  /**
   * Redact sensitive content from a string
   */
  redact(content: string): RedactionResult {
    let redacted = content;
    let redactionCount = 0;

    for (const { name, pattern, replacement } of this.patterns) {
      // Reset lastIndex for global regexes
      pattern.lastIndex = 0;
      const matches = redacted.match(pattern);

      if (matches) {
        redactionCount += matches.length;
        this.stats.totalRedactions += matches.length;
        this.stats.byType[name] = (this.stats.byType[name] || 0) + matches.length;
        redacted = redacted.replace(pattern, replacement);
      }
    }

    this.stats.filesProcessed++;

    return { content: redacted, redactionCount };
  }

  /**
   * Get cumulative redaction statistics
   */
  getStats(): RedactionStats {
    return { ...this.stats, byType: { ...this.stats.byType } };
  }
}
