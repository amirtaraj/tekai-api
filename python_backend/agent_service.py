import json
import os
import sys
import urllib.request
import urllib.error
from typing import Any, Dict, List

DEFAULT_API_BASE_URL = "https://dummyjson.com"
API_BASE_URL = os.getenv("VITE_AGENT_API_BASE_URL", DEFAULT_API_BASE_URL)


def execute_request(req: Dict[str, Any]) -> Dict[str, Any]:
    method = req.get("method", "GET")
    url = req.get("url", "")
    headers = dict(req.get("headers") or {})
    body = req.get("body")

    if method not in {"GET", "DELETE"} and "content-type" not in {k.lower() for k in headers}:
        headers["content-type"] = "application/json"

    if not url.startswith(("http://", "https://")):
        path = url if url.startswith("/") else f"/{url}"
        path = map_path(path)
        target_url = f"{API_BASE_URL.rstrip('/')}{path}"
    else:
        target_url = url

    request = urllib.request.Request(target_url, data=None if method in {"GET", "DELETE"} else body.encode("utf-8") if isinstance(body, str) else None, headers=headers, method=method)
    try:
        with urllib.request.urlopen(request, timeout=20) as response:
            text = response.read().decode("utf-8")
            try:
                json_body = json.loads(text)
            except Exception:
                json_body = text
            headers_out = {k: v for k, v in response.headers.items()}
            return {
                "status": response.status,
                "statusText": response.reason,
                "durationMs": 0,
                "headers": headers_out,
                "body": json_body,
                "ok": 200 <= response.status < 400,
            }
    except urllib.error.HTTPError as exc:
        text = exc.read().decode("utf-8", errors="replace")
        try:
            json_body = json.loads(text)
        except Exception:
            json_body = text
        headers_out = {k: v for k, v in exc.headers.items()}
        return {
            "status": exc.code,
            "statusText": exc.reason,
            "durationMs": 0,
            "headers": headers_out,
            "body": json_body,
            "ok": False,
        }


def map_path(path: str) -> str:
    normalized = path.rstrip("/") or "/"
    if normalized == "/health":
        return "/health"
    if normalized == "/auth/login":
        return "/auth/login"
    if normalized in {"/orders"} or normalized.startswith("/orders/"):
        return normalized.replace("/orders", "/carts", 1)
    return normalized


def plan_from_prompt(prompt: str) -> List[Dict[str, Any]]:
    p = prompt.lower()
    steps: List[Dict[str, Any]] = [{"kind": "thought", "title": "Parse the user goal", "detail": f'Goal: "{prompt}"'}]
    intent = detect_intent(prompt)

    if intent["needsAuth"]:
        steps.append({"kind": "thought", "title": "Authenticate first to obtain a bearer token"})
        steps.append({
            "kind": "action",
            "title": "POST /auth/login",
            "detail": "Authenticate with demo credentials",
            "request": {
                "method": "POST",
                "url": "/auth/login",
                "headers": {"content-type": "application/json"},
                "body": json.dumps({"username": "emilys", "password": "emilyspass"}, indent=2),
            },
        })
        steps.append({"kind": "observation", "title": "Captured auth token from response", "detail": "Token stored in agent context as {{token}}"})

    steps.append({"kind": "thought", "title": f"Plan: {intent['method']} {intent['url']}", "detail": intent["reason"]})
    steps.append({
        "kind": "action",
        "title": f"{intent['method']} {intent['url']}",
        "detail": intent["actionDetail"],
        "request": {
            "method": intent["method"],
            "url": intent["url"],
            "headers": intent["headers"],
            "body": intent["body"],
        },
    })

    if intent["assertions"]:
        steps.append({
            "kind": "assertion",
            "title": "Validate response",
            "detail": f"{len(intent['assertions'])} criteria to check",
            "assertions": [{"id": f"a_{i}", "label": label, "status": "pending"} for i, label in enumerate(intent["assertions"])],
        })

    steps.append({"kind": "thought", "title": "Summarize results for the user", "detail": "All requested checks complete."})
    return steps


