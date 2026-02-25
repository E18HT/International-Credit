import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useWriteContract, useAccount } from "wagmi";
import ICAbi from "@/Abi/IC.json";
import { toast } from "sonner";
import { Address } from "@/lib/Address";
import { parseUnits, formatUnits } from "viem";
import { client } from "@/lib/utils";
import { useRecordTransactionMutation } from "@/store/api/walletApi";
interface SendModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SendModal = ({ isOpen, onClose }: SendModalProps) => {
  const [amount, setAmount] = useState("");
  const [selectedToken, setSelectedToken] = useState("IC");
  const [recipientAddress, setRecipientAddress] = useState("");
  const { writeContractAsync } = useWriteContract();
  const { address } = useAccount();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [recordTransaction] = useRecordTransactionMutation();
  const handleSend = async () => {
    setIsSubmitting(true);
    if (!amount || !recipientAddress) {
      toast.error("Please fill all fields");
      setIsSubmitting(false);
      return;
    }

    try {
      const wayamount = parseUnits(amount, 18);
      const allowanceHash = await writeContractAsync({
        address: Address.IC_TOKEN_ADDRESS as `0x${string}`,
        abi: ICAbi.abi,
        functionName: "transfer",
        args: [recipientAddress, wayamount],
      });
      const receipt = await client.waitForTransactionReceipt({
        confirmations: 1,
        hash: allowanceHash,
      });

      if (receipt) {
        try {
          await recordTransaction({
            txHash: receipt.transactionHash,
            contractAddress: receipt.contractAddress,
            gasUsed: receipt.cumulativeGasUsed.toString(),
            gasPrice: receipt.effectiveGasPrice.toString(), // You can get this from transaction if needed
            type: "SEND",
            fromAddress: receipt.from,
            toAddress: receipt.to,
            tokenSymbol: selectedToken,
            tokenAddress: Address.IC_TOKEN_ADDRESS,
            transactionIndex: Number(receipt.transactionIndex),
            amount: parseFloat(amount),

            amountUSD: parseFloat(amount), // Assuming 1:1 for now, you can add USD conversion logic
            blockNumber: Number(receipt.blockNumber),
            transactionFee: 0, // Calculate based on gasUsed * gasPrice
            network: "hedera",
            description: `Sent ${amount} ${selectedToken} tokens`,
            tags: ["send", "transfer"],
            blockTimestamp: new Date().toISOString(),
          });
        } catch (recordError) {
          console.error("Failed to record transaction:", recordError);
          // Don't show error to user as the main transaction succeeded
        }

        toast.success(`Token Sent`, {
          description: `You sent ${amount} ${selectedToken} to ${recipientAddress}`,
        });
        setIsSubmitting(false);
        setAmount("");
        setRecipientAddress("");
        onClose();
      }
    } catch (error) {
      setIsSubmitting(false);
      console.error(error.message.includes("is invalid"));
      if (error.message.includes("is invalid")) {
        toast.error("Failed to send token", {
          description:
            "The recipient's address is not registered or approved on this platform.",
        });
      } else {
        toast.error("Failed to send token", {
          description: "Please try again",
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md mx-auto">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xl font-semibold">Send Tokens</h2>
        </div>

        <div className="space-y-4">
          <div>
            <Label htmlFor="amount">Amount</Label>
            <Input
              id="amount"
              type="number"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="recipient">Recipient Address</Label>
            <Input
              id="recipient"
              placeholder="0x..."
              value={recipientAddress}
              onChange={(e) => setRecipientAddress(e.target.value)}
            />
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <Button variant="outline" className="flex-1" onClick={onClose}>
            Cancel
          </Button>
          <Button className="flex-1" onClick={handleSend}>
            {isSubmitting ? "Sending..." : "Send"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
