import { hasSupabasePublicEnv } from "./env";

export function shouldUseSupabase() {
  return hasSupabasePublicEnv();
}

