import { JSX, useRef, useState } from 'react';
import { Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { JMAPResponse } from '../lib/jmap';

type ImportButtonProps = {
  accept: string;
  label: string;
  importer: (file: File) => Promise<JMAPResponse<number>>;
  onImported: () => void;
};

// Small file-picker button that runs an importer and reports the outcome inline.
function ImportButton({
  accept,
  label,
  importer,
  onImported,
}: ImportButtonProps): JSX.Element {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(
    null,
  );

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    setMessage(null);
    const result = await importer(file);
    setBusy(false);
    if (inputRef.current) inputRef.current.value = '';
    if (result.success) {
      setMessage({ text: `Imported ${result.data}.`, ok: true });
      onImported();
    } else {
      setMessage({ text: result.message, ok: false });
    }
  };

  return (
    <div className="flex items-center gap-2">
      {message && (
        <span
          className={
            message.ok
              ? 'text-muted-foreground text-xs'
              : 'text-destructive text-xs'
          }
        >
          {message.text}
        </span>
      )}
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => onFile(e.target.files?.[0])}
      />
      <Button
        variant="outline"
        size="sm"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
      >
        <Upload className="h-4 w-4" />
        {busy ? 'Importing…' : label}
      </Button>
    </div>
  );
}

export default ImportButton;
