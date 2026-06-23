const nodemailer = require("nodemailer");
const express = require("express");
const app = express();
require("dotenv").config();
const cors = require("cors");
const { z } = require("zod");
app.use(express.json());

const allowedOrigins = (
  process.env.CORS_ORIGINS ||
  process.env.CORS_ORIGIN ||
  "https://4upgrade.in,https://www.4upgrade.in"
)
  .split(",")
  .map((origin) => origin.trim());

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error("Not allowed by CORS"));
    },
  }),
);

const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log("Listening on port " + port);
});

const smtpPort = Number(process.env.SMTP_PORT) || 465;
const smtpSecure =
  process.env.SMTP_SECURE === undefined
    ? smtpPort === 465
    : process.env.SMTP_SECURE === "true";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: smtpPort,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  family:4,
  secure: smtpSecure,
  connectionTimeout: 10000,
  greetingTimeout: 10000,
  socketTimeout: 15000,
});

const escapeHtml = (value = "") =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

const contactSchema = z.object({
  name: z.string().trim().min(2, "Please enter your full name").max(80),
  email: z.string().trim().email("Enter a valid email").max(160),
  phone: z.string().trim().min(7, "Enter a valid phone number").max(20),
  stage: z.string().trim().min(1, "Please select your stage"),
  interests: z.array(z.string()).min(1, "Pick at least one area"),
  message: z.string().trim().max(600).optional().default(""),
});

const getFieldErrors = (issues) =>
  issues.reduce((errors, issue) => {
    const field = issue.path[0];
    if (field && !errors[field]) {
      errors[field] = issue.message;
    }

    return errors;
  }, {});

app.post("/api/contact", async (req, res) => {
  const parsed = contactSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(422).json({
      success: false,
      message: "Please check the highlighted fields.",
      errors: getFieldErrors(parsed.error.issues),
    });
  }

  const { name, email, phone, stage, interests, message } = parsed.data;
  const recipient =
    process.env.CONTACT_EMAIL ||
    process.env.RECIPIENT_EMAIL ||
    process.env.SMTP_USER;
  const fromName = process.env.FROM_NAME || "4Upgrade";

  if (!recipient) {
    return res.status(500).json({
      success: false,
      message: "Contact email is not configured",
    });
  }

  if (!process.env.SMTP_USER) {
    return res.status(500).json({
      success: false,
      message: "SMTP user is not configured",
    });
  }

  const formattedInterests = interests.join(", ");

  try {
    const info = await transporter.sendMail({
      from: `"${fromName}" <${process.env.SMTP_USER}>`,
      to: recipient,
      replyTo: email.toLowerCase(),
      subject: `Form Submission details`,
      html: `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
    <title>New Contact Form Submission</title>
</head>
<body style="margin:0;padding:0;background:#f4f6f9;font-family:Arial,Helvetica,sans-serif;">

<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f9;padding:30px 0;">
  <tr>
    <td align="center">

      <table width="650" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 10px rgba(0,0,0,0.08);">

        <!-- Header -->
        <tr>
          <td style="background:#0f172a;padding:30px;text-align:center;">
            <h1 style="margin:0;color:#ffffff;font-size:28px;">
              4upgrade
            </h1>
            <p style="margin:10px 0 0;color:#cbd5e1;font-size:14px;">
              New Website Inquiry Received
            </p>
          </td>
        </tr>

        <!-- Content -->
        <tr>
          <td style="padding:35px;">
            <h2 style="margin-top:0;color:#1e293b;">
              Contact Form Submission
            </h2>

            <p style="color:#475569;line-height:1.6;">
              A new enquiry has been submitted through the 4upgrade website.
            </p>

            <table width="100%" cellpadding="12" cellspacing="0" style="border-collapse:collapse;border:1px solid #e2e8f0;margin-top:20px;">

              <tr style="background:#f8fafc;">
                <td style="font-weight:bold;border:1px solid #e2e8f0;width:180px;">
                  Full Name
                </td>
                <td style="border:1px solid #e2e8f0;">
                  ${escapeHtml(name)}
                </td>
              </tr>

              <tr>
                <td style="font-weight:bold;border:1px solid #e2e8f0;">
                  Email Address
                </td>
                <td style="border:1px solid #e2e8f0;">
                  ${escapeHtml(email)}
                </td>
              </tr>

              <tr style="background:#f8fafc;">
                <td style="font-weight:bold;border:1px solid #e2e8f0;">
                  Phone Number
                </td>
                <td style="border:1px solid #e2e8f0;">
                  ${escapeHtml(phone)}
                </td>
              </tr>

              <tr>
                <td style="font-weight:bold;border:1px solid #e2e8f0;">
                  Project Stage
                </td>
                <td style="border:1px solid #e2e8f0;">
                  ${escapeHtml(stage)}
                </td>
              </tr>

              <tr style="background:#f8fafc;">
                <td style="font-weight:bold;border:1px solid #e2e8f0;">
                  Interests
                </td>
                <td style="border:1px solid #e2e8f0;">
                  ${escapeHtml(formattedInterests)}
                </td>
              </tr>

              <tr>
                <td style="font-weight:bold;border:1px solid #e2e8f0;">
                  Message
                </td>
                <td style="border:1px solid #e2e8f0;white-space:pre-wrap;">
                  ${escapeHtml(message)}
                </td>
              </tr>

            </table>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f8fafc;padding:20px;text-align:center;border-top:1px solid #e2e8f0;">
            <p style="margin:0;color:#64748b;font-size:13px;">
              © ${new Date().getFullYear()} 4upgrade. All Rights Reserved.
            </p>
          </td>
        </tr>

      </table>

    </td>
  </tr>
</table>

</body>
</html> `,
      text: `New enquiry from ${name} (${email})
Phone: ${phone || ""}
Project Stage: ${stage || ""}
Interests: ${formattedInterests || ""}

${message}`,
    });

    console.log(info);

    return res.status(200).json({
      success: true,
      message: "Message sent",
    });
  } catch (ex) {
    console.log("This is the error", ex);

    return res.status(500).json({
      success: false,
      message: "Unable to send your message right now. Please try again later.",
    });
  }
});
