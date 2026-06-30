/** The authenticated admin principal resolved from the session. */
export type AdminIdentity = {
  sub: string;
  email: string;
};

/**
 * Backend-agnostic admin authentication. Production resolves the identity from
 * a verified Better Auth session; the `isAllowed` check enforces the admin
 * email allowlist independently of the token source.
 */
export type AuthProvider = {
  /** Resolves the current admin identity, or null when unauthenticated. */
  getCurrentIdentity(): Promise<AdminIdentity | null>;
  /** Whether the given email is permitted to access the admin dashboard. */
  isAllowed(email: string | null | undefined): boolean;
};
