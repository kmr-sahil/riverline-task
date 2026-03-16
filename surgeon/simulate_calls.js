import fs from "fs";
import process from "process";

const API_KEY = process.env.GEMINI_API_KEY;

if (!API_KEY) {
  throw new Error("Please set GEMINI_API_KEY");
}

const MODEL_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent";

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

  const response = await fetch(MODEL_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": API_KEY,
    },
    body: JSON.stringify(data),
  });

  const result = await response.json();

  return result.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
}

// ---------------------------------------------------------------------------
// Replace Placeholders
// ---------------------------------------------------------------------------

function replacePlaceholders(prompt, customer = {}) {
  const replacements = {
    "{{customer_name}}": customer.name || "Customer",
    "{{pending_amount}}": customer.pending_amount || "fifty thousand",
    "{{closure_amount}}": customer.closure_amount || "thirty five thousand",
    "{{settlement_amount}}":
      customer.settlement_amount || "twenty five thousand",
    "{{dpd}}": customer.dpd || "180",
    "{{pos}}": customer.closure_amount || "thirty five thousand",
    "{{tos}}": customer.pending_amount || "fifty thousand",
    "{{due_date}}": "next week",
    "{{today_date}}": "today",
    "{{today_day}}": "Monday",
    "{{loan_id}}": "12345",
    "{{lender_name}}": "DemoLender",
  };

  for (const [placeholder, value] of Object.entries(replacements)) {
    prompt = prompt.replaceAll(placeholder, value);
  }

  return prompt;
}

// ---------------------------------------------------------------------------
// Simulate Call
// ---------------------------------------------------------------------------

export async function simulateCall(prompt, transcript) {
  const customer = transcript.customer || {};

  prompt = replacePlaceholders(prompt, customer);

  const borrowerMessages = transcript.transcript
    .filter((t) => t.speaker === "customer")
    .map((t) => t.text);

  const conversation = [];

  let context = prompt + "\n\nYou are continuing a phone call.";

  for (const msg of borrowerMessages) {
    const llmPrompt = `
${context}

Customer: ${msg}

Agent:
`;

    const reply = await callGemini(llmPrompt);

    conversation.push({
      customer: msg,
      agent: reply.trim(),
    });

    context += `\nCustomer: ${msg}\nAgent: ${reply}`;
  }

  return conversation;
}

// ---------------------------------------------------------------------------
// Save Simulation
// ---------------------------------------------------------------------------

export function saveSimulation(callId, conversation) {
  fs.mkdirSync("restimulated_outputs", { recursive: true });

  const timestamp = new Date()
    .toISOString()
    .replace(/[-:]/g, "")
    .slice(0, 15);

  const filename = `restimulated_outputs/${callId}_${timestamp}.json`;

  fs.writeFileSync(filename, JSON.stringify(conversation, null, 2));

  return filename;
}