/** Account sync is on only when both public settings are present at build time. */
export const SUPABASE_URL = (import.meta.env.PUBLIC_SUPABASE_URL as string | undefined) ?? '';
export const SUPABASE_ANON_KEY = (import.meta.env.PUBLIC_SUPABASE_ANON_KEY as string | undefined) ?? '';
export const ACCOUNTS_ENABLED = /^https:\/\//.test(SUPABASE_URL) && SUPABASE_ANON_KEY.length > 20;
