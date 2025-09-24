#!/usr/bin/env python3
"""
Simple Feedback Server using only Python built-in modules
No external dependencies required
"""

import json
import os
import smtplib
import socket
import urllib.parse
from datetime import datetime
from http.server import HTTPServer, BaseHTTPRequestHandler
from email.mime.text import MIMEText
import uuid
import logging
import mimetypes

# Configuration
ADMIN_EMAIL = 'gagneet@silverfoxtechnologies.com.au'
ADMIN_PASSWORD = 'Gagneet$5'
FEEDBACK_FILE = 'data/feedback.json'
MAX_FEEDBACK_ITEMS = 100
PORT = 8001

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def ensure_data_directory():
    """Ensure data directory exists"""
    os.makedirs(os.path.dirname(FEEDBACK_FILE), exist_ok=True)
    if not os.path.exists(FEEDBACK_FILE):
        with open(FEEDBACK_FILE, 'w') as f:
            json.dump([], f)

def load_feedback():
    """Load feedback from JSON file"""
    ensure_data_directory()
    try:
        with open(FEEDBACK_FILE, 'r') as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return []

def save_feedback(feedback_list):
    """Save feedback to JSON file"""
    ensure_data_directory()
    try:
        with open(FEEDBACK_FILE, 'w') as f:
            json.dump(feedback_list, f, indent=2)
        return True
    except Exception as e:
        logger.error(f"Error saving feedback: {e}")
        return False

def send_email_notification(feedback):
    """Send email notification for new feedback"""
    try:
        # For local testing, we'll just log the email
        # In production, configure SMTP settings
        logger.info(f"EMAIL NOTIFICATION SENT!")
        logger.info(f"TO: {ADMIN_EMAIL}")
        logger.info(f"SUBJECT: New Feedback Received - {feedback['type'].title()}")
        logger.info(f"MESSAGE: {feedback['message'][:100]}...")
        return True

    except Exception as e:
        logger.error(f"Error sending email: {e}")
        return False

class FeedbackHandler(BaseHTTPRequestHandler):

    def do_OPTIONS(self):
        """Handle CORS preflight requests"""
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def do_GET(self):
        """Handle GET requests"""
        if self.path == '/api/feedback':
            # Return recent feedback
            feedback = load_feedback()
            recent = feedback[:20]  # Last 20 items

            response = {
                'success': True,
                'feedback': recent,
                'total': len(feedback)
            }

            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps(response).encode())

        elif self.path.startswith('/admin'):
            self.serve_admin_panel()
        elif self.path == '/contact.html' or self.path == '/contact':
            self.serve_contact_page()
        else:
            self.send_response(404)
            self.end_headers()

    def do_POST(self):
        """Handle POST requests"""
        if self.path == '/api/feedback':
            self.handle_feedback_submission()
        elif self.path.startswith('/admin'):
            self.handle_admin_login()
        else:
            self.send_response(404)
            self.end_headers()

    def handle_feedback_submission(self):
        """Handle new feedback submission"""
        try:
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            data = json.loads(post_data.decode())

            # Validate input
            if not data or 'type' not in data or 'message' not in data:
                self.send_error_response(400, 'Missing required fields')
                return

            feedback_type = data['type'].strip()
            message = data['message'].strip()

            if not message or len(message) > 1000:
                self.send_error_response(400, 'Message must be between 1 and 1000 characters')
                return

            valid_types = ['feedback', 'defect', 'kudos', 'feature', 'other']
            if feedback_type not in valid_types:
                self.send_error_response(400, 'Invalid feedback type')
                return

            # Create feedback entry
            new_feedback = {
                'id': str(uuid.uuid4()),
                'type': feedback_type,
                'message': message,
                'timestamp': datetime.now().isoformat(),
                'ip': self.client_address[0]
            }

            # Load existing feedback and add new one
            feedback_list = load_feedback()
            feedback_list.insert(0, new_feedback)

            # Keep only last MAX_FEEDBACK_ITEMS
            if len(feedback_list) > MAX_FEEDBACK_ITEMS:
                feedback_list = feedback_list[:MAX_FEEDBACK_ITEMS]

            # Save feedback
            if save_feedback(feedback_list):
                # Send email notification
                send_email_notification(new_feedback)

                response = {
                    'success': True,
                    'message': 'Feedback saved successfully',
                    'id': new_feedback['id']
                }

                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps(response).encode())
            else:
                self.send_error_response(500, 'Failed to save feedback')

        except Exception as e:
            logger.error(f"Error handling feedback submission: {e}")
            self.send_error_response(500, 'Internal server error')

    def send_error_response(self, code, message):
        """Send JSON error response"""
        response = {'success': False, 'error': message}
        self.send_response(code)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(json.dumps(response).encode())

    def serve_admin_panel(self):
        """Serve admin panel (simplified version)"""
        feedback = load_feedback()

        html = f"""
<!DOCTYPE html>
<html>
<head>
    <title>Feedback Admin Panel</title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gray-100 p-8">
    <div class="max-w-6xl mx-auto">
        <h1 class="text-3xl font-bold mb-6">Feedback Admin Panel</h1>
        <div class="bg-white p-6 rounded shadow">
            <h2 class="text-xl font-semibold mb-4">Recent Feedback ({len(feedback)} total)</h2>
            {''.join([f'''
            <div class="border-b pb-4 mb-4">
                <div class="flex justify-between items-start">
                    <div>
                        <span class="font-semibold">{item['type'].title()}</span>
                        <span class="text-sm text-gray-500 ml-2">{item['timestamp'][:19]}</span>
                    </div>
                    <span class="text-xs text-gray-400">IP: {item['ip']}</span>
                </div>
                <p class="mt-2 text-gray-700">{item['message']}</p>
            </div>
            ''' for item in feedback[:10]])}

            {f'<p class="text-sm text-gray-500 mt-4">Showing first 10 of {len(feedback)} feedback items</p>' if len(feedback) > 10 else ''}
        </div>
    </div>
</body>
</html>
        """

        self.send_response(200)
        self.send_header('Content-Type', 'text/html')
        self.end_headers()
        self.wfile.write(html.encode())

    def serve_contact_page(self):
        """Serve the contact page with modified API URLs"""
        try:
            with open('contact.html', 'r', encoding='utf-8') as f:
                content = f.read()

            # Replace the API URL to use relative paths
            content = content.replace('http://192.168.0.148:8001/api/feedback', '/api/feedback')

            self.send_response(200)
            self.send_header('Content-Type', 'text/html; charset=utf-8')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(content.encode('utf-8'))
        except FileNotFoundError:
            self.send_response(404)
            self.send_header('Content-Type', 'text/html')
            self.end_headers()
            self.wfile.write(b'Contact page not found')

    def handle_admin_login(self):
        """Handle admin login (simplified)"""
        # For simplicity, just redirect to admin panel
        self.serve_admin_panel()

def run_server():
    """Run the feedback server"""
    ensure_data_directory()

    server = HTTPServer(('0.0.0.0', PORT), FeedbackHandler)
    print(f"Starting Feedback Server on http://192.168.0.148:{PORT}")
    print(f"Admin panel: http://192.168.0.148:{PORT}/admin")
    print(f"API endpoint: http://192.168.0.148:{PORT}/api/feedback")
    print(f"Contact form: http://192.168.0.148:{PORT}/contact.html")
    print(f"Email notifications to: {ADMIN_EMAIL}")
    print("Press Ctrl+C to stop the server")

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down server...")
        server.shutdown()

if __name__ == '__main__':
    run_server()