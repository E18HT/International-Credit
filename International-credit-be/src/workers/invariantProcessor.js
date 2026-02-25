const LedgerService = require('../services/LedgerService');
const { AuditLog } = require('../models');
const logger = require('../utils/logger');

class InvariantProcessor {
  async checkInvariants(job) {
    try {
      logger.info('Starting ledger invariant check');

      const results = await LedgerService.checkInvariants();

      if (!results.healthy) {
        logger.error('Ledger invariant violations detected', {
          balanceIssues: results.balanceIssues.length,
          unbalancedJournals: results.unbalancedJournals.length,
        });

        // Log audit trail for invariant violations
        await AuditLog.logAction({
          actor: null,
          role: 'system',
          action: 'INVARIANT_VIOLATION',
          object: { type: 'Ledger', identifier: 'invariant_check' },
          metadata: {
            balanceIssuesCount: results.balanceIssues.length,
            unbalancedJournalsCount: results.unbalancedJournals.length,
            balanceIssues: results.balanceIssues.slice(0, 10), // Limit details in log
            unbalancedJournals: results.unbalancedJournals.slice(0, 10),
            notes: 'Ledger invariant violations detected',
          },
          result: { success: false },
        });

        // Schedule automatic fixes for balance discrepancies
        if (results.balanceIssues.length > 0) {
          const workerService = require('../worker');
          for (const issue of results.balanceIssues.slice(0, 5)) { // Limit auto-fixes
            await workerService.addJob('invariants', 'fix-balance-discrepancy', {
              accountId: issue.accountId,
              userId: issue.userId,
              asset: issue.asset,
              difference: issue.difference,
            }, {
              delay: 5000, // 5 second delay between fixes
              attempts: 1, // Don't retry balance fixes automatically
            });
          }
        }
      } else {
        logger.info('Ledger invariants check passed - all healthy');
      }

      return {
        success: true,
        timestamp: results.timestamp,
        healthy: results.healthy,
        balanceIssuesCount: results.balanceIssues.length,
        unbalancedJournalsCount: results.unbalancedJournals.length,
        details: results,
      };
    } catch (error) {
      logger.error('Ledger invariant check failed', {
        error: error.message,
      });

      await AuditLog.logAction({
        actor: null,
        role: 'system',
        action: 'INVARIANT_CHECK_ERROR',
        object: { type: 'Ledger', identifier: 'invariant_check' },
        metadata: {
          error: error.message,
          notes: 'Ledger invariant check failed',
        },
        result: { success: false, error: error.message },
      });

      throw error;
    }
  }

  async fixBalanceDiscrepancy(job) {
    const { accountId, userId, asset, difference } = job.data;

    try {
      logger.info('Attempting to fix balance discrepancy', {
        accountId,
        userId,
        asset,
        difference,
      });

      // Recalculate balance from ledger entries
      const calculatedBalance = await LedgerService.calculateBalanceFromLedger(accountId);
      
      // Update the balance record
      const updatedBalance = await LedgerService.updateBalance(accountId);

      const actualDifference = Math.abs(updatedBalance - calculatedBalance);

      if (actualDifference < 0.00000001) { // Essentially zero
        logger.info('Balance discrepancy fixed successfully', {
          accountId,
          userId,
          asset,
          newBalance: updatedBalance,
        });

        await AuditLog.logAction({
          actor: null,
          role: 'system',
          action: 'BALANCE_FIX',
          object: { type: 'Account', id: accountId },
          metadata: {
            userId,
            asset,
            oldDifference: difference,
            newBalance: updatedBalance,
            notes: 'Balance discrepancy automatically fixed',
          },
          result: { success: true },
        });

        return {
          success: true,
          accountId,
          fixed: true,
          newBalance: updatedBalance,
          difference: 0,
        };
      } else {
        // Still has discrepancy - might need manual intervention
        logger.warn('Balance discrepancy could not be automatically fixed', {
          accountId,
          userId,
          asset,
          remainingDifference: actualDifference,
        });

        await AuditLog.logAction({
          actor: null,
          role: 'system',
          action: 'BALANCE_FIX_FAILED',
          object: { type: 'Account', id: accountId },
          metadata: {
            userId,
            asset,
            originalDifference: difference,
            remainingDifference: actualDifference,
            notes: 'Balance discrepancy could not be automatically fixed - manual intervention required',
          },
          result: { success: false },
        });

        return {
          success: false,
          accountId,
          fixed: false,
          remainingDifference: actualDifference,
          requiresManualIntervention: true,
        };
      }
    } catch (error) {
      logger.error('Failed to fix balance discrepancy', {
        accountId,
        userId,
        asset,
        error: error.message,
      });

      await AuditLog.logAction({
        actor: null,
        role: 'system',
        action: 'BALANCE_FIX_ERROR',
        object: { type: 'Account', id: accountId },
        metadata: {
          userId,
          asset,
          difference,
          error: error.message,
          notes: 'Balance discrepancy fix attempt failed',
        },
        result: { success: false, error: error.message },
      });

      throw error;
    }
  }

  async validateJournalIntegrity(job) {
    const { journalId } = job.data;

    try {
      logger.info('Validating journal integrity', { journalId });

      const { LedgerEntry } = require('../models');
      const entries = await LedgerEntry.find({ journalId });

      if (entries.length === 0) {
        throw new Error(`Journal not found: ${journalId}`);
      }

      let totalDebits = 0;
      let totalCredits = 0;

      for (const entry of entries) {
        totalDebits += entry.debit || 0;
        totalCredits += entry.credit || 0;
      }

      const difference = Math.abs(totalDebits - totalCredits);
      const isBalanced = difference < 0.00000001;

      if (!isBalanced) {
        logger.error('Journal integrity violation', {
          journalId,
          totalDebits,
          totalCredits,
          difference,
        });

        await AuditLog.logAction({
          actor: null,
          role: 'system',
          action: 'JOURNAL_INTEGRITY_VIOLATION',
          object: { type: 'Journal', id: journalId },
          metadata: {
            totalDebits,
            totalCredits,
            difference,
            entryCount: entries.length,
            notes: 'Journal does not balance - integrity violation',
          },
          result: { success: false },
        });
      }

      return {
        success: true,
        journalId,
        isBalanced,
        totalDebits,
        totalCredits,
        difference,
        entryCount: entries.length,
      };
    } catch (error) {
      logger.error('Journal integrity validation failed', {
        journalId,
        error: error.message,
      });
      throw error;
    }
  }
}

module.exports = new InvariantProcessor();