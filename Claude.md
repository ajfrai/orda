# Claude Code Assistant Guidelines

## Project Status

Track work through:
- **GitHub Issues**: Current tasks, bugs, and features
- **PLAN.md**: Architecture and implementation roadmap

## Project Wrap-Up

During project wrap-up, review PLAN.md and GitHub issues:

1. **Review Acceptance Criteria**: Verify every issue has clear, verifiable acceptance criteria
   - If missing acceptance criteria: Discuss with user to define them
   - If unclear acceptance criteria: Ask questions to clarify what "done" means
   - Good acceptance criteria are objective and testable (not subjective)

2. **Close Completed Issues**: Check each open issue against its acceptance criteria
   - If all criteria are met: Close the issue
   - If partially complete: Document what's done and what remains
   - If blocked: Note blockers and dependencies

3. **Verifiable Standards**: Acceptance criteria should be testable
   - ✅ Good: "API returns 404 when cart ID doesn't exist"
   - ✅ Good: "Landing page includes URL input field and Create Cart button"
   - ❌ Bad: "API works well"
   - ❌ Bad: "UI looks nice"

## User Flow Documentation

When proposing changes to **app user flows** (how users interact with the Orda UI), **always** provide detailed "before" and "after" flow descriptions.

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

After implementing the app flow change:
1. Test the actual user flow end-to-end in the app
2. Write a concise summary of the implemented flow
3. Compare the actual flow with the original "after" description
4. Call out any discrepancies between intended and actual behavior

This ensures the app behavior matches the design intent and prevents misalignment between vision and reality.

## Architecture

- **Framework**: Next.js 16 with App Router
- **Database**: Supabase (Postgres) with Row Level Security
- **AI**: Claude 4.5 Sonnet for menu parsing
- **Styling**: Tailwind CSS

## Security Requirements

- All Claude API calls must be server-side only
- Validate and sanitize all user inputs
- Use SSRF protection for URLs
- Never expose API keys in client code
- Use service role client only in API routes

## Database Operations

- Use `getServiceRoleClient()` for API routes (server-side)
- Use `supabase` client for client components (RLS enforced)
- Always handle errors from Supabase operations
- Include error codes and details in development mode

## Code Patterns

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

- `PLAN.md` - Overall architecture and implementation roadmap
- `supabase/schema.sql` - Database schema
- `types/index.ts` - TypeScript interfaces
- **GitHub Issues** - Task tracking and feature development
