# Email Configuration Guide for Password Reset

This guide will help you configure nodemailer to send password reset emails.

## Quick Setup

### For Gmail Users

1. **Enable 2-Step Verification** on your Google account:
   - Go to https://myaccount.google.com/security
   - Enable "2-Step Verification"

2. **Generate App Password**:
   - Go to https://myaccount.google.com/apppasswords
   - Select "Mail" and "Other (Custom name)"
   - Enter "Vegruit" as the app name
   - Copy the 16-character password (no spaces)

3. **Add to .env file**:
```env
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-16-character-app-password
FRONTEND_URL=http://localhost:5173
```

### For Outlook/Hotmail Users

```env
EMAIL_HOST=smtp-mail.outlook.com
EMAIL_PORT=587
EMAIL_USER=your-email@outlook.com
EMAIL_PASS=your-password
FRONTEND_URL=http://localhost:5173
```

### For Yahoo Mail Users

```env
EMAIL_HOST=smtp.mail.yahoo.com
EMAIL_PORT=587
EMAIL_USER=your-email@yahoo.com
EMAIL_PASS=your-app-password
FRONTEND_URL=http://localhost:5173
```

### For Custom SMTP Server

```env
EMAIL_HOST=your-smtp-server.com
EMAIL_PORT=587
EMAIL_USER=your-email@domain.com
EMAIL_PASS=your-password
FRONTEND_URL=http://localhost:5173
```

## Testing Email Configuration

After configuring your email, test it by:

1. Starting your backend server
2. Using the forgot password feature
3. Check your email inbox (and spam folder)

## Troubleshooting

### Error: "EAUTH" - Authentication Failed
- **Gmail**: Make sure you're using an App Password, not your regular password
- **Other providers**: Verify your username and password are correct

### Error: "ECONNECTION" - Connection Failed
- Check your internet connection
- Verify EMAIL_HOST and EMAIL_PORT are correct
- Check if your firewall is blocking the connection

### Error: "ETIMEDOUT" - Connection Timeout
- The email server might be slow or unreachable
- Try again after a few minutes
- Check if you're behind a corporate firewall

### Emails Not Received
- Check your spam/junk folder
- Verify the recipient email address is correct
- Check server logs for error messages

## Security Notes

- Never commit your `.env` file to version control
- Use App Passwords instead of your main account password
- Keep your email credentials secure
- For production, consider using a dedicated email service (SendGrid, Mailgun, etc.)

## Production Recommendations

For production environments, consider using:
- **SendGrid** (free tier: 100 emails/day)
- **Mailgun** (free tier: 5,000 emails/month)
- **Amazon SES** (very affordable)
- **Postmark** (great deliverability)

These services provide better deliverability and analytics than direct SMTP.

