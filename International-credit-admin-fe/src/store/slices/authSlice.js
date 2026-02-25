import { createSlice } from "@reduxjs/toolkit";

// Load token from localStorage on app start
const loadTokenFromStorage = () => {
  try {
    const token = localStorage.getItem("auth_token");
    const user = localStorage.getItem("auth_user");
    const role = localStorage.getItem("auth_role");

    if (token && user) {
      return {
        token,
        user: JSON.parse(user),
        role,
        isAuthenticated: true,
      };
    }
  } catch (error) {
    console.error("Error loading auth data from localStorage:", error);
    // Clear corrupted data
    localStorage.removeItem("auth_token");
    localStorage.removeItem("auth_user");
    localStorage.removeItem("auth_role");
  }

  return {
    token: null,
    user: null,
    role: null,
    isAuthenticated: false,
  };
};

const initialAuthData = loadTokenFromStorage();

const initialState = {
  user: initialAuthData.user,
  token: initialAuthData.token,
  isAuthenticated: initialAuthData.isAuthenticated,
  role: initialAuthData.role,
  loading: false,
  error: null,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    loginStart: (state) => {
      state.loading = true;
      state.error = null;
    },
    loginSuccess: (state, action) => {
      state.loading = false;
      state.isAuthenticated = true;
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.role = action.payload.role ?? null;
      state.error = null;

      // Save to localStorage
      try {
        localStorage.setItem("auth_token", action.payload.token);
        localStorage.setItem("auth_user", JSON.stringify(action.payload.user));
        if (action.payload.role) {
          localStorage.setItem("auth_role", action.payload.role);
        }
      } catch (error) {
        console.error("Error saving auth data to localStorage:", error);
      }
    },
    loginFailure: (state, action) => {
      state.loading = false;
      state.isAuthenticated = false;
      state.user = null;
      state.token = null;
      state.role = null;
      state.error = action.payload;
    },
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      state.role = null;
      state.loading = false;
      state.error = null;

      // Clear localStorage
      try {
        localStorage.removeItem("auth_token");
        localStorage.removeItem("auth_user");
        localStorage.removeItem("auth_role");
      } catch (error) {
        console.error("Error clearing auth data from localStorage:", error);
      }
    },
    clearError: (state) => {
      state.error = null;
    },
    updateUserDetails: (state, action) => {
      state.user = action.payload;
      // Update localStorage
      try {
        localStorage.setItem("auth_user", JSON.stringify(action.payload));
      } catch (error) {
        console.error("Error updating user data in localStorage:", error);
      }
    },
  },
});

export const {
  loginStart,
  loginSuccess,
  loginFailure,
  logout,
  clearError,
  updateUserDetails,
} = authSlice.actions;
export default authSlice.reducer;
