import React, { useState, useEffect, useCallback } from "react";
import { useSelector, useDispatch } from "react-redux";
import { debounce } from "lodash";
import {
  Search,
  CheckCircle,
  XCircle,
  Users,
  AlertTriangle,
} from "lucide-react";

import { Card, CardContent } from "./ui/card";
import { Input } from "./ui/input";
import { useGetUsersQuery } from "../store/api/userManagementApiSlice";
import {
  setFilters,
  setCurrentPage,
  setLimit,
} from "../store/slices/userSlice";
import UserDataTable from "./Table/UserDataTable";
import Layout from "./Layout/Layout";
import { useGetAuditHistoryStatsQuery } from "@/store/api/auditApiSlice";

const UserManagement = () => {
  const dispatch = useDispatch();
  const { filters, currentPage, limit } = useSelector((state) => state.users);
  const [searchInput, setSearchInput] = useState(filters.search || "");
  const [isSearching, setIsSearching] = useState(false);
  const { data: stats, isLoading: isStatsLoading } =
    useGetAuditHistoryStatsQuery();

  const {
    data: usersData,
    isLoading,
    refetch,
    isFetching,
  } = useGetUsersQuery({
    page: currentPage,
    limit,
    search: filters.search,
    status: filters.status,
  });
  const users = usersData?.users || [];
  const totalUsers = usersData?.totalUsers || 0;
  const totalPages = usersData?.totalPages || 0;
  const hasNextPage = usersData?.hasNextPage || false;
  const hasPreviousPage = usersData?.hasPreviousPage || false;

  /**
   * Debounced search function - delays API call by 500ms after user stops typing
   * Prevents excessive API requests while user is typing
   * Resets to first page when search is executed
   */
  const debouncedSearch = useCallback(
    debounce((searchValue) => {
      dispatch(setFilters({ search: searchValue }));
      dispatch(setCurrentPage(1)); // Reset to first page on search
      setIsSearching(false);
    }, 500),
    [dispatch]
  );

  // Sync local search input with Redux filter state
  useEffect(() => {
    setSearchInput(filters.search || "");
  }, [filters.search]);

  /**
   * Handles search input changes with debouncing
   * Shows loading indicator while debounce is active
   * Cancels pending debounce if value matches current filter
   */
  const handleSearchChange = (value) => {
    setSearchInput(value);

    if (value !== filters.search) {
      setIsSearching(true);
    } else {
      setIsSearching(false);
      // Cancel pending debounce if value matches current filter
      debouncedSearch.cancel();
    }

    debouncedSearch(value);
  };

  /**
   * Handles Enter key press - immediately executes search
   * Cancels any pending debounced search and triggers search immediately
   */
  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      debouncedSearch.cancel();
      dispatch(setFilters({ search: searchInput }));
      dispatch(setCurrentPage(1));
      setIsSearching(false);
    }
  };

  useEffect(() => {
    return () => {
      debouncedSearch.cancel();
    };
  }, [debouncedSearch]);

  const handlePageChange = (page) => {
    dispatch(setCurrentPage(page));
  };

  const handlePageSizeChange = (newPageSize) => {
    dispatch(setLimit(newPageSize));
    dispatch(setCurrentPage(1)); // Reset to first page
  };
  return (
    <Layout title="User & KYC Management" ButtonComponent={<></>}>
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-2xl font-bold">
                  {isLoading ? "0" : totalUsers}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-200">
                  Total Users
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
                  {isStatsLoading ? "0" : stats?.totalUsersKycApproved || 0}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-200">
                  KYC Approved
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              <div>
                <p className="text-2xl font-bold">
                  {isStatsLoading ? "0" : stats?.totalUsersKycPending || 0}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-200">
                  Pending Review
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <XCircle className="h-5 w-5 text-red-600" />
              <div>
                <p className="text-2xl font-bold">
                  {isStatsLoading ? "0" : stats?.totalUsersKycRevoked || 0}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-200">
                  Blacklisted
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <XCircle className="h-5 w-5 text-red-600" />
              <div>
                <p className="text-2xl font-bold">
                  {isStatsLoading ? "0" : stats?.totalUsersUnverified || 0}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-200">
                  Unverified
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search
                  className={`absolute left-3 top-3 h-4 w-4 ${
                    isSearching
                      ? "text-blue-500 animate-pulse"
                      : "text-gray-400"
                  }`}
                />
                <Input
                  placeholder="Search users by name or email..."
                  value={searchInput}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="pl-10"
                />
                {isSearching && (
                  <div className="absolute right-3 top-3">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <UserDataTable
        users={users}
        refetch={refetch}
        isLoading={isLoading || isFetching}
        enableApiPagination={true}
        currentPage={currentPage}
        totalPages={totalPages}
        totalCount={totalUsers}
        hasNextPage={hasNextPage}
        hasPreviousPage={hasPreviousPage}
        onPageChange={handlePageChange}
        onPageSizeChange={handlePageSizeChange}
        pageSize={limit}
      />
    </Layout>
  );
};

export default UserManagement;
