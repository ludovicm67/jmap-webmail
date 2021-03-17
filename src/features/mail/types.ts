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
