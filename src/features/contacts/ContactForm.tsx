import { ReactNode, useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Contact,
  contactEmails,
  contactOrganization,
  contactPhones,
  saveContact,
} from '../../lib/jmapContacts';
import { getLoginPayload, selectContactsAccountId } from '../login/loginSlice';

type ContactFormProps = {
  trigger: ReactNode;
  addressBookId: string;
  contact?: Contact;
  onSaved: () => void;
};

function ContactForm({
  trigger,
  addressBookId,
  contact,
  onSaved,
}: ContactFormProps) {
  const { apiUrl, authorizationHeader } = useSelector(getLoginPayload);
  const accountId = useSelector(selectContactsAccountId);

  const [open, setOpen] = useState(false);
  const [fullName, setFullName] = useState('');
  const [organization, setOrganization] = useState('');
  const [emails, setEmails] = useState('');
  const [phones, setPhones] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setFullName(contact?.name?.full || '');
      setOrganization(contact ? contactOrganization(contact) : '');
      setEmails(contact ? contactEmails(contact).join(', ') : '');
      setPhones(contact ? contactPhones(contact).join(', ') : '');
      setError('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const onSave = async () => {
    if (saving || fullName.trim() === '') {
      return;
    }
    setSaving(true);
    setError('');
    const split = (value: string) =>
      value
        .split(',')
        .map((v) => v.trim())
        .filter(Boolean);
    const result = await saveContact(
      apiUrl,
      accountId,
      addressBookId,
      {
        fullName: fullName.trim(),
        emails: split(emails),
        phones: split(phones),
        organization: organization.trim() || undefined,
      },
      authorizationHeader,
      contact?.id,
    );
    setSaving(false);
    if (!result.success) {
      setError(result.message);
      return;
    }
    setOpen(false);
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{contact ? 'Edit contact' : 'New contact'}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <div className="flex flex-col gap-2">
            <Label htmlFor="contact-name">Full name</Label>
            <Input
              id="contact-name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              autoFocus
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="contact-org">Organization</Label>
            <Input
              id="contact-org"
              value={organization}
              onChange={(e) => setOrganization(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="contact-emails">Emails (comma-separated)</Label>
            <Input
              id="contact-emails"
              value={emails}
              placeholder="a@example.com, b@example.com"
              onChange={(e) => setEmails(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="contact-phones">Phones (comma-separated)</Label>
            <Input
              id="contact-phones"
              value={phones}
              onChange={(e) => setPhones(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={onSave} disabled={saving || fullName.trim() === ''}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default ContactForm;
