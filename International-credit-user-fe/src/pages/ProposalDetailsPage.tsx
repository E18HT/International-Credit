import { ArrowLeft, Clock, Users, TrendingUp, Loader2 } from "lucide-react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useAppSelector, useAppDispatch } from "@/hooks/useRedux";
import { Vote } from "@/store/slices/governanceSlice";
import { useToast } from "@/hooks/use-toast";
import { useGetProposalQuery } from "@/store/api/governanceApi";
import { client, getRemainingDays } from "@/lib/utils";
import { useWriteContract, useReadContract, useAccount } from "wagmi";
import GovernanceControllerAbi from "@/Abi/GovernanceController.json";
import { Address } from "@/lib/Address";
import { useState } from "react";
import { toast } from "sonner";
import { useICGOVTBalance } from "@/hooks/useICGOVTBalance";
import { formatUnits } from "viem";
import ICGOVTAbi from "@/Abi/ICGOVT.json";

export const ProposalDetailsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState({
    for: false,
    against: false,
  });

  const {
    data: totalSupplyData,
    isLoading: isLoadingTotalSupply,
    isFetching: isFetchingTotalSupply,
    refetch: totalSupplyRefetch,
  } = useReadContract({
    functionName: "totalSupply",
    abi: ICGOVTAbi.abi,
    address: Address.ICGOV_TOKEN_ADDRESS,
  });
  const dispatch = useAppDispatch();
  const { address } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const { data: proposalData, isLoading } = useGetProposalQuery(id);
  const {
    totalVotesCount,
    isVotedByMe,
    isVotedByMeFetching,
    formattedBalance,
    againstVotesCount,
    isVotedByMeRefetch,
    againstVotesRefetch,
    icValueRefetch,
  } = useICGOVTBalance(proposalData?.proposalId);
  const handleVote = async (voteType: "for" | "against") => {
    setIsSubmitting({ ...isSubmitting, [voteType]: true });
    try {
      const allowanceHash = await writeContractAsync({
        address: Address.GOVERNANCE_CONTROLLER_ADDRESS as `0x${string}`,
        abi: GovernanceControllerAbi.abi,
        functionName: "vote",
        args: [proposalData.proposalId, voteType == "for"],
      });
      const receipt = await client.waitForTransactionReceipt({
        confirmations: 1,
        hash: allowanceHash,
      });
      toast.success(`Vote Submitted`, {
        description: `You voted ${voteType} the proposal`,
      });
    } catch (error) {
      console.error(error);
      toast.error("Failed to vote", {
        description: "Please try again",
      });
    } finally {
      isVotedByMeRefetch();
      againstVotesRefetch();
      icValueRefetch();
      totalSupplyRefetch();
      setIsSubmitting({ ...isSubmitting, [voteType]: false });
    }
  };

  // Mock voting data for display
  const forVotes = formatUnits(totalVotesCount || 0n, 18);
  const againstVotes = formatUnits(againstVotesCount || 0n, 18);
  const totalVotes = formatUnits(totalSupplyData || 0n, 18);
  const forPercentage = (Number(forVotes) / Number(totalVotes)) * 100;
  const againstPercentage = (Number(againstVotes) / Number(totalVotes)) * 100;

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="bg-gradient-primary px-6 py-8 text-white">
        <div className="max-w-md mx-auto">
          <div className="flex items-center gap-4 mb-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/governance")}
              className="text-white hover:bg-white/10"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold">Proposal Details</h1>
              <p className="text-white/80 text-sm">Cast your vote</p>
            </div>
          </div>
        </div>
      </header>

      <div className="px-6 -mt-4 max-w-md mx-auto">
        <Card className="mb-6 shadow-elevated">
          <CardContent className="p-6">
            <Badge className="bg-warning text-warning-foreground mb-4 flex items-center gap-1 w-fit">
              <Clock className="w-4 h-4" />
              ACTIVE
            </Badge>

            <h2 className="text-xl font-bold mb-4">
              {proposalData?.description}
            </h2>

            <p className="text-muted-foreground mb-6">
              Proposal to increase the annual percentage yield for IC token
              staking from 8% to 12% to incentivize more users to stake their
              tokens.
            </p>

            <div className="space-y-4 mb-6">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Proposer:</span>
                <span className="text-sm font-mono">0xABC123...DEF456</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">
                  Time Left:
                </span>
                <span className="text-sm font-medium">
                  {getRemainingDays(proposalData?.createdAt)} days
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="mb-6 shadow-card">
          <CardContent className="p-6">
            <h3 className="font-semibold mb-4">Voting Progress</h3>

            <div className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-success">For</span>
                  <span className="text-sm font-medium">{forVotes} votes</span>
                </div>
                <Progress value={forPercentage} className="h-3 bg-muted">
                  <div
                    className="h-full bg-success rounded-full transition-all"
                    style={{ width: `${forPercentage}%` }}
                  />
                </Progress>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-destructive">
                    Against
                  </span>
                  <span className="text-sm font-medium">
                    {againstVotes?.toLocaleString()} votes
                  </span>
                </div>
                <Progress value={againstPercentage} className="h-3 bg-muted">
                  <div
                    className="h-full bg-destructive rounded-full transition-all"
                    style={{ width: `${againstPercentage}%` }}
                  />
                </Progress>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardContent className="p-6">
            <h3 className="font-semibold mb-4">Cast Your Vote</h3>
            <p className="text-sm text-muted-foreground mb-4">
              You have {formattedBalance} ICGOVT voting power
            </p>

            {isVotedByMeFetching ? (
              <div className="text-center py-4">
                <Loader2 className="mx-auto w-4 h-4 animate-spin" />
              </div>
            ) : isVotedByMe ? (
              <div className="text-center py-4">
                <p className="text-sm text-muted-foreground">
                  You already voted this proposal
                </p>
              </div>
            ) : (
              <div className="flex gap-3">
                <Button
                  className="flex-1 bg-success hover:bg-success/90 text-white"
                  onClick={() => handleVote("for")}
                >
                  {isSubmitting.for ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    "Vote For"
                  )}
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 text-destructive border-destructive hover:bg-destructive hover:text-white"
                  onClick={() => handleVote("against")}
                >
                  {isSubmitting.against ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    "Vote Against"
                  )}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
