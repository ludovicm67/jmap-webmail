import {
  configureStore,
  combineReducers,
  ThunkAction,
  Action,
} from '@reduxjs/toolkit';
import mailReducer from '../features/mail/mailSlice';
import loginReducer from '../features/login/loginSlice';

const rootReducer = combineReducers({
  mail: mailReducer,
  login: loginReducer,
});

export type RootState = ReturnType<typeof rootReducer>;

const STORAGE_KEY = 'jmap-webmail-state';

// Rehydrate the store from sessionStorage so a page refresh keeps the user
// signed in (and their mailboxes/list around) instead of bouncing to login.
// sessionStorage (rather than localStorage) means the credentials are cleared
// when the tab is closed, limiting how long the Basic-auth header lingers.
const loadState = (): RootState | undefined => {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as RootState) : undefined;
  } catch {
    return undefined;
  }
};

export const store = configureStore({
  reducer: rootReducer,
  preloadedState: loadState(),
});

// Persist the relevant slices on every change. Logout clears the credentials
// in state, which then gets written here too, so it doubles as a sign-out.
store.subscribe(() => {
  try {
    const { login, mail } = store.getState();
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ login, mail }));
  } catch {
    // Ignore quota / serialization errors — persistence is best-effort.
  }
});

export type AppThunk<ReturnType = void> = ThunkAction<
  ReturnType,
  RootState,
  unknown,
  Action<string>
>;
