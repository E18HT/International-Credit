import { useAccount } from "wagmi";
import { Card, CardContent } from "@/components/ui/card";
import { FileText } from "lucide-react";
import { useICGOVTBalance } from "@/hooks/useICGOVTBalance";

const BalanceBox = () => {
  const { address } = useAccount();
  //Balance for token one
  const { formattedBalance } = useICGOVTBalance();
  return (
    <Card className="mb-6 shadow-elevated bg-gradient-to-br from-primary to-primary-light text-white">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-white/80 text-sm mb-1">Your Voting Power</p>
            <h2 className="text-3xl font-bold">{formattedBalance} ICGOVT</h2>
          </div>
          <FileText className="w-8 h-8 text-white/80" />
        </div>
      </CardContent>
    </Card>
  );
};

export default BalanceBox;
