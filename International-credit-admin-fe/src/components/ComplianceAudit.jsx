import React, { useState } from "react";
import {
  FileText,
  Filter,
  Calendar,
  AlertTriangle,
  CheckCircle,
  User,
  Activity,
  Loader2,
  RefreshCw,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Alert, AlertDescription } from "./ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import { useToast } from "../hooks/use-toast";
import Layout from "./Layout/Layout";
import {
  useGetAuditHistoryStatsQuery,
  useGetAuditLogsQuery,
} from "../store/api/auditApiSlice";
import { getActionBadge, auditActions } from "../utils/utils";
const ComplianceAudit = () => {
  const [filters, setFilters] = useState({
    page: 1,
    limit: 10,
    search: "",
    action: "",
    startDate: "",
    endDate: "",
  });
  const { toast } = useToast();
  const [timeRange, setTimeRange] = useState("all");
  const { data: stats, isLoading: isStatsLoading } =
    useGetAuditHistoryStatsQuery("30d");
  // API hook
  const {
    data: auditData,
    isLoading,
    isError,
    error,
    refetch,
  } = useGetAuditLogsQuery(filters);

  const logs = auditData?.logs || [];
  const totalLogs = auditData?.totalLogs || 0;
  const totalPages = auditData?.totalPages || 0;
  const hasNextPage = auditData?.hasNextPage || false;
  const hasPreviousPage = auditData?.hasPreviousPage || false;

  // Handle filter changes
  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
      page: 1, // Reset to first page when filters change
    }));
  };

  /**
   * Handles date range filter selection
   * Converts time range string (e.g., "7", "30") to ISO date strings
   * Calculates start date as N days ago from current date
   * Resets pagination when date range changes
   */
  const handleDateRangeChange = (range) => {
    let startDate = "";
    let endDate = "";
    setTimeRange(range);
    if (range !== "all") {
      const now = new Date();
      const daysAgo = parseInt(range);
      // Calculate cutoff date: current time - (daysAgo * milliseconds per day)
      const cutoffDate = new Date(
        now.getTime() - daysAgo * 24 * 60 * 60 * 1000
      );
      // Format as ISO date string (yyyy-MM-dd) for API
      startDate = cutoffDate.toISOString().split("T")[0];
      endDate = now.toISOString().split("T")[0];
    }

    setFilters((prev) => ({
      ...prev,
      startDate,
      endDate,
      page: 1,
    }));
  };

  // Handle pagination
  const handlePageChange = (newPage) => {
    setFilters((prev) => ({ ...prev, page: newPage }));
  };

  const uniqueActions = [...new Set(auditActions)];
  // Show error state
  if (isError) {
    return (
      <Layout title="Compliance & Audit Logs" ButtonComponent={<></>}>
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            Failed to load audit logs:{" "}
            {error?.data?.message || error?.message || "Unknown error"}
            <Button
              variant="outline"
              size="sm"
              onClick={refetch}
              className="ml-2"
            >
              <RefreshCw className="h-4 w-4 mr-1" />
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      </Layout>
    );
  }

  return (
    <Layout
      title="Compliance & Audit Logs"
      ButtonComponent={
        <div className="flex space-x-2">
          <Button variant="outline" onClick={refetch} disabled={isLoading}>
            {isLoading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Refresh
          </Button>
        </div>
      }
    >
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Activity className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-2xl font-bold">
                  {isLoading ? 0 : totalLogs}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-200">
                  Total Logs
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
                  {isStatsLoading ? 0 : stats?.totalSuccessfulActions}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-200">
                  Successful Actions
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
                  {isStatsLoading ? 0 : stats?.totalSecurityActions}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-200">
                  Security Actions
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col  md:flex-row gap-4">
            <Select
              value={filters.action}
              onValueChange={(value) =>
                handleFilterChange("action", value === "all" ? "" : value)
              }
            >
              <SelectTrigger className="w-48 grow">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by action" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                {uniqueActions.map((action) => (
                  <SelectItem key={action} value={action}>
                    {action?.replace(/_/g, " ") || "Unknown"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={timeRange} onValueChange={handleDateRangeChange}>
              <SelectTrigger className="w-48 grow">
                <Calendar className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by date" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="1">Last 24 Hours</SelectItem>
                <SelectItem value="7">Last 7 Days</SelectItem>
                <SelectItem value="30">Last 30 Days</SelectItem>
                <SelectItem value="90">Last 90 Days</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              onClick={() => {
                setFilters({
                  page: 1,
                  limit: 10,
                  search: "",
                  action: "",
                  startDate: "",
                  endDate: "",
                });
                setTimeRange("all");
              }}
            >
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Audit Logs Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            Audit Logs ({isLoading ? "0" : logs.length})
            {totalLogs > logs.length && ` of ${totalLogs}`}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-ic-blue" />
              <span className="ml-2 text-gray-600">Loading audit logs...</span>
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-600 dark:text-gray-200 mb-2">
                No Logs Found
              </h3>
              <p className="text-gray-500">
                No audit logs match your current filters.
              </p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Resource</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>IP Address</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>
                        <div className="text-sm">
                          <div>
                            {new Date(
                              log?.timestamp || log?.createdAt
                            ).toLocaleDateString()}
                          </div>
                          <div className="text-gray-500">
                            {new Date(
                              log?.timestamp || log?.createdAt
                            ).toLocaleTimeString()}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <User className="h-4 w-4 text-gray-500" />
                          <div>
                            <div className="text-sm font-medium">
                              {log?.actor?.fullName ||
                                log?.actor?.email ||
                                "Unknown User"}
                            </div>
                            {log?.actor?.email && log?.actor?.fullName && (
                              <div className="text-xs text-gray-500">
                                {log?.actor?.email}
                              </div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          {getActionBadge(log?.action)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">
                          {log?.metadata?.notes || log?.endpoint || "N/A"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">
                          {log?.metadata?.amount?.$numberDecimal || "N/A"}{" "}
                          {log?.metadata?.currency}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={
                            log?.result?.success
                              ? "bg-green-100 text-green-800"
                              : log?.result?.success
                              ? "bg-red-100 text-red-800"
                              : "bg-yellow-100 text-yellow-800"
                          }
                        >
                          {log?.result?.success ? "Success" : "Failed"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm font-mono text-gray-600 dark:text-gray-200">
                          {log?.metadata?.ipAddress || "N/A"}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-gray-600">
                    Showing {(filters.page - 1) * filters.limit + 1} to{" "}
                    {Math.min(filters.page * filters.limit, totalLogs)} of{" "}
                    {totalLogs} results
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(filters.page - 1)}
                      disabled={!hasPreviousPage || isLoading}
                    >
                      Previous
                    </Button>
                    <span className="flex items-center px-3 text-sm">
                      Page {filters.page} of {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(filters.page + 1)}
                      disabled={!hasNextPage || isLoading}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </Layout>
  );
};

export default ComplianceAudit;
