import React from "react";
import {
  CreditCard,
  DollarSign,
  Clock,
  XCircle,
  TrendingUp,
  TrendingDown,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../ui/badge";

const TransactionStats = ({ stats, isLoading }) => {
  const formatCurrency = (amount, currency = "USD") => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const formatNumber = (num) => {
    return new Intl.NumberFormat("en-US").format(num);
  };

  const statCards = [
    {
      title: "Total Transactions",
      value: formatNumber(stats?.totalTransactions || 0),
      icon: CreditCard,
      description: "All recorded transactions",
      trend: stats?.totalTransactionsChange || 0,
      trendLabel: "vs last month",
    },
    {
      title: "Total Volume",
      value: formatCurrency(stats?.totalVolume || 0),
      icon: DollarSign,
      description: "Sum of all transaction values",
      trend: stats?.totalVolumeChange || 0,
      trendLabel: "vs last month",
    },
    {
      title: "Pending Transactions",
      value: formatNumber(stats?.pendingTransactions || 0),
      icon: Clock,
      description: "Awaiting completion",
      trend: stats?.pendingTransactionsChange || 0,
      trendLabel: "vs last month",
      variant: "warning",
    },
    {
      title: "Failed Transactions",
      value: formatNumber(stats?.failedTransactions || 0),
      icon: XCircle,
      description: "Unsuccessful transactions",
      trend: stats?.failedTransactionsChange || 0,
      trendLabel: "vs last month",
      variant: "destructive",
    },
  ];

  const getTrendIcon = (trend) => {
    if (trend > 0) return <TrendingUp className="h-4 w-4 text-green-500" />;
    if (trend < 0) return <TrendingDown className="h-4 w-4 text-red-500" />;
    return null;
  };

  const getTrendColor = (trend) => {
    if (trend > 0) return "text-green-500";
    if (trend < 0) return "text-red-500";
    return "text-gray-500 dark:text-gray-200";
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, index) => (
          <Card key={index} className="animate-pulse">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="h-4 bg-gray-200 rounded w-24"></div>
              <div className="h-4 w-4 bg-gray-200 rounded"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-gray-200 rounded w-20 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-32"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {statCards.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <Card key={index} className="relative overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-200">
                {stat.title}
              </CardTitle>
              <Icon className="h-4 w-4 text-gray-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-1">
                {stat.value}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-200 mb-2">
                {stat.description}
              </p>
              {stat.trend !== 0 && (
                <div className="flex items-center space-x-1">
                  {getTrendIcon(stat.trend)}
                  <span
                    className={`text-xs font-medium ${getTrendColor(
                      stat.trend
                    )}`}
                  >
                    {Math.abs(stat.trend)}% {stat.trendLabel}
                  </span>
                </div>
              )}
            </CardContent>
            {stat.variant && (
              <div className="absolute top-0 right-0 w-1 h-full">
                <div
                  className={`w-full h-full ${
                    stat.variant === "warning"
                      ? "bg-yellow-400"
                      : stat.variant === "destructive"
                      ? "bg-red-500"
                      : "bg-blue-500"
                  }`}
                />
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
};

export default TransactionStats;
