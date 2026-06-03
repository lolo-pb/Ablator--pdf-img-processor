import { createClient } from "@supabase/supabase-js";
import { requireSupabasePublicEnv } from "./env";

let browserClient: ReturnType<typeof createClient> | null = null;
let serverClient: ReturnType<typeof createClient> | null = null;

export function getBrowserSupabaseClient() {
  if (!browserClient) {
    const env = requireSupabasePublicEnv();
    browserClient = createClient(env.url, env.anonKey);
  }

  return browserClient;
}

export function getServerSupabaseClient() {
  if (!serverClient) {
    const env = requireSupabasePublicEnv();
    serverClient = createClient(env.url, env.anonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }

  return serverClient;
}

