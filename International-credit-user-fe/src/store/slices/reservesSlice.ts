import { createSlice } from "@reduxjs/toolkit";

export interface Reserve {
  type: string;
  percentage: number;
  value: string;
  IconclassName?: string;
  icon: string;
}

export interface ReserveActivity {
  id: string;
  type: "addition" | "check" | "update";
  title: string;
  time: string;
  value: string;
  icon: string;
}

export interface ReservesState {
  totalValue: string;
  collateralizationRatio: number;
  reserves: Reserve[];
  recentActivity: ReserveActivity[];
}

const initialState: ReservesState = {
  totalValue: "$3.7M",
  collateralizationRatio: 155,
  reserves: [
    {
      type: "BTC",
      percentage: 40,
      value: "$2.4M",
      icon: "₿",
      IconclassName: "bg-yellow-500",
    },
    {
      type: "Gold",
      percentage: 60,
      value: "$1.3M",
      icon: "🟡",
      IconclassName: "bg-orange-400",
    },
  ],
  recentActivity: [
    {
      id: "1",
      type: "addition",
      title: "BTC Reserve Addition",
      time: "2 hours ago",
      value: "+0.5 BTC",
      icon: "+",
    },
    {
      id: "2",
      type: "check",
      title: "Ratio Check",
      time: "6 hours ago",
      value: "155%",
      icon: "ℹ",
    },
    {
      id: "3",
      type: "update",
      title: "Gold Price Update",
      time: "1 day ago",
      value: "$2,045/oz",
      icon: "⚡",
    },
  ],
};

const reservesSlice = createSlice({
  name: "reserves",
  initialState,
  reducers: {},
});

export default reservesSlice.reducer;
