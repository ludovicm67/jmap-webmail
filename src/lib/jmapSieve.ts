import {
  JMAP_CORE,
  JMAP_SIEVE,
  JMAPResponse,
  fetchBlobText,
  parseSetResponse,
  postJmap,
  uploadBlob,
} from './jmap';

export type SieveScript = {
  id: string;
  name: string;
  blobId?: string;
  isActive: boolean;
};

const auth = (header: string) => ({ Authorization: header });

export const fetchScripts = async (
  apiUrl: string,
  accountId: string,
  header: string,
): Promise<JMAPResponse<SieveScript[]>> => {
  const json = await postJmap(
    apiUrl,
    {
      using: [JMAP_CORE, JMAP_SIEVE],
      methodCalls: [['SieveScript/get', { accountId, ids: null }, '0']],
    },
    auth(header),
  );
  const m = (json?.methodResponses as unknown[] | undefined)?.[0] as
    [string, { list?: SieveScript[] }] | undefined;
  if (!m || m[0] !== 'SieveScript/get' || !Array.isArray(m[1]?.list)) {
    return { success: false, message: 'could not fetch filter scripts' };
  }
  return { success: true, data: m[1].list };
};

export const fetchScriptContent = (
  downloadUrl: string,
  accountId: string,
  blobId: string,
  header: string,
): Promise<JMAPResponse<string>> =>
  fetchBlobText(downloadUrl, accountId, blobId, header, 'application/sieve');

/** Validate Sieve source; returns null when valid or the error description. */
export const validateScript = async (
  apiUrl: string,
  accountId: string,
  uploadUrl: string,
  content: string,
  header: string,
): Promise<JMAPResponse<string | null>> => {
  const up = await uploadBlob(
    uploadUrl,
    accountId,
    content,
    'application/sieve',
    {
      Authorization: header,
    },
  );
  if (!up.success) return up;
  const json = await postJmap(
    apiUrl,
    {
      using: [JMAP_CORE, JMAP_SIEVE],
      methodCalls: [
        ['SieveScript/validate', { accountId, blobId: up.data.blobId }, '0'],
      ],
    },
    auth(header),
  );
  const m = (json?.methodResponses as unknown[] | undefined)?.[0] as
    [string, { error?: unknown }] | undefined;
  if (!m || m[0] !== 'SieveScript/validate') {
    return { success: false, message: 'could not validate the script' };
  }
  const err = m[1]?.error;
  return { success: true, data: err ? String(err) : null };
};

/**
 * Upload the source as a blob and create/update the named script, optionally
 * activating it. Returns nothing useful beyond success.
 */
export const saveScript = async (
  apiUrl: string,
  accountId: string,
  uploadUrl: string,
  name: string,
  content: string,
  header: string,
  scriptId?: string,
  activate?: boolean,
): Promise<JMAPResponse<true>> => {
  const up = await uploadBlob(
    uploadUrl,
    accountId,
    content,
    'application/sieve',
    {
      Authorization: header,
    },
  );
  if (!up.success) return up;

  const body: Record<string, unknown> = scriptId
    ? { update: { [scriptId]: { name, blobId: up.data.blobId } } }
    : { create: { s: { name, blobId: up.data.blobId } } };
  if (activate) {
    body.onSuccessActivateScript = scriptId ? scriptId : '#s';
  }
  const json = await postJmap(
    apiUrl,
    {
      using: [JMAP_CORE, JMAP_SIEVE],
      methodCalls: [['SieveScript/set', { accountId, ...body }, '0']],
    },
    auth(header),
  );
  return parseSetResponse(
    json,
    'SieveScript/set',
    scriptId ? 'updated' : 'created',
    scriptId ?? 's',
  );
};

/** Activate a script by id, or deactivate all when id is null. */
export const activateScript = async (
  apiUrl: string,
  accountId: string,
  scriptId: string | null,
  header: string,
): Promise<JMAPResponse<true>> => {
  const json = await postJmap(
    apiUrl,
    {
      using: [JMAP_CORE, JMAP_SIEVE],
      methodCalls: [
        [
          'SieveScript/set',
          { accountId, onSuccessActivateScript: scriptId },
          '0',
        ],
      ],
    },
    auth(header),
  );
  // A bare activation with no create/update has no per-id result to reject; a
  // valid method response is success enough.
  const m = (json?.methodResponses as unknown[] | undefined)?.[0] as
    [string, unknown] | undefined;
  if (!m || (m[0] !== 'SieveScript/set' && m[0] !== 'error')) {
    return { success: false, message: 'could not change activation' };
  }
  if (m[0] === 'error') {
    return { success: false, message: 'the server rejected the change' };
  }
  return { success: true, data: true };
};

export const destroyScript = async (
  apiUrl: string,
  accountId: string,
  scriptId: string,
  header: string,
): Promise<JMAPResponse<true>> => {
  const json = await postJmap(
    apiUrl,
    {
      using: [JMAP_CORE, JMAP_SIEVE],
      methodCalls: [
        ['SieveScript/set', { accountId, destroy: [scriptId] }, '0'],
      ],
    },
    auth(header),
  );
  return parseSetResponse(json, 'SieveScript/set', 'destroyed', scriptId);
};
