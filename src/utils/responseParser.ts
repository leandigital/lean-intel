/**
 * Response Parser - validates and parses LLM JSON responses
 *
 * Uses Zod schemas to validate and type LLM responses,
 * providing better error handling and type safety.
 */

import { z, ZodSchema, ZodError } from 'zod';

// Simple debug logging for response parsing
const DEBUG = process.env.DEBUG === 'true';
const debugLog = (message: string): void => {
  if (DEBUG) {
    console.debug(`[ResponseParser] ${message}`);
  }
};

export interface ParseResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  raw?: string;
}

/**
 * Extract JSON from LLM response that may contain markdown code blocks
 */
function extractJson(content: string): string {
  // Try to extract JSON from markdown code blocks
  const jsonBlockMatch = content.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  if (jsonBlockMatch) {
    return jsonBlockMatch[1].trim();
  }

  // Try to find raw JSON (starts with { or [)
  const jsonMatch = content.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
  if (jsonMatch) {
    return jsonMatch[1].trim();
  }

  // Return as-is, let JSON.parse handle it
  return content.trim();
}

/**
 * Parse and validate LLM response against a Zod schema
 *
 * @param content - Raw LLM response content
 * @param schema - Zod schema to validate against
 * @returns ParseResult with typed data or error
 */
export function parseResponse<T>(
  content: string,
  schema: ZodSchema<T>
): ParseResult<T> {
  try {
    // Extract JSON from potential markdown wrapper
    const jsonStr = extractJson(content);

    // Parse JSON
    let parsed: unknown;
    try {
      parsed = JSON.parse(jsonStr);
    } catch (jsonError) {
      debugLog(`JSON parse failed: ${jsonError}`);
      return {
        success: false,
        error: `Invalid JSON: ${jsonError instanceof Error ? jsonError.message : 'Unknown parse error'}`,
        raw: content.substring(0, 500),
      };
    }

    // Validate against schema
    const result = schema.safeParse(parsed);

    if (result.success) {
      return {
        success: true,
        data: result.data,
      };
    } else {
      const zodError = result.error as ZodError;
      const issues = zodError.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; ');
      debugLog(`Schema validation failed: ${issues}`);
      return {
        success: false,
        error: `Schema validation failed: ${issues}`,
        raw: JSON.stringify(parsed).substring(0, 500),
      };
    }
  } catch (error) {
    debugLog(`Unexpected parse error: ${error}`);
    return {
      success: false,
      error: `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      raw: content.substring(0, 500),
    };
  }
}

/**
 * Parse response with automatic retry prompt generation
 *
 * Returns parsed data if valid, or a retry prompt if validation fails
 */
export function parseResponseWithRetryPrompt<T>(
  content: string,
  schema: ZodSchema<T>
): { data: T } | { retryPrompt: string } {
  const result = parseResponse(content, schema);

  if (result.success && result.data) {
    return { data: result.data };
  }

  // Generate a helpful retry prompt
  const retryPrompt = `Your previous response was not valid JSON or failed schema validation.

Error: ${result.error}

Please provide a valid JSON response that matches the required schema.
Remember:
- Start directly with { and end with }
- Do not wrap in markdown code blocks
- Ensure all required fields are present
- Use the exact field names and types specified`;

  return { retryPrompt };
}

/**
 * Type guard to check if schema is a Zod object schema
 */
export function isZodObject(schema: ZodSchema): schema is z.ZodObject<z.ZodRawShape> {
  return schema instanceof z.ZodObject;
}

/**
 * Convert Zod schema to JSON Schema (simplified)
 * Used for generating tool definitions for structured outputs
 */
export function zodToJsonSchema(schema: z.ZodTypeAny): Record<string, unknown> {
  // This is a simplified conversion - for complex schemas,
  // consider using zod-to-json-schema package

  if (schema instanceof z.ZodString) {
    return { type: 'string' };
  }
  if (schema instanceof z.ZodNumber) {
    return { type: 'number' };
  }
  if (schema instanceof z.ZodBoolean) {
    return { type: 'boolean' };
  }
  if (schema instanceof z.ZodArray) {
    return {
      type: 'array',
      items: zodToJsonSchema(schema._def.type),
    };
  }
  if (schema instanceof z.ZodObject) {
    const properties: Record<string, unknown> = {};
    const required: string[] = [];

    for (const [key, value] of Object.entries(schema.shape)) {
      properties[key] = zodToJsonSchema(value as z.ZodTypeAny);
      if (!(value instanceof z.ZodOptional)) {
        required.push(key);
      }
    }

    return {
      type: 'object',
      properties,
      required: required.length > 0 ? required : undefined,
    };
  }
  if (schema instanceof z.ZodEnum) {
    return {
      type: 'string',
      enum: schema._def.values,
    };
  }
  if (schema instanceof z.ZodOptional) {
    return zodToJsonSchema(schema._def.innerType);
  }
  if (schema instanceof z.ZodNullable) {
    return zodToJsonSchema(schema._def.innerType);
  }

  // Fallback for unknown types
  return { type: 'object' };
}
