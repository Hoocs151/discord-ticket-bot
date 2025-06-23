/**
 * Ticketshi Response Builder
 * Advanced message and embed generation system
 * SNX-2024-ENTERPRISE
 */

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { COLORS, EMOJIS, NEXUS_CONFIG, RESPONSES } = require('./constants');
const idGenerator = require('./idGenerator');

class NexusResponseBuilder {
  constructor() {
    this.defaultFooter = `Ticketshi ${NEXUS_CONFIG.BUILD_VERSION} • ${NEXUS_CONFIG.SIGNATURE}`;
    this.brandColor = COLORS.NEXUS_BRAND;
  }

  /**
   * Create branded success embed
   */
  createSuccessEmbed(title, description, additionalFields = []) {
    const embed = new EmbedBuilder()
      .setColor(COLORS.SUCCESS)
      .setTitle(`${EMOJIS.SUCCESS} ${title}`)
      .setDescription(description)
      .setTimestamp()
      .setFooter({ 
        text: this.defaultFooter,
        iconURL: 'https://cdn.discordapp.com/emojis/1234567890.png' // Replace with actual icon
      });

    if (additionalFields.length > 0) {
      embed.addFields(additionalFields);
    }

    return embed;
  }

  /**
   * Create branded error embed
   */
  createErrorEmbed(title, description, errorCode = null) {
    const embed = new EmbedBuilder()
      .setColor(COLORS.ERROR)
      .setTitle(`${EMOJIS.ERROR} ${title}`)
      .setDescription(description)
      .setTimestamp()
      .setFooter({ text: this.defaultFooter });

    if (errorCode) {
      embed.addFields({
        name: 'Error Reference',
        value: `\`${errorCode}\``,
        inline: true
      });
    }

    return embed;
  }

  /**
   * Create branded warning embed
   */
  createWarningEmbed(title, description, actionRequired = false) {
    const embed = new EmbedBuilder()
      .setColor(COLORS.WARNING)
      .setTitle(`${EMOJIS.WARNING} ${title}`)
      .setDescription(description)
      .setTimestamp()
      .setFooter({ text: this.defaultFooter });

    if (actionRequired) {
      embed.addFields({
        name: 'Action Required',
        value: '⚠️ This requires immediate attention',
        inline: false
      });
    }

    return embed;
  }

  /**
   * Create branded info embed
   */
  createInfoEmbed(title, description, additionalInfo = null) {
    const embed = new EmbedBuilder()
      .setColor(COLORS.INFO)
      .setTitle(`${EMOJIS.NEXUS} ${title}`)
      .setDescription(description)
      .setTimestamp()
      .setFooter({ text: this.defaultFooter });

    if (additionalInfo) {
      embed.addFields({
        name: 'Additional Information',
        value: additionalInfo,
        inline: false
      });
    }

    return embed;
  }

  /**
   * Create advanced ticket embed
   */
  createTicketEmbed(ticket, includeActions = true) {
    const priorityEmojis = {
      'CRITICAL': '🔴',
      'HIGH': '🟠', 
      'MEDIUM': '🟡',
      'LOW': '🟢'
    };

    const statusEmojis = {
      'OPEN': '🟢',
      'CLOSED': '🔴',
      'PENDING': '🟡'
    };

    const embed = new EmbedBuilder()
      .setColor(this.getPriorityColor(ticket.priority))
      .setTitle(`${EMOJIS.DIAMOND} Support Case ${ticket.ticketId}`)
      .addFields(
        {
          name: '📋 Subject',
          value: ticket.subject || 'No subject provided',
          inline: false
        },
        {
          name: '📊 Priority',
          value: `${priorityEmojis[ticket.priority]} ${ticket.priority}`,
          inline: true
        },
        {
          name: '🔄 Status',
          value: `${statusEmojis[ticket.status]} ${ticket.status}`,
          inline: true
        },
        {
          name: '🕐 Created',
          value: `<t:${Math.floor(ticket.createdAt.getTime() / 1000)}:R>`,
          inline: true
        }
      )
      .setTimestamp()
      .setFooter({ text: `${this.defaultFooter} • Case ID: ${ticket._id.toString().substring(0, 8)}` });

    if (ticket.claimedBy) {
      embed.addFields({
        name: '👤 Assigned Agent',
        value: `<@${ticket.claimedBy}>`,
        inline: true
      });
    }

    if (ticket.lastActivity) {
      embed.addFields({
        name: '⏰ Last Activity',
        value: `<t:${Math.floor(ticket.lastActivity.getTime() / 1000)}:R>`,
        inline: true
      });
    }

    return embed;
  }

  /**
   * Create analytics dashboard embed
   */
  createAnalyticsDashboard(guildId, stats) {
    const embed = new EmbedBuilder()
      .setColor(COLORS.ACCENT)
      .setTitle(`${EMOJIS.CHART} Ticketshi Analytics Dashboard`)
      .setDescription('Enterprise-grade support metrics and insights')
      .addFields(
        {
          name: '📊 Volume Metrics',
          value: [
            `Total Cases: **${stats.totalTickets || 0}**`,
            `Active Cases: **${stats.openTickets || 0}**`,
            `Resolved Today: **${stats.closedToday || 0}**`,
            `Resolution Rate: **${stats.resolutionRate || 0}%**`
          ].join('\n'),
          inline: true
        },
        {
          name: '⚡ Performance Metrics',
          value: [
            `Avg Response: **${stats.avgResponseTime || 'N/A'}**`,
            `Avg Resolution: **${stats.avgResolutionTime || 'N/A'}**`,
            `SLA Compliance: **${stats.slaCompliance || 0}%**`,
            `Customer Satisfaction: **${stats.satisfaction || 'N/A'}**`
          ].join('\n'),
          inline: true
        },
        {
          name: '🎯 Quality Metrics',
          value: [
            `First Contact Resolution: **${stats.fcrRate || 0}%**`,
            `Escalation Rate: **${stats.escalationRate || 0}%**`,
            `Reopen Rate: **${stats.reopenRate || 0}%**`,
            `Agent Utilization: **${stats.agentUtilization || 0}%**`
          ].join('\n'),
          inline: false
        }
      )
      .setTimestamp()
      .setFooter({ 
        text: `${this.defaultFooter} • Analytics ID: ${idGenerator.generateAnalyticsId('DASHBOARD', guildId)}` 
      });

    return embed;
  }

