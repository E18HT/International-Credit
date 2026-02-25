import React, { useState } from "react";
import {
  useGetStakingHistoryQuery,
  useUnstakeStakingMutation,
  useWithdrawStakingMutation,
} from "@/store/api/walletApi";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  TrendingUp,
  Clock,
  Calendar,
  ExternalLink,
  ArrowUpDown,
  Download,
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { useWriteContract } from "wagmi";
import { useAccount } from "wagmi";
import { toast } from "sonner";
import { Address } from "@/lib/Address";
import VaultAndYieldAbi from "@/Abi/VaultAndYield.json";
import { client } from "@/lib/utils";
export const StackHistory: React.FC = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const limit = 5;
  const { address } = useAccount();
  const { writeContractAsync } = useWriteContract(); // Function from custom hook

  const [isSubmitting, setIsSubmitting] = useState(false);
  const {
    data: stakingHistory,
    isLoading,
    error,
    refetch,
  } = useGetStakingHistoryQuery({
    page: currentPage,
    limit,
    sortBy: "createdAt",
    sortOrder: "desc",
  });

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "confirmed":
        return "bg-green-100 text-green-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "failed":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStakingStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "active":
        return "bg-blue-100 text-blue-800";
      case "matured":
        return "bg-green-100 text-green-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "MMM dd, yyyy HH:mm");
    } catch {
      return dateString;
    }
  };

  const isStakeMatured = (maturityDate: string) => {
    const maturity = new Date(maturityDate);
    const now = new Date();
    return now >= maturity;
  };

  const canUnstake = (createdAt: string) => {
    const created = new Date(createdAt);
    const now = new Date();
    const daysDiff = Math.floor(
      (now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24)
    );
    return daysDiff >= 7;
  };

  const getDaysUntilUnstake = (createdAt: string) => {
    const created = new Date(createdAt);
    const now = new Date();
    const daysDiff = Math.floor(
      (now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24)
    );
    return Math.max(0, 7 - daysDiff);
  };
  const [unstakeStaking, { isLoading: isLoadingUnstake }] =
    useUnstakeStakingMutation();
  const [withdrawStaking, { isLoading: isLoadingWithdraw }] =
    useWithdrawStakingMutation();

  const handleUnstake = async (
    stakeId: string,
    expectedReward: number,
    stakeAmount: number
  ) => {
    setIsSubmitting(true);
    try {
      // Create proposal with combined title and description

      const allowanceHash = await writeContractAsync({
        //@ts-expect-error viem types
        address: Address.VITE_VAULT_AND_YIELD_ADDRESS as `0x${string}`,
        abi: VaultAndYieldAbi.abi,
        functionName: "unstake",
        args: [stakeId],
      });
      const receiptUnStake = await client.waitForTransactionReceipt({
        confirmations: 1,
        hash: allowanceHash,
      });

      const proposalTransaction = {
        stakingId: stakeId,
        txHash: receiptUnStake.transactionHash,
        blockHash: receiptUnStake.blockHash,
        blockNumber: Number(receiptUnStake.blockNumber),
        from: receiptUnStake.from,
        to: receiptUnStake.to,
        gasUsed: receiptUnStake.gasUsed.toString(),
        gasPrice: receiptUnStake.effectiveGasPrice.toString(),
        transactionFee: 0,
        network: "hedera",
        withdrawnAmount: stakeAmount,
        actualReward: expectedReward,
        description: "Unstaking stake",
      };

      //   // Record transaction in backend
      try {
        //@ts-expect-error viem types
        const res = await unstakeStaking(proposalTransaction);
        if (res?.status === "success") {
          toast.success("Unstaking stake successfully!", {
            description: "Transaction recorded and proposal is now active",
          });
        }
      } catch (apiError) {
        console.error("Failed to record transaction:", apiError);
        toast.warning("Unstaking stake but failed to record", {
          description:
            "The blockchain transaction succeeded but backend recording failed",
        });
      }
    } catch (err) {
      console.error("Error creating proposal:", err);
      toast.error("Failed to create proposal", {
        description: "Please try again",
      });
      setIsSubmitting(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleWithdraw = async (
    stakeId: string,
    id: string,
    expectedReward: number,
    stakeAmount: number
  ) => {
    setIsSubmitting(true);
    try {
      // Create proposal with combined title and description

      const allowanceHash = await writeContractAsync({
        //@ts-expect-error viem types
        address: Address.VITE_VAULT_AND_YIELD_ADDRESS as `0x${string}`,
        abi: VaultAndYieldAbi.abi,
        functionName: "withdraw",
        args: [stakeId],
      });
      const receiptUnStake = await client.waitForTransactionReceipt({
        confirmations: 1,
        hash: allowanceHash,
      });

      const proposalTransaction = {
        txHash: receiptUnStake.transactionHash,
        blockHash: receiptUnStake.blockHash,
        blockNumber: Number(receiptUnStake.blockNumber),
        from: receiptUnStake.from,
        to: receiptUnStake.to,
        gasUsed: receiptUnStake.gasUsed.toString(),
        gasPrice: receiptUnStake.effectiveGasPrice.toString(),
        transactionFee: 0,
        network: "hedera",
        withdrawnAmount: stakeAmount,
        actualReward: expectedReward,
        description: "Withdrawing stake",
      };

      //   // Record transaction in backend
      try {
        const res = await withdrawStaking({
          stakingId: stakeId,
          withdrawData: proposalTransaction,
        });
        if (res?.status === "success") {
          toast.success("Withdrawing stake successfully!", {
            description: "Transaction recorded and proposal is now active",
          });
        }
      } catch (apiError) {
        console.error("Failed to record transaction:", apiError);
        toast.warning("Withdrawing stake but failed to record", {
          description:
            "The blockchain transaction succeeded but backend recording failed",
        });
      }
    } catch (err) {
      console.error("Error creating proposal:", err);
      toast.error("Failed to create proposal", {
        description: "Please try again",
      });
      setIsSubmitting(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin" />
        <span className="ml-2">Loading staking history...</span>
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">
            <p className="text-red-600 mb-4">Failed to load staking history</p>
            <Button onClick={() => refetch()} variant="outline">
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }
  if (
    !stakingHistory?.data?.stakes ||
    stakingHistory.data.stakes.length === 0
  ) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">
            <TrendingUp className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Staking History</h3>
            <p className="text-gray-600">You haven't staked any tokens yet.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4 overflow-y-auto">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Staking History</h2>
        <Button onClick={() => refetch()} variant="outline" size="sm">
          Refresh
        </Button>
      </div>

      <div className="space-y-4">
        {stakingHistory.data.stakes.map((item) => (
          <Card key={item._id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <TrendingUp className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">
                      {item.stakeAmount} {item.tokenSymbol} Staked
                    </CardTitle>
                    <CardDescription>{item.description}</CardDescription>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <Badge className={getStatusColor(item.status)}>
                    {item.status}
                  </Badge>
                  <Badge className={getStakingStatusColor(item.stakingStatus)}>
                    {item.stakingStatus}
                  </Badge>
                </div>
              </div>
            </CardHeader>

            <CardContent className="pt-0">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <TrendingUp className="w-4 h-4" />
                    <span>APY</span>
                  </div>
                  <p className="font-semibold">{item.percentage}%</p>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Clock className="w-4 h-4" />
                    <span>Duration</span>
                  </div>
                  <p className="font-semibold">{item.stakeDuration} days</p>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Calendar className="w-4 h-4" />
                    <span>Maturity</span>
                  </div>
                  <p className="font-semibold text-sm">
                    {formatDate(item.maturityDate)}
                  </p>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <TrendingUp className="w-4 h-4" />
                    <span>Expected Reward</span>
                  </div>
                  <p className="font-semibold">
                    {item.expectedReward.toFixed(4)} {item.tokenSymbol}
                  </p>
                </div>
              </div>

              {/* Additional Info Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Calendar className="w-4 h-4" />
                    <span>Days Until Maturity</span>
                  </div>
                  <p className="font-semibold">{item.daysUntilMaturity} days</p>
                </div>

                <div className="flex items-center justify-end">
                  {isStakeMatured(item.maturityDate) ? (
                    <Button
                      onClick={() =>
                        handleWithdraw(
                          item?.stakeId,
                          item._id,
                          item.expectedReward,
                          item.stakeAmount
                        )
                      }
                      className="flex items-center gap-2"
                      variant="default"
                    >
                      <Download className="w-4 h-4" />
                      Withdraw
                    </Button>
                  ) : canUnstake(item.createdAt) ? (
                    <Button
                      onClick={() =>
                        handleUnstake(
                          item.stakeId,
                          item.expectedReward,
                          item.stakeAmount
                        )
                      }
                      className="flex items-center gap-2"
                      variant="outline"
                    >
                      <ArrowUpDown className="w-4 h-4" />
                      Unstake
                    </Button>
                  ) : (
                    <div className="text-sm text-gray-500 px-3 py-2">
                      Unstake available in {getDaysUntilUnstake(item.createdAt)}{" "}
                      days
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Pagination */}
      {stakingHistory.data.pagination &&
        stakingHistory.data.pagination.pages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-6">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            <span className="text-sm text-gray-600">
              Page {currentPage} of {stakingHistory.data.pagination.pages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((prev) => prev + 1)}
              disabled={currentPage >= stakingHistory.data.pagination.pages}
            >
              Next
            </Button>
          </div>
        )}
    </div>
  );
};

export default StackHistory;
