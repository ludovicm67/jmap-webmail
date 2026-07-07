import { useSelector } from 'react-redux';
import { useQuery } from '@tanstack/react-query';
import { fetchIdentities, sendEmail } from '../../../lib/jmap';
import { getLoginPayload } from '../../login/loginSlice';
import { selectMailboxes } from '../mailSlice';
import { Identity } from '../types';
import { findMailboxByRole, parseRecipients } from './utils';

export type ComposeFields = {
  to: string;
  subject: string;
  textBody: string;
  identityId?: string;
  inReplyTo?: string[];
  references?: string[];
};

export type SendResult = { success: boolean; message?: string };

/**
 * Shared sending logic for the compose dialog and the quick-reply box:
 * loads the available identities and turns a set of fields into a JMAP send.
 */
export const useComposer = () => {
  const login = useSelector(getLoginPayload);
  const mailboxes = useSelector(selectMailboxes);

  const { data: identities } = useQuery({
    queryKey: ['identities'],
    queryFn: async (): Promise<Identity[]> => {
      const request = await fetchIdentities(login.apiUrl, login.accountId, {
        Authorization: login.authorizationHeader,
      });
      if (!request.success) {
        throw new Error(request.message);
      }
      return request.data;
    },
    staleTime: Infinity,
    enabled: Boolean(login.apiUrl && login.accountId),
  });

  const send = async (fields: ComposeFields): Promise<SendResult> => {
    const recipients = parseRecipients(fields.to);
    if (recipients.length === 0) {
      return { success: false, message: 'Please add at least one recipient.' };
    }

    const identity =
      identities?.find((i) => i.id === fields.identityId) || identities?.[0];
    if (!identity) {
      return {
        success: false,
        message: 'No sending identity is available for this account.',
      };
    }

    const drafts = findMailboxByRole(mailboxes, 'drafts');
    if (!drafts) {
      return {
        success: false,
        message: 'No Drafts mailbox was found on the server.',
      };
    }
    const sent = findMailboxByRole(mailboxes, 'sent');

    const result = await sendEmail(
      login.apiUrl,
      login.accountId,
      {
        identityId: identity.id,
        from: { name: identity.name, email: identity.email },
        to: recipients,
        subject: fields.subject,
        textBody: fields.textBody,
        draftsMailboxId: drafts.id,
        sentMailboxId: sent?.id,
        inReplyTo: fields.inReplyTo,
        references: fields.references,
      },
      { Authorization: login.authorizationHeader },
    );

    return result.success
      ? { success: true }
      : { success: false, message: result.message };
  };

  return { identities: identities || [], send };
};
