import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { RootState } from '../../app/store';

interface LoginState {
  authenticated: boolean;
  authorizationHeader: string;
  identifier: string;
}

type LoginPayload = {
  authorizationHeader: string;
  identifier: string;
};

const initialState: LoginState = {
  authenticated: false,
  authorizationHeader: '',
  identifier: '',
};

export const loginSlice = createSlice({
  name: 'login',
  initialState,
  reducers: {
    login: (state, action: PayloadAction<LoginPayload>) => {
      state.authenticated = true;
      state.authorizationHeader = action.payload.authorizationHeader;
      state.identifier = action.payload.identifier;
    },
    logout: (state) => {
      state.authenticated = false;
      state.authorizationHeader = '';
      state.identifier = '';
    },
  },
});

export const { login, logout } = loginSlice.actions;

export const isAuthenticated = (state: RootState): boolean =>
  state.login.authenticated;
export const selectAuthorizationHeader = (state: RootState): string =>
  state.login.authorizationHeader;

export default loginSlice.reducer;
