import { JSX, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { ChevronLeft, RefreshCw } from 'lucide-react';
import { Link, useParams } from 'react-router';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { fetchMails } from '../../../lib/jmap';
import { getLoginPayload } from '../../login/loginSlice';
import { selectMailboxes, selectMails, setList } from '../mailSlice';
import { newMailbox } from '../types';
import {
  FEATURE_URL,
  formatReceivedAt,
  getFromMail,
  getMailboxName,
  isUnreadMail,
} from '../utils';
import Empty from './Empty';

function List(): JSX.Element {
  const dispatch = useDispatch();
  const routeParams = useParams<{ mailboxId?: string; mailId?: string }>();
  const { apiUrl, accountId, authorizationHeader } =
    useSelector(getLoginPayload);
  const [refreshing, setRefreshing] = useState(false);
  let mailboxId = routeParams.mailboxId;

  const mailboxes = useSelector(selectMailboxes);
  const mailListAll = useSelector(selectMails);

  if (!mailboxId) {
    const inboxMailbox = mailboxes.filter(
      (mailbox) => mailbox.role === 'inbox',
    );
    if (inboxMailbox.length > 0) {
      mailboxId = inboxMailbox[0].id;
    }
  }

  const currentMailboxes = mailboxes.filter(
    (mailbox) => mailbox.id === mailboxId,
  );

  const currentMailbox =
    currentMailboxes.length > 0 ? currentMailboxes[0] : newMailbox();

  const mailList = mailListAll.filter((mail) => {
    if (
      mail.mailboxIds &&
      Object.prototype.hasOwnProperty.call(mail.mailboxIds, currentMailbox.id)
    ) {
      return mail.mailboxIds[currentMailbox.id];
    }

    return false;
  });

  const mailId = routeParams.mailId || '';

  const refresh = async () => {
    if (refreshing || !apiUrl || !accountId) {
      return;
    }
    setRefreshing(true);
    const request = await fetchMails(apiUrl, accountId, {
      Authorization: authorizationHeader,
    });
    if (request.success) {
      dispatch(setList(request.data));
    }
    setRefreshing(false);
  };

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex items-center gap-2 border-b px-3 py-2">
        <Button asChild variant="ghost" size="icon" className="md:hidden">
          <Link to={FEATURE_URL} aria-label="Back to mailboxes">
            <ChevronLeft className="h-4 w-4" />
          </Link>
        </Button>
        <span className="flex-1 truncate font-semibold">
          {getMailboxName(currentMailbox)}
        </span>
        <Button
          variant="ghost"
          size="icon"
          onClick={refresh}
          disabled={refreshing}
          aria-label="Refresh"
        >
          <RefreshCw className={cn('h-4 w-4', refreshing && 'animate-spin')} />
        </Button>
      </div>
      <div className="flex flex-1 flex-col overflow-auto">
        {mailList.length === 0 ? (
          <Empty />
        ) : (
          mailList.map((mail) => {
            const unread = isUnreadMail(mail);
            const selected = mail.id === mailId;
            return (
              <Link to={`${FEATURE_URL}${mailboxId}/${mail.id}`} key={mail.id}>
                <div
                  className={cn(
                    'flex flex-col gap-0.5 border-b border-l-2 border-l-transparent px-3 py-2 select-none',
                    selected
                      ? 'bg-primary/10 border-l-primary'
                      : 'hover:bg-accent/50',
                  )}
                >
                  <div className="flex items-center gap-2">
                    {unread && (
                      <span className="bg-primary h-2 w-2 shrink-0 rounded-full" />
                    )}
                    <span
                      className={cn(
                        'flex-1 truncate text-sm',
                        unread && 'font-semibold',
                      )}
                    >
                      {getFromMail(mail)}
                    </span>
                    <span className="text-muted-foreground shrink-0 text-xs">
                      {formatReceivedAt(mail.receivedAt)}
                    </span>
                  </div>
                  <span
                    className={cn('truncate text-sm', unread && 'font-medium')}
                  >
                    {mail.subject}
                  </span>
                  <span className="text-muted-foreground truncate text-xs">
                    {mail.preview}
                  </span>
                </div>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}

export default List;
