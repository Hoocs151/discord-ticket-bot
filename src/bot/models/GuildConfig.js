const mongoose = require('mongoose');

const ticketCategorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    default: ''
  },
  emoji: {
    type: String,
    default: '🎫'
  },
  color: {
    type: String,
    default: '#0099ff'
  },
  supportRoles: [{
    type: String
  }],
  autoAssign: {
    type: Boolean,
    default: false
  },
  assignTo: String, // Auto-assign to specific user
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  welcomeMessage: String,
  sla: {
    responseTime: { type: Number, default: 60 }, // minutes
    resolutionTime: { type: Number, default: 24 } // hours
  },
  isDefault: {
    type: Boolean,
    default: false
  },
  enabled: {
    type: Boolean,
    default: true
  }
});

const workflowSchema = new mongoose.Schema({
  name: String,
  steps: [{
    name: String,
    description: String,
    requiredRoles: [String],
    autoTransition: Boolean,
    nextStep: String
  }],
  enabled: { type: Boolean, default: true }
});

const notificationSettingsSchema = new mongoose.Schema({
  ticketCreated: {
    enabled: { type: Boolean, default: true },
    channels: [String],
    roles: [String],
    dmUsers: [String]
  },
  ticketClaimed: {
    enabled: { type: Boolean, default: true },
    notifyCreator: { type: Boolean, default: true }
  },
  ticketClosed: {
    enabled: { type: Boolean, default: true },
    notifyCreator: { type: Boolean, default: true }
  },
  slaBreached: {
    enabled: { type: Boolean, default: true },
    channels: [String],
    roles: [String]
  },
  dailyDigest: {
    enabled: { type: Boolean, default: false },
    channel: String,
    time: { type: String, default: '09:00' }
  },
  weeklyReport: {
    enabled: { type: Boolean, default: false },
    channel: String,
    day: { type: String, default: 'monday' }
  }
});

const customizationSchema = new mongoose.Schema({
  embedColors: {
    primary: { type: String, default: '#0099ff' },
    success: { type: String, default: '#00ff00' },
    warning: { type: String, default: '#ff9900' },
    error: { type: String, default: '#ff0000' }
  },
  buttonStyles: {
    primary: { type: String, default: 'Primary' },
    secondary: { type: String, default: 'Secondary' },
    success: { type: String, default: 'Success' },
    danger: { type: String, default: 'Danger' }
  },
  customEmojis: {
    ticket: { type: String, default: '🎫' },
    priority_low: { type: String, default: '🟢' },
    priority_medium: { type: String, default: '🟡' },
    priority_high: { type: String, default: '🟠' },
    priority_urgent: { type: String, default: '🔴' }
  }
});

const automationSchema = new mongoose.Schema({
  autoClose: {
    enabled: { type: Boolean, default: false },
    inactivityTime: { type: Number, default: 24 }, // hours
    warningTime: { type: Number, default: 1 }, // hours before closing
    excludePriorities: [{ type: String, enum: ['low', 'medium', 'high', 'urgent'] }]
  },
  autoAssignment: {
    enabled: { type: Boolean, default: false },
    method: { 
      type: String, 
      enum: ['round_robin', 'least_active', 'random', 'load_balanced'], 
      default: 'round_robin' 
    },
    excludeOffline: { type: Boolean, default: true }
  },
  autoEscalation: {
    enabled: { type: Boolean, default: false },
    responseTimeThreshold: { type: Number, default: 120 }, // minutes
    escalateTo: [String] // Role IDs
  },
  feedbackRequest: {
    enabled: { type: Boolean, default: true },
    delayAfterClose: { type: Number, default: 5 }, // minutes
    reminderAfter: { type: Number, default: 24 } // hours
  }
});

