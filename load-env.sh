#!/bin/bash
# Load environment variables from .env.local
# Usage: source ./load-env.sh

if [ -f .env.local ]; then
  export $(grep -v '^#' .env.local | xargs)
  echo "✓ Environment variables loaded from .env.local"
  echo "✓ GITHUB_TOKEN is set"
else
  echo "✗ .env.local not found"
  exit 1
fi
