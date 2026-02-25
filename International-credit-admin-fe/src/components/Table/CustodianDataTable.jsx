import React, { useMemo } from "react";
import {
  Eye,
  CheckCircle,
  XCircle,
  Ban,
  MoreHorizontal,
  Loader2,
  Mail,
  Upload,
  Loader,
} from "lucide-react";

import {
  DataTable,
  DataTableColumnHeader,
  DataTableRowActions,
} from "../ui/data-table";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "../ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import CustodianDetails from "./CustodianDetails";

const CustodianDataTable = ({
  custodians = [],
  isLoading = false,
  onApproveCustodian,
  onRejectCustodian,
  onSuspendCustodian,
  onReactivateCustodian,
  isApproving = false,
  isRejecting = false,
  isSuspending = false,
  isReactivating = false,
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
    switch (status?.toLowerCase()) {
      case "active":
        return <Badge className="bg-green-600">Active</Badge>;
      case "pending":
        return <Badge className="bg-yellow-600">Pending</Badge>;
      case "suspended":
        return <Badge className="bg-red-600">Suspended</Badge>;
      case "rejected":
        return <Badge className="bg-gray-600">Rejected</Badge>;
      case "inactive":
        return <Badge className="bg-yellow-600">Inactive</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const getStatusIcon = (status) => {
    switch (status?.toLowerCase()) {
      case "active":
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "pending":
        return <Loader className="h-4 w-4 text-yellow-600 " />;
      case "suspended":
        return <Ban className="h-4 w-4 text-red-600" />;
      case "inactive":
        return <XCircle className="h-4 w-4 text-gray-600" />;
      default:
        return <div className="h-4 w-4 rounded-full bg-gray-300" />;
    }
  };

  const columns = useMemo(
    () => [
      {
        accessorKey: "name",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Custodian" />
        ),
        cell: ({ row }) => {
          const custodian = row.original;
          return (
            <div>
              <div className="font-medium flex items-center">
                {getStatusIcon(custodian.status)}
                <span className="ml-2">{custodian.name}</span>
              </div>
              <div className="text-sm text-gray-500 flex items-center mt-1">
                <Mail className="h-3 w-3 mr-1" />
                {custodian.contact_email || custodian.contactEmail}
              </div>
              {custodian.license_number && (
                <div className="text-xs text-gray-400 mt-1">
                  License: {custodian.license_number}
                </div>
              )}
            </div>
          );
        },
      },
      {
        accessorKey: "assetType",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Asset Type" />
        ),
        cell: ({ row }) => {
          const custodian = row.original;
          return (
            <Badge variant="outline">
              {custodian.asset_type ||
                custodian.assetType ||
                custodian.type ||
                "N/A"}
            </Badge>
          );
        },
        filterFn: (row, id, value) => {
          const assetType =
            row.original.asset_type ||
            row.original.assetType ||
            row.original.type;
          return value.includes(assetType);
        },
      },
      {
        accessorKey: "holdings",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Holdings" />
        ),
        cell: ({ row }) => {
          const custodian = row.original;
          const holdings =
            custodian.initial_holdings || custodian.totalHoldings || 0;
          return (
            <div>
              <div className="font-medium">{holdings.toLocaleString()}</div>
              <div className="text-sm text-gray-500">units</div>
            </div>
          );
        },
      },
      {
        accessorKey: "status",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Status" />
        ),
        cell: ({ row }) => {
          return getStatusBadge(row.getValue("status"));
        },
        filterFn: (row, id, value) => {
          return value.includes(row.getValue(id));
        },
      },
      {
        accessorKey: "lastAction",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Last Action" />
        ),
        cell: ({ row }) => {
          const custodian = row.original;
          const lastAction =
            custodian.last_action_at || custodian.lastProofDate;
          return (
            <div className="text-sm">
              {lastAction ? new Date(lastAction).toLocaleDateString() : "Never"}
            </div>
          );
        },
      },
      {
        accessorKey: "Action",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Action" />
        ),
        cell: ({ row }) => {
          return (
            <div className="text-sm">
              <CustodianDetails custodian={row.original} refetch={refetch} />
            </div>
          );
        },
      },
    ],
    [
      isApproving,
      isRejecting,
      isSuspending,
      isReactivating,
      onApproveCustodian,
      onRejectCustodian,
      onSuspendCustodian,
      onReactivateCustodian,
    ]
  );

  return (
    <DataTable
      columns={columns}
      data={custodians}
      isLoading={isLoading}
      loadingRows={5}
      pageSize={pageSize}
      showPagination={true}
      className="w-full"
      // API Pagination props
      enableApiPagination={enableApiPagination}
      currentPage={currentPage}
      totalPages={totalPages}
      totalCount={totalCount}
      hasNextPage={hasNextPage}
      hasPreviousPage={hasPreviousPage}
      onPageChange={onPageChange}
      refetch={refetch}
      onPageSizeChange={onPageSizeChange}
    />
  );
};

export default CustodianDataTable;
