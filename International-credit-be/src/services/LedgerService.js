const mongoose = require('mongoose');
const { LedgerEntry, Account, Balance, User, AuditLog } = require('../models');
const { NotFoundError, ValidationError, ConflictError, InternalServerError } = require('../utils/errors');
const config = require('../config');
const logger = require('../utils/logger');
const { v4: uuidv4 } = require('uuid');

class LedgerService {
  async createJournal(entries, metadata = {}) {
    if (!entries || entries.length < 2) {
      throw new ValidationError('Journal must have at least 2 entries (double-entry)');
    }

    // Validate double-entry accounting rules
    let totalDebits = 0;
    let totalCredits = 0;

    for (const entry of entries) {
      if (entry.debit && entry.credit) {
        throw new ValidationError('Entry cannot have both debit and credit');
      }
      if (!entry.debit && !entry.credit) {
        throw new ValidationError('Entry must have either debit or credit');
      }
      
      totalDebits += entry.debit || 0;
      totalCredits += entry.credit || 0;
    }

    if (Math.abs(totalDebits - totalCredits) > 0.00000001) { // Allow for floating point precision
      throw new ValidationError(`Journal must balance: debits=${totalDebits}, credits=${totalCredits}`);
    }

    const session = await mongoose.startSession();
    const journalId = new mongoose.Types.ObjectId();

    try {
      await session.withTransaction(async () => {
        const ledgerEntries = [];

        for (const entry of entries) {
          // Verify account exists
          const account = await Account.findById(entry.accountId).session(session);
          if (!account) {
            throw new NotFoundError(`Account not found: ${entry.accountId}`);
          }

          // Create ledger entry
          const ledgerEntry = new LedgerEntry({
            journalId,
            accountId: entry.accountId,
            debit: entry.debit || 0,
            credit: entry.credit || 0,
            meta: {
              ...entry.meta,
              correlationId: metadata.correlationId || uuidv4(),
              idempotencyKey: metadata.idempotencyKey,
            },
            status: 'POSTED',
          });

          await ledgerEntry.save({ session });
          ledgerEntries.push(ledgerEntry);

          // Update balance cache
          await this.updateBalance(entry.accountId, session);
        }

        // Log audit trail
        if (metadata.userId) {
          const user = await User.findById(metadata.userId).session(session);
          if (user) {
            await AuditLog.logAction({
              actor: metadata.userId,
              role: user.role,
              action: metadata.transactionType || 'TRANSFER',
              object: { 
                type: 'Journal', 
                id: journalId,
                identifier: journalId.toString(),
              },
              metadata: {
                ...metadata,
                journalId: journalId.toString(),
                entryCount: entries.length,
                totalAmount: totalDebits,
                notes: `Journal created: ${metadata.description || ''}`,
              },
            });
          }
        }

        logger.info('Journal created', {
          journalId: journalId.toString(),
          entryCount: entries.length,
          totalDebits,
          totalCredits,
          correlationId: metadata.correlationId,
          transactionType: metadata.transactionType,
        });

        return { journalId, entries: ledgerEntries };
      });

      return { journalId, success: true };
    } catch (error) {
      logger.error('Journal creation failed', {
        error: error.message,
        journalId: journalId.toString(),
        metadata,
      });
      throw error;
    } finally {
      await session.endSession();
    }
  }

  async updateBalance(accountId, session = null) {
    const useSession = session || await mongoose.startSession();
    
    try {
      if (!session) {
        await useSession.startTransaction();
      }

      // Calculate balance from ledger entries
      const balanceData = await LedgerEntry.aggregate([
        { $match: { accountId: new mongoose.Types.ObjectId(accountId), status: 'POSTED' } },
        {
          $group: {
            _id: null,
            totalDebits: { $sum: '$debit' },
            totalCredits: { $sum: '$credit' },
            lastEntry: { $max: '$_id' },
          }
        }
      ]).session(useSession);

      const result = balanceData[0] || { totalDebits: 0, totalCredits: 0, lastEntry: null };
      const netBalance = result.totalCredits - result.totalDebits;

      // Get account to determine asset
      const account = await Account.findById(accountId).session(useSession);
      if (!account) {
        throw new NotFoundError('Account not found for balance update');
      }

      // Update or create balance record
      await Balance.findOneAndUpdate(
        { accountId },
        {
          accountId,
          asset: account.asset,
          available: netBalance,
          pending: 0, // Will be calculated separately for pending transactions
          lastEntryId: result.lastEntry,
        },
        { 
          upsert: true, 
          new: true,
          session: useSession,
        }
      );

      if (!session) {
        await useSession.commitTransaction();
      }

      return netBalance;
    } catch (error) {
      if (!session) {
        await useSession.abortTransaction();
      }
      throw error;
    } finally {
      if (!session) {
        await useSession.endSession();
      }
    }
  }

