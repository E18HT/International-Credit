import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { addDays, differenceInDays, format } from "date-fns";
import { createPublicClient, http } from "viem";
import { hederaTestnet } from "viem/chains";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
export function formatAddress(address: string) {
  if (!address) return "Wallet Not Connected";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

//format number to 2k, 2m, 2b, 2t
export function formatNumber(number: number) {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    currency: "USD",
    style: "currency",
    compactDisplay: "short",
  }).format(number);
}

export const client = createPublicClient({
  chain: hederaTestnet,
  transport: http(),
});

export function getRemainingDays(createdDate: Date) {
  //const createdDate = new Date("2025-09-23T10:00:00Z");

  // Step 1: expiry = created + 7 days
  const expiryDate = addDays(createdDate, 7);

  // Step 2: remaining days until expiry
  const now = new Date();
  const remainingDays = differenceInDays(expiryDate, now);

  // Step 3: format for display (optional)
  return remainingDays;
}
