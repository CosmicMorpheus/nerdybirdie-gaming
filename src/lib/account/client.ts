/** Supabase client and account storage. Loaded lazily, only when ACCOUNTS_ENABLED, so guest-only builds don't ship it. */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Progress } from '../progress/model';
import { SUPABASE_ANON_KEY, SUPABASE_URL } from './config';
import type { Remote } from './sync';

let client: SupabaseClient | null = null;
export function supabase(): SupabaseClient {
  client ??= createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: true, detectSessionInUrl: true, flowType: 'pkce' } });
  return client;
}

/** This player's row. The database's row-level security rejects any other user's row. */
export function remoteFor(userId: string): Remote {
  const db = supabase();
  return {
    async pull() {
      const { data, error } = await db.from('progress').select('data, version').eq('user_id', userId).maybeSingle();
      if (error) throw error;
      return data ? { data: data.data, version: data.version as number } : null;
    },
    async push(doc: Progress, expected: number | null) {
      if (expected === null) {
        const { error } = await db.from('progress').insert({ user_id: userId, data: doc, version: 1 });
        if (error?.code === '23505') return 'conflict';
        if (error) throw error;
        return 1;
      }
      const { data, error } = await db.from('progress').update({ data: doc, version: expected + 1, updated_at: new Date().toISOString() })
        .eq('user_id', userId).eq('version', expected).select('version');
      if (error) throw error;
      return data && data.length ? (data[0]!.version as number) : 'conflict';
    },
  };
}

export async function currentUser(): Promise<{ id: string; email: string | null } | null> {
  const { data } = await supabase().auth.getSession();
  const u = data.session?.user;
  return u ? { id: u.id, email: u.email ?? null } : null;
}

export async function sendMagicLink(email: string): Promise<string | null> {
  const { error } = await supabase().auth.signInWithOtp({ email, options: { emailRedirectTo: `${location.origin}/account/` } });
  return error ? error.message : null;
}

export async function signOut(): Promise<void> {
  await supabase().auth.signOut();
}
