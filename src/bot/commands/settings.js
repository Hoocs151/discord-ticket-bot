const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const GuildConfig = require('../models/GuildConfig');
const ValidationUtils = require('../utils/validation');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('settings')
    .setDescription('Configure ticket system settings')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommandGroup(group =>
      group
        .setName('categories')
        .setDescription('Manage ticket categories')
        .addSubcommand(subcommand =>
          subcommand
            .setName('list')
            .setDescription('List all ticket categories'))
        .addSubcommand(subcommand =>
          subcommand
            .setName('create')
            .setDescription('Create a new ticket category')
            .addStringOption(option =>
              option
                .setName('name')
                .setDescription('Category name')
                .setRequired(true))
            .addStringOption(option =>
              option
                .setName('description')
                .setDescription('Category description')
                .setRequired(false))
            .addStringOption(option =>
              option
                .setName('emoji')
                .setDescription('Category emoji')
                .setRequired(false))
            .addStringOption(option =>
              option
                .setName('priority')
                .setDescription('Default priority for this category')
                .setRequired(false)
                .addChoices(
                  { name: 'Low', value: 'low' },
                  { name: 'Medium', value: 'medium' },
                  { name: 'High', value: 'high' },
                  { name: 'Urgent', value: 'urgent' }
                )))
        .addSubcommand(subcommand =>
          subcommand
            .setName('edit')
            .setDescription('Edit an existing category')
            .addStringOption(option =>
              option
                .setName('category')
                .setDescription('Category to edit')
                .setRequired(true))
            .addStringOption(option =>
              option
                .setName('field')
                .setDescription('Field to edit')
                .setRequired(true)
                .addChoices(
                  { name: 'Name', value: 'name' },
                  { name: 'Description', value: 'description' },
                  { name: 'Emoji', value: 'emoji' },
                  { name: 'Priority', value: 'priority' },
                  { name: 'Color', value: 'color' }
                ))
            .addStringOption(option =>
              option
                .setName('value')
                .setDescription('New value')
                .setRequired(true)))
        .addSubcommand(subcommand =>
          subcommand
            .setName('delete')
            .setDescription('Delete a category')
            .addStringOption(option =>
              option
                .setName('category')
                .setDescription('Category to delete')
                .setRequired(true))))
    .addSubcommandGroup(group =>
      group
        .setName('automation')
        .setDescription('Configure automation settings')
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
                .setDescription('Hours of inactivity before auto-close')
                .setRequired(false)
                .setMinValue(1)
                .setMaxValue(168)))
        .addSubcommand(subcommand =>
          subcommand
            .setName('auto-assign')
            .setDescription('Configure auto-assignment')
            .addBooleanOption(option =>
              option
                .setName('enabled')
                .setDescription('Enable auto-assignment')
                .setRequired(true))
            .addStringOption(option =>
              option
                .setName('method')
                .setDescription('Assignment method')
                .setRequired(false)
                .addChoices(
                  { name: 'Round Robin', value: 'round_robin' },
                  { name: 'Least Active', value: 'least_active' },
                  { name: 'Random', value: 'random' },
                  { name: 'Load Balanced', value: 'load_balanced' }
                ))))
    .addSubcommandGroup(group =>
      group
        .setName('notifications')
        .setDescription('Configure notification settings')
        .addSubcommand(subcommand =>
          subcommand
            .setName('toggle')
            .setDescription('Toggle notification types')
            .addStringOption(option =>
              option
                .setName('type')
                .setDescription('Notification type')
                .setRequired(true)
                .addChoices(
                  { name: 'Ticket Created', value: 'ticket_created' },
                  { name: 'Ticket Claimed', value: 'ticket_claimed' },
                  { name: 'Ticket Closed', value: 'ticket_closed' },
                  { name: 'SLA Breached', value: 'sla_breached' },
                  { name: 'Daily Digest', value: 'daily_digest' },
                  { name: 'Weekly Report', value: 'weekly_report' }
                ))
            .addBooleanOption(option =>
              option
                .setName('enabled')
                .setDescription('Enable or disable')
                .setRequired(true))))
    .addSubcommand(subcommand =>
      subcommand
        .setName('view')
        .setDescription('View current settings'))
    .addSubcommand(subcommand =>
      subcommand
        .setName('reset')
        .setDescription('Reset settings to default')),

  async execute(interaction) {
    const guildConfig = await GuildConfig.findOne({ guildId: interaction.guildId });
    
    if (!guildConfig) {
      return interaction.reply({
        content: 'This server has not been set up for tickets yet. Please use `/ticket-setup` first.',
        ephemeral: true
      });
    }

    const subcommandGroup = interaction.options.getSubcommandGroup();
    const subcommand = interaction.options.getSubcommand();

    if (subcommandGroup === 'categories') {
      return await handleCategoryCommands(interaction, guildConfig, subcommand);
    } else if (subcommandGroup === 'automation') {
      return await handleAutomationCommands(interaction, guildConfig, subcommand);
    } else if (subcommandGroup === 'notifications') {
      return await handleNotificationCommands(interaction, guildConfig, subcommand);
    } else {
      switch (subcommand) {
        case 'view':
          return await handleViewSettings(interaction, guildConfig);
        case 'reset':
          return await handleResetSettings(interaction, guildConfig);
      }
    }
  }
};

