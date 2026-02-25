import React from "react";
import { Shield, AlertTriangle, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";

import { Card, CardHeader, CardTitle, CardContent } from "../ui/card";
import { Badge } from "../ui/badge";
import { Progress } from "../ui/progress";
import { mockReserveData } from "../../mockData";
import { formatNumber } from "@/utils/utils";
import { useGetTransactionsQuery } from "@/store/api/transactionApiSlice";

const getStatusBadge = (status) => {
  const statusConfig = {
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
const ReserveComponsation = () => {
  const navigate = useNavigate();
  // API hook
  const {
    data: transactionsData,
    isLoading: transactionsLoading,
    isFetching: transactionsFetching,
  } = useGetTransactionsQuery({
    page: 1,
    limit: 3,
    transactionType: "all",
    status: "all",
    currency: "all",
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card className="border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow">
        <CardHeader>
          <CardTitle className="flex items-center font-poppins font-semibold text-gray-800 dark:text-gray-100">
            <div className="w-8 h-8 bg-ic-blue/10 rounded-lg flex items-center justify-center mr-3">
              <Shield className="h-4 w-4 text-ic-blue" />
            </div>
            Reserve Composition
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Bitcoin Reserve</span>
              <Badge variant="outline">{mockReserveData.btcReserve}%</Badge>
            </div>
            <Progress value={mockReserveData.btcReserve} className="h-3" />

            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Gold Reserve</span>
              <Badge variant="outline">{mockReserveData.goldReserve}%</Badge>
            </div>
            <Progress value={mockReserveData.goldReserve} className="h-3" />

            <div className="pt-2 border-t">
              <div className="flex justify-between text-sm">
                <span>Total Reserve Value</span>
                <span className="font-semibold">
                  {formatNumber(mockReserveData.totalValue)}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow">
        <CardHeader>
          <CardTitle className="font-poppins font-semibold text-gray-800 dark:text-gray-100">
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {transactionsLoading || transactionsFetching ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-ic-blue" />
              <span className="ml-2 text-sm text-gray-600">
                Loading recent activity...
              </span>
            </div>
          ) : (
            transactionsData?.transactions?.map((log) => (
              <div
                key={log._id}
                className="flex items-center space-x-3 p-2 rounded-lg bg-gray-50 dark:bg-gray-800/50 dark:border dark:border-gray-700"
              >
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium">
                      {`${log.transactionId.substring(0, 20)}...`}
                    </span>
                    <span className="text-xs text-gray-500">
                      {format(log?.createdAt, "Pp")}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-200">
                    {log.description}
                  </p>
                </div>
                {getStatusBadge(log.status)}
              </div>
            ))
          )}
          {transactionsData?.transactions?.length > 0 && (
            <div
              onClick={() => navigate("/transactions")}
              className="text-sm text-gray-600 dark:text-gray-200 text-center cursor-pointer"
            >
              View All
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ReserveComponsation;
