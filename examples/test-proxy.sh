#!/bin/bash

# Test script to demonstrate the simplified AI Guard proxy

PROXY_URL="http://localhost:3000"

echo "🧪 Testing AI Guard Proxy Service"
echo "================================"

# Test health endpoint
echo "1. Testing health endpoint:"
curl -s "$PROXY_URL/health" | jq . || echo "Health check failed"
echo -e "\n"

# Test ready endpoint
echo "2. Testing ready endpoint:"
curl -s "$PROXY_URL/ready" | jq . || echo "Ready check failed"
echo -e "\n"

# Test OpenAI proxy (example - will fail without real API key)
echo "3. Testing OpenAI proxy:"
curl -s -X POST "$PROXY_URL/v1/chat/completions" \
  -H "Content-Type: application/json" \
  -H "X-AI-Guard-Provider: openai" \
  -d '{
    "model": "gpt-3.5-turbo",
    "messages": [{"role": "user", "content": "Hello!"}],
    "max_tokens": 50
  }' | jq . || echo "OpenAI proxy test failed (expected if no API key)"
echo -e "\n"

# Test Anthropic proxy (example - will fail without real API key)
echo "4. Testing Anthropic proxy (anthropic-version header added automatically):"
curl -s -X POST "$PROXY_URL/v1/messages" \
  -H "Content-Type: application/json" \
  -H "X-AI-Guard-Provider: anthropic" \
  -d '{
    "model": "claude-3-haiku-20240307",
    "messages": [{"role": "user", "content": "Hello!"}],
    "max_tokens": 50
  }' | jq . || echo "Anthropic proxy test failed (expected if no API key)"
echo "Note: The proxy automatically adds 'anthropic-version: 2023-06-01' header"
echo -e "\n"

# Test Gemini proxy (example - will fail without real API key)
echo "5. Testing Gemini proxy:"
curl -s -X POST "$PROXY_URL/v1beta/models/gemini-pro:generateContent" \
  -H "Content-Type: application/json" \
  -H "X-AI-Guard-Provider: gemini" \
  -d '{
    "contents": [{"parts": [{"text": "Hello!"}]}]
  }' | jq . || echo "Gemini proxy test failed (expected if no API key)"
echo -e "\n"

echo "✅ Test completed!"
echo "Note: Provider tests will fail without valid API keys in .env file"