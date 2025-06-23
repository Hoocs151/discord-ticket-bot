const { EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, PermissionFlagsBits, ModalBuilder, TextInputBuilder, TextInputStyle, InteractionResponseType } = require('discord.js');
const Ticket = require('../models/Ticket');
const GuildConfig = require('../models/GuildConfig');

module.exports = {
  buttons: {
    'create-ticket': handleCreateTicket,
    'close-ticket': handleCloseTicket,
    'confirm-close': handleConfirmClose,
    'cancel-close': handleCancelClose,
    'confirm-delete': handleConfirmDelete,
    'cancel-delete': handleCancelDelete,
    'claim-ticket': handleClaimTicket,
    'delete-ticket': handleDeleteTicket,
    'reopen-ticket': handleReopenTicket,
    // Help buttons
    'help-setup': handleHelpSetup,
    'help-features': handleHelpFeatures,
    'help-support': handleHelpSupport,
    // Admin buttons
    'admin-cancel': handleAdminCancel
  },
  // Export the dynamic handler properly
  handleDynamicButton: handleDynamicButton
};

async function handleCreateTicket(interaction) {
  try {
    // Immediately acknowledge the interaction to prevent timeout
    await interaction.deferReply({ flags: 64 }); // 64 = ephemeral

    // Check if user already has an open ticket
    const existingTicket = await Ticket.findOne({
      guildId: interaction.guildId,
      creatorId: interaction.user.id,
      status: 'OPEN'
    });

    if (existingTicket) {
      return await interaction.editReply({
        content: `You already have an open ticket: <#${existingTicket.channelId}>`
      });
    }

    // Get guild configuration
    const guildConfig = await GuildConfig.findOne({ guildId: interaction.guildId });
    if (!guildConfig) {
      return await interaction.editReply({
        content: 'The ticket system has not been set up yet. Please contact an administrator.'
      });
    }

    // Generate ticket number
    const ticketNumber = guildConfig.ticketCounter + 1;
    const ticketId = `TICKET-${ticketNumber}`;

    try {
      // Create the ticket channel
      const channelName = guildConfig.settings.nameFormat
        .replace('{number}', ticketNumber)
        .replace('{user}', interaction.user.username);

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
        ticketId,
        guildId: interaction.guildId,
        channelId: channel.id,
        creatorId: interaction.user.id,
        subject: 'Quick ticket creation',
        category: 'General'
      });
      await ticket.save();

      // Update ticket counter
      await GuildConfig.updateOne(
        { guildId: interaction.guildId },
        { $inc: { ticketCounter: 1 } }
      );

      // Create welcome embed
      const welcomeEmbed = new EmbedBuilder()
        .setColor('#0099ff')
        .setTitle(`🎫 ${ticketId}`)
        .setDescription(guildConfig.welcomeMessage)
        .addFields(
          { name: '👤 Created by', value: `${interaction.user}` },
          { name: '🕐 Created at', value: `<t:${Math.floor(Date.now() / 1000)}:f>` }
        )
        .setTimestamp();

      // Create action buttons
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

      // Mention all support roles
      const supportRoleMentions = guildConfig.supportRoles.map(roleId => `<@&${roleId}>`).join(' ');

      await channel.send({
        content: `${supportRoleMentions}\nNew ticket from <@${interaction.user.id}>!`,
        embeds: [welcomeEmbed],
        components: [buttons]
      });

      await interaction.editReply({
        content: `✅ Your ticket has been created in ${channel}`
      });
    } catch (error) {
      console.error('Error creating ticket channel:', error);
      await interaction.editReply({
        content: 'There was an error creating your ticket. Please try again later.'
      });
    }
  } catch (error) {
    console.error('Error in handleCreateTicket:', error);
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content: 'There was an error processing your request. Please try again later.',
        flags: 64 // ephemeral
      });
    } else if (interaction.deferred) {
      await interaction.editReply({
        content: 'There was an error processing your request. Please try again later.'
      });
    }
  }
}

