# Claude Code Assistant Guidelines

## Session Wrap-Up

When wrapping up a session, update `PROGRESS.md` with:
- Session entry with today's date
- Completed tasks with technical details
- Files created/modified and key decisions
- "Key Accomplishments" summary

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

- `PLAN.md` - Overall architecture
- `PROGRESS.md` - Development history and status
- `TESTING.md` - Testing procedures and examples
- `supabase/schema.sql` - Database schema
- `types/index.ts` - TypeScript interfaces
