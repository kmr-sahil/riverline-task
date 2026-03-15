import os
import json
import urllib.request

TRANSCRIPTS_DIR = "transcripts"

API_KEY = os.environ.get("GEMINI_API_KEY")

if not API_KEY:
    raise ValueError("Please set GEMINI_API_KEY in the terminal.")


def load_prompt():
    base_dir = os.path.dirname(__file__)
    prompt_path = os.path.join(base_dir, "judge_prompt.md")

    with open(prompt_path, "r", encoding="utf-8") as f:
        return f.read()


SYSTEM_PROMPT = load_prompt()


def call_gemini(prompt):
    data = {
        "contents": [
            {
                "parts": [
                    {"text": prompt}
                ]
            }
        ]
    }

    req = urllib.request.Request(
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent",
        data=json.dumps(data).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            "x-goog-api-key": API_KEY
        },
        method="POST"
    )

    with urllib.request.urlopen(req) as response:
        result = json.loads(response.read())

    text = result["candidates"][0]["content"]["parts"][0]["text"]
    return text


# ---------------------------------------------------------------------------
# Scoring
# ---------------------------------------------------------------------------
# Phase penalties
PHASE_PENALTIES = {
    "opening":     15,
    "discovery":   20,
    "negotiation": 25,
    "closing":     15,
}

# Tone violation penalty (per violation)
TONE_PENALTY = 10

# Critical failure penalty (per failure)
CRITICAL_PENALTY = 20


def compute_score(judge):
    score = 100

    # Phase failures
    for phase, penalty in PHASE_PENALTIES.items():
        if not judge.get(phase, {}).get("passed", True):
            score -= penalty

    # Tone violations
    score -= len(judge.get("tone_violations", [])) * TONE_PENALTY

    # Critical failures (new — each one costs 20 pts)
    score -= len(judge.get("critical_failures", [])) * CRITICAL_PENALTY

    score = max(0, min(score, 100))

    verdict = "good" if score >= 60 else "bad"

    return score, verdict


# ---------------------------------------------------------------------------
# Per-file evaluation
# ---------------------------------------------------------------------------

def judge_transcript(transcript):
    prompt = f"""{SYSTEM_PROMPT}

Evaluate this transcript:

{transcript}

Return JSON only."""

    response_text = call_gemini(prompt)

    # Strip markdown code fences if present
    cleaned = response_text.strip()
    if cleaned.startswith("```"):
        cleaned = cleaned.split("```", 2)[1]
        if cleaned.startswith("json"):
            cleaned = cleaned[4:]
        cleaned = cleaned.rsplit("```", 1)[0]
        cleaned = cleaned.strip()

    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        print("Model returned invalid JSON:")
        print(response_text)
        raise


# ---------------------------------------------------------------------------
# Main loop
# ---------------------------------------------------------------------------

def evaluate_all():
    results = {}

    # Files to skip — not real transcripts
    SKIP_FILES = {"_manifest.json", "manifest.json"}

    for file in sorted(os.listdir(TRANSCRIPTS_DIR)):

        if file in SKIP_FILES:
            print(f"\nSkipping {file} (manifest — not a transcript)")
            continue

        path = os.path.join(TRANSCRIPTS_DIR, file)

        with open(path, "r", encoding="utf-8") as f:
            transcript = f.read()

        print(f"\nEvaluating {file}...")

        try:
            judge = judge_transcript(transcript)
            score, verdict = compute_score(judge)

            worst = [
                f'"{w["message"]}" — {w["reason"]}'
                for w in judge.get("worst_messages", [])
            ]

            results[file] = {
                "score": score,
                "worst_messages": worst,
                "verdict": verdict,
            }

            print(f"  Score:   {score}")
            print(f"  Verdict: {verdict}")

            crit = judge.get("critical_failures", [])
            if crit:
                print(f"  Critical failures ({len(crit)}):")
                for c in crit:
                    print(f"    [{c.get('type')}] {c.get('reason','')}")

        except Exception as e:
            print(f"  Failed to evaluate {file}: {e}")
            results[file] = {"error": str(e)}

    output_path = "evaluation_results.json"
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2, ensure_ascii=False)

    print(f"\nResults saved to {output_path}")
    return results


if __name__ == "__main__":
    evaluate_all()

def evaluate_call(conversation):

    transcript = []

    for turn in conversation:
        transcript.append({
            "speaker": "customer",
            "text": turn["customer"]
        })

        transcript.append({
            "speaker": "agent",
            "text": turn["agent"]
        })

    transcript_json = json.dumps({"transcript": transcript}, indent=2)

    judge = judge_transcript(transcript_json)

    score, verdict = compute_score(judge)

    issues = [
        f'{w["message"]} — {w["reason"]}'
        for w in judge.get("worst_messages", [])
    ]

    return score, issues, verdict