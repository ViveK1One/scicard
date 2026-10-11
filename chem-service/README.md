# SciCard chemistry microservice (FastAPI + RDKit)

## Setup

```bash
cd chem-service
python -m venv .venv
# Windows:
.venv\Scripts\pip install -r requirements.txt
# macOS/Linux:
# .venv/bin/pip install -r requirements.txt
```

## Run

```bash
# Windows
.venv\Scripts\uvicorn main:app --reload --host 127.0.0.1 --port 8000

# macOS/Linux
# .venv/bin/uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

Health: `GET http://127.0.0.1:8000/health`  
Render: `POST http://127.0.0.1:8000/render` with `{ "smiles": "C.O=O>>O=C=O.O", "format": "svg" }`
