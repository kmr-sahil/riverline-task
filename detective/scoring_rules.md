# Call Evaluation Scoring Rules

Each transcript begins with a score of **100**.

The score is reduced based on failures detected by the judge.

---

## Phase Failures

Opening failure → -15 points  
Discovery failure → -20 points  
Negotiation failure → -25 points  
Closing failure → -15 points  

These penalties reflect the importance of the different stages of the conversation.

Negotiation carries the highest penalty because resolving the debt is the primary goal of the agent.

---

## Tone Violations

Each tone violation detected results in:

-10 points

Examples of tone violations:

- Threatening the borrower
- Harassment or repeated pressure
- Accusatory language
- Rude or disrespectful responses

---

## Score Limits

Final score is clamped between:

0 and 100

---

## Verdict Rule

After calculating the score:

Score ≥ 60 → **GOOD CALL**

Score < 60 → **BAD CALL**

---

## Output Requirements

For each call the evaluator should produce:

- Final score (0–100)
- Verdict (good / bad)
- Worst agent messages with explanation

---

## Determinism Requirement

The scoring logic must be deterministic.

This means:

- The judge only identifies failures and issues
- The Python evaluator calculates the final score using fixed rules