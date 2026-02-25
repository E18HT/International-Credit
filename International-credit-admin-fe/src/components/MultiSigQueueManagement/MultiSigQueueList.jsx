import React, { useState } from "react";
import { AlertTriangle, Zap, XCircle, Eye, ClipboardList, Shield } from "lucide-react";
import { toast } from "sonner";
import { useAccount, useReadContract, useWriteContract } from "wagmi";

import { Badge } from "../ui/badge";
import { Card, CardContent } from "../ui/card";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import { mockMultiSigQueue } from "@/mockData";
import ICAbi from "../../utils/Abi/IC.json";

const MultiSigQueueList = () => {
  const [isApproving, setIsApproving] = useState(false);
  const [isMintingApproving, setIsMintingApproving] = useState(false);
  const { isConnected } = useAccount();
  const { writeContractAsync } = useWriteContract();

  const { data: isPaused, refetch: isPausedRefetch } = useReadContract({
    address: import.meta.env.VITE_IC_TOKEN_ADDRESS,
    abi: ICAbi.abi,
    functionName: "paused",
  });
  const { data: isMintingFrozen, refetch: isMintingFrozenRefetch } =
    useReadContract({
      address: import.meta.env.VITE_IC_TOKEN_ADDRESS,
      abi: ICAbi.abi,
      functionName: "mintingFrozen",
    });

  const [queue, setQueue] = useState(mockMultiSigQueue);

  /**
   * Handles emergency pause/unpause of the IC token contract
   * Requires wallet connection and multi-sig approval
   * Toggles contract state: paused <-> unpaused
   */
  const handleApproval = async () => {
    setIsApproving(true);
    if (!isConnected) {
      toast.error("Please connect your wallet");
      return;
    }
    try {
      // Toggle pause state based on current contract status
      if (!isPaused) {
        // Pause contract - stops all token transfers
        const allowanceHash = await writeContractAsync({
          //@ts-expect-error viem types
          address: import.meta.env.VITE_IC_TOKEN_ADDRESS,
          abi: ICAbi.abi,
          functionName: "emergencyPause",
          // Multi-sig nouns required for contract interaction
          args: [import.meta.env.VITE_PAUSE_SMART_CONTRACT_NOUNS],
        });
        toast.success("Transaction submitted");
      } else {
        // Unpause contract - resumes normal operations
        const allowanceHash = await writeContractAsync({
          //@ts-expect-error viem types
          address: import.meta.env.VITE_IC_TOKEN_ADDRESS,
          abi: ICAbi.abi,
          functionName: "emergencyUnpause",
          args: [import.meta.env.VITE_PAUSE_SMART_CONTRACT_NOUNS],
        });
        toast.success("Transaction submitted");
      }
    } catch (error) {
      console.error(error);
      toast.error("Error approving");
    } finally {
      setIsApproving(false);
    }
  };

  /**
   * Handles freezing/unfreezing of token minting operations
   * Prevents new tokens from being created when frozen
   * Requires wallet connection and multi-sig approval
   */
  const handleMinting = async () => {
    setIsMintingApproving(true);
    if (!isConnected) {
      toast.error("Please connect your wallet");
      return;
    }
    try {
      // Toggle minting freeze state based on current contract status
      if (!isMintingFrozen) {
        // Freeze minting - prevents new token creation
        const allowanceHash = await writeContractAsync({
          //@ts-expect-error viem types
          address: import.meta.env.VITE_IC_TOKEN_ADDRESS,
          abi: ICAbi.abi,
          functionName: "freezeMinting",
          args: [import.meta.env.VITE_PAUSE_SMART_CONTRACT_NOUNS],
        });
        toast.success("Contract minting frozen");
      } else {
        // Unfreeze minting - allows new token creation
        const allowanceHash = await writeContractAsync({
          //@ts-expect-error viem types
          address: import.meta.env.VITE_IC_TOKEN_ADDRESS,
          abi: ICAbi.abi,
          functionName: "unfreezeMinting",
          args: [import.meta.env.VITE_PAUSE_SMART_CONTRACT_NOUNS],
        });
        toast.success("Contract minting unfrozen");
      }
    } catch (error) {
      console.error(error);
      toast.error("Error freezing/unfreezing minting");
    } finally {
      setIsMintingApproving(false);
    }
  };

  const getPriorityBadge = (priority) => {
    switch (priority) {
      case "critical":
        return <Badge className="bg-red-600">Critical</Badge>;
      case "high":
        return <Badge className="bg-orange-600">High</Badge>;
      case "medium":
        return <Badge className="bg-yellow-600">Medium</Badge>;
      case "low":
        return <Badge className="bg-green-600">Low</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const getActionTypeIcon = (action) => {
    if (action.toLowerCase().includes("mint"))
      return <Shield className="h-4 w-4 text-green-600" />;
    if (action.toLowerCase().includes("burn"))
      return <AlertTriangle className="h-4 w-4 text-red-600" />;
    if (action.toLowerCase().includes("pause"))
      return <XCircle className="h-4 w-4 text-red-600" />;
    return <ClipboardList className="h-4 w-4 text-blue-600" />;
  };
  return (
    <div className="space-y-4">
      <Card
        className={`${
          isPaused
            ? "border-red-200 bg-red-50 dark:bg-red-900/30  dark:border-red-900/50"
            : "border-green-200 bg-green-50 dark:bg-green-900/30  dark:border-green-900/50"
        }`}
      >
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-3 mb-3">
                {isPaused ? getActionTypeIcon("pause") : ""}
                <h3 className="text-lg font-semibold">Pause smart contract </h3>
                {isPaused ? getPriorityBadge("high") : ""}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6"></div>
            </div>

            {/* Actions */}
            <div className="flex space-x-2 ml-4">
              <Dialog>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline">
                    <Eye className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Multi-Signature Action Details</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-semibold mb-2">Action</h4>
                      <p className="text-lg">Freeze minting operation</p>
                    </div>

                    <div className="">
                      <h4 className="font-semibold mb-2">Signer Details</h4>
                      <div className="bg-gray-50 p-3 rounded text-sm font-mono">
                        <div
                          className="flex gap-2 items-center text-black 
"
                        >
                          <p>
                            Signer One:{" "}
                            {
                              import.meta.env
                                .VITE_PAUSE_SMART_CONTRACT_SIGNER_ONE
                            }
                          </p>
                        </div>
                        <div
                          className="flex gap-2 items-center text-black 
"
                        >
                          <p>
                            Signer Two:{" "}
                            {
                              import.meta.env
                                .VITE_PAUSE_SMART_CONTRACT_SIGNER_TWO
                            }
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="border-t pt-4">
                      <h4 className="font-semibold mb-2">Admin Actions</h4>
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          variant={isPaused ? "unpause" : "pause"}
                          onClick={() => handleApproval()}
                        >
                          {isApproving
                            ? "Approving..."
                            : isPaused
                            ? "Unpause contract"
                            : "Pause contract"}
                        </Button>
                      </div>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>

              <Button
                size="sm"
                variant={isPaused ? "unpause" : "pause"}
                onClick={() => handleApproval()}
              >
                {isApproving
                  ? "Approving..."
                  : isPaused
                  ? "Unpause contract"
                  : "Pause contract"}
              </Button>
            </div>
          </div>
          <div className="flex items-start justify-between">
            Manage IC Token Creation Freeze to prevent new tokens from being
            minted, or unfreeze to resume creation.
          </div>
        </CardContent>
      </Card>
      <Card
        className={`${
          isPaused
            ? "border-red-200 bg-red-50 dark:bg-red-900/30  dark:border-red-900/50"
            : "border-green-200 bg-green-50 dark:bg-green-900/30  dark:border-green-900/50"
        }`}
      >
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-3 mb-3">
                {isPaused ? getActionTypeIcon("pause") : ""}
                <h3 className="text-lg font-semibold">
                  Freeze minting operation
                </h3>
                {isPaused ? getPriorityBadge("high") : ""}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6"></div>
            </div>

            {/* Actions */}
            <div className="flex space-x-2 ml-4">
              <Dialog>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline">
                    <Eye className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Multi-Signature Action Details</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="">
                      <h4 className="font-semibold mb-2">Action</h4>
                      <p className="text-lg">Freeze minting operation</p>
                    </div>

                    <div>
                      <h4 className="font-semibold mb-2">Signer Details</h4>
                      <div className="bg-gray-50 p-3 rounded text-sm font-mono">
                        <div className="flex gap-2 items-center text-black ">
                          <p>
                            Signer One:{" "}
                            {
                              import.meta.env
                                .VITE_PAUSE_SMART_CONTRACT_SIGNER_ONE
                            }
                          </p>
                        </div>
                        <div className="flex gap-2 items-center text-black ">
                          <p>
                            Signer Two:{" "}
                            {
                              import.meta.env
                                .VITE_PAUSE_SMART_CONTRACT_SIGNER_TWO
                            }
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="border-t pt-4">
                      <h4 className="font-semibold mb-2">Admin Actions</h4>
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          variant={isMintingFrozen ? "unpause" : "pause"}
                          onClick={() => handleMinting()}
                        >
                          {isMintingApproving
                            ? "Approving..."
                            : isMintingFrozen
                            ? "Unfreeze Minting"
                            : "Freeze Minting"}
                        </Button>
                      </div>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>

              <Button
                size="sm"
                variant={isMintingFrozen ? "unpause" : "pause"}
                onClick={() => handleMinting()}
              >
                {isMintingApproving
                  ? "Approving..."
                  : isMintingFrozen
                  ? "Unfreeze Minting"
                  : "Freeze Minting"}
              </Button>
            </div>
          </div>
          <div className="flex items-start justify-between">
            Emergency Stop Pause the contract to prevent all transactions, or
            unpause to resume normal operations.
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MultiSigQueueList;
