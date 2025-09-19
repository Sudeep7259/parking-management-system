"use client"
import { createAuthClient } from "better-auth/react"
import { useEffect, useState } from "react"

// Resolve absolute base URL to satisfy BetterAuth
const resolveBaseURL = () => {
  if (typeof window !== "undefined") {
    return `${window.location.origin}/api/auth`
  }
  const fallback = process.env.NEXT_PUBLIC_APP_URL || (process.env.NEXT_PUBLIC_VERCEL_URL ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}` : "http://localhost:3000")
  return `${fallback}/api/auth`
}

// Lazy, client-only singleton
let _client: ReturnType<typeof createAuthClient> | null = null
const ensureClient = () => {
  if (!_client) {
    // Only initialize in the browser; on the server we defer until first client access
    const baseURL = resolveBaseURL()
    _client = createAuthClient({
      baseURL,
      fetchOptions: {
        headers: {
          Authorization: `Bearer ${typeof window !== 'undefined' ? localStorage.getItem("bearer_token") : ""}`,
        },
        onSuccess: (ctx) => {
          const authToken = ctx.response.headers.get("set-auth-token")
          if (authToken) {
            if (typeof window !== 'undefined') {
              localStorage.setItem("bearer_token", authToken)
            }
          }
        }
      }
    })
  }
  return _client!
}

// Export a proxy so importing modules don't initialize on the server
export const authClient = new Proxy({} as ReturnType<typeof createAuthClient>, {
  get(_target, prop) {
    const client = ensureClient()
    // @ts-ignore - forward property access
    return client[prop]
  }
})

type SessionData = ReturnType<typeof ensureClient>["useSession"]

export function useSession(): any {
   const [session, setSession] = useState<any>(null);
   const [isPending, setIsPending] = useState(true);
   const [error, setError] = useState<any>(null);

   const refetch = () => {
      setIsPending(true);
      setError(null);
      fetchSession();
   };

   const fetchSession = async () => {
      try {
         const res = await ensureClient().getSession({
            fetchOptions: {
               auth: {
                  type: "Bearer",
                  token: typeof window !== 'undefined' ? localStorage.getItem("bearer_token") || "" : "",
               },
            },
         });
         setSession(res.data);
         setError(null);
      } catch (err) {
         setSession(null);
         setError(err);
      } finally {
         setIsPending(false);
      }
   };

   useEffect(() => {
      fetchSession();
   }, []);

   return { data: session, isPending, error, refetch };
}