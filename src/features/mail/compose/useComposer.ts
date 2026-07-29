import { useSelector } from 'react-redux';
import { OutgoingAttachment, sendEmail } from '../../../lib/jmap';
import {
  getLoginPayload,
  selectActiveIdentityId,
  selectIdentities,
} from '../../login/loginSlice';
import { selectMailboxes } from '../mailSlice';
import { findMailboxByRole, parseRecipients } from './utils';

export type ComposeFields = {
  to: string;
  subject: string;
  textBody: string;
  identityId?: string;
  inReplyTo?: string[];
  references?: string[];
  attachments?: OutgoingAttachment[];
};

export type SendResult = { success: boolean; message?: string };

/**
 * Shared sending logic for the compose dialog and the quick-reply box. Uses the
 * account's identities (loaded into the store at login) and defaults to the
 * currently selected send-from identity.
 */
export const useComposer = () => {
  const login = useSelector(getLoginPayload);
  const mailboxes = useSelector(selectMailboxes);
  const identities = useSelector(selectIdentities);
  const activeIdentityId = useSelector(selectActiveIdentityId);

  const send = async (fields: ComposeFields): Promise<SendResult> => {
    const recipients = parseRecipients(fields.to);
    if (recipients.length === 0) {
      return { success: false, message: 'Please add at least one recipient.' };
    }

    const wantedId = fields.identityId || activeIdentityId;
    const identity = identities.find((i) => i.id === wantedId) || identities[0];
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
      login.activeAccountId,
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
        attachments: fields.attachments,
      },
      { Authorization: login.authorizationHeader },
    );

    return result.success
      ? { success: true }
      : { success: false, message: result.message };
  };

  return { identities, activeIdentityId, send };
};
