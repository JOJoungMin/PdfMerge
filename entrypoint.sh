#!/bin/sh
# Set the git commit sha as an environment variable
export NEXT_PUBLIC_GIT_COMMIT_SHA=$(git rev-parse --short HEAD)

# Run prisma generate
npx prisma generate

# Execute the command passed as arguments to this script
exec "$@"