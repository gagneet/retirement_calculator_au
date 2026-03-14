#!/bin/bash
# Build and deploy script for Australian Retirement Calculator
# Deploys to https://retirement.gagneet.com via nginx from /dist/

set -e

PROJECT_DIR="/home/gagneet/retirement_calculator_au"
DIST_DIR="$PROJECT_DIR/dist"
LOG_FILE="$PROJECT_DIR/deploy.log"
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

cd "$PROJECT_DIR"

echo "[$TIMESTAMP] Starting build and deploy..." | tee -a "$LOG_FILE"

# 1. Check Node/npm
if ! command -v npm &> /dev/null; then
    echo "ERROR: npm not found. Please install Node.js." | tee -a "$LOG_FILE"
    exit 1
fi

# 2. Install/update dependencies if needed
if [ ! -d node_modules ] || [ package.json -nt node_modules ]; then
    echo "Installing dependencies..." | tee -a "$LOG_FILE"
    npm install 2>&1 | tee -a "$LOG_FILE"
fi

# 3. Run webpack build
echo "Building application..." | tee -a "$LOG_FILE"
npm run build 2>&1 | tee -a "$LOG_FILE"

if [ ! -d "$DIST_DIR" ]; then
    echo "ERROR: Build failed — dist/ directory not found." | tee -a "$LOG_FILE"
    exit 1
fi

echo "Build complete. Files in $DIST_DIR:" | tee -a "$LOG_FILE"
ls -lh "$DIST_DIR"/*.html "$DIST_DIR"/*.js "$DIST_DIR"/*.css 2>/dev/null | tee -a "$LOG_FILE" || true

# 4. Reload nginx to pick up any config changes (no restart needed for static files)
echo "Reloading nginx..." | tee -a "$LOG_FILE"
if sudo nginx -t 2>&1 | tee -a "$LOG_FILE"; then
    sudo systemctl reload nginx 2>&1 | tee -a "$LOG_FILE"
    echo "Nginx reloaded successfully." | tee -a "$LOG_FILE"
else
    echo "ERROR: nginx config test failed. Skipping reload." | tee -a "$LOG_FILE"
    exit 1
fi

# 5. Verify the site is reachable
echo "Verifying deployment..." | tee -a "$LOG_FILE"
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 https://retirement.gagneet.com)
if [ "$HTTP_STATUS" = "200" ]; then
    echo "Deployment successful. Site is live at https://retirement.gagneet.com (HTTP $HTTP_STATUS)" | tee -a "$LOG_FILE"
else
    echo "WARNING: Site returned HTTP $HTTP_STATUS. Check nginx logs:" | tee -a "$LOG_FILE"
    echo "  sudo tail -50 /var/log/nginx/retirement_error.log" | tee -a "$LOG_FILE"
fi

echo "[$TIMESTAMP] Done." | tee -a "$LOG_FILE"
