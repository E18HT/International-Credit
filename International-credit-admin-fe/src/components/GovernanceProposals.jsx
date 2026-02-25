import React from "react";
import {
  Vote,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Loader2,
  FileText,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Alert, AlertDescription } from "./ui/alert";
import {
  useGetProposalsQuery,
  useVoteOnProposalMutation,
} from "../store/api/governanceApiSlice";

const GovernanceProposals = () => {
  // API hooks - this uses the getProposals endpoint you requested
  const {
    data: proposalData,
    isLoading,
    isError,
    error,
    refetch,
  } = useGetProposalsQuery();

  const [voteOnProposal, { isLoading: isVoting }] = useVoteOnProposalMutation();

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { color: "bg-yellow-100 text-yellow-800", icon: Clock },
      active: { color: "bg-blue-100 text-blue-800", icon: Vote },
      succeeded: { color: "bg-green-100 text-green-800", icon: CheckCircle },
      defeated: { color: "bg-red-100 text-red-800", icon: XCircle },
      executed: { color: "bg-purple-100 text-purple-800", icon: CheckCircle },
      cancelled: { color: "bg-gray-100 text-gray-800", icon: XCircle },
      queued: { color: "bg-orange-100 text-orange-800", icon: Clock },
    };

    const config = statusConfig[status] || {
      color: "bg-gray-100 text-gray-800",
      icon: AlertTriangle,
    };
    const Icon = config.icon;

    return (
      <Badge className={`${config.color} flex items-center gap-1`}>
        <Icon className="h-3 w-3" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const handleVote = async (proposalId, support) => {
    try {
      await voteOnProposal({
        proposalId,
        support,
        reason: support ? "Supporting this proposal" : "Opposing this proposal",
      }).unwrap();
    } catch (error) {
      // Error handled by baseQuery
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (isLoading) {
    return (
      <Card className="border border-gray-200 dark:border-gray-700">
        <CardHeader>
          <CardTitle className="flex items-center">
            <FileText className="h-5 w-5 mr-2" />
            My Governance Proposals
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-ic-blue" />
            <span className="ml-2 text-gray-600">Loading proposals...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card className="border border-gray-200 dark:border-gray-700">
        <CardHeader>
          <CardTitle className="flex items-center">
            <FileText className="h-5 w-5 mr-2" />
            My Governance Proposals
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert className="border-red-200 bg-red-50">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              Failed to load proposals:{" "}
              {error?.data?.message || error?.message || "Unknown error"}
              <Button
                variant="outline"
                size="sm"
                onClick={refetch}
                className="ml-2"
              >
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  const proposals = proposalData?.proposals || [];
  const stats = {
    total: proposalData?.totalProposals || 0,
    active: proposalData?.activeProposals || 0,
    pending: proposalData?.pendingProposals || 0,
    completed: proposalData?.completedProposals || 0,
  };

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border border-gray-200 dark:border-gray-700">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-ic-blue">{stats.total}</div>
            <p className="text-sm text-gray-600">Total Proposals</p>
          </CardContent>
        </Card>
        <Card className="border border-gray-200 dark:border-gray-700">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-600">
              {stats.active}
            </div>
            <p className="text-sm text-gray-600">Active</p>
          </CardContent>
        </Card>
        <Card className="border border-gray-200 dark:border-gray-700">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-yellow-600">
              {stats.pending}
            </div>
            <p className="text-sm text-gray-600">Pending</p>
          </CardContent>
        </Card>
        <Card className="border border-gray-200 dark:border-gray-700">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">
              {stats.completed}
            </div>
            <p className="text-sm text-gray-600">Completed</p>
          </CardContent>
        </Card>
      </div>

      {/* Proposals List */}
      <Card className="border border-gray-200 dark:border-gray-700">
        <CardHeader>
          <CardTitle className="flex items-center">
            <FileText className="h-5 w-5 mr-2" />
            My Governance Proposals
          </CardTitle>
        </CardHeader>
        <CardContent>
          {proposals.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-2">No proposals found</p>
              <p className="text-sm text-gray-500">
                You haven't created or participated in any governance proposals
                yet.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {proposals.map((proposal) => (
                <Card
                  key={proposal.id}
                  className="border border-gray-100 dark:border-gray-600"
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg text-gray-900 dark:text-gray-100 dark:text-gray-100">
                          {proposal.title}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          {proposal.description}
                        </p>
                      </div>
                      <div className="ml-4">
                        {getStatusBadge(proposal.status)}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wide">
                          Type
                        </p>
                        <p className="text-sm font-medium capitalize">
                          {proposal.type?.replace("_", " ")}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wide">
                          Created
                        </p>
                        <p className="text-sm font-medium">
                          {formatDate(proposal.createdAt)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wide">
                          Proposer
                        </p>
                        <p className="text-sm font-medium">
                          {proposal.proposer}
                        </p>
                      </div>
                    </div>

                    {/* Voting Info */}
                    {proposal.votesFor !== undefined &&
                      proposal.votesAgainst !== undefined && (
                        <div className="mb-4">
                          <div className="flex justify-between text-sm mb-2">
                            <span className="text-green-600">
                              For: {proposal.votesFor}
                            </span>
                            <span className="text-red-600">
                              Against: {proposal.votesAgainst}
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-green-600 h-2 rounded-full"
                              style={{
                                width: `${
                                  proposal.totalVotes > 0
                                    ? (proposal.votesFor /
                                        proposal.totalVotes) *
                                      100
                                    : 0
                                }%`,
                              }}
                            ></div>
                          </div>
                        </div>
                      )}

                    {/* Action Buttons */}
                    {proposal.status === "active" && (
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          onClick={() => handleVote(proposal.id, true)}
                          disabled={isVoting}
                          className="bg-green-600 hover:bg-green-700 text-white"
                        >
                          {isVoting ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            "Vote Yes"
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleVote(proposal.id, false)}
                          disabled={isVoting}
                          className="border-red-300 text-red-600 hover:bg-red-50"
                        >
                          {isVoting ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            "Vote No"
                          )}
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default GovernanceProposals;
