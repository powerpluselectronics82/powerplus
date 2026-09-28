const tls = require("tls");
const net = require("net");

let nodemailer = null;
try {
  nodemailer = require("nodemailer");
} catch (err) {
  // nodemailer will be used once installed
  nodemailer = null;
}

/**
 * Fallback simple SMTP client using native TLS/net sockets when nodemailer is not yet installed.
 */
const sendRawSmtpEmail = async ({ host, port, secure, user, pass, from, to, subject, html, text }) => {
  return new Promise((resolve, reject) => {
    const isTls = secure || Number(port) === 465;
    const socket = isTls
      ? tls.connect({ host, port: Number(port) || 465, rejectUnauthorized: false })
      : net.connect({ host, port: Number(port) || 587 });

    let step = 0;
    let buffer = "";

    const write = (cmd) => {
      socket.write(cmd + "\r\n");
    };

    socket.on("data", (chunk) => {
      buffer += chunk.toString();
      const lines = buffer.split("\r\n");
      // Keep last incomplete chunk if any
      buffer = lines.pop();

      for (const line of lines) {
        if (!line.trim()) continue;
        const code = parseInt(line.substring(0, 3), 10);

        if (step === 0 && (code === 220)) {
          step++;
          write(`EHLO localhost`);
        } else if (step === 1 && (code === 250)) {
          // If server sends multi-line 250, wait until the final line (space after 250)
          if (line.charAt(3) === "-") continue;
          step++;
          write("AUTH LOGIN");
        } else if (step === 2 && (code === 334)) {
          step++;
          write(Buffer.from(user).toString("base64"));
        } else if (step === 3 && (code === 334)) {
          step++;
          write(Buffer.from(pass).toString("base64"));
        } else if (step === 4 && (code === 235)) {
          step++;
          write(`MAIL FROM:<${from}>`);
        } else if (step === 5 && (code === 250)) {
          step++;
          write(`RCPT TO:<${to}>`);
        } else if (step === 6 && (code === 250)) {
          step++;
          write("DATA");
        } else if (step === 7 && (code === 354)) {
          step++;
          const boundary = `----=_Part_${Date.now()}`;
          const rawMessage = [
            `From: ${from}`,
            `To: ${to}`,
            `Subject: ${subject}`,
            `MIME-Version: 1.0`,
            `Content-Type: multipart/alternative; boundary="${boundary}"`,
            ``,
            `--${boundary}`,
            `Content-Type: text/plain; charset=UTF-8`,
            `Content-Transfer-Encoding: 7bit`,
            ``,
            text || "",
            ``,
            `--${boundary}`,
            `Content-Type: text/html; charset=UTF-8`,
            `Content-Transfer-Encoding: 7bit`,
            ``,
            html || text || "",
            ``,
            `--${boundary}--`,
            `.`
          ].join("\r\n");

          write(rawMessage);
        } else if (step === 8 && (code === 250)) {
          step++;
          write("QUIT");
          resolve({ success: true, message: "Email sent via native SMTP" });
        } else if (code >= 400) {
          socket.destroy();
          return reject(new Error(`SMTP Server Error (${code}): ${line}`));
        }
      }
    });

    socket.on("error", (err) => {
      reject(err);
    });

    socket.setTimeout(12000, () => {
      socket.destroy();
      reject(new Error("SMTP connection timed out"));
    });
  });
};

/**
 * Send Password Reset OTP Email
 */
