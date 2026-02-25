import React, { useState } from "react";
import { CalendarIcon, Download, RefreshCw, Filter } from "lucide-react";
import { format } from "date-fns";

import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Calendar } from "./ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { cn } from "../lib/utils";
import Layout from "./Layout/Layout";
import TransactionStats from "./TransactionManagement/TransactionStats";
import TransactionDataTable from "./TransactionManagement/TransactionDataTable";
import TransactionDetailsModal from "./TransactionManagement/TransactionDetailsModal";
import {
  useGetTransactionStatsQuery,
  useGetTransactionsQuery,
  useExportTransactionsMutation,
} from "../store/api/transactionApiSlice";

const TransactionManagement = () => {
  const [filters, setFilters] = useState({
    page: 1,
    limit: 10,
    transactionType: "all",
    status: "all",
    currency: "all",
    startDate: "",
    endDate: "",
    userSearch: "",
  });

  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [dateRange, setDateRange] = useState({
    from: undefined,
    to: undefined,
  });

  const {
    data: stats,
    isLoading: statsLoading,
    refetch: refetchStats,
  } = useGetTransactionStatsQuery();

  const {
    data: transactionsData,
    isLoading: transactionsLoading,
    isFetching: transactionsFetching,
    refetch: refetchTransactions,
  } = useGetTransactionsQuery(filters);

  const [exportTransactions, { isLoading: exportLoading }] =
    useExportTransactionsMutation();

  /**
   * Updates filter state and resets pagination to first page
   * Ensures user sees results from the beginning when filters change
   */
  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
      page: 1, // Reset to first page when filters change
    }));
  };

  /**
   * Handles date range selection from calendar component
   * Converts Date objects to ISO date strings (yyyy-MM-dd) for API
   * Resets pagination when date range changes
   */
  const handleDateRangeChange = (range) => {
    setDateRange(range);
    setFilters((prev) => ({
      ...prev,
      // Format dates as ISO strings for API compatibility
      startDate: range.from ? format(range.from, "yyyy-MM-dd") : "",
      endDate: range.to ? format(range.to, "yyyy-MM-dd") : "",
      page: 1,
    }));
  };

  const handleSearch = (searchValue) => {
    setFilters((prev) => ({
      ...prev,
      search: searchValue,
      page: 1,
    }));
  };

  const handleViewDetails = (transaction) => {
    setSelectedTransaction(transaction);
    setIsDetailsModalOpen(true);
  };

  const handleExport = async () => {
    try {
      await exportTransactions(filters);
    } catch (error) {
      console.error("Export failed:", error);
    }
  };

  const handleRefresh = () => {
    refetchStats();
    refetchTransactions();
  };

  const clearFilters = () => {
    setFilters({
      page: 1,
      limit: 10,
      transactionType: "all",
      status: "all",
      currency: "all",
      startDate: "",
      endDate: "",
      userSearch: "",
    });
    setDateRange({ from: undefined, to: undefined });
  };

  /**
   * Checks if any filters are active (not default values)
   * Used to show/hide "Clear Filters" button
   * Excludes default values: page=1, limit=20, empty strings
   */
  const hasActiveFilters = Object.values(filters).some(
    (value) => value && value !== "" && value !== 1 && value !== 20
  );

  return (
    <Layout
      title="Transaction Management"
      description="Monitor, manage, and review all user transactions in real-time."
      ButtonComponent={<></>}
    >
      <TransactionStats stats={stats} isLoading={statsLoading} />
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center">
              <Filter className="h-5 w-5 mr-2" />
              Filters
            </span>
            <div className="flex items-center space-x-2">
              {hasActiveFilters && (
                <Button variant="outline" size="sm" onClick={clearFilters}>
                  Clear Filters
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={statsLoading || transactionsLoading}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExport}
                disabled={exportLoading}
              >
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <Label htmlFor="transactionType">Transaction Type</Label>
              <Select
                value={filters?.transactionType}
                onValueChange={(value) =>
                  handleFilterChange("transactionType", value)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="credit">Credit</SelectItem>
                  <SelectItem value="debit">Debit</SelectItem>
                  <SelectItem value="refund">Refund</SelectItem>
                  <SelectItem value="withdrawal">Withdrawal</SelectItem>
                  <SelectItem value="purchase">Purchase</SelectItem>
                  <SelectItem value="staking">Staking</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="status">Status</Label>
              <Select
                value={filters.status}
                onValueChange={(value) => handleFilterChange("status", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="currency">Currency</Label>
              <Select
                value={filters.currency}
                onValueChange={(value) => handleFilterChange("currency", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Currencies" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Currencies</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="EURO">EURO</SelectItem>
                  <SelectItem value="GBP">GBP</SelectItem>
                  <SelectItem value="IC">IC Token</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Date Range</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal gap-0 overflow-hidden",
                      !dateRange.from && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange.from ? (
                      dateRange.to ? (
                        <>
                          {format(dateRange.from, "LLL dd, y")} -{" "}
                          {format(dateRange.to, "LLL dd, y")}
                        </>
                      ) : (
                        format(dateRange.from, "LLL dd, y")
                      )
                    ) : (
                      <span>Pick a date range</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={dateRange.from}
                    selected={dateRange}
                    onSelect={handleDateRangeChange}
                    numberOfMonths={2}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div>
              <Label htmlFor="userSearch">User Search</Label>
              <Input
                id="userSearch"
                placeholder="Email / User ID"
                value={filters.userSearch}
                onChange={(e) =>
                  handleFilterChange("userSearch", e.target.value)
                }
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <TransactionDataTable
        transactions={transactionsData?.transactions || []}
        isLoading={transactionsLoading || transactionsFetching}
        onViewDetails={handleViewDetails}
        enableApiPagination={true}
        currentPage={transactionsData?.pagination?.page || filters.page}
        totalPages={transactionsData?.pagination?.pages || 1}
        totalCount={transactionsData?.pagination?.total || 0}
        pageSize={transactionsData?.pagination?.limit || filters.limit}
        hasNextPage={
          (transactionsData?.pagination?.page || 1) <
          (transactionsData?.pagination?.pages || 1)
        }
        hasPreviousPage={(transactionsData?.pagination?.page || 1) > 1}
        onPageChange={(page) => setFilters((prev) => ({ ...prev, page }))}
        onPageSizeChange={(newLimit) =>
          setFilters((prev) => ({ ...prev, limit: newLimit, page: 1 }))
        }
      />

      {/* Transaction Details Modal */}
      <TransactionDetailsModal
        transaction={selectedTransaction}
        isOpen={isDetailsModalOpen}
        onClose={() => {
          setIsDetailsModalOpen(false);
          setSelectedTransaction(null);
        }}
        isLoading={false}
      />
    </Layout>
  );
};

export default TransactionManagement;
