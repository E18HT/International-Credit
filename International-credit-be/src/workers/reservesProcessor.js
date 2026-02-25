const { ReservesSnapshot, Balance, Account, Config } = require('../models');
const config = require('../config');
const logger = require('../utils/logger');

class ReservesProcessor {
  async createSnapshot(job) {
    try {
      logger.info('Creating reserves snapshot');

      // Get current reserves data (mocked for MVP)
      const reservesData = await this.calculateReserves();
      
      // Get UC supply
      const ucSupply = await this.calculateUCSupply();
      
      // Calculate ratios
      const ratios = this.calculateRatios(reservesData, ucSupply);
      
      // Determine health status
      const health = this.assessHealth(ratios);

      const snapshot = new ReservesSnapshot({
        timestamp: new Date(),
        reserves: reservesData,
        supply: {
          UC: ucSupply,
        },
        ratios,
        health,
        calculatedBy: 'system',
      });

      await snapshot.save();

      // Log warning if unhealthy
      if (health.status !== 'HEALTHY') {
        logger.warn('Reserves snapshot shows unhealthy status', {
          status: health.status,
          warnings: health.warnings,
          ratios,
        });
      }

      logger.info('Reserves snapshot created', {
        timestamp: snapshot.timestamp,
        collateralPct: ratios.collateralPct,
        reserveRatio: ratios.reserveRatio,
        health: health.status,
      });

      return {
        success: true,
        snapshotId: snapshot._id,
        timestamp: snapshot.timestamp,
        ratios,
        health,
      };
    } catch (error) {
      logger.error('Failed to create reserves snapshot', {
        error: error.message,
      });
      throw error;
    }
  }

  async calculateReserves() {
    // In a real implementation, this would fetch actual reserve data
    // from custody providers, DEXs, or other sources
    // For MVP, we'll use mock data that can be updated via admin endpoints

    const systemConfig = await Config.getConfig();
    
    // Mock prices (in production, would come from oracles)
    const btcPrice = systemConfig.fxTable.BTC || 50000;
    const xauPrice = systemConfig.fxTable.XAU || 2000;

    // Mock reserve quantities (could be stored in config or separate collection)
    const bbtQuantity = 10; // 10 BTC backing tokens
    const gbtQuantity = 500; // 500 oz Gold backing tokens

    return {
      BBT: {
        quantity: bbtQuantity,
        priceUSD: btcPrice,
        valueUSD: bbtQuantity * btcPrice,
      },
      GBT: {
        quantity: gbtQuantity,
        priceUSD: xauPrice,
        valueUSD: gbtQuantity * xauPrice,
      },
      cash: {
        valueUSD: 50000, // Mock cash reserves
      },
    };
  }

  async calculateUCSupply() {
    // Calculate total UC supply from user balances
    const ucBalances = await Balance.aggregate([
      {
        $lookup: {
          from: 'accounts',
          localField: 'accountId',
          foreignField: '_id',
          as: 'account'
        }
      },
      {
        $unwind: '$account'
      },
      {
        $match: {
          'account.asset': config.assets.UC,
          'account.accountType': 'USER'
        }
      },
      {
        $group: {
          _id: null,
          totalSupply: { $sum: '$available' },
          circulatingSupply: { $sum: '$available' }, // For now, all UC is circulating
        }
      }
    ]);

    const supply = ucBalances[0] || {
      totalSupply: 0,
      circulatingSupply: 0,
    };

    return {
      total: supply.totalSupply,
      circulating: supply.circulatingSupply,
    };
  }

  calculateRatios(reserves, supply) {
    const totalReserveValue = 
      reserves.BBT.valueUSD + 
      reserves.GBT.valueUSD + 
      reserves.cash.valueUSD;

    const ucValue = supply.total * 1; // Assuming 1 UC = 1 USD target

    const collateralPct = ucValue > 0 ? (totalReserveValue / ucValue) * 100 : 0;
    const reserveRatio = ucValue > 0 ? totalReserveValue / ucValue : 0;

    return {
      collateralPct,
      reserveRatio,
    };
  }

  assessHealth(ratios) {
    const systemConfig = await Config.getConfig();
    const { target, minimum, critical } = systemConfig.reserveRatio;

    const warnings = [];
    let status = 'HEALTHY';

    if (ratios.reserveRatio < critical) {
      status = 'CRITICAL';
      warnings.push('Reserve ratio below critical threshold');
    } else if (ratios.reserveRatio < minimum) {
      status = 'WARNING';
      warnings.push('Reserve ratio below minimum threshold');
    } else if (ratios.reserveRatio < target) {
      status = 'WARNING';
      warnings.push('Reserve ratio below target threshold');
    }

    if (ratios.collateralPct < 100) {
      status = 'CRITICAL';
      warnings.push('Under-collateralized system');
    }

    return {
      status,
      warnings,
      lastAuditAt: new Date(),
    };
  }

