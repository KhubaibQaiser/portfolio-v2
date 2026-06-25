import { getContentRepository } from "@portfolio/data";
import { getMediaStore } from "@portfolio/data/media";
import { MediaLibrary } from "./media-library";

export default async function MediaPage() {
  const items = await getContentRepository()
    .getMedia()
    .catch(() => []);
  const storageReady = getMediaStore().isConfigured();

  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Media Library</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Upload and manage images stored in S3.
          </p>
        </div>
      </div>

      <MediaLibrary initialItems={items} storageReady={storageReady} />
    </>
  );
}
