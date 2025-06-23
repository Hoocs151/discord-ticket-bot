const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, AttachmentBuilder } = require('discord.js');
const Ticket = require('../models/Ticket');
const GuildConfig = require('../models/GuildConfig');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ticket-admin')
    .setDescription('Advanced ticket management for administrators')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(subcommand =>
      subcommand
        .setName('list')
        .setDescription('List all tickets in the server')
        .addStringOption(option =>
          option
            .setName('status')
            .setDescription('Filter by status')
            .setRequired(false)
            .addChoices(
              { name: 'Open', value: 'OPEN' },
              { name: 'Closed', value: 'CLOSED' },
              { name: 'Deleted', value: 'DELETED' },
              { name: 'All', value: 'ALL' }
            ))
        .addUserOption(option =>
          option
            .setName('user')
            .setDescription('Filter by user')
            .setRequired(false)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('force-close')
        .setDescription('Force close a ticket')
        .addChannelOption(option =>
          option
            .setName('channel')
            .setDescription('Ticket channel to close')
            .setRequired(false)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('cleanup')
        .setDescription('Clean up old deleted tickets from database')
        .addIntegerOption(option =>
          option
            .setName('days')
            .setDescription('Delete tickets older than X days (default: 30)')
            .setRequired(false)
            .setMinValue(1)
            .setMaxValue(365)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('export')
        .setDescription('Export ticket data to CSV')
        .addStringOption(option =>
          option
            .setName('format')
            .setDescription('Export format')
            .setRequired(false)
            .addChoices(
              { name: 'CSV', value: 'csv' },
              { name: 'JSON', value: 'json' }
            )))
    .addSubcommand(subcommand =>
      subcommand
        .setName('transfer')
        .setDescription('Transfer ticket ownership')
        .addChannelOption(option =>
          option
            .setName('channel')
            .setDescription('Ticket channel')
            .setRequired(true))
        .addUserOption(option =>
          option
            .setName('new-owner')
            .setDescription('New ticket owner')
            .setRequired(true)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('auto-close')
        .setDescription('Configure auto-close settings')
        .addBooleanOption(option =>
          option
            .setName('enabled')
            .setDescription('Enable auto-close')
            .setRequired(true))
        .addIntegerOption(option =>
          option
            .setName('hours')
            .setDescription('Hours of inactivity before auto-close (default: 24)')
            .setRequired(false)
            .setMinValue(1)
            .setMaxValue(168))),

  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();

    switch (subcommand) {
      case 'list':
        return await handleList(interaction);
      case 'force-close':
        return await handleForceClose(interaction);
      case 'cleanup':
        return await handleCleanup(interaction);
      case 'export':
        return await handleExport(interaction);
      case 'transfer':
        return await handleTransfer(interaction);
      case 'auto-close':
        return await handleAutoClose(interaction);
    }
  }
};

async function handleList(interaction) {
  await interaction.deferReply({ ephemeral: true });

  const statusFilter = interaction.options.getString('status') || 'ALL';
  const userFilter = interaction.options.getUser('user');

  const query = { guildId: interaction.guildId };
  
  if (statusFilter !== 'ALL') {
    query.status = statusFilter;
  }
  
  if (userFilter) {
    query.creatorId = userFilter.id;
  }

  const tickets = await Ticket.find(query).sort({ createdAt: -1 }).limit(20);

  if (tickets.length === 0) {
    return interaction.editReply({
      content: 'No tickets found matching the criteria.',
    });
  }

  const ticketList = tickets.map((ticket, index) => {
    const status = ticket.status === 'OPEN' ? '🟢' : ticket.status === 'CLOSED' ? '🔴' : '⚫';
    const claimed = ticket.claimedBy ? '👤' : '🔓';
    const date = new Date(ticket.createdAt).toLocaleDateString();
    return `${index + 1}. ${status}${claimed} **${ticket.ticketId}** - ${ticket.subject}\n   📅 ${date} | 👤 <@${ticket.creatorId}> | 📍 <#${ticket.channelId}>`;
  });

  const embed = new EmbedBuilder()
    .setColor('#0099ff')
    .setTitle(`🛠️ Admin Ticket List ${statusFilter !== 'ALL' ? `(${statusFilter})` : ''}`)
    .setDescription(ticketList.join('\n\n'))
    .setFooter({ 
      text: `Showing ${tickets.length} tickets | 🟢 Open 🔴 Closed ⚫ Deleted | 👤 Claimed 🔓 Unclaimed` 
    })
    .setTimestamp();

  await interaction.editReply({ embeds: [embed] });
}

async function handleForceClose(interaction) {
  const channel = interaction.options.getChannel('channel') || interaction.channel;
  
  const ticket = await Ticket.findOne({
    channelId: channel.id,
    status: 'OPEN'
  });

  if (!ticket) {
    return interaction.reply({
      content: 'This is not an open ticket channel.',
      ephemeral: true
    });
  }

  const confirmButton = new ButtonBuilder()
    .setCustomId(`admin-force-close-${channel.id}`)
    .setLabel('Force Close')
    .setStyle(ButtonStyle.Danger);

  const cancelButton = new ButtonBuilder()
    .setCustomId('admin-cancel')
    .setLabel('Cancel')
    .setStyle(ButtonStyle.Secondary);

  const row = new ActionRowBuilder()
    .addComponents(confirmButton, cancelButton);

  const embed = new EmbedBuilder()
    .setColor('#ff9900')
    .setTitle('⚠️ Force Close Ticket')
    .setDescription(`Are you sure you want to force close ticket **${ticket.ticketId}**?\n\nChannel: ${channel}\nCreator: <@${ticket.creatorId}>`)
    .setFooter({ text: 'This action cannot be undone' });

  await interaction.reply({
    embeds: [embed],
    components: [row],
    ephemeral: true
  });
}

async function handleCleanup(interaction) {
  await interaction.deferReply({ ephemeral: true });

  const days = interaction.options.getInteger('days') || 30;
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);

  const result = await Ticket.deleteMany({
    guildId: interaction.guildId,
    status: 'DELETED',
    closedAt: { $lt: cutoffDate }
  });

  const embed = new EmbedBuilder()
    .setColor('#00ff00')
    .setTitle('🧹 Cleanup Complete')
    .setDescription(`Removed **${result.deletedCount}** deleted tickets older than ${days} days from the database.`)
    .setTimestamp();

  await interaction.editReply({ embeds: [embed] });
}

async function handleExport(interaction) {
  await interaction.deferReply({ ephemeral: true });

  const format = interaction.options.getString('format') || 'csv';
  const tickets = await Ticket.find({ guildId: interaction.guildId }).sort({ createdAt: -1 });

  if (tickets.length === 0) {
    return interaction.editReply({
      content: 'No tickets found to export.',
    });
  }

  let fileContent = '';
  let fileName = '';

  if (format === 'csv') {
    const headers = ['Ticket ID', 'Status', 'Subject', 'Category', 'Creator ID', 'Created At', 'Closed At', 'Claimed By'];
    const csvRows = [headers.join(',')];
    
    tickets.forEach(ticket => {
      const row = [
        ticket.ticketId,
        ticket.status,
        `"${ticket.subject.replace(/"/g, '""')}"`,
        ticket.category || 'General',
        ticket.creatorId,
        ticket.createdAt.toISOString(),
        ticket.closedAt ? ticket.closedAt.toISOString() : '',
        ticket.claimedBy || ''
      ];
      csvRows.push(row.join(','));
    });
    
    fileContent = csvRows.join('\n');
    fileName = `tickets-export-${new Date().toISOString().split('T')[0]}.csv`;
  } else {
    fileContent = JSON.stringify(tickets, null, 2);
    fileName = `tickets-export-${new Date().toISOString().split('T')[0]}.json`;
  }

  const attachment = new AttachmentBuilder(Buffer.from(fileContent), { name: fileName });

  const embed = new EmbedBuilder()
    .setColor('#0099ff')
    .setTitle('📊 Ticket Export')
    .setDescription(`Exported **${tickets.length}** tickets in ${format.toUpperCase()} format`)
    .setTimestamp();

  await interaction.editReply({
    embeds: [embed],
    files: [attachment]
  });
}

async function handleTransfer(interaction) {
  const channel = interaction.options.getChannel('channel');
  const newOwner = interaction.options.getUser('new-owner');

  const ticket = await Ticket.findOne({ channelId: channel.id });

  if (!ticket) {
    return interaction.reply({
      content: 'This is not a ticket channel.',
      ephemeral: true
    });
  }

  const oldOwner = ticket.creatorId;
  ticket.creatorId = newOwner.id;
  await ticket.save();

  // Update channel permissions
  await channel.permissionOverwrites.edit(oldOwner, {
    ViewChannel: false,
    SendMessages: false
  });

  await channel.permissionOverwrites.edit(newOwner.id, {
    ViewChannel: true,
    SendMessages: true
  });

  const embed = new EmbedBuilder()
    .setColor('#00ff00')
    .setTitle('🔄 Ticket Transferred')
    .setDescription(`Ticket **${ticket.ticketId}** has been transferred to ${newOwner}`)
    .addFields(
      { name: 'Previous Owner', value: `<@${oldOwner}>`, inline: true },
      { name: 'New Owner', value: `${newOwner}`, inline: true }
    )
    .setTimestamp();

  await interaction.reply({ embeds: [embed] });

  // Notify the new owner
  try {
    await newOwner.send({
      content: `You have been assigned ownership of ticket **${ticket.ticketId}** in **${interaction.guild.name}**.`,
      embeds: [embed]
    });
  } catch (error) {
    // User has DMs disabled, ignore
  }
}

async function handleAutoClose(interaction) {
  const enabled = interaction.options.getBoolean('enabled');
  const hours = interaction.options.getInteger('hours') || 24;

  const guildConfig = await GuildConfig.findOne({ guildId: interaction.guildId });
  
  if (!guildConfig) {
    return interaction.reply({
      content: 'This server has not been set up for tickets yet. Please use `/ticket-setup` first.',
      ephemeral: true
    });
  }

  // Ensure automation object exists
  if (!guildConfig.automation) {
    guildConfig.automation = {
      autoClose: {
        enabled: false,
        inactivityTime: 24,
        warningTime: 1,
        excludePriorities: []
      },
      autoAssignment: {
        enabled: false,
        method: 'round_robin',
        excludeOffline: true
      },
      autoEscalation: {
        enabled: false,
        responseTimeThreshold: 120,
        escalateTo: []
      },
      feedbackRequest: {
        enabled: true,
        delayAfterClose: 5,
        reminderAfter: 24
      }
    };
  }

  // Ensure autoClose object exists
  if (!guildConfig.automation.autoClose) {
    guildConfig.automation.autoClose = {
      enabled: false,
      inactivityTime: 24,
      warningTime: 1,
      excludePriorities: []
    };
  }

  // Update the settings
  guildConfig.automation.autoClose.enabled = enabled;
  guildConfig.automation.autoClose.inactivityTime = hours;
  await guildConfig.save();

  const embed = new EmbedBuilder()
    .setColor(enabled ? '#00ff00' : '#ff9900')
    .setTitle('🕐 Auto-Close Settings Updated')
    .setDescription(enabled 
      ? `Auto-close has been **enabled**. Tickets will be automatically closed after **${hours} hours** of inactivity.`
      : 'Auto-close has been **disabled**.')
    .addFields(
      { name: 'Status', value: enabled ? '✅ Enabled' : '❌ Disabled', inline: true },
      { name: 'Inactivity Time', value: `${hours} hours`, inline: true },
      { name: 'Warning Time', value: `${guildConfig.automation.autoClose.warningTime} hour before closing`, inline: true }
    )
    .setTimestamp();

  await interaction.reply({ embeds: [embed] });
} 