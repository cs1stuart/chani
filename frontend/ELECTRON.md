# ChatVia Desktop App (Electron)

Run ChatVia as a native desktop application on Windows, macOS, or Linux.

## Prerequisites

1. **Backend must be running** – The ChatVia backend server needs to be running for the app to work (chat, messages, calls, etc.).

   ```bash
   # In a separate terminal, from project root:
   cd backend && npm run dev
   ```

2. The backend runs on `http://localhost:3002`. The Next.js frontend proxies API requests to it.

## Development

Run the desktop app in development mode:

```bash
cd frontend
npm run electron:dev
```

This will:
1. Start the Next.js dev server (`next dev`) on port 3000
2. Wait for it to be ready
3. Launch the Electron window loading the app

**Note:** Make sure the backend is already running before opening the Electron app.

## Building for Production

Create a distributable desktop app:

```bash
cd frontend
npm run electron:build
```

This builds for your current platform. For specific platforms:

- **Windows:** `npm run electron:build:win`
- **macOS:** `npm run electron:build:mac`
- **Linux:** `npm run electron:build:linux`

Output will be in `frontend/dist/`.

**For production use:** Deploy the backend to a server and set `NEXT_PUBLIC_API_URL` in your build to point to that server. Otherwise, the desktop app will try to connect to `localhost:3002` (local backend).

## Scripts Reference

| Script | Description |
|--------|-------------|
| `npm run electron` | Launch Electron (assumes Next.js is already running) |
| `npm run electron:dev` | Start Next.js + Electron together for development |
| `npm run electron:build` | Build production desktop app |
| `npm run electron:build:win` | Build Windows installer (.exe) |
| `npm run electron:build:mac` | Build macOS app (.dmg) |
| `npm run electron:build:linux` | Build Linux AppImage |
