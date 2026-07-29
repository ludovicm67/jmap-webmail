import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { RootState } from '../../app/store';
import { JmapAccount } from '../../lib/jmap';
import { Identity } from '../mail/types';

interface LoginState {
  authenticated: boolean;
  authorizationHeader: string;
  identifier: string;
  apiUrl: string;
  downloadUrl: string;
  uploadUrl: string;
  accountId: string;
  endpoint: string;
  canSubmit: boolean;
  webSocketUrl: string;
  accounts: JmapAccount[];
  activeAccountId: string;
  contactsAccountId: string;
  calendarsAccountId: string;
  sieveAccountId: string;
  filesAccountId: string;
  vacationAccountId: string;
  quotaAccountId: string;
  vapidKey: string;
  hasContactsImport: boolean;
  hasCalendarsImport: boolean;
  hasAvailability: boolean;
  identities: Identity[];
  activeIdentityId: string;
}

type LoginPayload = {
  authorizationHeader: string;
  identifier: string;
  apiUrl: string;
  downloadUrl: string;
  uploadUrl: string;
  accountId: string;
  endpoint: string;
  canSubmit: boolean;
  webSocketUrl: string;
  accounts: JmapAccount[];
  contactsAccountId: string;
  calendarsAccountId: string;
  sieveAccountId: string;
  filesAccountId: string;
  vacationAccountId: string;
  quotaAccountId: string;
  vapidKey: string;
  hasContactsImport: boolean;
  hasCalendarsImport: boolean;
  hasAvailability: boolean;
  identities: Identity[];
};

const initialState: LoginState = {
  authenticated: false,
  authorizationHeader: '',
  identifier: '',
  apiUrl: '',
  downloadUrl: '',
  uploadUrl: '',
  accountId: '',
  endpoint: '',
  canSubmit: false,
  webSocketUrl: '',
  accounts: [],
  activeAccountId: '',
  contactsAccountId: '',
  calendarsAccountId: '',
  sieveAccountId: '',
  filesAccountId: '',
  vacationAccountId: '',
  quotaAccountId: '',
  vapidKey: '',
  hasContactsImport: false,
  hasCalendarsImport: false,
  hasAvailability: false,
  identities: [],
  activeIdentityId: '',
};

export const loginSlice = createSlice({
  name: 'login',
  initialState,
  reducers: {
    login: (state, action: PayloadAction<LoginPayload>) => {
      const p = action.payload;
      state.authenticated = true;
      state.authorizationHeader = p.authorizationHeader;
      state.identifier = p.identifier;
      state.apiUrl = p.apiUrl;
      state.downloadUrl = p.downloadUrl;
      state.uploadUrl = p.uploadUrl;
      state.accountId = p.accountId;
      state.endpoint = p.endpoint;
      state.canSubmit = p.canSubmit;
      state.webSocketUrl = p.webSocketUrl;
      state.accounts = p.accounts;
      state.activeAccountId = p.accountId;
      state.contactsAccountId = p.contactsAccountId;
      state.calendarsAccountId = p.calendarsAccountId;
      state.sieveAccountId = p.sieveAccountId;
      state.filesAccountId = p.filesAccountId;
      state.vacationAccountId = p.vacationAccountId;
      state.quotaAccountId = p.quotaAccountId;
      state.vapidKey = p.vapidKey;
      state.hasContactsImport = p.hasContactsImport;
      state.hasCalendarsImport = p.hasCalendarsImport;
      state.hasAvailability = p.hasAvailability;
      state.identities = p.identities;
      state.activeIdentityId = p.identities[0]?.id ?? '';
    },
    logout: () => initialState,
    setActiveAccount: (state, action: PayloadAction<string>) => {
      state.activeAccountId = action.payload;
    },
    setIdentities: (state, action: PayloadAction<Identity[]>) => {
      state.identities = action.payload;
      if (!action.payload.some((i) => i.id === state.activeIdentityId)) {
        state.activeIdentityId = action.payload[0]?.id ?? '';
      }
    },
    setActiveIdentity: (state, action: PayloadAction<string>) => {
      state.activeIdentityId = action.payload;
    },
  },
});

export const {
  login,
  logout,
  setActiveAccount,
  setIdentities,
  setActiveIdentity,
} = loginSlice.actions;

export const isAuthenticated = (state: RootState): boolean =>
  state.login.authenticated;
export const selectAuthorizationHeader = (state: RootState): string =>
  state.login.authorizationHeader;
export const selectIdentifier = (state: RootState): string =>
  state.login.identifier;
export const selectCanSubmit = (state: RootState): boolean =>
  state.login.canSubmit;
export const selectActiveAccountId = (state: RootState): string =>
  state.login.activeAccountId;
export const selectAccounts = (state: RootState): JmapAccount[] =>
  state.login.accounts;
export const selectContactsAccountId = (state: RootState): string =>
  state.login.contactsAccountId;
export const selectCalendarsAccountId = (state: RootState): string =>
  state.login.calendarsAccountId;
export const selectUploadUrl = (state: RootState): string =>
  state.login.uploadUrl;
export const selectDownloadUrl = (state: RootState): string =>
  state.login.downloadUrl;
export const selectSieveAccountId = (state: RootState): string =>
  state.login.sieveAccountId;
export const selectFilesAccountId = (state: RootState): string =>
  state.login.filesAccountId;
export const selectVacationAccountId = (state: RootState): string =>
  state.login.vacationAccountId;
export const selectQuotaAccountId = (state: RootState): string =>
  state.login.quotaAccountId;
export const selectVapidKey = (state: RootState): string =>
  state.login.vapidKey;
export const selectHasContactsImport = (state: RootState): boolean =>
  state.login.hasContactsImport;
export const selectHasCalendarsImport = (state: RootState): boolean =>
  state.login.hasCalendarsImport;
export const selectHasAvailability = (state: RootState): boolean =>
  state.login.hasAvailability;
// The Settings tool aggregates vacation-responder, quota and web-push, so it is
// shown whenever the server advertises at least one of them.
export const selectHasSettings = (state: RootState): boolean =>
  Boolean(
    state.login.vacationAccountId ||
    state.login.quotaAccountId ||
    state.login.vapidKey,
  );
export const selectIdentities = (state: RootState): Identity[] =>
  state.login.identities;
export const selectActiveIdentityId = (state: RootState): string =>
  state.login.activeIdentityId;
export const selectActiveIdentity = (state: RootState): Identity | undefined =>
  state.login.identities.find((i) => i.id === state.login.activeIdentityId);

// Return the slice directly (stable reference) rather than building a new
// object each call, which would cause needless re-renders.
export const getLoginPayload = (state: RootState): LoginState => state.login;

export default loginSlice.reducer;
