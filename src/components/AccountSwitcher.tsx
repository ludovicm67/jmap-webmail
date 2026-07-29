import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router';
import { ChevronDown, Inbox } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { fetchMailboxes, fetchMails } from '../lib/jmap';
import {
  getLoginPayload,
  selectAccounts,
  selectActiveAccountId,
  setActiveAccount,
} from '../features/login/loginSlice';
import { setList, setMailboxes } from '../features/mail/mailSlice';
import { FEATURE_URL } from '../features/mail/utils';

// Switch which mailbox (JMAP account) is shown, when the session grants access
// to more than one (e.g. a shared/delegated mailbox).
export function AccountSwitcher() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const accounts = useSelector(selectAccounts);
  const activeId = useSelector(selectActiveAccountId);
  const { apiUrl, authorizationHeader } = useSelector(getLoginPayload);

  if (accounts.length < 2) {
    return null;
  }

  const active = accounts.find((a) => a.id === activeId);

  const switchTo = async (id: string) => {
    if (id === activeId) {
      return;
    }
    dispatch(setActiveAccount(id));
    navigate(FEATURE_URL);
    const headers = { Authorization: authorizationHeader };
    const [mailboxes, mails] = await Promise.all([
      fetchMailboxes(apiUrl, id, headers),
      fetchMails(apiUrl, id, headers),
    ]);
    if (mailboxes.success) {
      dispatch(setMailboxes(mailboxes.data));
    }
    if (mails.success) {
      dispatch(setList(mails.data));
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="gap-1 text-white hover:bg-white/15 hover:text-white"
        >
          <Inbox className="h-4 w-4" />
          <span className="hidden max-w-[10rem] truncate sm:inline">
            {active?.name || 'Mailbox'}
          </span>
          <ChevronDown className="h-3 w-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Mailbox</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={activeId} onValueChange={switchTo}>
          {accounts.map((account) => (
            <DropdownMenuRadioItem key={account.id} value={account.id}>
              {account.name}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
