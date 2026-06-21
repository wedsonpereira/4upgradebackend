import "dotenv/config";
import express from "express";
import cors from "cors";
import nodemailer from "nodemailer";
import { z } from "zod";

// ─── Environment ──────────────────────────────────────────────────────────────
const {
  PORT = 4000,
  CORS_ORIGIN,
  SMTP_HOST,
  SMTP_PORT,
  SMTP_SECURE,
  SMTP_USER,
  SMTP_PASS,
  RECIPIENT_EMAIL,
  FROM_NAME = "4UPGRADE Website",
} = process.env;

// Fail fast if critical env vars are missing
const required = { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, RECIPIENT_EMAIL };
const missing = Object.entries(required)
  .filter(([, v]) => !v)
  .map(([k]) => k);

if (missing.length) {
  console.error(`❌  Missing required environment variables: ${missing.join(", ")}`);
  process.exit(1);
}

// ─── Nodemailer transporter ───────────────────────────────────────────────────
const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: Number(SMTP_PORT),
  secure: SMTP_SECURE === "true", // true for port 465, false for 587
  auth: {
    user: SMTP_USER,
    pass: SMTP_PASS,
  },
});

// ─── Validation schema (mirrors the frontend) ────────────────────────────────
const contactSchema = z.object({
  name: z.string().trim().min(2, "Name too short").max(80),
  email: z.string().trim().email("Invalid email").max(160),
  phone: z.string().trim().min(7, "Phone too short").max(20),
  stage: z.string().trim().min(1, "Stage is required"),
  interests: z.array(z.string()).min(1, "At least one interest required"),
  message: z.string().trim().max(600).optional(),
});

// ─── Express app ─────────────────────────────────────────────────────────────
const app = express();

app.use(express.json());
app.use(
  cors({
    origin: CORS_ORIGIN || "*",
    methods: ["POST", "OPTIONS"],
    allowedHeaders: ["Content-Type"],
  })
);

