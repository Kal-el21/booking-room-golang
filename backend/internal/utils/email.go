package utils

import (
	"fmt"
	"net/smtp"

	"github.com/Kal-el21/booking-room-golang/backend/internal/config"
)

// ────────────────────────────────────────────────────────────
// Public API
// ────────────────────────────────────────────────────────────

// SendOTPEmail sends an email containing a login OTP code to the given user.
func SendOTPEmail(toEmail, toName, otpCode string) error {
	subject := "Kode OTP Login - Room Booking System"
	body := buildOTPEmailBody(toName, otpCode)
	return sendEmail(toEmail, subject, body)
}

// SendVerificationEmail sends an account verification OTP after registration.
func SendVerificationEmail(toEmail, toName, otpCode string) error {
	subject := "Verifikasi Akun - Room Booking System"
	body := buildVerificationEmailBody(toName, otpCode)
	return sendEmail(toEmail, subject, body)
}

// ────────────────────────────────────────────────────────────
// Internal helpers
// ────────────────────────────────────────────────────────────

// sendEmail is the core SMTP sender used by all public functions.
func sendEmail(toEmail, subject, htmlBody string) error {
	cfg := config.App.Email

	if cfg.SMTPUsername == "" || cfg.SMTPPassword == "" {
		return fmt.Errorf("SMTP credentials not configured (SMTP_USERNAME / SMTP_PASSWORD)")
	}

	from := fmt.Sprintf("%s <%s>", cfg.FromName, cfg.FromEmail)
	msg := buildMIMEMessage(from, toEmail, subject, htmlBody)

	addr := fmt.Sprintf("%s:%d", cfg.SMTPHost, cfg.SMTPPort)
	auth := smtp.PlainAuth("", cfg.SMTPUsername, cfg.SMTPPassword, cfg.SMTPHost)

	if err := smtp.SendMail(addr, auth, cfg.SMTPUsername, []string{toEmail}, []byte(msg)); err != nil {
		return fmt.Errorf("failed to send email to %s: %w", toEmail, err)
	}

	return nil
}

// buildMIMEMessage assembles a minimal HTML MIME email message.
func buildMIMEMessage(from, to, subject, htmlBody string) string {
	return fmt.Sprintf(
		"From: %s\r\nTo: %s\r\nSubject: %s\r\nMIME-Version: 1.0\r\nContent-Type: text/html; charset=UTF-8\r\n\r\n%s",
		from, to, subject, htmlBody,
	)
}

// ────────────────────────────────────────────────────────────
// Email body templates
// ────────────────────────────────────────────────────────────

// buildOTPEmailBody builds the HTML body for a login OTP email.
func buildOTPEmailBody(name, otpCode string) string {
	return fmt.Sprintf(`
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; background: #f4f4f4; margin: 0; padding: 0; }
    .container { max-width: 480px; margin: 40px auto; background: #fff; border-radius: 8px;
                 padding: 32px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    .header { text-align: center; margin-bottom: 24px; }
    .header h2 { color: #1a1a2e; margin: 0; font-size: 20px; }
    .header p { color: #666; margin: 4px 0 0; font-size: 13px; }
    .otp-box { background: #f0f4ff; border: 2px dashed #4f46e5; border-radius: 8px;
               text-align: center; padding: 20px; margin: 24px 0; }
    .otp-code { font-size: 40px; font-weight: bold; letter-spacing: 10px; color: #4f46e5; }
    .note { color: #666; font-size: 13px; text-align: center; line-height: 1.6; }
    .footer { margin-top: 24px; text-align: center; color: #aaa; font-size: 12px; border-top: 1px solid #eee; padding-top: 16px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>🏢 Room Booking System</h2>
      <p>Indore - Sistem Peminjaman Ruangan</p>
    </div>
    <p>Halo <strong>%s</strong>,</p>
    <p>Kami menerima permintaan login ke akun Anda. Berikut kode OTP Anda:</p>
    <div class="otp-box">
      <div class="otp-code">%s</div>
    </div>
    <p class="note">
      ⏱ Kode ini berlaku selama <strong>5 menit</strong>.<br>
      Jangan bagikan kode ini kepada siapapun, termasuk tim IT.
    </p>
    <div class="footer">
      Jika Anda tidak merasa melakukan login, abaikan email ini.<br>
      &copy; Room Booking System — Indore
    </div>
  </div>
</body>
</html>
`, name, otpCode)
}

// buildVerificationEmailBody builds the HTML body for an email verification OTP.
func buildVerificationEmailBody(name, otpCode string) string {
	return fmt.Sprintf(`
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; background: #f4f4f4; margin: 0; padding: 0; }
    .container { max-width: 480px; margin: 40px auto; background: #fff; border-radius: 8px;
                 padding: 32px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    .header { text-align: center; margin-bottom: 24px; }
    .header h2 { color: #1a1a2e; margin: 0; font-size: 20px; }
    .badge { display: inline-block; background: #ecfdf5; border: 1px solid #6ee7b7;
             color: #059669; font-size: 13px; font-weight: bold; border-radius: 99px;
             padding: 4px 14px; margin-top: 8px; }
    .otp-box { background: #f0fdf4; border: 2px dashed #22c55e; border-radius: 8px;
               text-align: center; padding: 20px; margin: 24px 0; }
    .otp-code { font-size: 40px; font-weight: bold; letter-spacing: 10px; color: #16a34a; }
    .note { color: #666; font-size: 13px; text-align: center; line-height: 1.6; }
    .footer { margin-top: 24px; text-align: center; color: #aaa; font-size: 12px; border-top: 1px solid #eee; padding-top: 16px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>🏢 Room Booking System</h2>
      <div class="badge">✅ Verifikasi Email</div>
    </div>
    <p>Halo <strong>%s</strong>,</p>
    <p>Terima kasih telah mendaftar! Masukkan kode verifikasi berikut untuk mengaktifkan akun Anda:</p>
    <div class="otp-box">
      <div class="otp-code">%s</div>
    </div>
    <p class="note">
      ⏱ Kode ini berlaku selama <strong>5 menit</strong>.<br>
      Jangan bagikan kode ini kepada siapapun.
    </p>
    <div class="footer">
      Jika Anda tidak mendaftar, abaikan email ini.<br>
      &copy; Room Booking System — Indore
    </div>
  </div>
</body>
</html>
`, name, otpCode)
}
