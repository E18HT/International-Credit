const { User, Account, AuditLog, Wallet } = require('../models');
const { NotFoundError, AuthorizationError, ConflictError } = require('../utils/errors');
const config = require('../config');
const logger = require('../utils/logger');

class UserService {
  async getProfile(userId) {
    const user = await User.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Get user's wallet addresses
    const wallets = await Wallet.find({ userId, isActive: true })
      .select('address network whitelistState country metadata.isMultisig')
      .sort({ createdAt: -1 });

    // Convert user to object and add wallets
    const userProfile = user.toJSON();
    userProfile.wallets = wallets;

    return userProfile;
  }
  
  async getUserAccounts(userId) {
    const accounts = await Account.find({ userId }).populate('userId', 'email role');
    return accounts;
  }
  
  async createUserAccounts(userId) {
    const user = await User.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }
    
    const accountsToCreate = Object.values(config.assets).map(asset => ({
      userId,
      asset,
      status: 'ACTIVE',
      accountType: 'USER',
    }));
    
    const accounts = await Account.insertMany(accountsToCreate, { ordered: false });
    
    await AuditLog.logAction({
      actor: userId,
      role: user.role,
      action: 'CREATE',
      object: { type: 'Account', identifier: `${accounts.length} accounts` },
      metadata: {
        notes: 'User accounts created',
      },
    });
    
    logger.info(`User accounts created`, {
      userId,
      accountCount: accounts.length,
      assets: Object.values(config.assets),
    });
    
