import os
import json
import urllib.request
from datetime import datetime

API_KEY = os.environ.get("GEMINI_API_KEY")

if not API_KEY:
    raise ValueError("Please set GEMINI_API_KEY")


MODEL_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent"


def call_gemini(prompt):

    data = {
        "contents": [
            {
                "parts": [{"text": prompt}]
            }
        ]
    }

    req = urllib.request.Request(
        MODEL_URL,
        data=json.dumps(data).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            "x-goog-api-key": API_KEY
        },
        method="POST"
    )

    with urllib.request.urlopen(req) as response:
        result = json.loads(response.read())

    return result["candidates"][0]["content"]["parts"][0]["text"]


def replace_placeholders(prompt, customer):
    replacements = {
        "{{customer_name}}": customer.get("name", "Customer"),
        "{{pending_amount}}": customer.get("pending_amount", "fifty thousand"),
        "{{closure_amount}}": customer.get("closure_amount", "thirty five thousand"),
        "{{settlement_amount}}": customer.get("settlement_amount", "twenty five thousand"),
        "{{dpd}}": customer.get("dpd", "180"),
        "{{pos}}": customer.get("closure_amount", "thirty five thousand"),
        "{{tos}}": customer.get("pending_amount", "fifty thousand"),
        "{{due_date}}": "next week",
        "{{today_date}}": "today",
        "{{today_day}}": "Monday",
        "{{loan_id}}": "12345",
        "{{lender_name}}": "DemoLender"
    }
    for placeholder, value in replacements.items():
        prompt = prompt.replace(placeholder, value)
    return prompt


def simulate_call(prompt, transcript):

    customer = transcript.get("customer", {})
    prompt = replace_placeholders(prompt, customer)

    borrower_messages = [
        t["text"]
        for t in transcript["transcript"]
        if t["speaker"] == "customer"
    ]

    conversation = []

    context = prompt + "\n\nYou are continuing a phone call."

    for msg in borrower_messages:

        llm_prompt = f"""
{context}

Customer: {msg}

Agent:
"""

        reply = call_gemini(llm_prompt)

        conversation.append({
            "customer": msg,
            "agent": reply.strip()
        })

        context += f"\nCustomer: {msg}\nAgent: {reply}"

    return conversation


def save_simulation(call_id, conversation):

    os.makedirs("restimulated_outputs", exist_ok=True)

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")

    filename = f"restimulated_outputs/{call_id}_{timestamp}.json"

    with open(filename, "w", encoding="utf-8") as f:
        json.dump(conversation, f, indent=2, ensure_ascii=False)

    return filename