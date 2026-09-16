import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createClientServer() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://hwevzebjrzdwztjpbyeu.supabase.co',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_aaNck9INPmNS6aurfDTUxQ_t20XSADU',
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: Array<{ name: string; value: string; options?: Record<string, unknown> }>) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options as any)
            );
          } catch {
            // Server Component read-only context fallback
          }
        },
      },
    }
  );
}
