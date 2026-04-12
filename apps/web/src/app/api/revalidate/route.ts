import { NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";

export async function POST(request: Request) {
  try {
    const secret = request.headers.get("x-revalidate-secret");
    const expectedSecret = process.env.REVALIDATE_SECRET;

    if (!expectedSecret || secret !== expectedSecret) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const body = await request.json();
    const { paths, tags } = body as {
      paths?: string[];
      tags?: string[];
    };

    if (paths) {
      for (const path of paths) {
        revalidatePath(path);
      }
    }

    if (tags && tags.length > 0) {
      for (const tag of tags) {
        revalidateTag(tag, { expire: 0 });
      }
      /* unstable_cache + tag invalidation: also refresh the app router tree so pages pick up new data */
      revalidatePath("/", "layout");
    }

    return NextResponse.json({
      success: true,
      revalidated: { paths, tags },
      now: Date.now(),
    });
  } catch {
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
