import type { AuthProvider, User } from "@bank/domain";
import { demoUser } from "./demo-user";
import { shouldUseSupabase } from "./runtime";
import { readAppState } from "./state-store";

export const authProvider: AuthProvider = {
  async getCurrentUser(): Promise<User> {
    if (shouldUseSupabase()) {
      return demoUser;
    }

    const state = await readAppState();
    const user = state.users.find((entry) => entry.id === "user-demo");
    if (!user) {
      throw new Error("Demo user is missing.");
    }
    return user;
  },
};
