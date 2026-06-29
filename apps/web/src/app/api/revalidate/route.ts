import { NextResponse } from "next/server";
import { getRevalidateSecret } from "@portfolio/ai/load-api-keys";
import { revalidateContentCache } from "@/lib/revalidate-content-cache";
import { logger } from "@/lib/logger";
import { toError } from "@/lib/to-error";

export async function POST(request: Request) {
  try {
    const secret = request.headers.get("x-revalidate-secret");
    const expectedSecret = await getRevalidateSecret();

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

    const result = await revalidateContentCache({ tags, paths });

    if (!result.success) {
      return NextResponse.json(result, { status: 500 });
    }

    return NextResponse.json({
      ...result,
      now: Date.now(),
    });
  } catch (error) {
    logger.error("revalidate api failed", { error: toError(error) });
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
