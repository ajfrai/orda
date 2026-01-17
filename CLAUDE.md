# Claude Code Assistant Guidelines

## Work Sources

All work assignments come from one of two sources:

1. **Direct Feature Requests**: Tasks provided directly in prompts by the user
2. **GitHub Issues**: Tasks tracked in the project's GitHub repository

### Reading GitHub Issues

To fetch and review GitHub issues, you must read environment variables to obtain the access token:
- Check for `GITHUB_TOKEN` or `GH_TOKEN` environment variable
- If no access token is available, **stop and inform the user** before proceeding with GitHub issue retrieval
- Use the access token to authenticate API requests to GitHub

---

## Project Status

Track work through:
- **GitHub Issues**: Current tasks, bugs, and features
- **PLAN.md**: Architecture and implementation roadmap

## Acceptance Criteria Standards

Every GitHub issue must have clear, verifiable acceptance criteria:

- **Objective and Testable**: Criteria should be unambiguous and verifiable
- **Specific Outcomes**: Define what success looks like with concrete details
- **Avoid Subjective Terms**: No "works well", "looks nice", "is good"

**Examples:**
- ✅ Good: "API returns 404 when cart ID doesn't exist"
- ✅ Good: "Landing page includes URL input field and Create Cart button"
- ✅ Good: "getTaxRate('CA') returns 0.0725"
- ❌ Bad: "API works well"
- ❌ Bad: "UI looks nice"
- ❌ Bad: "Component is functional"

**When writing issues:**
- If acceptance criteria are missing: Discuss with user to define them
- If acceptance criteria are unclear: Ask questions to clarify what "done" means
- Review criteria before starting work

## Project Wrap-Up

During project wrap-up, review PLAN.md and GitHub issues:

1. **Verify Acceptance Criteria**: Check each issue has clear, verifiable criteria (see standards above)
2. **Close Completed Issues**: Match implementation against acceptance criteria
   - If all criteria are met: Close the issue
   - If partially complete: Document what's done and what remains
   - If blocked: Note blockers and dependencies

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
