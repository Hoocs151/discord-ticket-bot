const { EmbedBuilder } = require('discord.js');
const logger = require('./logger');

class NotificationManager {
  constructor(client) {
    this.client = client;
  }

  async sendTicketNotification(type, ticketData, options = {}) {
    const notifications = {
      'ticket_created': {
        title: '🎫 New Ticket Created',
        color: '#00ff00',
        description: `Ticket **${ticketData.ticketId}** has been created.`
      },
      'ticket_claimed': {
        title: '👤 Ticket Claimed',
        color: '#0099ff',
        description: `Ticket **${ticketData.ticketId}** has been claimed.`
      },
      'ticket_closed': {
        title: '🔒 Ticket Closed',
        color: '#ff9900',
        description: `Ticket **${ticketData.ticketId}** has been closed.`
      },
      'ticket_reopened': {
        title: '🔓 Ticket Reopened',
        color: '#00ff00',
        description: `Ticket **${ticketData.ticketId}** has been reopened.`
      },
      'auto_close_warning': {
        title: '⚠️ Auto-Close Warning',
        color: '#ff9900',
        description: `Ticket **${ticketData.ticketId}** will be auto-closed soon due to inactivity.`
      }
    };

    const notification = notifications[type];
    if (!notification) return;

    const embed = new EmbedBuilder()
      .setColor(notification.color)
      .setTitle(notification.title)
      .setDescription(notification.description)
      .addFields(
        { name: 'Ticket ID', value: ticketData.ticketId, inline: true },
        { name: 'Subject', value: ticketData.subject, inline: true },
        { name: 'Channel', value: `<#${ticketData.channelId}>`, inline: true }
      )
      .setTimestamp();

    // Send DM to ticket creator
    if (options.notifyCreator) {
      await this.sendDM(ticketData.creatorId, { embeds: [embed] });
    }

    // Send to support roles
    if (options.notifySupport && options.guildConfig) {
      await this.notifySupportRoles(ticketData.guildId, options.guildConfig.supportRoles, { embeds: [embed] });
    }

    // Send to log channel
    if (options.logChannel) {
      await this.sendToChannel(options.logChannel, { embeds: [embed] });
    }
  }

  async sendDM(userId, content) {
    try {
      const user = await this.client.users.fetch(userId);
      await user.send(content);
      logger.debug(`Sent DM notification to user ${userId}`);
    } catch (error) {
      logger.warn(`Failed to send DM to user ${userId}:`, error.message);
    }
  }

  async notifySupportRoles(guildId, roleIds, content) {
    try {
      const guild = await this.client.guilds.fetch(guildId);
      const members = new Set();

      for (const roleId of roleIds) {
        const role = guild.roles.cache.get(roleId);
        if (role) {
          role.members.forEach(member => members.add(member));
        }
      }

      for (const member of members) {
        await this.sendDM(member.id, content);
      }

      logger.debug(`Notified ${members.size} support staff members`);
    } catch (error) {
      logger.error('Failed to notify support roles:', error);
    }
  }

  async sendToChannel(channelId, content) {
    try {
      const channel = await this.client.channels.fetch(channelId);
      if (channel) {
        await channel.send(content);
        logger.debug(`Sent notification to channel ${channelId}`);
      }
    } catch (error) {
      logger.warn(`Failed to send to channel ${channelId}:`, error.message);
    }
  }

  // Weekly digest for admins
  async sendWeeklyDigest(guildId, adminChannelId) {
    try {
      const Ticket = require('../models/Ticket');
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);

      const weeklyStats = await Ticket.aggregate([
        { $match: { guildId: guildId, createdAt: { $gte: weekAgo } } },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            avgResolutionTime: {
              $avg: {
                $cond: [
                  { $eq: ['$status', 'CLOSED'] },
                  { $subtract: ['$closedAt', '$createdAt'] },
                  null
                ]
              }
            }
          }
        }
      ]);

      const embed = new EmbedBuilder()
        .setColor('#0099ff')
        .setTitle('📊 Weekly Ticket Digest')
        .setDescription('Summary of ticket activity for the past week')
        .setTimestamp();

      weeklyStats.forEach(stat => {
        const avgTime = stat.avgResolutionTime 
          ? `${Math.round(stat.avgResolutionTime / (1000 * 60 * 60))}h`
          : 'N/A';
        embed.addFields({
          name: `${stat._id} Tickets`,
          value: `Count: ${stat.count}\nAvg Resolution: ${avgTime}`,
          inline: true
        });
      });

      await this.sendToChannel(adminChannelId, { embeds: [embed] });
    } catch (error) {
      logger.error('Failed to send weekly digest:', error);
    }
  }
}

module.exports = NotificationManager; 