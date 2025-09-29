# Complete Setup Guide - Enhanced Australian Retirement Calculator

## Table of Contents

1. [Quick Setup (5 minutes)](#quick-setup)
2. [Detailed Setup Instructions](#detailed-setup-instructions)
3. [Platform-Specific Instructions](#platform-specific-instructions)
4. [Docker Setup](#docker-setup)
5. [Production Deployment](#production-deployment)
6. [Troubleshooting](#troubleshooting)
7. [Verification Steps](#verification-steps)

## Quick Setup

### Prerequisites
- Modern web browser (Chrome 80+, Firefox 75+, Safari 13+, Edge 80+)
- Python 3 or Node.js (for local server)

### 1-Minute Setup
```bash
# 1. Navigate to project directory
cd retirement_calculator_au

# 2. Start server (choose one)
python -m http.server 8000        # Python 3
# OR
npx serve . --port 8000          # Node.js

# 3. Open browser
# Navigate to http://localhost:8000
```

### First Use
1. Open http://localhost:8000 in your browser
2. Fill in your financial details
3. Click "Generate AI Recommendations"
4. Review the comprehensive analysis across 8 strategic areas

## Detailed Setup Instructions

### System Requirements

#### Minimum Requirements
- **Browser**: Chrome 80+, Firefox 75+, Safari 13+, Edge 80+
- **RAM**: 2GB available
- **Storage**: 50MB for project files
- **Internet**: Required for CDN resources (Tailwind CSS, Chart.js, etc.)

#### Recommended Requirements
- **Browser**: Latest Chrome or Firefox
- **RAM**: 4GB+ available
- **Storage**: 100MB+ free space
- **Internet**: Stable broadband connection

#### Required Browser Features
- ES6 Modules support
- Canvas API (for Chart.js)
- CSS Grid and Flexbox
- Local Storage
- Fetch API

### Installation Options

#### Option 1: Python HTTP Server (Recommended)

**Python 3.x:**
```bash
# Navigate to project directory
cd path/to/retirement_calculator_au

# Start server
python -m http.server 8000

# Alternative port if 8000 is busy
python -m http.server 8080

# Open browser to http://localhost:8000
```

**Python 2.x (Legacy):**
```bash
python -m SimpleHTTPServer 8000
```

**Verify Python Installation:**
```bash
python --version
# Should show Python 3.x.x or 2.x.x
```

#### Option 2: Node.js Server

**Using npx (No installation required):**
```bash
npx serve . --port 8000
# Usually serves on http://localhost:3000 or http://localhost:5000
```

**Using http-server globally:**
```bash
# Install globally
npm install -g http-server

# Start server
http-server -p 8000 -c-1

# -c-1 disables caching for development
```

**Using Express (Custom server):**
```bash
# Create server.js
node -e "
const express = require('express');
const path = require('path');
const app = express();

app.use(express.static('.'));
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

const port = 8000;
app.listen(port, () => {
    console.log(\`Server running at http://localhost:\${port}\`);
});
"
```

#### Option 3: VS Code Live Server

1. Install "Live Server" extension in VS Code
2. Right-click on `index.html`
3. Select "Open with Live Server"
4. Automatically opens in browser

**VS Code Settings (Optional):**
```json
{
  "liveServer.settings.port": 8000,
  "liveServer.settings.CustomBrowser": "chrome",
  "liveServer.settings.NoBrowser": false,
  "liveServer.settings.ignoreFiles": [
    ".vscode/**",
    "**/*.scss",
    "**/*.sass"
  ]
}
```

#### Option 4: PHP Server

```bash
# If you have PHP installed
php -S localhost:8000

# Verify PHP installation
php --version
```

## Platform-Specific Instructions

### Windows

#### Using Command Prompt
```cmd
# Navigate to project folder
cd C:\path\to\retirement_calculator_au

# Python method
python -m http.server 8000

# Node.js method
npx serve . --port 8000
```

#### Using PowerShell
```powershell
# Navigate to project
Set-Location "C:\path\to\retirement_calculator_au"

# Start Python server
python -m http.server 8000

# Check if Python is available
python --version
```

#### Windows-Specific Issues
- **Path Issues**: Use forward slashes or escape backslashes
- **Python Not Found**: Install Python from python.org
- **Node Not Found**: Install Node.js from nodejs.org
- **Permission Issues**: Run as Administrator if needed

### macOS

#### Using Terminal
```bash
# Navigate to project
cd ~/path/to/retirement_calculator_au

# Python (usually pre-installed)
python3 -m http.server 8000

# If python3 not found, try python
python -m http.server 8000

# Node.js method
npx serve . --port 8000
```

#### macOS-Specific Issues
- **Python Version**: macOS may have both Python 2 and 3, use `python3`
- **Homebrew**: Install via `brew install python` or `brew install node`
- **Firewall**: Allow Python/Node through macOS firewall

### Linux (Ubuntu/Debian)

#### Using Terminal
```bash
# Navigate to project
cd ~/retirement_calculator_au

# Python (usually pre-installed)
python3 -m http.server 8000

# Install Python if missing
sudo apt update
sudo apt install python3

# Install Node.js if needed
sudo apt install nodejs npm
```

#### Linux-Specific Issues
- **Permissions**: May need `sudo` for package installation
- **Port 8000 Busy**: Try alternative ports (8080, 3000, 5000)
- **Firewall**: Configure UFW if needed

## Docker Setup

### Basic Docker Setup

**Dockerfile:**

```dockerfile
FROM nginx:alpine

# Copy project files
COPY ../.. /usr/share/nginx/html

# Configure nginx for ES6 modules
COPY nginx.conf /etc/nginx/nginx.conf

# Expose port 80
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

**nginx.conf (for proper ES6 module serving):**
```nginx
events {
    worker_connections 1024;
}

http {
    include       /etc/nginx/mime.types;
    default_type  application/octet-stream;

    # Ensure .js files are served as JavaScript modules
    location ~* \.js$ {
        add_header Content-Type application/javascript;
    }

    server {
        listen 80;
        server_name localhost;
        root /usr/share/nginx/html;
        index index.html;

        location / {
            try_files $uri $uri/ /index.html;
        }
    }
}
```

**Build and Run:**
```bash
# Build Docker image
docker build -t retirement-calculator .

# Run container
docker run -d -p 8080:80 --name retirement-calc retirement-calculator

# View running containers
docker ps

# Stop container
docker stop retirement-calc

# Remove container
docker rm retirement-calc
```

### Docker Compose Setup

**docker-compose.yml:**
```yaml
version: '3.8'

services:
  retirement-calculator:
    build: .
    ports:
      - "8080:80"
    container_name: retirement-calculator
    restart: unless-stopped

  # Optional: Add development server with hot reload
  dev-server:
    image: node:16-alpine
    working_dir: /app
    volumes:
      - .:/app
    command: npx serve . --port 3000
    ports:
      - "3000:3000"
    profiles:
      - dev
```

**Commands:**
```bash
# Start production
docker-compose up -d

# Start development
docker-compose --profile dev up -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down
```

## Production Deployment

### Static Site Hosting

#### GitHub Pages
1. Push project to GitHub repository
2. Go to Settings → Pages
3. Select source branch (usually `main`)
4. Site will be available at `https://username.github.io/repository-name`

#### Netlify
1. Connect GitHub repository to Netlify
2. Build settings: None required (static site)
3. Deploy automatically on commits

#### Vercel
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod

# Follow prompts for configuration
```

#### AWS S3 + CloudFront
```bash
# Upload to S3 bucket
aws s3 sync . s3://your-bucket-name --delete

# Configure CloudFront for ES6 modules
# Ensure proper MIME types in S3/CloudFront
```

### Server Configuration

#### Nginx Configuration
```nginx
server {
    listen 80;
    server_name your-domain.com;
    root /path/to/retirement_calculator_au;
    index index.html;

    # ES6 module support
    location ~* \.js$ {
        add_header Content-Type application/javascript;
        add_header Cache-Control "public, max-age=31536000";
    }

    # CSS and other static files
    location ~* \.(css|png|jpg|jpeg|gif|ico|svg)$ {
        add_header Cache-Control "public, max-age=31536000";
    }

    # HTML files
    location ~* \.html$ {
        add_header Cache-Control "public, max-age=0";
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

#### Apache Configuration (.htaccess)
```apache
# ES6 Module MIME type
AddType application/javascript .js

# Cache control
<FilesMatch "\.(js|css|png|jpg|jpeg|gif|ico|svg)$">
    ExpiresActive On
    ExpiresDefault "access plus 1 year"
</FilesMatch>

<FilesMatch "\.html$">
    ExpiresActive On
    ExpiresDefault "access plus 0 seconds"
</FilesMatch>

# Fallback for SPA
Options -MultiViews
RewriteEngine On
RewriteCond %{REQUEST_FILENAME} !-f
RewriteRule ^ index.html [QSA,L]
```

## Troubleshooting

### Common Issues and Solutions

#### 1. ES6 Module Loading Errors

**Error:** "Failed to resolve module specifier"

**Causes:**
- Files served via `file://` protocol instead of HTTP
- Incorrect module paths
- Browser doesn't support ES6 modules

**Solutions:**
```bash
# ✅ Correct: Use HTTP server
python -m http.server 8000
# Open http://localhost:8000

# ❌ Wrong: Opening file directly
# file:///path/to/index.html
```

**Check in Browser Console:**
```javascript
// Verify protocol
console.log(window.location.protocol); // Should be "http:" or "https:"

// Test module support
if ('noModule' in HTMLScriptElement.prototype) {
  console.log('✅ ES6 modules supported');
} else {
  console.log('❌ ES6 modules not supported');
}
```

#### 2. CORS Errors

**Error:** "Cross-Origin Request Blocked"

**Solutions:**
```bash
# Python with CORS headers
python -c "
import http.server
import socketserver

class CORSHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        super().end_headers()

with socketserver.TCPServer(('', 8000), CORSHTTPRequestHandler) as httpd:
    print('Server running at http://localhost:8000')
    httpd.serve_forever()
"

# Node.js with CORS
npx http-server . -p 8000 --cors
```

#### 3. Port Already in Use

**Error:** "Address already in use"

**Solutions:**
```bash
# Find what's using the port
lsof -i :8000        # macOS/Linux
netstat -ano | findstr :8000    # Windows

# Use alternative port
python -m http.server 8080
python -m http.server 3000

# Kill process using port (be careful!)
kill -9 $(lsof -t -i:8000)      # macOS/Linux
taskkill /F /PID <PID>           # Windows
```

#### 4. Chart.js Not Loading

**Error:** Charts not displaying

**Solutions:**
```javascript
// Check if Chart.js loaded
if (typeof Chart === 'undefined') {
  console.error('❌ Chart.js not loaded');
  console.log('Check CDN connection and script tag');
} else {
  console.log('✅ Chart.js loaded successfully');
}

// Verify internet connection for CDN
fetch('https://cdn.jsdelivr.net/npm/chart.js')
  .then(response => console.log('✅ CDN accessible'))
  .catch(error => console.log('❌ CDN not accessible:', error));
```

#### 5. Performance Issues

**Symptoms:** Slow loading, browser freezing during Monte Carlo

**Solutions:**
```javascript
// Check browser performance
console.time('page-load');
window.addEventListener('load', () => {
  console.timeEnd('page-load');
});

// Reduce Monte Carlo runs for testing
const testRuns = 100; // Instead of 5000

// Enable browser dev tools performance monitoring
// Chrome DevTools → Performance → Record
```

### Browser-Specific Issues

#### Chrome
- **Issue**: Strict CORS policies
- **Solution**: Use `--disable-web-security` flag (development only)
- **Command**: `chrome --disable-web-security --user-data-dir=/tmp/chrome_dev`

#### Firefox
- **Issue**: ES6 module support
- **Solution**: Ensure Firefox 60+ and check `about:config` → `dom.moduleScripts.enabled`

#### Safari
- **Issue**: Local storage limitations
- **Solution**: Enable "Develop" menu → "Disable Local File Restrictions"

#### Edge
- **Issue**: Legacy Edge compatibility
- **Solution**: Use Chromium-based Edge (80+)

### Network Issues

#### Firewall Blocking
```bash
# Allow Python through Windows Firewall
netsh advfirewall firewall add rule name="Python HTTP Server" dir=in action=allow protocol=TCP localport=8000

# macOS: System Preferences → Security & Privacy → Firewall → Options
# Allow Python/Node.js through firewall

# Linux (UFW)
sudo ufw allow 8000/tcp
```

#### Proxy Settings
```bash
# Set proxy for npm (if needed)
npm config set proxy http://proxy.company.com:8080
npm config set https-proxy http://proxy.company.com:8080

# Unset proxy
npm config delete proxy
npm config delete https-proxy
```

## Verification Steps

### 1. Basic Functionality Test
```javascript
// Open browser console and run:

// Test 1: Module loading
console.log('Testing module loading...');
import('./js/config.js').then(config => {
  console.log('✅ Modules loading correctly');
}).catch(error => {
  console.error('❌ Module loading failed:', error);
});

// Test 2: DOM elements
console.log('Testing DOM elements...');
const requiredElements = [
  'yourCurrentAge', 'retirementAge', 'yourCurrentSuper',
  'btnGenerateRecommendations', 'recommendationsContainer'
];

const missing = requiredElements.filter(id => !document.getElementById(id));
if (missing.length === 0) {
  console.log('✅ All required DOM elements present');
} else {
  console.error('❌ Missing DOM elements:', missing);
}

// Test 3: CDN resources
const cdnTests = [
  { name: 'Chart.js', test: () => typeof Chart !== 'undefined' },
  { name: 'XLSX', test: () => typeof XLSX !== 'undefined' },
  { name: 'jsPDF', test: () => typeof window.jspdf !== 'undefined' }
];

cdnTests.forEach(({ name, test }) => {
  if (test()) {
    console.log(`✅ ${name} loaded`);
  } else {
    console.warn(`⚠️ ${name} not loaded (may load on demand)`);
  }
});
```

### 2. Calculation Test
```javascript
// Test recommendation engine
async function testRecommendationEngine() {
  try {
    // Use minimal test inputs
    const testInputs = {
      yourCurrentAge: 45,
      retirementAge: 65,
      yourCurrentSuper: 200000,
      yourSalary: 80000,
      riskTolerance: 60,
      // ... minimal required inputs
    };

    const simulator = new RetirementSimulator();
    const engine = new DecisionSupportEngine(simulator, testInputs);

    const recommendations = await engine.generateComprehensiveRecommendations();

    if (recommendations.length > 0) {
      console.log(`✅ Recommendation engine working (${recommendations.length} recommendations)`);
      return true;
    } else {
      console.warn('⚠️ No recommendations generated');
      return false;
    }

  } catch (error) {
    console.error('❌ Recommendation engine test failed:', error);
    return false;
  }
}

// Run test
testRecommendationEngine();
```

### 3. Export Test
```javascript
// Test export functionality
async function testExportFunctions() {
  const results = [];

  // Test CSV export
  try {
    const csvData = "test,data\n1,2\n3,4";
    const csvBlob = new Blob([csvData], { type: 'text/csv' });
    results.push({ format: 'CSV', status: '✅' });
  } catch (error) {
    results.push({ format: 'CSV', status: '❌', error });
  }

  // Test XLSX (if loaded)
  try {
    if (typeof XLSX !== 'undefined') {
      const ws = XLSX.utils.aoa_to_sheet([['test'], [1]]);
      results.push({ format: 'XLSX', status: '✅' });
    } else {
      results.push({ format: 'XLSX', status: '⚠️ Library not loaded' });
    }
  } catch (error) {
    results.push({ format: 'XLSX', status: '❌', error });
  }

  console.log('Export Test Results:', results);
  return results;
}

testExportFunctions();
```

### 4. Performance Verification
```javascript
// Performance benchmark
async function performanceBenchmark() {
  console.log('=== Performance Benchmark ===');

  const testInputs = {
    yourCurrentAge: 45,
    retirementAge: 65,
    yourCurrentSuper: 200000,
    yourSalary: 80000,
    riskTolerance: 60,
    // Add other required inputs...
  };

  // Test Monte Carlo performance
  const runs = [100, 500, 1000];
  const simulator = new RetirementSimulator();

  for (const runCount of runs) {
    const startTime = performance.now();
    await simulator.runMonteCarloSimulation(testInputs, runCount);
    const duration = performance.now() - startTime;

    console.log(`${runCount} Monte Carlo runs: ${duration.toFixed(0)}ms`);

    if (duration > 10000) { // 10 seconds
      console.warn(`⚠️ Performance concern: ${runCount} runs took ${(duration/1000).toFixed(1)}s`);
    }
  }
}

performanceBenchmark();
```

This comprehensive setup guide should help users get the Enhanced Australian Retirement Calculator running in any environment, from development to production deployment.