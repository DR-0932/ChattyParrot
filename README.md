# ChattyParrot

ChattyParrot is a document question-answering web app. Upload a document, ask questions about its contents, and receive a streamed answer with references to the retrieved document chunks.

The project uses a polyglot architecture: a Next.js frontend, a Node.js/Express API gateway, and a Python/FastAPI agent that handles document ingestion, retrieval, and answer generation. Docker Compose builds and runs the three services together.

## Features

- Ingest PDF, DOCX, PNG, JPG, JPEG, and WEBP files.
- Extract text from PDFs and DOCX files, and use Tesseract OCR for images.
- Split extracted text into chunks, embed them with `all-MiniLM-L6-v2`, and store them in a local Qdrant collection.
- Retrieve relevant chunks for a question and generate a streamed response using a DeepSeek-compatible chat API.
- Include source names, chunk indexes, relevance scores, and snippets with the response.

## Requirements

- Docker and Docker Compose
- A DeepSeek API key (or credentials for a compatible API endpoint)

The first agent startup downloads the embedding model, so it may take longer and use more network bandwidth than later starts.

## Getting started with Docker

The agent needs the LLM API key in its environment.

```bash
cp .env.example .env
```
# open .env and add your DeepSeek API key

```bash
  docker compose up --build![alt text](image.png)
```

Open the frontend at [http://localhost:3001](http://localhost:3001). The API gateway is exposed on port `3000`, and the agent service on port `8000`.

To stop the services, press `Ctrl+C`, then run:

```bash
docker compose down
```

The Compose file currently persists the Hugging Face model cache in a named volume. The agent's local Qdrant database is stored in its container, so removing/recreating that container can remove ingested documents.

## How it works

1. The frontend sends a document upload to the Express gateway.
2. The gateway forwards the file to the Python agent.
3. The agent extracts text, chunks it, creates embeddings, and saves the chunks in Qdrant.
4. On a question, the agent embeds the query and retrieves the three closest chunks by default.
5. The agent sends the retrieved context and chat history to the configured LLM, then streams answer tokens and source metadata back through the gateway to the frontend.

## API endpoints

The browser calls the gateway at `http://localhost:3000`:

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/api/health` | Check that the gateway is running. |
| `POST` | `/api/ingest` | Upload one file using multipart form data with the field name `file`. |
| `POST` | `/api/chat` | Ask a question and receive a Server-Sent Events (SSE) stream. |

The agent also exposes `GET /health`, `POST /ingest`, and `POST /chat` on port `8000` for service-level use.

The chat request accepts JSON such as:

```json
{
  "message": "What is the document about?",
  "top_k": 3,
  "history": []
}
```

Chat responses are SSE events. They contain token events, a sources event, and a final `[DONE]` event. The source entries include a filename, chunk index, score, and text snippet.

## Configuration

| Variable | Service | Description |
| --- | --- | --- |
| `DEEPSEEK_API_KEY` | Agent | Required API key for answer generation. |
| `LLM_BASE_URL` | Agent | Optional base URL for an OpenAI-compatible API. Defaults to `https://api.deepseek.com`. |
| `LLM_MODEL` | Agent | Optional model name. Defaults to `deepseek-v4-flash`. |
| `QDRANT_URL` | Agent | Optional Qdrant server URL. If unset, the agent uses a local database at `qdrant_data`. |
| `AGENT_URL` | Server | Agent address. Docker Compose sets this to `http://agent:8000`. |
| `NEXT_PUBLIC_API_URL` | Frontend | Gateway URL embedded in the frontend build. Docker Compose sets this to `http://localhost:3000`. |

## Development

Each service can also be run separately from its directory. The agent uses `uv`, while the server and frontend use `pnpm`.

```bash
# Agent (apps/agent)
uv sync
DEEPSEEK_API_KEY="your-api-key" uv run uvicorn main:app --reload --port 8000

# Server (apps/server)
pnpm install
AGENT_URL=http://localhost:8000 pnpm dev

# Frontend (apps/web/frontend)
pnpm install
NEXT_PUBLIC_API_URL=http://localhost:3000 pnpm dev  --port 3001
```

Run the frontend at `http://localhost:3001` for local development.

## Repository layout

```text
apps/
  agent/          Python ingestion, embeddings, retrieval, and generation service
  server/         Node.js/Express API gateway
  web/frontend/   Next.js web application
docker-compose.yml
```

## Current limitations

- Ingestion support currently covers PDF, DOCX, PNG, JPG, JPEG, and WEBP. Although some frontend file pickers list TXT, Markdown, DOC, or BMP, the agent does not currently ingest those formats.
- The gateway limits uploaded files to 20 MB. The chat composer applies a 10 MB per-file selection limit.
- The vector collection is local by default and does not provide user-level separation; uploaded documents share the same collection.
- The repository includes agent tests, but test commands and coverage are still being developed.
