<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    exit(0);
}

<?php
// Configuration - Use environment variables for sensitive data
define('FEEDBACK_FILE', '../data/feedback.json');
define('ADMIN_EMAIL', $_ENV['ADMIN_EMAIL'] ?? 'admin@example.com');
define('SITE_NAME', 'Australian Retirement Calculator');

// Ensure data directory exists
$dataDir = dirname(FEEDBACK_FILE);
if (!is_dir($dataDir)) {
    mkdir($dataDir, 0755, true);
}

// Initialize feedback file if it doesn't exist
if (!file_exists(FEEDBACK_FILE)) {
    file_put_contents(FEEDBACK_FILE, json_encode([]));
}

function loadFeedback() {
    $content = file_get_contents(FEEDBACK_FILE);
    return json_decode($content, true) ?: [];
}

function saveFeedback($feedbackList) {
    return file_put_contents(FEEDBACK_FILE, json_encode($feedbackList, JSON_PRETTY_PRINT));
}

function sanitizeInput($input) {
    return htmlspecialchars(strip_tags(trim($input)), ENT_QUOTES, 'UTF-8');
}

function sendEmailNotification($feedback) {
    $subject = "[" . SITE_NAME . "] New Feedback Received";
    $message = "New feedback has been submitted:\n\n";
    $message .= "Type: " . ucfirst($feedback['type']) . "\n";
    $message .= "Date: " . date('Y-m-d H:i:s', strtotime($feedback['timestamp'])) . "\n";
    $message .= "Message: " . $feedback['message'] . "\n\n";
    $message .= "View all feedback: " . $_SERVER['HTTP_HOST'] . "/admin-feedback.php";

    $headers = "From: noreply@" . $_SERVER['HTTP_HOST'] . "\r\n";
    $headers .= "Reply-To: noreply@" . $_SERVER['HTTP_HOST'] . "\r\n";

    // Enable email notifications
    mail(ADMIN_EMAIL, $subject, $message, $headers);
}

// Handle different HTTP methods
switch ($_SERVER['REQUEST_METHOD']) {
    case 'GET':
        // Return recent feedback (last 20 items)
        $feedback = loadFeedback();
        $recent = array_slice($feedback, 0, 20);
        echo json_encode([
            'success' => true,
            'feedback' => $recent,
            'total' => count($feedback)
        ]);
        break;

    case 'POST':
        // Add new feedback
        $input = json_decode(file_get_contents('php://input'), true);

        if (!$input || !isset($input['type']) || !isset($input['message'])) {
            http_response_code(400);
            echo json_encode([
                'success' => false,
                'error' => 'Missing required fields'
            ]);
            exit;
        }

        // Validate and sanitize input
        $type = sanitizeInput($input['type']);
        $message = sanitizeInput($input['message']);

        if (empty($message) || strlen($message) > 1000) {
            http_response_code(400);
            echo json_encode([
                'success' => false,
                'error' => 'Message must be between 1 and 1000 characters'
            ]);
            exit;
        }

        $validTypes = ['feedback', 'defect', 'kudos', 'feature', 'other'];
        if (!in_array($type, $validTypes)) {
            http_response_code(400);
            echo json_encode([
                'success' => false,
                'error' => 'Invalid feedback type'
            ]);
            exit;
        }

        // Create feedback entry
        $feedback = [
            'id' => uniqid(),
            'type' => $type,
            'message' => $message,
            'timestamp' => date('c'),
            'ip' => $_SERVER['REMOTE_ADDR'] ?? 'unknown'
        ];

        // Load existing feedback and add new one
        $feedbackList = loadFeedback();
        array_unshift($feedbackList, $feedback);

        // Keep only last 100 feedback items
        if (count($feedbackList) > 100) {
            $feedbackList = array_slice($feedbackList, 0, 100);
        }

        // Save feedback
        if (saveFeedback($feedbackList)) {
            // Send email notification
            sendEmailNotification($feedback);

            echo json_encode([
                'success' => true,
                'message' => 'Feedback saved successfully',
                'id' => $feedback['id']
            ]);
        } else {
            http_response_code(500);
            echo json_encode([
                'success' => false,
                'error' => 'Failed to save feedback'
            ]);
        }
        break;

    default:
        http_response_code(405);
        echo json_encode([
            'success' => false,
            'error' => 'Method not allowed'
        ]);
        break;
}
?>