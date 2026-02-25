import React from "react";
import {
  Vote,
  CheckCircle,
  AlertTriangle,
  Clock,
  Loader2,
  Calendar,
  Eye,
} from "lucide-react";
import { format } from "date-fns";
import { useReadContract } from "wagmi";
import { formatUnits } from "viem";

import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import { Progress } from "../ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { getEndDate, getRemainingDays } from "@/utils/utils";
import ICGOVTAbi from "../../utils/Abi/ICGOVT.json";

const getStatusBadge = (status) => {
  switch (status.toLowerCase()) {
    case "active":
      return <Badge className="bg-blue-600">Active</Badge>;
    case "approved":
      return <Badge className="bg-green-600">Approved</Badge>;
    case "rejected":
      return <Badge className="bg-red-600">Rejected</Badge>;
    case "executed":
      return <Badge className="bg-purple-600">Executed</Badge>;
    case "pending":
      return <Badge className="bg-yellow-600">Pending</Badge>;
    case "expired":
      return <Badge className="bg-red-600">Expired</Badge>;
    default:
      return <Badge variant="outline">Unknown</Badge>;
  }
};

const getStatusIcon = (status) => {
  switch (status) {
    case "active":
      return <Vote className="h-4 w-4 text-blue-600" />;
    case "approved":
      return <CheckCircle className="h-4 w-4 text-green-600" />;
    case "rejected":
      return <AlertTriangle className="h-4 w-4 text-red-600" />;
    case "executed":
      return <CheckCircle className="h-4 w-4 text-purple-600" />;
    case "pending":
      return <Clock className="h-4 w-4 text-yellow-600" />;
    default:
      return <Clock className="h-4 w-4 text-gray-600 dark:text-gray-200" />;
  }
};

const calculateQuorumProgress = (votesFor, votesAgainst, quorum) => {
  const totalVotes = votesFor + votesAgainst;
  return (totalVotes / quorum) * 100;
};

const List = ({ proposals, isLoading, isFetching }) => {
  // Loading skeleton for first load
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {Array.from({ length: 4 }).map((_, index) => (
          <Card key={index} className="relative">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1 space-y-3">
                  <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                  <div className="flex space-x-2">
                    <div className="h-5 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                    <div className="h-5 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                  </div>
                </div>
                <div className="h-4 w-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                  <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                </div>
                <div className="flex space-x-2">
                  <div className="h-8 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                  <div className="h-8 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  // Empty state
  if (!proposals || proposals.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Vote className="h-12 w-12 text-gray-400 mb-4" />
        <h3 className="text-lg font-semibold text-gray-600 dark:text-gray-200 mb-2">
          No Proposals Found
        </h3>
        <p className="text-gray-500 text-center max-w-md">
          There are no governance proposals available at the moment. Check back
          later or create a new proposal.
        </p>
      </div>
    );
  }

  const { data: totalSupplyData } = useReadContract({
    functionName: "totalSupply",
    abi: ICGOVTAbi.abi,
    address: import.meta.env.VITE_ICGOV_TOKEN_ADDRESS,
  });

  return (
    <div className="space-y-6">
      {/* Loading indicator for "Load More" */}
      {isFetching && (
        <div className="flex justify-center py-4">
          <div className="flex items-center space-x-2 text-blue-600">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-sm">Loading more proposals...</span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {proposals.map((proposal) => (
          <Card key={proposal._id} className="relative">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-lg">
                    {proposal.description}
                  </CardTitle>
                  <div className="flex items-center space-x-2 mt-2">
                    {getStatusBadge(
                      getRemainingDays(proposal.createdAt) < 0
                        ? "expired"
                        : proposal.votingStatus
                    )}
                  </div>
                </div>
                {getStatusIcon(proposal.status)}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Voting Progress */}
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>Votes Cast</span>
                    <span>
                      {proposal.forVotes + proposal.againstVotes} /{" "}
                      {formatUnits(totalSupplyData || 0, 18)}
                    </span>
                  </div>
                  <Progress
                    value={calculateQuorumProgress(
                      proposal.forVotes,
                      proposal.againstVotes,
                      formatUnits(totalSupplyData || 0, 18)
                    )}
                    className="h-2"
                  />
                </div>

                {/* Vote Breakdown */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-green-600">For:</span>
                    <span className="font-semibold">{proposal.forVotes}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-red-600">Against:</span>
                    <span className="font-semibold">
                      {proposal.againstVotes}
                    </span>
                  </div>
                </div>

                {/* Time Remaining */}
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center text-gray-600 dark:text-gray-200">
                    <Calendar className="h-4 w-4 mr-1" />
                    <span>
                      Ends:{" "}
                      {proposal.votingDeadline &&
                        format(proposal.votingDeadline, "Pp")}
                    </span>
                  </div>
                  <div className="text-right">
                    <span
                      className={`font-medium ${
                        getRemainingDays(proposal.createdAt) < 0
                          ? "text-red-600"
                          : "text-gray-600 dark:text-gray-200"
                      }`}
                    >
                      {getRemainingDays(proposal.createdAt) < 0
                        ? "Expired"
                        : `${getRemainingDays(proposal.createdAt)} days left`}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex space-x-2 pt-2">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button size="sm" variant="outline" className="flex-1">
                        <Eye className="h-4 w-4 mr-2" />
                        View Details
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>{proposal.title}</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <h4 className="font-semibold mb-2">
                            {proposal.description}{" "}
                          </h4>
                          <p className="text-sm text-gray-600 dark:text-gray-200">
                            {proposal.description}
                          </p>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <h4 className="font-semibold mb-2">Voting Stats</h4>
                            <div className="space-y-1 text-sm">
                              <div className="flex justify-between">
                                <span>Votes For:</span>
                                <span className="font-medium text-green-600">
                                  {proposal.forVotes || 0}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span>Votes Against:</span>
                                <span className="font-medium text-red-600">
                                  {proposal.againstVotes || 0}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span>Quorum Required:</span>
                                <span className="font-medium">
                                  {formatUnits(totalSupplyData || 0, 18)}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div>
                            <h4 className="font-semibold mb-2">Timeline</h4>
                            <div className="space-y-1 text-sm">
                              <div className="flex justify-between">
                                <span>End Date:</span>
                                <span>{getEndDate(proposal.createdAt)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Days Remaining:</span>
                                <span
                                  className={
                                    getRemainingDays(proposal.createdAt) < 0
                                      ? "text-red-600"
                                      : ""
                                  }
                                >
                                  {getRemainingDays(proposal.createdAt) < 0
                                    ? "Expired"
                                    : `${getRemainingDays(
                                        proposal.createdAt
                                      )} days left`}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>

                  {proposal.status === "approved" && (
                    <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                      Execute
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default List;
