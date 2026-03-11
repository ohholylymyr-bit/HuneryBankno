#!/usr/bin/env python3
from __future__ import annotations

import cgi
import json
import os
import random
import re
import shutil
import time
from dataclasses import dataclass
from difflib import SequenceMatcher
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Dict, List
from urllib.parse import urlparse

BASE_DIR = Path(__file__).parent
DATA_DIR = BASE_DIR / "data"
UPLOAD_DIR = DATA_DIR / "uploads"
KB_PATH = DATA_DIR / "knowledge_base.json"
STATIC_DIR = BASE_DIR / "static"

DEFAULT_TOPICS = {
    "physics": {
        "summary": "Physics studies matter, energy, motion, and forces in the universe.",
        "details": (
            "Key branches include mechanics, electromagnetism, thermodynamics, optics, and modern physics. "
            "Newton's laws describe motion, while conservation laws describe how quantities like energy remain constant in closed systems."
        ),
    },
    "biology": {
        "summary": "Biology is the science of living organisms and life processes.",
        "details": (
            "Core areas include cell biology, genetics, ecology, and evolution. "
            "Cells are the basic units of life, DNA carries hereditary information, and natural selection drives evolutionary change."
        ),
    },
    "mathematics": {
        "summary": "Mathematics explores numbers, structures, patterns, and logical reasoning.",
        "details": (
            "Main areas include arithmetic, algebra, geometry, calculus, and statistics. "
            "It provides tools for modeling real-world phenomena and solving scientific, engineering, and economic problems."
        ),
    },
}


def tokenize(text: str) -> List[str]:
    return [w for w in re.findall(r"[a-zA-Z0-9']+", text.lower()) if len(w) > 1]


@dataclass
class MatchResult:
    topic: str
    score: float


class KnowledgeBase:
    def __init__(self, path: Path):
        self.path = path
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self.data = self._load_or_init()

    def _load_or_init(self) -> Dict[str, Dict[str, str]]:
        if self.path.exists():
            with self.path.open("r", encoding="utf-8") as f:
                return json.load(f)
        seed = {
            "topics": {
                k: {
                    "summary": v["summary"],
                    "details": v["details"],
                    "source": "system-seed",
                    "updated_at": int(time.time()),
                }
                for k, v in DEFAULT_TOPICS.items()
            }
        }
        self._atomic_save(seed)
        return seed

    def _atomic_save(self, payload: Dict) -> None:
        tmp = self.path.with_suffix(".tmp")
        with tmp.open("w", encoding="utf-8") as f:
            json.dump(payload, f, indent=2, ensure_ascii=False)
        tmp.replace(self.path)

    def save(self) -> None:
        self._atomic_save(self.data)

    def teach(self, topic: str, content: str) -> Dict[str, str]:
        topic_key = topic.strip().lower()
        summary = content.strip().split(".")[0].strip()
        if not summary:
            summary = f"{topic.strip()} is an educational topic."
        item = {
            "summary": summary,
            "details": content.strip(),
            "source": "user",
            "updated_at": int(time.time()),
        }
        self.data.setdefault("topics", {})[topic_key] = item
        self.save()
        return item

    def get_topic(self, topic_key: str) -> Dict[str, str] | None:
        return self.data.get("topics", {}).get(topic_key.lower())

    def list_topics(self) -> List[str]:
        return sorted(self.data.get("topics", {}).keys())


class AIVoraEngine:
    def __init__(self, kb: KnowledgeBase):
        self.kb = kb

    def best_match(self, query: str) -> MatchResult | None:
        topics = self.kb.data.get("topics", {})
        if not topics:
            return None
        q_tokens = set(tokenize(query))
        best: MatchResult | None = None
        for topic, payload in topics.items():
            combined = f"{topic} {payload.get('summary','')} {payload.get('details','')}"
            t_tokens = set(tokenize(combined))
            overlap = len(q_tokens & t_tokens)
            coverage = overlap / max(1, len(q_tokens))
            seq = SequenceMatcher(None, query.lower(), combined.lower()).ratio()
            score = (coverage * 0.75) + (seq * 0.25)
            if best is None or score > best.score:
                best = MatchResult(topic=topic, score=score)
        return best

    def ask(self, question: str) -> Dict[str, str]:
        match = self.best_match(question)
        if match is None or match.score < 0.12:
            return {
                "answer": "I don't have enough knowledge yet. Use Teach to add this topic to AIvora.",
                "topic": "unknown",
                "confidence": 0,
            }
        topic = self.kb.get_topic(match.topic) or {}
        answer = (
            f"Topic match: {match.topic.title()}\n\n"
            f"Summary: {topic.get('summary','No summary')}\n\n"
            f"Details: {topic.get('details','No details available.')}"
        )
        return {
            "answer": answer,
            "topic": match.topic,
            "confidence": round(match.score, 3),
        }

    def quiz(self, topic_name: str, count: int = 5) -> List[Dict[str, str]]:
        match = self.best_match(topic_name)
        if not match:
            return []
        topic = self.kb.get_topic(match.topic)
        if not topic:
            return []
        sentences = [s.strip() for s in re.split(r"(?<=[.!?])\s+", topic["details"]) if s.strip()]
        prompts = []
        for i, sent in enumerate(sentences[:count], start=1):
            key_words = tokenize(sent)
            hidden = key_words[0] if key_words else "concept"
            q_text = re.sub(hidden, "_____", sent, count=1, flags=re.IGNORECASE) if key_words else sent
            prompts.append({
                "question": f"Q{i}: Fill in the blank: {q_text}",
                "answer": hidden,
            })
        while len(prompts) < count:
            prompts.append({
                "question": f"Q{len(prompts)+1}: Explain one core idea in {match.topic.title()}.",
                "answer": topic["summary"],
            })
        random.shuffle(prompts)
        return prompts

    def flashcards(self, topic_name: str, count: int = 6) -> List[Dict[str, str]]:
        match = self.best_match(topic_name)
        if not match:
            return []
        topic = self.kb.get_topic(match.topic)
        if not topic:
            return []
        facts = [s.strip() for s in re.split(r"(?<=[.!?])\s+", topic["details"]) if s.strip()]
        cards = []
        for i, fact in enumerate(facts[:count], start=1):
            cards.append({
                "front": f"Flashcard {i}: {match.topic.title()} concept",
                "back": fact,
            })
        if not cards:
            cards.append({"front": f"What is {match.topic.title()}?", "back": topic["summary"]})
        return cards


