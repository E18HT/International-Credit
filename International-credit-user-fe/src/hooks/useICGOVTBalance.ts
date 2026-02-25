import { useReadContract, useAccount } from "wagmi";
import { formatUnits } from "viem";
import ICGOVTAbi from "@/Abi/ICGOVT.json";
import { Address } from "@/lib/Address";
import GovernanceControllerAbi from "@/Abi/GovernanceController.json";

export const useICGOVTBalance = (proposalId?: number) => {
  const { address } = useAccount();

  const {
    data: balanceData,
    isLoading,
    isError,
    refetch,
  } = useReadContract({
    functionName: "balanceOf",
    abi: ICGOVTAbi.abi,
    args: [address],
    address: Address.ICGOV_TOKEN_ADDRESS,
    query: {
      enabled: !!address, // Only run query if address exists
    },
  });

  const formattedBalance = balanceData
    ? parseFloat(formatUnits(balanceData as bigint, 18)).toFixed(2)
    : "0";

  const rawBalance = balanceData || 0n;
  const hasBalance = balanceData && (balanceData as bigint) > 0n;

  const {
    data: totalVotesCount,
    refetch: icValueRefetch,
    isFetching: isTotalVotesCountFetching,
  } = useReadContract({
    functionName: "getProposalVotes",
    abi: GovernanceControllerAbi.abi,
    address: Address.GOVERNANCE_CONTROLLER_ADDRESS,
    args: [proposalId],
  });
  const {
    data: againstVotesCount,
    refetch: againstVotesRefetch,
    isFetching: isAgainstVotesCountFetching,
  } = useReadContract({
    functionName: "getProposalAgainstVotes",
    abi: GovernanceControllerAbi.abi,
    address: Address.GOVERNANCE_CONTROLLER_ADDRESS,
    args: [proposalId],
  });

  const {
    data: isVotedByMe,
    isFetching: isVotedByMeFetching,
    refetch: isVotedByMeRefetch,
  } = useReadContract({
    functionName: "hasVoted",
    abi: GovernanceControllerAbi.abi,
    address: Address.GOVERNANCE_CONTROLLER_ADDRESS,
    args: [proposalId, address],
  });
  return {
    balance: rawBalance,
    formattedBalance,
    hasBalance,
    isLoading,
    isError,
    refetch,
    totalVotesCount,
    isVotedByMe,
    isVotedByMeFetching,
    isVotedByMeRefetch,
    againstVotesCount,
    isAgainstVotesCountFetching,
    againstVotesRefetch,
  };
};
