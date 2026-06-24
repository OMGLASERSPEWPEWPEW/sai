import { getCorsHeaders, jsonError } from "./cors.ts";
import { verifyAuth, type AuthResult } from "./auth.ts";

export interface HandlerParams {
  body: Record<string, unknown>;
  auth: AuthResult;
  cors: Record<string, string>;
  req: Request;
}

export function createHandler(
  name: string,
  handler: (params: HandlerParams) => Promise<Response>,
) {
  return async (req: Request): Promise<Response> => {
    const cors = getCorsHeaders(req);
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
    if (req.method !== "POST") return jsonError("Method not allowed", 405, cors);

    try {
      const auth = await verifyAuth(req);
      if (!auth) return jsonError("Authentication required", 401, cors);
      const body = await req.json();
      return await handler({ body, auth, cors, req });
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      console.error(`[${name}] unhandled:`, message);
      return jsonError("Internal server error", 500, cors);
    }
  };
}
