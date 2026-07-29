import {
  JMAP_CORE,
  JMAP_FILENODE,
  JMAPResponse,
  parseSetResponse,
  postJmap,
  uploadBlob,
} from './jmap';

export type FileNode = {
  id: string;
  parentId?: string | null;
  nodeType: 'directory' | 'file';
  blobId?: string | null;
  size?: number | null;
  name: string;
  type?: string | null;
  modified?: string;
};

const auth = (header: string) => ({ Authorization: header });

/** All file-storage nodes; the UI builds the folder tree client-side. */
export const fetchNodes = async (
  apiUrl: string,
  accountId: string,
  header: string,
): Promise<JMAPResponse<FileNode[]>> => {
  const json = await postJmap(
    apiUrl,
    {
      using: [JMAP_CORE, JMAP_FILENODE],
      methodCalls: [
        [
          'FileNode/get',
          {
            accountId,
            ids: null,
            properties: [
              'parentId',
              'nodeType',
              'blobId',
              'size',
              'name',
              'type',
              'modified',
            ],
          },
          '0',
        ],
      ],
    },
    auth(header),
  );
  const m = (json?.methodResponses as unknown[] | undefined)?.[0] as
    [string, { list?: FileNode[] }] | undefined;
  if (!m || m[0] !== 'FileNode/get' || !Array.isArray(m[1]?.list)) {
    return { success: false, message: 'could not fetch files' };
  }
  return { success: true, data: m[1].list };
};

export const createFolder = async (
  apiUrl: string,
  accountId: string,
  name: string,
  parentId: string | null,
  header: string,
): Promise<JMAPResponse<true>> => {
  const json = await postJmap(
    apiUrl,
    {
      using: [JMAP_CORE, JMAP_FILENODE],
      methodCalls: [
        [
          'FileNode/set',
          {
            accountId,
            create: { f: { name, parentId, nodeType: 'directory' } },
          },
          '0',
        ],
      ],
    },
    auth(header),
  );
  return parseSetResponse(json, 'FileNode/set', 'created', 'f');
};

export const uploadFile = async (
  apiUrl: string,
  accountId: string,
  uploadUrl: string,
  file: File,
  parentId: string | null,
  header: string,
): Promise<JMAPResponse<true>> => {
  const up = await uploadBlob(
    uploadUrl,
    accountId,
    file,
    file.type || 'application/octet-stream',
    auth(header),
  );
  if (!up.success) return up;
  const json = await postJmap(
    apiUrl,
    {
      using: [JMAP_CORE, JMAP_FILENODE],
      methodCalls: [
        [
          'FileNode/set',
          {
            accountId,
            create: {
              f: {
                name: file.name,
                parentId,
                nodeType: 'file',
                blobId: up.data.blobId,
                type: up.data.type,
                size: up.data.size || file.size,
              },
            },
          },
          '0',
        ],
      ],
    },
    auth(header),
  );
  return parseSetResponse(json, 'FileNode/set', 'created', 'f');
};

export const destroyNode = async (
  apiUrl: string,
  accountId: string,
  id: string,
  header: string,
): Promise<JMAPResponse<true>> => {
  const json = await postJmap(
    apiUrl,
    {
      using: [JMAP_CORE, JMAP_FILENODE],
      methodCalls: [['FileNode/set', { accountId, destroy: [id] }, '0']],
    },
    auth(header),
  );
  return parseSetResponse(json, 'FileNode/set', 'destroyed', id);
};
