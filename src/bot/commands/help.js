const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Shows information about the ticket bot and available commands'),

  async execute(interaction) {
    const helpEmbed = new EmbedBuilder()
      .setColor('#0099ff')
      .setTitle('🎫 Ticket Bot Help')
      .setDescription('Professional Discord ticket management system')
      .addFields(
        {
          name: '🔧 **Setup Commands**',
          value: '`/ticket-setup` - Initial bot setup wizard\n`/settings` - Configure bot settings',
          inline: false
        },
        {
          name: '🎫 **Ticket Commands**',
          value: [
            '`/ticket create` - Create a new ticket',
            '`/ticket close` - Close current ticket',
            '`/ticket reopen` - Reopen a closed ticket',
            '`/ticket delete` - Delete ticket permanently',
            '`/ticket claim` - Claim a ticket (support only)',
            '`/ticket list` - List your tickets',
            '`/ticket info` - Show ticket information'
          ].join('\n'),
          inline: false
        },
        {
          name: '📊 **Statistics Commands**',
          value: '`/stats` - View server ticket statistics\n`/stats user @user` - View user ticket stats',
          inline: false
        },
        {
          name: '🛠️ **Admin Commands**',
          value: [
            '`/ticket-admin list` - List all tickets',
            '`/ticket-admin force-close` - Force close any ticket',
            '`/ticket-admin cleanup` - Clean up deleted tickets',
            '`/ticket-admin export` - Export ticket data'
          ].join('\n'),
          inline: false
        },
        {
          name: '🎨 **Features**',
          value: [
            '• Automatic transcript generation',
            '• Role-based permissions',
            '• Customizable ticket categories',
            '• Auto-close inactive tickets',
            '• Ticket claiming system',
            '• Advanced statistics tracking'
          ].join('\n'),
          inline: false
        }
      )
      .setFooter({ 
        text: 'Ticket Bot v2.0 | Use buttons below for quick access',
        iconURL: interaction.client.user.displayAvatarURL()
      })
      .setTimestamp();

    const buttons = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('help-setup')
          .setLabel('Setup Guide')
          .setStyle(ButtonStyle.Primary)
          .setEmoji('🔧'),
        new ButtonBuilder()
          .setCustomId('help-features')
          .setLabel('Features')
          .setStyle(ButtonStyle.Secondary)
          .setEmoji('🎨'),
        new ButtonBuilder()
          .setCustomId('help-support')
          .setLabel('Support')
          .setStyle(ButtonStyle.Success)
          .setEmoji('💡')
      );

    await interaction.reply({
      embeds: [helpEmbed],
      components: [buttons]
    });
  }
}; 