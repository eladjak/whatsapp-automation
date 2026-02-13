# WhatsApp Automation - Development Guidelines

## Project
WhatsApp automation system - message sending, bulk operations, contact list management via whatsapp-web.js.

## Tech Stack
- TypeScript (strict mode)
- Node.js >= 18
- whatsapp-web.js (WhatsApp Web API)
- qrcode-terminal (QR display for authentication)

## Architecture
```
src/
  types.ts           - Shared type definitions
  config.ts          - Default configuration constants
  utils.ts           - Utility functions (delay, personalization)
  client.ts          - WhatsApp client factory
  contacts.ts        - Contact loading (JSON/CSV)
  bulk-sender.ts     - Bulk message sending with rate limiting
  send-message.ts    - Single message sender
  send-message-cli.ts - CLI single message sender
  advanced-features.ts - Advanced WhatsApp features demo
  list-manager.ts    - Interactive contact list management
  index.ts           - Public API barrel export
```

## Commands
- `npm run build` - Compile TypeScript to dist/
- `npm run typecheck` - Type check without emitting
- `npm run send` - Send a single message
- `npm run send:cli` - CLI message sender
- `npm run bulk` - Bulk message sender
- `npm run manage-lists` - Interactive list manager
- `npm run advanced` - Advanced features demo
- `npm run clean` - Remove dist/

## Principles
- Strong typing throughout (no `any`)
- Shared client factory to avoid code duplication
- Rate limiting with natural delays to prevent WhatsApp bans
- Clean separation: types, config, utils, client, business logic
