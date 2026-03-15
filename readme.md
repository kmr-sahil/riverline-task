# The Prompt Autopsy

Prompt Engineering Intern Assignment – Riverline

This project analyzes failures in a debt-collection AI voice agent and improves the system through:

1. **Call evaluation framework**
2. **Prompt debugging and fixes**
3. **Reusable prompt testing pipeline**

The work was done step-by-step, and each part can run independently.

---

# Repository Structure

```
your-repo/
├── README.md
├── system-prompt-fixed.md
│
├── detective/        # Part 1 — transcript evaluator
├── surgeon/          # Part 2 — prompt debugging & fixes
├── pipeline/         # Part 3 — reusable evaluation pipeline
│
└── results/          # generated outputs
```

---

# Setup

Export your API key before running the scripts.

```bash
export GEMINI_API_KEY=your_key
```

Python version used: **Python 3.10+**

Install dependencies if required:

```bash
pip install requests
```

---

# Part 1 — The Detective

Goal: build a **deterministic evaluator** for call transcripts.

Each transcript is scored from **0–100** based on failures detected during the conversation.

## Scoring Rules

Each call starts with **100 points**.

### Phase Failures

Opening failure → -15
Discovery failure → -20
Negotiation failure → -25
Closing failure → -15

Negotiation carries the highest penalty because resolving the debt is the primary goal.

### Tone Violations

Each tone violation → **-10**

Examples:

* Threatening the borrower
* Harassment or repeated pressure
* Accusatory language
* Disrespectful responses

### Final Verdict

Score ≥ 60 → **GOOD CALL**
Score < 60 → **BAD CALL**

### Output

For each transcript the evaluator returns:

* Final score
* Verdict (good / bad)
* Worst agent messages with explanations

### Determinism

The **LLM only identifies failures**.
The **Python evaluator calculates the score deterministically** using fixed rules.

This ensures the evaluation logic can be reproduced.

---

## Run Part 1

```
python detective/evaluator.py
```

This will:

* Evaluate all transcripts
* Produce scores for each call
* Compare predictions with `verdicts.json`

Outputs are written to the `results/` folder.

---

# Part 2 — The Surgeon

Goal: identify failures in the **system prompt** and fix them.

Steps performed:

1. Analyzed the system prompt against the failing transcripts.
2. Identified several prompt design flaws causing agent failures.
3. Wrote an improved prompt:

```
system-prompt-fixed.md
```

4. Selected **3 bad calls**.
5. Re-simulated them using borrower messages and the fixed prompt.
6. Generated **before vs after comparisons**.

Outputs are stored in:

```
surgeon/
├── flaw_analysis.md
├── system-prompt-fixed.md
```

The goal was to check whether the **prompt fixes address the root causes of failures**.

---

# Part 3 — The Architect

Goal: convert the manual process into a **reusable prompt testing pipeline**.

The pipeline allows testing **any system prompt** against a set of transcripts.

## Run Pipeline

```
python pipeline/run_pipeline.py --prompt system-prompt.md --transcripts transcripts/
```

### Pipeline Steps

1. Load prompt and transcripts
2. Simulate agent responses using the prompt
3. Score conversations using the Part 1 evaluator
4. Generate a report including:

   * per-call scores
   * verdicts
   * aggregate performance

This allows quick comparison between prompt versions.

---

# Design Decisions

### Deterministic scoring

To avoid randomness from LLM outputs:

* LLM identifies issues
* Python performs the final scoring

### Phase-aware evaluation

Calls follow the structure:

```
Opening → Discovery → Negotiation → Closing
```

Later stages (especially negotiation) carry higher penalties.

### Modular architecture

Each component is independent:

* **Detective** → evaluation logic
* **Surgeon** → prompt debugging and fixes
* **Pipeline** → automated prompt testing

---

# Key Findings

The original system prompt had structural issues that led to agent failures, including:

* unclear phase transitions
* weak guidance for objection handling
* tone control gaps

These caused behaviors such as:

* overly aggressive negotiation
* skipping discovery steps
* incomplete call closures

The revised prompt improves:

* phase control
* borrower interaction quality
* tone safety

Re-simulation of bad calls shows improved agent responses.

---

# What I'd Improve With More Time

If extended further, I would:

* add automated prompt improvement suggestions
* attempt to reduce token sizes
* improve the scoring model with multiple judges

---