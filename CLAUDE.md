# Mindshare by Darklight

Multi-user PWA where 3 participants join a shared room, submit ideas per round, see real-time ready lights, and receive combined AI responses in a shared chat.

## Stack

- **Frontend**: React + TypeScript + Vite + Tailwind CSS
- **Backend**: Supabase Edge Functions (Deno) -- all server-side logic
- **Auth + DB**: Supabase (auth, Postgres, Realtime, RLS)
- **AI**: Multi-provider gateway via Edge Function (see `supabase/functions/ai-gateway/`)
- **Deployment**: Vercel (static hosting ONLY -- no serverless functions)
- **MCP**: Supabase MCP (read-only, scoped to project) + Chrome DevTools MCP (see `.mcp.json`)

> Architecture norms are auto-loaded from `.claude/rules/`.
> MCP servers are configured in `.mcp.json` at project root.

## Key Commands

- `npm run dev` -- start dev server on port 5203
- `npm run build` -- production build
- `npx tsc --noEmit` -- type check
- `supabase db push` -- push migrations
- `supabase functions deploy` -- deploy Edge Functions

## Key Files

- `src/pages/Room.tsx` -- Main room experience (chat + ready lights + submission)
- `src/hooks/useRound.ts` -- Round lifecycle management
- `src/hooks/useSubmissions.ts` -- Submission tracking + AI trigger
- `src/hooks/useReadyLights.ts` -- Ready light state derivation
- `src/lib/gateway.ts` -- AI gateway client
- `src/lib/models.ts` -- Model registry (feature -> model mapping)
- `supabase/functions/process-round/` -- Edge Function: combine submissions + call AI

## Architecture

### Core Flow
1. Users create/join rooms (max 3 members)
2. A "round" begins (status: collecting)
3. Each user submits their idea independently
4. Ready lights show submission status in real-time (Supabase Realtime)
5. When all submit, process-round Edge Function combines ideas + calls AI
6. AI response appears in shared chat
7. New round can begin

### Database Tables
- `profiles` -- user display names, avatars
- `rooms` -- shared spaces with invite codes
- `room_members` -- room membership (max 3)
- `rounds` -- round lifecycle (collecting -> processing -> complete)
- `submissions` -- one per user per round (UNIQUE constraint)
- `messages` -- shared chat (user_chat, ai_response, system types)

### Realtime Subscriptions
All tables use `REPLICA IDENTITY FULL` and are in the `supabase_realtime` publication.
Subscriptions filter by room_id or round_id for efficiency.
