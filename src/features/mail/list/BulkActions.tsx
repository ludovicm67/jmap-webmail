import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  FolderInput,
  MailOpen,
  Mail as MailClosed,
  Trash2,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  destroyEmails,
  fetchMailboxes,
  moveEmails,
  setEmailsKeyword,
} from '../../../lib/jmap';
import { getLoginPayload } from '../../login/loginSlice';
import {
  removeMailsFromView,
  selectMailboxes,
  setMailboxes,
  setMailsSeen,
} from '../mailSlice';
import { Mailbox } from '../types';
import { getMailboxIcon, getMailboxIconColor, getMailboxName } from '../utils';
import { findMailboxByRole } from '../compose/utils';

type BulkActionsProps = {
  ids: string[];
  currentMailbox: Mailbox;
  onDone: () => void;
};

function BulkActions({ ids, currentMailbox, onDone }: BulkActionsProps) {
  const dispatch = useDispatch();
  const login = useSelector(getLoginPayload);
  const mailboxes = useSelector(selectMailboxes);
  const [busy, setBusy] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const auth = { Authorization: login.authorizationHeader };
  const inTrash = currentMailbox.role === 'trash';
  const trash = findMailboxByRole(mailboxes, 'trash');
  const otherMailboxes = mailboxes.filter((m) => m.id !== currentMailbox.id);

  const reconcileMailboxes = async () => {
    const request = await fetchMailboxes(
      login.apiUrl,
      login.activeAccountId,
      auth,
    );
    if (request.success) {
      dispatch(setMailboxes(request.data));
    }
  };

  const markSeen = async (seen: boolean) => {
    if (busy) {
      return;
    }
    setBusy(true);
    dispatch(setMailsSeen({ ids, seen }));
    await setEmailsKeyword(
      login.apiUrl,
      login.activeAccountId,
      ids,
      '$seen',
      seen,
      auth,
    );
    setBusy(false);
    onDone();
  };

  const move = async (targetMailboxId: string) => {
    if (busy) {
      return;
    }
    setBusy(true);
    const request = await moveEmails(
      login.apiUrl,
      login.activeAccountId,
      ids,
      targetMailboxId,
      auth,
    );
    if (request.success) {
      dispatch(removeMailsFromView({ ids }));
      await reconcileMailboxes();
    }
    setBusy(false);
    onDone();
  };

  const onDelete = async () => {
    if (busy) {
      return;
    }
    // Permanent when already in Trash (or no Trash exists); otherwise soft-delete.
    if (inTrash || !trash) {
      setConfirmOpen(true);
      return;
    }
    await move(trash.id);
  };

  const confirmDestroy = async () => {
    setConfirmOpen(false);
    setBusy(true);
    const request = await destroyEmails(
      login.apiUrl,
      login.activeAccountId,
      ids,
      auth,
    );
    if (request.success) {
      dispatch(removeMailsFromView({ ids }));
      await reconcileMailboxes();
    }
    setBusy(false);
    onDone();
  };

  return (
    <div className="flex items-center gap-1 border-b px-2 py-2">
      <Button
        variant="ghost"
        size="icon"
        onClick={onDone}
        aria-label="Clear selection"
      >
        <X className="h-4 w-4" />
      </Button>
      <span className="text-sm font-medium">{ids.length} selected</span>
      <div className="flex-1" />

      <Button
        variant="ghost"
        size="icon"
        disabled={busy}
        onClick={() => markSeen(true)}
        aria-label="Mark as read"
        title="Mark as read"
      >
        <MailOpen className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        disabled={busy}
        onClick={() => markSeen(false)}
        aria-label="Mark as unread"
        title="Mark as unread"
      >
        <MailClosed className="h-4 w-4" />
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            disabled={busy || otherMailboxes.length === 0}
            aria-label="Move to"
            title="Move to…"
          >
            <FolderInput className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Move to…</DropdownMenuLabel>
          {otherMailboxes.map((mailbox) => {
            const Icon = getMailboxIcon(mailbox);
            return (
              <DropdownMenuItem
                key={mailbox.id}
                onClick={() => move(mailbox.id)}
              >
                <Icon className={getMailboxIconColor(mailbox)} />
                {getMailboxName(mailbox)}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>

      <Button
        variant="ghost"
        size="icon"
        disabled={busy}
        onClick={onDelete}
        aria-label="Delete"
        title={inTrash || !trash ? 'Delete permanently' : 'Move to Trash'}
      >
        <Trash2 className="h-4 w-4" />
      </Button>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Permanently delete {ids.length} message
              {ids.length > 1 ? 's' : ''}?
            </DialogTitle>
            <DialogDescription>This action cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDestroy}>
              Delete permanently
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default BulkActions;
