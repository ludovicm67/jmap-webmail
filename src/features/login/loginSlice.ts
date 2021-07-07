import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { RootState } from '../../app/store';

interface LoginState {
  authenticated: boolean;
  authorizationHeader: string;
  identifier: string;
  downloadUrl: string;
}

type LoginPayload = {
  authorizationHeader: string;
  identifier: string;
  downloadUrl: string;
};

const initialState: LoginState = {
  authenticated: false,
  authorizationHeader: '',
  identifier: '',
  downloadUrl: '',
};

export const loginSlice = createSlice({
  name: 'login',
  initialState,
  reducers: {
    login: (state, action: PayloadAction<LoginPayload>) => {
      state.authenticated = true;
      state.authorizationHeader = action.payload.authorizationHeader;
      state.identifier = action.payload.identifier;
      state.downloadUrl = action.payload.downloadUrl;
    },
    logout: (state) => {
      state.authenticated = false;
      state.authorizationHeader = '';
      state.identifier = '';
      state.downloadUrl = '';
    },
  },
});

export const { login, logout } = loginSlice.actions;

export const isAuthenticated = (state: RootState): boolean =>
  state.login.authenticated;
export const selectAuthorizationHeader = (state: RootState): string =>
  state.login.authorizationHeader;

export default loginSlice.reducer;
