#!/usr/bin/env bash

# PR Preparation script (local helper)
# - Ensures vite-env.d.ts exists
# - Installs devDependencies: vite @types/node (if using npm)
# - Restarts TS server in VS Code (manual step required)

set -e

cat > src/vite-env.d.ts <<'EOF'
/// <reference types="vite/client" />
EOF

echo "Created src/vite-env.d.ts"

echo "Run: npm install -D vite @types/node  # or yarn/pnpm equivalent"