    return accounts;
  }
  
  async updateUserRole(adminId, userId, newRole, reason, metadata = {}) {
    const admin = await User.findById(adminId);
    if (!admin || admin.role !== config.roles.ADMIN_SUPER) {
      throw new AuthorizationError('Only super admin can change user roles');
    }
    
    const user = await User.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }
    
    if (user.role === newRole) {
      throw new ConflictError('User already has this role');
    }
    
    const oldRole = user.role;
    user.role = newRole;
    await user.save();
    
    await AuditLog.logAction({
      actor: adminId,
      role: admin.role,
      action: 'UPDATE',
      object: { type: 'User', id: userId },
      before: { role: oldRole },
      after: { role: newRole },
      metadata: {
        ...metadata,
        reason,
        notes: 'Role changed by admin',
      },
    });
    
    logger.warn(`User role changed`, {
      adminId,
      userId,
      oldRole,
      newRole,
      reason,
      ip: metadata.ipAddress,
    });
    
    return user;
  }
  
  async deactivateUser(adminId, userId, reason, metadata = {}) {
    const admin = await User.findById(adminId);
    if (!admin || ![config.roles.ADMIN_SUPER, config.roles.ADMIN_COMPLIANCE].includes(admin.role)) {
      throw new AuthorizationError('Insufficient permissions to deactivate user');
    }
    
    const user = await User.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }
    
    if (!user.isActive) {
      throw new ConflictError('User is already deactivated');
    }
    
    user.isActive = false;
    await user.save();
    
    await AuditLog.logAction({
      actor: adminId,
      role: admin.role,
      action: 'UPDATE',
      object: { type: 'User', id: userId },
      before: { isActive: true },
      after: { isActive: false },
      metadata: {
        ...metadata,
        reason,
        notes: 'User deactivated by admin',
      },
    });
    
    logger.warn(`User deactivated`, {
      adminId,
      userId,
      userEmail: user.email,
      reason,
      ip: metadata.ipAddress,
    });
    
    return user;
  }
  
  async reactivateUser(adminId, userId, reason, metadata = {}) {
    const admin = await User.findById(adminId);
    if (!admin || ![config.roles.ADMIN_SUPER, config.roles.ADMIN_COMPLIANCE].includes(admin.role)) {
      throw new AuthorizationError('Insufficient permissions to reactivate user');
    }
    
    const user = await User.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }
    
    if (user.isActive) {
      throw new ConflictError('User is already active');
    }
    
    user.isActive = true;
    user.loginAttempts = undefined;
    user.lockUntil = undefined;
    await user.save();
    
    await AuditLog.logAction({
      actor: adminId,
      role: admin.role,
      action: 'UPDATE',
      object: { type: 'User', id: userId },
      before: { isActive: false },
      after: { isActive: true },
      metadata: {
        ...metadata,
        reason,
        notes: 'User reactivated by admin',
      },
    });
    
    logger.info(`User reactivated`, {
      adminId,
      userId,
      userEmail: user.email,
      reason,
      ip: metadata.ipAddress,
    });
    
    return user;
  }
  
  async searchUsers(adminId, filters = {}, pagination = {}) {
    const admin = await User.findById(adminId);
    if (!admin || ![config.roles.ADMIN_SUPER, config.roles.ADMIN_COMPLIANCE].includes(admin.role)) {
      throw new AuthorizationError('Insufficient permissions to search users');
    }
    
    const { page = 1, limit = 20 } = pagination;
    const skip = (page - 1) * limit;
    
    const query = {};
    
    if (filters.email) {
      query.email = { $regex: filters.email, $options: 'i' };
    }
    
    if (filters.role) {
      query.role = filters.role;
    }
    
    if (filters.kycStatus) {
      query.kycStatus = filters.kycStatus;
    }
    
    if (filters.isActive !== undefined) {
      query.isActive = filters.isActive;
    }
    
    if (filters.emailVerified !== undefined) {
      query.emailVerified = filters.emailVerified;
    }
    
    const [users, total] = await Promise.all([
      User.find(query)
        .select('-password -passwordResetToken -passwordResetExpires -emailVerificationToken')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      User.countDocuments(query)
    ]);
    
    await AuditLog.logAction({
      actor: adminId,
      role: admin.role,
      action: 'REPORT_VIEW',
      object: { type: 'User', identifier: 'user_search' },
      metadata: {
        filters,
        pagination,
        resultCount: users.length,
        notes: 'User search performed',
      },
    });
    
    return {
      users,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }
  
  async getUserStats(adminId) {
    const admin = await User.findById(adminId);
    if (!admin || ![config.roles.ADMIN_SUPER, config.roles.ADMIN_COMPLIANCE].includes(admin.role)) {
      throw new AuthorizationError('Insufficient permissions to view user stats');
    }
    
    const stats = await User.aggregate([
      {
        $group: {
          _id: null,
          totalUsers: { $sum: 1 },
          activeUsers: {
            $sum: { $cond: [{ $eq: ['$isActive', true] }, 1, 0] }
          },
          verifiedUsers: {
            $sum: { $cond: [{ $eq: ['$emailVerified', true] }, 1, 0] }
          },
          kycApprovedUsers: {
            $sum: { $cond: [{ $eq: ['$kycStatus', 'APPROVED'] }, 1, 0] }
          },
          kycPendingUsers: {
            $sum: { $cond: [{ $eq: ['$kycStatus', 'PENDING'] }, 1, 0] }
          },
          kycRejectedUsers: {
            $sum: { $cond: [{ $eq: ['$kycStatus', 'REJECTED'] }, 1, 0] }
          },
        }
      }
    ]);
    
    const roleStats = await User.aggregate([
      {
        $group: {
          _id: '$role',
          count: { $sum: 1 }
        }
      }
    ]);
    
    await AuditLog.logAction({
      actor: adminId,
      role: admin.role,
      action: 'REPORT_VIEW',
      object: { type: 'User', identifier: 'user_stats' },
      metadata: {
        notes: 'User statistics viewed',
      },
    });
    
    return {
      overview: stats[0] || {
        totalUsers: 0,
        activeUsers: 0,
        verifiedUsers: 0,
        kycApprovedUsers: 0,
        kycPendingUsers: 0,
        kycRejectedUsers: 0,
      },
      roleDistribution: roleStats.reduce((acc, stat) => {
        acc[stat._id] = stat.count;
        return acc;
      }, {}),
    };
  }
}

module.exports = new UserService();