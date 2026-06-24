export const ALLOWED_ORIGINS = [
  "http://localhost:5203",
  "http://localhost:5173",
  "https://mindshare-sai.vercel.app",
];

export function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("Origin") ?? "";
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : "";
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey, x-client-info",
    Vary: "Origin",
  };
}

export function jsonOk(data: Record<string, unknown>, cors: Record<string, string>): Response {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

export function jsonError(message: string, status: number, cors: Record<string, string>): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}
