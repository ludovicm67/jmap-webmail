import React from 'react';
import { Link, Navigate, Route, Routes, useLocation } from 'react-router';
import { useDispatch, useSelector } from 'react-redux';
import {
  CalendarDays,
  CircleUser,
  Filter,
  FolderOpen,
  Inbox,
  LogOut,
  Mail,
  Settings as SettingsIcon,
  Users,
} from 'lucide-react';
import MailLayout from './features/mail/Layout';
import ContactsLayout from './features/contacts/Layout';
import CalendarLayout from './features/calendar/Layout';
import FilesLayout from './features/files/Layout';
import FiltersLayout from './features/filters/Layout';
import SettingsLayout from './features/settings/Layout';
import LoginLayout from './features/login/Layout';
import { FEATURE_URL as MailUrl } from './features/mail/utils';
import { CONTACTS_URL } from './features/contacts/utils';
import { CALENDAR_URL } from './features/calendar/utils';
import { FILES_URL } from './features/files/utils';
import { FILTERS_URL } from './features/filters/utils';
import { SETTINGS_URL } from './features/settings/utils';
import { FEATURE_URL as LoginUrl } from './features/login/utils';
import { cn } from '@/lib/utils';
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
import { AccountSwitcher } from '@/components/AccountSwitcher';
import { IdentitySwitcher } from '@/components/IdentitySwitcher';
import { useJmapPush } from './features/mail/push/useJmapPush';
import {
  isAuthenticated,
  logout,
  selectCalendarsAccountId,
  selectContactsAccountId,
  selectFilesAccountId,
  selectHasSettings,
  selectIdentifier,
  selectSieveAccountId,
} from './features/login/loginSlice';

function SideNav(): React.JSX.Element {
  const location = useLocation();
  const hasContacts = useSelector(selectContactsAccountId);
  const hasCalendar = useSelector(selectCalendarsAccountId);
  const hasFiles = useSelector(selectFilesAccountId);
  const hasFilters = useSelector(selectSieveAccountId);
  const hasSettings = useSelector(selectHasSettings);

  const items = [
    { to: MailUrl, label: 'Mail', icon: Inbox, show: true },
    { to: CONTACTS_URL, label: 'Contacts', icon: Users, show: !!hasContacts },
    {
      to: CALENDAR_URL,
      label: 'Calendar',
      icon: CalendarDays,
      show: !!hasCalendar,
    },
    { to: FILES_URL, label: 'Files', icon: FolderOpen, show: !!hasFiles },
    { to: FILTERS_URL, label: 'Filters', icon: Filter, show: !!hasFilters },
    {
      to: SETTINGS_URL,
      label: 'Settings',
      icon: SettingsIcon,
      show: hasSettings,
    },
  ].filter((item) => item.show);

  return (
    <nav className="bg-sidebar flex w-16 shrink-0 flex-col items-stretch gap-1 border-r px-2 py-3">
      {items.map(({ to, label, icon: Icon }) => {
        const active = location.pathname.startsWith(to);
        return (
          <Link
            key={to}
            to={to}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'flex flex-col items-center gap-1 rounded-md px-1 py-2 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground',
              active &&
                'bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary',
            )}
          >
            <Icon className="h-5 w-5" />
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

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
  // Subscribe to JMAP push (no-op until authenticated / if unsupported).
  useJmapPush();

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <header className="flex h-14 shrink-0 items-center justify-between gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 px-4 text-white shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 font-semibold">
            <Mail className="h-5 w-5" />
            <span className="hidden md:inline">JMAP Webmail</span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {authenticated && <AccountSwitcher />}
          {authenticated && <IdentitySwitcher />}
          <ModeToggle />
          {authenticated && <AccountMenu />}
        </div>
      </header>
      <div className="flex flex-1 overflow-hidden">
        {authenticated && <SideNav />}
        <main className="min-w-0 flex-1 overflow-hidden">
          {authenticated ? (
            <Routes>
              {/* Mail subroutes */}
              <Route
                path={`${MailUrl}:mailboxId/:mailId`}
                element={<MailLayout />}
              />
              <Route path={`${MailUrl}:mailboxId`} element={<MailLayout />} />
              <Route path={MailUrl} element={<MailLayout />} />

              <Route path={CONTACTS_URL} element={<ContactsLayout />} />
              <Route path={CALENDAR_URL} element={<CalendarLayout />} />
              <Route path={FILES_URL} element={<FilesLayout />} />
              <Route path={FILTERS_URL} element={<FiltersLayout />} />
              <Route path={SETTINGS_URL} element={<SettingsLayout />} />

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
        </main>
      </div>
    </div>
  );
}

export default App;
