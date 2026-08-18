/** Latest ISO timestamp among CMS `updated_at` values (ignores empty/invalid). */
export function latestUpdatedAt(timestamps: Array<string | undefined | null>): string {
  let latest: string | undefined;
  for (const value of timestamps) {
    if (!value) continue;
    const ms = Date.parse(value);
    if (Number.isNaN(ms)) continue;
    if (!latest || ms > Date.parse(latest)) latest = value;
  }
  return latest ?? new Date(0).toISOString();
}
