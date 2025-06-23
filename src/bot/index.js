/**
 * Ticketshi Advanced Enterprise Support System
 * Build: SNX-2024-ENTERPRISE | index.js
 * Powered by intelligent automation & analytics
 * Copyright (c) 2024 - All rights reserved
 */

const { Client, GatewayIntentBits, Collection, REST, Routes } = require('discord.js');
const path = require('path');
const fs = require('fs');
const connectDatabase = require('./utils/database');
const logger = require('./utils/logger');
const AutoCloseManager = require('./utils/autoClose');
const StatusManager = require('./utils/statusManager');
const Ticket = require('./models/Ticket');
const { NEXUS_CONFIG, EMOJIS } = require('./utils/constants');
require('dotenv').config();

// Error handling utility
const handleError = (error, context) => {
  logger.error(`Error in ${context}:`, { error: error.message, stack: error.stack });
  // You could add additional error reporting here (e.g., to a logging service)
};

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.MessageContent
  ]
});

// Collections for commands and buttons
client.commands = new Collection();
client.buttons = new Collection();

// Initialize managers (but don't start them yet)
const autoCloseManager = new AutoCloseManager(client);
const statusManager = new StatusManager(client);

// Attach managers to client for command access
client.autoCloseManager = autoCloseManager;
client.statusManager = statusManager;

// Command handler setup
const loadCommands = () => {
  try {
    const commandsPath = path.join(__dirname, 'commands');
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
    const commands = [];

    for (const file of commandFiles) {
      const filePath = path.join(commandsPath, file);
      const command = require(filePath);
      if (!command.data || !command.execute) {
        logger.warn(`Invalid command file structure: ${file}`);
        continue;
      }
      client.commands.set(command.data.name, command);
      commands.push(command.data.toJSON());
    }
    return commands;
  } catch (error) {
    handleError(error, 'loadCommands');
    return [];
  }
};

// Button handler setup
const loadButtons = () => {
  try {
    const buttonsPath = path.join(__dirname, 'buttons');
    const buttonFiles = fs.readdirSync(buttonsPath).filter(file => file.endsWith('.js'));

    for (const file of buttonFiles) {
      const filePath = path.join(buttonsPath, file);
      const buttonModule = require(filePath);
      if (!buttonModule.buttons) {
        logger.warn(`Invalid button file structure: ${file}`);
        continue;
      }
      Object.entries(buttonModule.buttons).forEach(([buttonId, handler]) => {
        client.buttons.set(buttonId, { execute: handler });
      });
    }
  } catch (error) {
    handleError(error, 'loadButtons');
  }
};

// Event handler setup
const loadEvents = () => {
  try {
    const eventsPath = path.join(__dirname, 'events');
    const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

    for (const file of eventFiles) {
      const filePath = path.join(eventsPath, file);
      const event = require(filePath);
      if (!event.name || !event.execute) {
        logger.warn(`Invalid event file structure: ${file}`);
        continue;
      }

      const wrappedExecute = async (...args) => {
        try {
          await Promise.resolve(event.execute(...args));
        } catch (error) {
          handleError(error, `event:${event.name}`);
        }
      };

      if (event.once) {
        client.once(event.name, wrappedExecute);
      } else {
        client.on(event.name, wrappedExecute);
      }
    }
  } catch (error) {
    handleError(error, 'loadEvents');
  }
};

// Handle message activity tracking for tickets
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  
  try {
    // Check if this is a ticket channel
    const ticket = await Ticket.findOne({
      channelId: message.channel.id,
      status: 'OPEN'
    });
    
    if (ticket) {
      // Update last activity
      ticket.lastActivity = new Date();
      
      // Add to participants if not already included
      if (!ticket.participants.includes(message.author.id)) {
        ticket.participants.push(message.author.id);
      }
      
      // Store message in ticket history (optional, for better transcripts)
      if (ticket.messages.length < 1000) { // Limit to prevent database bloat
        ticket.messages.push({
          authorId: message.author.id,
          content: message.content,
          timestamp: message.createdAt,
          attachments: message.attachments.map(att => att.url)
        });
      }
      
      await ticket.save();
      
      logger.debug(`Updated activity for ticket ${ticket.ticketId}`, {
        user: message.author.tag,
        channel: message.channel.name
      });
    }
  } catch (error) {
    logger.error('Error tracking message activity:', error);
  }
});

