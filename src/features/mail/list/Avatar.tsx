import { useEffect, useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { MailFrom } from '../types';

// Gravatar accepts a SHA-256 hex of the lowercased/trimmed email; compute it
// with the Web Crypto API (no dependency) and memoize per address.
const hashCache = new Map<string, string>();

const sha256Hex = async (input: string): Promise<string> => {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
};

const getInitials = (name?: string | null, email?: string | null): string => {
  const source = (name || email || '').trim();
  if (!source) {
    return '?';
  }
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return source.slice(0, 2).toUpperCase();
};

type EmailAvatarProps = {
  person?: MailFrom;
  className?: string;
};

function EmailAvatar({ person, className }: EmailAvatarProps) {
  const email = person?.email?.trim().toLowerCase() || '';
  const [hash, setHash] = useState<string | null>(
    () => hashCache.get(email) || null,
  );

  useEffect(() => {
    if (!email || hashCache.has(email) || !crypto?.subtle) {
      return;
    }
    let active = true;
    sha256Hex(email)
      .then((h) => {
        hashCache.set(email, h);
        if (active) {
          setHash(h);
        }
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [email]);

  // d=404 makes Gravatar 404 when there's no image, so Radix falls back to the
  // initials automatically.
  const src = hash
    ? `https://www.gravatar.com/avatar/${hash}?s=80&d=404`
    : undefined;

  return (
    <Avatar className={cn('h-9 w-9', className)}>
      {src && (
        <AvatarImage src={src} alt={person?.name || person?.email || ''} />
      )}
      <AvatarFallback className="text-xs">
        {getInitials(person?.name, person?.email)}
      </AvatarFallback>
    </Avatar>
  );
}

export default EmailAvatar;
