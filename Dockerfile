# Use Python base image
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install Node.js
RUN apt-get update && apt-get install -y curl && \
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y nodejs

# Copy Python requirements and install
COPY pyproject.toml .
RUN pip install -e .

# Copy React app
COPY ideaflow-react ./ideaflow-react
WORKDIR /app/ideaflow-react
RUN npm install && npm run build

# Return to app directory and copy API server
WORKDIR /app
COPY api_server.py .
COPY utils ./utils

# Expose port
EXPOSE 5000

# Set environment for production
ENV FLASK_ENV=production
ENV PORT=5000

# Start the server
CMD ["python", "api_server.py"]