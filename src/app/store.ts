import { configureStore, ThunkAction, Action } from '@reduxjs/toolkit';
import counterReducer from '../features/counter/counterSlice';
import mailReducer from '../features/mail/mailSlice';
import loginReducer from '../features/login/loginSlice';

export const store = configureStore({
  reducer: {
    counter: counterReducer,
    mail: mailReducer,
    login: loginReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppThunk<ReturnType = void> = ThunkAction<
  ReturnType,
  RootState,
  unknown,
  Action<string>
>;
