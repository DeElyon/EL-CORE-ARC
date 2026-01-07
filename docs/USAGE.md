# EL VERSE Backend — Quick Run & Usage

This document contains concise run/migration steps and example API requests for uploads, downloads, WebRTC signaling, live streams, and useful worker commands.

## Setup & generate Prisma client

Install deps and generate Prisma client:

```bash
pnpm install
pnpm db:generate
```

If you plan to run the database locally using docker-compose:

```bash
docker compose up -d postgres redis
# then push schema
DATABASE_URL="postgresql://elverse:elverse123@localhost:5432/elverse?schema=public" pnpm db:push
```

## Start API & workers (development)

Start the API (example using ts-node local start):

```bash
DATABASE_URL="postgresql://elverse:elverse123@localhost:5432/elverse?schema=public" \
REDIS_URL="redis://localhost:6379" \
PORT=3001 pnpm --filter ./apps/arc-core-api run start:local
```

Start the workers (in separate terminals):

```bash
DATABASE_URL="postgresql://elverse:elverse123@localhost:5432/elverse?schema=public" pnpm upload-worker
DATABASE_URL="postgresql://elverse:elverse123@localhost:5432/elverse?schema=public" REDIS_URL="redis://localhost:6379" pnpm queue-worker
```

## Media upload flow (S3 presigned PUT)

1. Create upload record (signed PUT URL):

```bash
curl -X POST http://localhost:3001/api/media/initiate \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"filename":"video.mp4","mimeType":"video/mp4","size":1234567,"type":"VIDEO","appSource":"NEXEL"}'

# Response contains: { media: {...}, signedUploadUrl }
```

2. Upload file to presigned URL (PUT):

```bash
curl -X PUT "<signedUploadUrl>" \
  -H "Content-Type: video/mp4" \
  --data-binary @./video.mp4
```

3. Notify backend upload is complete (storage will call this or client can):

```bash
curl -X POST http://localhost:3001/api/media/<mediaId>/complete \
  -H "x-upload-complete-token: $UPLOAD_COMPLETE_TOKEN" \
  -H "Authorization: Bearer $TOKEN"
```

The `upload-worker` polls `Media.status = UPLOADED` and will process the file, then mark `Media.status = READY` and set `url`/`thumbnailUrl`.

4. Get download url for media (signed GET if S3):

```bash
curl -X GET http://localhost:3001/api/media/<mediaId>/download
```

## Post download / repost / save (NEXEL)

- Repost: `POST /api/nexel/posts/:postId/repost`
- Save: `POST /api/nexel/posts/:postId/save` (and DELETE to unsave)
- Download post media: `GET /api/nexel/posts/:postId/download`

## WebRTC signalling (call namespace)

The server exposes a Socket.IO namespace `/call`. Use socket.io-client in browser or Node to exchange SDP/ICE messages:

- Connect to `ws://<host>/call`
- Emit `join_call` with `{ room: string, userId }` to join
- Exchange `offer`, `answer`, `ice` events — the gateway broadcasts payloads to room members

Example (socket.io-client):

```js
const io = require('socket.io-client');
const s = io('http://localhost:3001/call');
s.emit('join_call', { room: 'call-room-1', userId: 'u1' });
s.on('offer', payload => console.log('Offer', payload));
```

Server call endpoints:

- `POST /api/calls` -> create a `CallSession` (returns `roomName`)
- `POST /api/calls/:id/join` -> create a `CallParticipant`

## Live streams & gifting (NEXEL)

- Start stream: `POST /api/nexel/streams` { title, description }
- End stream: `POST /api/nexel/streams/:streamId/end`
- Gifts are emitted via the stream websocket gateway: `send_gift` / `stream_chat`

## Debug & common issues

- If you see `SKIP_DB=true — skipping Prisma connect` the app will not connect to Postgres (useful in dev to start without DB).
- If workers report `ECONNREFUSED 127.0.0.1:6379`, ensure Redis is running and `REDIS_URL` points to it.
- Address `EADDRINUSE` means port already in use — change `PORT` env or stop conflicting process.

## Next steps / smoke tests

- Run an upload smoke test: follow the media upload flow and watch `upload-worker` logs show processing.
- Run a signaling test with two clients to verify `offer/answer/ice` relay.

If you want, I can run the upload smoke test now and show results from the worker logs.
