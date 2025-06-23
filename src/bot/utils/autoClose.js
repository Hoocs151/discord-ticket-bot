const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const Ticket = require('../models/Ticket');
const GuildConfig = require('../models/GuildConfig');
const logger = require('./logger');

class AutoCloseManager {
  constructor(client) {
    this.client = client;
    this.interval = null;
  }

  start() {
    // Check every hour for inactive tickets
    this.interval = setInterval(() => {
      this.checkInactiveTickets();
    }, 60 * 60 * 1000); // 1 hour

    logger.info('Auto-close manager started');
  }

  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
      logger.info('Auto-close manager stopped');
    }
  }

  async checkInactiveTickets() {
    try {
      logger.debug('Checking for inactive tickets...');

      const guilds = await GuildConfig.find({ 
        'settings.autoClose.enabled': true 
      });

      for (const guildConfig of guilds) {
        await this.processGuildTickets(guildConfig);
      }
    } catch (error) {
      logger.error('Error in checkInactiveTickets:', error);
    }
  }

  async processGuildTickets(guildConfig) {
    try {
      const guild = await this.client.guilds.fetch(guildConfig.guildId);
      if (!guild) return;

      const inactivityTime = guildConfig.settings.autoClose.inactivityTime || 24; // hours
      const cutoffTime = new Date();
      cutoffTime.setHours(cutoffTime.getHours() - inactivityTime);

      // Find open tickets that haven't been active
      const inactiveTickets = await Ticket.find({
        guildId: guildConfig.guildId,
        status: 'OPEN',
        lastActivity: { $lt: cutoffTime }
      });

      logger.debug(`Found ${inactiveTickets.length} inactive tickets in guild ${guild.name}`);

      for (const ticket of inactiveTickets) {
        await this.autoCloseTicket(guild, ticket, inactivityTime);
      }
    } catch (error) {
      logger.error(`Error processing tickets for guild ${guildConfig.guildId}:`, error);
    }
  }

  async autoCloseTicket(guild, ticket, inactivityHours) {
    try {
      const channel = await guild.channels.fetch(ticket.channelId).catch(() => null);
      if (!channel) {
        // Channel doesn't exist, mark ticket as deleted
        ticket.status = 'DELETED';
        await ticket.save();
        return;
      }

      // Send warning message first
      await this.sendInactivityWarning(channel, ticket, inactivityHours);

      // Wait 1 hour before actually closing
      setTimeout(async () => {
        try {
          await this.performAutoClose(guild, ticket, channel);
        } catch (error) {
          logger.error(`Error performing auto-close for ticket ${ticket.ticketId}:`, error);
        }
      }, 60 * 60 * 1000); // 1 hour delay

    } catch (error) {
      logger.error(`Error auto-closing ticket ${ticket.ticketId}:`, error);
    }
  }

  async sendInactivityWarning(channel, ticket, inactivityHours) {
    const warningEmbed = new EmbedBuilder()
      .setColor('#ff9900')
      .setTitle('⚠️ Ticket Inactivity Warning')
      .setDescription(`This ticket has been inactive for **${inactivityHours} hours** and will be automatically closed in **1 hour** if there's no activity.`)
      .addFields(
        { name: 'Ticket ID', value: ticket.ticketId, inline: true },
        { name: 'Creator', value: `<@${ticket.creatorId}>`, inline: true },
        { name: 'Last Activity', value: new Date(ticket.lastActivity).toLocaleString(), inline: true }
      )
      .setFooter({ text: 'Send a message to prevent auto-close' })
      .setTimestamp();

    try {
      await channel.send({
        content: `<@${ticket.creatorId}>`,
        embeds: [warningEmbed]
      });

      logger.info(`Sent inactivity warning for ticket ${ticket.ticketId}`);
    } catch (error) {
      logger.error(`Error sending inactivity warning for ticket ${ticket.ticketId}:`, error);
    }
  }

  async performAutoClose(guild, ticket, channel) {
    try {
      // Check if ticket is still inactive (no new messages in the last hour)
      const oneHourAgo = new Date();
      oneHourAgo.setHours(oneHourAgo.getHours() - 1);

      const recentMessages = await channel.messages.fetch({ 
        limit: 10,
        after: oneHourAgo.getTime().toString()
      }).catch(() => null);

      // If there are recent messages (excluding bot messages), don't auto-close
      if (recentMessages && recentMessages.some(msg => !msg.author.bot)) {
        logger.info(`Ticket ${ticket.ticketId} had recent activity, skipping auto-close`);
        // Update last activity
        ticket.lastActivity = new Date();
        await ticket.save();
        return;
      }

      // Proceed with auto-close
      ticket.status = 'CLOSED';
      ticket.closedAt = new Date();
      ticket.closedBy = 'AUTO_CLOSE';
      await ticket.save();

      // Create transcript
      const messages = await channel.messages.fetch({ limit: 100 }).catch(() => new Map());
      const transcript = Array.from(messages.values())
        .reverse()
        .map(m => `[${m.createdAt.toISOString()}] ${m.author.tag}: ${m.content}`)
        .join('\n');

      ticket.transcript = transcript;
      await ticket.save();

      // Send transcript to log channel
      const guildConfig = await GuildConfig.findOne({ guildId: guild.id });
      if (guildConfig?.transcriptChannel) {
        await this.sendTranscriptToLogChannel(guild, guildConfig, ticket, transcript);
      }

      // Update channel permissions
      await channel.permissionOverwrites.edit(ticket.creatorId, {
        ViewChannel: false,
        SendMessages: false
      }).catch(() => {});

      // Send auto-close message
      const autoCloseEmbed = new EmbedBuilder()
        .setColor('#ff9900')
        .setTitle('🕐 Ticket Auto-Closed')
        .setDescription('This ticket has been automatically closed due to inactivity.')
        .addFields(
          { name: 'Ticket ID', value: ticket.ticketId, inline: true },
          { name: 'Closed At', value: new Date().toLocaleString(), inline: true },
          { name: 'Reason', value: 'Inactivity timeout', inline: true }
        )
        .setTimestamp();

      const buttons = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId('reopen-ticket')
            .setLabel('Reopen Ticket')
            .setStyle(ButtonStyle.Success),
          new ButtonBuilder()
            .setCustomId('delete-ticket')
            .setLabel('Delete Ticket')
            .setStyle(ButtonStyle.Danger)
        );

      await channel.send({
        embeds: [autoCloseEmbed],
        components: [buttons]
      });

      logger.info(`Auto-closed ticket ${ticket.ticketId} due to inactivity`);

    } catch (error) {
      logger.error(`Error performing auto-close for ticket ${ticket.ticketId}:`, error);
    }
  }

  async sendTranscriptToLogChannel(guild, guildConfig, ticket, transcript) {
    try {
      const transcriptChannel = await guild.channels.fetch(guildConfig.transcriptChannel);
      if (!transcriptChannel) return;

      const transcriptEmbed = new EmbedBuilder()
        .setColor('#ff9900')
        .setTitle(`📋 Auto-Closed Ticket - ${ticket.ticketId}`)
        .setDescription('Ticket automatically closed due to inactivity')
        .addFields(
          { name: 'Creator', value: `<@${ticket.creatorId}>`, inline: true },
          { name: 'Subject', value: ticket.subject, inline: true },
          { name: 'Category', value: ticket.category || 'General', inline: true },
          { name: 'Created At', value: new Date(ticket.createdAt).toLocaleString(), inline: true },
          { name: 'Closed At', value: new Date(ticket.closedAt).toLocaleString(), inline: true },
          { name: 'Closure Reason', value: 'Auto-close (inactivity)', inline: true }
        );

      await transcriptChannel.send({
        embeds: [transcriptEmbed],
        files: [{
          name: `transcript-${ticket.ticketId}-autoclose.txt`,
          attachment: Buffer.from(transcript)
        }]
      });
    } catch (error) {
      logger.error('Error sending auto-close transcript:', error);
    }
  }
}

module.exports = AutoCloseManager; 