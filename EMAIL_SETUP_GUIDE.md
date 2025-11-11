# 📧 Email Setup Guide for Password Reset

## Quick Setup Instructions

### 1. Using Gmail (Recommended for Development)

#### Step 1: Enable 2-Factor Authentication
1. Go to your Google Account: https://myaccount.google.com/
2. Click "Security" in the left menu
3. Under "Signing in to Google", click "2-Step Verification"
4. Follow the steps to enable 2FA

#### Step 2: Generate App Password
1. Go to: https://myaccount.google.com/apppasswords
2. Select "Mail" as the app
3. Select "Other" as the device and name it "Vegruit Backend"
4. Click "Generate"
5. Copy the 16-character password (remove spaces)

#### Step 3: Update .env File
Add these lines to your `.env` file:

```env
# Email Configuration for Gmail
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-16-char-app-password

# Frontend URL (where reset links will point)
FRONTEND_URL=http://localhost:5173
```

**Example**:
```env
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=vegruit.shop@gmail.com
EMAIL_PASS=abcd efgh ijkl mnop

FRONTEND_URL=http://localhost:5173
```

---

### 2. Using Other Email Providers

#### Outlook/Hotmail
```env
EMAIL_HOST=smtp-mail.outlook.com
EMAIL_PORT=587
EMAIL_USER=your-email@outlook.com
EMAIL_PASS=your-password
```

#### Yahoo Mail
```env
EMAIL_HOST=smtp.mail.yahoo.com
EMAIL_PORT=587
EMAIL_USER=your-email@yahoo.com
EMAIL_PASS=your-app-password
```

#### Custom SMTP Server
```env
EMAIL_HOST=smtp.yourdomain.com
EMAIL_PORT=587
EMAIL_USER=noreply@yourdomain.com
EMAIL_PASS=your-password
```

---

## Testing Email Configuration

### Test Script
Create a file `test-email.js` in the backend root:

```javascript
require('dotenv').config();
const nodemailer = require('nodemailer');

async function testEmail() {
  const transporter = nodemailer.createTransporter({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });

  try {
    const info = await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: 'your-test-email@example.com', // Change this
      subject: 'Test Email from Vegruit',
      text: 'If you receive this, email configuration is working!',
      html: '<b>If you receive this, email configuration is working!</b>'
    });

    console.log('✅ Email sent successfully!');
    console.log('Message ID:', info.messageId);
  } catch (error) {
    console.error('❌ Email send failed:', error);
  }
}

testEmail();
```

### Run Test
```bash
node test-email.js
```

---

## Troubleshooting

### Error: "Invalid login"
**Solution**: 
- Verify EMAIL_USER and EMAIL_PASS are correct
- For Gmail, use App Password, not regular password
- Check 2FA is enabled for Gmail

### Error: "Connection timeout"
**Solution**:
- Check EMAIL_HOST and EMAIL_PORT
- Verify firewall isn't blocking port 587
- Try port 465 with `secure: true`

### Error: "Self-signed certificate"
**Solution**:
Add to transporter config:
```javascript
tls: {
  rejectUnauthorized: false
}
```

### Emails Going to Spam
**Solution**:
- Use a verified domain email
- Add SPF and DKIM records
- Use professional email content
- Avoid spam trigger words

---

## Production Recommendations

### Use Professional Email Service
For production, use dedicated email services:

1. **SendGrid** (Recommended)
   - Free tier: 100 emails/day
   - Easy setup
   - Good deliverability

2. **Mailgun**
   - Free tier: 5,000 emails/month
   - Developer-friendly

3. **AWS SES**
   - Very cheap
   - Requires AWS account

4. **Postmark**
   - Excellent deliverability
   - Transaction email focused

### Example: SendGrid Setup
```env
EMAIL_HOST=smtp.sendgrid.net
EMAIL_PORT=587
EMAIL_USER=apikey
EMAIL_PASS=your-sendgrid-api-key
```

---

## Security Best Practices

1. ✅ Never commit .env file to git
2. ✅ Use App Passwords, not account passwords
3. ✅ Rotate passwords regularly
4. ✅ Use environment variables
5. ✅ Enable 2FA on email accounts
6. ✅ Monitor email sending logs
7. ✅ Implement rate limiting

---

## Email Template Customization

The email template is in `controllers/authController.js`:

```javascript
const mailOptions = {
  from: `"Vegruit Support" <${process.env.EMAIL_USER}>`,
  to: user.email,
  subject: 'Password Reset Request - Vegruit',
  html: `
    <!-- Your custom HTML here -->
  `
};
```

### Customization Tips:
- Add your logo
- Match brand colors
- Include social media links
- Add contact information
- Use responsive design

---

## Quick Reference

### Required Environment Variables
```env
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
FRONTEND_URL=http://localhost:5173
```

### For Production
```env
EMAIL_HOST=smtp.sendgrid.net
EMAIL_PORT=587
EMAIL_USER=apikey
EMAIL_PASS=your-api-key
FRONTEND_URL=https://vegruit.com
```

---

## Support

If you encounter issues:
1. Check backend console logs
2. Verify .env configuration
3. Test with test-email.js script
4. Check email provider documentation
5. Review nodemailer documentation

---

**Setup complete! Your password reset emails should now work.** 📧✅
