"""Export only this experiment's fixed questions from local chat history."""
import json
import re
from pathlib import Path

root = Path(__file__).resolve().parents[1]
experiment = root / "experiment"
questions = json.loads((experiment / "questions.json").read_text())
metadata = json.loads((experiment / "evidence/openrouter-check.json").read_text())
records = []
for file in sorted((experiment / "knowledge-base/.llm-wiki/chats").glob("*.json")):
    messages = json.loads(file.read_text())
    for index, message in enumerate(messages):
        if message.get("role") != "user":
            continue
        question = next((q for q in questions if message.get("content", "").startswith(q["question"])), None)
        if question is None:
            continue
        answer = next((m for m in messages[index + 1:] if m.get("role") == "assistant"), None)
        if answer is None:
            continue
        records.append({
            "questionId": question["id"],
            "question": question["question"],
            "prompt": message["content"],
            "retrievalMode": "faithful" if "原文对照" in message["content"] else "standard",
            "conversationId": message.get("conversationId"),
            "answer": answer.get("content", ""),
            "retrievedReferences": answer.get("references", []),
            "inlineCitations": re.findall(r"\[\[([^\]|]+)(?:\|[^\]]+)?\]\]", answer.get("content", "")),
            "toolIterationLimitReached": "tool-iteration limit" in answer.get("content", ""),
            "toolProtocolRejections": sum("Invalid or truncated Agent tool JSON" in str(step.get("message", "")) for step in answer.get("agentSteps", [])),
            "expectedPoints": question["expected"],
        })
records.sort(key=lambda item: (int(item["questionId"][1:]), item["retrievalMode"]))
report = {
    "model": metadata["model"],
    "maxContextSize": metadata["maxContextSize"],
    "scope": "Native desktop Agent, fixed synthetic corpus, web search off, embeddings disabled. Retrieved references do not by themselves prove that each reference was cited or supports the answer. Human review is recorded separately.",
    "records": records,
}
(experiment / "evidence/qa-results.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n")
print(json.dumps({"completedQuestions": sorted({r["questionId"] for r in records}), "answers": len(records)}))