async function handleCategoryCommands(interaction, guildConfig, subcommand) {
  switch (subcommand) {
    case 'list':
      return await listCategories(interaction, guildConfig);
    case 'create':
      return await createCategory(interaction, guildConfig);
    case 'edit':
      return await editCategory(interaction, guildConfig);
    case 'delete':
      return await deleteCategory(interaction, guildConfig);
  }
}

async function listCategories(interaction, guildConfig) {
  const categories = guildConfig.ticketCategories || [];
  
  if (categories.length === 0) {
    return interaction.reply({
      content: 'No categories configured. Use `/settings categories create` to add one.',
      ephemeral: true
    });
  }

  const embed = new EmbedBuilder()
    .setColor('#0099ff')
    .setTitle('🗂️ Ticket Categories')
    .setDescription('Current ticket categories configuration');

  categories.forEach((category, index) => {
    const priorityEmoji = getPriorityEmoji(category.priority);
    const statusEmoji = category.enabled ? '✅' : '❌';
    const defaultFlag = category.isDefault ? ' (Default)' : '';
    
    embed.addFields({
      name: `${statusEmoji} ${category.emoji} ${category.name}${defaultFlag}`,
      value: [
        `📝 ${category.description || 'No description'}`,
        `${priorityEmoji} Priority: ${category.priority}`,
        `🎨 Color: ${category.color}`,
        `👥 Support Roles: ${category.supportRoles?.length || 0}`
      ].join('\n'),
      inline: true
    });
  });

  embed.setFooter({ text: `Total: ${categories.length} categories` });

  const buttons = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('category-create')
        .setLabel('Create Category')
        .setStyle(ButtonStyle.Primary)
        .setEmoji('➕'),
      new ButtonBuilder()
        .setCustomId('category-manage')
        .setLabel('Manage Categories')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('⚙️')
    );

  await interaction.reply({
    embeds: [embed],
    components: [buttons],
    ephemeral: true
  });
}

