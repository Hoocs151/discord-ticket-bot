const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const Ticket = require('../models/Ticket');
const GuildConfig = require('../models/GuildConfig');
const ValidationUtils = require('../utils/validation');
const NotificationManager = require('../utils/notifications');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ticket')
    .setDescription('Create or manage a ticket')
    .setDefaultMemberPermissions(PermissionFlagsBits.SendMessages)
    .addSubcommand(subcommand =>
      subcommand
        .setName('create')
        .setDescription('Create a new ticket')
        .addStringOption(option =>
          option
            .setName('subject')
            .setDescription('What is this ticket about?')
            .setRequired(true))
        .addStringOption(option =>
          option
            .setName('category')
            .setDescription('Select ticket category')
            .setRequired(false)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('close')
        .setDescription('Close the current ticket'))
    .addSubcommand(subcommand =>
      subcommand
        .setName('reopen')
        .setDescription('Reopen a closed ticket'))
    .addSubcommand(subcommand =>
      subcommand
        .setName('delete')
        .setDescription('Permanently delete a ticket'))
    .addSubcommand(subcommand =>
      subcommand
        .setName('claim')
        .setDescription('Claim the current ticket'))
    .addSubcommand(subcommand =>
      subcommand
        .setName('list')
        .setDescription('List your tickets')
        .addStringOption(option =>
          option
            .setName('status')
            .setDescription('Filter by status')
            .setRequired(false)
            .addChoices(
              { name: 'Open', value: 'OPEN' },
              { name: 'Closed', value: 'CLOSED' },
              { name: 'All', value: 'ALL' }
            )))
    .addSubcommand(subcommand =>
      subcommand
        .setName('info')
        .setDescription('Show information about current ticket')),

  async execute(interaction) {
    // Rate limiting check
    const rateLimitCheck = await ValidationUtils.rateLimitCheck(
      interaction.user.id, 
      'ticket_command', 
      60000, 
      10
    );
    
    if (!rateLimitCheck.allowed) {
      return interaction.reply({
        content: '⚠️ You are doing that too often. Please wait a moment.',
        ephemeral: true
      });
    }

    // Check permissions for delete command
    if (interaction.options.getSubcommand() === 'delete') {
      if (!interaction.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
        return interaction.reply({
          content: 'You do not have permission to delete tickets.',
          ephemeral: true
        });
      }
    }

    const subcommand = interaction.options.getSubcommand();
    const guildConfig = await GuildConfig.findOne({ guildId: interaction.guildId });

    if (!guildConfig && !['list', 'info'].includes(subcommand)) {
      return interaction.reply({
        content: 'This server has not been set up for tickets yet. Please use `/ticket-setup` first.',
        ephemeral: true
      });
    }

    // Initialize notification manager
    const notificationManager = new NotificationManager(interaction.client);

    switch (subcommand) {
      case 'create':
        return await handleCreate(interaction, guildConfig, notificationManager);
      case 'close':
        return await handleClose(interaction, notificationManager);
      case 'reopen':
        return await handleReopen(interaction, notificationManager);
      case 'delete':
        return await handleDelete(interaction);
      case 'claim':
        return await handleClaim(interaction, notificationManager);
      case 'list':
        return await handleList(interaction);
      case 'info':
        return await handleInfo(interaction);
    }
  }
};

