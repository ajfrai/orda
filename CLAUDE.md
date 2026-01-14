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

Claude Code works on session-specific branches (e.g., `claude/feature-name-ABC123`).

- Claude commits frequently with clear, descriptive messages
- Claude references issue numbers in commits (e.g., "Implements #3")
- Claude pushes to its session branch when work is complete
- User merges PRs when ready

## Development Practices

- Follow the recommended build order in `PROGRESS.md`
- Update `PROGRESS.md` session log after completing tasks
- Test locally before pushing when possible
- Avoid over-engineering - keep solutions simple and focused
- Only make changes that are directly requested or clearly necessary

## Environment

- Local `.env.local` for development (gitignored)
- Vercel environment variables for production
- All sensitive keys stay out of git

## Questions?

Check these files first:
- `PROGRESS.md` - Current status and history
- `PLAN.md` - Architecture and design decisions
- `README.md` - Quick start guide
