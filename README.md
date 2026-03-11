# AIvora

AIvora is a fully functional educational AI web app using Python standard libraries only.

## Features
- `/ask` answers questions with best-topic matching from a persistent knowledge base.
- `/teach` stores or extends topics permanently.
- `/quiz` generates dynamic quizzes from stored content.
- `/flashcards` generates study flashcards dynamically.
- `/upload` stores homework images for future review/annotation pipelines.
- Responsive frontend in plain HTML/CSS/JS.

## Run locally
```bash
python app.py
```
Open `http://localhost:8000`.

## API summary
- `POST /ask` `{ "question": "..." }`
- `POST /teach` `{ "title": "...", "content": "...", "tags": ["..."] }`
- `POST /quiz` `{ "topic": "...", "count": 5 }`
- `POST /flashcards` `{ "topic": "...", "count": 6 }`
- `POST /upload?filename=name.png` raw binary body
- `GET /topics`, `GET /health`

## Persistence
- Knowledge base: `data/knowledge_base.json`
- Uploads: `uploads/`

## Future modular expansion
The backend separates knowledge management and HTTP handling to support future upgrades:
- Transformer-based inference services (local/remote)
- Vector search indexers
- GPU-backed inference workers (Colab/Kaggle/Gradient)
