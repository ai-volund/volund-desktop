# Volund Desktop

Desktop and web chat client for the Volund AI agent platform.

## Stack

- **Tauri 2.x** - Native desktop shell (macOS, Windows, Linux)
- **React 19** + **TypeScript 5.9** - UI framework
- **Vite 8** - Build tool with HMR
- **Tailwind CSS 4** + **shadcn/ui v4** - Styling and components
- **AI SDK 6** (`ai` + `@ai-sdk/react`) - Chat state management via `useChat`
- **Bun** - Package manager and script runner

## Architecture

```
src/
  lib/
    volund-api.ts          # REST client for Volund gateway
    ws-chat-transport.ts   # AI SDK ChatTransport over WebSocket
    use-theme.ts           # Dark/light/system theme hook
    utils.ts               # Tailwind class utilities
  components/
    chat/
      chat-view.tsx        # Main chat view with AI SDK useChat
      chat-input.tsx       # Multi-line textarea input
      message-bubble.tsx   # Message rendering (text + tool parts)
    nav-sidebar.tsx        # Navigation sidebar (chat, tasks, agents, forge, settings)
    layout.tsx             # Layout shell with theme toggle + sign-out dropdown
    login.tsx              # Login/register form with OIDC SSO buttons
    error-boundary.tsx     # Global error boundary with reload
    ui/                    # shadcn/ui primitives
  pages/
    chat.tsx               # Chat page
    tasks.tsx              # Tasks dashboard
    agents.tsx             # Agent management
    forge.tsx              # Forge marketplace
    settings.tsx           # Settings page
  App.tsx                  # Root shell (auth gate, router, layout)
src-tauri/                 # Tauri 2.x Rust shell
```

### WebSocket Chat Transport

The app uses a custom `WebSocketChatTransport` that implements AI SDK's `ChatTransport` interface. This bridges the Volund NATS event protocol to `UIMessageChunk` streams:

1. Opens a WebSocket to `ws://gateway/ws/conv/{id}?token=...`
2. Sends the user message via REST `POST /v1/conversations/{id}/messages`
3. Maps incoming NATS events (`agent_start`, `delta`, `tool_start`, `tool_end`, `turn_end`, `agent_end`) to AI SDK `UIMessageChunk` objects
4. Returns a `ReadableStream<UIMessageChunk>` that `useChat` consumes

This allows us to use AI SDK's state management and eventually AI Elements components for rich tool-call rendering.

## Development

### Prerequisites

- [Bun](https://bun.sh/) >= 1.0
- [Rust](https://rustup.rs/) (for Tauri builds)
- Volund backend running (gateway on `localhost:8080`)

### Web UI (development)

```bash
bun install
bun dev
# Open http://localhost:5173
```

### Desktop App (Tauri)

```bash
bun install
bunx tauri dev
```

### Build Desktop App

```bash
bunx tauri build
# Output in src-tauri/target/release/bundle/
```

## Features

- [x] Login / authentication (email/password)
- [x] Registration with display name + org name
- [x] OIDC SSO login (Google, GitHub, Okta — dynamically fetched from backend)
- [x] JWT persistence in localStorage with auto-refresh scheduling
- [x] Conversation list with create, rename, delete
- [x] Real-time streaming chat via WebSocket
- [x] WebSocket reconnection support (`reconnectToStream()` with 5s timeout)
- [x] Markdown rendering for assistant responses
- [x] Dark / light / system theme toggle
- [x] Loading skeletons
- [x] AI SDK ChatTransport integration
- [x] Tool invocation display
- [x] Global error boundary with reload button
- [x] Sign-out from layout dropdown menu
- [x] Agent Builder dialog (create/delete profiles with full config)
- [x] Usage dashboard (token summary, date range, per-model breakdown)
- [ ] Auto-generate conversation titles from first message
- [ ] File upload / attachments
- [ ] AI Elements rich tool rendering
- [ ] Agent profile selection per conversation

## Backend API

The client talks to the Volund gateway REST API:

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/v1/auth/login` | Authenticate (email/password) |
| POST | `/v1/auth/register` | Register new account |
| POST | `/v1/auth/refresh` | Refresh JWT token |
| GET | `/v1/auth/me` | Get current user profile |
| GET | `/v1/auth/oidc/providers` | List OIDC SSO providers |
| GET | `/v1/auth/oidc/{provider}` | OIDC redirect |
| GET | `/v1/auth/oidc/{provider}/callback` | OIDC callback |
| GET | `/v1/tenants` | List user's tenants |
| GET | `/v1/conversations` | List conversations |
| POST | `/v1/conversations` | Create conversation |
| GET | `/v1/conversations/{id}` | Get with messages |
| PATCH | `/v1/conversations/{id}` | Update title |
| DELETE | `/v1/conversations/{id}` | Delete (soft) |
| POST | `/v1/conversations/{id}/messages` | Send message |
| GET | `/v1/agents` | List agents |
| POST | `/v1/agents` | Create agent |
| GET | `/v1/usage/summary` | Usage summary |
| GET | `/v1/forge/skills` | List Forge skills |
| WS | `/ws/conv/{id}?token=` | Stream events |