async function createCategory(interaction, guildConfig) {
  const name = interaction.options.getString('name');
  const description = interaction.options.getString('description') || '';
  const emoji = interaction.options.getString('emoji') || '🎫';
  const priority = interaction.options.getString('priority') || 'medium';

  // Validate input
  const nameValidation = ValidationUtils.validateTicketSubject(name);
  if (!nameValidation.valid) {
    const errorEmbed = ValidationUtils.createErrorEmbed('Invalid Category Name', nameValidation.errors);
    return interaction.reply({ embeds: [errorEmbed], ephemeral: true });
  }

  // Check if category already exists
  const existingCategory = guildConfig.getCategoryByName(name);
  if (existingCategory) {
    return interaction.reply({
      content: `❌ A category named "${name}" already exists.`,
      ephemeral: true
    });
  }

  // Create new category
  const newCategory = {
    name: ValidationUtils.sanitizeText(name, 50),
    description: ValidationUtils.sanitizeText(description, 200),
    emoji: emoji,
    priority: priority,
    supportRoles: guildConfig.supportRoles,
    enabled: true,
    isDefault: guildConfig.ticketCategories.length === 0
  };

  guildConfig.ticketCategories.push(newCategory);
  await guildConfig.save();

  const embed = new EmbedBuilder()
    .setColor('#00ff00')
    .setTitle('✅ Category Created')
    .setDescription(`Successfully created category "${name}"`)
    .addFields(
      { name: 'Name', value: newCategory.name, inline: true },
      { name: 'Description', value: newCategory.description || 'None', inline: true },
      { name: 'Priority', value: newCategory.priority, inline: true },
      { name: 'Emoji', value: newCategory.emoji, inline: true },
      { name: 'Default', value: newCategory.isDefault ? 'Yes' : 'No', inline: true }
    )
    .setTimestamp();

  await interaction.reply({ embeds: [embed], ephemeral: true });
}

async function editCategory(interaction, guildConfig) {
  const categoryName = interaction.options.getString('category');
  const field = interaction.options.getString('field');
  const value = interaction.options.getString('value');

  const category = guildConfig.getCategoryByName(categoryName);
  if (!category) {
    return interaction.reply({
      content: `❌ Category "${categoryName}" not found.`,
      ephemeral: true
    });
  }

  // Validate and update field
  switch (field) {
    case 'name':
      const nameValidation = ValidationUtils.validateTicketSubject(value);
      if (!nameValidation.valid) {
        const errorEmbed = ValidationUtils.createErrorEmbed('Invalid Name', nameValidation.errors);
        return interaction.reply({ embeds: [errorEmbed], ephemeral: true });
      }
      category.name = ValidationUtils.sanitizeText(value, 50);
      break;
    case 'description':
      category.description = ValidationUtils.sanitizeText(value, 200);
      break;
    case 'emoji':
      category.emoji = value;
      break;
    case 'priority':
      if (!['low', 'medium', 'high', 'urgent'].includes(value)) {
        return interaction.reply({
          content: '❌ Invalid priority. Must be: low, medium, high, or urgent',
          ephemeral: true
        });
      }
      category.priority = value;
      break;
    case 'color':
      category.color = value;
      break;
  }

  await guildConfig.save();

  const embed = new EmbedBuilder()
    .setColor('#00ff00')
    .setTitle('✅ Category Updated')
    .setDescription(`Successfully updated ${field} for category "${categoryName}"`)
    .addFields(
      { name: 'Field', value: field, inline: true },
      { name: 'New Value', value: value, inline: true }
    )
    .setTimestamp();

  await interaction.reply({ embeds: [embed], ephemeral: true });
}

async function deleteCategory(interaction, guildConfig) {
  const categoryName = interaction.options.getString('category');
  
  const categoryIndex = guildConfig.ticketCategories.findIndex(cat => 
    cat.name.toLowerCase() === categoryName.toLowerCase()
  );
  
  if (categoryIndex === -1) {
    return interaction.reply({
      content: `❌ Category "${categoryName}" not found.`,
      ephemeral: true
    });
  }

  const category = guildConfig.ticketCategories[categoryIndex];
  
  // Don't allow deleting the last category
  if (guildConfig.ticketCategories.length === 1) {
    return interaction.reply({
      content: '❌ Cannot delete the last category. Create another one first.',
      ephemeral: true
    });
  }

  // If deleting default category, make another one default
  if (category.isDefault) {
    const nextCategory = guildConfig.ticketCategories.find((cat, index) => index !== categoryIndex);
    if (nextCategory) {
      nextCategory.isDefault = true;
    }
  }

  guildConfig.ticketCategories.splice(categoryIndex, 1);
  await guildConfig.save();

  const embed = new EmbedBuilder()
    .setColor('#ff9900')
    .setTitle('🗑️ Category Deleted')
    .setDescription(`Successfully deleted category "${categoryName}"`)
    .setTimestamp();

  await interaction.reply({ embeds: [embed], ephemeral: true });
}

