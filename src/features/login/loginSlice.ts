import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { RootState } from '../../app/store';

interface LoginState {
  authenticated: boolean;
  authorizationHeader: string;
  identifier: string;
  apiUrl: string;
  downloadUrl: string;
  accountId: string;
  endpoint: string;
  canSubmit: boolean;
  webSocketUrl: string;
}

type LoginPayload = {
  authorizationHeader: string;
  identifier: string;
  apiUrl: string;
  downloadUrl: string;
  accountId: string;
  endpoint: string;
  canSubmit: boolean;
  webSocketUrl: string;
};

const initialState: LoginState = {
  authenticated: false,
  authorizationHeader: '',
  identifier: '',
  apiUrl: '',
  downloadUrl: '',
  accountId: '',
  endpoint: '',
  canSubmit: false,
  webSocketUrl: '',
};

export const loginSlice = createSlice({
  name: 'login',
  initialState,
  reducers: {
    login: (state, action: PayloadAction<LoginPayload>) => {
      state.authenticated = true;
      state.authorizationHeader = action.payload.authorizationHeader;
      state.identifier = action.payload.identifier;
      state.apiUrl = action.payload.apiUrl;
      state.downloadUrl = action.payload.downloadUrl;
      state.accountId = action.payload.accountId;
      state.endpoint = action.payload.endpoint;
      state.canSubmit = action.payload.canSubmit;
      state.webSocketUrl = action.payload.webSocketUrl;
    },
    logout: (state) => {
      state.authenticated = false;
      state.authorizationHeader = '';
      state.identifier = '';
      state.apiUrl = '';
      state.downloadUrl = '';
      state.accountId = '';
      state.endpoint = '';
      state.canSubmit = false;
      state.webSocketUrl = '';
    },
  },
});

export const { login, logout } = loginSlice.actions;

export const isAuthenticated = (state: RootState): boolean =>
  state.login.authenticated;
export const selectAuthorizationHeader = (state: RootState): string =>
  state.login.authorizationHeader;
export const selectIdentifier = (state: RootState): string =>
  state.login.identifier;
export const selectCanSubmit = (state: RootState): boolean =>
  state.login.canSubmit;

// Return the slice directly (stable reference) rather than building a new
// object each call, which would cause needless re-renders.
export const getLoginPayload = (state: RootState): LoginState => state.login;

export default loginSlice.reducer;
