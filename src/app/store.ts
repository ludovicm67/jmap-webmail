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

// Rehydrate the store from localStorage so the user stays signed in across
// refreshes and browser restarts (the credentials persist until logout).
const loadState = (): RootState | undefined => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
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
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ login, mail }));
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
