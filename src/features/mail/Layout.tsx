import { JSX } from 'react';
import { useParams } from 'react-router';
import { cn } from '@/lib/utils';
import MailContent from './content/Mail';
import MailEmpty from './content/Empty';
import MailList from './list/List';
import Mailboxes from './mailboxes/List';

function Layout(): JSX.Element {
  const routeParams = useParams<{ mailboxId?: string; mailId?: string }>();

  // On mobile only a single pane is visible at a time; on desktop (md+) the
  // three panes sit side by side.
  let showMailboxes = true;
  let showList = false;
  let showContent = false;

  if (routeParams.mailboxId) {
    if (routeParams.mailId) {
      showMailboxes = false;
      showList = false;
      showContent = true;
    } else {
      showMailboxes = false;
      showList = true;
      showContent = false;
    }
  }

  return (
    <div className="flex h-full w-full flex-row overflow-hidden">
      <aside
        className={cn(
          'bg-sidebar w-full shrink-0 flex-col border-r md:flex md:w-64',
          showMailboxes ? 'flex' : 'hidden',
        )}
      >
        <Mailboxes />
      </aside>
      <section
        className={cn(
          'w-full shrink-0 flex-col border-r md:flex md:w-80',
          showList ? 'flex' : 'hidden',
        )}
      >
        <MailList />
      </section>
      <main
        className={cn(
          'w-full flex-1 flex-col md:flex',
          showContent ? 'flex' : 'hidden',
        )}
      >
        {routeParams.mailboxId && routeParams.mailId ? (
          <MailContent mailId={routeParams.mailId} />
        ) : (
          <MailEmpty />
        )}
      </main>
    </div>
  );
}

export default Layout;
