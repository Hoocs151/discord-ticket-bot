const { ActivityType } = require('discord.js');
const Ticket = require('../models/Ticket');
const GuildConfig = require('../models/GuildConfig');
const logger = require('./logger');
const { NEXUS_CONFIG, EMOJIS, STATUS_MESSAGES, PREFIXES } = require('./constants');

class StatusManager {
  constructor(client) {
    this.client = client;
    this.currentIndex = 0;
    this.statusInterval = null;
    this.statsInterval = null;
    
    // Cached stats with fallback values
    this.stats = {
      totalTickets: 0,
      openTickets: 0,
      closedToday: 0,
      totalGuilds: 0,
      totalUsers: 0,
      lastUpdated: null,
      updateCount: 0
    };
    
    // Performance monitoring
    this.performance = {
      statusUpdates: 0,
      statsUpdates: 0,
      errors: 0,
      avgUpdateTime: 0,
      lastError: null
    };
    
    // Configuration
    this.config = {
      statusUpdateInterval: 28000, // Unique timing: 28 seconds
      statsUpdateInterval: 195000, // 3.25 minutes - unique frequency
      errorRetryDelay: 12000, // 12 seconds retry delay
      maxRetries: 3
    };
    
    // Cache management
    this.cache = {
      statusList: null,
      statusListExpiry: 0,
      lastStatsUpdate: 0,
      isUpdating: false,
      memberCountCache: new Map(),
      memberCountExpiry: 0
    };
  }

  async start() {
    try {
      logger.info('🔷 Initializing Ticketshi StatusManager...');
      
      // Initial stats update
      await this.updateStats();
      
      // Set initial status
      await this.updateStatus();
      
      // Start status rotation
      this.statusInterval = setInterval(async () => {
        await this.updateStatus();
      }, this.config.statusUpdateInterval);

      // Start stats updates
      this.statsInterval = setInterval(async () => {
        await this.updateStats();
      }, this.config.statsUpdateInterval);

      // Performance monitoring every 12 minutes (unique interval)
      setInterval(() => {
        this.logPerformanceMetrics();
      }, 720000);

      logger.info(`${EMOJIS.NEXUS} Ticketshi StatusManager operational - ${NEXUS_CONFIG.BUILD_VERSION}`);
    } catch (error) {
      logger.error('Error starting Ticketshi StatusManager:', error);
      this.performance.errors++;
    }
  }

  stop() {
    if (this.statusInterval) {
      clearInterval(this.statusInterval);
      this.statusInterval = null;
    }
    
    if (this.statsInterval) {
      clearInterval(this.statsInterval);
      this.statsInterval = null;
    }
    
    logger.info('Status manager stopped');
  }

  async updateStats() {
    // Prevent concurrent updates
    if (this.cache.isUpdating) {
      logger.debug('Stats update already in progress, skipping...');
      return;
    }
    
    const startTime = Date.now();
    this.cache.isUpdating = true;
    
    try {
      logger.debug('Updating bot statistics...');
      
      // Use Promise.all for parallel queries
      const [totalTickets, openTickets, todayTickets] = await Promise.all([
        this.countWithFallback(() => Ticket.countDocuments()),
        this.countWithFallback(() => Ticket.countDocuments({ status: 'OPEN' })),
        this.countWithFallback(() => this.getTodayTickets())
      ]);
      
      // Update stats
      this.stats.totalTickets = totalTickets;
      this.stats.openTickets = openTickets;
      this.stats.closedToday = todayTickets;
      this.stats.totalGuilds = this.client.guilds.cache.size;
      this.stats.totalUsers = this.calculateTotalUsers();
      this.stats.lastUpdated = new Date();
      this.stats.updateCount++;
      
      // Cache management
      this.cache.lastStatsUpdate = Date.now();
      this.cache.statusList = null; // Invalidate status list cache
      
      const updateTime = Date.now() - startTime;
      this.updatePerformanceMetrics(updateTime);
      
      logger.debug('Updated bot statistics', {
        ...this.stats,
        updateTime: `${updateTime}ms`
      });
      
    } catch (error) {
      logger.error('Error updating status stats:', error);
      this.performance.errors++;
      this.performance.lastError = error.message;
      
      // Don't crash - use cached values
      logger.warn('Using cached statistics due to error');
    } finally {
      this.cache.isUpdating = false;
    }
  }

  async countWithFallback(queryFn, fallback = 0) {
    try {
      const result = await queryFn();
      return result || fallback;
    } catch (error) {
      logger.warn('Database query failed, using fallback value:', error.message);
      return fallback;
    }
  }

