import { useDispatch, useSelector } from 'react-redux';
import { ChevronDown, UserRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  selectActiveIdentity,
  selectIdentities,
  setActiveIdentity,
} from '../features/login/loginSlice';

// Choose which identity new mail is sent from by default.
export function IdentitySwitcher() {
  const dispatch = useDispatch();
  const identities = useSelector(selectIdentities);
  const active = useSelector(selectActiveIdentity);

  if (identities.length < 2) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="gap-1 text-white hover:bg-white/15 hover:text-white"
        >
          <UserRound className="h-4 w-4" />
          <span className="hidden max-w-[10rem] truncate sm:inline">
            {active?.name || active?.email || 'Identity'}
          </span>
          <ChevronDown className="h-3 w-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Send mail as</DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={active?.id}
          onValueChange={(value) => dispatch(setActiveIdentity(value))}
        >
          {identities.map((identity) => (
            <DropdownMenuRadioItem key={identity.id} value={identity.id}>
              {identity.name
                ? `${identity.name} <${identity.email}>`
                : identity.email}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
