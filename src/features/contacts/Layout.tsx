import { JSX, useState } from 'react';
import { useSelector } from 'react-redux';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Building2,
  ChevronLeft,
  Mail as MailIcon,
  Pencil,
  Phone,
  Plus,
  Trash2,
  Users,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import ImportButton from '@/components/ImportButton';
import {
  contactEmails,
  contactName,
  contactOrganization,
  contactPhones,
  destroyContact,
  fetchAddressBooks,
  fetchContacts,
  importContacts,
} from '../../lib/jmapContacts';
import {
  getLoginPayload,
  selectContactsAccountId,
  selectHasContactsImport,
  selectUploadUrl,
} from '../login/loginSlice';
import ContactForm from './ContactForm';

function Layout(): JSX.Element {
  const { apiUrl, authorizationHeader } = useSelector(getLoginPayload);
  const accountId = useSelector(selectContactsAccountId);
  const uploadUrl = useSelector(selectUploadUrl);
  const canImport = useSelector(selectHasContactsImport);
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const booksQuery = useQuery({
    queryKey: ['addressBooks', accountId],
    queryFn: async () => {
      const r = await fetchAddressBooks(apiUrl, accountId, authorizationHeader);
      if (!r.success) throw new Error(r.message);
      return r.data;
    },
    enabled: !!accountId,
  });

  const contactsQuery = useQuery({
    queryKey: ['contacts', accountId],
    queryFn: async () => {
      const r = await fetchContacts(apiUrl, accountId, authorizationHeader);
      if (!r.success) throw new Error(r.message);
      return r.data;
    },
    enabled: !!accountId,
  });

  const contacts = [...(contactsQuery.data ?? [])].sort((a, b) =>
    contactName(a).localeCompare(contactName(b)),
  );
  const defaultBook =
    booksQuery.data?.find((b) => b.isDefault) ?? booksQuery.data?.[0];
  const selected = contacts.find((c) => c.id === selectedId);

  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: ['contacts', accountId] });

  const onDelete = async () => {
    if (!selected) return;
    setConfirmDelete(false);
    await destroyContact(apiUrl, accountId, selected.id, authorizationHeader);
    setSelectedId(null);
    refresh();
  };

  return (
    <div className="flex h-full w-full flex-row overflow-hidden">
      <aside
        className={cn(
          'bg-sidebar w-full shrink-0 flex-col border-r md:flex md:w-80',
          selected ? 'hidden md:flex' : 'flex',
        )}
      >
        <div className="flex items-center gap-2 border-b px-3 py-2">
          <span className="flex-1 font-semibold">Contacts</span>
          {canImport && defaultBook && uploadUrl && (
            <ImportButton
              accept=".vcf,text/vcard"
              label="Import"
              importer={(file) =>
                importContacts(
                  apiUrl,
                  accountId,
                  uploadUrl,
                  defaultBook.id,
                  file,
                  authorizationHeader,
                )
              }
              onImported={refresh}
            />
          )}
          {defaultBook && (
            <ContactForm
              addressBookId={defaultBook.id}
              onSaved={refresh}
              trigger={
                <Button size="sm">
                  <Plus className="h-4 w-4" />
                  New
                </Button>
              }
            />
          )}
        </div>
        <div className="flex flex-1 flex-col overflow-auto p-1">
          {contacts.length === 0 ? (
            <div className="text-muted-foreground p-6 text-center text-sm">
              No contacts yet.
            </div>
          ) : (
            contacts.map((contact) => (
              <button
                key={contact.id}
                type="button"
                onClick={() => setSelectedId(contact.id)}
                className={cn(
                  'flex flex-col rounded-md px-3 py-2 text-left text-sm',
                  contact.id === selectedId
                    ? 'bg-accent text-accent-foreground'
                    : 'hover:bg-accent/50',
                )}
              >
                <span className="truncate font-medium">
                  {contactName(contact)}
                </span>
                <span className="text-muted-foreground truncate text-xs">
                  {contactEmails(contact)[0] ?? contactOrganization(contact)}
                </span>
              </button>
            ))
          )}
        </div>
      </aside>

      <main
        className={cn(
          'w-full flex-1 flex-col md:flex',
          selected ? 'flex' : 'hidden md:flex',
        )}
      >
        {selected ? (
          <>
            <div className="flex items-center gap-2 border-b px-4 py-3">
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden"
                onClick={() => setSelectedId(null)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <h1 className="flex-1 truncate text-lg font-semibold">
                {contactName(selected)}
              </h1>
              <ContactForm
                addressBookId={
                  Object.keys(selected.addressBookIds ?? {})[0] ??
                  defaultBook?.id ??
                  ''
                }
                contact={selected}
                onSaved={refresh}
                trigger={
                  <Button variant="outline" size="sm">
                    <Pencil className="h-4 w-4" />
                    <span className="hidden sm:inline">Edit</span>
                  </Button>
                }
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => setConfirmDelete(true)}
              >
                <Trash2 className="h-4 w-4" />
                <span className="hidden sm:inline">Delete</span>
              </Button>
            </div>
            <div className="flex flex-col gap-4 overflow-auto p-4">
              {contactOrganization(selected) && (
                <div className="flex items-center gap-3">
                  <Building2 className="text-muted-foreground h-4 w-4" />
                  <span>{contactOrganization(selected)}</span>
                </div>
              )}
              {contactEmails(selected).map((email) => (
                <div key={email} className="flex items-center gap-3">
                  <MailIcon className="text-muted-foreground h-4 w-4" />
                  <a href={`mailto:${email}`} className="text-primary">
                    {email}
                  </a>
                </div>
              ))}
              {contactPhones(selected).map((phone) => (
                <div key={phone} className="flex items-center gap-3">
                  <Phone className="text-muted-foreground h-4 w-4" />
                  <span>{phone}</span>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="text-muted-foreground flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
            <Users className="h-10 w-10" />
            <div className="font-medium">No contact selected</div>
          </div>
        )}
      </main>

      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this contact?</DialogTitle>
            <DialogDescription>This action cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDelete(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={onDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default Layout;
