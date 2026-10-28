# Supabase player saves

1. In Supabase, open **SQL Editor**, paste and run [`player_profiles.sql`](player_profiles.sql).
2. In the Supabase project settings, copy the project URL and the **service_role** key (or the server-only secret key, if the project uses the newer key format).
3. In Render, open the STU-Town server service's **Environment** settings and add:
   - `SUPABASE_URL` = the project URL
   - `SUPABASE_SERVICE_ROLE_KEY` = the server-only key
4. Save the environment and redeploy/restart the server.

Never put the service role key in `client/`, a `VITE_`/`NEXT_PUBLIC_` variable, Git, or a message. The server hashes the anonymous browser token with SHA-256 and uses that hash as the database key. The raw token stays in that browser's local storage. Clearing browser storage or changing browser/device loses access to that anonymous save; there is no account recovery until sign-in is added.

The server restores and saves coins, reputation, stats, inventory, and farm activity totals. Map position, temporary Halloween run progress, and shared farm plot state are session/game-world state and are not stored in the personal profile row.

For local development, copy `.env.example` to `.env` under `server/`, fill in the same two values, and start the server. Without both variables, the game still runs, but durable saves are disabled. If Supabase is configured but cannot be reached, the server rejects the connection instead of silently starting a fresh profile.
