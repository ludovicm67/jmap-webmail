import {
  JMAP_CONTACTS,
  JMAP_CONTACTS_PARSE,
  JMAP_CORE,
  JMAPResponse,
  parseSetResponse,
  postJmap,
  uploadBlob,
} from './jmap';

export type AddressBook = {
  id: string;
  name: string;
  isDefault?: boolean;
};

// A practical subset of the JSContact ContactCard object.
export type Contact = {
  id: string;
  addressBookIds?: Record<string, boolean>;
  name?: { full?: string | null };
  emails?: Record<string, { address?: string }>;
  phones?: Record<string, { number?: string }>;
  organizations?: Record<string, { name?: string }>;
  notes?: Record<string, { note?: string }>;
};

const auth = (header: string) => ({ Authorization: header });

export const fetchAddressBooks = async (
  apiUrl: string,
  accountId: string,
  header: string,
): Promise<JMAPResponse<AddressBook[]>> => {
  const json = await postJmap(
    apiUrl,
    {
      using: [JMAP_CORE, JMAP_CONTACTS],
      methodCalls: [['AddressBook/get', { accountId, ids: null }, '0']],
    },
    auth(header),
  );
  const m = (json?.methodResponses as unknown[] | undefined)?.[0] as
    [string, { list?: AddressBook[] }] | undefined;
  if (!m || m[0] !== 'AddressBook/get' || !Array.isArray(m[1]?.list)) {
    return { success: false, message: 'could not fetch address books' };
  }
  return { success: true, data: m[1].list };
};

export const fetchContacts = async (
  apiUrl: string,
  accountId: string,
  header: string,
): Promise<JMAPResponse<Contact[]>> => {
  const json = await postJmap(
    apiUrl,
    {
      using: [JMAP_CORE, JMAP_CONTACTS],
      methodCalls: [
        ['ContactCard/query', { accountId, limit: 500 }, '0'],
        [
          'ContactCard/get',
          {
            accountId,
            '#ids': { resultOf: '0', name: 'ContactCard/query', path: '/ids' },
            properties: [
              'addressBookIds',
              'name',
              'emails',
              'phones',
              'organizations',
              'notes',
            ],
          },
          '1',
        ],
      ],
    },
    auth(header),
  );
  const m = (json?.methodResponses as unknown[] | undefined)?.[1] as
    [string, { list?: Contact[] }] | undefined;
  if (!m || m[0] !== 'ContactCard/get' || !Array.isArray(m[1]?.list)) {
    return { success: false, message: 'could not fetch contacts' };
  }
  return { success: true, data: m[1].list };
};

export type ContactInput = {
  fullName: string;
  emails: string[];
  phones: string[];
  organization?: string;
};

const toCard = (
  input: ContactInput,
  addressBookId: string,
): Record<string, unknown> => {
  const card: Record<string, unknown> = {
    addressBookIds: { [addressBookId]: true },
    name: { full: input.fullName },
  };
  const emails = input.emails.filter(Boolean);
  if (emails.length) {
    card.emails = Object.fromEntries(
      emails.map((address, i) => [`e${i}`, { address }]),
    );
  }
  const phones = input.phones.filter(Boolean);
  if (phones.length) {
    card.phones = Object.fromEntries(
      phones.map((number, i) => [`p${i}`, { number }]),
    );
  }
  if (input.organization) {
    card.organizations = { o0: { name: input.organization } };
  }
  return card;
};

export const saveContact = async (
  apiUrl: string,
  accountId: string,
  addressBookId: string,
  input: ContactInput,
  header: string,
  contactId?: string,
): Promise<JMAPResponse<true>> => {
  const card = toCard(input, addressBookId);
  const body = contactId
    ? { update: { [contactId]: card } }
    : { create: { c: card } };
  const json = await postJmap(
    apiUrl,
    {
      using: [JMAP_CORE, JMAP_CONTACTS],
      methodCalls: [['ContactCard/set', { accountId, ...body }, '0']],
    },
    auth(header),
  );
  return parseSetResponse(
    json,
    'ContactCard/set',
    contactId ? 'updated' : 'created',
    contactId ?? 'c',
  );
};

/**
 * Import contacts from an uploaded .vcf file: upload → `ContactCard/parse` →
 * create the parsed card(s) into `addressBookId`. Returns how many were created.
 */
export const importContacts = async (
  apiUrl: string,
  accountId: string,
  uploadUrl: string,
  addressBookId: string,
  file: Blob,
  header: string,
): Promise<JMAPResponse<number>> => {
  const up = await uploadBlob(uploadUrl, accountId, file, 'text/vcard', {
    Authorization: header,
  });
  if (!up.success) return up;

  const parsed = await postJmap(
    apiUrl,
    {
      using: [JMAP_CORE, JMAP_CONTACTS, JMAP_CONTACTS_PARSE],
      methodCalls: [
        ['ContactCard/parse', { accountId, blobIds: [up.data.blobId] }, '0'],
      ],
    },
    { Authorization: header },
  );
  const pm = (parsed?.methodResponses as unknown[] | undefined)?.[0] as
    [string, { parsed?: Record<string, Record<string, unknown>> }] | undefined;
  const card = pm?.[1]?.parsed?.[up.data.blobId];
  if (!card) {
    return { success: false, message: 'no contact was found in the file' };
  }

  // Strip the raw vCard passthrough and graft on the address book membership.
  const { vCard: _vCard, ...clean } = card as Record<string, unknown>;
  void _vCard;
  const create = { c: { ...clean, addressBookIds: { [addressBookId]: true } } };
  const res = await postJmap(
    apiUrl,
    {
      using: [JMAP_CORE, JMAP_CONTACTS],
      methodCalls: [['ContactCard/set', { accountId, create }, '0']],
    },
    { Authorization: header },
  );
  const created = parseSetResponse(res, 'ContactCard/set', 'created', 'c');
  return created.success
    ? { success: true, data: 1 }
    : { success: false, message: created.message };
};

export const destroyContact = async (
  apiUrl: string,
  accountId: string,
  contactId: string,
  header: string,
): Promise<JMAPResponse<true>> => {
  const json = await postJmap(
    apiUrl,
    {
      using: [JMAP_CORE, JMAP_CONTACTS],
      methodCalls: [
        ['ContactCard/set', { accountId, destroy: [contactId] }, '0'],
      ],
    },
    auth(header),
  );
  return parseSetResponse(json, 'ContactCard/set', 'destroyed', contactId);
};

// --- display helpers ---
export const contactName = (contact: Contact): string =>
  contact.name?.full || contactEmails(contact)[0] || '(no name)';

export const contactEmails = (contact: Contact): string[] =>
  Object.values(contact.emails ?? {})
    .map((e) => e.address)
    .filter((a): a is string => Boolean(a));

export const contactPhones = (contact: Contact): string[] =>
  Object.values(contact.phones ?? {})
    .map((p) => p.number)
    .filter((n): n is string => Boolean(n));

export const contactOrganization = (contact: Contact): string =>
  Object.values(contact.organizations ?? {})[0]?.name || '';
