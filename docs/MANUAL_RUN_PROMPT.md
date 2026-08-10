# Reusable Codex run prompt

This is a manually invoked prompt. It is not installed as a cron job or recurring task.

```text
Work inside /Users/decimalsols/Documents/Rando/content-factory.

Create exactly one new general-audience English explainer episode for the next unused E#### slot. Score candidates with config/topic-scoring.json and choose a low-risk everyday-science or design question from config/topic-queue.json. Reject any question that duplicates an existing slug or normalized question. Do not cover medicine, legal advice, personal finance, politics, breaking news, graphic harm, celebrity rumors, or a question already used.

Use templates/research-brief.md and templates/storyboard.md. Browse current primary, government, standards, or institutional sources. Create episode.json and research.md with sentence-to-claim and claim-to-source mapping, original 100–145 word narration at or below estimated grade 10.5, materially topic-specific scenes, publishing metadata, disclosure, and rights coverage for visuals, narration, and typography. Do not copy source wording, download third-party media, use music, call a paid API, or imitate a person's voice.

Run npm test, npm run typecheck, episode validation, and the complete episode release command. Inspect the thumbnail and a contact sheet from at least six timestamps. If text is clipped, a fact is weak, sources conflict, QA fails, or the video is too repetitive, fix it and rerun.

Stop after producing a passing staged release. Never log into a platform, upload, schedule, publish, alter payout settings, or make a video public. Report the episode question, sources, duration, QA result, and absolute output/E#### paths for human approval.
```

The speech renderer may require permission to run outside a restricted sandbox. Run this prompt manually whenever another episode is wanted.
