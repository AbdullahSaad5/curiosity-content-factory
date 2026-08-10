# Publishing runbook

The factory stops at a staged release because only the account owner can complete identity, payout, tax, channel, and Page onboarding. These are one-time account actions, not content-generation work.

## One-time setup

### YouTube

1. Create or select the channel and complete verification/security steps.
2. Complete YouTube Partner Program and AdSense onboarding when the channel becomes eligible.
3. Confirm the channel country, audience setting, permissions, and payout/tax details.
4. Keep the channel About section transparent: original, researched visual explainers; diagrams and narration are produced for the channel.

### Facebook

1. Create or select a Page/professional profile and enable two-factor authentication.
2. Complete monetization eligibility and payout onboarding when offered.
3. Confirm Page access. Meta documents that Facebook or task access can manage content and monetization workflows in Business Suite: [Page access](https://www.facebook.com/help/289207354498410/).

## Release procedure

1. Open `output/E####/publishing-checklist.md` and complete every item.
2. Use `youtube-short/metadata.json` or `facebook-reel/metadata.json` as copy-ready metadata; do not invent a more sensational title during upload.
3. Upload the video, captions, and thumbnail from the matching platform folder.
4. Keep the upload private or a draft while platform copyright/ad-suitability processing finishes.
5. Verify that the processed video is sharp, the audio plays, captions align, and no unexpected claim or restriction appeared.
6. Schedule only after those checks pass.

YouTube Studio supports scheduled publishing from a private video: [official scheduling instructions](https://support.google.com/youtube/answer/1270709). Meta Business Suite supports Page scheduling and currently limits scheduled posts to a window from 20 minutes to 29 days: [official Facebook instructions](https://www.facebook.com/help/389849807718635).

## Recommended cadence

- Start with two Shorts/Reels per week for six weeks.
- Schedule the same master separately on YouTube and Facebook; never download a watermarked copy from one platform for the other.
- Do not increase volume until at least twelve materially distinct episodes prove the format is retaining viewers.
- Do not delete weak performers immediately; they provide useful audience data.

## Metrics loop

After 48 hours and again after 7 days, record:

- views;
- viewed-versus-swiped-away or initial retention when available;
- average percentage viewed;
- average view duration;
- likes, shares, comments, and follows/subscribers attributed to the video;
- country mix;
- any restriction, copyright, or monetization notice.

Use the data to change one variable at a time. Low initial retention suggests the hook/title/first frame. A strong start with an early drop suggests pacing or explanation clarity. High completion but low reach does not justify changing the factual core; test packaging and topic selection first.

Never promise revenue or optimize only for raw views. Monetization access, recommendation traffic, RPM, and payout are controlled by each platform.

## Incident rules

- Copyright claim: keep the item private, inspect the exact claimant/asset, and do not dispute unless the rights ledger clearly supports the dispute.
- Factual error: unpublish or correct promptly; add the correction to the research ledger.
- Platform strike or disclosure warning: stop scheduled releases until the policy issue is understood.
- Compromised account: revoke sessions, rotate credentials, and do not let an automation retry publishing.
