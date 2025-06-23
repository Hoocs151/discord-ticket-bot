/**
 * Ticketshi ID Generator
 * Advanced unique identifier generation system
 * SNX-2024-ENTERPRISE
 */

const crypto = require('crypto');
const { PREFIXES, NEXUS_CONFIG } = require('./constants');

class NexusIDGenerator {
  constructor() {
    this.sequenceCache = new Map();
    this.lastTimestamp = 0;
    this.sequence = 0;
    this.nodeId = this.generateNodeId();
  }

  /**
   * Generate unique node identifier based on system characteristics
   */
  generateNodeId() {
    const hash = crypto.createHash('sha256');
    hash.update(process.env.HOSTNAME || 'nexus-node');
    hash.update(process.pid.toString());
    hash.update(Date.now().toString());
    return hash.digest('hex').substring(0, 4).toUpperCase();
  }

  /**
   * Generate advanced ticket ID with multiple components
   */
  generateTicketId(guildId, priority = 'MEDIUM') {
    const timestamp = Date.now();
    const year = new Date().getFullYear();
    const dayOfYear = Math.floor((Date.now() - new Date(year, 0, 0)) / 86400000);
    
    // Priority prefix
    const priorityMap = {
      'CRITICAL': 'C',
      'HIGH': 'H', 
      'MEDIUM': 'M',
      'LOW': 'L'
    };
    
    const priorityCode = priorityMap[priority] || 'M';
    
    // Guild hash (last 3 chars of guild ID hash)
    const guildHash = crypto.createHash('md5')
      .update(guildId)
      .digest('hex')
      .substring(0, 3)
      .toUpperCase();
    
    // Sequence number for the day
    const dayKey = `${year}-${dayOfYear}`;
    let sequence = this.sequenceCache.get(dayKey) || 0;
    sequence++;
    this.sequenceCache.set(dayKey, sequence);
    
    // Clean old sequences (keep only current day)
    this.cleanupSequenceCache();
    
    // Format: SNX-C-ABC-2024-001-DEF
    return `${PREFIXES.TICKET}-${priorityCode}-${guildHash}-${year}-${sequence.toString().padStart(3, '0')}-${this.nodeId}`;
  }

  /**
   * Generate session ID for tracking user interactions
   */
  generateSessionId(userId, channelId) {
    const timestamp = Date.now().toString(36);
    const userHash = crypto.createHash('md5')
      .update(userId)
      .digest('hex')
      .substring(0, 4);
    const channelHash = crypto.createHash('md5')
      .update(channelId)
      .digest('hex')
      .substring(0, 4);
    
    return `${PREFIXES.SESSION}-${timestamp}-${userHash}-${channelHash}`.toUpperCase();
  }

  /**
   * Generate transaction ID for tracking operations
   */
  generateTransactionId(operationType = 'GENERAL') {
    const timestamp = this.getSnowflakeTimestamp();
    const random = crypto.randomBytes(3).toString('hex').toUpperCase();
    const opCode = operationType.substring(0, 3).toUpperCase();
    
    return `${PREFIXES.TRANSACTION}-${opCode}-${timestamp}-${random}`;
  }

  /**
   * Generate reference code for external systems
   */
  generateReferenceCode(length = 8) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `REF-${result}`;
  }

  /**
   * Generate snowflake-like timestamp for high precision
   */
  getSnowflakeTimestamp() {
    let timestamp = Date.now();
    
    if (timestamp === this.lastTimestamp) {
      this.sequence++;
      if (this.sequence > 4095) { // 12-bit sequence
        timestamp = this.waitNextMillis(this.lastTimestamp);
        this.sequence = 0;
      }
    } else {
      this.sequence = 0;
    }
    
    this.lastTimestamp = timestamp;
    
    // Convert to custom base36 format
    return timestamp.toString(36).toUpperCase();
  }

  /**
   * Wait for next millisecond
   */
  waitNextMillis(lastTimestamp) {
    let timestamp = Date.now();
    while (timestamp <= lastTimestamp) {
      timestamp = Date.now();
    }
    return timestamp;
  }

  /**
   * Clean up old sequence cache entries
   */
  cleanupSequenceCache() {
    const currentYear = new Date().getFullYear();
    const currentDayOfYear = Math.floor((Date.now() - new Date(currentYear, 0, 0)) / 86400000);
    const currentKey = `${currentYear}-${currentDayOfYear}`;
    
    // Keep only current day and previous day
    for (const [key] of this.sequenceCache) {
      if (key !== currentKey && key !== `${currentYear}-${currentDayOfYear - 1}`) {
        this.sequenceCache.delete(key);
      }
    }
  }

  /**
   * Validate ID format
   */
  validateTicketId(ticketId) {
    const pattern = /^SNX-[CHML]-[A-F0-9]{3}-\d{4}-\d{3}-[A-F0-9]{4}$/;
    return pattern.test(ticketId);
  }

  /**
   * Extract information from ticket ID
   */
  parseTicketId(ticketId) {
    if (!this.validateTicketId(ticketId)) {
      return null;
    }

    const parts = ticketId.split('-');
    const priorityMap = {
      'C': 'CRITICAL',
      'H': 'HIGH',
      'M': 'MEDIUM',
      'L': 'LOW'
    };

    return {
      prefix: parts[0],
      priority: priorityMap[parts[1]],
      guildHash: parts[2],
      year: parseInt(parts[3]),
      sequence: parseInt(parts[4]),
      nodeId: parts[5],
      isValid: true
    };
  }

  /**
   * Get system information for debugging
   */
  getSystemInfo() {
    return {
      nodeId: this.nodeId,
      systemId: NEXUS_CONFIG.SYSTEM_ID,
      version: NEXUS_CONFIG.BUILD_VERSION,
      cacheSize: this.sequenceCache.size,
      lastTimestamp: this.lastTimestamp,
      sequence: this.sequence
    };
  }
}

// Export singleton instance
module.exports = new NexusIDGenerator();
