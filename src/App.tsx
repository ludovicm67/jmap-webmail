import React from 'react';
import { Navigate, Route, Routes } from 'react-router';
import { useDispatch, useSelector } from 'react-redux';
import { CircleUser, LogOut, Mail } from 'lucide-react';
import MailLayout from './features/mail/Layout';
import LoginLayout from './features/login/Layout';
import { FEATURE_URL as MailUrl } from './features/mail/utils';
import { FEATURE_URL as LoginUrl } from './features/login/utils';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ModeToggle } from '@/components/mode-toggle';
import {
  isAuthenticated,
  logout,
  selectIdentifier,
} from './features/login/loginSlice';

function AccountMenu(): React.JSX.Element {
  const dispatch = useDispatch();
  const identifier = useSelector(selectIdentifier);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="text-white hover:bg-white/15 hover:text-white"
        >
          <CircleUser className="h-5 w-5" />
          <span className="sr-only">Account</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel className="max-w-[16rem] truncate">
          {identifier || 'Account'}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => dispatch(logout())}>
          <LogOut className="h-4 w-4" />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function App(): React.JSX.Element {
  const authenticated = useSelector(isAuthenticated);

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <header className="flex h-14 shrink-0 items-center justify-between bg-gradient-to-r from-emerald-600 to-teal-600 px-4 text-white shadow-sm">
        <div className="flex items-center gap-2 font-semibold">
          <Mail className="h-5 w-5" />
          <span>JMAP Webmail</span>
        </div>
        <div className="flex items-center gap-1">
          <ModeToggle />
          {authenticated && <AccountMenu />}
        </div>
      </header>
      <div className="flex flex-1 overflow-hidden">
        {authenticated ? (
          <Routes>
            {/* Mail subroutes */}
            <Route
              path={`${MailUrl}:mailboxId/:mailId`}
              element={<MailLayout />}
            />
            <Route path={`${MailUrl}:mailboxId`} element={<MailLayout />} />
            <Route path={MailUrl} element={<MailLayout />} />

            {/* Any attempt to hit login gets redirected back */}
            <Route
              path={LoginUrl}
              element={<Navigate to={MailUrl} replace />}
            />

            {/* Catch-all */}
            <Route path="/*" element={<Navigate to={MailUrl} replace />} />
          </Routes>
        ) : (
          <Routes>
            {/* Only login route allowed */}
            <Route path={LoginUrl} element={<LoginLayout />} />

            {/* Anything else goes to login */}
            <Route path="/*" element={<Navigate to={LoginUrl} replace />} />
          </Routes>
        )}
      </div>
    </div>
  );
}

export default App;
