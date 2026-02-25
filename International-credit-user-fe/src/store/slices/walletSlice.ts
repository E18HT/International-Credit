import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export interface CryptoHolding {
  id: string;
  symbol: string;
  name: string;
  amount: number;
  value: number;
  change: number;
  IconclassName: string;
  icon: string;
}

export interface Transaction {
  id: string;
  type: "send" | "receive" | "swap" | "stake";
  amount: string;
  token: string;
  value: number;
  status: "completed" | "pending" | "failed";
  timeAgo: string;
}

export interface WalletState {
  totalBalance: number;
  holdings: CryptoHolding[];
  transactions: Transaction[];
  walletAddress: string;
  walletConnecting: boolean;
}

const initialState: WalletState = {
  totalBalance: 5057.55,
  walletAddress: "0xABC123...DEF456",
  walletConnecting: false,
  holdings: [
    // {
    //   id: "1",
    //   symbol: "IC",
    //   name: "International Credit",
    //   amount: 1247.5,
    //   value: 1872.45,
    //   change: 5.2,
    //   icon: "IC",
    //   IconclassName: "",
    // },
    // {
    //   id: "2",
    //   symbol: "ICBTC",
    //   name: "Blockchain Token",
    //   amount: 0.0234,
    //   value: 1156.8,
    //   change: 2.1,
    //   icon: "ICBTC",
    //   IconclassName: "text-gray-500 ",
    // },
    // {
    //   id: "3",
    //   symbol: "ICAUT",
    //   name: "Credit Token",
    //   amount: 0.587,
    //   value: 1178.3,
    //   change: -1.3,
    //   icon: "ICAUT",
    //   IconclassName: "text-yellow-600 ",
    // },
    // {
    //   id: "4",
    //   symbol: "USDC",
    //   name: "USD Coin",
    //   amount: 850,
    //   value: 850,
    //   change: 0,
    //   IconclassName: "",
    //   icon: "USDC",
    // },
  ],
  transactions: [
    {
      id: "1",
      type: "receive",
      amount: "+125.50",
      token: "IC",
      value: 187.32,
      status: "completed",
      timeAgo: "2 hours ago",
    },
    {
      id: "2",
      type: "send",
      amount: "-50.00",
      token: "USDC",
      value: 50.0,
      status: "completed",
      timeAgo: "1 day ago",
    },
    {
      id: "3",
      type: "swap",
      amount: "100 IC",
      token: "IC",
      value: 149.2,
      status: "completed",
      timeAgo: "3 days ago",
    },
    {
      id: "4",
      type: "stake",
      amount: "+8.75",
      token: "IC",
      value: 13.12,
      status: "completed",
      timeAgo: "1 week ago",
    },
  ],
};

const walletSlice = createSlice({
  name: "wallet",
  initialState,
  reducers: {
    updateBalance: (state, action: PayloadAction<number>) => {
      state.totalBalance = action.payload;
    },
    updateHolding: (state, action: PayloadAction<CryptoHolding>) => {
      const index = state.holdings.findIndex((h) => h.id === action.payload.id);
      if (index !== -1) {
        state.holdings[index] = action.payload;
      }
    },
    updateWalletConnecting: (state, action: PayloadAction<boolean>) => {
      state.walletConnecting = action.payload;
    },
  },
});

export const { updateBalance, updateHolding, updateWalletConnecting } =
  walletSlice.actions;
export default walletSlice.reducer;
