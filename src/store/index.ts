import { configureStore } from "@reduxjs/toolkit";
import authReducer from "./slices/authSlice";
import societyReducer from "./slices/societySlice";
import superAdminReducer from "./slices/superAdminSlice";
import businessOwnerReducer from "./slices/businessOwnerSlice";
import userAppReducer from "./slices/userAppSlice";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    society: societyReducer,
    superAdmin: superAdminReducer,
    businessOwner: businessOwnerReducer,
    userApp: userAppReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
