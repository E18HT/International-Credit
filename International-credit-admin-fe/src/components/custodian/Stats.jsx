import React from "react";
import {
  Building,
  CheckCircle,
  Clock,
  AlertTriangle,
  Loader2,
  RefreshCw,
} from "lucide-react";

import { Card, CardContent } from "../ui/card";
import { Button } from "../ui/button";
import { useGetCustodianStatsQuery } from "../../store/api/custodianApiSlice";

const Stats = () => {
  const {
    data: stats,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useGetCustodianStatsQuery();
  // Handle refresh
  const handleRefresh = () => {
    refetch();
  };

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Custodian Statistics</h2>
          <Button variant="outline" disabled>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Loading...
          </Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Card key={index}>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <div className="h-5 w-5 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                  <div className="flex-1">
                    <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-2"></div>
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (isError) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Custodian Statistics</h2>
          <Button onClick={handleRefresh} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertTriangle className="h-5 w-5 text-red-600 mr-2" />
            <div>
              <h3 className="text-red-800 font-medium">
                Failed to load statistics
              </h3>
              <p className="text-red-600 text-sm mt-1">
                {error?.data?.message ||
                  error?.message ||
                  "Unknown error occurred"}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with refresh button */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Custodian Statistics</h2>
        <Button
          onClick={handleRefresh}
          variant="outline"
          size="sm"
          disabled={isFetching}
        >
          {isFetching ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-2" />
          )}
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Building className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-2xl font-bold">
                  {isFetching ? (
                    <Loader2 className="h-6 w-6 animate-spin" />
                  ) : (
                    stats?.totalCustodians || 0
                  )}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-200">
                  Total Custodians
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-2xl font-bold">
                  {isFetching ? (
                    <Loader2 className="h-6 w-6 animate-spin" />
                  ) : (
                    stats?.activeCustodians || 0
                  )}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-200">
                  Active
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Clock className="h-5 w-5 text-yellow-600" />
              <div>
                <p className="text-2xl font-bold">
                  {isFetching ? (
                    <Loader2 className="h-6 w-6 animate-spin" />
                  ) : (
                    stats?.pendingCustodians || 0
                  )}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-200">
                  Inactive
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <div>
                <p className="text-2xl font-bold">
                  {isFetching ? (
                    <Loader2 className="h-6 w-6 animate-spin" />
                  ) : (
                    stats?.suspendedCustodians || 0
                  )}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-200">
                  Suspended
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Stats;
