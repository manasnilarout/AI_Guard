#!/bin/bash

# Check if .env file exists
if [ ! -f .env ]; then
    echo "Error: .env file not found!"
    echo "Please create a .env file based on .env.example"
    echo "cp .env.example .env"
    exit 1
fi

# Load environment variables
export $(cat .env | grep -v '^#' | xargs)

# Check if API keys are set
if [ -z "$OPENAI_API_KEY" ] || [ -z "$ANTHROPIC_API_KEY" ] || [ -z "$GEMINI_API_KEY" ]; then
    echo "Warning: One or more API keys are not set in .env file"
    echo "Some providers may not work without their API keys"
fi

# Start the server
echo "Starting AI Guard proxy server..."
npm run dev