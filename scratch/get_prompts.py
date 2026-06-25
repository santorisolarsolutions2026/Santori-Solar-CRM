import json
import os

log_path = r"C:\Users\anish\.gemini\antigravity\brain\fcb32d73-8766-4fcf-bced-6ea30064effc\.system_generated\logs\transcript.jsonl"

prompts = []

if os.path.exists(log_path):
    with open(log_path, "r", encoding="utf-8") as f:
        for line in f:
            if not line.strip():
                continue
            try:
                data = json.loads(line)
                # User messages are typically type "USER_INPUT" or source "USER_EXPLICIT"
                if data.get("type") == "USER_INPUT" or data.get("source") == "USER_EXPLICIT":
                    content = data.get("content", "")
                    if content:
                        prompts.append(content)
            except Exception as e:
                pass

print(json.dumps(prompts, indent=2))
