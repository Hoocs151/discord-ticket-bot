const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const Ticket = require('../models/Ticket');
const GuildConfig = require('../models/GuildConfig');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('stats')
    .setDescription('View ticket statistics')
    .addSubcommand(subcommand =>
      subcommand
        .setName('server')
        .setDescription('View server ticket statistics'))
    .addSubcommand(subcommand =>
      subcommand
        .setName('user')
        .setDescription('View user ticket statistics')
        .addUserOption(option =>
          option
            .setName('target')
            .setDescription('User to view stats for (leave empty for yourself)')
            .setRequired(false))),

  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();
    
    switch (subcommand) {
      case 'server':
        return await handleServerStats(interaction);
      case 'user':
        return await handleUserStats(interaction);
    }
  }
};

async function handleServerStats(interaction) {
  try {
    await interaction.deferReply();

    const guildConfig = await GuildConfig.findOne({ guildId: interaction.guildId });
    if (!guildConfig) {
      return interaction.editReply({
        content: 'This server has not been set up for tickets yet. Please use `/ticket-setup` first.',
        ephemeral: true
      });
    }

    // Get all tickets for this guild
    const allTickets = await Ticket.find({ guildId: interaction.guildId });
    
    // Calculate statistics
    const totalTickets = allTickets.length;
    const openTickets = allTickets.filter(t => t.status === 'OPEN').length;
    const closedTickets = allTickets.filter(t => t.status === 'CLOSED').length;
    const deletedTickets = allTickets.filter(t => t.status === 'DELETED').length;
    
    // Calculate average response time and resolution time
    const closedTicketsWithTimes = allTickets.filter(t => t.status === 'CLOSED' && t.closedAt);
    let avgResolutionTime = 0;
    if (closedTicketsWithTimes.length > 0) {
      const totalTime = closedTicketsWithTimes.reduce((sum, ticket) => {
        return sum + (new Date(ticket.closedAt) - new Date(ticket.createdAt));
      }, 0);
      avgResolutionTime = totalTime / closedTicketsWithTimes.length;
    }

    // Get most active users
    const userTicketCounts = {};
    allTickets.forEach(ticket => {
      userTicketCounts[ticket.creatorId] = (userTicketCounts[ticket.creatorId] || 0) + 1;
    });
    
    const topUsers = Object.entries(userTicketCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([userId, count]) => `<@${userId}> - ${count} tickets`);

    // Get tickets by category
    const categoryStats = {};
    allTickets.forEach(ticket => {
      const category = ticket.category || 'General';
      categoryStats[category] = (categoryStats[category] || 0) + 1;
    });

    // Recent activity (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recentTickets = allTickets.filter(t => new Date(t.createdAt) > sevenDaysAgo).length;

    const statsEmbed = new EmbedBuilder()
      .setColor('#0099ff')
      .setTitle('📊 Server Ticket Statistics')
      .setDescription(`Statistics for **${interaction.guild.name}**`)
      .addFields(
        {
          name: '📈 **General Stats**',
          value: [
            `Total Tickets: **${totalTickets}**`,
            `Open Tickets: **${openTickets}**`,
            `Closed Tickets: **${closedTickets}**`,
            `Deleted Tickets: **${deletedTickets}**`,
            `Recent Activity (7 days): **${recentTickets}**`
          ].join('\n'),
          inline: true
        },
        {
          name: '⏱️ **Performance**',
          value: [
            `Average Resolution Time: **${formatTime(avgResolutionTime)}**`,
            `Current Ticket Counter: **${guildConfig.ticketCounter}**`,
            `Max Tickets Per User: **${guildConfig.settings.maxOpenTickets}**`
          ].join('\n'),
          inline: true
        },
        {
          name: '📋 **Categories**',
          value: Object.entries(categoryStats).length > 0 
            ? Object.entries(categoryStats)
                .sort(([,a], [,b]) => b - a)
                .slice(0, 5)
                .map(([category, count]) => `${category}: **${count}**`)
                .join('\n')
            : 'No categories yet',
          inline: false
        },
        {
          name: '👥 **Most Active Users**',
          value: topUsers.length > 0 ? topUsers.join('\n') : 'No tickets yet',
          inline: false
        }
      )
      .setFooter({ 
        text: `Ticket System | Total: ${totalTickets} tickets`,
        iconURL: interaction.client.user.displayAvatarURL()
      })
      .setTimestamp();

    await interaction.editReply({ embeds: [statsEmbed] });
  } catch (error) {
    console.error('Error in handleServerStats:', error);
    await interaction.editReply({
      content: 'An error occurred while fetching server statistics.',
      ephemeral: true
    });
  }
}

