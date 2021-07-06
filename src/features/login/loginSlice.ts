import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { RootState } from '../../app/store';

interface LoginState {
  authenticated: boolean;
  authorizationHeader: string;
}

const initialState: LoginState = {
  authenticated: false,
  authorizationHeader: '',
};

export const loginSlice = createSlice({
  name: 'login',
  initialState,
  reducers: {
    login: (state, action: PayloadAction<string>) => {
      state.authorizationHeader = action.payload;
      state.authenticated = true;
    },
    logout: (state) => {
      state.authorizationHeader = '';
      state.authenticated = false;
    },
  },
});

export const { login, logout } = loginSlice.actions;

export const isAuthenticated = (state: RootState): boolean =>
  state.login.authenticated;
export const selectAuthorizationHeader = (state: RootState): string =>
  state.login.authorizationHeader;

export default loginSlice.reducer;
