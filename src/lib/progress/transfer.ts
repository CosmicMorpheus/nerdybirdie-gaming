import { exportProgress, parseImport, type ImportResult } from './io';
import type { Progress } from './model';

/*
 * Move progress to another browser without an account: the backup is compressed into a short code that travels in the
 * part of a link after "#", which browsers never send to any server. Opening the link restores it (after a preview).
 * Format: "z." + base64url(deflate-raw(json)), or "j." + base64url(json) where compression isn't available.
 */
function b64url(bytes: Uint8Array): string {
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000)); // chunked: no argument-limit overflow
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
const fromB64url = (s: string) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0));

async function pipe(bytes: Uint8Array, stream: CompressionStream | DecompressionStream): Promise<Uint8Array> {
  const out = new Response(new Blob([bytes as BlobPart]).stream().pipeThrough(stream));
  return new Uint8Array(await out.arrayBuffer());
}

export async function encodeTransfer(p: Progress): Promise<string> {
  const json = new TextEncoder().encode(exportProgress(p));
  if (typeof CompressionStream === 'undefined') return `j.${b64url(json)}`;
  return `z.${b64url(await pipe(json, new CompressionStream('deflate-raw')))}`;
}

export async function decodeTransfer(code: string): Promise<ImportResult> {
  const c = code.trim().replace(/^.*#transfer=/, '');
  if (c.length > 2_000_000) return { ok: false, error: 'That transfer code is too long.' };
  try {
    if (c.startsWith('z.')) {
      if (typeof DecompressionStream === 'undefined') return { ok: false, error: "This browser can't open compressed transfer codes. Use a backup file instead." };
      return parseImport(new TextDecoder().decode(await pipe(fromB64url(c.slice(2)), new DecompressionStream('deflate-raw'))));
    }
    if (c.startsWith('j.')) return parseImport(new TextDecoder().decode(fromB64url(c.slice(2))));
  } catch {
    return { ok: false, error: "That transfer code is damaged or incomplete. Copy the whole link and try again." };
  }
  return { ok: false, error: "That isn't a Nerdy Birdie Gaming Guides transfer code." };
}

export const transferLink = (origin: string, code: string) => `${origin}/progress/#transfer=${code}`;
