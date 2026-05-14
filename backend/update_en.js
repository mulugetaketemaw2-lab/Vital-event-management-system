const fs = require('fs');
const path = 'c:/Users/Hp/Desktop/vital event register/frontend/src/locales/en/translation.json';
let text = fs.readFileSync(path, 'utf8');
const endContent = `,
    "forgot_password": "Forgot your password",
    "reset_here": "Reset here",
    "forgot_password_title": "Recover Your Account",
    "forgot_password_desc": "Enter your registered email address to receive a password reset link.",
    "please_enter_email": "Please enter your email address",
    "reset_link_sent": "Reset link sent to your email",
    "error_sending_reset": "Error sending reset link",
    "email_sent_title": "Check Your Email",
    "email_sent_desc": "We have sent a secure password reset link to your email address. Please follow the instructions in the email to regain access.",
    "check_spam_folder": "If you don't see the email, please check your spam folder.",
    "remember_password": "Remember your password?",
    "back_to_login": "Back to Login",
    "sending": "Sending...",
    "send_reset_link": "Send Reset Link",
    "reset_password_title": "Reset Your Password",
    "reset_password_desc": "Create a strong new password to secure your account.",
    "new_password": "New Password",
    "confirm_new_password": "Confirm New Password",
    "enter_new_password": "Enter your new password",
    "password_min_6": "Password must be at least 6 characters",
    "passwords_do_not_match": "Passwords do not match",
    "password_reset_success": "Password reset successfully",
    "error_resetting_password": "Error resetting password",
    "resetting": "Resetting...",
    "reset_password_btn": "Reset Password",
    "redirecting_to_login": "Successfully reset! Redirecting you to login..."
}`;

if (text.trim().endsWith('}')) {
    text = text.trim().slice(0, -1) + endContent + '\n}';
    fs.writeFileSync(path, text);
    console.log('✅ English translations updated');
} else {
    console.log('⚠️ File did not end as expected');
}
