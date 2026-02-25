import { useMemo } from "react";
import { Info } from "lucide-react";

import { DataTable } from "../ui/data-table";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import UserDetailsModal from "./UserDetailsModal";
import { getUserStatus } from "@/utils/utils";

const UserDataTable = ({
  users = [],
  isLoading = false,
  // API Pagination props
  enableApiPagination = false,
  currentPage = 1,
  totalPages = 1,
  totalCount = 0,
  hasNextPage = false,
  hasPreviousPage = false,
  onPageChange,
  onPageSizeChange,
  pageSize = 20,
  refetch,
}) => {
  const getStatusBadge = (status) => {
    switch (status) {
      case "VERIFIED":
        return <Badge className="bg-green-600">VERIFIED</Badge>;
      case "PENDING":
        return <Badge className="bg-yellow-600">PENDING</Badge>;
      case "UNVERIFIED":
        return <Badge className="bg-red-600 dark:text-white">UNVERIFIED</Badge>;
      case "FAILED":
        return <Badge className="bg-red-600">FAILED</Badge>;
      default:
        return <Badge className="bg-yellow-600">PENDING</Badge>;
    }
  };

  const getWalletStatusBadge = (status) => {
    switch (status) {
      case true:
        return <Badge className="bg-green-600">VERIFIED</Badge>;
      case false:
        return <Badge className="bg-red-600 dark:text-white">UNVERIFIED</Badge>;
      default:
        return <Badge variant="outline">PENDING</Badge>;
    }
  };

  const columns = useMemo(
    () => [
      {
        accessorKey: "name",
        header: "User",
        cell: ({ row }) => {
          const user = row.original;
          return (
            <div>
              <div className="font-medium">{user?.fullName}</div>
              <div className="text-sm text-gray-500">{user.email}</div>
            </div>
          );
        },
      },
      {
        accessorKey: "identityStatus",
        header: "KYC Status",
        cell: ({ row }) => {
          return getStatusBadge(row.getValue("identityStatus"));
        },
        filterFn: (row, id, value) => {
          return value.includes(row.getValue(id));
        },
      },
      {
        accessorKey: "emailVerified",
        header: "Email Verified",
        cell: ({ row }) => {
          return getWalletStatusBadge(row.getValue("emailVerified"));
        },
      },
      {
        accessorKey: "adminApproval",
        header: "Status",
        cell: ({ row }) => {
          const status = row.getValue("adminApproval").status;
          return getUserStatus(status);
        },
      },
      {
        accessorKey: "createdAt",
        header: "Join Date",
        cell: ({ row }) => {
          const date = row.getValue("createdAt");
          return <div>{new Date(date).toLocaleDateString()}</div>;
        },
      },

      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => {
          const user = row.original;
          return (
            <div className="flex space-x-2">
              {/* View Details Modal */}
              <UserDetailsModal
                user={user}
                onRefetch={refetch}
                trigger={
                  <Button size="sm" variant="outline">
                    <Info className="h-4 w-4" />
                  </Button>
                }
              />
            </div>
          );
        },
      },
    ],
    []
  );

  return (
    <DataTable
      columns={columns}
      data={users}
      isLoading={isLoading}
      loadingRows={5}
      pageSize={pageSize}
      showPagination={true}
      className="w-full !space-y-0"
      // API Pagination props
      enableApiPagination={enableApiPagination}
      currentPage={currentPage}
      totalPages={totalPages}
      totalCount={totalCount}
      hasNextPage={hasNextPage}
      hasPreviousPage={hasPreviousPage}
      onPageChange={onPageChange}
      onPageSizeChange={onPageSizeChange}
    />
  );
};

export default UserDataTable;