async function handleCreate(interaction, guildConfig, notificationManager) {
  const subject = interaction.options.getString('subject');
  const category = interaction.options.getString('category') || 'General';

  // Validate subject
  const validation = ValidationUtils.validateTicketSubject(subject);
  if (!validation.valid) {
    const errorEmbed = ValidationUtils.createErrorEmbed('Invalid Subject', validation.errors);
    return interaction.reply({ embeds: [errorEmbed], ephemeral: true });
  }

  // Sanitize input
  const sanitizedSubject = ValidationUtils.sanitizeText(subject, 100);
  const sanitizedCategory = ValidationUtils.sanitizeText(category, 50);

  // Check if user has too many open tickets
  const openTickets = await Ticket.find({
    guildId: interaction.guildId,
    creatorId: interaction.user.id,
    status: 'OPEN'
  });

  if (openTickets.length >= guildConfig.settings.maxOpenTickets) {
    return interaction.reply({
      content: `You already have ${openTickets.length} open ticket(s). Please close them before creating a new one.`,
      ephemeral: true
    });
  }

  // Create ticket channel
  const ticketNumber = guildConfig.ticketCounter + 1;
  const channelName = guildConfig.settings.nameFormat.replace('{number}', ticketNumber);

  try {
    const channel = await interaction.guild.channels.create({
      name: channelName,
      type: 0, // Text channel
      parent: guildConfig.ticketCategory,
      permissionOverwrites: [
        {
          id: interaction.guild.id,
          deny: [PermissionFlagsBits.ViewChannel]
        },
        {
          id: interaction.user.id,
          allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages]
        },
        ...guildConfig.supportRoles.map(roleId => ({
          id: roleId,
          allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages]
        }))
      ]
    });

    // Create ticket in database
    const ticket = new Ticket({
      ticketId: `TICKET-${ticketNumber}`,
      guildId: interaction.guildId,
      channelId: channel.id,
      creatorId: interaction.user.id,
      subject: sanitizedSubject,
      category: sanitizedCategory,
      priority: 'medium', // Default priority
      workflowStep: 'new' // Initial workflow step
    });
    await ticket.save();

    // Update ticket counter
    await GuildConfig.updateOne(
      { guildId: interaction.guildId },
      { $inc: { ticketCounter: 1 } }
    );

    // Send welcome message
    const welcomeEmbed = new EmbedBuilder()
      .setColor('#0099ff')
      .setTitle(`🎫 Ticket #${ticketNumber}`)
      .setDescription(guildConfig.welcomeMessage)
      .addFields(
        { name: '📝 Subject', value: sanitizedSubject },
        { name: '📂 Category', value: sanitizedCategory },
        { name: '👤 Created by', value: `<@${interaction.user.id}>` },
        { name: '📊 Priority', value: '🟡 Medium', inline: true },
        { name: '🔄 Status', value: '🆕 New', inline: true }
      )
      .setTimestamp();

    const buttons = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('close-ticket')
          .setLabel('Close Ticket')
          .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
          .setCustomId('claim-ticket')
          .setLabel('Claim Ticket')
          .setStyle(ButtonStyle.Primary)
      );

    await channel.send({
      content: `<@${interaction.user.id}> Welcome to your ticket!`,
      embeds: [welcomeEmbed],
      components: [buttons]
    });

    // Send notifications
    await notificationManager.sendTicketNotification('ticket_created', ticket, {
      notifySupport: true,
      guildConfig: guildConfig,
      logChannel: guildConfig.transcriptChannel
    });

    return interaction.reply({
      content: `✅ Your ticket has been created in ${channel}`,
      ephemeral: true
    });
  } catch (error) {
    console.error(error);
    return interaction.reply({
      content: 'There was an error creating your ticket. Please try again later.',
      ephemeral: true
    });
  }
}

async function handleClose(interaction, notificationManager) {
  const ticket = await Ticket.findOne({
    channelId: interaction.channelId,
    status: 'OPEN'
  });

  if (!ticket) {
    return interaction.reply({
      content: 'This is not an open ticket channel.',
      ephemeral: true
    });
  }

  const confirmButton = new ButtonBuilder()
    .setCustomId('confirm-close')
    .setLabel('Confirm Close')
    .setStyle(ButtonStyle.Danger);

  const cancelButton = new ButtonBuilder()
    .setCustomId('cancel-close')
    .setLabel('Cancel')
    .setStyle(ButtonStyle.Secondary);

  const row = new ActionRowBuilder()
    .addComponents(confirmButton, cancelButton);

  return interaction.reply({
    content: 'Are you sure you want to close this ticket?',
    components: [row],
    ephemeral: true
  });
}

