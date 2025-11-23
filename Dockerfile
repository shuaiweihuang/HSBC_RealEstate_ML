# Dockerfile - Alternative version (app contents at root)
FROM python:3.12-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy app contents to /app root (not in subdirectory)
COPY app/* ./
COPY data/ ./data/

# Expose port
EXPOSE 8000

# Run the application - use main:app since files are now at root
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
