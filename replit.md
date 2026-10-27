# Life Hub

## Project
The imported app lives in `project/`. Keep its existing React, TypeScript,
Vite, Tailwind, and Supabase stack and directory structure.

## Running on Replit
- Use the **Start application** workflow (the Run button).
- Command from the repository root: `cd project && npm run dev`.
- Vite listens on `0.0.0.0:5000` and accepts Replit preview hosts.
- Existing dependencies are installed in `project/node_modules`.
- Node.js 22 is configured to meet the existing Supabase SDK requirements.
- To reinstall dependencies from the lockfile: `npm ci --prefix project --include=optional`.
- Check the production build with `cd project && npm run build`.

## Services and authentication
- The app uses the existing Supabase project for authentication and synced data.
- Required configuration: `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
- The import includes a `project/.env` file; Vite loads it automatically.
  Do not print or commit credential values. For replacement configuration,
  use Replit Secrets. Only browser-safe Supabase public/anon keys belong in
  `VITE_` variables; never use a service-role key.
- The signed-in app requires a valid Supabase account. Keep authentication in
  place during preview verification.
- Local/offline storage uses the browser; do not replace the existing database
  or migrate services as part of environment setup.
