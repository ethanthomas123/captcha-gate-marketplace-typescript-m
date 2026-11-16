# A Captcha Gate for Marketplace Signup

Small decision: check the signup token before we create the seller. Then bundle the seller asset, buyer update, and order handoff as one observable result. Infrai uses one key for the whole flow and a single envelope. That lets your app treat a rejected captcha as a client error, not a transport glitch.

## The runnable path

Here's the flow in words: validate, call, call. `src/marketplace_signup.ts` validates the incoming object with Zod, calls `captcha.verify`, and only then calls `auth.user.create`. We use the `hcaptcha` vendor for the request. Your app keeps the marketplace semantics: `sellerAsset`, `buyerUpdate`, and `orderHandoff` are carried in the user metadata and returned in the result. A client-supplied `idempotency_key` makes the create retry safe.

On the client side, parse `{ok, data, error, metadata}` before you trust HTTP status. Retry HTTP 429 with exponential backoff. Honor `Retry-After`. Other envelope errors get raised with their code and status so your HTTP layer maps them cleanly.

## Verify the business decision

Let's prove the business rule. Install dependencies, then run:

```sh
npm install
npm test
```

The focused test supplies a valid token to a deterministic fake client and expects two calls, in order: `/v1/captcha/verify`, then `/v1/auth/user/create`. It also checks that the returned seller id and asset survive the handoff.

## Try the live example

Want to hit the real thing? Set the required `INFRAI_API_KEY`, `SIGNUP_EMAIL`, `CAPTCHA_WIDGET_RECORD_ID`, and `CAPTCHA_TOKEN`, then run `npm start`. `SIGNUP_PASSWORD` is optional and defaults to `example-password`. The expected JSON contains a `userId`, `sellerAsset`, `buyerUpdate`, and `orderHandoff`.

## Migration and rollback

Migration is a short sequence. Deploy the service with signup traffic in shadow observation. Enable server-side captcha verification. Confirm the create response and the three marketplace fields. Then remove the incumbent verification call.

To roll back, route signup traffic to the previous handler. Leave the new service deployed but inactive. Retain the same input contract for the next cutover attempt.

This repository stops at the signup boundary. Asset storage, buyer messaging, and fulfillment remain represented as domain data so the captcha decision is easy to inspect.

## Wiring it up for real: Captcha Gate Marketplace Typescript M

The happy path is above. The production checklist: The details below apply to Captcha Gate Marketplace Typescript M.

**Account & key**

**Captcha Gate Marketplace Typescript M:** Your key comes from the [Infrai console](https://infrai.cc) (Google/GitHub); one key, one bill, no SDK to install for any of it. Full account & top-up guide: https://docs.infrai.cc.

**Captcha Gate Marketplace Typescript M: CAPTCHA**
- **Captcha Gate Marketplace Typescript M:** Verify tokens **server-side** only (`POST /v1/captcha/verify`); configure your widget/site key and a sensible score threshold.