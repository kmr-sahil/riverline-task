# System Prompt Flaw Analysis

## Flaw 1 — Language Switch Has No Trigger Instruction
`switch_language` exists as a function but the prompt never says *when* to call it. The agent improvises, continuing in English or producing garbled mixed-language output.

**Proof — call_02, call_07:** Agent kept speaking English after explicit Hindi/Tamil requests. When it attempted Hindi it output: `"Theek नमस्ते, hai, main aapke आपके saath..."` — garbled and unusable.

**Fix:** Add a mandatory rule to the global prompt: call `switch_language()` immediately on the first sign of a non-English language, before the next sentence.

---

## Flaw 2 — Anti-Repetition Rule Is Too Broad for Voice
The prompt says `"NEVER repeat the same phrase twice"`. In voice, borrowers frequently say "what?", ask for clarification, or re-ask the same question. This rule forces the agent to rephrase awkwardly or — worse — rush through phases to avoid repeating itself.

**Proof — call_10:** Only 9 turns. Agent jumped discovery → negotiation → closing with no real engagement. Borrower was evasive but agent gave up instead of re-explaining or probing.

**Fix:** Narrow the rule to forbid repeating the same *scripted line verbatim in the same turn*. Explicitly allow re-explaining amounts or offers when the borrower asks or seems confused.

---

## Flaw 3 — Loop Threshold Too High, No Concrete Exit Action
Both Discovery and Negotiation allow "5–6 circular exchanges" before moving on. That's too many, and neither phase specifies *what to do* when stuck — just "move to the next phase."

**Proof — call_03:** 105 turns, ~15 minutes. Borrower repeatedly said they already paid. Agent kept asking "what should we do?" with no concrete step. Never asked for a UTR or offered an email for proof.

**Fix:** Cut the threshold to 3 exchanges. Add specific exit actions per scenario: ask for UTR/screenshot, offer support@demolender.com, or pin down a callback date.

---

## Summary

| # | Flaw | Calls Affected | Fix |
|---|------|----------------|-----|
| 1 | No language switch trigger | call_02, call_07 | Mandate `switch_language()` on first non-English signal |
| 2 | Anti-repetition rule too broad | call_10 | Allow re-explaining when borrower is confused; only ban verbatim same-turn repeats |
| 3 | Loop threshold 5–6, no exit action | call_03, call_09, call_10 | Cap at 3, add concrete per-scenario exit steps |