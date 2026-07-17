# Observability

BattleNess currently provides a lightweight application-level observability layer for local development and single-process operation.

## Request Correlation

- Every Nuxt server request receives an `x-request-id` response header.
- A client-provided `x-request-id` is preserved when it contains 1 to 100 letters, digits, dots, underscores, colons, or hyphens.
- Invalid or missing identifiers are replaced with a server-generated UUID.
- Error records use the same correlation identifier so a client failure can be matched to its server log.

## Structured Error Logs

Unhandled request errors are written to standard output as single-line JSON records with the `operational_error` event name. Ranked-season background maintenance failures use the same format.

Records may contain:

- timestamp, severity, category, source, and HTTP status;
- correlation ID, method, and path without query parameters;
- authenticated player ID and battle ID when already available in trusted request context;
- error name, a length-limited message, and explicitly supplied operational metadata.

Request bodies, query parameters, cookies, session identifiers, authorization headers, and stack traces are not recorded. Future metadata additions must remain allowlisted and must never contain secrets or personal authentication data.

## Development Diagnostics

The current process retains the newest 100 records in a bounded memory buffer. Authenticated development users can inspect or clear it through:

- `GET /api/dev/diagnostics`
- `DELETE /api/dev/diagnostics`

Both endpoints return `404` from their handler in production. The buffer is process-local, is cleared on restart, and is not a replacement for a production log service.

## Production Follow-up

Before production deployment, route JSON standard output to the selected hosting platform's log collector. Add alerting, retention, and redaction controls there rather than persisting operational errors in the gameplay database. Shared tracing and metrics can be added after the deployment platform and horizontal scaling model are decided.
