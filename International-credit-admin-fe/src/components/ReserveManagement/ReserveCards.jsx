import React from "react";
import { Coins, Shield, DollarSign } from "lucide-react";
import { useReadContract } from "wagmi";
import { formatUnits } from "viem";

import { Card, CardHeader, CardTitle, CardContent } from "../ui/card";
import { Progress } from "../ui/progress";
import ICBTCAbi from "../../utils/Abi/ICBTC.json";
import ICAUTAbi from "../../utils/Abi/ICAUT.json";
import MockOracleAbi from "../../utils/Abi/MockOracle.json";
import { formatNumber } from "@/utils/utils";

const ReserveCards = () => {
  const { data: ICBTCSupply } = useReadContract({
    functionName: "totalSupply",
    abi: ICBTCAbi.abi,
    address: import.meta.env.VITE_ICBTC_TOKEN_ADDRESS,
  });
  const { data: ICAUTSupply } = useReadContract({
    functionName: "totalSupply",
    abi: ICAUTAbi.abi,
    address: import.meta.env.VITE_ICAUT_TOKEN_ADDRESS,
  });
  // Fetch current prices from oracle contract (BTC and Gold prices)
  const { data: pricevalues } = useReadContract({
    functionName: "getPrices",
    abi: MockOracleAbi.abi,
    address: import.meta.env.VITE_MOCK_ORACLE_ADDRESS,
  });

  /**
   * Calculate reserve values in USD
   * BTC Reserve = Supply (18 decimals) × BTC Price (8 decimals)
   * Gold Reserve = Supply (18 decimals) × Gold Price (8 decimals)
   */
  const btcReserve =
    Number(formatUnits(ICBTCSupply || 0, 18)) *
    Number(formatUnits(pricevalues?.[0] || 0, 8));

  const goldReserve =
    Number(formatUnits(ICAUTSupply || 0, 18)) *
    Number(formatUnits(pricevalues?.[1] || 0, 8));

  // Total reserve value is sum of all asset reserves
  const totalReserveValue = goldReserve + btcReserve;

  /**
   * Calculate percentage composition of reserves
   * Used to display reserve allocation in UI
   */
  const btcReservePercentage = (btcReserve / totalReserveValue) * 100;
  const goldReservePercentage = (goldReserve / totalReserveValue) * 100;
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <DollarSign className="h-5 w-5 mr-2 text-green-600" />
            Total Reserve Value
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-gray-600 dark:text-gray-50">
            {formatNumber(totalReserveValue)}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Coins className="h-5 w-5 mr-2 text-orange-600" />
            BTC Reserve
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-gray-600 dark:text-gray-50">
            {(btcReservePercentage || 0).toFixed(0)}% (
            {formatNumber(btcReserve)})
          </div>
          <Progress value={btcReservePercentage || 0} className="mt-2" />
          <p className="text-sm text-gray-600 dark:text-gray-200 mt-1">
            {Number(formatUnits(ICBTCSupply || 0, 18)).toFixed(2)} BTC
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Shield className="h-5 w-5 mr-2 text-yellow-600" />
            Gold Reserve
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-gray-600 dark:text-gray-50">
            {(goldReservePercentage || 0).toFixed(0)}% (
            {formatNumber(goldReserve)})
          </div>
          <Progress value={goldReservePercentage || 0} className="mt-2" />
          <p className="text-sm text-gray-600 dark:text-gray-200 mt-1">
            {Number(formatUnits(ICAUTSupply || 0, 18)).toFixed(2)} Gold
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default ReserveCards;
