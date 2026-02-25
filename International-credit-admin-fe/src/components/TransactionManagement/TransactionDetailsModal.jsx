import React from "react";
import { format } from "date-fns";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { Badge } from "../ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";

const TransactionDetailsModal = ({
  transaction,
  isOpen,
  onClose,
  isLoading = false,
}) => {
  if (!transaction) return null;

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    try {
      return format(new Date(dateString), "MMM dd, yyyy 'at' h:mm:ss a");
    } catch (error) {
      return "Invalid Date";
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      succeeded: {
        variant: "default",
        className: "bg-green-100 text-green-800",
      },
      completed: {
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
      PURCHASE: {
        variant: "default",
        className: "bg-green-100 text-green-800",
      },
      staking: {
        variant: "secondary",
        className: "bg-indigo-100 text-indigo-800",
      },
    };

    const config =
      typeConfig[type?.toUpperCase()] ||
      typeConfig[type?.toLowerCase()] ||
      typeConfig.credit;

    return (
      <Badge variant={config.variant} className={config.className}>
        {type?.charAt(0).toUpperCase() + type?.slice(1)}
      </Badge>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between mt-3">
            <span>Transaction Details</span>
            <div className="flex items-center space-x-2">
              {getStatusBadge(transaction.status)}
              {getTypeBadge(transaction.type)}
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Basic Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-200">
                    Transaction ID
                  </label>
                  <p className="font-mono text-sm text-gray-900 dark:text-gray-100">
                    {transaction.transactionId || transaction._id || "N/A"}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-200">
                    Transaction Type
                  </label>
                  <p className="text-sm text-gray-900 dark:text-gray-100">
                    {transaction.type ||
                      transaction.transactionCategory ||
                      "N/A"}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-200">
                    Date & Time
                  </label>
                  <p className="text-sm text-gray-900 dark:text-gray-100">
                    {formatDate(transaction.timestamp || transaction.createdAt)}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-200">
                    Reference ID
                  </label>
                  <p className="font-mono text-sm text-gray-900 dark:text-gray-100">
                    {transaction.referenceId ||
                      transaction.stripePaymentIntentId ||
                      "N/A"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* User / Account Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">User / Account Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-200">
                    User ID
                  </label>
                  <p className="font-mono text-sm text-gray-900 dark:text-gray-100">
                    {transaction.user?._id || transaction.userId?._id || "N/A"}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-200">
                    User Name
                  </label>
                  <p className="text-sm text-gray-900 dark:text-gray-100">
                    {transaction.user?.fullName ||
                      transaction.userId?.fullName ||
                      "N/A"}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-200">
                    User Email
                  </label>
                  <p className="text-sm text-gray-900 dark:text-gray-100">
                    {transaction.user?.email ||
                      transaction.userId?.email ||
                      "N/A"}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-200">
                    Wallet / Account Address
                  </label>
                  <p className="font-mono text-sm text-gray-900 dark:text-gray-100 break-all">
                    {transaction.walletAddress || "N/A"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Amount & Currency */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Amount & Currency</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-200">
                    Fiat Amount
                  </label>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {transaction?.amountUSD?.$numberDecimal}
                    {transaction?.currency}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-200">
                    IC Token Amount
                  </label>
                  <p className="text-2xl font-bold text-blue-600">
                    {transaction.amount.$numberDecimal || "0"} IC
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-200">
                    Exchange Rate
                  </label>
                  <p className="text-sm text-gray-900 dark:text-gray-100">1</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-200">
                    Token Symbol
                  </label>
                  <p className="text-sm text-gray-900 dark:text-gray-100">
                    {transaction.tokenSymbol || "IC"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payment / Source Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Payment / Source Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-200">
                    Payment Method
                  </label>
                  <p className="text-sm text-gray-900 dark:text-gray-100">
                    {transaction.method || transaction.provider || "N/A"}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-200">
                    Payment Provider
                  </label>
                  <p className="text-sm text-gray-900 dark:text-gray-100">
                    {transaction.provider || "N/A"}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-200">
                    Quote ID
                  </label>
                  <p className="font-mono text-sm text-gray-900 dark:text-gray-100">
                    {transaction.quoteId || "N/A"}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-200">
                    Linked Journal ID
                  </label>
                  <p className="font-mono text-sm text-gray-900 dark:text-gray-100">
                    {transaction.linkedJournalId || "N/A"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Stripe Payment Details */}
          {transaction.stripePaymentIntentId && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  Stripe Payment Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-200">
                      Stripe Payment Intent ID
                    </label>
                    <p className="font-mono text-sm text-gray-900 dark:text-gray-100">
                      {transaction.stripePaymentIntentId}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-200">
                      Client Secret
                    </label>
                    <p className="font-mono text-sm text-gray-900 dark:text-gray-100 break-all">
                      {transaction.metadata?.clientSecret || "N/A"}
                    </p>
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-200">
                      Description
                    </label>
                    <p className="text-sm text-gray-900 dark:text-gray-100">
                      {transaction.metadata?.description ||
                        transaction.description ||
                        "N/A"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Transaction Events */}
          {transaction.events && transaction.events.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Transaction Events</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  {transaction.events.map((event, index) => (
                    <div key={index} className="border rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-sm">
                          {event.type}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {event.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-200">
                        {formatDate(event.timestamp)}
                      </p>
                      {event.data && (
                        <div className="mt-2">
                          <details className="text-xs">
                            <summary className="cursor-pointer text-gray-600 dark:text-gray-200 hover:text-gray-800">
                              View Event Data
                            </summary>
                            <pre className="mt-2 p-2 bg-gray-50 rounded text-xs overflow-auto">
                              {JSON.stringify(event.data, null, 2)}
                            </pre>
                          </details>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Notes & Metadata */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Notes & Metadata</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-200">
                    Description / Remarks
                  </label>
                  <p className="text-sm text-gray-900 dark:text-gray-100">
                    {transaction.description || "N/A"}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-200">
                    Webhook Status
                  </label>
                  <p className="text-sm text-gray-900 dark:text-gray-100">
                    {transaction.webhook
                      ? `Attempts: ${transaction.webhook.attempts}, Errors: ${
                          transaction.webhook.errors?.length || 0
                        }`
                      : "N/A"}
                  </p>
                </div>
                <div className="md:col-span-2">
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-200">
                    Full Metadata
                  </label>
                  <details className="text-xs">
                    <summary className="cursor-pointer text-gray-600 dark:text-gray-200 hover:text-gray-800">
                      View Full Metadata
                    </summary>
                    <pre className="mt-2 p-2 bg-gray-50 rounded text-xs overflow-auto">
                      {JSON.stringify(transaction.metadata, null, 2)}
                    </pre>
                  </details>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TransactionDetailsModal;
