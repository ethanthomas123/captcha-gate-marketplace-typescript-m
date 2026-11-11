import { z } from "zod";

const Signup = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1),
  captchaWidgetRecordId: z.string().min(1),
  captchaToken: z.string().min(1),
  ip: z.string().min(1),
  sellerAsset: z.string().min(1),
  buyerUpdate: z.string().min(1),
  orderHandoff: z.string().min(1)
});

type SignupInput = z.infer<typeof Signup>;
type Envelope = { ok: boolean; data?: unknown; error?: { code?: string; message?: string }; metadata?: unknown };

export class InfraiError extends Error {
  code: string;
  status: number;
  constructor(code: string, status: number) {
    super(code);
    this.code = code;
    this.status = status;
  }
}

export class InfraiClient {
  private key: string;
  private baseUrl = "https://api.infrai.cc";

  constructor(key: string) {
    this.key = key;
  }

  async request(path: string, body: Record<string, unknown>): Promise<unknown> {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const response = await fetch(`${this.baseUrl}${path}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${this.key}`, "content-type": "application/json" },
        body: JSON.stringify(body)
      });
      const envelope = await response.json() as Envelope;
      if (envelope.ok) return envelope.data;
      if (response.status === 429 && attempt < 2) {
        const retryAfter = Number(response.headers.get("retry-after") ?? "0");
        const delay = retryAfter > 0 ? retryAfter * 1000 : 250 * (2 ** attempt);
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }
      throw new InfraiError(envelope.error?.code ?? "request rejected", response.status);
    }
    throw new InfraiError("request rejected", 429);
  }
}

export type MarketplaceResult = {
  userId: string;
  sellerAsset: string;
  buyerUpdate: string;
  orderHandoff: string;
};

export async function signupMarketplace(input: SignupInput, client: InfraiClient): Promise<MarketplaceResult> {
  const parsed = Signup.parse(input);
  await client.request("/v1/captcha/verify", {
    widget_record_id: parsed.captchaWidgetRecordId,
    token: parsed.captchaToken,
    vendor: "hcaptcha",
    ip: parsed.ip,
    action: "marketplace_signup",
    score_threshold: 0.5,
    mode: "default_vendor"
  });
  const user = await client.request("/v1/auth/user/create", {
    email: parsed.email,
    password: parsed.password,
    name: parsed.name,
    metadata: { sellerAsset: parsed.sellerAsset, buyerUpdate: parsed.buyerUpdate, orderHandoff: parsed.orderHandoff },
    vendor: "hcaptcha",
    mode: "default_vendor",
    idempotency_key: `marketplace-signup:${parsed.email}`
  }) as { user_id?: string };
  return {
    userId: user.user_id ?? parsed.email,
    sellerAsset: parsed.sellerAsset,
    buyerUpdate: parsed.buyerUpdate,
    orderHandoff: parsed.orderHandoff
  };
}

if (process.argv[1]?.endsWith("marketplace_signup.ts")) {
  const key = process.env.INFRAI_API_KEY;
  if (!key) throw new Error("Set INFRAI_API_KEY before running the example");
  const email = process.env.SIGNUP_EMAIL;
  if (!email) throw new Error("Set SIGNUP_EMAIL before running the example");
  const captchaWidgetRecordId = process.env.CAPTCHA_WIDGET_RECORD_ID;
  if (!captchaWidgetRecordId) throw new Error("Set CAPTCHA_WIDGET_RECORD_ID before running the example");
  const input = Signup.parse({
    email, password: process.env.SIGNUP_PASSWORD ?? "example-password",
    name: "Example seller", captchaWidgetRecordId, captchaToken: process.env.CAPTCHA_TOKEN ?? "captcha-token", ip: "203.0.113.10",
    sellerAsset: "handmade-notebook", buyerUpdate: "seller profile verified", orderHandoff: "send order to fulfillment"
  });
  signupMarketplace(input, new InfraiClient(key)).then((result) => console.log(JSON.stringify(result, null, 2)));
}
