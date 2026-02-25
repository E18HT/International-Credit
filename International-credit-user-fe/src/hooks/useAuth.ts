import { useEffect } from "react";
import { useAppDispatch, useAppSelector } from "./useRedux";
import {
  initializeAuth,
  checkAuthStatus,
  updateUser,
} from "@/store/slices/authSlice";
import { useGetCurrentUserQuery } from "@/store/api/authApi";

/**
 * Custom hook for authentication management
 * Handles auth initialization and provides auth state
 */
export const useAuth = () => {
  const dispatch = useAppDispatch();
  const authState = useAppSelector((state) => state.auth);

  // Initialize auth state from localStorage on app start
  useEffect(() => {
    dispatch(initializeAuth());
  }, [dispatch]);

  // Fetch current user if authenticated (optional)
  const {
    data: currentUserData,
    isLoading: isLoadingUser,
    error,
    refetch: refetchUser,
  } = useGetCurrentUserQuery(undefined, {
    skip:
      !authState.isAuthenticated ||
      authState.requiresTwoFactor ||
      !checkAuthStatus(),
  });
  useEffect(() => {
    if (currentUserData) {
      dispatch(updateUser(currentUserData.data.user));
    }
  }, [currentUserData, dispatch]);

  return {
    ...authState,
    isLoadingUser,
    currentUserData,
    isAuthenticated:
      authState.isAuthenticated &&
      !authState.requiresTwoFactor &&
      checkAuthStatus(),
    requiresTwoFactor: authState.requiresTwoFactor,
    tempAuthData: authState.tempAuthData,
    refetchUser,
  };
};

/**
 * Hook to check if user is authenticated
 */
export const useIsAuthenticated = () => {
  const { isAuthenticated } = useAuth();
  return isAuthenticated;
};

/**
 * Hook to get current user data
 */
export const useCurrentUser = () => {
  const { user, currentUserData } = useAuth();
  return currentUserData?.data?.user || user;
};
