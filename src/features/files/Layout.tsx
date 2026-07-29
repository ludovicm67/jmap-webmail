import { JSX, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ChevronRight,
  Download,
  File as FileIcon,
  Folder,
  FolderPlus,
  Home,
  Trash2,
  Upload,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { downloadBlob } from '../../lib/jmap';
import {
  FileNode,
  createFolder,
  destroyNode,
  fetchNodes,
  uploadFile,
} from '../../lib/jmapFiles';
import {
  getLoginPayload,
  selectFilesAccountId,
  selectUploadUrl,
} from '../login/loginSlice';

const formatBytes = (bytes?: number | null): string => {
  if (!bytes) return '';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value.toFixed(value < 10 && unit > 0 ? 1 : 0)} ${units[unit]}`;
};

function Layout(): JSX.Element {
  const { apiUrl, authorizationHeader, downloadUrl } =
    useSelector(getLoginPayload);
  const accountId = useSelector(selectFilesAccountId);
  const uploadUrl = useSelector(selectUploadUrl);
  const queryClient = useQueryClient();

  const [parentId, setParentId] = useState<string | null>(null);
  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [folderName, setFolderName] = useState('');
  const [busy, setBusy] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const nodesQuery = useQuery({
    queryKey: ['files', accountId],
    queryFn: async () => {
      const r = await fetchNodes(apiUrl, accountId, authorizationHeader);
      if (!r.success) throw new Error(r.message);
      return r.data;
    },
    enabled: !!accountId,
  });

  const nodes = nodesQuery.data ?? [];
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const children = nodes
    .filter((n) => (n.parentId ?? null) === parentId)
    .sort((a, b) => {
      if (a.nodeType !== b.nodeType) return a.nodeType === 'directory' ? -1 : 1;
      return a.name.localeCompare(b.name);
    });

  // Build the breadcrumb from the current folder up to the root.
  const trail: FileNode[] = [];
  let cur = parentId ? byId.get(parentId) : undefined;
  while (cur) {
    trail.unshift(cur);
    cur = cur.parentId ? byId.get(cur.parentId) : undefined;
  }

  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: ['files', accountId] });

  const onCreateFolder = async () => {
    if (folderName.trim() === '') return;
    setBusy(true);
    await createFolder(
      apiUrl,
      accountId,
      folderName.trim(),
      parentId,
      authorizationHeader,
    );
    setBusy(false);
    setNewFolderOpen(false);
    setFolderName('');
    refresh();
  };

  const onUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setBusy(true);
    for (const file of Array.from(files)) {
      await uploadFile(
        apiUrl,
        accountId,
        uploadUrl,
        file,
        parentId,
        authorizationHeader,
      );
    }
    setBusy(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
    refresh();
  };

  const onDelete = async (node: FileNode) => {
    setBusy(true);
    await destroyNode(apiUrl, accountId, node.id, authorizationHeader);
    setBusy(false);
    refresh();
  };

  return (
    <div className="flex h-full w-full flex-col overflow-hidden">
      <div className="flex flex-wrap items-center gap-2 border-b px-4 py-2">
        <nav className="flex min-w-0 flex-1 items-center gap-1 text-sm">
          <button
            type="button"
            onClick={() => setParentId(null)}
            className="hover:text-primary flex items-center gap-1"
          >
            <Home className="h-4 w-4" />
            Files
          </button>
          {trail.map((n) => (
            <span key={n.id} className="flex items-center gap-1">
              <ChevronRight className="text-muted-foreground h-4 w-4" />
              <button
                type="button"
                onClick={() => setParentId(n.id)}
                className="hover:text-primary max-w-40 truncate"
              >
                {n.name}
              </button>
            </span>
          ))}
        </nav>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => onUpload(e.target.files)}
        />
        <Button
          variant="outline"
          size="sm"
          onClick={() => setNewFolderOpen(true)}
          disabled={busy}
        >
          <FolderPlus className="h-4 w-4" />
          New folder
        </Button>
        <Button
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={busy || !uploadUrl}
        >
          <Upload className="h-4 w-4" />
          Upload
        </Button>
      </div>

      <div className="flex-1 overflow-auto">
        {nodesQuery.isLoading ? (
          <p className="text-muted-foreground p-4 text-sm">Loading…</p>
        ) : children.length === 0 ? (
          <p className="text-muted-foreground p-6 text-center text-sm">
            This folder is empty.
          </p>
        ) : (
          <ul className="divide-y">
            {children.map((node) => (
              <li
                key={node.id}
                className="hover:bg-muted/50 flex items-center gap-3 px-4 py-2"
              >
                {node.nodeType === 'directory' ? (
                  <button
                    type="button"
                    onClick={() => setParentId(node.id)}
                    className="flex min-w-0 flex-1 items-center gap-3 text-left"
                  >
                    <Folder className="text-primary h-5 w-5 shrink-0" />
                    <span className="truncate">{node.name}</span>
                  </button>
                ) : (
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <FileIcon className="text-muted-foreground h-5 w-5 shrink-0" />
                    <span className="truncate">{node.name}</span>
                    <span className="text-muted-foreground text-xs">
                      {formatBytes(node.size)}
                    </span>
                  </div>
                )}
                {node.nodeType === 'file' && node.blobId && (
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Download ${node.name}`}
                    onClick={() =>
                      downloadBlob(
                        downloadUrl,
                        accountId,
                        node.blobId!,
                        node.name,
                        node.type || 'application/octet-stream',
                        { Authorization: authorizationHeader },
                      )
                    }
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Delete ${node.name}`}
                  onClick={() => onDelete(node)}
                  disabled={busy}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Dialog open={newFolderOpen} onOpenChange={setNewFolderOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>New folder</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Label htmlFor="folder-name">Name</Label>
            <Input
              id="folder-name"
              autoFocus
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && onCreateFolder()}
            />
          </div>
          <DialogFooter>
            <Button onClick={onCreateFolder} disabled={busy}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default Layout;
