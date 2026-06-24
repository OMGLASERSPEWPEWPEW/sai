import { createHandler } from "../_shared/handler.ts";
import { jsonOk, jsonError } from "../_shared/cors.ts";

Deno.serve(createHandler("push-subscribe", async ({ body, auth: { db, userId }, cors }) => {
  const { subscription, action } = body as {
    subscription: { endpoint: string; keys?: { p256dh: string; auth: string } };
    action?: string;
  };

  if (action === "unsubscribe") {
    if (!subscription?.endpoint) return jsonError("Missing endpoint", 400, cors);
    await db.from("push_subscriptions").delete()
      .eq("user_id", userId).eq("endpoint", subscription.endpoint);
    return jsonOk({ ok: true }, cors);
  }

  if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
    return jsonError("Missing subscription data", 400, cors);
  }

  const { error } = await db.from("push_subscriptions").upsert({
    user_id: userId,
    endpoint: subscription.endpoint,
    keys_p256dh: subscription.keys.p256dh,
    keys_auth: subscription.keys.auth,
  }, { onConflict: "user_id,endpoint" });

  if (error) {
    console.error("[push-subscribe] upsert failed:", error);
    return jsonError("Failed to save subscription", 500, cors);
  }

  return jsonOk({ ok: true }, cors);
}));
