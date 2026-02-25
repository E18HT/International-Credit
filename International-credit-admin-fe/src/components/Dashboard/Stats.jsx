import React from "react";
import { Coins, DollarSign, TrendingUp, Users } from "lucide-react";
import { useReadContract } from "wagmi";
import { formatUnits } from "viem";

import { Card, CardHeader, CardTitle, CardContent } from "../ui/card";
import ICabi from "../../utils/Abi/IC.json";
import ICControllerAbi from "../../utils/Abi/ICController.json";
import { mockTokenMetrics } from "../../mockData";
import { formatNumber } from "@/utils/utils";

const Stats = () => {
  // Fetch total supply of IC token from blockchain (18 decimals)
  const { data: ICTotalSupply } = useReadContract({
    functionName: "totalSupply",
    abi: ICabi.abi,
    address: import.meta.env.VITE_IC_TOKEN_ADDRESS,
  });

  // Fetch current IC token value from controller contract (18 decimals)
  // This represents the USD value per IC token
  const { data: ICValue } = useReadContract({
    functionName: "getCurrentIcValue",
    abi: ICControllerAbi.abi,
    address: import.meta.env.VITE_IC_CONTROLLER_ADDRESS,
  });

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <Card className="border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-body-sm font-inter font-medium text-gray-700 dark:text-gray-200">
            Total Supply
          </CardTitle>
          <div className="w-8 h-8 bg-ic-blue/10 rounded-lg flex items-center justify-center">
            <Coins className="h-4 w-4 text-ic-blue" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-heading-1 font-poppins font-bold text-gray-800 dark:text-gray-100">
            {formatUnits(ICTotalSupply || 0, 18)}
          </div>
          <p className="text-caption text-gray-500 font-inter">IC Tokens</p>
        </CardContent>
      </Card>

      <Card className="border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-body-sm font-inter font-medium text-gray-700 dark:text-gray-200">
            Token Price
          </CardTitle>
          <div className="w-8 h-8 bg-success/10 rounded-lg flex items-center justify-center">
            <DollarSign className="h-4 w-4 text-success" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-heading-1 font-poppins font-bold text-gray-800 dark:text-gray-100">
            $~{parseFloat(formatUnits(ICValue || 0, 18)).toFixed(2)}
          </div>
        </CardContent>
      </Card>

      <Card className="border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-body-sm font-inter font-medium text-gray-700 dark:text-gray-200">
            Market Cap
          </CardTitle>
          <div className="w-8 h-8 bg-ic-blue/10 rounded-lg flex items-center justify-center">
            <TrendingUp className="h-4 w-4 text-ic-blue" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-heading-1 font-poppins font-bold text-gray-800 dark:text-gray-100">
            {formatNumber(mockTokenMetrics.marketCap)}
          </div>
          <p className="text-caption text-gray-500 font-inter">
            Total Market Value
          </p>
        </CardContent>
      </Card>

      <Card className="border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-body-sm font-inter font-medium text-gray-700 dark:text-gray-200">
            24h Volume
          </CardTitle>
          <div className="w-8 h-8 bg-ic-gold/10 rounded-lg flex items-center justify-center">
            <Users className="h-4 w-4 text-ic-gold" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-heading-1 font-poppins font-bold text-gray-800 dark:text-gray-100">
            ${(mockTokenMetrics.volume24h / 1000).toFixed(0)}K
          </div>
          <p className="text-caption text-gray-500 font-inter">
            Trading Volume
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Stats;
