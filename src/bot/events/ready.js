const logger = require('../utils/logger');

module.exports = {
  name: 'ready',
  once: true,
  async execute(client) {
    logger.info(`Ready! Logged in as ${client.user.tag}`);
    
    try {

      // Log some stats
      logger.info('Bot Statistics:', {
        servers: client.guilds.cache.size,
        commands: client.commands.size,
        buttons: client.buttons.size
      });
    } catch (error) {
      logger.error('Error in ready event:', {
        error: error.message,
        stack: error.stack
      });
    }
  },
}; 