const guildConfigSchema = new mongoose.Schema({
  guildId: {
    type: String,
    required: true,
    unique: true
  },
  
  // Basic Configuration
  ticketCategory: {
    type: String,
    required: true
  },
  transcriptChannel: {
    type: String
  },
  supportRoles: [{
    type: String
  }],
  adminRoles: [{
    type: String
  }],
  
  // Welcome & Messages
  welcomeMessage: {
    type: String,
    default: 'Welcome to your ticket! Support staff will be with you shortly.'
  },
  closedMessage: {
    type: String,
    default: 'This ticket has been closed. Thank you for contacting support!'
  },
  
  // Ticket Categories
  ticketCategories: [ticketCategorySchema],
  
  // Workflow Configuration
  workflows: [workflowSchema],
  defaultWorkflow: String,
  
  // Basic Settings
  settings: {
    maxOpenTickets: {
      type: Number,
      default: 1
    },
    allowReopen: {
      type: Boolean,
      default: true
    },
    requireTopic: {
      type: Boolean,
      default: true
    },
    nameFormat: {
      type: String,
      default: 'ticket-{number}'
    },
    enablePriorities: {
      type: Boolean,
      default: true
    },
    enableCategories: {
      type: Boolean,
      default: true
    },
    enableWorkflows: {
      type: Boolean,
      default: false
    },
    enableSLA: {
      type: Boolean,
      default: false
    },
    enableFeedback: {
      type: Boolean,
      default: true
    },
    enableInternalNotes: {
      type: Boolean,
      default: true
    }
  },
  
  // Advanced Features
  notifications: notificationSettingsSchema,
  customization: customizationSchema,
  automation: automationSchema,
  
  // Permissions
  permissions: {
    canCreateTickets: [String], // Role IDs
    canClaimTickets: [String],
    canCloseTickets: [String],
    canDeleteTickets: [String],
    canViewAllTickets: [String],
    canManageTickets: [String],
    canViewAnalytics: [String]
  },
  
  // Business Hours & SLA
  businessHours: {
    enabled: { type: Boolean, default: false },
    timezone: { type: String, default: 'UTC' },
    schedule: {
      monday: { 
        start: { type: String, default: '09:00' }, 
        end: { type: String, default: '17:00' }, 
        enabled: { type: Boolean, default: true } 
      },
      tuesday: { 
        start: { type: String, default: '09:00' }, 
        end: { type: String, default: '17:00' }, 
        enabled: { type: Boolean, default: true } 
      },
      wednesday: { 
        start: { type: String, default: '09:00' }, 
        end: { type: String, default: '17:00' }, 
        enabled: { type: Boolean, default: true } 
      },
      thursday: { 
        start: { type: String, default: '09:00' }, 
        end: { type: String, default: '17:00' }, 
        enabled: { type: Boolean, default: true } 
      },
      friday: { 
        start: { type: String, default: '09:00' }, 
        end: { type: String, default: '17:00' }, 
        enabled: { type: Boolean, default: true } 
      },
      saturday: { 
        start: { type: String, default: '09:00' }, 
        end: { type: String, default: '17:00' }, 
        enabled: { type: Boolean, default: false } 
      },
      sunday: { 
        start: { type: String, default: '09:00' }, 
        end: { type: String, default: '17:00' }, 
        enabled: { type: Boolean, default: false } 
      }
    },
    holidays: [Date]
  },
  
  // Integration Settings
  integrations: {
    webhooks: {
      onTicketCreate: String,
      onTicketClose: String,
      onTicketEscalate: String,
      onSLABreach: String
    },
    analytics: {
      enabled: { type: Boolean, default: true },
      anonymizeUsers: { type: Boolean, default: false }
    }
  },
  
  // Metrics & Tracking
  ticketCounter: {
    type: Number,
    default: 0
  },
  lastReset: Date,
  
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Indexes
guildConfigSchema.index({ 'ticketCategories.name': 1 });

// Pre-save middleware
guildConfigSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  
  // Ensure at least one default category exists
  if (this.ticketCategories.length === 0) {
    this.ticketCategories.push({
      name: 'General',
      description: 'General support requests',
      emoji: '🎫',
      isDefault: true,
      supportRoles: this.supportRoles
    });
  }
  
  next();
});

// Instance methods
guildConfigSchema.methods.getDefaultCategory = function() {
  return this.ticketCategories.find(cat => cat.isDefault) || this.ticketCategories[0];
};

guildConfigSchema.methods.getCategoryByName = function(name) {
  return this.ticketCategories.find(cat => 
    cat.name.toLowerCase() === name.toLowerCase() && cat.enabled
  );
};

guildConfigSchema.methods.getAvailableCategories = function() {
  return this.ticketCategories.filter(cat => cat.enabled);
};

guildConfigSchema.methods.isBusinessHours = function(date = new Date()) {
  if (!this.businessHours.enabled) return true;
  
  const dayName = date.toLocaleDateString('en-US', { weekday: 'lowercase' });
  const schedule = this.businessHours.schedule[dayName];
  
  if (!schedule || !schedule.enabled) return false;
  
  const timeStr = date.toTimeString().slice(0, 5); // HH:MM format
  return timeStr >= schedule.start && timeStr <= schedule.end;
};

guildConfigSchema.methods.getNextAssignee = function() {
  // Implementation for auto-assignment logic
  // This would depend on the automation.autoAssignment.method
  return null; // Placeholder
};

// Static methods
guildConfigSchema.statics.getByGuild = function(guildId) {
  return this.findOne({ guildId });
};

guildConfigSchema.statics.createDefault = function(guildId, options = {}) {
  return new this({
    guildId,
    ticketCategory: options.categoryId,
    supportRoles: options.supportRoles || [],
    ...options
  });
};

module.exports = mongoose.model('GuildConfig', guildConfigSchema); 