class RequestHandler(BaseHTTPRequestHandler):
    kb = KnowledgeBase(KB_PATH)
    engine = AIVoraEngine(kb)

    def _json(self, payload: Dict, code: int = HTTPStatus.OK):
        body = json.dumps(payload).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(body)

    def _serve_static(self, rel_path: str):
        rel_path = rel_path.lstrip("/") or "index.html"
        target = STATIC_DIR / rel_path
        if not target.resolve().is_file() or STATIC_DIR not in target.resolve().parents and target.resolve() != STATIC_DIR / "index.html":
            self.send_error(HTTPStatus.NOT_FOUND)
            return
        ctype = "text/plain"
        if target.suffix == ".html":
            ctype = "text/html; charset=utf-8"
        elif target.suffix == ".css":
            ctype = "text/css; charset=utf-8"
        elif target.suffix == ".js":
            ctype = "application/javascript; charset=utf-8"
        with target.open("rb") as f:
            data = f.read()
        self.send_response(HTTPStatus.OK)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def do_OPTIONS(self):
        self.send_response(HTTPStatus.NO_CONTENT)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Access-Control-Allow-Methods", "GET,POST,OPTIONS")
        self.end_headers()

    def do_GET(self):
        parsed = urlparse(self.path)
        if parsed.path == "/api/topics":
            self._json({"topics": self.kb.list_topics()})
            return
        if parsed.path == "/health":
            self._json({"status": "ok"})
            return
        if parsed.path == "/" or parsed.path.startswith("/static"):
            rel = parsed.path[1:]
            if rel.startswith("static/"):
                rel = rel[len("static/"):]
            self._serve_static(rel or "index.html")
            return
        self.send_error(HTTPStatus.NOT_FOUND)

    def _read_json(self) -> Dict:
        length = int(self.headers.get("Content-Length", "0"))
        raw = self.rfile.read(length) if length > 0 else b"{}"
        return json.loads(raw.decode("utf-8"))

    def do_POST(self):
        parsed = urlparse(self.path)
        if parsed.path == "/api/ask":
            data = self._read_json()
            question = data.get("question", "").strip()
            if not question:
                self._json({"error": "question is required"}, HTTPStatus.BAD_REQUEST)
                return
            self._json(self.engine.ask(question))
            return

        if parsed.path == "/api/teach":
            data = self._read_json()
            topic = data.get("topic", "").strip()
            content = data.get("content", "").strip()
            if not topic or not content:
                self._json({"error": "topic and content are required"}, HTTPStatus.BAD_REQUEST)
                return
            stored = self.kb.teach(topic, content)
            self._json({"message": f"Learned topic '{topic}'.", "topic": stored})
            return

        if parsed.path == "/api/quiz":
            data = self._read_json()
            topic = data.get("topic", "").strip()
            count = int(data.get("count", 5))
            if not topic:
                self._json({"error": "topic is required"}, HTTPStatus.BAD_REQUEST)
                return
            quiz = self.engine.quiz(topic, max(1, min(count, 10)))
            self._json({"topic": topic, "quiz": quiz})
            return

        if parsed.path == "/api/flashcards":
            data = self._read_json()
            topic = data.get("topic", "").strip()
            count = int(data.get("count", 6))
            if not topic:
                self._json({"error": "topic is required"}, HTTPStatus.BAD_REQUEST)
                return
            cards = self.engine.flashcards(topic, max(1, min(count, 12)))
            self._json({"topic": topic, "flashcards": cards})
            return

        if parsed.path == "/api/upload":
            ctype, pdict = cgi.parse_header(self.headers.get("content-type", ""))
            if ctype != "multipart/form-data":
                self._json({"error": "multipart/form-data expected"}, HTTPStatus.BAD_REQUEST)
                return
            form = cgi.FieldStorage(
                fp=self.rfile,
                headers=self.headers,
                environ={"REQUEST_METHOD": "POST", "CONTENT_TYPE": self.headers.get("content-type")},
            )
            file_item = form["file"] if "file" in form else None
            if not file_item or not getattr(file_item, "filename", ""):
                self._json({"error": "file is required"}, HTTPStatus.BAD_REQUEST)
                return
            UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
            safe_name = re.sub(r"[^a-zA-Z0-9._-]", "_", os.path.basename(file_item.filename))
            stamp = int(time.time())
            out_path = UPLOAD_DIR / f"{stamp}_{safe_name}"
            with out_path.open("wb") as fout:
                shutil.copyfileobj(file_item.file, fout)
            self._json({"message": "Upload stored successfully", "file": str(out_path.relative_to(BASE_DIR))})
            return

        self.send_error(HTTPStatus.NOT_FOUND)


def run() -> None:
    host = "0.0.0.0"
    port = int(os.environ.get("PORT", "8000"))
    server = ThreadingHTTPServer((host, port), RequestHandler)
    print(f"AIvora backend running at http://{host}:{port}")
    server.serve_forever()


if __name__ == "__main__":
    run()