async function handleCloseTicket(interaction) {
  try {
    // Defer reply immediately
    await interaction.deferReply({ flags: 64 }); // ephemeral

    const ticket = await Ticket.findOne({
      channelId: interaction.channel.id,
      status: 'OPEN'
    });

    if (!ticket) {
      return await interaction.editReply({
        content: 'This is not an open ticket channel.'
      });
    }

    // Check permissions
    const member = interaction.member;
    const guildConfig = await GuildConfig.findOne({ guildId: interaction.guildId });
    const hasRole = guildConfig.supportRoles.some(roleId => member.roles.cache.has(roleId));
    const isAdmin = member.permissions.has(PermissionFlagsBits.Administrator);
    const isCreator = ticket.creatorId === interaction.user.id;

    if (!hasRole && !isAdmin && !isCreator) {
      return await interaction.editReply({
        content: 'You do not have permission to close this ticket.'
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

    await interaction.editReply({
      content: 'Are you sure you want to close this ticket?',
      components: [row]
    });
  } catch (error) {
    console.error('Error in handleCloseTicket:', error);
    if (interaction.deferred) {
      await interaction.editReply({
        content: 'An error occurred while closing the ticket. Please try again.'
      });
    }
  }
}

async function handleConfirmClose(interaction) {
  try {
    await interaction.deferReply();

    const ticket = await Ticket.findOne({
      channelId: interaction.channel.id,
      status: 'OPEN'
    });

    if (!ticket) {
      return await interaction.editReply({
        content: 'This ticket has already been closed.'
      });
    }

    // Update ticket status
    ticket.status = 'CLOSED';
    ticket.closedAt = new Date();
    ticket.closedBy = interaction.user.id;
    await ticket.save();

    // Create transcript
    const messages = await interaction.channel.messages.fetch();
    const transcript = messages.reverse().map(m => {
      return `[${m.createdAt.toISOString()}] ${m.author.tag}: ${m.content}`;
    }).join('\n');

    ticket.transcript = transcript;
    await ticket.save();

    // Send transcript to designated channel if configured
    const guildConfig = await GuildConfig.findOne({ guildId: interaction.guildId });
    if (guildConfig?.transcriptChannel) {
      try {
        const transcriptChannel = await interaction.guild.channels.fetch(guildConfig.transcriptChannel);
        if (transcriptChannel) {
          const transcriptEmbed = new EmbedBuilder()
            .setColor('#ff9900')
            .setTitle(`📋 Ticket Transcript - #${ticket.ticketId}`)
            .setDescription(`Ticket closed by ${interaction.user.tag}`)
            .addFields(
              { name: '👤 Creator', value: `<@${ticket.creatorId}>` },
              { name: '🕐 Created At', value: `<t:${Math.floor(ticket.createdAt.getTime() / 1000)}:f>` },
              { name: '🔒 Closed At', value: `<t:${Math.floor(ticket.closedAt.getTime() / 1000)}:f>` }
            );

          await transcriptChannel.send({
            embeds: [transcriptEmbed],
            files: [{
              name: `transcript-${ticket.ticketId}.txt`,
              attachment: Buffer.from(transcript)
            }]
          });
        }
      } catch (error) {
        console.error('Error sending transcript:', error);
      }
    }

    // Update channel permissions
    await interaction.channel.permissionOverwrites.edit(ticket.creatorId, {
      ViewChannel: false,
      SendMessages: false
    });

    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('delete-ticket')
          .setLabel('Delete Ticket')
          .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
          .setCustomId('reopen-ticket')
          .setLabel('Reopen Ticket')
          .setStyle(ButtonStyle.Success)
      );

    const closeEmbed = new EmbedBuilder()
      .setColor('#ff9900')
      .setTitle('🔒 Ticket Closed')
      .setDescription(`Ticket closed by ${interaction.user}`)
      .setTimestamp();

    await interaction.editReply({
      embeds: [closeEmbed],
      components: [row]
    });
  } catch (error) {
    console.error('Error in handleConfirmClose:', error);
    await interaction.editReply({
      content: 'An error occurred while closing the ticket. Please try again.'
    });
  }
}

async function handleCancelClose(interaction) {
  await interaction.reply({
    content: 'Ticket close operation cancelled.',
    ephemeral: true
  });
}

async function handleConfirmDelete(interaction) {
  const ticket = await Ticket.findOne({
    channelId: interaction.channel.id
  });

  if (!ticket) {
    return interaction.reply({
      content: 'This ticket channel has already been deleted.',
      ephemeral: true
    });
  }

  // Update ticket status
  ticket.status = 'DELETED';
  await ticket.save();

  await interaction.reply({
    content: 'This ticket will be deleted in 5 seconds...',
    ephemeral: true
  });

  // Delete the channel after 5 seconds
  setTimeout(async () => {
    try {
      await interaction.channel.delete();
    } catch (error) {
      console.error('Error deleting ticket channel:', error);
    }
  }, 5000);
}

async function handleCancelDelete(interaction) {
  await interaction.reply({
    content: 'Ticket deletion cancelled.',
    ephemeral: true
  });
}

async function handleClaimTicket(interaction) {
  try {
    const ticket = await Ticket.findOne({
      channelId: interaction.channel.id,
      status: 'OPEN'
    });

    if (!ticket) {
      return interaction.reply({
        content: 'This is not an open ticket.',
        ephemeral: true
      });
    }

    // Check if ticket is already claimed
    if (ticket.claimedBy) {
      return interaction.reply({
        content: `This ticket has already been claimed by <@${ticket.claimedBy}>.`,
        ephemeral: true
      });
    }

    // Get guild configuration
    const guildConfig = await GuildConfig.findOne({ guildId: interaction.guildId });
    if (!guildConfig || !guildConfig.supportRoles || guildConfig.supportRoles.length === 0) {
      return interaction.reply({
        content: 'The ticket system has not been properly configured. Please contact an administrator.',
        ephemeral: true
      });
    }

    // Check if user has any of the support roles
    const hasRole = guildConfig.supportRoles.some(roleId => 
      interaction.member.roles.cache.has(roleId)
    );

    // Also allow administrators to claim tickets
    const isAdmin = interaction.member.permissions.has(PermissionFlagsBits.Administrator);

    if (!hasRole && !isAdmin) {
      return interaction.reply({
        content: 'You need a support role to claim tickets.',
        ephemeral: true
      });
    }

    // Update ticket in database
    ticket.claimedBy = interaction.user.id;
    ticket.claimedAt = new Date();
    await ticket.save();

    const embed = new EmbedBuilder()
      .setColor('#00ff00')
      .setTitle('Ticket Claimed')
      .setDescription(`This ticket has been claimed by ${interaction.user}`)
      .setTimestamp();

    await interaction.reply({
      embeds: [embed]
    });

    // Update ticket embed to show who claimed it
    const messages = await interaction.channel.messages.fetch({ limit: 1 });
    const firstMessage = messages.first();
    if (firstMessage && firstMessage.embeds.length > 0) {
      const originalEmbed = firstMessage.embeds[0];
      const updatedEmbed = EmbedBuilder.from(originalEmbed)
        .addFields({ 
          name: 'Claimed By', 
          value: `${interaction.user} at ${new Date().toLocaleString()}` 
        });

      await firstMessage.edit({
        embeds: [updatedEmbed]
      });
    }

    // Update channel permissions to give claimer special access
    await interaction.channel.permissionOverwrites.edit(interaction.user.id, {
      ViewChannel: true,
      SendMessages: true,
      ManageMessages: true,
      AttachFiles: true
    });

  } catch (error) {
    console.error('Error in handleClaimTicket:', error);
    return interaction.reply({
      content: 'An error occurred while claiming the ticket. Please try again.',
      ephemeral: true
    });
  }
}

async function handleDeleteTicket(interaction) {
  try {
    // Check permissions
    const member = interaction.member;
    const guildConfig = await GuildConfig.findOne({ guildId: interaction.guildId });
    const hasRole = guildConfig.supportRoles.some(roleId => member.roles.cache.has(roleId));
    const isAdmin = member.permissions.has(PermissionFlagsBits.Administrator);

    if (!hasRole && !isAdmin) {
      return interaction.reply({
        content: 'You do not have permission to delete tickets.',
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

    await interaction.reply({
      content: 'Are you sure you want to permanently delete this ticket? This action cannot be undone.',
      components: [row],
      ephemeral: true
    });
  } catch (error) {
    console.error('Error in handleDeleteTicket:', error);
    await interaction.reply({
      content: 'An error occurred while processing the delete request. Please try again.',
      ephemeral: true
    });
  }
}

async function handleReopenTicket(interaction) {
  try {
    const ticket = await Ticket.findOne({
      channelId: interaction.channel.id,
      status: 'CLOSED'
    });

    if (!ticket) {
      return interaction.reply({
        content: 'This ticket cannot be reopened.',
        ephemeral: true
      });
    }

    // Check permissions
    const member = interaction.member;
    const guildConfig = await GuildConfig.findOne({ guildId: interaction.guildId });
    const hasRole = guildConfig.supportRoles.some(roleId => member.roles.cache.has(roleId));
    const isAdmin = member.permissions.has(PermissionFlagsBits.Administrator);

    if (!hasRole && !isAdmin) {
      return interaction.reply({
        content: 'You do not have permission to reopen tickets.',
        ephemeral: true
      });
    }

    if (!guildConfig.settings.allowReopen) {
      return interaction.reply({
        content: 'Reopening tickets is not allowed on this server.',
        ephemeral: true
      });
    }

    // Update ticket status
    ticket.status = 'OPEN';
    ticket.closedAt = null;
    ticket.closedBy = null;
    await ticket.save();

    // Restore permissions for the ticket creator
    await interaction.channel.permissionOverwrites.edit(ticket.creatorId, {
      ViewChannel: true,
      SendMessages: true
    });

    const reopenEmbed = new EmbedBuilder()
      .setColor('#00ff00')
      .setTitle('Ticket Reopened')
      .setDescription(`Ticket reopened by ${interaction.user}`)
      .setTimestamp();

    // Add close and claim buttons
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

    await interaction.reply({
      embeds: [reopenEmbed],
      components: [buttons]
    });

    // Notify the ticket creator
    await interaction.channel.send({
      content: `<@${ticket.creatorId}>, your ticket has been reopened by ${interaction.user}.`
    });
  } catch (error) {
    console.error('Error in handleReopenTicket:', error);
    await interaction.reply({
      content: 'An error occurred while reopening the ticket. Please try again.',
      ephemeral: true
    });
  }
}

async function handleHelpSetup(interaction) {
  const setupEmbed = new EmbedBuilder()
    .setColor('#0099ff')
    .setTitle('🔧 Setup Guide')
    .setDescription('Follow these steps to set up the ticket system:')
    .addFields(
      {
        name: '1️⃣ Initial Setup',
        value: 'Run `/ticket-setup` to start the setup wizard. This will:\n• Create or select a ticket category\n• Set up transcript channel (optional)\n• Configure support roles',
        inline: false
      },
      {
        name: '2️⃣ Configuration',
        value: 'Customize settings with `/ticket-admin auto-close` to:\n• Enable/disable auto-close\n• Set inactivity timeout\n• Configure ticket limits',
        inline: false
      },
      {
        name: '3️⃣ Permissions',
        value: 'Ensure the bot has these permissions:\n• Manage Channels\n• Manage Roles\n• View Channels\n• Send Messages\n• Manage Messages\n• Embed Links\n• Attach Files',
        inline: false
      },
      {
        name: '4️⃣ Testing',
        value: 'Test the system by:\n• Creating a ticket with the button\n• Claiming a ticket as support staff\n• Closing and reopening tickets',
        inline: false
      }
    )
    .setFooter({ text: 'Need help? Contact your server administrator' })
    .setTimestamp();

  await interaction.reply({ embeds: [setupEmbed], ephemeral: true });
}

async function handleHelpFeatures(interaction) {
  const featuresEmbed = new EmbedBuilder()
    .setColor('#0099ff')
    .setTitle('🎨 Bot Features')
    .setDescription('Comprehensive ticket management system features:')
    .addFields(
      {
        name: '🎫 Ticket Management',
        value: '• Create tickets with custom subjects\n• Automatic ticket numbering\n• Ticket claiming system\n• Close and reopen tickets\n• Delete tickets permanently',
        inline: true
      },
      {
        name: '👥 User Experience',
        value: '• Personal ticket lists\n• Ticket information display\n• Activity tracking\n• Permission-based access\n• DM notifications',
        inline: true
      },
      {
        name: '📊 Analytics & Reporting',
        value: '• Server ticket statistics\n• User ticket analytics\n• Performance metrics\n• Export functionality\n• Activity tracking',
        inline: false
      },
      {
        name: '🛠️ Admin Tools',
        value: '• Force close tickets\n• Transfer ownership\n• Bulk operations\n• Auto-close configuration\n• Database cleanup',
        inline: true
      },
      {
        name: '⚙️ Automation',
        value: '• Auto-close inactive tickets\n• Transcript generation\n• Permission management\n• Role-based access\n• Activity monitoring',
        inline: true
      },
      {
        name: '🔒 Security & Privacy',
        value: '• Role-based permissions\n• Private ticket channels\n• Secure transcript storage\n• Admin oversight\n• Audit logging',
        inline: false
      }
    )
    .setFooter({ text: 'Advanced Discord ticket management' })
    .setTimestamp();

  await interaction.reply({ embeds: [featuresEmbed], ephemeral: true });
}

async function handleHelpSupport(interaction) {
  const supportEmbed = new EmbedBuilder()
    .setColor('#00ff00')
    .setTitle('💡 Support & Resources')
    .setDescription('Get help and learn more about the ticket system:')
    .addFields(
      {
        name: '📚 Quick Commands',
        value: '• `/help` - Show this help menu\n• `/ticket create` - Create a new ticket\n• `/ticket list` - View your tickets\n• `/stats server` - Server statistics\n• `/ticket-setup` - Initial setup',
        inline: false
      },
      {
        name: '🔧 Troubleshooting',
        value: '• **Bot not responding?** Check permissions\n• **Can\'t create tickets?** Verify setup completion\n• **Missing transcripts?** Check transcript channel\n• **Auto-close issues?** Review timeout settings',
        inline: false
      },
      {
        name: '⚡ Pro Tips',
        value: '• Use descriptive ticket subjects\n• Claim tickets for faster response\n• Check statistics regularly\n• Use admin commands for management\n• Export data for external analysis',
        inline: false
      },
      {
        name: '🌟 Best Practices',
        value: '• Set reasonable ticket limits per user\n• Configure auto-close for inactive tickets\n• Regularly clean up old deleted tickets\n• Train support staff on commands\n• Monitor server statistics',
        inline: false
      }
    )
    .setFooter({ text: 'Ticket Bot v2.0 | Professional Discord Support' })
    .setTimestamp();

  await interaction.reply({ embeds: [supportEmbed], ephemeral: true });
}

async function handleAdminCancel(interaction) {
  await interaction.reply({
    content: '❌ Operation cancelled.',
    ephemeral: true
  });
}

async function handleAdminForceClose(interaction, channelId) {
  try {
    const channel = await interaction.guild.channels.fetch(channelId);
    if (!channel) {
      return interaction.reply({
        content: 'Channel not found.',
        ephemeral: true
      });
    }

    const ticket = await Ticket.findOne({
      channelId: channelId,
      status: 'OPEN'
    });

    if (!ticket) {
      return interaction.reply({
        content: 'This ticket is no longer open.',
        ephemeral: true
      });
    }

    // Update ticket status
    ticket.status = 'CLOSED';
    ticket.closedAt = new Date();
    ticket.closedBy = interaction.user.id;
    await ticket.save();

    // Create transcript
    const messages = await channel.messages.fetch({ limit: 100 });
    const transcript = messages.reverse().map(m => {
      return `[${m.createdAt.toISOString()}] ${m.author.tag}: ${m.content}`;
    }).join('\n');

    ticket.transcript = transcript;
    await ticket.save();

    // Send transcript to designated channel if configured
    const guildConfig = await GuildConfig.findOne({ guildId: interaction.guildId });
    if (guildConfig?.transcriptChannel) {
      try {
        const transcriptChannel = await interaction.guild.channels.fetch(guildConfig.transcriptChannel);
        if (transcriptChannel) {
          const transcriptEmbed = new EmbedBuilder()
            .setColor('#ff9900')
            .setTitle(`📋 Force Closed Ticket - ${ticket.ticketId}`)
            .setDescription(`Ticket force closed by admin ${interaction.user.tag}`)
            .addFields(
              { name: 'Creator', value: `<@${ticket.creatorId}>` },
              { name: 'Subject', value: ticket.subject },
              { name: 'Created At', value: new Date(ticket.createdAt).toLocaleString() },
              { name: 'Closed At', value: new Date(ticket.closedAt).toLocaleString() }
            );

          await transcriptChannel.send({
            embeds: [transcriptEmbed],
            files: [{
              name: `transcript-${ticket.ticketId}.txt`,
              attachment: Buffer.from(transcript)
            }]
          });
        }
      } catch (error) {
        console.error('Error sending transcript:', error);
      }
    }

    // Update channel permissions
    await channel.permissionOverwrites.edit(ticket.creatorId, {
      ViewChannel: false,
      SendMessages: false
    });

    // Send message to ticket channel
    const closeEmbed = new EmbedBuilder()
      .setColor('#ff0000')
      .setTitle('🔒 Ticket Force Closed')
      .setDescription(`This ticket has been force closed by administrator ${interaction.user}`)
      .setTimestamp();

    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('delete-ticket')
          .setLabel('Delete Ticket')
          .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
          .setCustomId('reopen-ticket')
          .setLabel('Reopen Ticket')
          .setStyle(ButtonStyle.Success)
      );

    await channel.send({
      embeds: [closeEmbed],
      components: [row]
    });

    await interaction.reply({
      content: `✅ Ticket **${ticket.ticketId}** has been force closed successfully.`,
      ephemeral: true
    });

  } catch (error) {
    console.error('Error in handleAdminForceClose:', error);
    await interaction.reply({
      content: 'An error occurred while force closing the ticket.',
      ephemeral: true
    });
  }
}

// Dynamic button handler for unknown buttons
async function handleDynamicButton(interaction) {
  const customId = interaction.customId;
  
  try {
    // Handle admin force-close buttons
    if (customId.startsWith('admin-force-close-')) {
      const channelId = customId.replace('admin-force-close-', '');
      return await handleAdminForceClose(interaction, channelId);
    }
    
    // Handle unknown buttons that might come from other components
    switch (customId) {
      case 'select_category':
        await interaction.reply({
          content: '📂 **Category Selection**\n\nThis feature is currently under development. For now, please use:\n• `/ticket create` to create a ticket\n• `/settings categories list` to view available categories',
          flags: 64 // ephemeral
        });
        return true;
        
      case 'yes_transcript':
        await interaction.reply({
          content: '📋 **Transcripts Enabled**\n\nTranscripts are automatically generated and saved for all closed tickets. You don\'t need to do anything - they\'re handled automatically!',
          flags: 64 // ephemeral
        });
        return true;
        
      case 'create_role':
        await interaction.reply({
          content: '👥 **Create Support Role**\n\nTo create support roles:\n1. Go to **Server Settings** → **Roles**\n2. Create a new role (e.g., "Support Team")\n3. Run `/ticket-setup` and add the role\n4. Or use `/settings` to configure roles',
          flags: 64 // ephemeral
        });
        return true;
        
      case 'setup_transcript':
        await interaction.reply({
          content: '📋 **Setup Transcript Channel**\n\nTo setup transcript logging:\n1. Create a text channel for transcripts\n2. Run `/ticket-setup`\n3. Select the transcript channel when prompted\n4. All closed tickets will be logged there',
          flags: 64 // ephemeral
        });
        return true;
        
      case 'config_auto_close':
        await interaction.reply({
          content: '⏰ **Auto-Close Configuration**\n\nTo configure auto-close:\n• Use `/settings automation auto-close`\n• Set inactivity timeout (hours)\n• Choose priorities to exclude\n• Enable/disable as needed',
          flags: 64 // ephemeral
        });
        return true;
        
      default:
        // Log unknown button for debugging
        console.log(`Unknown button interaction: ${customId} from user ${interaction.user.tag}`);
        return false; // Not handled
    }
  } catch (error) {
    console.error(`Error handling dynamic button ${customId}:`, error);
    try {
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({
          content: '❌ There was an error processing this action. Please try again or contact an administrator.',
          flags: 64 // ephemeral
        });
      }
    } catch (e) {
      console.error('Error sending error message:', e);
    }
    return true; // Mark as handled even if there was an error
  }
} 