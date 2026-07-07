import { JSX } from 'react';
import { useSelector } from 'react-redux';
import { Link, useParams } from 'react-router';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { selectMailboxes } from '../mailSlice';
import { getMailboxIcon, getMailboxIconColor, getMailboxName } from '../utils';
import Empty from './Empty';

function List(): JSX.Element {
  const mailboxes = useSelector(selectMailboxes);

  const routeParams = useParams<{ mailboxId?: string; mailId?: string }>();
  let mailboxId = routeParams.mailboxId || 'inbox';
  if (mailboxId === 'inbox') {
    mailboxId = mailboxes.length > 0 ? mailboxes[0].id : '';
  }

  if (mailboxes.length === 0) {
    return <Empty />;
  }

  return (
    <div className="flex flex-1 flex-col overflow-auto p-2">
      <div className="text-muted-foreground px-2 py-1 text-xs font-medium tracking-wide uppercase">
        Mailboxes
      </div>
      {mailboxes.map((mailbox) => {
        const Icon = getMailboxIcon(mailbox);
        const selected = mailbox.id === mailboxId;
        return (
          <Link to={`/mail/${mailbox.id}`} key={mailbox.id}>
            <div
              className={cn(
                'flex items-center gap-3 rounded-md border-l-2 border-l-transparent px-3 py-2 text-sm select-none',
                selected
                  ? 'bg-primary/10 border-l-primary text-primary font-medium'
                  : 'hover:bg-accent/50',
              )}
            >
              <Icon
                className={cn('h-4 w-4 shrink-0', getMailboxIconColor(mailbox))}
              />
              <span className="flex-1 truncate">{getMailboxName(mailbox)}</span>
              {mailbox.unreadEmails > 0 && (
                <Badge className="rounded-full">{mailbox.unreadEmails}</Badge>
              )}
            </div>
          </Link>
        );
      })}
    </div>
  );
}

export default List;
