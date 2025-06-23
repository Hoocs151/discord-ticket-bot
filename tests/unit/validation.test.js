const ValidationUtils = require('../../src/bot/utils/validation');

describe('ValidationUtils', () => {
  describe('sanitizeText', () => {
    test('should remove HTML-like tags', () => {
      const input = 'Hello <script>alert("xss")</script> World';
      const result = ValidationUtils.sanitizeText(input);
      expect(result).toBe('Hello scriptalert("xss")/script World');
    });

    test('should prevent @everyone/@here mentions', () => {
      const input = 'Hey @everyone and @here check this out!';
      const result = ValidationUtils.sanitizeText(input);
      expect(result).toBe('Hey @\u200Beveryone and @\u200Bhere check this out!');
    });

    test('should remove Discord invites', () => {
      const input = 'Join us at discord.gg/abc123';
      const result = ValidationUtils.sanitizeText(input);
      expect(result).toBe('Join us at [INVITE_REMOVED]');
    });

    test('should respect max length', () => {
      const input = 'a'.repeat(1000);
      const result = ValidationUtils.sanitizeText(input, 50);
      expect(result).toHaveLength(53); // 50 + '...'
      expect(result).toEndWith('...');
    });

    test('should handle null/undefined input', () => {
      expect(ValidationUtils.sanitizeText(null)).toBe('');
      expect(ValidationUtils.sanitizeText(undefined)).toBe('');
      expect(ValidationUtils.sanitizeText('')).toBe('');
    });

    test('should trim whitespace', () => {
      const input = '  hello world  ';
      const result = ValidationUtils.sanitizeText(input);
      expect(result).toBe('hello world');
    });
  });

  describe('validateTicketSubject', () => {
    test('should validate correct subject', () => {
      const result = ValidationUtils.validateTicketSubject('Help with login issues');
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should reject empty subject', () => {
      const result = ValidationUtils.validateTicketSubject('');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Subject is required');
    });

    test('should reject null/undefined subject', () => {
      const nullResult = ValidationUtils.validateTicketSubject(null);
      expect(nullResult.valid).toBe(false);
      expect(nullResult.errors).toContain('Subject is required');

      const undefinedResult = ValidationUtils.validateTicketSubject(undefined);
      expect(undefinedResult.valid).toBe(false);
      expect(undefinedResult.errors).toContain('Subject is required');
    });

    test('should reject subject too short', () => {
      const result = ValidationUtils.validateTicketSubject('hi');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Subject must be at least 3 characters');
    });

    test('should reject subject too long', () => {
      const longSubject = 'a'.repeat(101);
      const result = ValidationUtils.validateTicketSubject(longSubject);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Subject must be less than 100 characters');
    });

    test('should reject invalid characters', () => {
      const result = ValidationUtils.validateTicketSubject('Hello <script>');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Subject contains invalid characters');
    });
  });

  describe('createErrorEmbed', () => {
    test('should create error embed with single error', () => {
      const embed = ValidationUtils.createErrorEmbed('Test Error', ['Single error message']);
      
      expect(embed.data.title).toBe('❌ Test Error');
      expect(embed.data.description).toBe('Single error message');
      expect(embed.data.color).toBe(0xff0000);
      expect(embed.data.timestamp).toBeDefined();
    });

    test('should create error embed with multiple errors', () => {
      const errors = ['First error', 'Second error', 'Third error'];
      const embed = ValidationUtils.createErrorEmbed('Multiple Errors', errors);
      
      expect(embed.data.title).toBe('❌ Multiple Errors');
      expect(embed.data.description).toBe('First error\nSecond error\nThird error');
    });
  });
});
