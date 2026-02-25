import { configureStore } from "@reduxjs/toolkit";
import walletReducer from "./slices/walletSlice";
import governanceReducer from "./slices/governanceSlice";
import reservesReducer from "./slices/reservesSlice";
import userReducer from "./slices/userSlice";
import authReducer from "./slices/authSlice";
import { authApi } from "./api/authApi";
import { walletApi } from "./api/walletApi";
import { userProfileApi } from "./api/userProfileApi";
import { governanceApi } from "./api/governanceApi";
import { paymentsApi } from "./api/paymentsApi";
import { kycApi } from "./api/kycApi";
import { rtkQueryGlobalErrorMiddleware } from "@/lib/api";

export const store = configureStore({
  reducer: {
    wallet: walletReducer,
    governance: governanceReducer,
    reserves: reservesReducer,
    user: userReducer,
    auth: authReducer,
    // Add the RTK Query API reducers
    [authApi.reducerPath]: authApi.reducer,
    [walletApi.reducerPath]: walletApi.reducer,
    [userProfileApi.reducerPath]: userProfileApi.reducer,
    [governanceApi.reducerPath]: governanceApi.reducer,
    [paymentsApi.reducerPath]: paymentsApi.reducer,
    [kycApi.reducerPath]: kycApi.reducer,
  },
  // Add the RTK Query middleware and error handling
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(
      authApi.middleware,
      walletApi.middleware,
      userProfileApi.middleware,
      governanceApi.middleware,
      paymentsApi.middleware,
      kycApi.middleware,
      rtkQueryGlobalErrorMiddleware
    ),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
