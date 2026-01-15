#!/bin/bash
# SessionStart hook to set up environment variables
# Works for both desktop worktrees and web/mobile cloud sessions

echo "🔧 Setting up environment variables..."

# Determine project directory
PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(pwd)}"

# Check if we're in a web session (has CLAUDE_ENV_FILE)
if [ -n "$CLAUDE_ENV_FILE" ]; then
  echo "📱 Detected web/mobile session - configuring environment"

  # Set up environment variables for web sessions
  # These will be available to all commands in this session
  cat >> "$CLAUDE_ENV_FILE" <<'ENV_VARS'
export NODE_ENV=development

# GitHub CLI token
# For web/mobile sessions: Set this as an environment variable in Claude settings
# or replace with your actual token below (NOT recommended for security)
export GITHUB_TOKEN=${GITHUB_TOKEN:-""}

# Add other environment variables as needed
# export ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY:-""}
ENV_VARS

  echo "✅ Environment configured for web session"
  echo "💡 To use GitHub CLI, set GITHUB_TOKEN in Claude environment settings"

else
  echo "💻 Detected desktop session"

  # For desktop sessions, check if .env.local exists
  if [ -f "$PROJECT_DIR/.env.local" ]; then
    echo "✅ Found .env.local - run 'source ./load-env.sh' to load variables"
  else
    echo "⚠️  No .env.local found"
    echo "   Run: cp .env.example .env.local"
    echo "   Then edit .env.local with your values"
  fi

fi

echo "✅ Environment setup complete"
exit 0