  /**
   * Create confirmation dialog with custom buttons
   */
  createConfirmationDialog(title, description, confirmText = 'Confirm', cancelText = 'Cancel') {
    const embed = this.createWarningEmbed(title, description, true);
    
    const confirmButton = new ButtonBuilder()
      .setCustomId(`confirm-${Date.now()}`)
      .setLabel(confirmText)
      .setStyle(ButtonStyle.Danger)
      .setEmoji(EMOJIS.SUCCESS);

    const cancelButton = new ButtonBuilder()
      .setCustomId(`cancel-${Date.now()}`)
      .setLabel(cancelText)
      .setStyle(ButtonStyle.Secondary)
      .setEmoji(EMOJIS.ERROR);

    const row = new ActionRowBuilder()
      .addComponents(confirmButton, cancelButton);

    return { embed, components: [row] };
  }

  /**
   * Create system status embed
   */
  createSystemStatusEmbed(systemMetrics) {
    const statusEmoji = systemMetrics.status === 'healthy' ? EMOJIS.SUCCESS : 
                       systemMetrics.status === 'degraded' ? EMOJIS.WARNING : EMOJIS.ERROR;

    const embed = new EmbedBuilder()
      .setColor(systemMetrics.status === 'healthy' ? COLORS.SUCCESS : 
               systemMetrics.status === 'degraded' ? COLORS.WARNING : COLORS.ERROR)
      .setTitle(`${statusEmoji} Ticketshi System Status`)
      .setDescription(`System is currently **${systemMetrics.status}**`)
      .addFields(
        {
          name: '🖥️ System Health',
          value: [
            `CPU Usage: **${systemMetrics.cpu}%**`,
            `Memory Usage: **${systemMetrics.memory}%**`,
            `Uptime: **${systemMetrics.uptime}**`,
            `Response Time: **${systemMetrics.responseTime}ms**`
          ].join('\n'),
          inline: true
        },
        {
          name: '📊 Service Metrics',
          value: [
            `Active Sessions: **${systemMetrics.activeSessions}**`,
            `Requests/min: **${systemMetrics.requestsPerMinute}**`,
            `Error Rate: **${systemMetrics.errorRate}%**`,
            `Cache Hit Rate: **${systemMetrics.cacheHitRate}%**`
          ].join('\n'),
          inline: true
        }
      )
      .setTimestamp()
      .setFooter({ text: `${this.defaultFooter} • Node: ${systemMetrics.nodeId}` });

    return embed;
  }

  /**
   * Create notification embed
   */
  createNotificationEmbed(type, title, message, urgency = 'normal') {
    const urgencyColors = {
      'low': COLORS.INFO,
      'normal': COLORS.PRIMARY,
      'high': COLORS.WARNING,
      'critical': COLORS.ERROR
    };

    const urgencyEmojis = {
      'low': EMOJIS.NEXUS,
      'normal': EMOJIS.NEXUS,
      'high': EMOJIS.WARNING,
      'critical': EMOJIS.ERROR
    };

    const embed = new EmbedBuilder()
      .setColor(urgencyColors[urgency])
      .setTitle(`${urgencyEmojis[urgency]} ${title}`)
      .setDescription(message)
      .addFields({
        name: 'Notification Type',
        value: type,
        inline: true
      })
      .setTimestamp()
      .setFooter({ 
        text: `${this.defaultFooter} • ID: ${idGenerator.generateNotificationId(type, 'system')}` 
      });

    return embed;
  }

  /**
   * Get priority color
   */
  getPriorityColor(priority) {
    const priorityColors = {
      'CRITICAL': COLORS.ERROR,
      'HIGH': COLORS.WARNING,
      'MEDIUM': COLORS.INFO,
      'LOW': COLORS.SUCCESS
    };
    return priorityColors[priority] || COLORS.PRIMARY;
  }

  /**
   * Format time duration
   */
  formatDuration(milliseconds) {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  }

  /**
   * Create quick action buttons
   */
  createQuickActions(actions) {
    const buttons = actions.map(action => {
      return new ButtonBuilder()
        .setCustomId(action.id)
        .setLabel(action.label)
        .setStyle(action.style || ButtonStyle.Primary)
        .setEmoji(action.emoji || EMOJIS.NEXUS);
    });

    const rows = [];
    for (let i = 0; i < buttons.length; i += 5) {
      rows.push(new ActionRowBuilder().addComponents(buttons.slice(i, i + 5)));
    }

    return rows;
  }

  /**
   * Create branded loading message
   */
  createLoadingMessage(operation = 'Processing request') {
    return {
      content: `${EMOJIS.PROCESSING} **Ticketshi** • ${operation}...`,
      ephemeral: true
    };
  }

  /**
   * Create rate limit message
   */
  createRateLimitMessage(resetTime) {
    return {
      embeds: [this.createWarningEmbed(
        'Rate Limit Exceeded',
        `${RESPONSES.RATE_LIMITED}\n\nTry again <t:${Math.floor(resetTime / 1000)}:R>`
      )],
      ephemeral: true
    };
  }
}

// Export singleton instance
module.exports = new NexusResponseBuilder(); 
