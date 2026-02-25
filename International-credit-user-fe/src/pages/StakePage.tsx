import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { toast } from "sonner";
import { useReadContract, useWriteContract } from "wagmi";
import { Loader2, MoveLeft } from "lucide-react";
import { useAccount } from "wagmi";
import { client } from "@/lib/utils";
import ICAbi from "@/Abi/IC.json";
import VaultAndYieldAbi from "@/Abi/VaultAndYield.json";
import { Address } from "@/lib/Address";
import { formatUnits, hexToNumber, parseUnits } from "viem";
const stakingOptions = [
  { days: 30, apy: 7 },
  { days: 90, apy: 9 },
  { days: 180, apy: 12 },
  { days: 365, apy: 15 },
  { days: 730, apy: 18 },
];
import { useRecordStakingMutation } from "@/store/api/walletApi";
import StackHistory from "@/components/Stack/StackHistory";

export const StakePage = () => {
  const navigate = useNavigate();
  const [amount, setAmount] = useState<string>("");
  const [selectedOption, setSelectedOption] = useState(stakingOptions[0]);
  const [step, setStep] = useState<"form" | "review" | "success">("form");
  const { writeContractAsync } = useWriteContract();
  const { address } = useAccount();
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Example values, replace with real wallet data
  const balance = 2000;
  //Balance for token one
  const {
    data: balanceData,
    isLoading: isLoadingBalance,
    isFetching: isFetchingBalance,
    refetch: tokenoneRefetch,
  } = useReadContract({
    functionName: "balanceOf",
    abi: ICAbi.abi,
    args: [address],
    address: Address.IC_TOKEN_ADDRESS,
  });
  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;

    // Allow empty string (will show as empty, not 0)
    if (inputValue === "") {
      setAmount("");
      return;
    }

    // Only allow digits and decimal point
    const sanitizedValue = inputValue.replace(/[^0-9.]/g, "");

    // Prevent multiple decimal points
    const parts = sanitizedValue.split(".");
    if (parts.length > 2) {
      return;
    }

    // Allow leading zeros like "022"
    setAmount(sanitizedValue);
  };

  // Convert string amount to number for calculations
  const numericAmount = parseFloat(amount) || 0;

  // Calculate reward based on APY (Annual Percentage Yield)
  // Formula: Principal × (APY% / 100) × (Days / 365)
  const estimatedReward = parseFloat(
    (
      numericAmount *
      (selectedOption.apy / 100) *
      (selectedOption.days / 365)
    ).toFixed(4)
  );

  const [recordStaking, { isLoading }] = useRecordStakingMutation();
  const handleStake = async () => {
    setIsSubmitting(true);
    try {
      const wayamount = parseUnits(numericAmount.toString(), 18);
      const duration = selectedOption.days * 24 * 60 * 60; // Convert days to seconds
      const allowanceHash = await writeContractAsync({
        address: Address.IC_TOKEN_ADDRESS as `0x${string}`,
        abi: ICAbi.abi,
        functionName: "approve",
        args: [Address.VAULT_AND_YIELD_ADDRESS as `0x${string}`, wayamount],
      });

      const receiptAllowance = await client.waitForTransactionReceipt({
        confirmations: 1,
        hash: allowanceHash,
      });
      const stakeHash = await writeContractAsync({
        address: Address.VAULT_AND_YIELD_ADDRESS as `0x${string}`,
        abi: VaultAndYieldAbi.abi,
        functionName: "stake",
        args: [wayamount, duration],
      });

      const receiptStake = await client.waitForTransactionReceipt({
        confirmations: 1,
        hash: stakeHash,
      });
      try {
        const result = await recordStaking({
          transactionHash: receiptStake?.transactionHash,
          blockHash: receiptStake?.blockHash,
          blockNumber: receiptStake?.blockNumber.toString(),
          contractAddress: receiptStake?.contractAddress,
          cumulativeGasUsed: "0",
          effectiveGasPrice: "0",
          from: receiptStake?.from,
          to: receiptStake?.to,
          gasUsed: "0",
          root: receiptStake?.root.toString() || "0",
          status: "success",
          stakeAmount: numericAmount,
          stakeDuration: selectedOption.days,
          percentage: selectedOption.apy,
          tokenSymbol: "IC",
          network: "hedera",
          stakeId: hexToNumber(receiptStake.logs[1]?.topics[2]).toString(),

          description: `Staking IC tokens for ${selectedOption.days} days`,
        }).unwrap();
      } catch (error) {
        console.error("Failed to record staking:", error);
      }
      toast.success("Stake successful", {
        description: "You have staked your IC",
      });
      setIsSubmitting(false);
      setStep("success");
    } catch (err) {
      console.error("Error staking:", err);
      toast.error("Failed to stake", {
        description: "Please try again",
      });
      setIsSubmitting(false);
    } finally {
      setIsSubmitting(false);
    }
  };
  const ICbalance = formatUnits(balanceData || "0n", 18);
  return (
    <div className="h-screen bg-background flex flex-col">
      {/* Fixed Header */}
      <Header
        title="International Credit"
        subtitle="Global financial inclusion through blockchain"
      />

      {/* Fixed Staking Form */}
      <div className="flex-shrink-0 bg-background flex flex-col items-center py-2 px-2">
        <Card className="w-full max-w-md">
          <CardContent className="p-6">
            <div className="flex  items-center ">
              <MoveLeft
                onClick={() => navigate(-1)}
                className="cursor-pointer"
              />
              <h2 className="font-bold ml-2 text-xl">Stake IC</h2>
            </div>

            {step === "form" && (
              <>
                <label className="block mb-2 font-medium">
                  Amount to Stake
                </label>
                <input
                  type="number"
                  min={0}
                  max={balance}
                  value={amount}
                  onChange={handleAmountChange}
                  className="w-full border rounded px-3 py-2 dark:text-black"
                  placeholder="Enter amount (e.g., 500)"
                />
                <p className="text-sm text-muted-foreground">
                  Balance: {ICbalance} IC
                </p>

                <label className="block mb-2 mt-2 font-medium">
                  Staking Duration
                </label>
                <div className="flex gap-2 flex-wrap  mb-4">
                  {stakingOptions.map((opt) => (
                    <Button
                      key={opt.days}
                      variant={
                        selectedOption.days === opt.days ? "default" : "outline"
                      }
                      className="grow"
                      onClick={() => setSelectedOption(opt)}
                    >
                      {opt.days}d ({opt.apy}% APY)
                    </Button>
                  ))}
                </div>
                <Button
                  className="w-full mt-4"
                  disabled={
                    numericAmount <= 0 ||
                    numericAmount > balance ||
                    amount === ""
                  }
                  onClick={() => {
                    if (Number(amount) > Number(ICbalance)) {
                      toast.error("Insufficient balance");
                      return;
                    }
                    setStep("review");
                  }}
                >
                  Review & Confirm
                </Button>
              </>
            )}

            {step === "review" && (
              <>
                <h3 className="font-semibold ">Review Stake</h3>
                <div className="mb-2">
                  <p>
                    Stake <b>{numericAmount} IC</b> for{" "}
                    <b>{selectedOption.days} days</b>
                  </p>
                  <p>
                    Estimated Reward: <b>{estimatedReward} IC</b>
                  </p>
                  <p>APY: {selectedOption.apy}%</p>
                </div>
                <Button className="w-full" onClick={handleStake}>
                  {isSubmitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    "Confirm & Stake"
                  )}
                </Button>
                <Button
                  variant="ghost"
                  className="w-full mt-2"
                  onClick={() => setStep("form")}
                >
                  Back
                </Button>
              </>
            )}

            {step === "success" && (
              <div className="text-center">
                <h3 className="font-bold text-lg mb-2">Success!</h3>
                <p>
                  {numericAmount} IC successfully staked for{" "}
                  {selectedOption.days} days.
                </p>
                <Button
                  className="mt-2"
                  onClick={() => {
                    setAmount("");
                    setSelectedOption(stakingOptions[0]);
                    setStep("form");
                  }}
                >
                  Stake More
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Scrollable Stack History */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full overflow-y-auto max-w-md mx-auto px-2 pb-[70px]">
          <StackHistory />
        </div>
      </div>
    </div>
  );
};

export default StakePage;
