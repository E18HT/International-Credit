import React from "react";
import { useAppSelector } from "@/hooks/useRedux";
import { Button } from "@/components/ui/button";
import { ArrowUpRight, ArrowDownLeft, RefreshCw } from "lucide-react";
import { useReadContract, useAccount } from "wagmi";
import ICAbi from "@/Abi/IC.json";
import ICControllerAbi from "@/Abi/ICController.json";
import { SendModal } from "../SendModal";
import { ReceiveModal } from "../ReceiveModal";
import { useState } from "react";
import { formatUnits } from "viem";
import { Address } from "@/lib/Address";
import BuyModel from "./BuyModel";

const BalanceBox = () => {
  const [showSendModal, setShowSendModal] = useState(false);
  const [showReceiveModal, setShowReceiveModal] = useState(false);

  const { walletConnecting } = useAppSelector((state) => state.wallet);
  const { address, isConnected } = useAccount();

  // //Balance for token one
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
  const {
    data: icValueData,
    isLoading: isLoadingIcValue,
    isFetching: isFetchingIcValue,
    refetch: icValueRefetch,
  } = useReadContract({
    functionName: "getCurrentIcValue",
    abi: ICControllerAbi.abi,
    address: Address.IC_CONTROLLER,
  });

  return isConnected && !walletConnecting ? (
    <div className="flex flex-col items-start gap-2">
      <p className="ic-caption flex items-center gap-2  w-full justify-between dark:text-gray-200 text-gray-600 ">
        Total Balance{" "}
        <RefreshCw
          className={`w-4 h-4 cursor-pointer ${
            isFetchingBalance || isFetchingIcValue ? "animate-spin" : ""
          }`}
          onClick={() => {
            tokenoneRefetch();
            icValueRefetch();
          }}
        />
      </p>
      <h2 className="ic-display-medium flex gap-2 items-baseline  mb-1 ">
        $
        {(
          parseFloat(formatUnits(balanceData || 0n, 18)) *
          parseFloat(formatUnits(icValueData || 0n, 18))
        ).toFixed(2)}
        <span className="text-base text-gray-500">
          ({formatUnits(BigInt(balanceData || 0), 18)} IC)
        </span>
      </h2>

      <div className="flex gap-3 flex-wrap w-full  justify-center">
        <Button
          size="sm"
          className="ic-button-primary grow bg-ic-blue hover:bg-ic-blue-light text-white flex items-center gap-2 px-4 py-2"
          onClick={() => setShowSendModal(true)}
        >
          Send
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="flex items-center grow gap-2 border-ic-blue text-ic-blue hover:bg-ic-blue hover:text-white px-4 py-2"
          onClick={() => setShowReceiveModal(true)}
        >
          Receive
        </Button>
        <BuyModel tokenoneRefetch={tokenoneRefetch} />
      </div>

      <SendModal
        isOpen={showSendModal}
        onClose={() => setShowSendModal(false)}
      />
      <ReceiveModal
        isOpen={showReceiveModal}
        onClose={() => setShowReceiveModal(false)}
      />
    </div>
  ) : null;
};

export default BalanceBox;
