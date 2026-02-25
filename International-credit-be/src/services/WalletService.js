const { Wallet, User, AuditLog } = require('../models');
const { NotFoundError, ConflictError, AuthorizationError, ValidationError } = require('../utils/errors');
const config = require('../config');
const logger = require('../utils/logger');

class WalletService {
  async linkWallet(userId, walletData, metadata = {}) {
    const { address, network, country, signature, message } = walletData;
    
    const user = await User.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Check if wallet already exists
    const existingWallet = await Wallet.findOne({ address: address.toLowerCase(), network });
    if (existingWallet) {
      if (existingWallet.userId.equals(userId)) {
        throw new ConflictError('Wallet already linked to your account');
      } else {
        throw new ConflictError('Wallet already linked to another account');
      }
    }

    // Verify signature if provided (for address ownership proof)
    let verificationData = null;
    if (signature && message) {
      verificationData = {
        signature,
        message,
        verifiedAt: new Date(),
      };
    }

    // Determine initial whitelist state based on KYC status
    let whitelistState = config.walletStatus.PENDING;
    if (user.kycStatus === config.kycStatus.APPROVED) {
      whitelistState = config.walletStatus.WHITELISTED;
    }

    const wallet = new Wallet({
      userId,
      address: address.toLowerCase(),
      network,
      country: country.toUpperCase(),
      whitelistState,
      verificationData,
      reason: whitelistState === config.walletStatus.WHITELISTED ? 'Auto-approved: KYC verified' : 'Pending KYC approval',
    });

    await wallet.save();

    await AuditLog.logAction({
      actor: userId,
      role: user.role,
      action: 'CREATE',
      object: { type: 'Wallet', id: wallet._id },
      after: {
        address: wallet.address,
        network: wallet.network,
        country: wallet.country,
        whitelistState: wallet.whitelistState,
      },
      metadata: {
        ...metadata,
        notes: 'Wallet linked to account',
      },
    });

    logger.info('Wallet linked', {
      userId,
      walletId: wallet._id,
      address: wallet.address,
      network: wallet.network,
      whitelistState: wallet.whitelistState,
    });

    return wallet;
  }

  async updateWalletStatus(adminId, walletId, whitelistState, reason, metadata = {}) {
    const admin = await User.findById(adminId);
    if (!admin || ![config.roles.ADMIN_SUPER, config.roles.ADMIN_COMPLIANCE].includes(admin.role)) {
      throw new AuthorizationError('Insufficient permissions to update wallet status');
    }

    const wallet = await Wallet.findById(walletId).populate('userId');
    if (!wallet) {
      throw new NotFoundError('Wallet not found');
    }

    if (wallet.whitelistState === whitelistState) {
      throw new ConflictError('Wallet already has this status');
    }

    const oldState = wallet.whitelistState;
    wallet.whitelistState = whitelistState;
    wallet.reason = reason;
    await wallet.save();

    await AuditLog.logAction({
      actor: adminId,
      role: admin.role,
      action: whitelistState === config.walletStatus.WHITELISTED ? 'WALLET_WHITELIST' : 'WALLET_BLACKLIST',
      object: { type: 'Wallet', id: walletId },
      before: { whitelistState: oldState },
      after: { whitelistState, reason },
      metadata: {
        ...metadata,
        walletAddress: wallet.address,
        userId: wallet.userId._id,
        notes: `Wallet ${whitelistState.toLowerCase()} by admin`,
      },
    });

    logger.warn('Wallet status updated by admin', {
      adminId,
      walletId,
      userId: wallet.userId._id,
      address: wallet.address,
      oldState,
      newState: whitelistState,
      reason,
    });

    return wallet;
  }

  async getUserWallets(userId) {
    const wallets = await Wallet.find({ userId, isActive: true });
    return wallets;
  }

  async getWallet(userId, walletId) {
    const wallet = await Wallet.findOne({ _id: walletId, userId });
    if (!wallet) {
      throw new NotFoundError('Wallet not found');
    }
    return wallet;
  }

  async removeWallet(userId, walletId, metadata = {}) {
    const wallet = await Wallet.findOne({ _id: walletId, userId });
    if (!wallet) {
      throw new NotFoundError('Wallet not found');
    }

    // Check if wallet has any pending transactions or balances
    // This would require checking the ledger service
    // For now, we'll just mark as inactive

    wallet.isActive = false;
    await wallet.save();

    const user = await User.findById(userId);

    await AuditLog.logAction({
      actor: userId,
      role: user.role,
      action: 'DELETE',
      object: { type: 'Wallet', id: walletId },
      before: {
        address: wallet.address,
        whitelistState: wallet.whitelistState,
        isActive: true,
      },
      after: { isActive: false },
      metadata: {
        ...metadata,
        notes: 'Wallet removed by user',
      },
    });

    logger.info('Wallet removed', {
      userId,
      walletId,
      address: wallet.address,
    });

    return wallet;
  }

