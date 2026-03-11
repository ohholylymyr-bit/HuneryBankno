#!/usr/bin/env python3
import json
import os
import re
import uuid
from datetime import datetime
from http import HTTPStatus
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse

BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
UPLOAD_DIR = BASE_DIR / "uploads"
STATIC_DIR = BASE_DIR / "static"
KB_PATH = DATA_DIR / "knowledge_base.json"


class KnowledgeBase:
    """Persistent educational knowledge base with lightweight semantic matching."""

    def __init__(self, path: Path):
        self.path = path
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self._data = self._load_or_seed()

    @staticmethod
    def _seed_data():
        now = datetime.utcnow().isoformat() + "Z"
        return {
            "meta": {
                "name": "AIvora Knowledge Base",
                "version": "1.0",
                "created_at": now,
                "updated_at": now,
            },
            "topics": {
                "physics": {
                    "title": "Physics Fundamentals",
                    "content": (
                        "Physics studies matter, energy, motion, and forces. "
                        "Core areas include mechanics, electromagnetism, thermodynamics, "
                        "optics, and modern physics. Newton's laws describe motion, while "
                        "energy conservation states energy cannot be created or destroyed."
                    ),
                    "tags": ["science", "motion", "energy", "forces"],
                    "created_at": now,
                    "updated_at": now,
                    "teach_count": 1,
                },
                "biology": {
                    "title": "Biology Fundamentals",
                    "content": (
                        "Biology explores living organisms, from cells to ecosystems. "
                        "Cell theory says all organisms are made of cells. Genetics explains "
                        "inheritance through DNA. Evolution describes how populations change "
                        "over generations by natural selection."
                    ),
                    "tags": ["science", "cells", "genetics", "evolution"],
                    "created_at": now,
                    "updated_at": now,
                    "teach_count": 1,
                },
                "mathematics": {
                    "title": "Mathematics Fundamentals",
                    "content": (
                        "Mathematics is the study of patterns, structure, and quantity. "
                        "Algebra uses symbols to solve equations, geometry studies shapes and "
                        "space, and calculus analyzes change through derivatives and integrals. "
                        "Problem-solving and logical reasoning are central skills."
                    ),
                    "tags": ["numbers", "algebra", "geometry", "calculus", "logic"],
                    "created_at": now,
                    "updated_at": now,
                    "teach_count": 1,
                },
            },
            "uploads": [],
        }

    def _load_or_seed(self):
        if not self.path.exists():
            data = self._seed_data()
            self._write(data)
            return data

        try:
            with self.path.open("r", encoding="utf-8") as f:
                return json.load(f)
        except (json.JSONDecodeError, OSError):
            data = self._seed_data()
            self._write(data)
            return data

    def _write(self, data=None):
        payload = data if data is not None else self._data
        payload["meta"]["updated_at"] = datetime.utcnow().isoformat() + "Z"
        tmp_path = self.path.with_suffix(".tmp")
        with tmp_path.open("w", encoding="utf-8") as f:
            json.dump(payload, f, indent=2, ensure_ascii=False)
        tmp_path.replace(self.path)

    @staticmethod
    def _slug(value: str):
        slug = re.sub(r"[^a-z0-9]+", "-", value.strip().lower()).strip("-")
        return slug or f"topic-{uuid.uuid4().hex[:8]}"

    @staticmethod
    def _tokenize(text: str):
        return re.findall(r"[a-zA-Z0-9']+", text.lower())

    @staticmethod
    def _sentences(text: str):
        parts = re.split(r"(?<=[.!?])\s+", text.strip())
        return [part.strip() for part in parts if part.strip()]

    def _topic_document(self, topic):
        return " ".join([topic["title"], topic["content"], " ".join(topic.get("tags", []))])

    def _score(self, query_tokens, topic):
        doc_tokens = self._tokenize(self._topic_document(topic))
        if not doc_tokens:
            return 0.0
        doc_set = set(doc_tokens)
        overlap = sum(1 for token in query_tokens if token in doc_set)
        phrase_bonus = 0.0
        query_text = " ".join(query_tokens)
        if query_text and query_text in self._topic_document(topic).lower():
            phrase_bonus = 1.5
        unique_query = len(set(query_tokens)) or 1
        return (overlap / unique_query) + phrase_bonus

    def _best_topic_entry(self, query: str):
        query_tokens = self._tokenize(query)
        if not query_tokens:
            return None, None, 0.0
        best_key = None
        best_topic = None
        best_score = 0.0
        for key, topic in self._data["topics"].items():
            score = self._score(query_tokens, topic)
            if score > best_score:
                best_score = score
                best_key = key
                best_topic = topic
        return best_key, best_topic, best_score

    def ask(self, query: str):
        key, topic, score = self._best_topic_entry(query)
        if not topic or score < 0.25:
            return {
                "answer": (
                    "I don't have a confident answer yet. Use Teach to add this topic, "
                    "and I'll remember it permanently."
                ),
                "confidence": 0.0,
                "matched_topic": None,
            }

        sentences = self._sentences(topic["content"])
        query_tokens = set(self._tokenize(query))
        ranked = sorted(
            sentences,
            key=lambda s: sum(1 for token in query_tokens if token in self._tokenize(s)),
            reverse=True,
        )
        summary = " ".join(ranked[:2]) if ranked else topic["content"]
        guidance = "Would you like a quiz or flashcards on this topic?"
        return {
            "answer": f"{summary} {guidance}",
            "confidence": round(min(score / 3, 1.0), 2),
            "matched_topic": {"key": key, "title": topic["title"]},
        }

    def teach(self, title: str, content: str, tags=None):
        tags = tags or []
        slug = self._slug(title)
        now = datetime.utcnow().isoformat() + "Z"
        if slug in self._data["topics"]:
            self._data["topics"][slug]["content"] += "\n" + content.strip()
            merged_tags = set(self._data["topics"][slug].get("tags", [])) | set(tags)
            self._data["topics"][slug]["tags"] = sorted(merged_tags)
            self._data["topics"][slug]["updated_at"] = now
            self._data["topics"][slug]["teach_count"] = self._data["topics"][slug].get("teach_count", 1) + 1
        else:
            self._data["topics"][slug] = {
                "title": title.strip(),
                "content": content.strip(),
                "tags": sorted(set(tags)),
                "created_at": now,
                "updated_at": now,
                "teach_count": 1,
            }
        self._write()
        return {"topic_key": slug, "topic": self._data["topics"][slug]}

    def _resolve_topic(self, query_or_key: str):
        if query_or_key in self._data["topics"]:
            return query_or_key, self._data["topics"][query_or_key]
        return self._best_topic_entry(query_or_key)[:2]

    def quiz(self, query_or_key: str, count: int = 5):
        key, topic = self._resolve_topic(query_or_key)
        if not topic:
            return None
        sentences = self._sentences(topic["content"])
        questions = []
        for idx, sentence in enumerate(sentences[:count], start=1):
            words = self._tokenize(sentence)
            focus = next((w for w in words if len(w) > 6), words[0] if words else "concept")
            prompt = f"Q{idx}. Explain the role of '{focus}' in {topic['title']}."
            answer = f"Sample answer: {sentence}"
            questions.append({"question": prompt, "answer": answer})
        while len(questions) < count:
            n = len(questions) + 1
            questions.append(
                {
                    "question": f"Q{n}. Give one real-world application of {topic['title']}.",
                    "answer": f"Sample answer: Any practical example connected to {topic['title']} is acceptable.",
                }
            )
        return {"topic": {"key": key, "title": topic["title"]}, "questions": questions}

    def flashcards(self, query_or_key: str, count: int = 6):
        key, topic = self._resolve_topic(query_or_key)
        if not topic:
            return None
        sentences = self._sentences(topic["content"])
        cards = []
        for sentence in sentences:
            words = self._tokenize(sentence)
            if not words:
                continue
            keyword = next((w for w in words if len(w) > 6), words[0])
            cards.append(
                {
                    "front": f"Define or explain: {keyword}",
                    "back": sentence,
                }
            )
            if len(cards) >= count:
                break
        return {"topic": {"key": key, "title": topic["title"]}, "flashcards": cards}

    def register_upload(self, original_name: str, saved_name: str, size_bytes: int):
        entry = {
            "id": uuid.uuid4().hex,
            "original_name": original_name,
            "saved_name": saved_name,
            "size_bytes": size_bytes,
            "uploaded_at": datetime.utcnow().isoformat() + "Z",
        }
        self._data["uploads"].append(entry)
        self._write()
        return entry

    def topics_overview(self):
        return [
            {
                "key": key,
                "title": topic["title"],
                "tags": topic.get("tags", []),
                "teach_count": topic.get("teach_count", 1),
            }
            for key, topic in sorted(self._data["topics"].items())
        ]


