FROM python:3.14.6-slim
COPY --from=ghcr.io/astral-sh/uv:0.12latest /uv /bin/uv
WORKDIR /app


ENV PYTHONUNBUFFERED=1 \
PATH="/app/.venv/bin:$PATH" \
UV_PYTHON_DOWNLOADS=never \
UV_PYTHON=python3.14

COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev --no-install-project

RUN apt-get update && apt-get install -y --no-install-recommends \
    tesseract-ocr \
    tesseract-ocr-eng \
    && rm -rf /var/lib/apt/lists/*
COPY . .
EXPOSE 8000
CMD ["uvicorn","main:app","--host","0.0.0.0","--port","8000"]