async function handleReopen(interaction, notificationManager) {
  const ticket = await Ticket.findOne({
    channelId: interaction.channelId,
    status: 'CLOSED'
  });

  if (!ticket) {
    return interaction.reply({
      content: 'This ticket cannot be reopened.',
      ephemeral: true
    });
  }

  const guildConfig = await GuildConfig.findOne({ guildId: interaction.guildId });
  if (!guildConfig.settings.allowReopen) {
    return interaction.reply({
      content: 'Reopening tickets is not allowed on this server.',
      ephemeral: true
    });
  }

  ticket.status = 'OPEN';
  ticket.workflowStep = 'new';
  await ticket.save();

  const embed = new EmbedBuilder()
    .setColor('#00ff00')
    .setTitle('✅ Ticket Reopened')
    .setDescription(`This ticket has been reopened.`)
    .addFields(
      { name: '🔄 Status', value: '🆕 New', inline: true }
    )
    .setTimestamp();

  await interaction.reply({ embeds: [embed] });

  // Send notifications
  await notificationManager.sendTicketNotification('ticket_reopened', ticket, {
    notifyCreator: true,
    logChannel: guildConfig.transcriptChannel
  });
}

async function handleDelete(interaction) {
  const ticket = await Ticket.findOne({
    channelId: interaction.channelId
  });

  if (!ticket) {
    return interaction.reply({
      content: 'This is not a ticket channel.',
      ephemeral: true
    });
  }

  const confirmButton = new ButtonBuilder()
    .setCustomId('confirm-delete')
    .setLabel('Confirm Delete')
    .setStyle(ButtonStyle.Danger);

  const cancelButton = new ButtonBuilder()
    .setCustomId('cancel-delete')
    .setLabel('Cancel')
    .setStyle(ButtonStyle.Secondary);

  const row = new ActionRowBuilder()
    .addComponents(confirmButton, cancelButton);

  return interaction.reply({
    content: 'Are you sure you want to permanently delete this ticket? This action cannot be undone.',
    components: [row],
    ephemeral: true
  });
}

async function handleClaim(interaction, notificationManager) {
  const ticket = await Ticket.findOne({
    channelId: interaction.channelId,
    status: 'OPEN'
  });

  if (!ticket) {
    return interaction.reply({
      content: 'This is not an open ticket channel.',
      ephemeral: true
    });
  }

  if (ticket.claimedBy) {
    return interaction.reply({
      content: `This ticket has already been claimed by <@${ticket.claimedBy}>.`,
      ephemeral: true
    });
  }

  const guildConfig = await GuildConfig.findOne({ guildId: interaction.guildId });
  const hasRole = guildConfig.supportRoles.some(roleId => interaction.member.roles.cache.has(roleId));
  const isAdmin = interaction.member.permissions.has(PermissionFlagsBits.Administrator);

  if (!hasRole && !isAdmin) {
    return interaction.reply({
      content: 'You need a support role to claim tickets.',
      ephemeral: true
    });
  }

  // Update ticket
  ticket.claimedBy = interaction.user.id;
  ticket.claimedAt = new Date();
  ticket.workflowStep = 'assigned';
  await ticket.save();

  const embed = new EmbedBuilder()
    .setColor('#00ff00')
    .setTitle('✅ Ticket Claimed')
    .setDescription(`This ticket has been claimed by ${interaction.user}`)
    .addFields(
      { name: '🎯 Claimed by', value: `${interaction.user}`, inline: true },
      { name: '⏰ Claimed at', value: new Date().toLocaleString(), inline: true },
      { name: '🔄 Status', value: '👤 Assigned', inline: true }
    )
    .setTimestamp();

  await interaction.reply({ embeds: [embed] });

  // Send notifications
  await notificationManager.sendTicketNotification('ticket_claimed', ticket, {
    notifyCreator: true,
    logChannel: guildConfig.transcriptChannel
  });
}

