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
      applySeen(state, [action.payload.mailId], action.payload.seen);
    },
    setMailsSeen: (
      state,
      action: PayloadAction<{ ids: string[]; seen: boolean }>,
    ) => {
      applySeen(state, action.payload.ids, action.payload.seen);
    },
    // Drop moved/deleted mails from the current view immediately.
    removeMailsFromView: (state, action: PayloadAction<{ ids: string[] }>) => {
      const ids = new Set(action.payload.ids);
      state.list = state.list.filter((mail) => !ids.has(mail.id));
    },
  },
});

// Mark the given mails read/unread and keep the mailbox unread counters in sync.
const applySeen = (state: MailState, ids: string[], seen: boolean) => {
  const idSet = new Set(ids);
  const delta = seen ? -1 : 1;
  const counts: Record<string, number> = {};

  state.list.forEach((mail) => {
    if (!idSet.has(mail.id)) {
      return;
    }
    const wasSeen = mail.keywords?.$seen === true;
    if (wasSeen === seen) {
      return;
    }
    mail.keywords = { ...mail.keywords, $seen: seen };
    Object.keys(mail.mailboxIds || {}).forEach((mailboxId) => {
      if (mail.mailboxIds[mailboxId]) {
        counts[mailboxId] = (counts[mailboxId] || 0) + delta;
      }
    });
  });

  state.mailboxes = state.mailboxes.map((mailbox) => {
    const change = counts[mailbox.id];
    if (!change) {
      return mailbox;
    }
    return {
      ...mailbox,
      unreadEmails: Math.max(0, (mailbox.unreadEmails || 0) + change),
    };
  });
};

export const {
  setMailboxes,
  setList,
  setMailSeen,
  setMailsSeen,
  removeMailsFromView,
} = mailSlice.actions;

export const selectMailboxes = (state: RootState): Mailbox[] =>
  state.mail.mailboxes;

export const selectMails = (state: RootState): Mail[] => state.mail.list;

export default mailSlice.reducer;
