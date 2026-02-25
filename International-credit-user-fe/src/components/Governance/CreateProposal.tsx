import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { toast } from "sonner";
import GovernanceControllerAbi from "@/Abi/GovernanceController.json";
import { useAccount, useReadContract } from "wagmi";
import { client } from "@/lib/utils";
import ICGOVTAbi from "@/Abi/ICGOVT.json";
import { useReadContracts } from "wagmi";
import { Address } from "@/lib/Address";
import { useSignMessage } from "wagmi";
import { useRecordTransactionMutation } from "@/store/api/governanceApi";
import { hexToNumber } from "viem";

const CreateProposal = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState("");
  const { address, isConnected } = useAccount(); //Wallet address
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { writeContractAsync } = useWriteContract(); // Function from custom hook
  const { signMessageAsync } = useSignMessage();
  const [recordTransaction] = useRecordTransactionMutation();

  const { data: balanceData, refetch: tokenoneRefetch } = useReadContract({
    functionName: "balanceOf",
    abi: ICGOVTAbi.abi,
    args: [address],
    address: Address.ICGOV_TOKEN_ADDRESS,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim() || !description.trim()) {
      toast.error("Please fill in all required fields");
      return;
    }
    if (!isConnected) {
      toast.error("Please connect your wallet");
      return;
    }
    if (!balanceData) {
      toast.error("You don't have enough ICGOVT to create a proposal");
      return;
    }

    setIsSubmitting(true);

    try {
      // Create proposal with combined title and description
      const proposalDescription = title.trim();

      const allowanceHash = await writeContractAsync({
        //@ts-expect-error viem types
        address: Address.GOVERNANCE_CONTROLLER_ADDRESS as `0x${string}`,
        abi: GovernanceControllerAbi.abi,
        functionName: "createProposal",
        args: [proposalDescription],
      });

      const receipt = await client.waitForTransactionReceipt({
        confirmations: 1,
        hash: allowanceHash,
      });

      const signResult = await signMessageAsync({
        message: allowanceHash,
        account: address,
      });

      const proposalTransaction = {
        blockHash: receipt.blockHash,
        blockNumber: Number(receipt.blockNumber),
        contractAddress: receipt.contractAddress,
        cumulativeGasUsed: Number(receipt.cumulativeGasUsed),
        effectiveGasPrice: Number(receipt.effectiveGasPrice),
        from: receipt.from,
        gasUsed: receipt.gasUsed.toString(),
        logs: receipt.logs.map((log) => ({
          ...log,
          blockNumber: Number(log.blockNumber),
          transactionIndex: Number(log.transactionIndex),
          logIndex: Number(log.logIndex),
        })),
        logsBloom: receipt.logsBloom,
        root: receipt.root || "",
        status: receipt.status,
        to: receipt.to,
        transactionHash: receipt.transactionHash,
        transactionIndex: Number(receipt.transactionIndex),
        txHash: receipt.transactionHash,
        type: receipt.type,

        description: description,
        transactionType: "CREATE_PROPOSAL",
        //@ts-expect-error viem types
        proposalId: hexToNumber(receipt.logs[0]?.topics[1]),
        title: title,
      };
      // Record transaction in backend
      try {
        //@ts-expect-error viem types
        await recordTransaction(proposalTransaction);

        toast.success("Proposal created successfully!", {
          description: "Transaction recorded and proposal is now active",
        });
      } catch (apiError) {
        console.error("Failed to record transaction:", apiError);
        toast.warning("Proposal created but failed to record", {
          description:
            "The blockchain transaction succeeded but backend recording failed",
        });
      }

      if (signResult) {
        setIsSubmitting(false);
        setIsOpen(false);
        setTitle("");
        setDescription("");
      }
    } catch (err) {
      console.error("Error creating proposal:", err);
      toast.error("Failed to create proposal", {
        description: "Please try again",
      });
      setIsSubmitting(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="w-full mb-2">Create Proposal</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create New Proposal</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter proposal title"
              maxLength={50}
              required
            />
            <p className="text-sm text-gray-500 mt-1">
              {title.length}/50 characters
            </p>
          </div>
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter proposal description"
              rows={4}
              required
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Creating..." : "Create Proposal"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateProposal;
