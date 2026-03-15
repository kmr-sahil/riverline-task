import os
import json
import argparse
from datetime import datetime

from surgeon.simulate_calls import simulate_call, save_simulation
from detective.evaluator import evaluate_call


def load_prompt(prompt_path):
    with open(prompt_path, "r", encoding="utf-8") as f:
        return f.read()


def load_transcripts(folder):

    calls = []

    # Files to skip — not real transcripts
    SKIP_FILES = {"_manifest.json", "manifest.json"}

    for file in os.listdir(folder):

        if file.endswith(".json") and file not in SKIP_FILES:

            with open(os.path.join(folder, file), "r", encoding="utf-8") as f:
                calls.append(json.load(f))

    return calls


def run_pipeline(prompt_path, transcript_folder):

    prompt = load_prompt(prompt_path)
    transcripts = load_transcripts(transcript_folder)

    results = []

    for call in transcripts:

        call_id = call["call_id"]

        print(f"\nRunning {call_id}...")

        simulated = simulate_call(prompt, call)

        sim_file = save_simulation(call_id, simulated)

        score, issues, verdict = evaluate_call(simulated)

        results.append({
            "call_id": call_id,
            "score": score,
            "verdict": verdict,
            "issues": issues,
            "simulation_file": sim_file
        })

        print(f"Score: {score} | Verdict: {verdict}")

    return results


def generate_report(results):

    os.makedirs("results", exist_ok=True)

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")

    avg_score = sum(r["score"] for r in results) / len(results)

    good = sum(1 for r in results if r["verdict"] == "good")
    bad = sum(1 for r in results if r["verdict"] == "bad")

    report = {
        "average_score": avg_score,
        "good_calls": good,
        "bad_calls": bad,
        "results": results
    }

    report_file = f"results/report_{timestamp}.json"

    with open(report_file, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2, ensure_ascii=False)

    print("\nPipeline Report")
    print("----------------")
    print("Average Score:", avg_score)
    print("Good Calls:", good)
    print("Bad Calls:", bad)
    print("Saved:", report_file)


if __name__ == "__main__":

    parser = argparse.ArgumentParser()

    parser.add_argument("--prompt", required=True)
    parser.add_argument("--transcripts", required=True)

    args = parser.parse_args()

    results = run_pipeline(args.prompt, args.transcripts)

    generate_report(results)