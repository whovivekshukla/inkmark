#!/bin/bash
set -e

# Validate required environment variables
if [ -z "$INFISICAL_TOKEN" ]; then
  echo "Error: INFISICAL_TOKEN is not set"
  exit 1
fi

if [ -z "$INFISICAL_PROJECT_ID" ]; then
  echo "Error: INFISICAL_PROJECT_ID is not set"
  exit 1
fi

# Run Prisma migrations before starting the server
echo "Running Prisma migrations..."
infisical run --env="${INFISICAL_ENV:-dev}" --projectId="${INFISICAL_PROJECT_ID}" -- \
  pnpm --filter @inkmark/api exec prisma migrate deploy

# Start the API server with secrets injected by Infisical
echo "Starting API server..."
exec infisical run --env="${INFISICAL_ENV:-dev}" --projectId="${INFISICAL_PROJECT_ID}" -- \
  node packages/api/dist/index.js
