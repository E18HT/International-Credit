import React, { useState, useEffect, useCallback } from "react";
import { Header } from "@/components/Header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useGetTransactionHistoryQuery } from "@/store/api/walletApi";
import {
  Loader2,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  ArrowLeft,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { formatAddress } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

export const TransactionPage = () => {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [allTransactions, setAllTransactions] = useState<any[]>([]);
  const [hasMore, setHasMore] = useState(true);

  const { data, error, refetch, isFetching } = useGetTransactionHistoryQuery({
    page: page,
    limit: 10,
  });

  // Update transactions when new data arrives
  useEffect(() => {
    if (data?.transactions.length > 0 && !isFetching) {
      if (page === 1) {
        // First page - replace all transactions
        setAllTransactions(data.transactions);
      } else {
        // Subsequent pages - append to existing transactions
        setAllTransactions((prev) => [...prev, ...data.transactions]);
      }

      // Check if there are more pages
      setHasMore(data.transactions.length === 10);
    }
  }, [data, page, isFetching]);
  // Infinite scroll handler
  const handleScroll = useCallback(() => {
    if (
      window.innerHeight + document.documentElement.scrollTop >=
        document.documentElement.offsetHeight - 1000 &&
      !isFetching &&
      hasMore
    ) {
      setPage((prev) => prev + 1);
    }
  }, [isFetching, hasMore]);

  // Add scroll event listener
  useEffect(() => {
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  const handleRefresh = () => {
    setPage(1);
    setAllTransactions([]);
    setHasMore(true);
    refetch();
  };

  const handleCopy = (text: string) => {
    if (text.startsWith("0x") || text.startsWith("pi_")) {
      navigator.clipboard.writeText(text);
      toast.success("Copied to clipboard");
    }
  };

  const getTransactionColor = (type: string) => {
    switch (type) {
      case "sent":
        return "text-red-600";
      case "receive":
      case "received":
        return "text-green-600";
      case "stake":
        return "text-blue-600";
      case "unstake":
        return "text-orange-600";
      default:
        return "text-gray-600";
    }
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case "receive":
      case "received":
        return "↙";
      case "sent":
        return "↗";
      case "swap":
        return "↻";
      case "stake":
        return "↗";
      default:
        return "•";
    }
  };

  const formatTimeAgo = (timestamp: string) => {
    try {
      return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
    } catch {
      return "Unknown time";
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header
        title="Transaction History"
        subtitle="View your transaction history"
        rightElement={
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(-1)}
            className="text-white hover:bg-white/20"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
        }
      />

      <div className="px-6 mt-6 max-w-md mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold">All Transactions</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            disabled={isFetching}
          >
            <RefreshCw
              className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`}
            />
          </Button>
        </div>

        {/* Initial Loading */}
        {isFetching && page === 1 ? (
          <div className="flex items-center justify-center py-12">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">
                Loading transactions...
              </p>
            </div>
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <p className="text-sm text-muted-foreground mb-4">
              Failed to load transactions
            </p>
            <Button variant="outline" onClick={handleRefresh}>
              Try Again
            </Button>
          </div>
        ) : allTransactions.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-sm text-muted-foreground">
              No transactions found
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {allTransactions.map((transaction, index) => (
              <Card key={`${transaction.id}-${index}`} className="shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-full bg-muted flex items-center justify-center ${getTransactionColor(
                          transaction?.direction
                        )}`}
                      >
                        {typeof getTransactionIcon(transaction?.direction) ===
                        "string" ? (
                          <span className="text-sm font-bold">
                            {getTransactionIcon(transaction?.direction)}
                          </span>
                        ) : (
                          getTransactionIcon(transaction?.direction)
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-sm">
                          {transaction?.amount?.$numberDecimal ||
                            transaction?.amount}{" "}
                          {transaction?.tokenSymbol}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatTimeAgo(transaction?.recordedAt)}
                        </p>
                        {transaction?.description && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {transaction?.description}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="text-right">
                      <p className="font-medium text-sm">
                        ${transaction?.amountUSD?.$numberDecimal || "0.00"}
                      </p>
                      <Badge
                        variant={
                          transaction.status === "confirmed"
                            ? "default"
                            : "secondary"
                        }
                        className="text-xs"
                      >
                        {transaction.status === "confirmed"
                          ? "Confirmed"
                          : "Pending"}
                      </Badge>
                    </div>
                  </div>

                  <div className="mt-3 pt-3 flex justify-between">
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      From:{" "}
                      <div
                        className="font-medium cursor-pointer"
                        onClick={() => {
                          handleCopy(transaction.fromAddress);
                        }}
                      >
                        {formatAddress(transaction.fromAddress)}
                      </div>
                      {"  "}
                      To:{" "}
                      <div
                        className="font-medium cursor-pointer"
                        onClick={() => {
                          handleCopy(transaction.toAddress);
                        }}
                      >
                        {formatAddress(transaction.toAddress)}
                      </div>
                    </p>

                    <p className="text-xs text-muted-foreground">
                      {transaction.type}
                    </p>
                  </div>
                  {/* Transaction Hash */}

                  <div className="mt-3 pt-3 border-t">
                    <p
                      className="text-xs text-muted-foreground cursor-pointer"
                      onClick={() => {
                        handleCopy(transaction.txHash);
                      }}
                    >
                      Hash: {transaction.txHash?.slice(0, 10)}...
                      {transaction.txHash?.slice(-8)}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}

            {/* Loading More Indicator */}
            {isFetching && page > 1 && (
              <div className="flex items-center justify-center py-6">
                <div className="flex items-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">
                    Loading more...
                  </p>
                </div>
              </div>
            )}

            {/* No More Data */}
            {!hasMore && allTransactions.length > 0 && (
              <div className="text-center py-6">
                <p className="text-sm text-muted-foreground">
                  No more transactions
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
