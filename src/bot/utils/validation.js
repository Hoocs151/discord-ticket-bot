const { EmbedBuilder } = require('discord.js');

class ValidationUtils {
  static sanitizeText(text, maxLength = 1000) {
    if (!text || typeof text !== 'string') return '';
    
    // Remove potential harmful characters
    const sanitized = text
      .replace(/[<>]/g, '') // Remove HTML-like tags
      .replace(/\@(everyone|here)/gi, '@\u200B$1') // Zero-width space to prevent @everyone/@here
      .replace(/discord\.gg\/[a-zA-Z0-9]+/gi, '[INVITE_REMOVED]') // Remove Discord invites
      .replace(/https?:\/\/[^\s]+/gi, '[LINK_REMOVED]') // Remove URLs (optional)
      .trim();
    
    return sanitized.length > maxLength 
      ? sanitized.substring(0, maxLength) + '...' 
      : sanitized;
  }

  static validateTicketSubject(subject) {
    const errors = [];
    
    if (!subject || typeof subject !== 'string') {
      errors.push('Subject is required');
    } else {
      if (subject.length < 3) {
        errors.push('Subject must be at least 3 characters');
      }
      if (subject.length > 100) {
        errors.push('Subject must be less than 100 characters');
      }
      if (!/^[a-zA-Z0-9\s\-_.,!?]+$/.test(subject)) {
        errors.push('Subject contains invalid characters');
      }
    }
    
    return { valid: errors.length === 0, errors };
  }

  static validatePermissions(member, requiredPerms) {
    const missing = requiredPerms.filter(perm => !member.permissions.has(perm));
    return {
      valid: missing.length === 0,
      missing: missing
    };
  }

  static async rateLimitCheck(userId, action, windowMs = 60000, maxAttempts = 5) {
    // Implement rate limiting logic
    const key = `rateLimit:${userId}:${action}`;
    // This would use Redis in production
    return { allowed: true, remaining: maxAttempts };
  }

  static createErrorEmbed(title, errors) {
    return new EmbedBuilder()
      .setColor('#ff0000')
      .setTitle(`❌ ${title}`)
      .setDescription(errors.join('\n'))
      .setTimestamp();
  }
}

module.exports = ValidationUtils; 