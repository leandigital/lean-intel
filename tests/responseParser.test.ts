/**
 * Tests for response parser utility
 */

import { z } from 'zod';
import {
  parseResponse,
  parseResponseWithRetryPrompt,
  zodToJsonSchema,
} from '../src/utils/responseParser';

describe('responseParser', () => {
  describe('parseResponse', () => {
    const simpleSchema = z.object({
      name: z.string(),
      age: z.number(),
    });

    it('should parse valid JSON', () => {
      const content = '{"name": "John", "age": 30}';
      const result = parseResponse(content, simpleSchema);

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ name: 'John', age: 30 });
    });

    it('should extract JSON from markdown code blocks', () => {
      const content = '```json\n{"name": "John", "age": 30}\n```';
      const result = parseResponse(content, simpleSchema);

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ name: 'John', age: 30 });
    });

    it('should extract JSON from code blocks without language', () => {
      const content = '```\n{"name": "John", "age": 30}\n```';
      const result = parseResponse(content, simpleSchema);

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ name: 'John', age: 30 });
    });

    it('should handle JSON with surrounding text', () => {
      const content = 'Here is the result:\n{"name": "John", "age": 30}\nEnd of response.';
      const result = parseResponse(content, simpleSchema);

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ name: 'John', age: 30 });
    });

    it('should fail on invalid JSON', () => {
      const content = 'not valid json';
      const result = parseResponse(content, simpleSchema);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid JSON');
    });

    it('should fail on schema validation errors', () => {
      const content = '{"name": "John", "age": "thirty"}';
      const result = parseResponse(content, simpleSchema);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Schema validation failed');
      expect(result.error).toContain('age');
    });

    it('should fail on missing required fields', () => {
      const content = '{"name": "John"}';
      const result = parseResponse(content, simpleSchema);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Schema validation failed');
    });

    it('should handle complex nested schemas', () => {
      const complexSchema = z.object({
        user: z.object({
          name: z.string(),
          email: z.string().email(),
        }),
        items: z.array(z.object({
          id: z.number(),
          name: z.string(),
        })),
      });

      const content = JSON.stringify({
        user: { name: 'John', email: 'john@example.com' },
        items: [
          { id: 1, name: 'Item 1' },
          { id: 2, name: 'Item 2' },
        ],
      });

      const result = parseResponse(content, complexSchema);
      expect(result.success).toBe(true);
    });

    it('should handle optional fields', () => {
      const schemaWithOptional = z.object({
        name: z.string(),
        nickname: z.string().optional(),
      });

      const content = '{"name": "John"}';
      const result = parseResponse(content, schemaWithOptional);

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ name: 'John' });
    });

    it('should handle enum fields', () => {
      const schemaWithEnum = z.object({
        status: z.enum(['active', 'inactive', 'pending']),
      });

      const content = '{"status": "active"}';
      const result = parseResponse(content, schemaWithEnum);

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ status: 'active' });
    });

    it('should fail on invalid enum value', () => {
      const schemaWithEnum = z.object({
        status: z.enum(['active', 'inactive']),
      });

      const content = '{"status": "unknown"}';
      const result = parseResponse(content, schemaWithEnum);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Schema validation failed');
    });
  });

  describe('parseResponseWithRetryPrompt', () => {
    const schema = z.object({ value: z.number() });

    it('should return data on success', () => {
      const content = '{"value": 42}';
      const result = parseResponseWithRetryPrompt(content, schema);

      expect('data' in result).toBe(true);
      if ('data' in result) {
        expect(result.data).toEqual({ value: 42 });
      }
    });

    it('should return retry prompt on failure', () => {
      const content = 'invalid';
      const result = parseResponseWithRetryPrompt(content, schema);

      expect('retryPrompt' in result).toBe(true);
      if ('retryPrompt' in result) {
        expect(result.retryPrompt).toContain('not valid JSON');
      }
    });
  });

  describe('zodToJsonSchema', () => {
    it('should convert string schema', () => {
      const schema = z.string();
      const jsonSchema = zodToJsonSchema(schema);

      expect(jsonSchema).toEqual({ type: 'string' });
    });

    it('should convert number schema', () => {
      const schema = z.number();
      const jsonSchema = zodToJsonSchema(schema);

      expect(jsonSchema).toEqual({ type: 'number' });
    });

    it('should convert boolean schema', () => {
      const schema = z.boolean();
      const jsonSchema = zodToJsonSchema(schema);

      expect(jsonSchema).toEqual({ type: 'boolean' });
    });

    it('should convert array schema', () => {
      const schema = z.array(z.string());
      const jsonSchema = zodToJsonSchema(schema);

      expect(jsonSchema).toEqual({
        type: 'array',
        items: { type: 'string' },
      });
    });

    it('should convert object schema', () => {
      const schema = z.object({
        name: z.string(),
        age: z.number(),
      });
      const jsonSchema = zodToJsonSchema(schema);

      expect(jsonSchema).toEqual({
        type: 'object',
        properties: {
          name: { type: 'string' },
          age: { type: 'number' },
        },
        required: ['name', 'age'],
      });
    });

    it('should handle optional fields in object', () => {
      const schema = z.object({
        name: z.string(),
        nickname: z.string().optional(),
      });
      const jsonSchema = zodToJsonSchema(schema);

      expect(jsonSchema).toEqual({
        type: 'object',
        properties: {
          name: { type: 'string' },
          nickname: { type: 'string' },
        },
        required: ['name'],
      });
    });

    it('should convert enum schema', () => {
      const schema = z.enum(['A', 'B', 'C']);
      const jsonSchema = zodToJsonSchema(schema);

      expect(jsonSchema).toEqual({
        type: 'string',
        enum: ['A', 'B', 'C'],
      });
    });

    it('should handle nested objects', () => {
      const schema = z.object({
        user: z.object({
          name: z.string(),
        }),
      });
      const jsonSchema = zodToJsonSchema(schema);

      expect(jsonSchema).toEqual({
        type: 'object',
        properties: {
          user: {
            type: 'object',
            properties: {
              name: { type: 'string' },
            },
            required: ['name'],
          },
        },
        required: ['user'],
      });
    });
  });
});
