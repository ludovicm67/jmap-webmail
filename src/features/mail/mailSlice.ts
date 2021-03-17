import { createSlice } from '@reduxjs/toolkit';
import { RootState } from '../../app/store';
import { Mailbox, Mail } from './types';

interface MailState {
  mailboxes: Mailbox[];
  list: Mail[];
}

const initialState: MailState = {
  mailboxes: [
    {
      name: 'INBOX',
      role: 'inbox',
      id: '00000000-0000-0000-0000-000000000001',
    },
    {
      name: 'Drafts',
      role: 'drafts',
      id: '00000000-0000-0000-0000-000000000002',
    },
    {
      name: 'Sent Messages',
      role: 'sent',
      id: '00000000-0000-0000-0000-000000000003',
    },
    { name: 'Junk', role: 'junk', id: '00000000-0000-0000-0000-000000000004' },
    {
      name: 'Deleted Messages',
      role: 'trash',
      id: '00000000-0000-0000-0000-000000000005',
    },
    {
      name: 'Archive',
      role: 'archive',
      id: '00000000-0000-0000-0000-000000000006',
    },
    { name: 'Notes', role: '', id: '00000000-0000-0000-0000-000000000007' },
  ],
  list: [
    {
      from: 'John Doe',
      subject: 'Test2',
      content: 'Is it also working?',
      unread: true,
      id: '00000000-0000-0000-0000-000000000001',
    },
    {
      from: 'John Doe',
      subject: 'Test',
      content: 'Is it working?',
      unread: false,
      id: '00000000-0000-0000-0000-000000000002',
    },
    {
      from: 'John Doe',
      subject: 'First Test',
      content: 'Is it working now?',
      unread: false,
      id: '00000000-0000-0000-0000-000000000003',
    },
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
