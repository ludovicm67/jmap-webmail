import { useRouteMatch } from 'react-router-dom';
import { Mailbox } from './types';

type RouteMatch = {
  mailboxId: string;
  mailId: string;
};

export const FEATURE_URL = '/mail/';

export const getRouteParams = (): RouteMatch => {
  const matchMailbox = useRouteMatch<RouteMatch>(`${FEATURE_URL}:mailboxId`);
  const matchMail = useRouteMatch<RouteMatch>(
    `${FEATURE_URL}:mailboxId/:mailId`,
  );

  const mailboxId = matchMailbox?.params.mailboxId || '';
  const mailId = matchMail?.params.mailId || '';

  return {
    mailboxId,
    mailId,
  };
};

export const getMailboxName = (mailbox: Mailbox): string => {
  switch (mailbox.role) {
    case 'inbox':
      return 'Inbox';
    case 'drafts':
      return 'Drafts';
    case 'sent':
      return 'Sent Messages';
    case 'junk':
      return 'Junk';
    case 'trash':
      return 'Deleted Messages';
    case 'archive':
      return 'Archive';
  }

  return mailbox.name;
};

export const getMailboxIcon = (mailbox: Mailbox): string => {
  switch (mailbox.role) {
    case 'inbox':
      return 'fas fa-inbox';
    case 'drafts':
      return 'fas fa-pencil-alt';
    case 'sent':
      return 'fas fa-paper-plane';
    case 'junk':
      return 'far fa-times-circle';
    case 'trash':
      return 'fas fa-trash-alt';
    case 'archive':
      return 'fas fa-archive';
  }

  return 'far fa-folder';
};
