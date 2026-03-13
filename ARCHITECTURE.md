   # WorkChat – Architecture & Scalability

   ## Overview

   - **Frontend:** Next.js 15 (React), talks to backend via REST + Socket.io.
   - **Backend:** Node.js + Express, single process.
   - **Database:** MongoDB (Mongoose).
   - **Real-time:** Socket.io on same HTTP server (in-memory).

   ## API Structure

   | Area        | Base path           | Purpose                    |
   |------------|---------------------|----------------------------|
   | Auth       | `/api/login`        | Login, token               |
   | Users      | `/api/users`       | List users, update profile |
   | Chats      | `/api/conversations/:userId` | 1:1 conversation list |
   | Messages   | `/api/messages/:u1/:u2`       | Direct messages (paginated) |
   | Message read | `/api/message-reads/:messageId` | Mark read              |
   | Groups     | `/api/groups`, `/api/group-members`, `/api/group-messages` | Groups & group chat |
   | Upload     | `/api/upload`      | Files/images               |
   | Calls      | `/api/calls`       | Call logs                  |
   | Status     | `/api/status`      | Status list, create, view, delete |

   - **Rate limit:** 100 HTTP requests per minute per IP (`/api/*`).
   - **Socket:** JWT auth, per-user rate limit (e.g. 30 messages/min) to avoid spam.

   ## Will 100–200 Users Make the App Slow?

   **Short answer: with the current design and the changes below, 100–200 users should be fine on one server.**

   ### What’s in place

   1. **Rate limiting** – API and socket are limited so one user can’t overload the server.
   2. **MongoDB indexes** – Added on:
      - **Message:** `(creator, target, group_id, deleted_at, createdAt)`, `(target, read_at, group_id, deleted_at)`, `(group_id, deleted_at, createdAt)` for chats and conversations.
      - **Status:** `(expires_at)`, `(user_id, expires_at)` for status listing.
      - **MessageGroupMember:** `(user_id)`, `(group_id, user_id)` for join and status.
      - **CallLog:** `(callee_id, createdAt)`, `(caller_id, createdAt)` for call history.
   3. **Connection pool** – Mongoose `maxPoolSize: 50` so many concurrent requests don’t exhaust connections.
   4. **Socket.io** – Single server, in-memory; 100–200 concurrent connections are normal for one Node process.

   ### Things to keep in mind

   - **Single process** – All traffic hits one Node server. If you grow to 500+ users or very heavy usage, you’d add more instances and a load balancer.
   - **Socket.io** – Rooms are per user and per group; no full broadcast on every message. `user_status` is broadcast to all when someone joins; at 200 users this is still acceptable.
   - **File uploads** – Stored on the same server; at scale you’d move to S3 or similar.

   ### Summary

   - **100–200 users:** Expected to run smoothly with the current architecture and the new indexes + pool.
   - **Slowness** would usually come from missing indexes (now added) or a very large `Message` collection; indexes keep queries fast as data grows.
   - **Next steps if you grow:** Add more app instances behind a load balancer, use Redis adapter for Socket.io for multi-instance real-time, and put uploads on object storage.
