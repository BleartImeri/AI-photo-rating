
## Real Rewarded Ads via AdGate Media

Replace the fake 15-second countdown with AdGate Media's real rewarded video SDK. Tokens are credited only when AdGate's server sends a signed postback to our backend confirming a real ad view.

### How AdGate actually works (why this design)

AdGate Media is an offerwall/rewarded-video network. The verification flow is 100% server-to-server (S2S) — the browser cannot forge a completion:

1. Client loads AdGate's SDK/iframe with a `userid` (our Supabase `user.id`) and our AdGate `wall_code`.
2. User watches a real rewarded video served by AdGate.
3. When AdGate's servers confirm the view, AdGate calls **our postback URL** with `?userid=...&payout=...&transaction_id=...&hash=...` where `hash = MD5(transaction_id + secret_key)`.
4. Our postback edge function verifies the hash, checks the `transaction_id` hasn't been used before, and credits 20 tokens.

The user's browser is never the source of truth. No timer, no client-triggered reward.

### What gets built

**1. Signup + credentials (user-side, done in parallel to build)**
- User signs up at adgatemedia.com as a Publisher, adds their site, creates a "Rewarded Video" wall, and shares:
  - `ADGATE_WALL_CODE` (public, safe in frontend)
  - `ADGATE_POSTBACK_SECRET` (private signing key — stored via `add_secret`)
- Site approval typically takes 1–3 business days; the code works the moment the wall is approved.

**2. New public edge function: `adgate-postback`**
- Deployed with `verify_jwt = false` (AdGate's servers call it, no user JWT).
- Reads `userid`, `payout`, `transaction_id`, `hash` from query params.
- Recomputes `MD5(transaction_id + ADGATE_POSTBACK_SECRET)` and compares — rejects with 403 on mismatch.
- Looks up `user_id = userid`. If the `transaction_id` already exists in a new `ad_rewards` table, returns 200 (idempotent — AdGate retries).
- Otherwise: inserts the transaction, credits +20 tokens to `token_wallets`, updates `last_ad_reward_at`. Returns `1` (AdGate's expected ack).

**3. DB migration: new `ad_rewards` table**
- `transaction_id text primary key`, `user_id uuid`, `payout numeric`, `tokens_awarded int`, `created_at timestamptz`.
- Primary key on `transaction_id` guarantees no double-crediting even under concurrent retries.
- RLS: users can `SELECT` their own rows; only service role writes. Explicit GRANTs for `authenticated` (select) and `service_role` (all).

**4. Frontend: real AdGate SDK, no timer**
- `RewardedAdModal.tsx` rewritten:
  - Deletes the 15-second countdown and the client-side call to `claim-ad-reward`.
  - Loads AdGate's rewarded-video iframe: `https://wall.adgatemedia.com/show/video/<WALL_CODE>?userid=<user.id>`.
  - After the iframe closes / signals completion, the modal simply polls `get-wallet` (or subscribes via Supabase realtime on `token_wallets`) to detect the postback-triggered token increase, then shows "+20 tokens" and closes.
  - Nothing in the modal grants tokens.
- `AD_DURATION`, `completedRef`, `claimReward()` and the direct `claim-ad-reward` invocation are removed.

**5. Retire `claim-ad-reward`**
- The old function granted tokens on a client-triggered call (fake timer). Delete it so no fake path exists.
- Keep `last_ad_reward_at` cooldown logic, but move enforcement into `adgate-postback` (server rejects a second reward within 10 minutes for the same user, returning 200 without crediting so AdGate stops retrying).

**6. Secrets**
- `ADGATE_POSTBACK_SECRET` — requested via `add_secret` after the user confirms they have their AdGate account.
- `ADGATE_WALL_CODE` — public; stored as a plain env var `VITE_ADGATE_WALL_CODE` in `.env` (safe, appears in the iframe URL anyway).

### Anti-cheat properties

- Tokens only move when a request arrives at `adgate-postback` with a valid HMAC signed by `ADGATE_POSTBACK_SECRET`, which only AdGate's servers know.
- Every reward is keyed by AdGate's `transaction_id`; replays are rejected by the primary-key constraint.
- Incognito, refresh, devtools, direct `curl` to the function — none can produce a valid hash.
- Client code contains zero token-granting logic.

### Files touched

```text
supabase/functions/adgate-postback/index.ts   (new, verify_jwt=false)
supabase/functions/claim-ad-reward/           (delete)
supabase/config.toml                          (verify_jwt=false for adgate-postback)
src/components/RewardedAdModal.tsx            (rewrite — real iframe, wallet polling)
src/pages/Index.tsx                           (no functional change; button still opens modal)
.env                                          (add VITE_ADGATE_WALL_CODE placeholder)
migration:  create table ad_rewards + RLS + grants
secret:     ADGATE_POSTBACK_SECRET (via add_secret after your signup)
```

### What you need to do

1. Sign up as a Publisher at **adgatemedia.com**, submit your site for approval, and create a **Rewarded Video** wall.
2. Once approved, send me your **Wall Code** and paste your **Postback Secret** into the secure form I'll open.
3. In your AdGate dashboard, set the **Postback URL** to the `adgate-postback` function URL I'll give you after deploy, with `?userid={userid}&payout={payout}&transaction_id={transaction_id}&hash={hash}` appended.

Until approval, the "Watch ad" button will open the real AdGate wall but AdGate will show "no ads available" — that's expected and stops the moment your site is live in their network.

### Out of scope
- Fallback to a second ad network if AdGate has no fill.
- Frequency capping beyond the existing 10-minute cooldown.
