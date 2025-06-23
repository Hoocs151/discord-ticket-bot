/**
 * Ticketshi Constants & Configuration
 * Advanced Enterprise Support Management System
 * Build: SNX-2024-ENTERPRISE
 */

// Unique System Identifiers
const NEXUS_CONFIG = {
  SYSTEM_ID: 'SNX-ADV-2024',
  BUILD_VERSION: '2.0.0-ENTERPRISE',
  CODENAME: 'Ticketshi',
  SIGNATURE: 'SNX-POWERED',
  ENVIRONMENT: process.env.NODE_ENV || 'production'
};

// Custom Prefixes & Identifiers
const PREFIXES = {
  TICKET: 'SNX',
  SESSION: 'SN-SES',
  TRANSACTION: 'TXN',
  WORKFLOW: 'WF',
  ANALYTICS: 'ANL',
  NOTIFICATION: 'NOTIF'
};

// Unique Color Schemes
const COLORS = {
  PRIMARY: 0x2C3E50,     // Dark Blue-Gray
  SUCCESS: 0x27AE60,     // Emerald Green
  WARNING: 0xF39C12,     // Orange
  ERROR: 0xE74C3C,       // Red
  INFO: 0x3498DB,        // Blue
  SECONDARY: 0x95A5A6,   // Gray
  ACCENT: 0x9B59B6,      // Purple
  NEXUS_BRAND: 0x1ABC9C  // Turquoise
};

// Custom Emojis & Icons
const EMOJIS = {
  NEXUS: '🔷',
  ROCKET: '🚀',
  SHIELD: '🛡️',
  DIAMOND: '💎',
  LIGHTNING: '⚡',
  GEAR: '⚙️',
  CHART: '📊',
  TARGET: '🎯',
  FIRE: '🔥',
  STAR: '⭐',
  WARNING: '⚠️',
  SUCCESS: '✅',
  ERROR: '❌',
  PROCESSING: '🔄',
  LOCKED: '🔒',
  UNLOCKED: '🔓'
};

// System Limits & Thresholds
const LIMITS = {
  MAX_TICKETS_PER_USER: 7,
  MAX_ACTIVE_SESSIONS: 50,
  CACHE_TTL: 900000, // 15 minutes
  RATE_LIMIT_WINDOW: 60000, // 1 minute
  MAX_REQUESTS_PER_WINDOW: 15,
  AUTO_CLOSE_DEFAULT_HOURS: 48,
  WARNING_BEFORE_CLOSE_HOURS: 4,
  MAX_TRANSCRIPT_SIZE: 1048576, // 1MB
  MAX_ATTACHMENT_SIZE: 8388608, // 8MB
  SESSION_TIMEOUT: 3600000 // 1 hour
};

// Custom Response Templates
const RESPONSES = {
  SYSTEM_READY: `${EMOJIS.NEXUS} **Ticketshi v${NEXUS_CONFIG.BUILD_VERSION}** - Advanced support system operational`,
  MAINTENANCE_MODE: `${EMOJIS.GEAR} Ticketshi is currently under maintenance - Enhanced features incoming`,
  UNAUTHORIZED: `${EMOJIS.SHIELD} Access denied - Insufficient permissions for this operation`,
  RATE_LIMITED: `${EMOJIS.WARNING} System protection active - Please reduce request frequency`,
  PROCESSING: `${EMOJIS.PROCESSING} Ticketshi is processing your request...`,
  SUCCESS_GENERIC: `${EMOJIS.SUCCESS} Operation completed successfully`,
  ERROR_GENERIC: `${EMOJIS.ERROR} An unexpected error occurred - Support team has been notified`
};

// Unique Feature Flags
const FEATURES = {
  INTELLIGENT_ROUTING: true,
  PREDICTIVE_ANALYTICS: true,
  AUTOMATED_ESCALATION: true,
  SENTIMENT_ANALYSIS: false,
  VOICE_TRANSCRIPTION: false,
  AI_SUGGESTIONS: false,
  ADVANCED_WORKFLOWS: true,
  REAL_TIME_MONITORING: true,
  CUSTOM_INTEGRATIONS: true
};

// Database Collections with Unique Names
const COLLECTIONS = {
  TICKETS: 'nexus_support_tickets',
  USERS: 'nexus_user_profiles',
  GUILDS: 'nexus_guild_configs',
  ANALYTICS: 'nexus_analytics_data',
  WORKFLOWS: 'nexus_workflow_definitions',
  SESSIONS: 'nexus_active_sessions',
  AUDIT_LOGS: 'nexus_audit_trail'
};

// Performance Monitoring
const METRICS = {
  RESPONSE_TIME_THRESHOLD: 3000, // 3 seconds
  MEMORY_THRESHOLD: 512 * 1024 * 1024, // 512MB
  CPU_THRESHOLD: 80, // 80%
  ERROR_RATE_THRESHOLD: 0.05, // 5%
  UPTIME_TARGET: 0.999, // 99.9%
  SLA_RESPONSE_TIME: 300000, // 5 minutes
  SLA_RESOLUTION_TIME: 86400000 // 24 hours
};

// Custom Status Messages
const STATUS_MESSAGES = [
  `${EMOJIS.NEXUS} Ticketshi v${NEXUS_CONFIG.BUILD_VERSION}`,
  `${EMOJIS.SHIELD} Enterprise Support Active`,
  `${EMOJIS.LIGHTNING} Intelligent Automation`,
  `${EMOJIS.CHART} Advanced Analytics`,
  `${EMOJIS.TARGET} Precision Support`,
  `${EMOJIS.DIAMOND} Premium Experience`,
  `${EMOJIS.ROCKET} Next-Gen Support`
];

// Workflow States
const WORKFLOW_STATES = {
  INITIATED: 'WF_INITIATED',
  IN_PROGRESS: 'WF_IN_PROGRESS',
  PENDING_REVIEW: 'WF_PENDING_REVIEW',
  ESCALATED: 'WF_ESCALATED',
  RESOLVED: 'WF_RESOLVED',
  CLOSED: 'WF_CLOSED',
  ARCHIVED: 'WF_ARCHIVED'
};

// Priority Levels with Custom Names
const PRIORITY_LEVELS = {
  CRITICAL: { name: 'Critical', value: 4, emoji: '🔴', color: COLORS.ERROR },
  HIGH: { name: 'High', value: 3, emoji: '🟠', color: COLORS.WARNING },
  MEDIUM: { name: 'Medium', value: 2, emoji: '🟡', color: COLORS.INFO },
  LOW: { name: 'Low', value: 1, emoji: '🟢', color: COLORS.SUCCESS }
};

// Export all constants
module.exports = {
  NEXUS_CONFIG,
  PREFIXES,
  COLORS,
  EMOJIS,
  LIMITS,
  RESPONSES,
  FEATURES,
  COLLECTIONS,
  METRICS,
  STATUS_MESSAGES,
  WORKFLOW_STATES,
  PRIORITY_LEVELS
}; 