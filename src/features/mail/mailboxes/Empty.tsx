import { JSX } from 'react';
import { FolderX } from 'lucide-react';

function Empty(): JSX.Element {
  return (
    <div className="text-muted-foreground flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
      <FolderX className="h-10 w-10" />
      <div className="font-medium">You do not have any mailboxes</div>
    </div>
  );
}

export default Empty;
