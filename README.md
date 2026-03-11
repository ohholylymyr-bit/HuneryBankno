# AIvora

AIvora is a fully functional educational AI web app with a modular Python backend and a responsive browser interface.

## Features
- Ask questions against a persistent knowledge base (`/api/ask`)
- Teach new topics and persist knowledge (`/api/teach`)
- Generate quizzes (`/api/quiz`)
- Generate flashcards (`/api/flashcards`)
- Upload homework images for future processing (`/api/upload`)
- Persistent JSON knowledge base stored in `data/knowledge_base.json`

## Run locally
```bash
python3 app.py
```
Then open `http://localhost:8000`.

## Render deployment
- Runtime: Python 3
- Start command: `python3 app.py`
- Port: Render sets `PORT`; app reads it automatically.

## Architecture
- `app.py`: HTTP server + AIvora engine + persistence layer
- `static/`: Frontend chat UI (`index.html`, `styles.css`, `app.js`)
- `data/`: Persistent knowledge base and uploaded homework files
