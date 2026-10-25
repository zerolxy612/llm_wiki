"""Read-only credential check. Never prints the stored credential."""
import json
from pathlib import Path
import urllib.error
import urllib.request

settings = json.loads((Path.home() / "Library/Application Support/com.llmwiki.app/app-state.json").read_text())
config = settings.get("llmConfig", {})
key = config.get("apiKey", "")
request = urllib.request.Request(
    "https://openrouter.ai/api/v1/key",
    headers={"Authorization": "Bearer " + key},
)
try:
    with urllib.request.urlopen(request, timeout=20) as response:
        payload = json.load(response)
        print(json.dumps({"authStatus": response.status, "authenticated": bool(payload.get("data"))}))
except urllib.error.HTTPError as error:
    payload = error.read().decode("utf-8")
    if key:
        payload = payload.replace(key, "[redacted]")
    print(json.dumps({"authStatus": error.code, "error": payload[:350]}))
    raise SystemExit(1)

with urllib.request.urlopen("https://openrouter.ai/api/v1/models", timeout=20) as response:
    models = json.load(response).get("data", [])
    match = next((model for model in models if model["id"] == config.get("model")), None)
    print(json.dumps({"model": config.get("model"), "modelListed": bool(match), "contextLength": match.get("context_length") if match else None}))
