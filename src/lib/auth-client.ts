import { createAuthClient } from "better-auth/react";
import { genericOAuthClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  baseURL: import.meta.env.VITE_AUTH_URL || "http://localhost:3456",
  plugins: [genericOAuthClient()],
});

export const { useSession, signIn, signUp, signOut } = authClient;

/**
 * Get a JWT token from better-auth for use with gateway API calls.
 * This replaces the old manual JWT management in volund-api.ts.
 */
export async function getGatewayToken(): Promise<string> {
  const authUrl = import.meta.env.VITE_AUTH_URL || "http://localhost:3456";
  const res = await fetch(`${authUrl}/api/auth/token`, {
    credentials: "include",
  });
  if (!res.ok) throw new Error("Not authenticated");
  const data = await res.json();
  return data.token;
}
