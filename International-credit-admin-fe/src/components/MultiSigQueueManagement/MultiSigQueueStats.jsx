import React, { useState } from "react";
import { ClipboardList, AlertTriangle, CheckCircle, Zap } from "lucide-react";

import { Card, CardContent } from "../ui/card";
import { mockMultiSigQueue } from "@/mockData";

const MultiSigQueueStats = () => {
  const [queue, setQueue] = useState(mockMultiSigQueue);

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center space-x-2">
            <ClipboardList className="h-5 w-5 text-blue-600" />
            <div>
              <p className="text-2xl font-bold">{queue.length}</p>
              <p className="text-sm text-gray-600 dark:text-gray-200">
                Pending Actions
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            <div>
              <p className="text-2xl font-bold">
                {queue.filter((q) => q.priority === "critical").length}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-200">
                Critical Priority
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center space-x-2">
            <Zap className="h-5 w-5 text-orange-600" />
            <div>
              <p className="text-2xl font-bold">
                {queue.filter((q) => q.priority === "high").length}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-200">
                High Priority
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
                {queue.reduce((sum, q) => sum + q.currentApprovals, 0)}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-200">
                Total Approvals
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MultiSigQueueStats;
