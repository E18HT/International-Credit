import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export interface UserState {
  name: string;
  walletAddress: string;
  memberSince: string;
  ucgtHoldings: number;
  isKycApproved: boolean;
  isVerified: boolean;
}

const initialState: UserState = {
  name: "John Doe",
  walletAddress: "0x1234...5678",
  memberSince: "March 2024",
  ucgtHoldings: 2450,
  isKycApproved: true,
  isVerified: true,
};

const userSlice = createSlice({
  name: "user",
  initialState,
  reducers: {
    updateProfile: (state, action: PayloadAction<Partial<UserState>>) => {
      Object.assign(state, action.payload);
    },
  },
});

export const { updateProfile } = userSlice.actions;
export default userSlice.reducer;
