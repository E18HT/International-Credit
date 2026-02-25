import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAppSelector } from "@/hooks/useRedux";
import { useGetTransactionHistoryQuery } from "@/store/api/walletApi";
import { format, formatDistanceToNow } from "date-fns";
import { Loader2 } from "lucide-react";
import { Button } from "../ui/button";
import { useNavigate } from "react-router-dom";

export const RecentTransaction = () => {
  const { data, isLoading, error } = useGetTransactionHistoryQuery({
    page: 1,
    limit: 5,
  });
  const navigate = useNavigate();
  const getTransactionColor = (type: string) => {
    switch (type) {
      case "receive":
        return "text-success";
      case "sent":
        return "text-destructive";
      case "swap":
        return "text-warning";
      case "stake":
        return "text-primary";
      default:
        return "text-primary";
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

  return (
    <Card className="shadow-card mb-6">
      <CardContent className="sm:p-6 p-2">
        <h3 className="font-semibold mb-4">Recent Transactions</h3>

        <div className="space-y-3">
          {isLoading ? (
            <div className="flex items-center justify-center">
              <Loader2 className="w-4 h-4 animate-spin" />
            </div>
          ) : data?.transactions?.length === 0 ? (
            <div className="flex items-center justify-center">
              <p className="text-sm text-muted-foreground">
                No transactions found
              </p>
            </div>
          ) : (
            data?.transactions?.map((transaction) => (
              <div
                key={transaction?._id}
                className="flex items-center justify-between border-b pb-2"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-8 h-8 rounded-full bg-muted flex items-center justify-center ${getTransactionColor(
                      transaction?.direction
                    )}`}
                  >
                    <span className="text-sm font-bold">
                      {getTransactionIcon(transaction?.direction)}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium text-sm">
                      {transaction?.amount?.$numberDecimal ||
                        transaction?.amount}{" "}
                      {transaction?.tokenSymbol}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {(transaction?.amountUSD?.$numberDecimal ||
                        transaction?.amountUSD) &&
                        `$${
                          transaction?.amountUSD?.$numberDecimal ||
                          transaction?.amountUSD
                        }`}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <p className="font-medium text-sm">
                    {formatDistanceToNow(transaction?.recordedAt, {
                      addSuffix: true,
                    })}
                  </p>

                  <Badge variant="outline" className="text-xs mr-1">
                    {transaction?.type}
                  </Badge>
                  <Badge className="text-xs capitalize">
                    {transaction?.status}
                  </Badge>
                </div>
              </div>
            ))
          )}
        </div>
        {data?.pagination.total > 1 && (
          <div className="flex items-center justify-center">
            <Button
              variant="link"
              className="text-xs"
              onClick={() => {
                navigate(`/wallet/transactions`);
              }}
            >
              View All
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
