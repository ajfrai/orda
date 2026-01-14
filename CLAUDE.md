# Instructions for Claude Code

This file contains instructions for Claude Code when working on the Orda project.

## At the Start of Each Session

**Read `PROGRESS.md` once at the beginning** to understand:
- Current project status
- What's already been completed
- What's next in the build order
- Recent session history

No need to re-read it during the session unless specifically asked.

## Git Workflow

**Push directly to `claude/main` branch** - no PRs needed.

This is a hobby project with just two collaborators (human + AI), so we skip the PR process:
- Develop on `claude/main` branch
- Commit frequently with clear messages
- Push directly to `claude/main` after commits
- No need to create feature branches or pull requests

Branch naming: Use `claude/main` as the primary branch (allows AI assistant to push directly)

## Development Practices

- Follow the recommended build order in `PROGRESS.md`
- Update `PROGRESS.md` session log after completing tasks
- Test locally before pushing when possible
- Use clear, descriptive commit messages
- Reference issue numbers in commits (e.g., "Implements #3")

## Environment

- Local `.env.local` for development (gitignored)
- Vercel environment variables for production
- All sensitive keys stay out of git

## Questions?

Check these files first:
- `PROGRESS.md` - Current status and history
- `PLAN.md` - Architecture and design decisions
- `TESTING.md` - How to test the setup
- `README.md` - Quick start guide
