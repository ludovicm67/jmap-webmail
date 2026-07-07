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
    setMailSeen: (
      state,
      action: PayloadAction<{ mailId: string; seen: boolean }>,
    ) => {
      const { mailId, seen } = action.payload;
      const mail = state.list.find((m) => m.id === mailId);
      if (!mail) {
        return;
      }

      const wasSeen = mail.keywords?.$seen === true;
      if (wasSeen === seen) {
        return;
      }

      mail.keywords = { ...mail.keywords, $seen: seen };

      // Keep the mailbox unread counters in sync with the change.
      const delta = seen ? -1 : 1;
      state.mailboxes = state.mailboxes.map((mailbox) => {
        if (mail.mailboxIds?.[mailbox.id]) {
          return {
            ...mailbox,
            unreadEmails: Math.max(0, (mailbox.unreadEmails || 0) + delta),
          };
        }
        return mailbox;
      });
    },
  },
});

export const { setMailboxes, setList, setMailSeen } = mailSlice.actions;

export const selectMailboxes = (state: RootState): Mailbox[] =>
  state.mail.mailboxes;

export const selectMails = (state: RootState): Mail[] => state.mail.list;

export default mailSlice.reducer;
