import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  users: [],
  totalUsers: 0,
  currentPage: 1,
  totalPages: 0,
  limit: 10,
  loading: false,
  error: null,
  filters: {
    search: "",
    role: "",
    status: "",
  },
  selectedUser: null,
};

const userSlice = createSlice({
  name: "users",
  initialState,
  reducers: {
    setUsers: (state, action) => {
      state.users = action.payload.users || [];
      state.totalUsers = action.payload.totalUsers || 0;
      state.currentPage = action.payload.currentPage || 1;
      state.totalPages = action.payload.totalPages || 0;
    },
    setLoading: (state, action) => {
      state.loading = action.payload;
    },
    setError: (state, action) => {
      state.error = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
    setCurrentPage: (state, action) => {
      state.currentPage = action.payload;
    },
    setLimit: (state, action) => {
      state.limit = action.payload;
    },
    setFilters: (state, action) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    clearFilters: (state) => {
      state.filters = {
        search: "",
        role: "",
        status: "",
      };
    },
    setSelectedUser: (state, action) => {
      state.selectedUser = action.payload;
    },
    updateUserInList: (state, action) => {
      const { userId, updates } = action.payload;
      const userIndex = state.users.findIndex((user) => user.id === userId);
      if (userIndex !== -1) {
        state.users[userIndex] = { ...state.users[userIndex], ...updates };
      }
    },
    removeUserFromList: (state, action) => {
      const userId = action.payload;
      state.users = state.users.filter((user) => user.id !== userId);
      state.totalUsers = Math.max(0, state.totalUsers - 1);
    },
  },
});

export const {
  setUsers,
  setLoading,
  setError,
  clearError,
  setCurrentPage,
  setLimit,
  setFilters,
  clearFilters,
  setSelectedUser,
  updateUserInList,
  removeUserFromList,
} = userSlice.actions;

export default userSlice.reducer;
