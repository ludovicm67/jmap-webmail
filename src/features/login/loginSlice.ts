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
}

type LoginPayload = {
  authorizationHeader: string;
  identifier: string;
  apiUrl: string;
  downloadUrl: string;
  accountId: string;
  endpoint: string;
  canSubmit: boolean;
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

export const getLoginPayload = (state: RootState): LoginPayload => ({
  authorizationHeader: state.login.authorizationHeader,
  identifier: state.login.identifier,
  apiUrl: state.login.apiUrl,
  downloadUrl: state.login.downloadUrl,
  accountId: state.login.accountId,
  endpoint: state.login.endpoint,
  canSubmit: state.login.canSubmit,
});

export default loginSlice.reducer;
