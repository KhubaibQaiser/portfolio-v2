import { createClient } from "@/lib/supabase/server";
import { getMedia } from "@portfolio/shared/supabase/queries";
import { isR2Configured } from "@/lib/r2";
import { MediaLibrary } from "./media-library";

export default async function MediaPage() {
  const client = await createClient();
  const items = await getMedia(client).catch(() => []);
  const storageReady = isR2Configured();

  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Media Library</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Upload and manage images stored in Cloudflare R2.
          </p>
        </div>
      </div>

      <MediaLibrary initialItems={items} storageReady={storageReady} />
    </>
  );
}
