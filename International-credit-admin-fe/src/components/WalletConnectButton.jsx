import { useState } from "react";
import {
  Wallet,
  ChevronDown,
  Copy,
  LogOut,
  CheckCircle,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { useAccount } from "wagmi";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useWallet } from "@/hooks/useWallet";
export const WalletConnect = () => {
  const [isOpen, setIsOpen] = useState(false);
  const {
    address,
    isConnected,
    shortAddress,
    connectWallet,
    disconnect,
    connectors,
  } = useWallet();
  const { isConnecting } = useAccount();
  const handleConnect = async (connectorId) => {
    try {
      const result = await connectWallet(connectorId);
      if (result) {
        setIsOpen(false);
      }
    } catch (error) {
      // Error handling is already done in the useWallet hook
      console.error("Connection failed in component:", error);
    }
  };

  const handleDisconnect = () => {
    disconnect();
    toast.success("Wallet Disconnected", {
      description: "Your wallet has been disconnected.",
    });
  };

  const copyAddress = () => {
    if (address) {
      navigator.clipboard.writeText(address);
      toast.success("Address Copied", {
        description: "Wallet address copied to clipboard.",
      });
    }
  };

  if (isConnected) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            className="flex items-center justify-between gap-2"
          >
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="hidden sm:inline">{shortAddress}</span>
            </div>
            <ChevronDown className="w-4 h-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="w-72
        "
        >
          <div className="p-3 border-b">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span className="text-sm font-medium">Connected</span>
            </div>
            <p className="text-xs text-muted-foreground break-all">{address}</p>
          </div>

          <DropdownMenuItem onClick={copyAddress}>
            <Copy className="w-4 h-4 mr-2" />
            Copy Address
          </DropdownMenuItem>

          <DropdownMenuItem onClick={handleDisconnect} className="text-red-600">
            <LogOut className="w-4 h-4 mr-2" />
            Disconnect
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="flex items-center gap-2">
          <Wallet className="w-4 h-4" />
          Connect Wallet
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Connect Wallet</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          {connectors.map((connector) => {
            if (connector.name !== "MetaMask") {
              return null;
            }
            return (
              <Card
                key={connector.id}
                className="cursor-pointer hover:bg-muted/50 transition-colors"
              >
                <Button
                  variant="link"
                  className="w-full justify-start h-auto p-4 hover:no-underline"
                  onClick={() => handleConnect(connector.id)}
                  disabled={isConnecting}
                >
                  <div className="flex items-center gap-3 w-full">
                    {connector.type === "metaMask" ? (
                      <div className=" bg-primary/10 rounded-full flex items-center justify-center">
                        <img
                          src={connector.icon}
                          alt="MetaMask"
                          className="w-14 h-10 object-fill text-primary"
                        />
                      </div>
                    ) : connector.icon ? (
                      <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                        <img
                          src={connector.icon}
                          alt={connector.name}
                          className="w-5 h-5 text-primary"
                        />
                      </div>
                    ) : (
                      <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                        <Wallet className="w-5 h-5 text-primary" />
                      </div>
                    )}

                    <div className="text-left w-full">
                      <div className="flex items-center justify-between w-full">
                        <p className="font-medium">{connector.name}</p>
                        {isConnecting && (
                          <Loader2 className="w-10 h-10 text-primary animate-spin" />
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {connector.id === "metaMask" &&
                          "Connect using MetaMask browser extension"}
                        {connector.id === "injected" &&
                          "Connect using browser wallet"}
                        {connector.id === "walletConnect" &&
                          "Connect using WalletConnect"}
                      </p>
                    </div>
                  </div>
                </Button>
              </Card>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
};
