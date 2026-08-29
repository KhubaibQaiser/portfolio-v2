import { toNextJsHandler } from "better-auth/next-js";
import { NextResponse } from "next/server";
import { getAuth } from "@/lib/auth";
import { logRouteError } from "@/lib/log-route-error";

type Handlers = ReturnType<typeof toNextJsHandler>;

let cached: Handlers | null = null;

async function handlers(): Promise<Handlers> {
  if (!cached) {
    cached = toNextJsHandler(await getAuth());
  }
  return cached;
}

export async function GET(request: Request) {
  try {
    const { GET: handler } = await handlers();
    return handler(request);
  } catch (error) {
    logRouteError("GET /api/auth failed", error);
    return NextResponse.json({ error: "Authentication failed" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { POST: handler } = await handlers();
    return handler(request);
  } catch (error) {
    logRouteError("POST /api/auth failed", error);
    return NextResponse.json({ error: "Authentication failed" }, { status: 500 });
  }
}
