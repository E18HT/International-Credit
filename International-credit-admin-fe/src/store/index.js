import { configureStore } from "@reduxjs/toolkit";

import { apiSlice } from "./api/apiSlice";
import { userManagementApiSlice } from "./api/userManagementApiSlice";
import { dashboardApiSlice } from "./api/dashboardApiSlice";
import { profileApiSlice } from "./api/profileApiSlice";
import { governanceApiSlice } from "./api/governanceApiSlice";
import { auditApiSlice } from "./api/auditApiSlice";
import { custodianApiSlice } from "./api/custodianApiSlice";
import { userProfileApiSlice } from "./api/userProfileApi";
import { transactionApiSlice } from "./api/transactionApiSlice";
import authReducer from "./slices/authSlice";
import userReducer from "./slices/userSlice";
import walletReducer from "./slices/walletSlice";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    wallet: walletReducer,

    users: userReducer,
    [apiSlice.reducerPath]: apiSlice.reducer,
    [userManagementApiSlice.reducerPath]: userManagementApiSlice.reducer,
    [dashboardApiSlice.reducerPath]: dashboardApiSlice.reducer,
    [profileApiSlice.reducerPath]: profileApiSlice.reducer,
    [governanceApiSlice.reducerPath]: governanceApiSlice.reducer,
    [auditApiSlice.reducerPath]: auditApiSlice.reducer,
    [custodianApiSlice.reducerPath]: custodianApiSlice.reducer,
    [userProfileApiSlice.reducerPath]: userProfileApiSlice.reducer,
    [transactionApiSlice.reducerPath]: transactionApiSlice.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware()
      .concat(apiSlice.middleware)
      .concat(userManagementApiSlice.middleware)
      .concat(dashboardApiSlice.middleware)
      .concat(profileApiSlice.middleware)
      .concat(governanceApiSlice.middleware)
      .concat(auditApiSlice.middleware)
      .concat(custodianApiSlice.middleware)
      .concat(userProfileApiSlice.middleware)
      .concat(transactionApiSlice.middleware),
});

export default store;
