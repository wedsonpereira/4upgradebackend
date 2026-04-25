require('dotenv').config();

const express=require('express');
const app=express();
const mailer=require('nodemailer');
const cors=require('cors');

const smtpUser = process.env.SMTP_USER || 'mailto4upgrade@gmail.com';
const smtpPass = process.env.SMTP_PASS || 'aptxmvgsdqexgecv';
const inboxEmail = process.env.INBOX_EMAIL || smtpUser;
const port = Number(process.env.PORT || 3000);
const escapeHtml = (value='') => String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

app.listen(port,()=>{
    console.log(`Server is running on port ${port}`);
});

app.use(cors({
    origin:'https://4upgrade.in',
    methods:['GET','POST']
}));
app.use(express.json());

const transporter=mailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: Number(process.env.SMTP_PORT || 587),
    secure: false,
    auth:{
        user:smtpUser,
        pass:smtpPass
    }
});

app.get('/',(req,res)=>{
    res.send('Email sending server is running');
});

app.post('/send-email',(req,res)=>{
    const { name, phone, email, status, helpNeeded, helps } = req.body || {};
    const selectedHelp = Array.isArray(helpNeeded)
        ? helpNeeded
        : Array.isArray(helps)
            ? helps
            : [];

    if(!name || !phone || !email || !status || selectedHelp.length === 0){
        return res.status(400).send('Missing required fields: name, phone, email, status, helpNeeded');
    }

    console.log('Received form submission from', email);

    const subject = `New guidance request from ${name}`;
    const text = [
        `Name: ${name}`,
        `Phone: ${phone}`,
        `Email: ${email}`,
        `Current status: ${status}`,
        `Help needed: ${selectedHelp.join(', ')}`
    ].join('\n');
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:24px;background-color:#f4f7fb;font-family:Arial,sans-serif;color:#1f2937;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">
    <tr>
      <td align="center">
        <table role="presentation" width="680" cellspacing="0" cellpadding="0" style="width:100%;max-width:680px;border-collapse:collapse;background-color:#ffffff;border:1px solid #dbe3ee;border-radius:16px;overflow:hidden;">
          <tr>
            <td style="padding:28px 32px;background-color:#0f172a;color:#ffffff;">
              <div style="font-size:12px;letter-spacing:1.2px;text-transform:uppercase;opacity:0.75;">4Upgrade</div>
              <h1 style="margin:10px 0 0;font-size:24px;line-height:32px;font-weight:700;">New Guidance Request</h1>
              <p style="margin:10px 0 0;font-size:14px;line-height:22px;color:#cbd5e1;">A new enquiry has been submitted through the website form.</p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;border:1px solid #dbe3ee;border-radius:12px;overflow:hidden;">
                <tr style="background-color:#eff6ff;">
                  <th align="left" style="padding:14px 16px;border-bottom:1px solid #dbe3ee;font-size:13px;line-height:20px;color:#334155;width:220px;">Field</th>
                  <th align="left" style="padding:14px 16px;border-bottom:1px solid #dbe3ee;font-size:13px;line-height:20px;color:#334155;">Details</th>
                </tr>
                <tr>
                  <td style="padding:14px 16px;border-bottom:1px solid #e5e7eb;font-size:14px;line-height:22px;font-weight:600;color:#0f172a;">Full name</td>
                  <td style="padding:14px 16px;border-bottom:1px solid #e5e7eb;font-size:14px;line-height:22px;color:#334155;">${escapeHtml(name)}</td>
                </tr>
                <tr>
                  <td style="padding:14px 16px;border-bottom:1px solid #e5e7eb;font-size:14px;line-height:22px;font-weight:600;color:#0f172a;">Phone</td>
                  <td style="padding:14px 16px;border-bottom:1px solid #e5e7eb;font-size:14px;line-height:22px;color:#334155;">${escapeHtml(phone)}</td>
                </tr>
                <tr>
                  <td style="padding:14px 16px;border-bottom:1px solid #e5e7eb;font-size:14px;line-height:22px;font-weight:600;color:#0f172a;">Email</td>
                  <td style="padding:14px 16px;border-bottom:1px solid #e5e7eb;font-size:14px;line-height:22px;color:#334155;">${escapeHtml(email)}</td>
                </tr>
                <tr>
                  <td style="padding:14px 16px;border-bottom:1px solid #e5e7eb;font-size:14px;line-height:22px;font-weight:600;color:#0f172a;">Current status</td>
                  <td style="padding:14px 16px;border-bottom:1px solid #e5e7eb;font-size:14px;line-height:22px;color:#334155;">${escapeHtml(status)}</td>
                </tr>
                <tr>
                  <td style="padding:14px 16px;font-size:14px;line-height:22px;font-weight:600;color:#0f172a;">Help needed</td>
                  <td style="padding:14px 16px;font-size:14px;line-height:22px;color:#334155;">${escapeHtml(selectedHelp.join(', '))}</td>
                </tr>
              </table>
              <p style="margin:20px 0 0;font-size:12px;line-height:18px;color:#64748b;">Reply directly to this email to respond to ${escapeHtml(name)} at ${escapeHtml(email)}.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    transporter.sendMail({
        from: smtpUser,
        to: inboxEmail,
        replyTo: email,
        subject,
        text,
        html
}).then(info=>{
    console.log('Email sent: ' + info.response);
    res.send('Email sent successfully');
}).catch(error=>{
    console.error('Error sending email: ' + error);
    res.status(500).send('Error sending email');
});
});