async function handleAutomationCommands(interaction, guildConfig, subcommand) {
  switch (subcommand) {
    case 'auto-close':
      return await configureAutoClose(interaction, guildConfig);
    case 'auto-assign':
      return await configureAutoAssign(interaction, guildConfig);
  }
}

async function configureAutoClose(interaction, guildConfig) {
  const enabled = interaction.options.getBoolean('enabled');
  const hours = interaction.options.getInteger('hours') || 24;

  // Ensure automation object exists
  if (!guildConfig.automation) {
    guildConfig.automation = {
      autoClose: {
        enabled: false,
        inactivityTime: 24,
        warningTime: 2,
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
      }
    };
  }

  // Ensure autoClose object exists
  if (!guildConfig.automation.autoClose) {
    guildConfig.automation.autoClose = {
      enabled: false,
      inactivityTime: 24,
      warningTime: 2,
      excludePriorities: []
    };
  }

  guildConfig.automation.autoClose.enabled = enabled;
  guildConfig.automation.autoClose.inactivityTime = hours;
  await guildConfig.save();

  const embed = new EmbedBuilder()
    .setColor(enabled ? '#00ff00' : '#ff9900')
    .setTitle('🕐 Auto-Close Settings Updated')
    .setDescription(enabled 
      ? `Auto-close has been **enabled**. Tickets will be automatically closed after **${hours} hours** of inactivity.`
      : 'Auto-close has been **disabled**.')
    .setTimestamp();

  await interaction.reply({ embeds: [embed], flags: 64 });
}

async function configureAutoAssign(interaction, guildConfig) {
  const enabled = interaction.options.getBoolean('enabled');
  const method = interaction.options.getString('method') || 'round_robin';

  // Ensure automation object exists
  if (!guildConfig.automation) {
    guildConfig.automation = {
      autoClose: {
        enabled: false,
        inactivityTime: 24,
        warningTime: 2,
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
      }
    };
  }

  // Ensure autoAssignment object exists
  if (!guildConfig.automation.autoAssignment) {
    guildConfig.automation.autoAssignment = {
      enabled: false,
      method: 'round_robin',
      excludeOffline: true
    };
  }

  guildConfig.automation.autoAssignment.enabled = enabled;
  guildConfig.automation.autoAssignment.method = method;
  await guildConfig.save();

  const embed = new EmbedBuilder()
    .setColor(enabled ? '#00ff00' : '#ff9900')
    .setTitle('👤 Auto-Assignment Settings Updated')
    .setDescription(enabled 
      ? `Auto-assignment has been **enabled** using **${method}** method.`
      : 'Auto-assignment has been **disabled**.')
    .setTimestamp();

  await interaction.reply({ embeds: [embed], flags: 64 });
}

