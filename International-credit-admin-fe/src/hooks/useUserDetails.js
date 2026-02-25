import { useSelector } from "react-redux";

import { useGetMeQuery } from "../store/api/apiSlice";

export const useUserDetails = () => {
  const { user, isAuthenticated, token } = useSelector((state) => state.auth);

  // Fetch fresh user details if authenticated
  const {
    data: freshUserDetails,
    isLoading,
    error,
    refetch,
  } = useGetMeQuery(undefined, {
    skip: !isAuthenticated || !token,
  });

  return {
    user: freshUserDetails?.user || user,
    isAuthenticated,
    isLoading,
    error,
    refetch,
  };
};
