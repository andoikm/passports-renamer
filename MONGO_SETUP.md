# MongoDB Setup (for registration/login)

The backend needs a running MongoDB instance at `mongodb://127.0.0.1:27017`.

## Option A (Recommended on macOS): Homebrew
1. Install MongoDB:
   - `brew tap mongodb/brew`
   - `brew install mongodb-community@7`
2. Start MongoDB as a service:
   - `brew services start mongodb-community@7`
3. Verify it is listening:
   - `lsof -nP -iTCP:27017 -sTCP:LISTEN`
4. Restart the app dev servers:
   - `npm run dev`

## Option B: Docker (if you have Docker installed)
Run a Mongo container (example):
- `docker run --name document-parser-mongo -p 27017:27017 -d mongo:7`
Then restart the app dev servers:
- `npm run dev`

## After Mongo is running
- Go to the app in your browser.
- You should be able to register/login.
- Once logged in, the rename (upload + download) UI will be enabled.

