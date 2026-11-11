export type SiteCachePurgeResult = {
  deletedObjects: number;
  invalidationId: string | undefined;
};

/** Drops every cached render of the public site (ISR store + CDN). */
export type SiteCachePurger = {
  purgeAll(): Promise<SiteCachePurgeResult>;
};