const sendPasswordResetEmail = async ({ to, name, otp }) => {
  const user = process.env.EMAIL_USER || process.env.SMTP_USER;
  const pass = process.env.EMAIL_PASS || process.env.SMTP_PASS;
  const host = process.env.EMAIL_HOST || process.env.SMTP_HOST || "smtp.gmail.com";
  const port = Number(process.env.EMAIL_PORT || process.env.SMTP_PORT || 465);
  const secure = process.env.EMAIL_SECURE ? process.env.EMAIL_SECURE === "true" : port === 465;
  const from = process.env.EMAIL_FROM || (user ? `"PowerPlus Inventory" <${user}>` : `"PowerPlus Support" <noreply@powerplus.com>`);

  const subject = `[PowerPlus] Your Password Reset OTP: ${otp}`;
  const text = `Hello ${name || "User"},\n\nYour 6-digit OTP for resetting your PowerPlus account password is: ${otp}\n\nThis OTP is valid for 10 minutes.\nIf you did not request a password reset, please ignore this email or contact support.`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Password Reset OTP</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b; }
        .card { max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 18px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05); }
        .header { background: linear-gradient(135deg, #4f46e5 0%, #3730a3 100%); padding: 32px 24px; text-align: center; color: #ffffff; }
        .header h1 { margin: 0; font-size: 22px; font-weight: 800; letter-spacing: -0.5px; }
        .header p { margin: 6px 0 0 0; font-size: 13px; opacity: 0.85; }
        .content { padding: 32px 28px; }
        .greeting { font-size: 15px; margin-bottom: 12px; }
        .desc { font-size: 14px; color: #64748b; line-height: 1.6; margin-bottom: 24px; }
        .otp-box { text-align: center; margin: 28px 0; padding: 20px; background: #f5f3ff; border: 2px dashed #818cf8; border-radius: 14px; }
        .otp-code { font-size: 34px; font-weight: 800; letter-spacing: 8px; color: #4338ca; font-family: 'Courier New', Courier, monospace; margin: 0; }
        .otp-caption { margin-top: 8px; font-size: 12px; color: #6366f1; font-weight: 600; }
        .warning { background: #fffbeb; border: 1px solid #fde68a; border-radius: 10px; padding: 12px 16px; font-size: 12px; color: #b45309; line-height: 1.5; margin-top: 20px; }
        .footer { padding: 20px 28px; background: #f8fafc; border-top: 1px solid #e2e8f0; text-align: center; font-size: 11px; color: #94a3b8; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="header">
          <h1>⚡ PowerPlus Electronics</h1>
          <p>Multi-Branch Enterprise POS & Inventory</p>
        </div>
        <div class="content">
          <p class="greeting">Hello <strong>${name || "User"}</strong>,</p>
          <p class="desc">We received a request to reset the password for your PowerPlus employee account. Please use the verification code below to complete the reset process:</p>
          <div class="otp-box">
            <div class="otp-code">${otp}</div>
            <div class="otp-caption">⏱ Valid for 10 minutes</div>
          </div>
          <div class="warning">
            <strong>Security Notice:</strong> If you did not initiate this password reset request, please disregard this email or report it to your branch administrator. Never share this OTP with anyone.
          </div>
        </div>
        <div class="footer">
          © ${new Date().getFullYear()} PowerPlus Electronics. All rights reserved.<br>
          Automated security notification — Please do not reply directly to this email.
        </div>
      </div>
    </body>
    </html>
  `;

  // Always log OTP to server console for quick debugging / development convenience
  console.log("==================================================");
  console.log(`[PASSWORD RESET OTP] For: ${to}`);
  console.log(`[PASSWORD RESET OTP] Code: ${otp}`);
  console.log(`[PASSWORD RESET OTP] Expires in: 10 minutes`);
  console.log("==================================================");

  // If email credentials are not set, return simulated success so system doesn't crash
  if (!user || !pass) {
    console.warn("[sendEmail] EMAIL_USER or EMAIL_PASS not configured in .env. OTP displayed in server logs above.");
    return {
      success: true,
      delivered: false,
      message: "OTP logged to server console (SMTP credentials not configured in .env)",
    };
  }

  // 1. Try nodemailer if installed
  if (nodemailer) {
    try {
      const transporter = nodemailer.createTransport({
        service: process.env.EMAIL_SERVICE || (host.includes("gmail") ? "gmail" : undefined),
        host,
        port,
        secure,
        auth: { user, pass },
      });

      const info = await transporter.sendMail({
        from,
        to,
        subject,
        text,
        html,
      });

      console.log(`[sendEmail] OTP sent successfully via nodemailer to ${to}. MessageId: ${info.messageId}`);
      return { success: true, delivered: true, messageId: info.messageId };
    } catch (err) {
      console.error("[sendEmail] nodemailer failed:", err.message);
      // Fallback to raw SMTP below
    }
  }

  // 2. Try native TLS socket SMTP client
  try {
    const rawResult = await sendRawSmtpEmail({
      host,
      port,
      secure,
      user,
      pass,
      from: user,
      to,
      subject,
      html,
      text,
    });
    console.log(`[sendEmail] OTP sent successfully via native SMTP to ${to}`);
    return { success: true, delivered: true, ...rawResult };
  } catch (rawErr) {
    console.error("[sendEmail] Native SMTP send error:", rawErr.message);
    // Don't completely fail the reset flow in development if SMTP refuses connection;
    // user can still see OTP in the server logs!
    return {
      success: true,
      delivered: false,
      message: "Email dispatch failed, but OTP is active and available in server console: " + rawErr.message,
    };
  }
};

module.exports = {
  sendPasswordResetEmail,
};
