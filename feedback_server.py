#!/usr/bin/env python3
"""
Feedback Server for Australian Retirement Calculator
Alternative to PHP-based solution using Python Flask
"""

import json
import os
import smtplib
import socket
from datetime import datetime
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from flask import Flask, request, jsonify, render_template_string, session, redirect, url_for
from flask_cors import CORS
import uuid
import logging

# Configuration
ADMIN_EMAIL = 'gagneet@silverfoxtechnologies.com.au'
ADMIN_PASSWORD = 'Gagneet$5'
FEEDBACK_FILE = 'data/feedback.json'
MAX_FEEDBACK_ITEMS = 100
SECRET_KEY = 'retirement-calculator-secret-key-change-this'

# Initialize Flask app
app = Flask(__name__)
app.secret_key = SECRET_KEY
CORS(app)  # Enable CORS for all routes

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
        # Create message
        msg = MIMEMultipart()
        msg['From'] = f"noreply@{socket.gethostname()}"
        msg['To'] = ADMIN_EMAIL
        msg['Subject'] = f"[Australian Retirement Calculator] New Feedback Received"

        body = f"""
New feedback has been submitted:

Type: {feedback['type'].title()}
Date: {feedback['timestamp']}
IP: {feedback.get('ip', 'Unknown')}

Message:
{feedback['message']}

---
View all feedback at: http://{socket.gethostname()}:5000/admin
        """

        msg.attach(MIMEText(body, 'plain'))

        # For local testing, we'll just log the email
        # In production, configure SMTP settings
        logger.info(f"EMAIL NOTIFICATION: {msg['Subject']}")
        logger.info(f"TO: {ADMIN_EMAIL}")
        logger.info(f"BODY: {body}")

        return True

    except Exception as e:
        logger.error(f"Error sending email: {e}")
        return False

