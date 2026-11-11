import assert from "node:assert/strict";
import { InfraiClient, signupMarketplace } from "./marketplace_signup.ts";

class FakeClient extends InfraiClient {
  calls: Array<{ path: string; body: Record<string, unknown> }> = [];
  constructor() { super("test-key"); }
  override async request(path: string, body: Record<string, unknown>): Promise<unknown> {
    this.calls.push({ path, body });
    return path === "/v1/captcha/verify" ? { verified: true } : { user_id: "seller-42" };
  }
}

const client = new FakeClient();
const result = await signupMarketplace({
  email: "seller@example.com", password: "example-password", name: "Seller", captchaWidgetRecordId: "widget-42", captchaToken: "valid-token",
  ip: "203.0.113.10", sellerAsset: "notebook", buyerUpdate: "ready", orderHandoff: "fulfillment"
}, client);
assert.equal(result.userId, "seller-42");
assert.equal(result.sellerAsset, "notebook");
assert.deepEqual(client.calls.map((call) => call.path), ["/v1/captcha/verify", "/v1/auth/user/create"]);
assert.equal(client.calls[1].body.idempotency_key, "marketplace-signup:seller@example.com");
console.log("signup decision: captcha accepted, seller created, handoff retained");
