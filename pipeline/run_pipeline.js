import fs from "fs";
import path from "path";
import { simulateCall, saveSimulation } from "../surgeon/simulate_calls.js";
import { evaluateCall } from "../detective/evaluator.js";

// ---------------------------------------------------------------------------
// Load Prompt
// ---------------------------------------------------------------------------

function loadPrompt(promptPath) {
  return fs.readFileSync(promptPath, "utf-8");
}

// ---------------------------------------------------------------------------
// Load Transcripts
// ---------------------------------------------------------------------------

function loadTranscripts(folder) {
  const calls = [];

  const SKIP_FILES = new Set(["_manifest.json", "manifest.json"]);

  const files = fs.readdirSync(folder);

  for (const file of files) {
    if (file.endsWith(".json") && !SKIP_FILES.has(file)) {
      const content = fs.readFileSync(path.join(folder, file), "utf-8");
      calls.push(JSON.parse(content));
    }
  }

  return calls;
}

// ---------------------------------------------------------------------------
// Run Pipeline
// ---------------------------------------------------------------------------

export async function runPipeline(promptPath, transcriptFolder) {
  const prompt = loadPrompt(promptPath);
  const transcripts = loadTranscripts(transcriptFolder);

  const results = [];

  for (const call of transcripts) {
    const callId = call.call_id;

    console.log(`\nRunning ${callId}...`);

    const simulated = await simulateCall(prompt, call);

    const simFile = await saveSimulation(callId, simulated);

    const { score, issues, verdict } = await evaluateCall(simulated);

    results.push({
      call_id: callId,
      score,
      verdict,
      issues,
      simulation_file: simFile,
    });

    console.log(`Score: ${score} | Verdict: ${verdict}`);
  }

  return results;
}

// ---------------------------------------------------------------------------
// Generate Report
// ---------------------------------------------------------------------------

export function generateReport(results) {
  fs.mkdirSync("results", { recursive: true });

  const timestamp = new Date()
    .toISOString()
    .replace(/[-:]/g, "")
    .slice(0, 15);

  const avgScore =
    results.reduce((sum, r) => sum + r.score, 0) / results.length;

  const good = results.filter((r) => r.verdict === "good").length;
  const bad = results.filter((r) => r.verdict === "bad").length;

  const report = {
    average_score: avgScore,
    good_calls: good,
    bad_calls: bad,
    results,
  };

  const reportFile = `results/report_${timestamp}.json`;

  fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));

  console.log("\nPipeline Report");
  console.log("----------------");
  console.log("Average Score:", avgScore);
  console.log("Good Calls:", good);
  console.log("Bad Calls:", bad);
  console.log("Saved:", reportFile);
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

async function main() {
  const args = process.argv.slice(2);

  const promptIndex = args.indexOf("--prompt");
  const transcriptsIndex = args.indexOf("--transcripts");

  if (promptIndex === -1 || transcriptsIndex === -1) {
    console.error(
      "Usage: node runPipeline.js --prompt <prompt_file> --transcripts <folder>"
    );
    process.exit(1);
  }

  const promptPath = args[promptIndex + 1];
  const transcriptsFolder = args[transcriptsIndex + 1];

  const results = await runPipeline(promptPath, transcriptsFolder);

  generateReport(results);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}