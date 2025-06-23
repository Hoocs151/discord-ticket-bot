const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const logger = require('../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('status-admin')
    .setDescription('Admin controls for bot status management')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(subcommand =>
      subcommand
        .setName('performance')
        .setDescription('View StatusManager performance metrics')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('refresh')
        .setDescription('Force refresh bot statistics')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('custom')
        .setDescription('Set a custom status temporarily')
        .addStringOption(option =>
          option
            .setName('message')
            .setDescription('Custom status message')
            .setRequired(true)
        )
        .addIntegerOption(option =>
          option
            .setName('duration')
            .setDescription('Duration in seconds (default: 60)')
            .setMinValue(10)
            .setMaxValue(3600)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('maintenance')
        .setDescription('Toggle maintenance mode status')
        .addBooleanOption(option =>
          option
            .setName('enable')
            .setDescription('Enable maintenance mode')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('restart')
        .setDescription('Restart the StatusManager')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('cache')
        .setDescription('Manage StatusManager cache')
        .addStringOption(option =>
          option
            .setName('action')
            .setDescription('Cache action to perform')
            .setRequired(true)
            .addChoices(
              { name: 'Clear', value: 'clear' },
              { name: 'Info', value: 'info' }
            )
        )
    ),

  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();
    
    // Get StatusManager instance from client
    const statusManager = interaction.client.statusManager;
    if (!statusManager) {
      return await interaction.reply({
        content: '❌ StatusManager not found!',
        ephemeral: true
      });
    }

    try {
      await interaction.deferReply({ ephemeral: true });

      switch (subcommand) {
        case 'performance':
          await handlePerformance(interaction, statusManager);
          break;
        
        case 'refresh':
          await handleRefresh(interaction, statusManager);
          break;
        
        case 'custom':
          await handleCustom(interaction, statusManager);
          break;
        
        case 'maintenance':
          await handleMaintenance(interaction, statusManager);
          break;
        
        case 'restart':
          await handleRestart(interaction, statusManager);
          break;
        
        case 'cache':
          await handleCache(interaction, statusManager);
          break;
      }
    } catch (error) {
      logger.error('Error in status-admin command:', error);
      const content = 'There was an error executing this command!';
      
      if (interaction.deferred) {
        await interaction.editReply({ content });
      } else {
        await interaction.reply({ content, ephemeral: true });
      }
    }
  }
};

async function handlePerformance(interaction, statusManager) {
  const stats = statusManager.getStats();
  const uptime = Math.floor(process.uptime());
  const uptimeHours = Math.floor(uptime / 3600);
  const uptimeMinutes = Math.floor((uptime % 3600) / 60);
  const uptimeSeconds = uptime % 60;

  const embed = new EmbedBuilder()
    .setTitle('📊 StatusManager Performance Metrics')
    .setColor('#00ff00')
    .setTimestamp()
    .addFields(
      {
        name: '⏱️ System Uptime',
        value: `${uptimeHours}h ${uptimeMinutes}m ${uptimeSeconds}s`,
        inline: true
      },
      {
        name: '🔄 Status Updates',
        value: `${stats.performance.statusUpdates || 0}`,
        inline: true
      },
      {
        name: '📈 Stats Updates',
        value: `${stats.performance.statsUpdates || 0}`,
        inline: true
      },
      {
        name: '⚡ Avg Update Time',
        value: `${Math.round(stats.performance.avgUpdateTime || 0)}ms`,
        inline: true
      },
      {
        name: '❌ Errors',
        value: `${stats.performance.errors || 0}`,
        inline: true
      },
      {
        name: '💾 Cache Status',
        value: stats.cache.isActive ? '✅ Active' : '❌ Inactive',
        inline: true
      },
      {
        name: '🎫 Current Stats',
        value: `Total: ${stats.totalTickets || 0}\nOpen: ${stats.openTickets || 0}\nClosed Today: ${stats.closedToday || 0}`,
        inline: true
      },
      {
        name: '🌐 Guilds & Users',
        value: `Guilds: ${stats.totalGuilds || 0}\nUsers: ${formatNumber(stats.totalUsers || 0)}`,
        inline: true
      },
      {
        name: '🕐 Last Updated',
        value: stats.lastUpdated ? `<t:${Math.floor(stats.lastUpdated.getTime() / 1000)}:R>` : 'Never',
        inline: true
      }
    );

  if (stats.performance.lastError) {
    embed.addFields({
      name: '⚠️ Last Error',
      value: `\`\`\`${stats.performance.lastError.substring(0, 100)}...\`\`\``,
      inline: false
    });
  }

  // Health assessment
  const health = assessHealth(stats);
  embed.addFields({
    name: '🏥 Health Status',
    value: `${health.icon} ${health.status}\n${health.details}`,
    inline: false
  });

  await interaction.editReply({ embeds: [embed] });
}

async function handleRefresh(interaction, statusManager) {
  const startTime = Date.now();
  
  await statusManager.forceUpdateStats();
  
  const updateTime = Date.now() - startTime;
  
  const embed = new EmbedBuilder()
    .setTitle('🔄 Statistics Refreshed')
    .setColor('#00ff00')
    .setDescription(`✅ Successfully refreshed bot statistics in ${updateTime}ms\n💾 All caches cleared and rebuilt`)
    .setTimestamp();

  await interaction.editReply({ embeds: [embed] });
}

async function handleCustom(interaction, statusManager) {
  const message = interaction.options.getString('message');
  const duration = (interaction.options.getInteger('duration') || 60) * 1000;

  await statusManager.setCustomStatus(message, 'PLAYING', duration);

  const embed = new EmbedBuilder()
    .setTitle('🎯 Custom Status Set')
    .setColor('#ff9500')
    .setDescription(`✅ Set custom status: **${message}**`)
    .addFields({
      name: 'Duration',
      value: `${duration / 1000} seconds`,
      inline: true
    })
    .setTimestamp();

  await interaction.editReply({ embeds: [embed] });
}

async function handleMaintenance(interaction, statusManager) {
  const enable = interaction.options.getBoolean('enable');

  if (enable) {
    await statusManager.setMaintenanceStatus();
  } else {
    await statusManager.updateStatus();
  }

  const embed = new EmbedBuilder()
    .setTitle(enable ? '🔧 Maintenance Mode Enabled' : '✅ Maintenance Mode Disabled')
    .setColor(enable ? '#ff0000' : '#00ff00')
    .setDescription(enable ? 
      'Bot status set to maintenance mode' : 
      'Bot status returned to normal operation'
    )
    .setTimestamp();

  await interaction.editReply({ embeds: [embed] });
}

async function handleRestart(interaction, statusManager) {
  statusManager.stop();
  
  // Wait a moment before restarting
  setTimeout(async () => {
    await statusManager.start();
  }, 2000);

  const embed = new EmbedBuilder()
    .setTitle('🔄 StatusManager Restarted')
    .setColor('#ff9500')
    .setDescription('✅ StatusManager has been stopped and will restart in 2 seconds')
    .setTimestamp();

  await interaction.editReply({ embeds: [embed] });
}

async function handleCache(interaction, statusManager) {
  const action = interaction.options.getString('action');

  if (action === 'clear') {
    await statusManager.clearCache();
    const embed = new EmbedBuilder()
      .setTitle('🗑️ Cache Cleared')
      .setColor('#ff0000')
      .setDescription('✅ All caches cleared successfully')
      .setTimestamp();
    await interaction.editReply({ embeds: [embed] });
  } else if (action === 'info') {
    const cacheInfo = statusManager.getCacheInfo();
    const embed = new EmbedBuilder()
      .setTitle('📋 StatusManager Cache Information')
      .setColor('#00ff00')
      .setDescription(cacheInfo)
      .setTimestamp();
    await interaction.editReply({ embeds: [embed] });
  } else {
    const embed = new EmbedBuilder()
      .setTitle('❌ Invalid Cache Action')
      .setColor('#ff0000')
      .setDescription('Please specify a valid cache action: clear or info')
      .setTimestamp();
    await interaction.editReply({ embeds: [embed] });
  }
}

function assessHealth(stats) {
  const performance = stats.performance;
  let score = 100;
  let issues = [];

  // Check error rate
  if (performance.errors > 0) {
    const errorRate = performance.errors / Math.max(performance.statsUpdates, 1);
    if (errorRate > 0.1) {
      score -= 30;
      issues.push('High error rate');
    } else if (errorRate > 0.05) {
      score -= 15;
      issues.push('Moderate error rate');
    }
  }

  // Check update time
  if (performance.avgUpdateTime > 1000) {
    score -= 20;
    issues.push('Slow updates');
  } else if (performance.avgUpdateTime > 500) {
    score -= 10;
    issues.push('Moderate update times');
  }

  // Check if stats are too old
  if (stats.lastUpdated) {
    const ageMinutes = (Date.now() - stats.lastUpdated.getTime()) / 60000;
    if (ageMinutes > 10) {
      score -= 25;
      issues.push('Stale statistics');
    }
  } else {
    score -= 40;
    issues.push('No statistics available');
  }

  // Determine health status
  let status, icon;
  if (score >= 90) {
    status = 'Excellent';
    icon = '🟢';
  } else if (score >= 70) {
    status = 'Good';
    icon = '🟡';
  } else if (score >= 50) {
    status = 'Fair';
    icon = '🟠';
  } else {
    status = 'Poor';
    icon = '🔴';
  }

  return {
    score,
    status,
    icon,
    details: issues.length > 0 ? `Issues: ${issues.join(', ')}` : 'All systems operating normally'
  };
}

function formatNumber(num) {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  } else if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
} 