def detect_intent(prompt: str) -> Dict[str, Any]:
    p = prompt.lower()
    resource = "products" if "product" in p else "orders" if "order" in p else "posts" if "post" in p else "users" if "user" in p else "health"
    needs_auth = resource == "orders" or any(k in p for k in ["auth", "login", "token"])
    id_match = None
    import re
    id_match = re.search(r"id\s*[:#=]?\s*[\"']?([\w\-]+)[\"']?|\b(\d{2,})\b|\b(p_\d+|o_\d+)\b", prompt, re.I)
    id_value = id_match.group(1) if id_match and id_match.group(1) else (id_match.group(2) if id_match and id_match.group(2) else (id_match.group(3) if id_match and id_match.group(3) else None))

    if re.search(r"\b(create|add|new|post)\b", p) and resource != "health":
        body = extract_body_fields(prompt)
        return {
            "method": "POST",
            "url": f"/{resource}",
            "headers": {"content-type": "application/json", **({"authorization": "Bearer {{token}}"} if needs_auth else {})},
            "body": json.dumps(body, indent=2),
            "needsAuth": needs_auth,
            "reason": f"Create a new {singular(resource)} with the extracted fields.",
            "actionDetail": f"Body: {json.dumps(body)}",
            "assertions": ["Status code is 201", "Response body contains an 'id'", "Response time < 500ms"],
        }

    if re.search(r"\b(update|patch|modify|change|edit)\b", p) and resource != "health":
        method = "PATCH" if re.search(r"\bpatch\b", p) else "PUT"
        body = extract_body_fields(prompt)
        return {
            "method": method,
            "url": f"/{resource}/{id_value}" if id_value else f"/{resource}/1",
            "headers": {"content-type": "application/json", **({"authorization": "Bearer {{token}}"} if needs_auth else {})},
            "body": json.dumps(body, indent=2),
            "needsAuth": needs_auth,
            "reason": f"Update {singular(resource)} {id_value or '1'}.",
            "actionDetail": f"Body: {json.dumps(body)}",
            "assertions": ["Status code is 200", "Response body contains 'updated_at'", "Response time < 500ms"],
        }

    if re.search(r"\b(delete|remove|destroy)\b", p) and resource != "health":
        return {
            "method": "DELETE",
            "url": f"/{resource}/{id_value}" if id_value else f"/{resource}/1",
            "headers": {"authorization": "Bearer {{token}}"} if needs_auth else {},
            "needsAuth": needs_auth,
            "reason": f"Delete {singular(resource)} {id_value or '1'}.",
            "assertions": ["Status code is 204", "Response time < 500ms"],
        }

    if id_value and resource != "health":
        return {
            "method": "GET",
            "url": f"/{resource}/{id_value}",
            "headers": {"authorization": "Bearer {{token}}"} if needs_auth else {},
            "needsAuth": needs_auth,
            "reason": f"Fetch {singular(resource)} {id_value}.",
            "assertions": ["Status code is 200", "Response is a JSON object", "Response time < 500ms"],
        }

    return {
        "method": "GET",
        "url": f"/{resource}",
        "headers": {"authorization": "Bearer {{token}}"} if needs_auth else {},
        "needsAuth": needs_auth,
        "reason": f"List {resource}.",
        "actionDetail": f"List {resource}",
        "assertions": ["Status code is 200", "Response is a JSON array or object", "Response time < 500ms"],
        "body": None,
    }


def extract_body_fields(prompt: str) -> Dict[str, Any]:
    body: Dict[str, Any] = {}
    import re
    for match in re.finditer(r"\b([a-zA-Z_][a-zA-Z0-9_]*)\s*(?:=|:|is|to)\s*([\w\-\.]+)", prompt):
        body[match.group(1)] = match.group(2)
    return body or {"name": "demo", "value": 1}


def singular(word: str) -> str:
    return word[:-1] if word.endswith("s") else word


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "prompt is required"}))
        sys.exit(1)
    prompt = sys.argv[1]
    print(json.dumps({"plan": plan_from_prompt(prompt)}))
