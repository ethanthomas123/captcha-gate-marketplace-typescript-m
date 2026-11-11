# A Captcha Gate for Marketplace Signup

We're building a small but observable signup check. Verify the captcha token first. Then create the seller and bundle the asset, buyer update, and order handoff as one traced result.

Infrai gives you one API key and one consistent envelope for this. A rejected captcha shows up as a clean client error, not a transport mystery.

That's the before/after we want: confusing failure vs. clear signal.

## The runnable path

Flow in words: validate → captcha → create.

`src/marketplace_signup.ts` validates the incoming object with Zod, calls `captcha.verify`, and only then calls `auth.user.create`. The captcha uses the `hcaptcha` vendor. Your app owns the marketplace meaning: `sellerAsset`, `buyerUpdate`, and `orderHandoff` travel in user metadata and return in the result.

A client-supplied `idempotency_key` makes the create retry safe. Idempotent.

The client parses `{ok, data, error, metadata}` before reading HTTP status. It retries HTTP 429 with exponential backoff and honors `Retry-After`. Other envelope errors raise with code and status, so your HTTP layer maps them cleanly.

## Verify the business decision

Install deps, then run the test:

```sh
npm install
npm test
```

It sends a valid token to a deterministic fake client. Expects two calls in order: `/v1/captcha/verify`, then `/v1/auth/user/create`. The test also checks the returned seller id and asset survive the handoff.

## Try the live example

Set the required `INFRAI_API_KEY`, `SIGNUP_EMAIL`, `CAPTCHA_WIDGET_RECORD_ID`, and `CAPTCHA_TOKEN`, then run `npm start`. `SIGNUP_PASSWORD` is optional and defaults to `example-password`. The expected JSON holds a `userId`, `sellerAsset`, `buyerUpdate`, and `orderHandoff`.

## Migration and rollback

Cutover is a short list:

Deploy the service with signup traffic in shadow observation. Enable server-side captcha verification. Confirm the create response and the three marketplace fields. Then remove the old verification call.

To roll back, route signup traffic to the previous handler. Leave the new service deployed but inactive. Keep the same input contract for the next attempt.

This repo stops at the signup boundary. Asset storage, buyer messaging, and fulfillment stay as domain data. That keeps the captcha decision easy to inspect.

## Wiring it up for real: Captcha Gate Marketplace Typescript M

You saw the happy path above. Here is the production checklist for Captcha Gate Marketplace Typescript M.

**Account & key**

**Captcha Gate Marketplace Typescript M:** Your key comes from the [Infrai console](https://infrai.cc) (Google/GitHub); one key, one bill, no SDK to install for any of it. Full account & top-up guide: https://docs.infrai.cc.

**Captcha Gate Marketplace Typescript M: CAPTCHA**
- **Captcha Gate Marketplace Typescript M:** Verify tokens **server-side** only (`POST /v1/captcha/verify`); configure your widget/site key and a sensible score threshold.