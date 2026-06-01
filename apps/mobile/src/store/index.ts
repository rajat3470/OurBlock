import { configureStore } from "@reduxjs/toolkit";
import authReducer from "./slices/authSlice";
import societyReducer from "./slices/societySlice";
import superAdminReducer from "./slices/superAdminSlice";
import businessOwnerReducer from "./slices/businessOwnerSlice";
import userAppReducer from "./slices/userAppSlice";
import cartReducer from "./slices/cartSlice";
import featureFlagsReducer from "./slices/featureFlagsSlice";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    society: societyReducer,
    superAdmin: superAdminReducer,
    businessOwner: businessOwnerReducer,
    userApp: userAppReducer,
    cart: cartReducer,
    featureFlags: featureFlagsReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
