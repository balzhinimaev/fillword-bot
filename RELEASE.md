# Verified releases (2026-10-23)

Node 24 is used in CI and Docker. Pull requests run the quality gate. A master
push builds and publishes `ghcr.io/OWNER/REPOSITORY:COMMIT_SHA` only after that
gate passes. `latest` is no longer deployed independently of tests.

The former automatic SSH deployment is paused: the legacy VPS is unreachable
from the current host and the bot's last deploy failed SSH authentication.
There is no automatic database rename, environment replacement, rsync deletion,
or Telegram announcement during a merge. Restore deployment only after access,
existing Compose project/volumes, environment and a database backup are verified.

Deploy the immutable image SHA, preserve the existing environment/DB target,
record the previous image for rollback, then check readiness before switching
traffic. Never apply an empty Compose database volume as a production migration.

The bot image includes its build output and runs as UID 1000. Preserve the
existing BOT_TOKEN, webhook/domain and API settings. `MINI_APP_LINK` is read
from the runtime environment. Do not launch a second bot with the same token:
startup changes the webhook and bot commands. An image build is not a running bot.