// Handle interactions
client.on('interactionCreate', async interaction => {
  try {
    if (interaction.isCommand()) {
      const command = client.commands.get(interaction.commandName);
      if (!command) return;

      try {
        logger.debug(`Executing command: ${interaction.commandName}`, {
          user: interaction.user.tag,
          guild: interaction.guild?.name
        });
        await command.execute(interaction);
      } catch (error) {
        handleError(error, `command:${interaction.commandName}`);
        if (!interaction.replied && !interaction.deferred) {
          await interaction.reply({
            content: 'There was an error executing this command!',
            ephemeral: true
          });
        } else if (interaction.deferred) {
          await interaction.editReply({
            content: 'There was an error executing this command!',
            ephemeral: true
          });
        }
      }
    }

    if (interaction.isButton()) {
      const button = client.buttons.get(interaction.customId);
      if (button) {
        try {
          logger.debug(`Handling button: ${interaction.customId}`, {
            user: interaction.user.tag,
            guild: interaction.guild?.name
          });
          await button.execute(interaction);
        } catch (error) {
          handleError(error, `button:${interaction.customId}`);
          if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({
              content: 'There was an error handling this button!',
              ephemeral: true
            });
          } else if (interaction.deferred) {
            await interaction.editReply({
              content: 'There was an error handling this button!',
              ephemeral: true
            });
          }
        }
      } else {
        // Try dynamic button handlers
        try {
          const ticketButtons = require('./buttons/ticketButtons');
          if (ticketButtons.handleDynamicButton) {
            const handled = await ticketButtons.handleDynamicButton(interaction);
            if (!handled) {
              logger.warn(`Unknown button interaction: ${interaction.customId}`);
            }
          }
        } catch (error) {
          handleError(error, `dynamic-button:${interaction.customId}`);
          if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({
              content: 'There was an error handling this button!',
              ephemeral: true
            });
          }
        }
      }
    }
  } catch (error) {
    handleError(error, 'interactionCreate');
  }
});

// Bot ready event - Start managers after login
client.on('ready', async () => {
  logger.info(`Logged in as ${client.user.tag}!`);
  
  try {
    // Now that client is ready, start managers
    await statusManager.setStartupStatus();
    await statusManager.start();
    autoCloseManager.start();
    
    logger.info('All systems operational - Bot ready for service! 🎫');

    // Special startup notification
    setTimeout(() => {
      statusManager.setCustomStatus('🚀 Fully loaded! Ready to serve', 'PLAYING', 10000);
    }, 5000);
    
  } catch (error) {
    handleError(error, 'ready-event');
  }
});

// Auto deploy commands function
async function deployCommands(commands) {
  try {
    if (!process.env.DISCORD_TOKEN || !process.env.DISCORD_CLIENT_ID) {
      throw new Error('Missing required environment variables for command deployment');
    }

    logger.info('Started refreshing application (/) commands.');
    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
    
    await rest.put(
      Routes.applicationCommands(process.env.DISCORD_CLIENT_ID),
      { body: commands }
    );

    logger.info('Successfully reloaded application (/) commands.');
  } catch (error) {
    handleError(error, 'deployCommands');
    throw error; // Re-throw to handle in startup
  }
}

// Startup sequence
async function startup() {
  try {
    // Validate environment variables
    const requiredEnvVars = ['DISCORD_TOKEN', 'DISCORD_CLIENT_ID', 'MONGODB_URI'];
    const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);
    
    if (missingEnvVars.length > 0) {
      throw new Error(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
    }

    // Connect to database
    await connectDatabase();
    logger.info('Connected to database');

    // Load all handlers
    logger.info('Loading commands...');
    const commands = loadCommands();
    
    logger.info('Loading buttons...');
    loadButtons();
    
    logger.info('Loading events...');
    loadEvents();

    // Deploy commands
    await deployCommands(commands);
    
    // Login to Discord (managers will start in ready event)
    await client.login(process.env.DISCORD_TOKEN);

  } catch (error) {
    handleError(error, 'startup');
    logger.error('Fatal error during startup - shutting down');
    process.exit(1);
  }
}

// Handle graceful shutdown
const gracefulShutdown = (signal) => {
  logger.info(`Received ${signal}, shutting down gracefully...`);
  
  // Set maintenance status
  statusManager.setMaintenanceStatus();
  
  // Stop managers
  autoCloseManager.stop();
  statusManager.stop();
  
  // Close Discord connection
  client.destroy();
  
  logger.info('Graceful shutdown completed');
  process.exit(0);
};

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

// Handle process errors
process.on('uncaughtException', (error) => {
  handleError(error, 'uncaughtException');
  process.exit(1);
});

process.on('unhandledRejection', (error) => {
  handleError(error, 'unhandledRejection');
});

// Start the bot
startup(); 
