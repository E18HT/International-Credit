import React from "react";
import { Card, CardHeader, CardContent } from "../ui/card";
import { useNavigate } from "react-router-dom";
import { Badge } from "../ui/badge";
import { getRemainingDays } from "@/lib/utils";
import { Progress } from "../ui/progress";
import { Clock, CheckCircle, XCircle, FileText } from "lucide-react";
import { useReadContract } from "wagmi";
import { Address } from "@/lib/Address";
import GovernanceControllerAbi from "@/Abi/GovernanceController.json";
import { useAccount } from "wagmi";
import ICGOVTAbi from "@/Abi/ICGOVT.json";
import { formatUnits } from "viem";

const getStatusIcon = (status: string) => {
  switch (status) {
    case "ACTIVE":
      return <Clock className="w-4 h-4" />;
    case "APPROVED":
      return <CheckCircle className="w-4 h-4" />;
    case "REJECTED":
      return <XCircle className="w-4 h-4" />;
    default:
      return <FileText className="w-4 h-4" />;
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case "ACTIVE":
      return "bg-warning text-warning-foreground";
    case "APPROVED":
      return "bg-success text-success-foreground";
    case "REJECTED":
      return "bg-destructive text-destructive-foreground";
    default:
      return "bg-muted text-muted-foreground";
  }
};
const GovCard = ({ proposal }) => {
  const navigate = useNavigate();

  const { address } = useAccount();

  const { data: totalVotesCount, refetch: icValueRefetch } = useReadContract({
    functionName: "getProposalVotes",
    abi: GovernanceControllerAbi.abi,
    address: Address.GOVERNANCE_CONTROLLER_ADDRESS,
    args: [proposal?.proposalId],
  });
  const { data: isVotedByMe, refetch: isVotedByMeRefetch } = useReadContract({
    functionName: "hasVoted",
    abi: GovernanceControllerAbi.abi,
    address: Address.GOVERNANCE_CONTROLLER_ADDRESS,
    args: [proposal?.proposalId, address],
  });

  const {
    data: againstVotesCount,
    refetch: againstVotesRefetch,
    isFetching: isAgainstVotesCountFetching,
  } = useReadContract({
    functionName: "getProposalAgainstVotes",
    abi: GovernanceControllerAbi.abi,
    address: Address.GOVERNANCE_CONTROLLER_ADDRESS,
    args: [proposal?.proposalId],
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
  const totalVotes = formatUnits(totalSupplyData || 0n, 18);
  const againstVotes = formatUnits(againstVotesCount || 0n, 18);
  const forVotes = formatUnits(totalVotesCount || 0n, 18);

  return (
    <Card
      key={proposal.id}
      className="shadow-card cursor-pointer hover:shadow-lg transition-shadow"
      onClick={() => navigate(`/governance/proposal/${proposal.txHash}`)}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <Badge
            className={`${getStatusColor(
              proposal.status
            )} flex items-center gap-1 w-fit`}
          >
            {getStatusIcon(proposal.status)}
            {proposal.status}
          </Badge>
          <span
            className={`font-medium ${
              getRemainingDays(proposal.createdAt) < 0
                ? "text-red-600"
                : "text-gray-600 dark:text-gray-200"
            }`}
          >
            {" "}
            {getRemainingDays(proposal.createdAt) < 0
              ? "Expired"
              : `${getRemainingDays(proposal.createdAt)} days left`}
          </span>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <h3 className="font-semibold mb-2">{proposal.description}</h3>
        <p className="text-muted-foreground text-sm mb-4 line-clamp-2">
          {proposal.description}
        </p>

        <div className="mb-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-muted-foreground">Participation</span>
            <span className="text-sm font-medium">
              {Number(forVotes) + Number(againstVotes)} / {totalVotes}
            </span>
          </div>
          <Progress
            value={
              ((Number(forVotes) + Number(againstVotes)) / Number(totalVotes)) *
              100
            }
            className="h-2"
          />
        </div>

        {isVotedByMe && (
          <div className="flex items-center gap-2 text-sm">
            <CheckCircle className="w-4 h-4 text-success" />
            <span className="text-muted-foreground">
              You voted {isVotedByMe ? "for" : "against"}
            </span>
          </div>
        )}
        {/* {proposal.userVoted ? (
    ) : proposal.status === "ACTIVE" ? (
      <div className="flex gap-2">
        <Button size="sm" className="flex-1">
          Vote For
        </Button>
        <Button variant="outline" size="sm" className="flex-1">
          Vote Against
        </Button>
      </div>
    ) : null} */}
      </CardContent>
    </Card>
  );
};

export default GovCard;