  async getBalance(userId, asset) {
    const account = await Account.findOne({ userId, asset });
    if (!account) {
      return { available: 0, pending: 0, total: 0 };
    }

    const balance = await Balance.findOne({ accountId: account._id });
    if (!balance) {
      return { available: 0, pending: 0, total: 0 };
    }

    return {
      available: balance.available,
      pending: balance.pending,
      total: balance.total,
      asset: balance.asset,
      lastUpdated: balance.updatedAt,
    };
  }

  async getAllBalances(userId) {
    const accounts = await Account.find({ userId });
    const balances = {};

    for (const account of accounts) {
      const balance = await this.getBalance(userId, account.asset);
      balances[account.asset] = balance;
    }

    return balances;
  }

  async transfer(fromUserId, toAddress, amount, asset, description, idempotencyKey, metadata = {}) {
    // Validate inputs
    if (amount <= 0) {
      throw new ValidationError('Transfer amount must be positive');
    }

    // Get sender account
    const fromAccount = await Account.findOne({ userId: fromUserId, asset });
    if (!fromAccount) {
      throw new NotFoundError('Sender account not found');
    }

    // Check sender balance
    const fromBalance = await this.getBalance(fromUserId, asset);
    if (fromBalance.available < amount) {
      throw new ValidationError('Insufficient balance');
    }

    // Validate sender wallet (this would integrate with WalletService)
    const WalletService = require('./WalletService');
    const senderWallet = await WalletService.validateWalletForTransaction(
      fromUserId, 
      toAddress, 
      'hedera', // Default network, could be parameterized
      amount, 
      'transfer'
    );

    // Find recipient by wallet address (simplified - in real implementation, might need more complex logic)
    const recipientWallet = await require('../models').Wallet.findOne({ 
      address: toAddress.toLowerCase(),
      whitelistState: config.walletStatus.WHITELISTED,
      isActive: true,
    });

    if (!recipientWallet) {
      throw new NotFoundError('Recipient wallet not found or not whitelisted');
    }

    // Get recipient account
    const toAccount = await Account.findOne({ 
      userId: recipientWallet.userId, 
      asset 
    });

    if (!toAccount) {
      throw new NotFoundError('Recipient account not found');
    }

    // Calculate fees
    const systemConfig = await require('../models').Config.getConfig();
    const feeAmount = (amount * systemConfig.feeStructure.transferFeeBps) / 10000;
    const netAmount = amount - feeAmount;

    // Create journal entries
    const entries = [
      {
        accountId: fromAccount._id,
        debit: amount,
        meta: {
          type: config.transactionTypes.TRANSFER,
          description: description || 'Transfer',
          reference: toAddress,
          counterparty: {
            userId: recipientWallet.userId,
            walletAddress: toAddress,
            country: recipientWallet.country,
          },
        },
      },
      {
        accountId: toAccount._id,
        credit: netAmount,
        meta: {
          type: config.transactionTypes.TRANSFER,
          description: description || 'Transfer received',
          reference: senderWallet.address,
          counterparty: {
            userId: fromUserId,
            walletAddress: senderWallet.address,
            country: senderWallet.country,
          },
        },
      },
    ];

    // Add fee entry if applicable
    if (feeAmount > 0) {
      // Find or create system fee account
      const systemFeeAccount = await Account.findOne({ 
        accountType: 'FEE', 
        asset 
      });

      if (systemFeeAccount) {
        entries.push({
          accountId: systemFeeAccount._id,
          credit: feeAmount,
          meta: {
            type: config.transactionTypes.FEE,
            description: 'Transfer fee',
            reference: `${senderWallet.address}->${toAddress}`,
          },
        });
      }
    }

    const result = await this.createJournal(entries, {
      userId: fromUserId,
      transactionType: config.transactionTypes.TRANSFER,
      description: `Transfer ${amount} ${asset} to ${toAddress}`,
      correlationId: metadata.correlationId,
      idempotencyKey,
      amount,
      currency: asset,
      fromAddress: senderWallet.address,
      toAddress,
      feeAmount,
    });

    logger.info('Transfer completed', {
      journalId: result.journalId.toString(),
      fromUserId,
      toUserId: recipientWallet.userId,
      amount,
      asset,
      feeAmount,
      netAmount,
    });

    return {
      journalId: result.journalId,
      amount,
      netAmount,
      feeAmount,
      asset,
      fromAddress: senderWallet.address,
      toAddress,
      status: 'completed',
    };
  }

