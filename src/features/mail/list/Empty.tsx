import { JSX } from 'react';
import { Inbox } from 'lucide-react';

function Empty(): JSX.Element {
  return (
    <div className="text-muted-foreground flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
      <Inbox className="h-10 w-10" />
      <div className="font-medium">Mailbox is empty</div>
    </div>
  );
}

export default Empty;
