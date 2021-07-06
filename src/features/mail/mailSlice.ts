import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { RootState } from '../../app/store';
import { Mailbox, Mail, newMailbox, newMail } from './types';

interface MailState {
  mailboxes: Mailbox[];
  list: Mail[];
}

const initialState: MailState = {
  mailboxes: [
    newMailbox('INBOX', 'inbox', '00000000-0000-0000-0000-000000000001', 1),
  ],
  list: [
    newMail('00000000-0000-0000-0000-000000000001'),
    newMail(
      '00000000-0000-0000-0000-000000000001',
      'Hello world!',
      'How are you?',
      false,
    ),
    newMail('00000000-0000-0000-0000-000000000001'),
    newMail('00000000-0000-0000-0000-000000000001'),
    newMail('00000000-0000-0000-0000-000000000001'),
    newMail('00000000-0000-0000-0000-000000000002'),
    newMail('00000000-0000-0000-0000-000000000002'),
    newMail('00000000-0000-0000-0000-000000000003'),
    newMail('00000000-0000-0000-0000-000000000003'),
    newMail('00000000-0000-0000-0000-000000000003'),
    newMail('00000000-0000-0000-0000-000000000003'),
    newMail('00000000-0000-0000-0000-000000000003'),
    newMail('00000000-0000-0000-0000-000000000004'),
    newMail('00000000-0000-0000-0000-000000000005'),
    newMail('00000000-0000-0000-0000-000000000005'),
    newMail('00000000-0000-0000-0000-000000000005'),
    newMail('00000000-0000-0000-0000-000000000005'),
    newMail('00000000-0000-0000-0000-000000000005'),
    newMail('00000000-0000-0000-0000-000000000005'),
    newMail('00000000-0000-0000-0000-000000000005'),
    newMail('00000000-0000-0000-0000-000000000005'),
    newMail('00000000-0000-0000-0000-000000000005'),
    newMail('00000000-0000-0000-0000-000000000005'),
    newMail('00000000-0000-0000-0000-000000000005'),
    newMail('00000000-0000-0000-0000-000000000005'),
    newMail('00000000-0000-0000-0000-000000000005'),
    newMail('00000000-0000-0000-0000-000000000005'),
    newMail('00000000-0000-0000-0000-000000000005'),
    newMail('00000000-0000-0000-0000-000000000005'),
    newMail('00000000-0000-0000-0000-000000000005'),
    newMail('00000000-0000-0000-0000-000000000005'),
    newMail('00000000-0000-0000-0000-000000000005'),
    newMail('00000000-0000-0000-0000-000000000005'),
    newMail('00000000-0000-0000-0000-000000000005'),
    newMail('00000000-0000-0000-0000-000000000005'),
    newMail('00000000-0000-0000-0000-000000000005'),
  ],
};

export const mailSlice = createSlice({
  name: 'mail',
  initialState,
  reducers: {
    setMailboxes: (state, action: PayloadAction<Mailbox[]>) => {
      state.mailboxes = action.payload;
    },
  },
});

export const { setMailboxes } = mailSlice.actions;

export const selectMailboxes = (state: RootState): Mailbox[] =>
  state.mail.mailboxes;

export const selectMails = (state: RootState): Mail[] => state.mail.list;

export default mailSlice.reducer;