// ── Health check ──────────────────────────────────────────────────────────────
app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ── Contact form endpoint ─────────────────────────────────────────────────────
app.post("/api/contact", async (req, res) => {
  // 1. Validate input
  const parsed = contactSchema.safeParse(req.body);
  if (!parsed.success) {
    const errors = {};
    parsed.error.issues.forEach((issue) => {
      errors[issue.path[0]] = issue.message;
    });
    return res.status(422).json({ success: false, errors });
  }

  const { name, email, phone, stage, interests, message } = parsed.data;

  // 2. Build email content
  const interestList = interests.map((i) => `• ${i}`).join("\n");

  // ── Acknowledgment Email (sent to client) ──────────────────────────────────
  const ackTextBody = `
Hi ${name},

Thanks for reaching out to 4upgrade! We’ve received your enquiry and a mentor will get back to you soon.

If you have any questions in the meantime, reply to this email or reach us at hello@4upgrade.in.

Warm regards,
The 4UPGRADE Team
https://4upgrade.in
`.trim();

  const ackHtmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f0fdfa; margin: 0; padding: 40px 16px; }
    .card { background: #fff; border-radius: 14px; max-width: 560px; margin: 0 auto; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,.08); }
    .header { background: linear-gradient(135deg, #0d9488, #0f766e); padding: 32px 40px; }
    .header h1 { margin: 0; font-size: 22px; color: #fff; font-weight: 700; }
    .header p { margin: 6px 0 0; font-size: 14px; color: rgba(255,255,255,.75); }
    .body { padding: 32px 40px; }
    .greeting { font-size: 16px; color: #0f172a; margin: 0 0 20px; }
    .note { margin-top: 24px; font-size: 14px; color: #6b7280; line-height: 1.6; }
    .footer { padding: 20px 40px; border-top: 1px solid #f1f5f9; font-size: 12px; color: #9ca3af; text-align: center; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <h1>We’ve received your enquiry ✔️</h1>
      <p>4UPGRADE Career Readiness</p>
    </div>
    <div class="body">
      <p class="greeting">Hi ${name},</p>
      <p style="font-size:14px;color:#374151;margin:0 0 24px;line-height:1.6;">
        Thanks for reaching out! We’ve received your request, and a 4UPGRADE mentor will get back to you within <strong>one working day</strong>.
      </p>
      <p class="note">
        If you have any questions in the meantime, reply to this email or reach us at
        <a href="mailto:hello@4upgrade.in" style="color:#0d9488;">hello@4upgrade.in</a>.
      </p>
    </div>
    <div class="footer">4UPGRADE &middot; <a href="https://4upgrade.in" style="color:#0d9488;">4upgrade.in</a></div>
  </div>
</body>
</html>
`.trim();

  // ── Lead Notification Email (sent to internal team) ────────────────────────
  const leadTextBody = `
New Enquiry Received on 4UPGRADE Website!
──────────────────────────────────
Name:      ${name}
Email:     ${email}
Phone:     ${phone}
Stage:     ${stage}
Interests: ${interests.join(", ")}
${message ? `\nMessage:\n${message}` : ""}
──────────────────────────────────
`.trim();

  const leadHtmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f8fafc; margin: 0; padding: 40px 16px; }
    .card { background: #fff; border-radius: 14px; max-width: 560px; margin: 0 auto; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,.08); }
    .header { background: #0f172a; padding: 32px 40px; }
    .header h1 { margin: 0; font-size: 20px; color: #fff; font-weight: 700; }
    .header p { margin: 6px 0 0; font-size: 14px; color: rgba(255,255,255,.75); }
    .body { padding: 32px 40px; }
    table { width: 100%; border-collapse: collapse; font-size: 14px; color: #374151; }
    td { padding: 9px 0; border-bottom: 1px solid #f1f5f9; vertical-align: top; }
    td:first-child { font-weight: 600; color: #6b7280; width: 110px; }
    .message-box { margin-top: 20px; padding: 14px 16px; background: #f8fafc; border-left: 3px solid #64748b; border-radius: 6px; font-size: 14px; color: #374151; line-height: 1.6; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <h1>New Lead Notification 🚀</h1>
      <p>4UPGRADE Website Submission</p>
    </div>
    <div class="body">
      <table>
        <tr><td>Name</td><td>${name}</td></tr>
        <tr><td>Email</td><td>${email}</td></tr>
        <tr><td>Phone</td><td>${phone}</td></tr>
        <tr><td>Stage</td><td>${stage}</td></tr>
        <tr><td>Interests</td><td>${interests.join(", ")}</td></tr>
      </table>
      ${message ? `<div class="message-box"><strong style="display:block;margin-bottom:6px;font-size:12px;color:#6b7280;">MESSAGE</strong>${message.replace(/\n/g, "<br/>")}</div>` : ""}
    </div>
  </div>
</body>
</html>
`.trim();

  // 3. Send emails
  try {
    // 3a. Acknowledgment email to the submitter (user) - no submission details included!
    await transporter.sendMail({
      from: `"${FROM_NAME}" <${RECIPIENT_EMAIL}>`,
      replyTo: RECIPIENT_EMAIL,
      to: email,                    // confirmation goes only to the person who submitted
      subject: `We've received your enquiry — 4UPGRADE`,
      text: ackTextBody,
      html: ackHtmlBody,
    });

    // 3b. Detail notification email to the business inbox
    await transporter.sendMail({
      from: `"${FROM_NAME}" <${SMTP_USER}>`,
      to: RECIPIENT_EMAIL,          // details go to the business recipient email
      subject: `New Enquiry: ${name} (${stage})`,
      text: leadTextBody,
      html: leadHtmlBody,
    });

    console.log(`✅  Emails sent: Acknowledgment to ${email} | Details to ${RECIPIENT_EMAIL}`);
    return res.status(200).json({ success: true, message: "Your enquiry has been received. We'll be in touch within one working day." });
  } catch (err) {
    console.error("❌  Failed to send email:", err);
    return res.status(500).json({ success: false, message: "Could not send your enquiry right now. Please try again shortly." });
  }
});

// ─── Start server ─────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`🚀  4UPGRADE API running on http://localhost:${PORT}`);
  console.log(`    SMTP: ${SMTP_HOST}:${SMTP_PORT}`);
  console.log(`    Confirmation → submitter's email  |  Lead Details → ${RECIPIENT_EMAIL}`);
  console.log(`    CORS: ${CORS_ORIGIN || "* (open)"}`);
});
