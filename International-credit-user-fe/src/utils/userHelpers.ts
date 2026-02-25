import { AppDispatch } from "@/store/store";
import { setUserFromAPI } from "@/store/slices/userSlice";

/**
 * Utility functions for updating user data after API calls
 */

/**
 * Update user data in Redux store after successful API call
 * @param dispatch - Redux dispatch function
 * @param apiResponse - API response containing user data
 */
export const updateUserAfterApiCall = (
  dispatch: AppDispatch,
  apiResponse: any
) => {
  if (apiResponse?.success && apiResponse.data) {
    dispatch(setUserFromAPI(apiResponse.data));
  }
};

/**
 * Higher-order function to wrap API calls and automatically update user state
 * @param apiCall - The API call function
 * @param dispatch - Redux dispatch function
 * @param shouldUpdateUser - Whether to update user state (default: true)
 */
export const withUserUpdate = <T extends (...args: any[]) => Promise<any>>(
  apiCall: T,
  dispatch: AppDispatch,
  shouldUpdateUser: boolean = true
): T => {
  return (async (...args: Parameters<T>) => {
    try {
      const result = await apiCall(...args);

      // If the API call was successful and we should update user state
      if (shouldUpdateUser && result?.success && result.data) {
        dispatch(setUserFromAPI(result.data));
      }

      return result;
    } catch (error) {
      // Re-throw the error so the component can handle it
      throw error;
    }
  }) as T;
};

/**
 * Custom hook for API calls that automatically update user state
 */
export const useApiWithUserUpdate = () => {
  const dispatch = useAppDispatch();

  /**
   * Execute an API call and automatically update user state on success
   * @param apiCall - The API mutation function
   * @param options - Options for the API call
   */
  const executeWithUpdate = async <T>(
    apiCall: () => Promise<{ unwrap: () => Promise<T> }>,
    options?: {
      onSuccess?: (data: T) => void;
      onError?: (error: any) => void;
      shouldUpdateUser?: boolean;
    }
  ) => {
    const { onSuccess, onError, shouldUpdateUser = true } = options || {};

    try {
      const result = await apiCall().unwrap();

      // Update user state if successful and should update
      if (
        shouldUpdateUser &&
        (result as any)?.success &&
        (result as any).data
      ) {
        dispatch(setUserFromAPI((result as any).data));
      }

      // Call success callback
      onSuccess?.(result);

      return result;
    } catch (error) {
      // Call error callback
      onError?.(error);
      throw error;
    }
  };

  return { executeWithUpdate };
};

// Import this if you need it in the custom hook above
import { useAppDispatch } from "@/hooks/useRedux";
