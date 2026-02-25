import React, { useState } from "react";
import {
  Vote,
  AlertTriangle,
  TrendingUp,
  Loader2,
  RefreshCw,
} from "lucide-react";

import { Card, CardContent } from "./ui/card";
import { Button } from "./ui/button";
import Layout from "./Layout/Layout";
import List from "./Governance/List";
import { useGetProposalsQuery } from "../store/api/governanceApiSlice";

const Governance = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const limit = 10; // Items per page

  const {
    data: proposalsData,
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
  } = useGetProposalsQuery({ page: currentPage, limit });

  // Handle Load More functionality
  const handleLoadMore = () => {
    if (proposalsData?.hasNextPage && !isFetching) {
      setCurrentPage((prev) => prev + 1);
    }
  };

  // Handle refresh
  const handleRefresh = () => {
    setCurrentPage(1);
    refetch();
  };

  const proposals = proposalsData?.proposals || [];
  const totalProposals = proposalsData?.totalProposals || 0;
  const hasNextPage = proposalsData?.hasNextPage || false;

  return (
    <Layout
      title="Governance Oversight"
      ButtonComponent={
        <Button
          onClick={handleRefresh}
          disabled={isLoading || isFetching}
          variant="outline"
        >
          {isLoading || isFetching ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-2" />
          )}
          Refresh
        </Button>
      }
    >
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Vote className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-2xl font-bold">
                  {isLoading ? (
                    <Loader2 className="h-6 w-6 animate-spin" />
                  ) : (
                    totalProposals
                  )}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-200">
                  Total Proposals
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-2xl font-bold">
                  {isLoading ? (
                    <Loader2 className="h-6 w-6 animate-spin" />
                  ) : (
                    proposals.filter(
                      (p) => p.isActive || p.status?.toLowerCase() === "active"
                    ).length
                  )}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-200">
                  Active Votes
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Proposals List */}
      <List
        proposals={proposals}
        isLoading={isLoading}
        isFetching={isFetching}
      />

      {/* Load More Button */}
      {hasNextPage && (
        <div className="flex justify-center mt-6">
          <Button
            onClick={handleLoadMore}
            disabled={isFetching}
            variant="outline"
            size="lg"
            className="min-w-[200px]"
          >
            {isFetching ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Loading More...
              </>
            ) : (
              <>
                Load More Proposals
                <TrendingUp className="h-4 w-4 ml-2" />
              </>
            )}
          </Button>
        </div>
      )}

      {/* Pagination Info */}
      <div className="flex justify-center mt-4">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Showing {proposals.length} of {totalProposals} proposals
        </p>
      </div>

      {/* No more data message */}
      {!hasNextPage && proposals.length > 0 && (
        <div className="flex justify-center mt-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            🎉 You've reached the end of all proposals
          </p>
        </div>
      )}

      {/* Error state */}
      {isError && (
        <div className="flex justify-center mt-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 max-w-md">
            <div className="flex items-center">
              <AlertTriangle className="h-5 w-5 text-red-600 mr-2" />
              <div>
                <h3 className="text-red-800 font-medium">
                  Failed to load proposals
                </h3>
                <p className="text-red-600 text-sm mt-1">
                  {error?.data?.message ||
                    error?.message ||
                    "Unknown error occurred"}
                </p>
                <Button
                  onClick={handleRefresh}
                  size="sm"
                  variant="outline"
                  className="mt-2"
                >
                  Try Again
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default Governance;
