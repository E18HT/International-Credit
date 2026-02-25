import React, { useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useGetMeQuery } from "../store/api/apiSlice";
import { updateUserDetails } from "../store/slices/authSlice";

const UserDetailsProvider = ({ children }) => {
  const dispatch = useDispatch();
  const { isAuthenticated, token } = useSelector((state) => state.auth);

  // Only fetch user details if authenticated and token exists
  const {
    data: userDetails,
    error,
    isLoading,
  } = useGetMeQuery(undefined, {
    skip: !isAuthenticated || !token,
    refetchOnMountOrArgChange: true,
  });

  // Update user details in Redux store when data is fetched
  useEffect(() => {
    if (userDetails && !isLoading && !error) {
      dispatch(updateUserDetails(userDetails.user));
    }
  }, [userDetails, isLoading, error, dispatch]);

  // Handle errors
  useEffect(() => {
    if (error) {
      console.error("Failed to fetch user details:", error);
      // You can add toast notification here if needed
    }
  }, [error]);

  return children;
};

export default UserDetailsProvider;
