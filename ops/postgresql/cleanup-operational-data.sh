#!/usr/bin/env bash
set -euo pipefail

CLEANUP_DATABASES="${CLEANUP_DATABASES:-battleness_staging}"
CLEANUP_MODE="${CLEANUP_MODE:-report}"
SESSION_RETENTION_DAYS="${SESSION_RETENTION_DAYS:-7}"
OAUTH_RETENTION_HOURS="${OAUTH_RETENTION_HOURS:-0}"
QUEUE_RETENTION_DAYS="${QUEUE_RETENTION_DAYS:-30}"

require_nonnegative_integer() {
  local name="$1"
  local value="$2"

  if ! [[ "$value" =~ ^[0-9]+$ ]]; then
    echo "Configuration error: ${name} must be a non-negative integer." >&2
    exit 2
  fi
}

case "$CLEANUP_MODE" in
  report | verify | apply) ;;
  *)
    echo "CLEANUP_MODE must be report, verify, or apply." >&2
    exit 2
    ;;
esac

require_nonnegative_integer SESSION_RETENTION_DAYS "$SESSION_RETENTION_DAYS"
require_nonnegative_integer OAUTH_RETENTION_HOURS "$OAUTH_RETENTION_HOURS"
require_nonnegative_integer QUEUE_RETENTION_DAYS "$QUEUE_RETENTION_DAYS"

mutate=false
commit_changes=false
if [[ "$CLEANUP_MODE" != "report" ]]; then
  mutate=true
fi
if [[ "$CLEANUP_MODE" == "apply" ]]; then
  commit_changes=true
fi

for database in $CLEANUP_DATABASES; do
  case "$database" in
    battleness_staging | battleness_production) ;;
    *)
      echo "Refusing unexpected database name: ${database}" >&2
      exit 2
      ;;
  esac

  echo "Starting BattleNess operational cleanup database=${database} mode=${CLEANUP_MODE}."
  psql \
    --dbname="$database" \
    --set=ON_ERROR_STOP=1 \
    --set=mutate="$mutate" \
    --set=commit_changes="$commit_changes" \
    --set=session_retention_days="$SESSION_RETENTION_DAYS" \
    --set=oauth_retention_hours="$OAUTH_RETENTION_HOURS" \
    --set=queue_retention_days="$QUEUE_RETENTION_DAYS" <<'SQL'
BEGIN;

SELECT 'candidate_player_sessions=' || count(*)
FROM "PlayerSession"
WHERE "expiresAt" <= now() - make_interval(days => :session_retention_days)
   OR ("revokedAt" IS NOT NULL AND "revokedAt" <= now() - make_interval(days => :session_retention_days));

SELECT 'candidate_oauth_attempts=' || count(*)
FROM "OAuthLoginAttempt"
WHERE "expiresAt" <= now() - make_interval(hours => :oauth_retention_hours);

SELECT 'candidate_casual_queue_entries=' || count(*)
FROM "CasualQueueEntry" queue
WHERE queue."updatedAt" <= now() - make_interval(days => :queue_retention_days)
  AND (
    queue.status IN ('cancelled', 'expired')
    OR (
      queue.status = 'matched'
      AND EXISTS (
        SELECT 1
        FROM "BattleRecord" battle
        WHERE battle.id = queue."battleRecordId"
          AND battle.status = 'finished'
      )
    )
  );

SELECT 'candidate_ranked_queue_entries=' || count(*)
FROM "RankedQueueEntry" queue
WHERE queue."updatedAt" <= now() - make_interval(days => :queue_retention_days)
  AND (
    queue.status IN ('cancelled', 'declined', 'expired')
    OR (
      queue.status = 'matched'
      AND EXISTS (
        SELECT 1
        FROM "BattleRecord" battle
        WHERE battle.id = queue."battleRecordId"
          AND battle.status = 'finished'
      )
    )
  );

SELECT 'candidate_private_lobbies=' || count(*)
FROM "PrivateMatch"
WHERE "matchType" = 'private'
  AND status = 'cancelled'
  AND "battleRecordId" IS NULL
  AND "updatedAt" <= now() - make_interval(days => :queue_retention_days);

SELECT 'candidate_ranked_disciplines=' || count(*)
FROM "RankedQueueDiscipline"
WHERE "updatedAt" <= now() - make_interval(days => :queue_retention_days)
  AND ("lockedUntil" IS NULL OR "lockedUntil" <= now())
  AND ("lastMissedAt" IS NULL OR "lastMissedAt" <= now() - make_interval(days => :queue_retention_days));

\if :mutate
DELETE FROM "PlayerSession"
WHERE "expiresAt" <= now() - make_interval(days => :session_retention_days)
   OR ("revokedAt" IS NOT NULL AND "revokedAt" <= now() - make_interval(days => :session_retention_days));

DELETE FROM "OAuthLoginAttempt"
WHERE "expiresAt" <= now() - make_interval(hours => :oauth_retention_hours);

DELETE FROM "CasualQueueEntry" queue
WHERE queue."updatedAt" <= now() - make_interval(days => :queue_retention_days)
  AND (
    queue.status IN ('cancelled', 'expired')
    OR (
      queue.status = 'matched'
      AND EXISTS (
        SELECT 1
        FROM "BattleRecord" battle
        WHERE battle.id = queue."battleRecordId"
          AND battle.status = 'finished'
      )
    )
  );

DELETE FROM "RankedQueueEntry" queue
WHERE queue."updatedAt" <= now() - make_interval(days => :queue_retention_days)
  AND (
    queue.status IN ('cancelled', 'declined', 'expired')
    OR (
      queue.status = 'matched'
      AND EXISTS (
        SELECT 1
        FROM "BattleRecord" battle
        WHERE battle.id = queue."battleRecordId"
          AND battle.status = 'finished'
      )
    )
  );

DELETE FROM "PrivateMatch"
WHERE "matchType" = 'private'
  AND status = 'cancelled'
  AND "battleRecordId" IS NULL
  AND "updatedAt" <= now() - make_interval(days => :queue_retention_days);

DELETE FROM "RankedQueueDiscipline"
WHERE "updatedAt" <= now() - make_interval(days => :queue_retention_days)
  AND ("lockedUntil" IS NULL OR "lockedUntil" <= now())
  AND ("lastMissedAt" IS NULL OR "lastMissedAt" <= now() - make_interval(days => :queue_retention_days));
\else
\echo cleanup_report_only_no_rows_deleted
\endif

\if :commit_changes
COMMIT;
\else
ROLLBACK;
\endif
SQL

  echo "BattleNess operational cleanup complete database=${database} mode=${CLEANUP_MODE}."
done
