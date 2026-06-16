from __future__ import annotations

import json
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path
from urllib.parse import urlparse

from .drafting import build_draft
from .freshness import summarize_freshness


ROOT = Path(__file__).resolve().parents[3]
SEED_PATH = ROOT / "apps" / "web" / "data" / "seed-data.json"


def load_seed_data() -> dict:
    return json.loads(SEED_PATH.read_text(encoding="utf-8"))


class Handler(BaseHTTPRequestHandler):
    def _send(self, payload: dict, status: int = 200) -> None:
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self) -> None:
        seed = load_seed_data()
        path = urlparse(self.path).path

        if path == "/health":
            self._send({"ok": True, "mode": "mock"})
            return

        if path == "/freshness":
            self._send(summarize_freshness(seed["knowledgeArticles"]))
            return

        if path.startswith("/drafts/"):
            ticket_id = path.rsplit("/", 1)[-1]
            ticket = next((item for item in seed["tickets"] if item["id"] == ticket_id), None)
            if not ticket:
                self._send({"error": "ticket not found"}, 404)
                return
            self._send(build_draft(ticket, seed["knowledgeArticles"], seed["policy"]))
            return

        self._send({"error": "not found"}, 404)

    def log_message(self, _format: str, *_args: object) -> None:
        return


def main() -> None:
    server = HTTPServer(("0.0.0.0", 8080), Handler)
    server.serve_forever()


if __name__ == "__main__":
    main()