kb = KnowledgeBase(KB_PATH)
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


class AIvoraHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(STATIC_DIR), **kwargs)

    def _json_response(self, payload, status=HTTPStatus.OK):
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _read_json_body(self):
        length = int(self.headers.get("Content-Length", "0"))
        raw = self.rfile.read(length) if length else b"{}"
        try:
            return json.loads(raw.decode("utf-8"))
        except json.JSONDecodeError:
            return None

    def do_GET(self):
        parsed = urlparse(self.path)
        if parsed.path == "/health":
            self._json_response({"status": "ok", "service": "AIvora"})
            return
        if parsed.path == "/topics":
            self._json_response({"topics": kb.topics_overview()})
            return
        if parsed.path.startswith("/uploads/"):
            upload_path = (UPLOAD_DIR / Path(parsed.path).name).resolve()
            if upload_path.exists() and upload_path.parent == UPLOAD_DIR.resolve():
                self.path = str(upload_path)
                return SimpleHTTPRequestHandler.do_GET(self)
            self.send_error(HTTPStatus.NOT_FOUND, "File not found")
            return
        return super().do_GET()

    def do_POST(self):
        parsed = urlparse(self.path)
        if parsed.path in {"/ask", "/teach", "/quiz", "/flashcards"}:
            data = self._read_json_body()
            if data is None:
                self._json_response({"error": "Invalid JSON body"}, status=HTTPStatus.BAD_REQUEST)
                return

        if parsed.path == "/ask":
            query = (data.get("question") or "").strip()
            if not query:
                self._json_response({"error": "question is required"}, status=HTTPStatus.BAD_REQUEST)
                return
            self._json_response(kb.ask(query))
            return

        if parsed.path == "/teach":
            title = (data.get("title") or "").strip()
            content = (data.get("content") or "").strip()
            tags = data.get("tags") or []
            if isinstance(tags, str):
                tags = [tag.strip() for tag in tags.split(",") if tag.strip()]
            if not title or not content:
                self._json_response({"error": "title and content are required"}, status=HTTPStatus.BAD_REQUEST)
                return
            result = kb.teach(title, content, tags)
            self._json_response({"message": "Topic learned successfully", **result})
            return

        if parsed.path == "/quiz":
            topic = (data.get("topic") or "").strip()
            count = int(data.get("count", 5))
            if not topic:
                self._json_response({"error": "topic is required"}, status=HTTPStatus.BAD_REQUEST)
                return
            result = kb.quiz(topic, max(1, min(count, 10)))
            if not result:
                self._json_response({"error": "topic not found"}, status=HTTPStatus.NOT_FOUND)
                return
            self._json_response(result)
            return

        if parsed.path == "/flashcards":
            topic = (data.get("topic") or "").strip()
            count = int(data.get("count", 6))
            if not topic:
                self._json_response({"error": "topic is required"}, status=HTTPStatus.BAD_REQUEST)
                return
            result = kb.flashcards(topic, max(1, min(count, 12)))
            if not result:
                self._json_response({"error": "topic not found"}, status=HTTPStatus.NOT_FOUND)
                return
            self._json_response(result)
            return

        if parsed.path == "/upload":
            query = parse_qs(parsed.query)
            name = (query.get("filename", ["homework"])[0]).strip() or "homework"
            ext = Path(name).suffix.lower() or ".bin"
            safe_name = re.sub(r"[^a-zA-Z0-9_.-]+", "_", Path(name).stem)[:80] or "homework"
            final_name = f"{safe_name}_{uuid.uuid4().hex[:8]}{ext}"
            destination = UPLOAD_DIR / final_name
            length = int(self.headers.get("Content-Length", "0"))
            with destination.open("wb") as f:
                remaining = length
                while remaining > 0:
                    chunk = self.rfile.read(min(65536, remaining))
                    if not chunk:
                        break
                    f.write(chunk)
                    remaining -= len(chunk)
            size = destination.stat().st_size if destination.exists() else 0
            entry = kb.register_upload(name, final_name, size)
            self._json_response({"message": "Upload stored successfully", "upload": entry})
            return

        self._json_response({"error": "Endpoint not found"}, status=HTTPStatus.NOT_FOUND)


def run():
    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", "8000"))
    server = ThreadingHTTPServer((host, port), AIvoraHandler)
    print(f"AIvora running on http://{host}:{port}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    run()
