## Rewarded Ads → +20 Tokens

Add a "Watch Ad" flow that credits +20 tokens to the signed-in user's wallet after a completed ad view, with a 10-minute server-enforced cooldown.

### Provider reality check

You picked AdSense / Adinplay. Important caveat:
- **AdSense for content does not have a "rewarded video" format for regular websites.** Rewarded video on the web only exists via AdSense **H5 Games Ads**, which requires an HTML5 game site and Google approval.
- **Adinplay** is a game-publisher network — same story, needs an approved gaming site.
- Your app is a photo-rating tool, so neither will approve/serve rewarded video today.

Recommended path: build the full backend + UI now against a **placeholder ad player** (a 15s countdown modal that fires a completion event). When/if you get approved with a real rewarded network later, we swap only the client-side ad SDK call — the server, cooldown, and crediting stay identical. This is the same architecture real rewarded systems use, so nothing is throwaway.

### What gets built

**1. Backend: new edge function `claim-ad-reward`**
- Verifies the user's JWT (same pattern as `get-wallet`).
- Reads `token_wallets` for that `user_id`.
- Server-enforced 10-minute cooldown using a new column `last_ad_reward_at` on `token_wallets`. If `now - last_ad_reward_at < 10 min`, returns `{ error: "cooldown", remainingMs }` and credits nothing.
- Otherwise: `tokens = tokens + 20`, sets `last_ad_reward_at = now()`, returns new balance + next-available time.
- All wallet math runs with the service role key server-side — the client cannot set tokens directly (RLS already blocks that, and we won't add an "update tokens" policy).

**2. DB migration**
- Add `last_ad_reward_at timestamptz` (nullable) to `token_wallets`. No policy changes needed.

**3. Frontend**
- New `RewardedAdModal.tsx`: opens on "Watch Ad" click, shows a 15s countdown "ad" (placeholder video/animation, non-skippable). On complete, calls `claim-ad-reward` and shows the new balance / cooldown message.
- New "Watch Ad" button in the header of `src/pages/Index.tsx`, next to "Buy tokens". Disabled with a countdown label while cooldown is active.
- `useWallet` hook: expose `adCooldownMs` returned from `get-wallet` so the button can render the remaining time without an extra request. Update `get-wallet` to also return `last_ad_reward_at` / `adCooldownMs`.

### Anti-cheat (why this is safe)

- Client cannot mint tokens: writes go only through the edge function, which uses the service role key. RLS on `token_wallets` allows the client to read its own row but never update `tokens`.
- Cooldown is enforced on the server against `last_ad_reward_at`, not a client timer — refreshing the page, opening incognito, or calling the function directly can't bypass it (wallets are per authenticated user).
- Function is idempotent within the cooldown window: repeat calls just return the same `cooldown` response.
- When a real rewarded SDK is added, replace the placeholder with a provider callback that gives a signed reward token; the edge function then verifies that token before crediting. Same DB, same cooldown logic.

### Files touched

```text
supabase/functions/claim-ad-reward/index.ts   (new)
supabase/functions/get-wallet/index.ts        (return adCooldownMs)
src/hooks/useWallet.ts                        (expose adCooldownMs)
src/components/RewardedAdModal.tsx            (new)
src/pages/Index.tsx                           (Watch Ad button + modal)
migration: add token_wallets.last_ad_reward_at
```

### Out of scope
- Real ad-network integration and approval (blocked on you getting into an eligible network).
- Daily caps (only 10-min cooldown per your answer).