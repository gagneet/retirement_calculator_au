#!/bin/bash
# Build and deploy script for Australian Retirement Calculator
# Deploys to https://retirement.gagneet.com via nginx from /dist/

set -e

PROJECT_DIR="/home/gagneet/finance/retirement_calculator_au"
DIST_DIR="$PROJECT_DIR/dist"
LOG_FILE="$PROJECT_DIR/deploy.log"
START_TIME=$(date '+%Y-%m-%d %H:%M:%S')

cd "$PROJECT_DIR"

echo "[$START_TIME] Starting build and deploy..." | tee -a "$LOG_FILE"

# Log git context so each deploy entry is traceable
GIT_BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unknown")
GIT_COMMIT=$(git log --oneline -1 2>/dev/null || echo "unknown")
echo "  Branch: $GIT_BRANCH | Commit: $GIT_COMMIT" | tee -a "$LOG_FILE"

# Warn if there are uncommitted changes
if ! git diff --quiet 2>/dev/null || ! git diff --cached --quiet 2>/dev/null; then
    echo "WARNING: Uncommitted changes present — deploying working tree state." | tee -a "$LOG_FILE"
fi

# 1. Check Node/npm
if ! command -v npm &> /dev/null; then
    echo "ERROR: npm not found. Please install Node.js." | tee -a "$LOG_FILE"
    exit 1
fi

NODE_VER=$(node --version 2>/dev/null || echo "unknown")
NPM_VER=$(npm --version 2>/dev/null || echo "unknown")
echo "  Node: $NODE_VER | npm: $NPM_VER" | tee -a "$LOG_FILE"

# 2. Clean install dependencies for a reproducible build
echo "Installing dependencies (clean install)..." | tee -a "$LOG_FILE"
npm ci 2>&1 | tee -a "$LOG_FILE"

# 3. Remove dist explicitly before build (webpack has clean:true but belt-and-suspenders)
echo "Cleaning previous build..." | tee -a "$LOG_FILE"
rm -rf "$DIST_DIR"

# 4. Run webpack build
echo "Building application..." | tee -a "$LOG_FILE"
npm run build 2>&1 | tee -a "$LOG_FILE"

if [ ! -d "$DIST_DIR" ]; then
    echo "ERROR: Build failed — dist/ directory not found." | tee -a "$LOG_FILE"
    exit 1
fi

# Verify critical output files exist
MISSING=0
for f in index.html advanced.html advanced-design.html comparison.html contact.html privacy.html terms.html assumptions.html changelog.html methodology.html how-to-use.html robots.txt sitemap.xml; do
    if [ ! -f "$DIST_DIR/$f" ]; then
        echo "ERROR: Expected build output missing: $f" | tee -a "$LOG_FILE"
        MISSING=1
    fi
done
if [ "$MISSING" -eq 1 ]; then
    exit 1
fi

echo "Build complete. Output summary:" | tee -a "$LOG_FILE"
find "$DIST_DIR" -maxdepth 2 -type f | sort | tee -a "$LOG_FILE"
echo "Total: $(find "$DIST_DIR" -type f | wc -l) files, $(du -sh "$DIST_DIR" | cut -f1) on disk" | tee -a "$LOG_FILE"

# 5. Reload nginx to pick up any config changes
echo "Reloading nginx..." | tee -a "$LOG_FILE"
if sudo nginx -t 2>&1 | tee -a "$LOG_FILE"; then
    sudo systemctl reload nginx 2>&1 | tee -a "$LOG_FILE"
    echo "Nginx reloaded successfully." | tee -a "$LOG_FILE"
else
    echo "ERROR: nginx config test failed. Skipping reload." | tee -a "$LOG_FILE"
    exit 1
fi

# 6. Verify key pages are reachable
echo "Verifying deployment..." | tee -a "$LOG_FILE"
VERIFY_FAIL=0
for path in "" "advanced-design.html" "comparison.html" "contact.html"; do
    URL="https://retirement.gagneet.com/$path"
    HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$URL")
    if [ "$HTTP_STATUS" = "200" ]; then
        echo "  OK ($HTTP_STATUS): $URL" | tee -a "$LOG_FILE"
    else
        echo "  WARN ($HTTP_STATUS): $URL" | tee -a "$LOG_FILE"
        VERIFY_FAIL=1
    fi
done

END_TIME=$(date '+%Y-%m-%d %H:%M:%S')
if [ "$VERIFY_FAIL" -eq 0 ]; then
    echo "[$END_TIME] Deployment successful. Site is live at https://retirement.gagneet.com" | tee -a "$LOG_FILE"
else
    echo "[$END_TIME] Deployment complete with warnings. Check nginx logs:" | tee -a "$LOG_FILE"
    echo "  sudo tail -50 /var/log/nginx/retirement_error.log" | tee -a "$LOG_FILE"
fi