  async getTodayTickets() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return await Ticket.countDocuments({
      status: 'CLOSED',
      closedAt: { $gte: today }
    });
  }

  calculateTotalUsers() {
    const now = Date.now();
    
    // Use cached member counts if available and not expired (cache for 10 minutes)
    if (this.cache.memberCountExpiry > now && this.cache.memberCountCache.size > 0) {
      let total = 0;
      for (const count of this.cache.memberCountCache.values()) {
        total += count;
      }
      return total;
    }
    
    // Refresh cache
    this.cache.memberCountCache.clear();
    let total = 0;
    
    for (const guild of this.client.guilds.cache.values()) {
      const memberCount = guild.memberCount || 0;
      this.cache.memberCountCache.set(guild.id, memberCount);
      total += memberCount;
    }
    
    // Cache expires in 10 minutes
    this.cache.memberCountExpiry = now + 600000;
    
    return total;
  }

  async updateStatus() {
    const startTime = Date.now();
    
    try {
      const statuses = await this.getStatusList();
      const status = statuses[this.currentIndex % statuses.length];
      
      await this.client.user.setPresence({
        activities: [{
          name: status.name,
          type: status.type,
          url: status.url
        }],
        status: 'online'
      });

      this.currentIndex++;
      this.performance.statusUpdates++;
      
      const updateTime = Date.now() - startTime;
      logger.debug(`Updated status to: ${status.name} (${updateTime}ms)`);
      
    } catch (error) {
      logger.error('Error updating bot status:', error);
      this.performance.errors++;
      
      // Fallback status
      try {
        await this.client.user.setPresence({
          activities: [{
            name: '🎫 Ticket Bot | /help',
            type: ActivityType.Playing
          }],
          status: 'online'
        });
      } catch (fallbackError) {
        logger.error('Error setting fallback status:', fallbackError);
      }
    }
  }

  async getStatusList() {
    // Use cached status list if available and not expired
    const now = Date.now();
    if (this.cache.statusList && now < this.cache.statusListExpiry) {
      return this.cache.statusList;
    }
    
    const { totalTickets, openTickets, closedToday, totalGuilds, totalUsers } = this.stats;
    
    const statuses = [
      {
        name: `${EMOJIS.NEXUS} Ticketshi v${NEXUS_CONFIG.BUILD_VERSION}`,
        type: ActivityType.Playing
      },
      {
        name: `${EMOJIS.SHIELD} ${openTickets} active support sessions`,
        type: ActivityType.Watching
      },
      {
        name: `${EMOJIS.CHART} ${this.formatNumber(totalTickets)} cases processed`,
        type: ActivityType.Competing
      },
      {
        name: `${EMOJIS.DIAMOND} ${totalGuilds} enterprise clients`,
        type: ActivityType.Playing
      },
      {
        name: `${EMOJIS.TARGET} serving ${this.formatNumber(totalUsers)} users`,
        type: ActivityType.Watching
      },
      {
        name: `${EMOJIS.SUCCESS} ${closedToday} cases resolved today`,
        type: ActivityType.Competing
      },
      {
        name: `${EMOJIS.LIGHTNING} intelligent automation active`,
        type: ActivityType.Playing
      },
      {
        name: `${EMOJIS.ROCKET} next-generation support platform`,
        type: ActivityType.Listening
      },
      {
        name: `${EMOJIS.GEAR} advanced workflows enabled`,
        type: ActivityType.Watching
      },
      {
        name: `${EMOJIS.STAR} premium support experience`,
        type: ActivityType.Playing
      }
    ];
    
    // Cache for 35 seconds (unique cache duration)
    this.cache.statusList = statuses;
    this.cache.statusListExpiry = now + 35000;
    
    return statuses;
  }

  formatNumber(num) {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  }

  updatePerformanceMetrics(updateTime) {
    this.performance.statsUpdates++;
    
    // Calculate rolling average
    const currentAvg = this.performance.avgUpdateTime;
    const count = this.performance.statsUpdates;
    this.performance.avgUpdateTime = ((currentAvg * (count - 1)) + updateTime) / count;
  }

  logPerformanceMetrics() {
    const uptime = Math.floor(process.uptime());
    const uptimeHours = Math.floor(uptime / 3600);
    const uptimeMinutes = Math.floor((uptime % 3600) / 60);
    
    logger.info('🔷 Ticketshi Performance Report', {
      system: NEXUS_CONFIG.SYSTEM_ID,
      version: NEXUS_CONFIG.BUILD_VERSION,
      uptime: `${uptimeHours}h ${uptimeMinutes}m`,
      statusUpdates: this.performance.statusUpdates,
      statsUpdates: this.performance.statsUpdates,
      errors: this.performance.errors,
      avgUpdateTime: Math.round(this.performance.avgUpdateTime),
      lastStatsUpdate: this.stats.lastUpdated,
      cacheStatus: this.cache.statusList ? 'Active' : 'Inactive',
      supportMetrics: {
        tickets: this.stats.totalTickets,
        activeCases: this.stats.openTickets,
        clients: this.stats.totalGuilds
      }
    });
  }

  // Manual status update for special events
  async setCustomStatus(name, type = ActivityType.Playing, duration = 60000) {
    try {
      await this.client.user.setPresence({
        activities: [{
          name: name,
          type: type
        }],
        status: 'online'
      });

      logger.info(`Set custom status: ${name} for ${duration/1000}s`);
      
      // Revert to normal cycle after duration
      setTimeout(() => {
        this.updateStatus();
      }, duration);

    } catch (error) {
      logger.error('Error setting custom status:', error);
      this.performance.errors++;
    }
  }

  // Enhanced startup status
  async setStartupStatus() {
    try {
      await this.client.user.setPresence({
        activities: [{
          name: `${EMOJIS.ROCKET} Ticketshi initializing... | ${NEXUS_CONFIG.BUILD_VERSION}`,
          type: ActivityType.Playing
        }],
        status: 'idle'
      });
      
      logger.info('Set Ticketshi startup status');
    } catch (error) {
      logger.error('Error setting startup status:', error);
    }
  }

  // Enhanced maintenance status
  async setMaintenanceStatus() {
    try {
      await this.client.user.setPresence({
        activities: [{
          name: `${EMOJIS.GEAR} Ticketshi under maintenance | Enhanced features incoming`,
          type: ActivityType.Playing
        }],
        status: 'dnd'
      });
      
      logger.info('Set Ticketshi maintenance status');
    } catch (error) {
      logger.error('Error setting maintenance status:', error);
    }
  }

  // Enhanced emergency status
  async setEmergencyStatus(message = 'System temporarily unavailable') {
    try {
      await this.client.user.setPresence({
        activities: [{
          name: `${EMOJIS.WARNING} Ticketshi: ${message}`,
          type: ActivityType.Playing
        }],
        status: 'dnd'
      });
      
      logger.warn(`Set Ticketshi emergency status: ${message}`);
    } catch (error) {
      logger.error('Error setting emergency status:', error);
    }
  }

  // Get current stats for external use
  getStats() {
    return {
      ...this.stats,
      performance: this.performance,
      cache: {
        isActive: !!this.cache.statusList,
        lastUpdate: this.cache.lastStatsUpdate,
        memberCountCached: this.cache.memberCountCache.size,
        memberCountExpiry: this.cache.memberCountExpiry
      }
    };
  }

  // Clear all caches
  clearCache() {
    this.cache.statusList = null;
    this.cache.statusListExpiry = 0;
    this.cache.memberCountCache.clear();
    this.cache.memberCountExpiry = 0;
    logger.info('StatusManager caches cleared');
  }

  // Force immediate stats update (bypasses concurrent protection)
  async forceUpdateStats() {
    this.cache.isUpdating = false;
    this.clearCache();
    await this.updateStats();
    logger.info('StatusManager stats force updated');
  }

  // Get detailed cache information
  getCacheInfo() {
    const now = Date.now();
    const statusCacheActive = this.cache.statusList && now < this.cache.statusListExpiry;
    const memberCacheActive = this.cache.memberCountExpiry > now;
    
    let info = '**Status List Cache:**\n';
    info += statusCacheActive ? '✅ Active' : '❌ Expired';
    if (statusCacheActive) {
      const remaining = Math.ceil((this.cache.statusListExpiry - now) / 1000);
      info += ` (${remaining}s remaining)`;
    }
    
    info += '\n\n**Member Count Cache:**\n';
    info += memberCacheActive ? '✅ Active' : '❌ Expired';
    info += `\n📊 Cached Guilds: ${this.cache.memberCountCache.size}`;
    if (memberCacheActive) {
      const remaining = Math.ceil((this.cache.memberCountExpiry - now) / 1000);
      info += `\n⏰ Expires in: ${remaining}s`;
    }
    
    info += '\n\n**Update Status:**\n';
    info += this.cache.isUpdating ? '🔄 Currently updating' : '✅ Ready';
    
    return info;
  }
}

module.exports = StatusManager; 
