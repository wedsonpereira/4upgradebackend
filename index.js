const nodemailer = require("nodemailer");
const express = require("express");
const app = express();
require("dotenv").config();
const cors = require("cors");
app.use(express.json());


app.use(cors("https://localhost:5173"));

const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log("Listening on port " + port);
});

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port:process.env.SMTP_PORT,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  secure: process.env.SMTP_SECURE,
    requireTLS:process.env.TLS_ENABLED,
});

app.get("/", (req, res) => {
    return res.status(200).send("Welcome");
})


app.get("/node-version", (req, res) => {
    res.send(process.version);
});

app.post("/api/contact", async (req, res) => {

    const { name, email, phone,stage,interests,message} = req.body;

  await transporter.sendMail({
    from: `4upgrade ${process.env.SMTP_USER}`,
    to: email,
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
                    ${name}
                  </td>
                </tr>

                <tr>
                  <td style="font-weight:bold;border:1px solid #e2e8f0;">
                    Email Address
                  </td>
                  <td style="border:1px solid #e2e8f0;">
                    ${email}
                  </td>
                </tr>

                <tr style="background:#f8fafc;">
                  <td style="font-weight:bold;border:1px solid #e2e8f0;">
                    Phone Number
                  </td>
                  <td style="border:1px solid #e2e8f0;">
                    ${phone}
                  </td>
                </tr>

                <tr>
                  <td style="font-weight:bold;border:1px solid #e2e8f0;">
                    Project Stage
                  </td>
                  <td style="border:1px solid #e2e8f0;">
                    ${stage}
                  </td>
                </tr>

                <tr style="background:#f8fafc;">
                  <td style="font-weight:bold;border:1px solid #e2e8f0;">
                    Interests
                  </td>
                  <td style="border:1px solid #e2e8f0;">
                    ${Array.isArray(interests) ? interests.join(", ") : interests}
                  </td>
                </tr>

                <tr>
                  <td style="font-weight:bold;border:1px solid #e2e8f0;">
                    Message
                  </td>
                  <td style="border:1px solid #e2e8f0;white-space:pre-wrap;">
                    ${message}
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
</html>
  `
  })

    return res.status(200).json({
        success: true,
        message: "We'll be in touch soon!"
    });
})