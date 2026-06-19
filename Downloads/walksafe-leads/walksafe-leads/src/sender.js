const nodemailer = require("nodemailer");

let transporter;

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: "smtp.zoho.eu",
      port: 465,
      secure: true,
      auth: {
        user: process.env.ZOHO_EMAIL,
        pass: process.env.ZOHO_PASSWORD,
      },
    });
  }
  return transporter;
}

async function sendEmail({ to, subject, body }) {
  const transport = getTransporter();

  try {
    const info = await transport.sendMail({
      from: `Michael at WalkSafe <${process.env.ZOHO_EMAIL}>`,
      to,
      subject,
      text: body,
    });

    console.log(`Email sent to ${to}: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (err) {
    console.error(`Failed to send to ${to}:`, err.message);
    return { success: false, error: err.message };
  }
}

module.exports = { sendEmail };
