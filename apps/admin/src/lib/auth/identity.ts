import type { AdminIdentity } from "@portfolio/shared/ports";

/** Minimal session shape used for identity mapping (Better Auth getSession). */
export type SessionUserLike = {
  email?: string | null;
  googleSub?: string | null;
};

export type SessionLike = {
  user?: SessionUserLike | null;
} | null;

/**
 * Maps a Better Auth session to the shared {@link AdminIdentity} contract.
 * `sub` is the stable Google account id (`profile.sub`), used as the DynamoDB
 * persistence key for rate limits, cost caps, and resume history.
 */
export function mapSessionToIdentity(session: SessionLike): AdminIdentity | null {
  const email = session?.user?.email;
  const googleSub = session?.user?.googleSub;
  if (typeof email !== "string" || !email) return null;
  if (typeof googleSub !== "string" || !googleSub) return null;
  return { sub: googleSub, email };
}
