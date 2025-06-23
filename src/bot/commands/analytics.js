const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const Ticket = require('../models/Ticket');
const GuildConfig = require('../models/GuildConfig');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('analytics')
    .setDescription('Advanced ticket analytics and reporting')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand(subcommand =>
      subcommand
        .setName('overview')
        .setDescription('Get overall analytics overview')
        .addIntegerOption(option =>
          option
            .setName('days')
            .setDescription('Number of days to analyze (default: 30)')
            .setRequired(false)
            .setMinValue(1)
            .setMaxValue(365)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('performance')
        .setDescription('View performance metrics')
        .addIntegerOption(option =>
          option
            .setName('days')
            .setDescription('Number of days to analyze (default: 30)')
            .setRequired(false)
            .setMinValue(1)
            .setMaxValue(365)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('trends')
        .setDescription('Analyze ticket trends over time')
        .addStringOption(option =>
          option
            .setName('period')
            .setDescription('Time period for trend analysis')
            .setRequired(false)
            .addChoices(
              { name: 'Last 7 days', value: '7d' },
              { name: 'Last 30 days', value: '30d' },
              { name: 'Last 90 days', value: '90d' },
              { name: 'Last year', value: '365d' }
            )))
    .addSubcommand(subcommand =>
      subcommand
        .setName('categories')
        .setDescription('Category-specific analytics')
        .addStringOption(option =>
          option
            .setName('category')
            .setDescription('Specific category to analyze')
            .setRequired(false)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('staff')
        .setDescription('Staff performance analytics')
        .addUserOption(option =>
          option
            .setName('user')
            .setDescription('Specific staff member to analyze')
            .setRequired(false)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('sla')
        .setDescription('SLA compliance and breach analysis')
        .addIntegerOption(option =>
          option
            .setName('days')
            .setDescription('Number of days to analyze (default: 30)')
            .setRequired(false)
            .setMinValue(1)
            .setMaxValue(365)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('export')
        .setDescription('Export detailed analytics data')
        .addStringOption(option =>
          option
            .setName('format')
            .setDescription('Export format')
            .setRequired(false)
            .addChoices(
              { name: 'CSV', value: 'csv' },
              { name: 'JSON', value: 'json' },
              { name: 'Excel', value: 'excel' }
            ))
        .addIntegerOption(option =>
          option
            .setName('days')
            .setDescription('Number of days of data (default: 30)')
            .setRequired(false)
            .setMinValue(1)
            .setMaxValue(365))),

  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();
    
    switch (subcommand) {
      case 'overview':
        return await handleOverview(interaction);
      case 'performance':
        return await handlePerformance(interaction);
      case 'trends':
        return await handleTrends(interaction);
      case 'categories':
        return await handleCategories(interaction);
      case 'staff':
        return await handleStaff(interaction);
      case 'sla':
        return await handleSLA(interaction);
      case 'export':
        return await handleExport(interaction);
    }
  }
};

async function handleOverview(interaction) {
  await interaction.deferReply({ ephemeral: true });
  
  const days = interaction.options.getInteger('days') || 30;
  const since = new Date();
  since.setDate(since.getDate() - days);

  try {
    // Get basic metrics
    const [totalTickets, openTickets, metrics] = await Promise.all([
      Ticket.countDocuments({ guildId: interaction.guildId }),
      Ticket.countDocuments({ guildId: interaction.guildId, status: 'OPEN' }),
      getTicketMetrics(interaction.guildId, since)
    ]);

    const embed = new EmbedBuilder()
      .setColor('#0099ff')
      .setTitle('📊 Analytics Overview')
      .setDescription(`Comprehensive analytics for the last **${days} days**`)
      .addFields(
        {
          name: '📈 **Volume Metrics**',
          value: [
            `📋 Total Tickets: **${totalTickets}**`,
            `🟢 Open Tickets: **${openTickets}**`,
            `🔴 Closed Tickets: **${totalTickets - openTickets}**`,
            `📅 Period Tickets: **${metrics.periodTickets}**`,
            `📊 Daily Average: **${Math.round(metrics.periodTickets / days)}**`
          ].join('\n'),
          inline: true
        },
        {
          name: '⏱️ **Performance Metrics**',
          value: [
            `⚡ Avg Response Time: **${formatTime(metrics.avgFirstResponse)}**`,
            `🎯 Avg Resolution Time: **${formatTime(metrics.avgResolution)}**`,
            `🔄 Avg Messages/Ticket: **${Math.round(metrics.avgMessages)}**`,
            `👥 Active Staff: **${metrics.activeStaff}**`,
            `🏆 Resolution Rate: **${metrics.resolutionRate}%**`
          ].join('\n'),
          inline: true
        },
        {
          name: '🎯 **Priority Breakdown**',
          value: [
            `🔴 Urgent: **${metrics.priorities.urgent || 0}** (${getPercentage(metrics.priorities.urgent, metrics.periodTickets)}%)`,
            `🟠 High: **${metrics.priorities.high || 0}** (${getPercentage(metrics.priorities.high, metrics.periodTickets)}%)`,
            `🟡 Medium: **${metrics.priorities.medium || 0}** (${getPercentage(metrics.priorities.medium, metrics.periodTickets)}%)`,
            `🟢 Low: **${metrics.priorities.low || 0}** (${getPercentage(metrics.priorities.low, metrics.periodTickets)}%)`
          ].join('\n'),
          inline: false
        },
        {
          name: '📂 **Top Categories**',
          value: metrics.topCategories.length > 0 
            ? metrics.topCategories.slice(0, 5).map(cat => 
                `• ${cat._id}: **${cat.count}** tickets`
              ).join('\n')
            : 'No data available',
          inline: true
        },
        {
          name: '⚠️ **Issues & Alerts**',
          value: [
            `🚨 SLA Breaches: **${metrics.slaBreaches}**`,
            `🔄 Reopened Tickets: **${metrics.reopenedTickets}**`,
            `⏳ Overdue Tickets: **${metrics.overdueTickets}**`,
            `📈 Volume Change: **${metrics.volumeChange > 0 ? '+' : ''}${metrics.volumeChange}%**`
          ].join('\n'),
          inline: true
        }
      )
      .setFooter({ 
        text: `Analytics for ${interaction.guild.name} | Generated ${new Date().toLocaleString()}`,
        iconURL: interaction.guild.iconURL()
      })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    console.error('Analytics overview error:', error);
    await interaction.editReply({
      content: 'An error occurred while generating analytics overview.'
    });
  }
}

async function handlePerformance(interaction) {
  await interaction.deferReply({ ephemeral: true });
  
  const days = interaction.options.getInteger('days') || 30;
  const since = new Date();
  since.setDate(since.getDate() - days);

  try {
    const performance = await getPerformanceMetrics(interaction.guildId, since);
    
    const embed = new EmbedBuilder()
      .setColor('#00ff00')
      .setTitle('🚀 Performance Analytics')
      .setDescription(`Performance metrics for the last **${days} days**`)
      .addFields(
        {
          name: '⚡ **Response Times**',
          value: [
            `Fastest Response: **${formatTime(performance.fastestResponse)}**`,
            `Average Response: **${formatTime(performance.avgResponse)}**`,
            `Slowest Response: **${formatTime(performance.slowestResponse)}**`,
            `95th Percentile: **${formatTime(performance.response95th)}**`
          ].join('\n'),
          inline: true
        },
        {
          name: '🎯 **Resolution Times**',
          value: [
            `Fastest Resolution: **${formatTime(performance.fastestResolution)}**`,
            `Average Resolution: **${formatTime(performance.avgResolution)}**`,
            `Slowest Resolution: **${formatTime(performance.slowestResolution)}**`,
            `95th Percentile: **${formatTime(performance.resolution95th)}**`
          ].join('\n'),
          inline: true
        },
        {
          name: '📊 **Efficiency Metrics**',
          value: [
            `Tickets/Staff/Day: **${performance.ticketsPerStaffPerDay}**`,
            `Staff Utilization: **${performance.staffUtilization}%**`,
            `Peak Hours: **${performance.peakHours}**`,
            `Busiest Day: **${performance.busiestDay}**`
          ].join('\n'),
          inline: false
        },
        {
          name: '🏆 **Quality Metrics**',
          value: [
            `First Contact Resolution: **${performance.firstContactResolution}%**`,
            `Customer Satisfaction: **${performance.satisfaction}/5.0**`,
            `Escalation Rate: **${performance.escalationRate}%**`,
            `Reopen Rate: **${performance.reopenRate}%**`
          ].join('\n'),
          inline: true
        },
        {
          name: '📈 **Trends**',
          value: [
            `Volume Trend: **${performance.volumeTrend}**`,
            `Response Trend: **${performance.responseTrend}**`,
            `Resolution Trend: **${performance.resolutionTrend}**`,
            `Quality Trend: **${performance.qualityTrend}**`
          ].join('\n'),
          inline: true
        }
      )
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    console.error('Performance analytics error:', error);
    await interaction.editReply({
      content: 'An error occurred while generating performance analytics.'
    });
  }
}

async function handleTrends(interaction) {
  await interaction.deferReply({ ephemeral: true });
  
  const period = interaction.options.getString('period') || '30d';
  const days = parseInt(period.replace('d', ''));
  
  try {
    const trends = await getTrendAnalysis(interaction.guildId, days);
    
    const embed = new EmbedBuilder()
      .setColor('#ff9900')
      .setTitle('📈 Trend Analysis')
      .setDescription(`Ticket trends over the last **${days} days**`)
      .addFields(
        {
          name: '📊 **Volume Trends**',
          value: [
            `Current Week: **${trends.currentWeek}** tickets`,
            `Previous Week: **${trends.previousWeek}** tickets`,
            `Weekly Change: **${trends.weeklyChange > 0 ? '+' : ''}${trends.weeklyChange}%**`,
            `Monthly Projection: **${trends.monthlyProjection}** tickets`
          ].join('\n'),
          inline: true
        },
        {
          name: '⏱️ **Performance Trends**',
          value: [
            `Response Time Trend: **${trends.responseTimeTrend}**`,
            `Resolution Time Trend: **${trends.resolutionTimeTrend}**`,
            `Quality Score Trend: **${trends.qualityTrend}**`,
            `Staff Efficiency Trend: **${trends.efficiencyTrend}**`
          ].join('\n'),
          inline: true
        },
        {
          name: '🎯 **Priority Trends**',
          value: Object.entries(trends.priorityTrends).map(([priority, change]) => 
            `${getPriorityEmoji(priority)} ${priority}: **${change > 0 ? '+' : ''}${change}%**`
          ).join('\n'),
          inline: false
        },
        {
          name: '📅 **Seasonal Patterns**',
          value: [
            `Peak Day: **${trends.peakDay}**`,
            `Peak Hour: **${trends.peakHour}:00**`,
            `Quiet Period: **${trends.quietPeriod}**`,
            `Seasonality: **${trends.seasonality}**`
          ].join('\n'),
          inline: true
        },
        {
          name: '🔮 **Predictions**',
          value: [
            `Next Week Forecast: **${trends.nextWeekForecast}** tickets`,
            `Capacity Alert: **${trends.capacityAlert}**`,
            `Trend Confidence: **${trends.confidence}%**`,
            `Recommendation: **${trends.recommendation}**`
          ].join('\n'),
          inline: true
        }
      )
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    console.error('Trend analysis error:', error);
    await interaction.editReply({
      content: 'An error occurred while generating trend analysis.'
    });
  }
}

async function handleSLA(interaction) {
  await interaction.deferReply({ ephemeral: true });
  
  const days = interaction.options.getInteger('days') || 30;
  const since = new Date();
  since.setDate(since.getDate() - days);

  try {
    const slaData = await getSLAAnalysis(interaction.guildId, since);
    
    const embed = new EmbedBuilder()
      .setColor(slaData.overallCompliance >= 80 ? '#00ff00' : '#ff0000')
      .setTitle('⏰ SLA Compliance Analysis')
      .setDescription(`SLA performance for the last **${days} days**`)
      .addFields(
        {
          name: '🎯 **Overall Compliance**',
          value: [
            `SLA Compliance: **${slaData.overallCompliance}%**`,
            `Response SLA: **${slaData.responseCompliance}%**`,
            `Resolution SLA: **${slaData.resolutionCompliance}%**`,
            `Total Breaches: **${slaData.totalBreaches}**`
          ].join('\n'),
          inline: true
        },
        {
          name: '🚨 **Breach Breakdown**',
          value: [
            `Response Breaches: **${slaData.responseBreaches}**`,
            `Resolution Breaches: **${slaData.resolutionBreaches}**`,
            `Avg Breach Time: **${formatTime(slaData.avgBreachTime)}**`,
            `Worst Breach: **${formatTime(slaData.worstBreach)}**`
          ].join('\n'),
          inline: true
        },
        {
          name: '📊 **Priority SLA Performance**',
          value: Object.entries(slaData.prioritySLA).map(([priority, compliance]) => 
            `${getPriorityEmoji(priority)} ${priority}: **${compliance}%**`
          ).join('\n'),
          inline: false
        },
        {
          name: '📈 **Trends**',
          value: [
            `Compliance Trend: **${slaData.complianceTrend}**`,
            `Breach Frequency: **${slaData.breachFrequency}**`,
            `Improvement Needed: **${slaData.improvementNeeded}**`,
            `Risk Level: **${slaData.riskLevel}**`
          ].join('\n'),
          inline: true
        },
        {
          name: '💡 **Recommendations**',
          value: slaData.recommendations.length > 0 
            ? slaData.recommendations.slice(0, 4).map(rec => `• ${rec}`).join('\n')
            : 'All SLA targets are being met!',
          inline: true
        }
      )
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    console.error('SLA analysis error:', error);
    await interaction.editReply({
      content: 'An error occurred while generating SLA analysis.'
    });
  }
}

async function handleExport(interaction) {
  await interaction.deferReply({ ephemeral: true });
  
  const format = interaction.options.getString('format') || 'csv';
  const days = interaction.options.getInteger('days') || 30;
  const since = new Date();
  since.setDate(since.getDate() - days);

  try {
    const tickets = await Ticket.find({
      guildId: interaction.guildId,
      createdAt: { $gte: since }
    }).lean();

    let fileContent = '';
    let fileName = '';
    let mimeType = '';

    switch (format) {
      case 'csv':
        fileContent = generateCSV(tickets);
        fileName = `analytics-${interaction.guildId}-${new Date().toISOString().split('T')[0]}.csv`;
        mimeType = 'text/csv';
        break;
      case 'json':
        fileContent = JSON.stringify(tickets, null, 2);
        fileName = `analytics-${interaction.guildId}-${new Date().toISOString().split('T')[0]}.json`;
        mimeType = 'application/json';
        break;
    }

    const attachment = new AttachmentBuilder(Buffer.from(fileContent), {
      name: fileName,
      description: `Analytics export for ${days} days`
    });

    const embed = new EmbedBuilder()
      .setColor('#0099ff')
      .setTitle('📊 Analytics Export')
      .setDescription(`Generated analytics export in ${format.toUpperCase()} format`)
      .addFields(
        { name: 'Period', value: `${days} days`, inline: true },
        { name: 'Records', value: `${tickets.length} tickets`, inline: true },
        { name: 'Format', value: format.toUpperCase(), inline: true }
      )
      .setTimestamp();

    await interaction.editReply({
      embeds: [embed],
      files: [attachment]
    });
  } catch (error) {
    console.error('Export error:', error);
    await interaction.editReply({
      content: 'An error occurred while generating the export.'
    });
  }
}

// Helper functions for data analysis
async function getTicketMetrics(guildId, since) {
  const pipeline = [
    { $match: { guildId, createdAt: { $gte: since } } },
    {
      $group: {
        _id: null,
        totalTickets: { $sum: 1 },
        avgFirstResponse: { $avg: '$metrics.firstResponseTime' },
        avgResolution: { $avg: '$metrics.resolutionTime' },
        avgMessages: { $avg: '$metrics.messageCount' },
        priorities: {
          $push: '$priority'
        },
        categories: {
          $push: '$category'
        }
      }
    }
  ];

  const [result] = await Ticket.aggregate(pipeline);
  
  // Calculate additional metrics
  const priorityCounts = {};
  const categoryCounts = {};
  
  if (result?.priorities) {
    result.priorities.forEach(p => {
      priorityCounts[p] = (priorityCounts[p] || 0) + 1;
    });
  }
  
  if (result?.categories) {
    result.categories.forEach(c => {
      categoryCounts[c] = (categoryCounts[c] || 0) + 1;
    });
  }

  return {
    periodTickets: result?.totalTickets || 0,
    avgFirstResponse: result?.avgFirstResponse || 0,
    avgResolution: result?.avgResolution || 0,
    avgMessages: result?.avgMessages || 0,
    priorities: priorityCounts,
    topCategories: Object.entries(categoryCounts)
      .map(([cat, count]) => ({ _id: cat, count }))
      .sort((a, b) => b.count - a.count),
    activeStaff: 5, // Placeholder
    resolutionRate: 85, // Placeholder
    slaBreaches: 3, // Placeholder
    reopenedTickets: 2, // Placeholder
    overdueTickets: 4, // Placeholder
    volumeChange: 12 // Placeholder
  };
}

async function getPerformanceMetrics(guildId, since) {
  // Placeholder implementation
  return {
    fastestResponse: 300000, // 5 minutes
    avgResponse: 1800000, // 30 minutes
    slowestResponse: 7200000, // 2 hours
    response95th: 3600000, // 1 hour
    fastestResolution: 3600000, // 1 hour
    avgResolution: 86400000, // 24 hours
    slowestResolution: 604800000, // 7 days
    resolution95th: 172800000, // 48 hours
    ticketsPerStaffPerDay: 8.5,
    staffUtilization: 75,
    peakHours: '14:00-16:00',
    busiestDay: 'Tuesday',
    firstContactResolution: 68,
    satisfaction: 4.2,
    escalationRate: 5,
    reopenRate: 8,
    volumeTrend: '↗️ Increasing',
    responseTrend: '↘️ Improving',
    resolutionTrend: '→ Stable',
    qualityTrend: '↗️ Improving'
  };
}

async function getTrendAnalysis(guildId, days) {
  // Placeholder implementation
  return {
    currentWeek: 45,
    previousWeek: 38,
    weeklyChange: 18.4,
    monthlyProjection: 180,
    responseTimeTrend: '↘️ Improving',
    resolutionTimeTrend: '→ Stable',
    qualityTrend: '↗️ Improving',
    efficiencyTrend: '↗️ Improving',
    priorityTrends: {
      urgent: 5,
      high: -2,
      medium: 8,
      low: -3
    },
    peakDay: 'Tuesday',
    peakHour: 14,
    quietPeriod: 'Late nights',
    seasonality: 'Moderate',
    nextWeekForecast: 52,
    capacityAlert: 'Within limits',
    confidence: 85,
    recommendation: 'Consider additional staff during peak hours'
  };
}

async function getSLAAnalysis(guildId, since) {
  // Placeholder implementation
  return {
    overallCompliance: 87,
    responseCompliance: 92,
    resolutionCompliance: 82,
    totalBreaches: 15,
    responseBreaches: 8,
    resolutionBreaches: 7,
    avgBreachTime: 3600000, // 1 hour
    worstBreach: 18000000, // 5 hours
    prioritySLA: {
      urgent: 95,
      high: 88,
      medium: 85,
      low: 90
    },
    complianceTrend: '↗️ Improving',
    breachFrequency: 'Low',
    improvementNeeded: 'Resolution times',
    riskLevel: 'Low',
    recommendations: [
      'Add staff during peak hours',
      'Improve escalation process',
      'Review high priority handling',
      'Implement better triage'
    ]
  };
}

function generateCSV(tickets) {
  const headers = [
    'Ticket ID', 'Status', 'Priority', 'Category', 'Subject', 
    'Creator ID', 'Created At', 'Closed At', 'Resolution Time',
    'First Response Time', 'Message Count', 'Claimed By'
  ];
  
  const rows = tickets.map(ticket => [
    ticket.ticketId,
    ticket.status,
    ticket.priority,
    ticket.category,
    `"${ticket.subject.replace(/"/g, '""')}"`,
    ticket.creatorId,
    ticket.createdAt.toISOString(),
    ticket.closedAt ? ticket.closedAt.toISOString() : '',
    ticket.metrics?.resolutionTime || '',
    ticket.metrics?.firstResponseTime || '',
    ticket.metrics?.messageCount || 0,
    ticket.claimedBy || ''
  ]);
  
  return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
}

function formatTime(milliseconds) {
  if (!milliseconds || milliseconds === 0) return 'N/A';
  
  const hours = Math.floor(milliseconds / (1000 * 60 * 60));
  const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60));
  
  if (hours === 0) return `${minutes}m`;
  if (hours < 24) return `${hours}h ${minutes}m`;
  
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  return `${days}d ${remainingHours}h`;
}

function getPercentage(value, total) {
  if (!total || total === 0) return 0;
  return Math.round((value / total) * 100);
}

function getPriorityEmoji(priority) {
  const emojis = {
    low: '🟢',
    medium: '🟡',
    high: '🟠',
    urgent: '🔴'
  };
  return emojis[priority] || '🟡';
} 