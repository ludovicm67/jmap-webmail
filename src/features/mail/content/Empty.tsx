import { JSX } from 'react';
import { MailOpen } from 'lucide-react';

function Empty(): JSX.Element {
  return (
    <div className="text-muted-foreground flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
      <MailOpen className="h-10 w-10" />
      <div className="font-medium">No message selected</div>
      <p className="text-sm">Select a message to read it here.</p>
    </div>
  );
}

export default Empty;
