import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  totalBalance: 5057.55,
  walletAddress: "0xABC123...DEF456",
  walletConnecting: false,
  holdings: [],
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
    updateBalance: (state, action) => {
      state.totalBalance = action.payload;
    },
    updateHolding: (state, action) => {
      const index = state.holdings.findIndex((h) => h.id === action.payload.id);
      if (index !== -1) {
        state.holdings[index] = action.payload;
      }
    },
    updateWalletConnecting: (state, action) => {
      state.walletConnecting = action.payload;
    },
  },
});

export const { updateBalance, updateHolding, updateWalletConnecting } =
  walletSlice.actions;
export default walletSlice.reducer;