  async updateCollateralRatio(job) {
    const { bbtQuantity, gbtQuantity, cashValue } = job.data;

    try {
      logger.info('Updating collateral ratio', {
        bbtQuantity,
        gbtQuantity,
        cashValue,
      });

      // Update system configuration with new reserve amounts
      const systemConfig = await Config.getConfig();
      
      // This would typically update a separate reserves collection
      // For now, we'll store it in system config metadata
      if (!systemConfig.reservesData) {
        systemConfig.reservesData = {};
      }

      if (bbtQuantity !== undefined) {
        systemConfig.reservesData.bbtQuantity = bbtQuantity;
      }
      if (gbtQuantity !== undefined) {
        systemConfig.reservesData.gbtQuantity = gbtQuantity;
      }
      if (cashValue !== undefined) {
        systemConfig.reservesData.cashValue = cashValue;
      }

      await systemConfig.save();

      // Trigger immediate snapshot creation
      const workerService = require('../worker');
      await workerService.addJob('reserves', 'create-snapshot', {}, {
        priority: 10, // High priority
      });

      logger.info('Collateral ratio update completed');

      return {
        success: true,
        updatedReserves: {
          bbtQuantity,
          gbtQuantity,
          cashValue,
        },
        snapshotTriggered: true,
      };
    } catch (error) {
      logger.error('Failed to update collateral ratio', {
        error: error.message,
        bbtQuantity,
        gbtQuantity,
        cashValue,
      });
      throw error;
    }
  }

  async getLatestSnapshot() {
    return await ReservesSnapshot.findOne().sort({ timestamp: -1 });
  }

  async getSnapshotHistory(days = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    return await ReservesSnapshot.find({
      timestamp: { $gte: startDate }
    }).sort({ timestamp: -1 });
  }

  async alertOnThresholds(job) {
    try {
      const latestSnapshot = await this.getLatestSnapshot();
      
      if (!latestSnapshot) {
        logger.warn('No reserves snapshot available for threshold check');
        return { success: false, reason: 'No snapshot available' };
      }

      if (latestSnapshot.health.status === 'CRITICAL') {
        // Send critical alerts
        const workerService = require('../worker');
        
        // Email admin team
        await workerService.addJob('email', 'send-email', {
          to: process.env.ADMIN_ALERT_EMAIL || 'admin@universalcredit.com',
          subject: 'CRITICAL: Reserve Ratio Below Critical Threshold',
          htmlBody: `
            <h1 style="color: #dc3545;">Critical Reserve Alert</h1>
            <p>The Universal Credit system reserve ratio has fallen below the critical threshold.</p>
            <ul>
              <li><strong>Current Ratio:</strong> ${latestSnapshot.ratios.reserveRatio.toFixed(4)}</li>
              <li><strong>Collateral %:</strong> ${latestSnapshot.ratios.collateralPct.toFixed(2)}%</li>
              <li><strong>Status:</strong> ${latestSnapshot.health.status}</li>
              <li><strong>Timestamp:</strong> ${latestSnapshot.timestamp.toISOString()}</li>
            </ul>
            <p><strong>Warnings:</strong></p>
            <ul>
              ${latestSnapshot.health.warnings.map(w => `<li>${w}</li>`).join('')}
            </ul>
            <p>Immediate action required to stabilize the system.</p>
          `,
          textBody: `
            CRITICAL: Reserve Ratio Alert
            
            The Universal Credit system reserve ratio has fallen below the critical threshold.
            
            Current Ratio: ${latestSnapshot.ratios.reserveRatio.toFixed(4)}
            Collateral %: ${latestSnapshot.ratios.collateralPct.toFixed(2)}%
            Status: ${latestSnapshot.health.status}
            Timestamp: ${latestSnapshot.timestamp.toISOString()}
            
            Warnings: ${latestSnapshot.health.warnings.join(', ')}
            
            Immediate action required to stabilize the system.
          `,
        });

        logger.critical('Critical reserve threshold breach - alerts sent', {
          ratio: latestSnapshot.ratios.reserveRatio,
          collateralPct: latestSnapshot.ratios.collateralPct,
          warnings: latestSnapshot.health.warnings,
        });
      }

      return {
        success: true,
        status: latestSnapshot.health.status,
        alertsSent: latestSnapshot.health.status === 'CRITICAL',
      };
    } catch (error) {
      logger.error('Failed to check threshold alerts', {
        error: error.message,
      });
      throw error;
    }
  }
}

module.exports = new ReservesProcessor();