  async autoWhitelistOnKycApproval(userId) {
    try {
      const pendingWallets = await Wallet.find({
        userId,
        whitelistState: config.walletStatus.PENDING,
        isActive: true,
      });

      for (const wallet of pendingWallets) {
        wallet.whitelistState = config.walletStatus.WHITELISTED;
        wallet.reason = 'Auto-approved: KYC verification completed';
        await wallet.save();

        await AuditLog.logAction({
          actor: userId,
          role: 'system',
          action: 'WALLET_WHITELIST',
          object: { type: 'Wallet', id: wallet._id },
          before: { whitelistState: config.walletStatus.PENDING },
          after: { 
            whitelistState: config.walletStatus.WHITELISTED,
            reason: 'Auto-approved: KYC verification completed',
          },
          metadata: {
            notes: 'Wallet auto-whitelisted after KYC approval',
          },
        });

        logger.info('Wallet auto-whitelisted after KYC approval', {
          userId,
          walletId: wallet._id,
          address: wallet.address,
        });
      }

      return pendingWallets.length;
    } catch (error) {
      logger.error('Error auto-whitelisting wallets after KYC approval:', error);
      throw error;
    }
  }

  async validateWalletForTransaction(userId, address, network, amount = 0, transactionType = 'transfer') {
    const wallet = await Wallet.findOne({
      userId,
      address: address.toLowerCase(),
      network,
      isActive: true,
    });

    if (!wallet) {
      throw new NotFoundError('Wallet not found or not linked to your account');
    }

    if (wallet.whitelistState !== config.walletStatus.WHITELISTED) {
      throw new ValidationError(`Wallet is ${wallet.whitelistState.toLowerCase()}. ${wallet.reason || ''}`);
    }

    // Additional validation could be added here based on transaction type and amount
    // For example, country restrictions, daily limits, etc.

    return wallet;
  }

  async searchWallets(adminId, filters = {}, pagination = {}) {
    const admin = await User.findById(adminId);
    if (!admin || ![config.roles.ADMIN_SUPER, config.roles.ADMIN_COMPLIANCE].includes(admin.role)) {
      throw new AuthorizationError('Insufficient permissions to search wallets');
    }

    const { page = 1, limit = 20 } = pagination;
    const skip = (page - 1) * limit;

    const query = {};

    if (filters.address) {
      query.address = { $regex: filters.address.toLowerCase(), $options: 'i' };
    }

    if (filters.network) {
      query.network = filters.network;
    }

    if (filters.country) {
      query.country = filters.country.toUpperCase();
    }

    if (filters.whitelistState) {
      query.whitelistState = filters.whitelistState;
    }

    if (filters.isActive !== undefined) {
      query.isActive = filters.isActive;
    }

    const [wallets, total] = await Promise.all([
      Wallet.find(query)
        .populate('userId', 'email kycStatus createdAt')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Wallet.countDocuments(query)
    ]);

    await AuditLog.logAction({
      actor: adminId,
      role: admin.role,
      action: 'REPORT_VIEW',
      object: { type: 'Wallet', identifier: 'wallet_search' },
      metadata: {
        filters,
        pagination,
        resultCount: wallets.length,
        notes: 'Wallet search performed',
      },
    });

    return {
      wallets,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async getWalletStats(adminId) {
    const admin = await User.findById(adminId);
    if (!admin || ![config.roles.ADMIN_SUPER, config.roles.ADMIN_COMPLIANCE].includes(admin.role)) {
      throw new AuthorizationError('Insufficient permissions to view wallet stats');
    }

    const stats = await Wallet.aggregate([
      {
        $group: {
          _id: null,
          totalWallets: { $sum: 1 },
          activeWallets: {
            $sum: { $cond: [{ $eq: ['$isActive', true] }, 1, 0] }
          },
          whitelistedWallets: {
            $sum: { $cond: [{ $eq: ['$whitelistState', 'WHITELISTED'] }, 1, 0] }
          },
          pendingWallets: {
            $sum: { $cond: [{ $eq: ['$whitelistState', 'PENDING'] }, 1, 0] }
          },
          blacklistedWallets: {
            $sum: { $cond: [{ $eq: ['$whitelistState', 'BLACKLISTED'] }, 1, 0] }
          },
        }
      }
    ]);

    const networkStats = await Wallet.aggregate([
      {
        $group: {
          _id: '$network',
          count: { $sum: 1 }
        }
      }
    ]);

    const countryStats = await Wallet.aggregate([
      {
        $group: {
          _id: '$country',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    await AuditLog.logAction({
      actor: adminId,
      role: admin.role,
      action: 'REPORT_VIEW',
      object: { type: 'Wallet', identifier: 'wallet_stats' },
      metadata: {
        notes: 'Wallet statistics viewed',
      },
    });

    return {
      overview: stats[0] || {
        totalWallets: 0,
        activeWallets: 0,
        whitelistedWallets: 0,
        pendingWallets: 0,
        blacklistedWallets: 0,
      },
      networkDistribution: networkStats.reduce((acc, stat) => {
        acc[stat._id] = stat.count;
        return acc;
      }, {}),
      topCountries: countryStats,
    };
  }
}

module.exports = new WalletService();