async function handleList(interaction) {
  const statusFilter = interaction.options.getString('status') || 'ALL';
  const query = { 
    guildId: interaction.guildId,
    creatorId: interaction.user.id
  };

  if (statusFilter !== 'ALL') {
    query.status = statusFilter;
  }

  const tickets = await Ticket.find(query).sort({ createdAt: -1 }).limit(10);

  if (tickets.length === 0) {
    return interaction.reply({
      content: `You have no ${statusFilter.toLowerCase() === 'all' ? '' : statusFilter.toLowerCase()} tickets.`,
      ephemeral: true
    });
  }

  const ticketList = tickets.map(ticket => {
    const status = ticket.status === 'OPEN' ? '🟢' : ticket.status === 'CLOSED' ? '🔴' : '⚫';
    const claimedText = ticket.claimedBy ? `(Claimed by <@${ticket.claimedBy}>)` : '';
    const date = new Date(ticket.createdAt).toLocaleDateString();
    return `${status} **${ticket.ticketId}** - ${ticket.subject} ${claimedText}\n📅 ${date} | 📍 <#${ticket.channelId}>`;
  });

  const embed = new EmbedBuilder()
    .setColor('#0099ff')
    .setTitle(`🎫 Your Tickets ${statusFilter !== 'ALL' ? `(${statusFilter})` : ''}`)
    .setDescription(ticketList.join('\n\n'))
    .setFooter({ text: `Showing ${tickets.length} tickets | 🟢 Open 🔴 Closed ⚫ Deleted` })
    .setTimestamp();

  await interaction.reply({ embeds: [embed], ephemeral: true });
}

async function handleInfo(interaction) {
  const ticket = await Ticket.findOne({ channelId: interaction.channelId });

  if (!ticket) {
    return interaction.reply({
      content: 'This is not a ticket channel.',
      ephemeral: true
    });
  }

  const creator = await interaction.client.users.fetch(ticket.creatorId).catch(() => null);
  const claimedBy = ticket.claimedBy ? await interaction.client.users.fetch(ticket.claimedBy).catch(() => null) : null;
  const closedBy = ticket.closedBy ? await interaction.client.users.fetch(ticket.closedBy).catch(() => null) : null;

  const embed = new EmbedBuilder()
    .setColor(ticket.status === 'OPEN' ? '#00ff00' : ticket.status === 'CLOSED' ? '#ff9900' : '#ff0000')
    .setTitle(`🎫 Ticket Information - ${ticket.ticketId}`)
    .addFields(
      { name: '📝 Subject', value: ticket.subject, inline: true },
      { name: '📂 Category', value: ticket.category || 'General', inline: true },
      { name: '📊 Status', value: ticket.status, inline: true },
      { name: '👤 Creator', value: creator ? creator.tag : 'Unknown User', inline: true },
      { name: '📅 Created', value: new Date(ticket.createdAt).toLocaleString(), inline: true },
      { name: '👥 Participants', value: ticket.participants.length > 0 ? ticket.participants.map(id => `<@${id}>`).join(', ') : 'None', inline: true }
    );

  if (ticket.claimedBy) {
    embed.addFields({ 
      name: '🎯 Claimed By', 
      value: claimedBy ? claimedBy.tag : 'Unknown User', 
      inline: true 
    });
    embed.addFields({ 
      name: '⏰ Claimed At', 
      value: new Date(ticket.claimedAt).toLocaleString(), 
      inline: true 
    });
  }

  if (ticket.closedAt) {
    embed.addFields({ 
      name: '🔒 Closed By', 
      value: closedBy ? closedBy.tag : 'Unknown User', 
      inline: true 
    });
    embed.addFields({ 
      name: '🕐 Closed At', 
      value: new Date(ticket.closedAt).toLocaleString(), 
      inline: true 
    });
  }

  if (ticket.lastActivity) {
    embed.addFields({ 
      name: '🕒 Last Activity', 
      value: new Date(ticket.lastActivity).toLocaleString(), 
      inline: true 
    });
  }

  embed.setTimestamp();

  await interaction.reply({ embeds: [embed], ephemeral: true });
} 