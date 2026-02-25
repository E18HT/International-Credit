import React, { useState } from "react";
import {
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface CheckoutFormProps {
  onSuccess: () => void;
  onError: (error: string) => void;
}

const CheckoutForm = ({ onSuccess, onError }: CheckoutFormProps) => {
  const stripe = useStripe();
  const elements = useElements();
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: window.location.origin,
        },
        redirect: "if_required",
      });

      if (error) {
        onError(error.message || "Payment failed");
      } else {
        onSuccess();
      }
    } catch (err) {
      onError("Payment processing failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />
      <Button type="submit" disabled={!stripe || isLoading} className="w-full">
        {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
        {isLoading ? "Processing..." : "Pay Now"}
      </Button>
    </form>
  );
};

export default CheckoutForm;
