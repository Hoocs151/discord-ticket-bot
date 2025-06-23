const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  authorId: String,
  content: String,
  timestamp: { type: Date, default: Date.now },
  attachments: [String],
  edited: { type: Boolean, default: false },
  editedAt: Date
});

const workflowStepSchema = new mongoose.Schema({
  name: { type: String, required: true },
  completedAt: Date,
  completedBy: String,
  notes: String
});

const slaSchema = new mongoose.Schema({
  responseTime: { type: Number, default: 60 }, // minutes
  resolutionTime: { type: Number, default: 24 }, // hours
  firstResponseAt: Date,
  breached: { type: Boolean, default: false },
  breachReason: String
});

const ticketSchema = new mongoose.Schema({
  ticketId: {
    type: String,
    required: true,
    unique: true
  },
  guildId: {
    type: String,
    required: true
  },
  channelId: {
    type: String,
    required: true
  },
  creatorId: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['OPEN', 'CLOSED', 'DELETED'],
    default: 'OPEN'
  },
  subject: {
    type: String,
    required: true
  },
  description: {
    type: String,
    default: ''
  },
  category: {
    type: String,
    default: 'General'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  tags: [{
    type: String,
    lowercase: true,
    trim: true
  }],
  customFields: [{
    name: String,
    value: String,
    type: { type: String, enum: ['text', 'number', 'boolean', 'date'] }
  }],
  // Workflow Management
  workflowStep: {
    type: String,
    enum: ['new', 'assigned', 'in_progress', 'waiting_customer', 'resolved', 'closed'],
    default: 'new'
  },
  workflowHistory: [workflowStepSchema],
  
  // SLA Management
  sla: slaSchema,
  
  // Assignment & Ownership
  assignedTo: String, // Different from claimedBy - formal assignment
  assignedAt: Date,
  claimedBy: String,
  claimedAt: Date,
  
  // Resolution & Closure
  resolvedAt: Date,
  resolvedBy: String,
  resolutionNotes: String,
  closedAt: Date,
  closedBy: String,
  closeReason: {
    type: String,
    enum: ['resolved', 'duplicate', 'invalid', 'spam', 'user_request', 'auto_close'],
    default: 'resolved'
  },
  
  // Transcript & Communication
  transcript: String,
  participants: [{
    type: String
  }],
  messages: [messageSchema],
  
  // Feedback & Rating
  feedback: {
    rating: { type: Number, min: 1, max: 5 },
    comment: String,
    submittedAt: Date
  },
  
  // Activity Tracking
  createdAt: {
    type: Date,
    default: Date.now
  },
  lastActivity: {
    type: Date,
    default: Date.now
  },
  escalatedAt: Date,
  escalatedBy: String,
  escalationReason: String,
  
  // Internal Notes (visible to staff only)
  internalNotes: [{
    authorId: String,
    content: String,
    timestamp: { type: Date, default: Date.now }
  }],
  
  // Metrics
  metrics: {
    firstResponseTime: Number, // milliseconds
    resolutionTime: Number, // milliseconds
    reopenCount: { type: Number, default: 0 },
    messageCount: { type: Number, default: 0 },
    handoffCount: { type: Number, default: 0 }
  }
});

// Indexes for performance
ticketSchema.index({ guildId: 1, status: 1 });
ticketSchema.index({ creatorId: 1, status: 1 });
ticketSchema.index({ assignedTo: 1, status: 1 });
ticketSchema.index({ lastActivity: 1 });
ticketSchema.index({ priority: 1, status: 1 });
ticketSchema.index({ category: 1 });
ticketSchema.index({ workflowStep: 1, status: 1 });
ticketSchema.index({ createdAt: 1 });

// Virtual for age calculation
ticketSchema.virtual('age').get(function() {
  return Date.now() - this.createdAt.getTime();
});

// Virtual for time since last activity
ticketSchema.virtual('timeSinceLastActivity').get(function() {
  return Date.now() - this.lastActivity.getTime();
});

// Pre-save middleware
ticketSchema.pre('save', function(next) {
  // Update last activity on any change
  this.lastActivity = new Date();
  
  // Calculate metrics
  if (this.isModified('status') && this.status === 'CLOSED') {
    if (this.createdAt && this.closedAt) {
      this.metrics.resolutionTime = this.closedAt.getTime() - this.createdAt.getTime();
    }
  }
  
  // Add workflow history entry if step changed
  if (this.isModified('workflowStep') && !this.isNew) {
    this.workflowHistory.push({
      name: this.workflowStep,
      completedAt: new Date(),
      completedBy: this.modifiedBy || 'system'
    });
  }
  
  next();
});

// Instance methods
ticketSchema.methods.addMessage = function(authorId, content, attachments = []) {
  this.messages.push({
    authorId,
    content,
    attachments,
    timestamp: new Date()
  });
  this.metrics.messageCount = this.messages.length;
  this.lastActivity = new Date();
};

ticketSchema.methods.addInternalNote = function(authorId, content) {
  this.internalNotes.push({
    authorId,
    content,
    timestamp: new Date()
  });
};

ticketSchema.methods.escalate = function(escalatedBy, reason) {
  this.escalatedAt = new Date();
  this.escalatedBy = escalatedBy;
  this.escalationReason = reason;
  this.priority = 'urgent';
  this.workflowStep = 'escalated';
};

ticketSchema.methods.calculateSLA = function(guildConfig) {
  const now = Date.now();
  const created = this.createdAt.getTime();
  
  // Check response time SLA
  if (!this.sla.firstResponseAt && this.messages.length > 1) {
    this.sla.firstResponseAt = this.messages[1].timestamp;
    this.metrics.firstResponseTime = this.sla.firstResponseAt.getTime() - created;
  }
  
  // Check if SLA is breached
  const responseTimeLimit = (this.sla.responseTime || 60) * 60 * 1000; // Convert to ms
  const resolutionTimeLimit = (this.sla.resolutionTime || 24) * 60 * 60 * 1000; // Convert to ms
  
  if (!this.sla.firstResponseAt && (now - created) > responseTimeLimit) {
    this.sla.breached = true;
    this.sla.breachReason = 'Response time exceeded';
  }
  
  if (this.status === 'OPEN' && (now - created) > resolutionTimeLimit) {
    this.sla.breached = true;
    this.sla.breachReason = 'Resolution time exceeded';
  }
};

// Static methods
ticketSchema.statics.getTicketsByPriority = function(guildId, priority) {
  return this.find({ guildId, priority, status: 'OPEN' }).sort({ createdAt: 1 });
};

ticketSchema.statics.getOverdueSLA = function(guildId) {
  return this.find({
    guildId,
    status: 'OPEN',
    'sla.breached': true
  }).sort({ createdAt: 1 });
};

ticketSchema.statics.getMetrics = function(guildId, timeframe = 30) {
  const since = new Date();
  since.setDate(since.getDate() - timeframe);
  
  return this.aggregate([
    { $match: { guildId, createdAt: { $gte: since } } },
    {
      $group: {
        _id: '$priority',
        count: { $sum: 1 },
        avgResolutionTime: { $avg: '$metrics.resolutionTime' },
        avgFirstResponseTime: { $avg: '$metrics.firstResponseTime' }
      }
    }
  ]);
};

module.exports = mongoose.model('Ticket', ticketSchema); 