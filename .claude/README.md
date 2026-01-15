# Claude Code Configuration

This directory contains Claude Code hooks and configuration.

## SessionStart Hook

The `scripts/setup-env.sh` script runs automatically when a new Claude Code session starts. It:

- **For web/mobile sessions**: Writes environment variables to `$CLAUDE_ENV_FILE`
- **For desktop sessions**: Checks for `.env.local` and reminds you to load it

## Setting Up Environment Variables

### Desktop Sessions

1. Copy `.env.example` to `.env.local` in the project root:
   ```bash
   cp .env.example .env.local
   ```

2. Edit `.env.local` with your actual values

3. Load variables in each session:
   ```bash
   source ./load-env.sh
   ```

The `.worktreeinclude` file ensures `.env.local` persists across desktop worktree sessions.

### Mobile/Web Sessions

Since web sessions run in isolated cloud VMs, you need to configure environment variables in Claude Code settings:

1. Open Claude Code on the web
2. Go to Settings → Environment Variables
3. Add your environment variables there
4. The SessionStart hook will automatically load them in each session

**Alternatively**, you can hardcode non-sensitive values directly in `.claude/scripts/setup-env.sh` (not recommended for secrets).

## Files

- `settings.json` - Hook configuration
- `scripts/setup-env.sh` - Environment setup script (runs on session start)
- `README.md` - This file

## Security Note

Never commit actual secrets to the repository. Use:
- `.env.local` for desktop (gitignored)
- Claude environment settings for web/mobile
- Secure secrets management for production
