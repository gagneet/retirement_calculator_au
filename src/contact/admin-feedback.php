<?php
// Simple password protection
session_start();

define('ADMIN_PASSWORD', 'Gagneet$5');
define('FEEDBACK_FILE', 'data/feedback.json');

// Handle login
if (isset($_POST['password'])) {
    if ($_POST['password'] === ADMIN_PASSWORD) {
        $_SESSION['admin_logged_in'] = true;
    } else {
        $error = 'Invalid password';
    }
}

// Handle logout
if (isset($_GET['logout'])) {
    session_destroy();
    header('Location: admin-feedback.php');
    exit;
}

// Check if logged in
$isLoggedIn = isset($_SESSION['admin_logged_in']) && $_SESSION['admin_logged_in'];

// Load feedback if logged in
$feedback = [];
$totalCount = 0;
if ($isLoggedIn && file_exists(FEEDBACK_FILE)) {
    $content = file_get_contents(FEEDBACK_FILE);
    $feedback = json_decode($content, true) ?: [];
    $totalCount = count($feedback);
}

// Handle feedback deletion
if ($isLoggedIn && isset($_GET['delete']) && isset($_GET['id'])) {
    $deleteId = $_GET['id'];
    $feedback = array_filter($feedback, function($item) use ($deleteId) {
        return $item['id'] !== $deleteId;
    });
    file_put_contents(FEEDBACK_FILE, json_encode(array_values($feedback), JSON_PRETTY_PRINT));
    header('Location: admin-feedback.php');
    exit;
}

// Statistics
$stats = [];
if ($isLoggedIn && !empty($feedback)) {
    $stats = [
        'total' => count($feedback),
        'by_type' => array_count_values(array_column($feedback, 'type')),
        'recent' => array_slice($feedback, 0, 5)
    ];
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Feedback Admin Panel | Australian Retirement Calculator</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="icon" type="image/svg+xml" href="assets/favicon.svg">
</head>
<body class="bg-gray-100 min-h-screen">
    <?php if (!$isLoggedIn): ?>
        <!-- Login Form -->
        <div class="min-h-screen flex items-center justify-center">
            <div class="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
                <h1 class="text-2xl font-bold text-gray-900 mb-6 text-center">Admin Login</h1>
                <p class="text-gray-600 mb-4 text-center">Access the feedback admin panel</p>

                <?php if (isset($error)): ?>
                    <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                        <?= htmlspecialchars($error) ?>
                    </div>
                <?php endif; ?>

                <form method="POST" class="space-y-4">
                    <div>
                        <label for="password" class="block text-sm font-medium text-gray-700 mb-2">Password</label>
                        <input
                            type="password"
                            id="password"
                            name="password"
                            required
                            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                    </div>
                    <button
                        type="submit"
                        class="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        Login
                    </button>
                </form>

                <div class="mt-6 text-center">
                    <a href="/" class="text-blue-600 hover:text-blue-800 text-sm">← Back to Calculator</a>
                </div>
            </div>
        </div>
    <?php else: ?>
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
                        <a href="?logout=1" class="text-red-600 hover:text-red-800">Logout</a>
                    </div>
                </div>
            </div>

            <!-- Statistics -->
            <?php if (!empty($stats)): ?>
            <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
                <div class="bg-white p-6 rounded-lg shadow-md">
                    <div class="text-2xl font-bold text-blue-600"><?= $stats['total'] ?></div>
                    <div class="text-gray-600">Total Feedback</div>
                </div>

                <?php foreach (['feedback', 'defect', 'kudos'] as $type): ?>
                <div class="bg-white p-6 rounded-lg shadow-md">
                    <div class="text-2xl font-bold text-green-600"><?= $stats['by_type'][$type] ?? 0 ?></div>
                    <div class="text-gray-600"><?= ucfirst($type) ?></div>
                </div>
                <?php endforeach; ?>
            </div>
            <?php endif; ?>

            <!-- Feedback List -->
            <div class="bg-white rounded-lg shadow-md">
                <div class="p-6 border-b border-gray-200">
                    <h2 class="text-xl font-semibold text-gray-800">All Feedback</h2>
                    <p class="text-gray-600">Total: <?= $totalCount ?> items</p>
                </div>

                <?php if (empty($feedback)): ?>
                    <div class="p-8 text-center text-gray-500">
                        <p>No feedback received yet.</p>
                    </div>
                <?php else: ?>
                    <div class="divide-y divide-gray-200">
                        <?php foreach ($feedback as $item): ?>
                            <div class="p-6 hover:bg-gray-50">
                                <div class="flex justify-between items-start mb-3">
                                    <div class="flex items-center space-x-3">
                                        <span class="text-2xl">
                                            <?php
                                            $emojis = [
                                                'feedback' => '💬',
                                                'defect' => '🐛',
                                                'kudos' => '👏',
                                                'feature' => '💡',
                                                'other' => '📝'
                                            ];
                                            echo $emojis[$item['type']] ?? '📝';
                                            ?>
                                        </span>
                                        <div>
                                            <div class="font-semibold text-gray-800">
                                                <?= ucfirst($item['type']) ?>
                                            </div>
                                            <div class="text-sm text-gray-500">
                                                <?= date('M j, Y g:i A', strtotime($item['timestamp'])) ?>
                                                <?php if (isset($item['ip'])): ?>
                                                    | IP: <?= htmlspecialchars($item['ip']) ?>
                                                <?php endif; ?>
                                            </div>
                                        </div>
                                    </div>
                                    <a
                                        href="?delete=1&id=<?= urlencode($item['id']) ?>"
                                        onclick="return confirm('Are you sure you want to delete this feedback?')"
                                        class="text-red-600 hover:text-red-800 text-sm"
                                    >
                                        Delete
                                    </a>
                                </div>

                                <div class="bg-gray-50 p-4 rounded-md">
                                    <p class="text-gray-700 whitespace-pre-wrap"><?= htmlspecialchars($item['message']) ?></p>
                                </div>
                            </div>
                        <?php endforeach; ?>
                    </div>
                <?php endif; ?>
            </div>

            <!-- Export Options -->
            <?php if (!empty($feedback)): ?>
            <div class="mt-6 bg-white rounded-lg shadow-md p-6">
                <h3 class="text-lg font-semibold text-gray-800 mb-4">Export Options</h3>
                <div class="flex space-x-4">
                    <a
                        href="?export=csv"
                        class="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                    >
                        Export as CSV
                    </a>
                    <a
                        href="?export=json"
                        class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                    >
                        Export as JSON
                    </a>
                </div>
            </div>
            <?php endif; ?>
        </div>

        <?php
        // Handle exports
        if (isset($_GET['export']) && !empty($feedback)) {
            $export_type = $_GET['export'];

            if ($export_type === 'csv') {
                header('Content-Type: text/csv');
                header('Content-Disposition: attachment; filename="feedback_export_' . date('Y-m-d') . '.csv"');

                $output = fopen('php://output', 'w');
                fputcsv($output, ['ID', 'Type', 'Message', 'Timestamp', 'IP']);

                foreach ($feedback as $item) {
                    fputcsv($output, [
                        $item['id'],
                        $item['type'],
                        $item['message'],
                        $item['timestamp'],
                        $item['ip'] ?? ''
                    ]);
                }
                fclose($output);
                exit;
            }

            if ($export_type === 'json') {
                header('Content-Type: application/json');
                header('Content-Disposition: attachment; filename="feedback_export_' . date('Y-m-d') . '.json"');
                echo json_encode($feedback, JSON_PRETTY_PRINT);
                exit;
            }
        }
        ?>
    <?php endif; ?>
</body>
</html>