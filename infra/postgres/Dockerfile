FROM postgres:16-alpine

# SQL migrations are copied into the official Postgres init directory.
# They are executed automatically on first container start
# (only when PGDATA is empty).
COPY db/migrations /docker-entrypoint-initdb.d
