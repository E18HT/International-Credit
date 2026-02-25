import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Loader2 } from "lucide-react";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { Label } from "../ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Card, CardContent } from "../ui/card";
import {
  useGetPaymentQuoteMutation,
  useCreatePaymentIntentMutation,
} from "@/store/api/paymentsApi";
import { toast } from "sonner";
import { useAccount } from "wagmi";
import { Elements } from "@stripe/react-stripe-js";
import { stripePromise } from "@/lib/stripe";
import CheckoutForm from "./CheckoutComponent";
import { walletApi } from "@/store/api/walletApi";
import { useDispatch } from "react-redux";

const BuyModel = ({ tokenoneRefetch }: { tokenoneRefetch: () => void }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [fiatAmount, setFiatAmount] = useState<string>("");
  const [fiatCurrency, setFiatCurrency] = useState<string>("USD");
  const [asset, setAsset] = useState<string>("IC");
  const [quote, setQuote] = useState(null);
  const [clientSecret, setClientSecret] = useState("");
  const [paymentData, setPaymentData] = useState(null);
  const [step, setStep] = useState<"form" | "quote" | "payment">("form");
  const dispatch = useDispatch();
  const { address } = useAccount();
  const [getPaymentQuote, { isLoading: isLoadingQuote }] =
    useGetPaymentQuoteMutation();
  const [
    createPaymentIntent,
    { isLoading: isCreatingIntent, data: paymentIntentData },
  ] = useCreatePaymentIntentMutation();
  const handleGetQuote = async () => {
    if (!fiatAmount || parseFloat(fiatAmount) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    try {
      const response = await getPaymentQuote({
        fiatAmount: parseFloat(fiatAmount),
        fiatCurrency,
        asset,
      }).unwrap();

      if (response.status === "success") {
        setQuote(response.data);
        setStep("quote");
        toast.success("Quote generated successfully!");
      } else {
        toast.error(response.message || "Failed to get quote");
      }
    } catch (error) {
      console.error("Quote error:", error);
      toast.error("Failed to get payment quote");
    }
  };

  const handleReset = () => {
    setQuote(null);
    setFiatAmount("");
    setStep("form");
    setClientSecret("");
    setPaymentData(null);
  };
  useEffect(() => {
    if (isOpen) {
      handleReset();
    }
  }, [isOpen]);
  const handleProceedToPayment = async () => {
    if (!quote?.quoteId) {
      toast.error("No quote available");
      return;
    }

    try {
      const response = await createPaymentIntent({
        quoteId: quote.quoteId,
        paymentMethod: "card",
      }).unwrap();

      if (response.status === "success") {
        setClientSecret(response.data.clientSecret);
        setPaymentData(response.data);
        setStep("payment");

        toast.success("Payment initialized!");
      } else {
        toast.error(response.message || "Failed to create payment intent");
      }
    } catch (error) {
      console.error("Payment intent error:", error);
      toast.error("Failed to initialize payment");
    }
  };

  const handlePaymentSuccess = async () => {
    if (!address || !paymentData) {
      toast.error("Missing payment or wallet information");
      return;
    }

    try {
      toast.success(
        "Payment successful! Tokens have been minted to your wallet. It may take up to 10-20 seconds to complete the process."
      );
      setIsOpen(false);
      handleReset();
      setTimeout(() => {
        dispatch(walletApi.util.invalidateTags(["TransactionHistory"]));
      }, 10000);
      setTimeout(() => {
        tokenoneRefetch();
      }, 15000);
    } catch (error) {
      console.error("Minting error:", error);
      toast.error(
        "Payment successful but token minting failed. Please contact support."
      );
    }
  };
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="flex grow items-center gap-2 border-ic-gold text-ic-gold hover:bg-ic-gold hover:text-white px-4 py-2"
        >
          Buy
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md mx-auto max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Buy Tokens</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {step === "form" ? (
            // Quote Form
            <div className="space-y-4">
              <div>
                <Label htmlFor="asset">Asset</Label>
                <div>{asset}</div>
              </div>
              <div>
                <Label htmlFor="amount">Amount</Label>
                <Input
                  id="amount"
                  type="number"
                  placeholder="Enter amount"
                  value={fiatAmount}
                  onChange={(e) => setFiatAmount(e.target.value)}
                  min="0"
                  step="0.01"
                />
              </div>

              <div>
                <Label htmlFor="currency">Currency</Label>
                <Select value={fiatCurrency} onValueChange={setFiatCurrency}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select currency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                    <SelectItem value="GBP">GBP</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button
                onClick={handleGetQuote}
                className="w-full"
                disabled={isLoadingQuote}
              >
                {isLoadingQuote ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : null}
                Get Quote
              </Button>
            </div>
          ) : step === "quote" ? (
            // Quote Display
            <div className="space-y-4">
              <Card>
                <CardContent className="p-4">
                  <h3 className="font-semibold mb-3">Payment Quote</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Amount:</span>
                      <span>
                        {quote.fiatAmount} {fiatCurrency}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>You'll receive:</span>
                      <span>
                        {quote.icAmount} {asset}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Conversion Rate:</span>
                      <span>
                        1 {fiatCurrency}
                        {` <-> `}
                        {quote.exchangeRate} IC
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Processing Fee:</span>
                      <span>
                        {(() => {
                          const amount = Number(quote.fees?.processing || 0);
                          const decimalPart = amount.toString().split(".")[1];
                          return decimalPart && decimalPart.length > 4
                            ? amount.toFixed(4)
                            : amount.toString();
                        })()}{" "}
                        {quote.fiatCurrency}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Minting Fee:</span>
                      <span>
                        {Number(quote.fees?.minting || 0)} {fiatCurrency}
                      </span>
                    </div>
                    <hr />
                    <div className="flex justify-between font-semibold">
                      <span>Total:</span>
                      <span>
                        {(() => {
                          const amount = Number(quote.totalAmount);
                          const decimalPart = amount.toString().split(".")[1];
                          return decimalPart && decimalPart.length > 4
                            ? amount.toFixed(4)
                            : amount.toString();
                        })()}{" "}
                        {fiatCurrency}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={handleReset}
                  className="flex-1"
                >
                  Back
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleProceedToPayment}
                  disabled={isCreatingIntent}
                >
                  {isCreatingIntent ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : null}
                  Proceed to Payment
                </Button>
              </div>
            </div>
          ) : (
            // Stripe Payment
            <div className="space-y-4">
              <div className="text-center mb-4">
                <h3 className="font-semibold">Complete Payment</h3>
                <p className="text-sm text-muted-foreground">
                  Pay {quote.fiatAmount + quote.fees?.processing + 0.5 || 0}{" "}
                  {fiatCurrency} to receive {paymentIntentData?.data.icAmount}{" "}
                  {asset}
                </p>
              </div>
              <div className="text-sm p-3 rounded-md border bg-success/30 space-y-1">
                <p className="font-medium">Test Card (Stripe)</p>
                <p>Number: 4242 4242 4242 4242</p>
                <p>Expiry: 10/30</p>
                <p>CVV: 123</p>
              </div>
              {clientSecret && (
                <Elements
                  stripe={stripePromise}
                  options={{
                    clientSecret,
                    appearance: {
                      theme: "stripe",
                    },
                  }}
                >
                  <CheckoutForm
                    onSuccess={handlePaymentSuccess}
                    onError={(error: string) => toast.error(error)}
                  />
                </Elements>
              )}

              <Button
                variant="outline"
                onClick={handleReset}
                className="w-full"
              >
                Cancel Payment
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BuyModel;
