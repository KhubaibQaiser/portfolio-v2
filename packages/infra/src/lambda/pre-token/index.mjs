/**
 * Cognito pre-token-generation (V1) trigger.
 *
 * Injects a `role` claim into the ID token so the client/UI can branch on it.
 * The authoritative admin allowlist is still enforced in-app by email; this
 * claim is a convenience and must not be the sole authorization gate.
 *
 * V1 is used (rather than V2) so the user pool does not require the paid Plus
 * feature plan. V1 can only override ID-token claims, which is sufficient here.
 *
 * @param {import("aws-lambda").PreTokenGenerationTriggerEvent} event
 */
export const handler = async (event) => {
  event.response = {
    claimsOverrideDetails: {
      claimsToAddOrOverride: { role: "admin" },
    },
  };
  return event;
};
