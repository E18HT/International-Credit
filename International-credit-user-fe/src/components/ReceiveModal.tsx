import { Copy, QrCode, X } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAppSelector } from "@/hooks/useRedux";
import { useToast } from "@/hooks/use-toast";
import { useAccount } from "wagmi";
import { useEffect, useState } from "react";
import QRCode from "qrcode";

interface ReceiveModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ReceiveModal = ({ isOpen, onClose }: ReceiveModalProps) => {
  const { address } = useAccount();
  const { toast } = useToast();
  const [qrCodeUrl, setQrCodeUrl] = useState<string>("");

  useEffect(() => {
    if (address && isOpen) {
      QRCode.toDataURL(address, {
        width: 200,
        margin: 2,
        color: {
          dark: "#000000",
          light: "#FFFFFF",
        },
      })
        .then(setQrCodeUrl)
        .catch(console.error);
    }
  }, [address, isOpen]);

  const copyAddress = () => {
    if (address) {
      navigator.clipboard.writeText(address);
      toast({
        title: "Address Copied",
        description: "Wallet address copied to clipboard",
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold">Receive Tokens</h2>
        </div>

        <div className="text-center space-y-6">
          {/* QR Code */}
          <div className="w-48 h-48 mx-auto bg-white rounded-lg flex items-center justify-center p-4">
            {qrCodeUrl ? (
              <img
                src={qrCodeUrl}
                alt="Wallet Address QR Code"
                className="w-full h-full object-contain"
              />
            ) : (
              <QrCode className="w-24 h-24 text-muted-foreground" />
            )}
          </div>

          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Your Wallet Address</p>
            <div className="flex items-center gap-2">
              <Input
                value={address || ""}
                readOnly
                className="text-center font-mono text-sm"
              />
              <Button variant="outline" size="icon" onClick={copyAddress}>
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            Share this address to receive tokens
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};
