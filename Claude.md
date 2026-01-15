# Claude Code Assistant Guidelines

## Session Management

### Starting a Session

1. **Read context files** in this order:
   - `PROGRESS.md` - Current development status and session history
   - `PLAN.md` - Overall architecture and design decisions
   - Any relevant issue files or documentation

2. **Check current branch**:
   - Verify you're on the correct development branch
   - Review recent commits to understand latest changes

3. **Understand the task**:
   - Read the user's request carefully
   - Ask clarifying questions if needed
   - Review related code before making changes

### During Development

1. **Use TodoWrite tool** to track multi-step tasks
   - Create todos at the start of complex work
   - Mark items in_progress when starting
   - Mark completed immediately after finishing
   - Keep only one item in_progress at a time

2. **Commit frequently**:
   - Commit logical units of work
   - Write clear, descriptive commit messages
   - Include "why" not just "what" in messages

3. **Build and test**:
   - Run `npm run build` to verify TypeScript compilation
   - Test changes locally when possible
   - Fix errors immediately before moving forward

### Wrapping Up a Session

When the user says "wrap up this session" or similar, follow these steps:

1. **Commit all outstanding changes**:
   - Ensure all work is committed with clear messages
   - Push to the development branch

2. **Update PROGRESS.md**:
   - Add a new session entry with today's date
   - List all completed tasks with bullet points
   - Include technical details (files created/modified, key decisions)
   - Add a "Key Accomplishments" summary section
   - Be specific about what was built and why

3. **Update issue tracking** (if applicable):
   - Close completed GitHub issues
   - Update issue comments with progress
   - Create new issues for discovered work

4. **Final push**:
   - Push all commits to remote branch
   - Verify branch is up to date

## Code Style Preferences

- **Avoid over-engineering**: Only add what's explicitly needed
- **No unnecessary comments**: Code should be self-documenting
- **No emojis** unless explicitly requested
- **Error handling**: Comprehensive logging during development, user-friendly in production
- **Type safety**: Use TypeScript strictly, no `any` types
- **Security first**: Validate all inputs, sanitize data, use environment variables

## Development Workflow

1. **Read before writing**: Always read existing code before modifying
2. **Understand before suggesting**: Don't propose changes to unread code
3. **Test incrementally**: Build after significant changes
4. **Document decisions**: Update PROGRESS.md with rationale for technical choices

## User Flow Documentation

When proposing changes to any part of the core user flow, **always** provide detailed "before" and "after" flow descriptions.

### Flow Description Requirements

Each flow description must include:

1. **Initial State**: What the user sees when they begin
2. **User Actions**: How they interact (clicks, inputs, gestures)
3. **State Transitions**: What views/screens they see next
4. **Intermediate States**: Any loading, validation, or feedback states
5. **Terminal State**: The final state where the flow completes

### Format

```
#### Before Flow:
1. User sees [initial view/screen]
2. User [performs action]
3. System [shows/responds with]
4. User sees [next view]
5. ... continue until terminal state

#### After Flow:
1. User sees [initial view/screen]
2. User [performs action]
3. System [shows/responds with]
4. User sees [next view]
5. ... continue until terminal state
```

### Verification Step

After implementing the change:
1. Test the actual flow end-to-end
2. Write a concise summary of what was actually implemented
3. Compare the implementation with the original "after" description
4. Call out any discrepancies between intended and actual flow

This ensures the implemented behavior matches the design intent and prevents misalignment between vision and reality.

## Project-Specific Guidelines

### Orda App Architecture

- **Framework**: Next.js 16 with App Router
- **Database**: Supabase (Postgres) with Row Level Security
- **AI**: Claude 4.5 Sonnet for menu parsing
- **Styling**: Tailwind CSS

### Key Security Considerations

- All Claude API calls must be server-side only
- Validate and sanitize all user inputs
- Use SSRF protection for URLs
- Never expose API keys in client code
- Use service role client only in API routes

### Database Operations

- Use `getServiceRoleClient()` for API routes (server-side)
- Use `supabase` client for client components (RLS enforced)
- Always handle errors from Supabase operations
- Include error codes and details in development mode

## Common Patterns

### API Route Structure
```typescript
export async function POST(request: NextRequest) {
  try {
    const supabase = getServiceRoleClient();
    // ... handle request
    return NextResponse.json(data);
  } catch (error) {
    console.error('[ERROR]', error);
    return NextResponse.json({ error: 'message' }, { status: 500 });
  }
}
```

### Next.js 16 Dynamic Routes
```typescript
// params are now async in Next.js 16
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  // ...
}
```

### Error Display (Development)
- Show detailed errors during development
- Log with `[DEBUG]` prefix for easy filtering
- Include stack traces and context
- File issues to remove before production

## Reference Files

- `PLAN.md` - Overall architecture
- `PROGRESS.md` - Development history and status
- `TESTING.md` - Testing procedures and examples
- `supabase/schema.sql` - Database schema
- `types/index.ts` - TypeScript interfaces
