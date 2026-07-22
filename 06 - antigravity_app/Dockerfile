FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install system dependencies, including ffmpeg for video rendering
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements file
COPY requirements.txt .

# Install python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# The rest of the app files will be mapped via volume in docker-compose.yml
# expose the FastAPI port
EXPOSE 8080

# Command to run uvicorn
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080", "--reload"]
