const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, ComponentType, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } = require('discord.js');
const GuildConfig = require('../models/GuildConfig');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ticket-setup')
    .setDescription('Setup the ticket system')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    try {
      // Kiểm tra quyền bot
      const botMember = await interaction.guild.members.fetchMe();
      const requiredPermissions = [
        PermissionFlagsBits.ManageChannels,
        PermissionFlagsBits.ManageRoles,
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ManageMessages,
        PermissionFlagsBits.EmbedLinks,
        PermissionFlagsBits.AttachFiles
      ];

      const missingPermissions = requiredPermissions.filter(perm => !botMember.permissions.has(perm));
      if (missingPermissions.length > 0) {
        return interaction.reply({
          content: `I need the following permissions to function properly:\n${missingPermissions.map(p => `\`${p}\``).join(', ')}`,
          ephemeral: true
        });
      }

      let guildConfig = await GuildConfig.findOne({ guildId: interaction.guildId });
      
      if (!guildConfig) {
        guildConfig = new GuildConfig({ 
          guildId: interaction.guildId,
          ticketCounter: 0,
          settings: {
            maxOpenTickets: 1,
            allowReopen: true,
            requireTopic: true,
            nameFormat: 'ticket-{number}'
          }
        });
      }

      // Step 1: Category Selection
      const categoryEmbed = new EmbedBuilder()
        .setColor('#0099ff')
        .setTitle('Ticket System Setup - Step 1')
        .setDescription('Please select a category for ticket channels.\nYou can either:\n1️⃣ Select an existing category\n2️⃣ Create a new category');

      const categoryButtons = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId('select_category')
            .setLabel('Select Existing')
            .setStyle(ButtonStyle.Primary)
            .setEmoji('1️⃣'),
          new ButtonBuilder()
            .setCustomId('create_category')
            .setLabel('Create New')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('2️⃣')
        );

      const initialMessage = await interaction.reply({
        embeds: [categoryEmbed],
        components: [categoryButtons],
        fetchReply: true,
        ephemeral: true
      });

      try {
        const categoryResponse = await initialMessage.awaitMessageComponent({
          filter: i => i.user.id === interaction.user.id,
          time: 60000
        });

        await categoryResponse.deferUpdate();

        if (categoryResponse.customId === 'create_category') {
          // Kiểm tra giới hạn số lượng category
          if (interaction.guild.channels.cache.filter(c => c.type === ChannelType.GuildCategory).size >= 50) {
            return interaction.editReply({
              content: 'This server has reached the maximum number of categories. Please delete some categories first.',
              components: [],
              embeds: []
            });
          }

          const newCategory = await interaction.guild.channels.create({
            name: 'TICKETS',
            type: ChannelType.GuildCategory,
            permissionOverwrites: [
              {
                id: interaction.guild.id,
                deny: [PermissionFlagsBits.ViewChannel]
              },
              {
                id: botMember.id,
                allow: [
                  PermissionFlagsBits.ViewChannel,
                  PermissionFlagsBits.SendMessages,
                  PermissionFlagsBits.ManageChannels,
                  PermissionFlagsBits.ManageMessages
                ]
              }
            ]
          });
          guildConfig.ticketCategory = newCategory.id;
          await proceedToTranscriptSetup(interaction, guildConfig);
        } else {
          const categories = interaction.guild.channels.cache
            .filter(c => c.type === ChannelType.GuildCategory)
            .sort((a, b) => a.position - b.position)
            .map(c => ({
              label: c.name.slice(0, 25),
              value: c.id,
              description: `${c.children?.size || 0} channels`
            }));

          if (categories.length === 0) {
            const newCategory = await interaction.guild.channels.create({
              name: 'TICKETS',
              type: ChannelType.GuildCategory,
              permissionOverwrites: [
                {
                  id: interaction.guild.id,
                  deny: [PermissionFlagsBits.ViewChannel]
                },
                {
                  id: botMember.id,
                  allow: [
                    PermissionFlagsBits.ViewChannel,
                    PermissionFlagsBits.SendMessages,
                    PermissionFlagsBits.ManageChannels,
                    PermissionFlagsBits.ManageMessages
                  ]
                }
              ]
            });
            guildConfig.ticketCategory = newCategory.id;
            await proceedToTranscriptSetup(interaction, guildConfig);
          } else {
            const selectMenu = new ActionRowBuilder()
              .addComponents(
                new StringSelectMenuBuilder()
                  .setCustomId('category_select')
                  .setPlaceholder('Select a category')
                  .addOptions(categories)
              );

            await interaction.editReply({
              content: 'Please select a category:',
              embeds: [],
              components: [selectMenu]
            });

            const categorySelection = await initialMessage.awaitMessageComponent({
              filter: i => i.user.id === interaction.user.id,
              time: 60000
            });

            await categorySelection.deferUpdate();
            guildConfig.ticketCategory = categorySelection.values[0];
            await proceedToTranscriptSetup(interaction, guildConfig);
          }
        }
      } catch (error) {
        if (error.code === 'INTERACTION_COLLECTOR_ERROR') {
          await interaction.editReply({
            content: 'Setup timed out. Please try again.',
            components: [],
            embeds: []
          });
        } else {
          console.error('Category setup error:', error);
          await interaction.editReply({
            content: 'An error occurred during category setup. Please try again.',
            components: [],
            embeds: []
          });
        }
      }
    } catch (error) {
      console.error('Setup error:', error);
      const reply = {
        content: 'An error occurred during setup. Please try again.',
        components: [],
        embeds: []
      };

      if (!interaction.replied) {
        await interaction.reply({ ...reply, ephemeral: true });
      } else {
        await interaction.editReply(reply);
      }
    }
  }
};

async function proceedToTranscriptSetup(interaction, guildConfig) {
  const transcriptEmbed = new EmbedBuilder()
    .setColor('#0099ff')
    .setTitle('Ticket System Setup - Step 2')
    .setDescription('Would you like to set up a transcript channel?\nTranscripts will be saved when tickets are closed.');

  const transcriptButtons = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('yes_transcript')
        .setLabel('Yes')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId('no_transcript')
        .setLabel('No')
        .setStyle(ButtonStyle.Secondary)
    );

  await interaction.editReply({
    embeds: [transcriptEmbed],
    components: [transcriptButtons]
  });

  try {
    const transcriptResponse = await interaction.channel.awaitMessageComponent({
      filter: i => i.user.id === interaction.user.id && i.message.interaction.id === interaction.id,
      time: 60000
    });

    await transcriptResponse.deferUpdate();

    if (transcriptResponse.customId === 'yes_transcript') {
      // Kiểm tra giới hạn kênh
      if (interaction.guild.channels.cache.filter(c => c.type === ChannelType.GuildText).size >= 500) {
        await interaction.editReply({
          content: 'This server has reached the maximum number of text channels. Skipping transcript channel creation.',
          components: []
        });
        await new Promise(resolve => setTimeout(resolve, 3000));
        await proceedToRoleSetup(interaction, guildConfig);
        return;
      }

      const transcriptChannel = await interaction.guild.channels.create({
        name: 'ticket-logs',
        type: ChannelType.GuildText,
        parent: guildConfig.ticketCategory,
        permissionOverwrites: [
          {
            id: interaction.guild.id,
            deny: [PermissionFlagsBits.ViewChannel]
          },
          {
            id: interaction.user.id,
            allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ReadMessageHistory]
          }
        ],
        topic: 'Ticket system transcripts and logs'
      });
      guildConfig.transcriptChannel = transcriptChannel.id;
    }

    await proceedToRoleSetup(interaction, guildConfig);
  } catch (error) {
    if (error.code === 'INTERACTION_COLLECTOR_ERROR') {
      await interaction.editReply({
        content: 'Setup timed out. Please try again.',
        components: [],
        embeds: []
      });
    } else {
      console.error('Transcript setup error:', error);
      await interaction.editReply({
        content: 'An error occurred during transcript setup. Please try again.',
        components: [],
        embeds: []
      });
    }
  }
}

async function proceedToRoleSetup(interaction, guildConfig) {
  const roleEmbed = new EmbedBuilder()
    .setColor('#0099ff')
    .setTitle('Ticket System Setup - Step 3')
    .setDescription('Would you like to create a new support role or use an existing one?');

  const roleButtons = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('create_role')
        .setLabel('Create New')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('select_role')
        .setLabel('Select Existing')
        .setStyle(ButtonStyle.Secondary)
    );

  await interaction.editReply({
    embeds: [roleEmbed],
    components: [roleButtons]
  });

  try {
    const roleResponse = await interaction.channel.awaitMessageComponent({
      filter: i => i.user.id === interaction.user.id && i.message.interaction.id === interaction.id,
      time: 60000
    });

    await roleResponse.deferUpdate();

    if (roleResponse.customId === 'create_role') {
      // Kiểm tra giới hạn role
      if (interaction.guild.roles.cache.size >= 250) {
        await interaction.editReply({
          content: 'This server has reached the maximum number of roles. Please select an existing role.',
          components: []
        });
        await new Promise(resolve => setTimeout(resolve, 3000));
        await proceedToRoleSetup(interaction, guildConfig);
        return;
      }

      const supportRole = await interaction.guild.roles.create({
        name: 'Ticket Support',
        color: '#00ff00',
        permissions: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.ReadMessageHistory,
          PermissionFlagsBits.EmbedLinks,
          PermissionFlagsBits.AttachFiles
        ],
        reason: 'Ticket system support role'
      });
      guildConfig.supportRoles = [supportRole.id];
      await finishSetup(interaction, guildConfig);
    } else {
      // Filter and sort roles
      const roles = interaction.guild.roles.cache
        .filter(r => 
          // Exclude @everyone and managed roles (bot roles, integration roles)
          r.id !== interaction.guild.id && 
          !r.managed &&
          // Only include roles that can view channels and send messages
          r.permissions.has([
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages
          ])
        )
        .sort((a, b) => b.position - a.position) // Sort by position (highest first)
        .first(25) // Take only first 25 roles
        .map(r => ({
          label: r.name.slice(0, 25),
          value: r.id,
          description: `Members: ${interaction.guild.members.cache.filter(m => m.roles.cache.has(r.id)).size}`
        }));

      if (roles.length === 0) {
        // If no suitable roles found, create a new one
        const supportRole = await interaction.guild.roles.create({
          name: 'Ticket Support',
          color: '#00ff00',
          permissions: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.ReadMessageHistory,
            PermissionFlagsBits.EmbedLinks,
            PermissionFlagsBits.AttachFiles
          ],
          reason: 'Ticket system support role'
        });
        guildConfig.supportRoles = [supportRole.id];
        
        await interaction.editReply({
          content: 'No suitable roles found. Created new Ticket Support role.',
          embeds: [],
          components: []
        });
        
        await finishSetup(interaction, guildConfig);
      } else {
        const roleSelect = new ActionRowBuilder()
          .addComponents(
            new StringSelectMenuBuilder()
              .setCustomId('role_select')
              .setPlaceholder('Select support role')
              .addOptions(roles)
          );

        await interaction.editReply({
          content: roles.length === 25 
            ? 'Showing top 25 roles with required permissions. Create a new role if needed.'
            : 'Select a role to handle tickets:',
          embeds: [],
          components: [roleSelect]
        });

        const roleSelection = await interaction.channel.awaitMessageComponent({
          filter: i => i.user.id === interaction.user.id && i.message.interaction.id === interaction.id,
          time: 60000
        });

        await roleSelection.deferUpdate();
        guildConfig.supportRoles = [roleSelection.values[0]];
        await finishSetup(interaction, guildConfig);
      }
    }
  } catch (error) {
    if (error.code === 'INTERACTION_COLLECTOR_ERROR') {
      await interaction.editReply({
        content: 'Setup timed out. Please try again.',
        components: [],
        embeds: []
      });
    } else {
      console.error('Role setup error:', error);
      await interaction.editReply({
        content: 'An error occurred during role setup. Please try again.',
        components: [],
        embeds: []
      });
    }
  }
}

async function finishSetup(interaction, guildConfig) {
  try {
    // Save configuration
    await guildConfig.save();

    // Create ticket panel
    const panelChannel = await interaction.guild.channels.create({
      name: 'create-ticket',
      type: ChannelType.GuildText,
      parent: guildConfig.ticketCategory,
      permissionOverwrites: [
        {
          id: interaction.guild.id,
          allow: [PermissionFlagsBits.ViewChannel],
          deny: [PermissionFlagsBits.SendMessages]
        }
      ],
      topic: 'Click the button below to create a support ticket'
    });

    const panelEmbed = new EmbedBuilder()
      .setColor('#0099ff')
      .setTitle('🎫 Support Ticket System')
      .setDescription('Need help? Click the button below to create a support ticket!')
      .addFields(
        { name: 'Guidelines', value: '• One ticket per issue\n• Be patient and respectful\n• Provide clear information' }
      )
      .setFooter({ text: 'Ticket System v1.0' });

    const button = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('create-ticket')
          .setLabel('Create Ticket')
          .setStyle(ButtonStyle.Primary)
          .setEmoji('🎫')
      );

    await panelChannel.send({
      embeds: [panelEmbed],
      components: [button]
    });

    // Final success message
    const successEmbed = new EmbedBuilder()
      .setColor('#00ff00')
      .setTitle('Setup Complete!')
      .setDescription('The ticket system has been successfully configured.')
      .addFields(
        { name: 'Category', value: `<#${guildConfig.ticketCategory}>`, inline: true },
        { name: 'Transcript Channel', value: guildConfig.transcriptChannel ? `<#${guildConfig.transcriptChannel}>` : 'Not set', inline: true },
        { name: 'Support Role', value: `<@&${guildConfig.supportRoles[0]}>`, inline: true },
        { name: 'Panel Channel', value: `<#${panelChannel.id}>`, inline: true }
      )
      .setTimestamp();

    await interaction.editReply({
      embeds: [successEmbed],
      components: []
    });
  } catch (error) {
    console.error('Error in finishSetup:', error);
    await interaction.editReply({
      content: 'An error occurred while finishing setup. Please try again.',
      components: [],
      embeds: []
    });
  }
} 