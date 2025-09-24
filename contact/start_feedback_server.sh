#!/bin/bash
# Feedback Server Startup Script for Australian Retirement Calculator

echo "🚀 Starting Feedback Server..."
echo "📧 Email notifications will be sent to: gagneet@silverfoxtechnologies.com.au"
echo "🔐 Admin password: Gagneet\$5"
echo "🌐 Server IP: 192.168.0.148"
echo ""

cd /home/gagneet/retirement_calculator_au

# Check if server is already running
if lsof -i :8001 > /dev/null 2>&1; then
    echo "⚠️  Server is already running on port 8001"
    echo "   Visit: http://192.168.0.148:8001/admin"
    exit 1
fi

# Start the server
echo "Starting Python feedback server..."
python3 simple_feedback_server.py