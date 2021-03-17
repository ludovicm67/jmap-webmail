import { useRouteMatch } from 'react-router-dom';

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
