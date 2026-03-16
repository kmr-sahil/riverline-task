import fs from "fs";
import path from "path";
import process from "process";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TRANSCRIPTS_DIR = "transcripts";

const API_KEY = process.env.GEMINI_API_KEY;

if (!API_KEY) {
  throw new Error("Please set GEMINI_API_KEY in the terminal.");
}

// ---------------------------------------------------------------------------
// Load Prompt
// ---------------------------------------------------------------------------

function loadPrompt() {
  const promptPath = path.join(__dirname, "judge_prompt.md");
  return fs.readFileSync(promptPath, "utf-8");
}

const SYSTEM_PROMPT = loadPrompt();

// ---------------------------------------------------------------------------
// Gemini Call
// ---------------------------------------------------------------------------

async function callGemini(prompt) {
  const data = {
    contents: [
      {
        parts: [{ text: prompt }],
      },
    ],
  };

  const response = await fetch(
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": API_KEY,
      },
      body: JSON.stringify(data),
    }
  );

  const result = await response.json();

  const text =
    result.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

  return text;
}

// ---------------------------------------------------------------------------
// Scoring
// ---------------------------------------------------------------------------

const PHASE_PENALTIES = {
  opening: 15,
  discovery: 20,
  negotiation: 25,
  closing: 15,
};

const TONE_PENALTY = 10;
const CRITICAL_PENALTY = 20;

function computeScore(judge) {
  let score = 100;

  for (const [phase, penalty] of Object.entries(PHASE_PENALTIES)) {
    if (!judge?.[phase]?.passed) {
      score -= penalty;
    }
  }

  score -= (judge?.tone_violations?.length || 0) * TONE_PENALTY;
  score -= (judge?.critical_failures?.length || 0) * CRITICAL_PENALTY;

  score = Math.max(0, Math.min(score, 100));

  const verdict = score >= 60 ? "good" : "bad";

  return [score, verdict];
}

// ---------------------------------------------------------------------------
// Transcript Judge
// ---------------------------------------------------------------------------

async function judgeTranscript(transcript) {
  const prompt = `${SYSTEM_PROMPT}

Evaluate this transcript:

${transcript}

Return JSON only.`;

  const responseText = await callGemini(prompt);

  let cleaned = responseText.trim();

  if (cleaned.startsWith("```")) {
    cleaned = cleaned.split("```", 3)[1];
    if (cleaned.startsWith("json")) {
      cleaned = cleaned.slice(4);
    }
    cleaned = cleaned.split("```")[0].trim();
  }

  try {
    return JSON.parse(cleaned);
  } catch (err) {
    console.log("Model returned invalid JSON:");
    console.log(responseText);
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Evaluate All Files
// ---------------------------------------------------------------------------

export async function evaluateAll() {
  const results = {};

  const SKIP_FILES = new Set(["_manifest.json", "manifest.json"]);

  const files = fs.readdirSync(TRANSCRIPTS_DIR).sort();

  for (const file of files) {
    if (SKIP_FILES.has(file)) {
      console.log(`\nSkipping ${file} (manifest — not a transcript)`);
      continue;
    }

    const filePath = path.join(TRANSCRIPTS_DIR, file);
    const transcript = fs.readFileSync(filePath, "utf-8");

    console.log(`\nEvaluating ${file}...`);

    try {
      const judge = await judgeTranscript(transcript);
      const [score, verdict] = computeScore(judge);

      const worst = (judge.worst_messages || []).map(
        (w) => `"${w.message}" — ${w.reason}`
      );

      results[file] = {
        score,
        worst_messages: worst,
        verdict,
      };

      console.log(`  Score:   ${score}`);
      console.log(`  Verdict: ${verdict}`);

      const crit = judge.critical_failures || [];

      if (crit.length) {
        console.log(`  Critical failures (${crit.length}):`);
        for (const c of crit) {
          console.log(`    [${c.type}] ${c.reason || ""}`);
        }
      }
    } catch (e) {
      console.log(`  Failed to evaluate ${file}: ${e}`);
      results[file] = { error: String(e) };
    }
  }

  const outputPath = "evaluation_results.json";

  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));

  console.log(`\nResults saved to ${outputPath}`);

  return results;
}

// ---------------------------------------------------------------------------
// Evaluate Conversation
// ---------------------------------------------------------------------------

export async function evaluateCall(conversation) {
  const transcript = [];

  for (const turn of conversation) {
    transcript.push({
      speaker: "customer",
      text: turn.customer,
    });

    transcript.push({
      speaker: "agent",
      text: turn.agent,
    });
  }

  const transcriptJson = JSON.stringify({ transcript }, null, 2);

  const judge = await judgeTranscript(transcriptJson);

  const [score, verdict] = computeScore(judge);

  const issues = (judge.worst_messages || []).map(
    (w) => `${w.message} — ${w.reason}`
  );

  return { score, issues, verdict };
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

if (process.argv[1] === __filename) {
  evaluateAll();
}