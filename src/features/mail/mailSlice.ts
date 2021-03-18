import { createSlice } from '@reduxjs/toolkit';
import { RootState } from '../../app/store';
import { Mailbox, Mail, newMailbox, newMail } from './types';

interface MailState {
  mailboxes: Mailbox[];
  list: Mail[];
}

const initialState: MailState = {
  mailboxes: [
    newMailbox('INBOX', 'inbox', '00000000-0000-0000-0000-000000000001', 1),
    newMailbox('Drafts', 'drafts', '00000000-0000-0000-0000-000000000002'),
    newMailbox('Sent Messages', 'sent', '00000000-0000-0000-0000-000000000003'),
    newMailbox('Junk', 'junk', '00000000-0000-0000-0000-000000000004'),
    newMailbox(
      'Deleted Messages',
      'trash',
      '00000000-0000-0000-0000-000000000005',
    ),
    newMailbox('Archive', 'archive'),
    newMailbox('Notes'),
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
  reducers: {},
});

export const selectMailboxes = (state: RootState): Mailbox[] =>
  state.mail.mailboxes;

export const selectMails = (state: RootState): Mail[] => state.mail.list;

export default mailSlice.reducer;
