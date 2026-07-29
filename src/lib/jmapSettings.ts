import {
  JMAP_CORE,
  JMAP_MAIL,
  JMAP_QUOTA,
  JMAP_VACATION,
  JMAPResponse,
  parseSetResponse,
  postJmap,
} from './jmap';

export type VacationResponse = {
  id: string;
  isEnabled: boolean;
  fromDate?: string | null;
  toDate?: string | null;
  subject?: string | null;
  textBody?: string | null;
  htmlBody?: string | null;
};

export type VacationInput = {
  isEnabled: boolean;
  subject: string;
  textBody: string;
  fromDate?: string | null;
  toDate?: string | null;
};

const auth = (header: string) => ({ Authorization: header });

export const fetchVacation = async (
  apiUrl: string,
  accountId: string,
  header: string,
): Promise<JMAPResponse<VacationResponse>> => {
  const json = await postJmap(
    apiUrl,
    {
      using: [JMAP_CORE, JMAP_MAIL, JMAP_VACATION],
      methodCalls: [['VacationResponse/get', { accountId, ids: null }, '0']],
    },
    auth(header),
  );
  const m = (json?.methodResponses as unknown[] | undefined)?.[0] as
    [string, { list?: VacationResponse[] }] | undefined;
  if (!m || m[0] !== 'VacationResponse/get' || !m[1]?.list?.[0]) {
    return {
      success: false,
      message: 'could not fetch the vacation responder',
    };
  }
  return { success: true, data: m[1].list[0] };
};

export const saveVacation = async (
  apiUrl: string,
  accountId: string,
  input: VacationInput,
  header: string,
): Promise<JMAPResponse<true>> => {
  const json = await postJmap(
    apiUrl,
    {
      using: [JMAP_CORE, JMAP_MAIL, JMAP_VACATION],
      methodCalls: [
        [
          'VacationResponse/set',
          {
            accountId,
            update: {
              singleton: {
                isEnabled: input.isEnabled,
                subject: input.subject || null,
                textBody: input.textBody || null,
                fromDate: input.fromDate || null,
                toDate: input.toDate || null,
              },
            },
          },
          '0',
        ],
      ],
    },
    auth(header),
  );
  return parseSetResponse(json, 'VacationResponse/set', 'updated', 'singleton');
};

export type Quota = {
  id: string;
  resourceType?: string;
  used?: number;
  hardLimit?: number;
  warnLimit?: number | null;
  scope?: string;
  name?: string;
  types?: string[];
};

/** Storage/usage quotas. May be empty when the server enforces none. */
export const fetchQuotas = async (
  apiUrl: string,
  accountId: string,
  header: string,
): Promise<JMAPResponse<Quota[]>> => {
  const json = await postJmap(
    apiUrl,
    {
      using: [JMAP_CORE, JMAP_QUOTA],
      methodCalls: [['Quota/get', { accountId, ids: null }, '0']],
    },
    auth(header),
  );
  const m = (json?.methodResponses as unknown[] | undefined)?.[0] as
    [string, { list?: Quota[] }] | undefined;
  if (!m || m[0] !== 'Quota/get' || !Array.isArray(m[1]?.list)) {
    return { success: false, message: 'could not fetch quotas' };
  }
  return { success: true, data: m[1].list };
};
