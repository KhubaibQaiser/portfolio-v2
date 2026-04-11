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

    if (tags) {
      for (const tag of tags) {
        revalidateTag(tag);
      }
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
