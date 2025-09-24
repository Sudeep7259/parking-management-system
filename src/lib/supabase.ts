import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Replace hard throw on import with a safe lazy client/proxy.
// This prevents runtime crashes when env vars are not configured in dev.
export const supabase = (() => {
  if (supabaseUrl && supabaseKey) {
    return createClient(supabaseUrl, supabaseKey);
  }

  if (typeof window !== 'undefined') {
    // eslint-disable-next-line no-console
    console.warn('[supabase] NEXT_PUBLIC_SUPABASE_URL/ANON_KEY missing. Using no-op client.');
  }

  // Create a proxy that throws only when a method is actually invoked.
  const handler: ProxyHandler<any> = {
    get(_target, prop) {
      // Allow accessing "auth" object with signIn/signOut etc. to still throw on call
      const makeThrowFn = () => {
        throw new Error('Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.');
      };

      // Nested objects should also be callable without crashing at import time
      return new Proxy(() => {}, {
        apply: makeThrowFn,
        get: () => makeThrowFn,
      });
    },
  };

  // @ts-expect-error - we deliberately return a proxy shaped like the client
  return new Proxy({}, handler);
})();