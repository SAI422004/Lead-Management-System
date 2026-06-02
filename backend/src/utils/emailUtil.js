const nodemailer = require('nodemailer');

let transporter = null;

const getTransporter = () => {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }
  return transporter;
};

/**
 * Send an email notification.
 * Gracefully degrades if SMTP is not configured.
 */
const sendEmail = async ({ to, subject, html, text }) => {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn('⚠️  SMTP not configured. Skipping email notification.');
    return { skipped: true };
  }

  try {
    const info = await getTransporter().sendMail({
      from: process.env.EMAIL_FROM || process.env.SMTP_USER,
      to,
      subject,
      html,
      text,
    });
    console.log(`📧 Email sent to ${to}: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (err) {
    console.error('Email send error:', err.message);
    return { success: false, error: err.message };
  }
};

const sendLeadAssignmentEmail = async ({ agentEmail, agentName, leadName, leadId }) => {
  return sendEmail({
    to: agentEmail,
    subject: `New Lead Assigned: ${leadName}`,
    html: `
      <h2>Hi ${agentName},</h2>
      <p>A new lead has been assigned to you.</p>
      <p><strong>Lead:</strong> ${leadName}</p>
      <p><strong>Lead ID:</strong> ${leadId}</p>
      <p>Please log in to the Lead Management System to view the details.</p>
      <br/>
      <p>— Lead Management System</p>
    `,
    text: `Hi ${agentName}, a new lead "${leadName}" (ID: ${leadId}) has been assigned to you.`,
  });
};

const sendLeadStatusEmail = async ({ email, leadName, oldStatus, newStatus }) => {
  return sendEmail({
    to: email,
    subject: `Lead Status Updated: ${leadName}`,
    html: `
      <h2>Lead Status Changed</h2>
      <p><strong>Lead:</strong> ${leadName}</p>
      <p><strong>Status:</strong> ${oldStatus} → <strong>${newStatus}</strong></p>
    `,
    text: `Lead "${leadName}" status changed from ${oldStatus} to ${newStatus}.`,
  });
};

module.exports = { sendEmail, sendLeadAssignmentEmail, sendLeadStatusEmail };
