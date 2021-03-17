import { randomString } from '../../lib/random';

export type Mailbox = {
  name: string;
  role: string;
  id: string;
};

export type Mail = {
  from: string;
  subject: string;
  content: string;
  unread: boolean;
  id: string;
};

export const emptyMailbox = (): Mailbox => {
  return {
    name: '(unknown)',
    role: '',
    id: randomString(32),
  };
};
