# VICTORINO Discord Bot

Automated Discord server provisioning and operations for **VICTORINO**.

## What it builds

On first setup the bot creates/synchronizes:

- Founder, Co-Founder, management, team, production, trainee, client, and pending roles
- START HERE onboarding area
- VICTORINO HQ
- Private leadership area
- Sales/client operations
- Production pipeline channels
- Private client project system
- Training/SOP area
- Culture/showcase area
- Bot/member/project logs
- Archive area
- Button-based production role selection
- Automatic PENDING role for new members
- Founder/Co-Founder role assignment by Discord user ID

It is designed to be **idempotent**: re-running `/setup-victorino` updates managed roles/channels instead of intentionally creating duplicates.

## Commands

- `/setup-victorino` — create/synchronize the server structure
- `/role-panel` — restore the role selection panel
- `/project-create` — create a private client project channel
- `/project-add` — add a member to a project
- `/project-remove` — remove direct project access
- `/project-archive` — move a finished project to the archive and lock normal posting

## Discord setup — one-time owner action

1. Go to the Discord Developer Portal and create an application named **VICTORINO**.
2. Open **Bot** and create/reset the bot token.
3. Enable the **Server Members Intent** under Privileged Gateway Intents.
4. Do **not** paste the bot token into ChatGPT, Discord, GitHub, or any public file.
5. Open OAuth2 → URL Generator.
6. Select scopes: `bot` and `applications.commands`.
7. For the first setup, give the bot **Administrator** permission and add it to the VICTORINO server.
8. In Discord, enable Developer Mode, then copy:
   - your Server ID → `DISCORD_GUILD_ID`
   - your user ID → `FOUNDER_USER_ID`
   - your girlfriend's user ID → `COFOUNDER_USER_ID`
9. Copy the Application ID from the Developer Portal → `DISCORD_CLIENT_ID`.
10. Put all secrets/IDs in your hosting provider's environment variables. Use `.env.example` as the reference.

### Required environment variables

```env
DISCORD_TOKEN=secret_bot_token
DISCORD_CLIENT_ID=application_id
DISCORD_GUILD_ID=server_id
BOT_OWNER_USER_ID=your_user_id
FOUNDER_USER_ID=your_user_id
COFOUNDER_USER_ID=cofounder_user_id
AUTO_SETUP=true
```

Set `AUTO_SETUP=true` for the first boot if you want the bot to provision the server immediately. After the initial successful setup you can change it to `false`; `/setup-victorino` remains available for future syncs.

## Hosting

This bot uses the Discord Gateway and must run as a persistent Node.js process. **Do not host the gateway bot as a normal Vercel serverless function.** Use a persistent worker/container host such as a VPS or a service that supports always-on background processes.

A `Dockerfile` is included so the bot can run on any Docker-compatible host.

## Local test

```bash
npm install
cp .env.example .env
# Fill in .env locally. Never commit it.
npm run check
npm start
```

## Permissions after setup

Administrator is the easiest permission for initial provisioning. After the server is built, you can reduce the bot to the permissions it actually needs, including Manage Roles, Manage Channels, Manage Messages, View Channels, Send Messages, Read Message History, Embed Links, Attach Files, and the ability to use application commands.

Keep the bot's Discord role **above every role it needs to assign or edit**.

## Security

- `.env` is gitignored.
- Never commit the Discord bot token.
- If the token is ever exposed, reset it immediately in the Discord Developer Portal.
- Keep production/client channels private by default.
