import { Shield, TrendingUp, Info, Zap } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Header } from "@/components/Header";
import { useAppSelector } from "@/hooks/useRedux";
import { useReadContract } from "wagmi";
import ICAUTAbi from "@/Abi/ICAUT.json";
import ICBTCAbi from "@/Abi/ICBTC.json";
import { formatUnits } from "viem";
import { formatNumber } from "@/lib/utils";
import MockOracleAbi from "@/Abi/MockOracle.json";
import { Address } from "@/lib/Address";
export const ReservesPage = () => {
  const { totalValue, collateralizationRatio, reserves, recentActivity } =
    useAppSelector((state) => state.reserves);

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "addition":
        return <TrendingUp className="w-4 h-4 text-success" />;
      case "check":
        return <Info className="w-4 h-4 text-primary" />;
      case "update":
        return <Zap className="w-4 h-4 text-warning" />;
      default:
        return <Shield className="w-4 h-4" />;
    }
  };

  //Balance for token one
  const { data: totalSupplyICBTC, refetch: totalSupplyICBTCRefetch } =
    useReadContract({
      functionName: "totalSupply",
      abi: ICBTCAbi.abi,
      address: import.meta.env.VITE_ICBTC_TOKEN_ADDRESS || "0x0",
    });

  //Balance for token two
  const { data: totalSupplyICAUT, refetch: totalSupplyICAUTRefetch } =
    useReadContract({
      functionName: "totalSupply",
      abi: ICAUTAbi.abi,
      address: import.meta.env.VITE_ICAUT_TOKEN_ADDRESS || "0x0",
    });

  const { data: pricevalues, refetch: PricevaluesRefetch } = useReadContract({
    functionName: "getPrices",
    abi: MockOracleAbi.abi,
    address: Address.MOCK_ORACLE_ADDRESS,
  });

  const btcReserve =
    Number(formatUnits(totalSupplyICBTC || 0, 18)) *
    Number(formatUnits(pricevalues?.[0] || 0, 8));

  const goldReserve =
    Number(formatUnits(totalSupplyICAUT || 0, 18)) *
    Number(formatUnits(pricevalues?.[1] || 0, 8));

  const totalReserveValue = goldReserve + btcReserve;

  const btcReservePercentage = (btcReserve / totalReserveValue) * 100;
  const goldReservePercentage = (goldReserve / totalReserveValue) * 100;

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header
        title="Reserve Transparency"
        subtitle="Real-time collateral backing"
      />

      <div className="px-6 -mt-4 max-w-md mx-auto">
        {/* Total Reserve Value */}
        <Card className="mb-6 shadow-elevated">
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground text-sm mb-2">
              Total Reserve Value
            </p>
            <h2 className="text-4xl font-bold mb-6">
              {formatNumber(totalReserveValue)}
            </h2>

            <div className="flex justify-center gap-8">
              {reserves.map((reserve) => (
                <div key={reserve.type} className="text-center">
                  <div
                    className={`${reserve.IconclassName} w-12 h-12  rounded-full flex items-center justify-center mb-2 mx-auto`}
                  >
                    <span className="text-2xl">{reserve.icon}</span>
                  </div>
                  <p className="text-sm font-medium">
                    {reserve.type === "BTC"
                      ? `${btcReservePercentage?.toFixed(0) || 0}% BTC`
                      : `${goldReservePercentage?.toFixed(0) || 0}% Gold`}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {reserve.type === "BTC"
                      ? formatNumber(btcReserve)
                      : formatNumber(goldReserve)}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
