import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { RootState } from '../../app/store';
import { Mailbox, Mail, newMailbox } from './types';

interface MailState {
  mailboxes: Mailbox[];
  list: Mail[];
}

const initialState: MailState = {
  mailboxes: [
    newMailbox('INBOX', 'inbox', '00000000-0000-0000-0000-000000000001', 1),
  ],
  list: [],
};

export const mailSlice = createSlice({
  name: 'mail',
  initialState,
  reducers: {
    setMailboxes: (state, action: PayloadAction<Mailbox[]>) => {
      state.mailboxes = action.payload;
    },
    setList: (state, action: PayloadAction<Mail[]>) => {
      state.list = action.payload;
    },
  },
});

export const { setMailboxes, setList } = mailSlice.actions;

export const selectMailboxes = (state: RootState): Mailbox[] =>
  state.mail.mailboxes;

export const selectMails = (state: RootState): Mail[] => state.mail.list;

export default mailSlice.reducer;