async function handleNotificationCommands(interaction, guildConfig, subcommand) {
  if (subcommand === 'toggle') {
    const type = interaction.options.getString('type');
    const enabled = interaction.options.getBoolean('enabled');

    const typeMap = {
      'ticket_created': 'ticketCreated',
      'ticket_claimed': 'ticketClaimed', 
      'ticket_closed': 'ticketClosed',
      'sla_breached': 'slaBreached',
      'daily_digest': 'dailyDigest',
      'weekly_report': 'weeklyReport'
    };

    const field = typeMap[type];
    if (field && guildConfig.notifications[field]) {
      guildConfig.notifications[field].enabled = enabled;
      await guildConfig.save();

      const embed = new EmbedBuilder()
        .setColor(enabled ? '#00ff00' : '#ff9900')
        .setTitle('🔔 Notification Settings Updated')
        .setDescription(`${type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())} notifications have been **${enabled ? 'enabled' : 'disabled'}**.`)
        .setTimestamp();

      await interaction.reply({ embeds: [embed], ephemeral: true });
    }
  }
}

async function handleViewSettings(interaction, guildConfig) {
  const embed = new EmbedBuilder()
    .setColor('#0099ff')
    .setTitle('⚙️ Current Settings')
    .setDescription(`Settings for **${interaction.guild.name}**`)
    .addFields(
      {
        name: '🎫 Basic Settings',
        value: [
          `Max Open Tickets: **${guildConfig.settings.maxOpenTickets}**`,
          `Allow Reopen: **${guildConfig.settings.allowReopen ? 'Yes' : 'No'}**`,
          `Require Topic: **${guildConfig.settings.requireTopic ? 'Yes' : 'No'}**`,
          `Name Format: **${guildConfig.settings.nameFormat}**`
        ].join('\n'),
        inline: true
      },
      {
        name: '🔧 Features',
        value: [
          `Priorities: **${guildConfig.settings.enablePriorities ? 'Enabled' : 'Disabled'}**`,
          `Categories: **${guildConfig.settings.enableCategories ? 'Enabled' : 'Disabled'}**`,
          `Workflows: **${guildConfig.settings.enableWorkflows ? 'Enabled' : 'Disabled'}**`,
          `SLA: **${guildConfig.settings.enableSLA ? 'Enabled' : 'Disabled'}**`
        ].join('\n'),
        inline: true
      },
      {
        name: '🤖 Automation',
        value: [
          `Auto-Close: **${guildConfig.automation.autoClose.enabled ? 'Enabled' : 'Disabled'}**`,
          `Auto-Assign: **${guildConfig.automation.autoAssignment.enabled ? 'Enabled' : 'Disabled'}**`,
          `Auto-Escalation: **${guildConfig.automation.autoEscalation.enabled ? 'Enabled' : 'Disabled'}**`
        ].join('\n'),
        inline: true
      }
    )
    .setTimestamp();

  const buttons = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('settings-categories')
        .setLabel('Manage Categories')
        .setStyle(ButtonStyle.Primary)
        .setEmoji('🗂️'),
      new ButtonBuilder()
        .setCustomId('settings-automation')
        .setLabel('Automation')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('🤖'),
      new ButtonBuilder()
        .setCustomId('settings-notifications')
        .setLabel('Notifications')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('🔔')
    );

  await interaction.reply({
    embeds: [embed],
    components: [buttons],
    ephemeral: true
  });
}

async function handleResetSettings(interaction, guildConfig) {
  const confirmButton = new ButtonBuilder()
    .setCustomId('confirm-reset-settings')
    .setLabel('Confirm Reset')
    .setStyle(ButtonStyle.Danger);

  const cancelButton = new ButtonBuilder()
    .setCustomId('cancel-reset-settings')
    .setLabel('Cancel')
    .setStyle(ButtonStyle.Secondary);

  const row = new ActionRowBuilder()
    .addComponents(confirmButton, cancelButton);

  const embed = new EmbedBuilder()
    .setColor('#ff9900')
    .setTitle('⚠️ Reset Settings')
    .setDescription('Are you sure you want to reset all settings to default? This action cannot be undone.')
    .addFields(
      { name: 'What will be reset:', value: '• All categories\n• Automation settings\n• Notification preferences\n• Custom configurations' }
    );

  await interaction.reply({
    embeds: [embed],
    components: [row],
    ephemeral: true
  });
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