async function handleUserStats(interaction) {
  try {
    const targetUser = interaction.options.getUser('target') || interaction.user;
    await interaction.deferReply();

    const userTickets = await Ticket.find({ 
      guildId: interaction.guildId,
      creatorId: targetUser.id
    });

    if (userTickets.length === 0) {
      return interaction.editReply({
        content: targetUser.id === interaction.user.id 
          ? 'You have not created any tickets yet.'
          : `${targetUser.tag} has not created any tickets yet.`,
        ephemeral: true
      });
    }

    const totalTickets = userTickets.length;
    const openTickets = userTickets.filter(t => t.status === 'OPEN').length;
    const closedTickets = userTickets.filter(t => t.status === 'CLOSED').length;
    const deletedTickets = userTickets.filter(t => t.status === 'DELETED').length;

    // Calculate average time
    const closedUserTickets = userTickets.filter(t => t.status === 'CLOSED' && t.closedAt);
    let avgTime = 0;
    if (closedUserTickets.length > 0) {
      const totalTime = closedUserTickets.reduce((sum, ticket) => {
        return sum + (new Date(ticket.closedAt) - new Date(ticket.createdAt));
      }, 0);
      avgTime = totalTime / closedUserTickets.length;
    }

    // Get recent tickets
    const recentTickets = userTickets
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 5)
      .map(ticket => {
        const status = ticket.status === 'OPEN' ? '🟢' : ticket.status === 'CLOSED' ? '🔴' : '⚫';
        const date = new Date(ticket.createdAt).toLocaleDateString();
        return `${status} ${ticket.ticketId} - ${ticket.subject} (${date})`;
      });

    const userStatsEmbed = new EmbedBuilder()
      .setColor('#0099ff')
      .setTitle(`📊 Ticket Statistics for ${targetUser.tag}`)
      .setThumbnail(targetUser.displayAvatarURL())
      .addFields(
        {
          name: '📈 **Overview**',
          value: [
            `Total Tickets: **${totalTickets}**`,
            `Open Tickets: **${openTickets}**`,
            `Closed Tickets: **${closedTickets}**`,
            `Deleted Tickets: **${deletedTickets}**`
          ].join('\n'),
          inline: true
        },
        {
          name: '⏱️ **Performance**',
          value: [
            `Average Resolution: **${formatTime(avgTime)}**`,
            `First Ticket: **${new Date(userTickets[userTickets.length - 1].createdAt).toLocaleDateString()}**`,
            `Latest Ticket: **${new Date(userTickets[0].createdAt).toLocaleDateString()}**`
          ].join('\n'),
          inline: true
        },
        {
          name: '📋 **Recent Tickets**',
          value: recentTickets.join('\n') || 'No recent tickets',
          inline: false
        }
      )
      .setFooter({ 
        text: `Requested by ${interaction.user.tag}`,
        iconURL: interaction.user.displayAvatarURL()
      })
      .setTimestamp();

    await interaction.editReply({ embeds: [userStatsEmbed] });
  } catch (error) {
    console.error('Error in handleUserStats:', error);
    await interaction.editReply({
      content: 'An error occurred while fetching user statistics.',
      ephemeral: true
    });
  }
}

function formatTime(milliseconds) {
  if (milliseconds === 0) return 'N/A';
  
  const hours = Math.floor(milliseconds / (1000 * 60 * 60));
  const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60));
  
  if (hours === 0) return `${minutes}m`;
  if (hours < 24) return `${hours}h ${minutes}m`;
  
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  return `${days}d ${remainingHours}h`;
} 