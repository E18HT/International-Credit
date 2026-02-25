import React, { useState } from "react";
import { Eye } from "lucide-react";
import { format } from "date-fns";

import { DataTable } from "../ui/data-table";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";

const TransactionDataTable = ({
  transactions = [],
  isLoading = false,
  onViewDetails,
  enableApiPagination = false,
  currentPage = 1,
  totalPages = 1,
  totalCount = 0,
  pageSize = 20,
  hasNextPage = false,
  hasPreviousPage = false,
  onPageChange,
  onPageSizeChange,
}) => {
  const [selectedRows, setSelectedRows] = useState([]);

  const getStatusBadge = (status) => {
    const statusConfig = {
      completed: {
        variant: "default",
        className: "bg-green-100 text-green-800",
      },
      success: {
        variant: "default",
        className: "bg-green-100 text-green-800",
      },
      succeeded: {
        variant: "default",
        className: "bg-green-100 text-green-800",
      },
      pending: {
        variant: "secondary",
        className: "bg-yellow-100 text-yellow-800",
      },
      failed: { variant: "destructive", className: "bg-red-100 text-red-800" },
      reversed: { variant: "outline", className: "bg-gray-100 text-gray-800" },
    };

    const config = statusConfig[status?.toLowerCase()] || statusConfig.pending;

    return (
      <Badge variant={config.variant} className={config.className}>
        {status?.charAt(0).toUpperCase() + status?.slice(1)}
      </Badge>
    );
  };

  const getTypeBadge = (type) => {
    const typeConfig = {
      credit: { variant: "default", className: "bg-blue-100 text-blue-800" },
      debit: {
        variant: "secondary",
        className: "bg-purple-100 text-purple-800",
      },
      refund: {
        variant: "outline",
        className: "bg-orange-100 text-orange-800",
      },
      withdrawal: {
        variant: "destructive",
        className: "bg-red-100 text-red-800",
      },
      purchase: {
        variant: "default",
        className: "bg-green-100 text-green-800",
      },
      staking: {
        variant: "secondary",
        className: "bg-indigo-100 text-indigo-800",
      },
    };

    const config = typeConfig[type?.toLowerCase()] || typeConfig.credit;

    return (
      <Badge variant={config.variant} className={config.className}>
        {type?.charAt(0).toUpperCase() + type?.slice(1)}
      </Badge>
    );
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    try {
      return format(new Date(dateString), "MM/dd/yyyy h:mm a");
    } catch (error) {
      return "Invalid Date";
    }
  };

  const truncateText = (text, maxLength = 20) => {
    if (!text) return "N/A";
    return text.length > maxLength
      ? `${text.substring(0, maxLength)}...`
      : text;
  };

  const columns = [
    {
      accessorKey: "timestamp",
      header: "Timestamp",
      cell: ({ row }) => {
        return (
          <div className="text-sm text-gray-900 dark:text-gray-100">
            {formatDate(row.getValue("timestamp"))}
          </div>
        );
      },
    },
    {
      accessorKey: "transactionId",
      header: "Transaction ID",
      cell: ({ row }) => {
        return (
          <div className="font-mono text-sm text-blue-600">
            {truncateText(row.getValue("transactionId"), 12)}
          </div>
        );
      },
    },
    {
      accessorKey: "user",
      header: "User",
      cell: ({ row }) => {
        const user = row.getValue("user");
        return (
          <div className="text-sm">
            <div className="font-medium text-gray-900 dark:text-gray-100">
              {user?.email || "N/A"}
            </div>
            {user?.id && (
              <div className="text-xs text-gray-500 dark:text-gray-200">
                ID: {truncateText(user.id, 8)}
              </div>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "type",
      header: "Type",
      cell: ({ row }) => {
        return getTypeBadge(row.getValue("type"));
      },
    },
    {
      accessorKey: "amount",
      header: "Amount",
      cell: ({ row }) => {
        const amount = row.getValue("amount");
        const currency = row?.original?.currency || "USD";
        return (
          <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
            {amount?.$numberDecimal || row?.original?.stakeAmount}
          </div>
        );
      },
    },
    {
      accessorKey: "currency",
      header: "Currency",
      cell: ({ row }) => {
        return (
          <div className="text-sm text-gray-600 dark:text-gray-200">
            {row.getValue("currency") || "USD"}
          </div>
        );
      },
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        return getStatusBadge(row.getValue("status"));
      },
    },

    {
      accessorKey: "referenceId",
      header: "Reference ID",
      cell: ({ row }) => {
        return (
          <div className="font-mono text-xs text-gray-500 dark:text-gray-200">
            {truncateText(row.getValue("referenceId"), 15)}
          </div>
        );
      },
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => {
        const transaction = row.original;

        return (
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onViewDetails?.(transaction)}
              className="h-8 w-8 p-0"
            >
              <Eye className="h-4 w-4" />
            </Button>
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-4">
      <DataTable
        columns={columns}
        data={transactions}
        isLoading={isLoading}
        selectedRows={selectedRows}
        onSelectedRowsChange={setSelectedRows}
        // Enable API pagination from parent props
        enableApiPagination={enableApiPagination}
        currentPage={currentPage}
        totalPages={totalPages}
        totalCount={totalCount}
        pageSize={pageSize}
        hasNextPage={hasNextPage}
        hasPreviousPage={hasPreviousPage}
        onPageChange={onPageChange}
        showPagination={true}
        onPageSizeChange={onPageSizeChange}
      />
    </div>
  );
};

export default TransactionDataTable;