  async getTransactionHistory(userId, filters = {}, pagination = {}) {
    const { page = 1, limit = 20 } = pagination;
    const skip = (page - 1) * limit;

    // Get user accounts
    const accounts = await Account.find({ userId });
    const accountIds = accounts.map(acc => acc._id);

    const query = {
      accountId: { $in: accountIds },
      status: 'POSTED',
    };

    if (filters.asset) {
      const assetAccounts = await Account.find({ 
        userId, 
        asset: filters.asset 
      });
      query.accountId = { $in: assetAccounts.map(acc => acc._id) };
    }

    if (filters.transactionType) {
      query['meta.type'] = filters.transactionType;
    }

    if (filters.fromDate || filters.toDate) {
      query.createdAt = {};
      if (filters.fromDate) query.createdAt.$gte = new Date(filters.fromDate);
      if (filters.toDate) query.createdAt.$lte = new Date(filters.toDate);
    }

    const [entries, total] = await Promise.all([
      LedgerEntry.find(query)
        .populate('accountId', 'asset userId accountType')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      LedgerEntry.countDocuments(query)
    ]);

    // Group entries by journal for better presentation
    const journalGroups = {};
    entries.forEach(entry => {
      const journalId = entry.journalId.toString();
      if (!journalGroups[journalId]) {
        journalGroups[journalId] = [];
      }
      journalGroups[journalId].push(entry);
    });

    const transactions = Object.keys(journalGroups).map(journalId => ({
      journalId,
      entries: journalGroups[journalId],
      timestamp: journalGroups[journalId][0].createdAt,
      type: journalGroups[journalId][0].meta.type,
      description: journalGroups[journalId][0].meta.description,
    }));

    return {
      transactions,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async checkInvariants() {
    try {
      // Check if all balances match ledger entries
      const accounts = await Account.find({ accountType: 'USER' });
      const issues = [];

      for (const account of accounts) {
        const balance = await Balance.findOne({ accountId: account._id });
        const calculatedBalance = await this.calculateBalanceFromLedger(account._id);

        if (!balance || Math.abs(balance.available - calculatedBalance) > 0.00000001) {
          issues.push({
            accountId: account._id,
            userId: account.userId,
            asset: account.asset,
            storedBalance: balance?.available || 0,
            calculatedBalance,
            difference: (balance?.available || 0) - calculatedBalance,
          });
        }
      }

      // Check if all journals balance
      const unbalancedJournals = await LedgerEntry.aggregate([
        {
          $group: {
            _id: '$journalId',
            totalDebits: { $sum: '$debit' },
            totalCredits: { $sum: '$credit' },
            entryCount: { $sum: 1 },
          }
        },
        {
          $match: {
            $expr: {
              $gt: [
                { $abs: { $subtract: ['$totalDebits', '$totalCredits'] } },
                0.00000001
              ]
            }
          }
        }
      ]);

      return {
        balanceIssues: issues,
        unbalancedJournals,
        timestamp: new Date(),
        healthy: issues.length === 0 && unbalancedJournals.length === 0,
      };
    } catch (error) {
      logger.error('Invariant check failed:', error);
      throw new InternalServerError('Failed to check ledger invariants');
    }
  }

  async calculateBalanceFromLedger(accountId) {
    const result = await LedgerEntry.aggregate([
      { 
        $match: { 
          accountId: new mongoose.Types.ObjectId(accountId),
          status: 'POSTED',
        } 
      },
      {
        $group: {
          _id: null,
          totalDebits: { $sum: '$debit' },
          totalCredits: { $sum: '$credit' },
        }
      }
    ]);

    const data = result[0] || { totalDebits: 0, totalCredits: 0 };
    return data.totalCredits - data.totalDebits;
  }

  async reverseTransaction(adminId, journalId, reason, metadata = {}) {
    const admin = await User.findById(adminId);
    if (!admin || ![config.roles.ADMIN_SUPER, config.roles.ADMIN_TREASURY].includes(admin.role)) {
      throw new AuthorizationError('Insufficient permissions to reverse transactions');
    }

    // Get original journal entries
    const originalEntries = await LedgerEntry.find({ journalId });
    if (!originalEntries.length) {
      throw new NotFoundError('Journal not found');
    }

    // Create reversal entries (swap debits and credits)
    const reversalEntries = originalEntries.map(entry => ({
      accountId: entry.accountId,
      debit: entry.credit || 0,
      credit: entry.debit || 0,
      meta: {
        type: config.transactionTypes.REVERSAL,
        description: `Reversal: ${entry.meta.description}`,
        reference: journalId.toString(),
        originalJournalId: journalId,
        reversalReason: reason,
      },
    }));

    const result = await this.createJournal(reversalEntries, {
      userId: adminId,
      transactionType: config.transactionTypes.REVERSAL,
      description: `Transaction reversal: ${reason}`,
      originalJournalId: journalId.toString(),
      reversalReason: reason,
      ...metadata,
    });

    await AuditLog.logAction({
      actor: adminId,
      role: admin.role,
      action: 'REVERSAL',
      object: { 
        type: 'Journal', 
        id: journalId,
        identifier: journalId.toString(),
      },
      metadata: {
        ...metadata,
        reversalJournalId: result.journalId.toString(),
        reason,
        notes: 'Transaction reversed by admin',
      },
    });

    logger.warn('Transaction reversed', {
      adminId,
      originalJournalId: journalId.toString(),
      reversalJournalId: result.journalId.toString(),
      reason,
    });

    return result;
  }
}

module.exports = new LedgerService();