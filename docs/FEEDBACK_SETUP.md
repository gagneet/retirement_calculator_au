# Feedback System Setup Instructions

This document explains how to set up the server-side feedback collection system for the Australian Retirement Calculator.

## 🚀 Features

- **Centralized Storage**: All feedback stored on your server
- **Shared Visibility**: All users can see feedback from everyone
- **Admin Panel**: Manage and export all feedback
- **Email Notifications**: Get notified when new feedback arrives (optional)
- **Fallback Support**: Works locally if server is unavailable

## 📋 Requirements

- **Web Server**: Apache or Nginx
- **PHP**: Version 7.4 or higher
- **Write Permissions**: Server must be able to write to the `data/` directory
- **Email Support**: PHP `mail()` function (optional, for notifications)

## 🛠️ Installation Steps

### 1. Upload Files to Your Server

Upload these files to your web server:
```
your-domain.com/
├── api/
│   └── feedback.php          # Backend API
├── admin-feedback.php        # Admin panel
├── contact.html              # Updated contact form
└── data/                     # Will be created automatically
    └── feedback.json         # Will be created automatically
```

### 2. Set Directory Permissions

The `data/` directory will be created automatically, but ensure your web server has write permissions:

```bash
chmod 755 data/
chmod 644 data/feedback.json  # After first feedback is submitted
```

### 3. Configure Email Notifications (Optional)

Edit `api/feedback.php` and update these settings:

```php
// Line 8: Replace with your email address
define('ADMIN_EMAIL', 'your-email@example.com');

// Line 43: Uncomment this line to enable email notifications
mail(ADMIN_EMAIL, $subject, $message, $headers);
```

### 4. Set Admin Password

Edit `admin-feedback.php` and change the default password:

```php
// Line 5: Change this password!
define('ADMIN_PASSWORD', 'your-secure-password-here');
```

### 5. Test the System

1. **Test Feedback Submission**:
   - Go to `your-domain.com/contact.html`
   - Submit a test feedback
   - Check that it appears in the feedback list

2. **Test Admin Panel**:
   - Go to `your-domain.com/admin-feedback.php`
   - Login with your password
   - Verify you can see and manage feedback

## 🔧 Configuration Options

### Email Notifications

To enable email notifications when new feedback is received:

1. **Basic Setup** (most shared hosting):
   ```php
   // In api/feedback.php, line 43:
   mail(ADMIN_EMAIL, $subject, $message, $headers);
   ```

2. **Advanced Setup** (dedicated servers):
   ```php
   // Configure SMTP settings if needed
   ini_set('SMTP', 'your-smtp-server.com');
   ini_set('smtp_port', '587');
   ```

### Storage Limits

By default, the system keeps the last 100 feedback items. To change this:

```php
// In api/feedback.php, line 85:
if (count($feedbackList) > 100) {  // Change 100 to your preferred limit
```

### Security Settings

1. **Change Admin Password**: Always use a strong, unique password
2. **IP Logging**: Feedback includes IP addresses for spam prevention
3. **Input Sanitization**: All input is sanitized and validated

## 📊 Admin Panel Features

Access: `your-domain.com/admin-feedback.php`

### Dashboard
- Total feedback count
- Breakdown by feedback type (feedback, bugs, kudos, etc.)
- Quick statistics overview

### Feedback Management
- View all feedback with timestamps
- See user IP addresses
- Delete inappropriate feedback
- Search and filter options

### Export Options
- **CSV Export**: For spreadsheet analysis
- **JSON Export**: For technical analysis or backups

## 🔍 Troubleshooting

### "Server unavailable" Message

**Symptoms**: Users see "Server unavailable. Your feedback has been saved locally."

**Causes & Solutions**:

1. **PHP not working**:
   ```bash
   # Test if PHP is working
   echo "<?php phpinfo(); ?>" > test.php
   # Visit your-domain.com/test.php
   ```

2. **Incorrect file paths**:
   - Ensure `api/feedback.php` is in the correct location
   - Check file permissions (755 for directories, 644 for files)

3. **CORS issues** (if using subdomain):
   ```php
   // In api/feedback.php, add your domain:
   header('Access-Control-Allow-Origin: https://your-domain.com');
   ```

### Data Directory Issues

**Error**: "Failed to save feedback"

**Solutions**:
```bash
# Create directory manually
mkdir data
chmod 755 data

# Or let PHP create it with proper permissions
chown www-data:www-data . # Make sure web server can write
```

### Email Notifications Not Working

**Common Issues**:
1. **Hosting restrictions**: Many shared hosts disable `mail()` function
2. **Spam filters**: Check your spam folder
3. **Server configuration**: Contact your hosting provider

**Alternative**: Use a service like Mailgun, SendGrid, or AWS SES

## 🚨 Security Considerations

### Admin Panel Security
- Change the default password immediately
- Use HTTPS for the admin panel
- Consider IP whitelisting for admin access

### Data Protection
- Feedback is stored as JSON files (not in database)
- No personal information is collected beyond IP addresses
- Users can see all feedback (by design)

### Backup Strategy
- Regularly backup the `data/feedback.json` file
- Export feedback periodically using the admin panel
- Consider automated backups

## 🌐 Going Live

### Pre-Launch Checklist
- [ ] Change admin password
- [ ] Configure email notifications
- [ ] Test feedback submission
- [ ] Test admin panel access
- [ ] Set up regular backups
- [ ] Verify HTTPS is working

### Post-Launch Monitoring
- Check feedback regularly via admin panel
- Monitor for spam or inappropriate content
- Export data periodically for analysis
- Update PHP and server software regularly

## 📞 Support

If you encounter issues:

1. **Check PHP error logs** on your server
2. **Test with browser developer tools** (F12 → Network tab)
3. **Verify file permissions** and directory structure
4. **Contact your hosting provider** for server-specific issues

## 🔄 Migration from Local Storage

If users already have local feedback, it will be displayed with a "(Local)" label. New feedback will be shared across all users through the server system.

---

**Note**: This system is designed for moderate traffic. For high-traffic sites, consider using a proper database instead of JSON files.