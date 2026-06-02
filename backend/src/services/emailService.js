const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT || 587,
  auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
});

exports.sendAssignmentEmail = async (agentEmail, lead) => {
  if (!agentEmail) return;
  try {
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: agentEmail,
      subject: `New lead assigned: ${lead.name}`,
      html: `<p>You have been assigned a new lead.</p>
             <ul>
               <li><strong>Name:</strong> ${lead.name}</li>
               <li><strong>Email:</strong> ${lead.email || 'N/A'}</li>
               <li><strong>Phone:</strong> ${lead.phone || 'N/A'}</li>
               <li><strong>Source:</strong> ${lead.source || 'N/A'}</li>
               <li><strong>Notes:</strong> ${lead.notes || 'N/A'}</li>
             </ul>`,
    });
  } catch (err) {
    console.error('Email send failed (non-blocking):', err.message);
  }
};
