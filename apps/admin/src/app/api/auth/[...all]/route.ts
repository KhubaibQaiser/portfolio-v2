import { toNextJsHandler } from "better-auth/next-js";
import { getAuth } from "@/lib/auth";

type Handlers = ReturnType<typeof toNextJsHandler>;

let cached: Handlers | null = null;

async function handlers(): Promise<Handlers> {
  if (!cached) {
    cached = toNextJsHandler(await getAuth());
  }
  return cached;
}

export async function GET(request: Request) {
  const { GET: handler } = await handlers();
  return handler(request);
}

export async function POST(request: Request) {
  const { POST: handler } = await handlers();
  return handler(request);
}
