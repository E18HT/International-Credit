import React from "react";
import {
  Server,
  Activity,
  Clock,
  HardDrive,
  Loader2,
  CheckCircle,
  AlertCircle,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Progress } from "./ui/progress";
import { useGetSystemStatusQuery } from "../store/api/dashboardApiSlice";

const SystemStatus = () => {
  const {
    data: systemStatus,
    isLoading: isLoadingSystemStatus,
    error: systemStatusError,
  } = useGetSystemStatusQuery();

  // Format memory size from bytes to MB
  const formatMemorySize = (bytes) => {
    if (!bytes) return "0 MB";
    return `${Math.round(bytes / 1024 / 1024)} MB`;
  };

  // Format uptime to human readable
  const formatUptime = (seconds) => {
    if (!seconds) return "0s";
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  };

  if (systemStatusError) {
    return (
      <Card className="border border-red-200 bg-red-50">
        <CardContent className="p-6">
          <div className="flex items-center space-x-2 text-red-600">
            <AlertCircle className="h-5 w-5" />
            <span className="font-medium">Failed to load system status</span>
          </div>
          <p className="text-sm text-red-500 mt-1">
            Unable to connect to the system status endpoint
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* System Overview */}
      <Card className="border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-gray-700 dark:text-gray-200 flex items-center">
            <Server className="h-4 w-4 mr-2" />
            System Overview
          </CardTitle>
          {isLoadingSystemStatus && (
            <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
          )}
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-200">
                Status:
              </span>
              <Badge
                className={
                  systemStatus?.status === "healthy"
                    ? "bg-green-100 text-green-800 border-green-200"
                    : "bg-red-100 text-red-800 border-red-200"
                }
              >
                <CheckCircle className="h-3 w-3 mr-1" />
                {systemStatus?.status === "healthy" ? "Healthy" : "Error"}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-200">
                Environment:
              </span>
              <Badge variant="outline" className="text-xs">
                {systemStatus?.environment || "N/A"}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-200">
                Version:
              </span>
              <span className="text-sm font-medium">
                {systemStatus?.version || "N/A"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-200">
                Node.js:
              </span>
              <span className="text-sm font-medium">
                {systemStatus?.nodeVersion || "N/A"}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Memory Usage */}
      <Card className="border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-gray-700 dark:text-gray-200 flex items-center">
            <HardDrive className="h-4 w-4 mr-2" />
            Memory Usage
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-gray-600 dark:text-gray-200">
                  Heap Usage:
                </span>
                <span className="text-sm font-medium">
                  {systemStatus?.memory?.heapUsage || 0}%
                </span>
              </div>
              <Progress
                value={systemStatus?.memory?.heapUsage || 0}
                className="h-2"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>{formatMemorySize(systemStatus?.memory?.heapUsed)}</span>
                <span>{formatMemorySize(systemStatus?.memory?.heapTotal)}</span>
              </div>
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-600 dark:text-gray-200">
                  RSS:
                </span>
                <span className="text-xs font-medium">
                  {formatMemorySize(systemStatus?.memory?.rss)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-600 dark:text-gray-200">
                  External:
                </span>
                <span className="text-xs font-medium">
                  {formatMemorySize(systemStatus?.memory?.external)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-600 dark:text-gray-200">
                  Array Buffers:
                </span>
                <span className="text-xs font-medium">
                  {formatMemorySize(systemStatus?.memory?.arrayBuffers)}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Uptime & Performance */}
      <Card className="border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-gray-700 dark:text-gray-200 flex items-center">
            <Activity className="h-4 w-4 mr-2" />
            Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-200 flex items-center">
                <Clock className="h-3 w-3 mr-1" />
                Uptime:
              </span>
              <span className="text-sm font-medium">
                {formatUptime(systemStatus?.uptime)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-200">
                Last Updated:
              </span>
              <span className="text-xs text-gray-500">
                {systemStatus?.timestamp
                  ? new Date(systemStatus.timestamp).toLocaleTimeString()
                  : "N/A"}
              </span>
            </div>
            <div className="pt-2 border-t border-gray-100">
              <div className="text-xs text-gray-500 text-center">
                Auto-refreshes every 30 seconds
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SystemStatus;