@app.route('/api/feedback', methods=['GET', 'POST', 'OPTIONS'])
def feedback_api():
    """API endpoint for feedback operations"""

    # Handle CORS preflight
    if request.method == 'OPTIONS':
        response = jsonify({'message': 'OK'})
        response.headers.add('Access-Control-Allow-Origin', '*')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type')
        response.headers.add('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        return response

    if request.method == 'GET':
        # Return recent feedback
        feedback = load_feedback()
        recent = feedback[:20]  # Last 20 items
        return jsonify({
            'success': True,
            'feedback': recent,
            'total': len(feedback)
        })

    elif request.method == 'POST':
        # Add new feedback
        data = request.get_json()

        if not data or 'type' not in data or 'message' not in data:
            return jsonify({
                'success': False,
                'error': 'Missing required fields'
            }), 400

        # Validate input
        feedback_type = data['type'].strip()
        message = data['message'].strip()

        if not message or len(message) > 1000:
            return jsonify({
                'success': False,
                'error': 'Message must be between 1 and 1000 characters'
            }), 400

        valid_types = ['feedback', 'defect', 'kudos', 'feature', 'other']
        if feedback_type not in valid_types:
            return jsonify({
                'success': False,
                'error': 'Invalid feedback type'
            }), 400

        # Create feedback entry
        new_feedback = {
            'id': str(uuid.uuid4()),
            'type': feedback_type,
            'message': message,
            'timestamp': datetime.now().isoformat(),
            'ip': request.remote_addr or 'unknown'
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

            return jsonify({
                'success': True,
                'message': 'Feedback saved successfully',
                'id': new_feedback['id']
            })
        else:
            return jsonify({
                'success': False,
                'error': 'Failed to save feedback'
            }), 500

# Admin Panel HTML Template
ADMIN_TEMPLATE = '''
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Feedback Admin Panel | Australian Retirement Calculator</title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gray-100 min-h-screen">
    {% if not logged_in %}
    <!-- Login Form -->
    <div class="min-h-screen flex items-center justify-center">
        <div class="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
            <h1 class="text-2xl font-bold text-gray-900 mb-6 text-center">Admin Login</h1>
            <p class="text-gray-600 mb-4 text-center">Access the feedback admin panel</p>

            {% if error %}
            <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                {{ error }}
            </div>
            {% endif %}

            <form method="POST" class="space-y-4">
                <div>
                    <label for="password" class="block text-sm font-medium text-gray-700 mb-2">Password</label>
                    <input type="password" id="password" name="password" required
                           class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                </div>
                <button type="submit"
                        class="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700">
                    Login
                </button>
            </form>

            <div class="mt-6 text-center">
                <a href="/" class="text-blue-600 hover:text-blue-800 text-sm">← Back to Calculator</a>
            </div>
        </div>
    </div>
    {% else %}
    <!-- Admin Dashboard -->
    <div class="container mx-auto px-4 py-8 max-w-6xl">
        <!-- Header -->
        <div class="bg-white rounded-lg shadow-md p-6 mb-6">
            <div class="flex justify-between items-center">
                <div>
                    <h1 class="text-3xl font-bold text-gray-900">Feedback Admin Panel</h1>
                    <p class="text-gray-600">Australian Retirement Calculator</p>
                </div>
                <div class="flex space-x-4">
                    <a href="/" class="text-blue-600 hover:text-blue-800">View Calculator</a>
                    <a href="/admin?logout=1" class="text-red-600 hover:text-red-800">Logout</a>
                </div>
            </div>
        </div>

        <!-- Statistics -->
        {% if stats %}
        <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            <div class="bg-white p-6 rounded-lg shadow-md">
                <div class="text-2xl font-bold text-blue-600">{{ stats.total }}</div>
                <div class="text-gray-600">Total Feedback</div>
            </div>
            <div class="bg-white p-6 rounded-lg shadow-md">
                <div class="text-2xl font-bold text-green-600">{{ stats.by_type.get('feedback', 0) }}</div>
                <div class="text-gray-600">Feedback</div>
            </div>
            <div class="bg-white p-6 rounded-lg shadow-md">
                <div class="text-2xl font-bold text-red-600">{{ stats.by_type.get('defect', 0) }}</div>
                <div class="text-gray-600">Defects</div>
            </div>
            <div class="bg-white p-6 rounded-lg shadow-md">
                <div class="text-2xl font-bold text-yellow-600">{{ stats.by_type.get('kudos', 0) }}</div>
                <div class="text-gray-600">Kudos</div>
            </div>
        </div>
        {% endif %}

        <!-- Feedback List -->
        <div class="bg-white rounded-lg shadow-md">
            <div class="p-6 border-b border-gray-200">
                <h2 class="text-xl font-semibold text-gray-800">All Feedback</h2>
                <p class="text-gray-600">Total: {{ feedback|length }} items</p>
            </div>

            {% if not feedback %}
            <div class="p-8 text-center text-gray-500">
                <p>No feedback received yet.</p>
            </div>
            {% else %}
            <div class="divide-y divide-gray-200">
                {% for item in feedback %}
                <div class="p-6 hover:bg-gray-50">
                    <div class="flex justify-between items-start mb-3">
                        <div class="flex items-center space-x-3">
                            <span class="text-2xl">
                                {% if item.type == 'feedback' %}💬
                                {% elif item.type == 'defect' %}🐛
                                {% elif item.type == 'kudos' %}👏
                                {% elif item.type == 'feature' %}💡
                                {% else %}📝{% endif %}
                            </span>
                            <div>
                                <div class="font-semibold text-gray-800">{{ item.type.title() }}</div>
                                <div class="text-sm text-gray-500">
                                    {{ item.timestamp }} | IP: {{ item.ip }}
                                </div>
                            </div>
                        </div>
                        <a href="/admin?delete={{ item.id }}"
                           onclick="return confirm('Are you sure you want to delete this feedback?')"
                           class="text-red-600 hover:text-red-800 text-sm">Delete</a>
                    </div>
                    <div class="bg-gray-50 p-4 rounded-md">
                        <p class="text-gray-700 whitespace-pre-wrap">{{ item.message }}</p>
                    </div>
                </div>
                {% endfor %}
            </div>
            {% endif %}
        </div>
    </div>
    {% endif %}
</body>
</html>
'''

@app.route('/admin')
def admin_panel():
    """Admin panel for managing feedback"""

    # Handle logout
    if request.args.get('logout'):
        session.clear()
        return redirect(url_for('admin_panel'))

    # Handle login
    if request.method == 'POST' or request.form.get('password'):
        password = request.form.get('password', '')
        if password == ADMIN_PASSWORD:
            session['admin_logged_in'] = True
            return redirect(url_for('admin_panel'))
        else:
            return render_template_string(ADMIN_TEMPLATE, logged_in=False, error='Invalid password')

    # Check if logged in
    if not session.get('admin_logged_in'):
        return render_template_string(ADMIN_TEMPLATE, logged_in=False)

    # Handle feedback deletion
    if request.args.get('delete'):
        delete_id = request.args.get('delete')
        feedback_list = load_feedback()
        feedback_list = [item for item in feedback_list if item['id'] != delete_id]
        save_feedback(feedback_list)
        return redirect(url_for('admin_panel'))

    # Load feedback and statistics
    feedback = load_feedback()
    stats = None
    if feedback:
        from collections import Counter
        stats = {
            'total': len(feedback),
            'by_type': Counter(item['type'] for item in feedback)
        }

    return render_template_string(ADMIN_TEMPLATE,
                                logged_in=True,
                                feedback=feedback,
                                stats=stats)

@app.route('/admin', methods=['POST'])
def admin_login():
    """Handle admin login POST request"""
    return admin_panel()

if __name__ == '__main__':
    ensure_data_directory()
    print(f"Starting Feedback Server...")
    print(f"Admin panel: http://localhost:5000/admin")
    print(f"Admin password: {ADMIN_PASSWORD}")
    print(f"Email notifications to: {ADMIN_EMAIL}")
    app.run(host='0.0.0.0', port=5000, debug=True)