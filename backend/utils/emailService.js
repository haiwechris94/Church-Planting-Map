/**
 * Email Service - Handles sending emails for password recovery and notifications
 * Uses Nodemailer for SMTP email delivery
 */
const nodemailer = require('nodemailer');

// Create reusable transporter object using SMTP transport
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
};

/**
 * Email templates for password reset
 */
const emailTemplates = {
  // Rejection notification templates
  rejectionNotification: {
    en: {
      subject: 'People Group Submission Rejected - Everywhere',
      html: (data) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Submission Rejected</title>
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #DC2626 0%, #B91C1C 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .header h1 { margin: 0; font-size: 24px; }
    .content { background: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
    .info-box { background: #FEF2F2; border-left: 4px solid #DC2626; padding: 15px; margin: 20px 0; border-radius: 4px; }
    .reason-box { background: #FFF7ED; border-left: 4px solid #F59E0B; padding: 15px; margin: 20px 0; border-radius: 4px; }
    .details { background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 15px 0; }
    .details p { margin: 5px 0; }
    .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
    .button { display: inline-block; background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%); color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin: 15px 0; font-weight: bold; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>❌ Submission Rejected</h1>
    </div>
    <div class="content">
      <h2>Hello${data.userName ? ` ${data.userName}` : ''},</h2>
      <p>We regret to inform you that your people group submission has been rejected by a supervisor.</p>
      
      <div class="info-box">
        <strong>📋 Submission Details:</strong>
        <div class="details">
          <p><strong>People Group:</strong> ${data.peopleGroupName}</p>
          <p><strong>Village:</strong> ${data.villageName || 'Not specified'}</p>
          <p><strong>Date Submitted:</strong> ${data.dateSubmitted}</p>
          <p><strong>Date Rejected:</strong> ${data.dateRejected}</p>
          <p><strong>Rejected By:</strong> ${data.rejectedByName}</p>
        </div>
      </div>
      
      <div class="reason-box">
        <strong>📝 Rejection Reason:</strong>
        <p style="margin-top: 10px; font-style: italic;">"${data.rejectionReason}"</p>
      </div>
      
      <p>You can review the feedback and resubmit your people group with the necessary corrections.</p>
      
      <div style="text-align: center;">
        <a href="${data.appUrl}/activities" class="button">View Rejected Submissions</a>
      </div>
      
      <p>If you have any questions about this decision, please contact your supervisor.</p>
      
      <p>Best regards,<br>The Everywhere Team</p>
    </div>
    <div class="footer">
      <p>This is an automated message. Please do not reply to this email.</p>
      <p>&copy; ${new Date().getFullYear()} Everywhere. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
      `,
      text: (data) => `
Hello${data.userName ? ` ${data.userName}` : ''},

We regret to inform you that your people group submission has been rejected by a supervisor.

SUBMISSION DETAILS:
- People Group: ${data.peopleGroupName}
- Village: ${data.villageName || 'Not specified'}
- Date Submitted: ${data.dateSubmitted}
- Date Rejected: ${data.dateRejected}
- Rejected By: ${data.rejectedByName}

REJECTION REASON:
"${data.rejectionReason}"

You can review the feedback and resubmit your people group with the necessary corrections.

Visit ${data.appUrl}/activities to view your rejected submissions.

If you have any questions about this decision, please contact your supervisor.

Best regards,
The Everywhere Team
      `,
    },
    fr: {
      subject: 'Soumission de peuple rejetée - Everywhere',
      html: (data) => `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Soumission Rejetée</title>
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #DC2626 0%, #B91C1C 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .header h1 { margin: 0; font-size: 24px; }
    .content { background: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
    .info-box { background: #FEF2F2; border-left: 4px solid #DC2626; padding: 15px; margin: 20px 0; border-radius: 4px; }
    .reason-box { background: #FFF7ED; border-left: 4px solid #F59E0B; padding: 15px; margin: 20px 0; border-radius: 4px; }
    .details { background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 15px 0; }
    .details p { margin: 5px 0; }
    .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
    .button { display: inline-block; background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%); color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin: 15px 0; font-weight: bold; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>❌ Soumission Rejetée</h1>
    </div>
    <div class="content">
      <h2>Bonjour${data.userName ? ` ${data.userName}` : ''},</h2>
      <p>Nous avons le regret de vous informer que votre soumission de peuple a été rejetée par un superviseur.</p>
      
      <div class="info-box">
        <strong>📋 Détails de la soumission :</strong>
        <div class="details">
          <p><strong>Peuple :</strong> ${data.peopleGroupName}</p>
          <p><strong>Village :</strong> ${data.villageName || 'Non spécifié'}</p>
          <p><strong>Date de soumission :</strong> ${data.dateSubmitted}</p>
          <p><strong>Date de rejet :</strong> ${data.dateRejected}</p>
          <p><strong>Rejeté par :</strong> ${data.rejectedByName}</p>
        </div>
      </div>
      
      <div class="reason-box">
        <strong>📝 Raison du rejet :</strong>
        <p style="margin-top: 10px; font-style: italic;">"${data.rejectionReason}"</p>
      </div>
      
      <p>Vous pouvez consulter les commentaires et soumettre à nouveau votre peuple avec les corrections nécessaires.</p>
      
      <div style="text-align: center;">
        <a href="${data.appUrl}/activities" class="button">Voir les soumissions rejetées</a>
      </div>
      
      <p>Si vous avez des questions concernant cette décision, veuillez contacter votre superviseur.</p>
      
      <p>Cordialement,<br>L'équipe Everywhere</p>
    </div>
    <div class="footer">
      <p>Ceci est un message automatique. Veuillez ne pas répondre à cet email.</p>
      <p>&copy; ${new Date().getFullYear()} Everywhere. Tous droits réservés.</p>
    </div>
  </div>
</body>
</html>
      `,
      text: (data) => `
Bonjour${data.userName ? ` ${data.userName}` : ''},

Nous avons le regret de vous informer que votre soumission de peuple a été rejetée par un superviseur.

DÉTAILS DE LA SOUMISSION :
- Peuple : ${data.peopleGroupName}
- Village : ${data.villageName || 'Non spécifié'}
- Date de soumission : ${data.dateSubmitted}
- Date de rejet : ${data.dateRejected}
- Rejeté par : ${data.rejectedByName}

RAISON DU REJET :
"${data.rejectionReason}"

Vous pouvez consulter les commentaires et soumettre à nouveau votre peuple avec les corrections nécessaires.

Visitez ${data.appUrl}/activities pour voir vos soumissions rejetées.

Si vous avez des questions concernant cette décision, veuillez contacter votre superviseur.

Cordialement,
L'équipe Everywhere
      `,
    },
  },
  passwordReset: {
    en: {
      subject: 'Password Reset Request - Everywhere',
      html: (resetUrl, userName) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Password Reset</title>
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .header h1 { margin: 0; font-size: 24px; }
    .content { background: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
    .button { display: inline-block; background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%); color: white; padding: 14px 30px; text-decoration: none; border-radius: 8px; margin: 20px 0; font-weight: bold; }
    .button:hover { opacity: 0.9; }
    .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
    .warning { background: #FEF3C7; border-left: 4px solid #F59E0B; padding: 15px; margin: 20px 0; border-radius: 4px; }
    .link-text { word-break: break-all; background: #f5f5f5; padding: 10px; border-radius: 4px; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🗺️ Everywhere</h1>
    </div>
    <div class="content">
      <h2>Hello${userName ? ` ${userName}` : ''},</h2>
      <p>We received a request to reset your password for your Everywhere account.</p>
      <p>Click the button below to reset your password:</p>
      <div style="text-align: center;">
        <a href="${resetUrl}" class="button">Reset My Password</a>
      </div>
      <div class="warning">
        <strong>⚠️ Important:</strong> This link will expire in <strong>1 hour</strong>. If you didn't request this password reset, please ignore this email or contact support if you have concerns.
      </div>
      <p>If the button doesn't work, copy and paste this link into your browser:</p>
      <p class="link-text">${resetUrl}</p>
      <p>Best regards,<br>The Everywhere Team</p>
    </div>
    <div class="footer">
      <p>This is an automated message. Please do not reply to this email.</p>
      <p>&copy; ${new Date().getFullYear()} Everywhere. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
      `,
      text: (resetUrl, userName) => `
Hello${userName ? ` ${userName}` : ''},

We received a request to reset your password for your Everywhere account.

Click the link below to reset your password:
${resetUrl}

IMPORTANT: This link will expire in 1 hour. If you didn't request this password reset, please ignore this email.

Best regards,
The Everywhere Team
      `,
    },
    fr: {
      subject: 'Demande de réinitialisation du mot de passe - Everywhere',
      html: (resetUrl, userName) => `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Réinitialisation du mot de passe</title>
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .header h1 { margin: 0; font-size: 24px; }
    .content { background: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
    .button { display: inline-block; background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%); color: white; padding: 14px 30px; text-decoration: none; border-radius: 8px; margin: 20px 0; font-weight: bold; }
    .button:hover { opacity: 0.9; }
    .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
    .warning { background: #FEF3C7; border-left: 4px solid #F59E0B; padding: 15px; margin: 20px 0; border-radius: 4px; }
    .link-text { word-break: break-all; background: #f5f5f5; padding: 10px; border-radius: 4px; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🗺️ Everywhere</h1>
    </div>
    <div class="content">
      <h2>Bonjour${userName ? ` ${userName}` : ''},</h2>
      <p>Nous avons reçu une demande de réinitialisation de votre mot de passe pour votre compte Everywhere.</p>
      <p>Cliquez sur le bouton ci-dessous pour réinitialiser votre mot de passe :</p>
      <div style="text-align: center;">
        <a href="${resetUrl}" class="button">Réinitialiser mon mot de passe</a>
      </div>
      <div class="warning">
        <strong>⚠️ Important :</strong> Ce lien expirera dans <strong>1 heure</strong>. Si vous n'avez pas demandé cette réinitialisation, veuillez ignorer cet email ou contacter le support si vous avez des inquiétudes.
      </div>
      <p>Si le bouton ne fonctionne pas, copiez et collez ce lien dans votre navigateur :</p>
      <p class="link-text">${resetUrl}</p>
      <p>Cordialement,<br>L'équipe Everywhere</p>
    </div>
    <div class="footer">
      <p>Ceci est un message automatique. Veuillez ne pas répondre à cet email.</p>
      <p>&copy; ${new Date().getFullYear()} Everywhere. Tous droits réservés.</p>
    </div>
  </div>
</body>
</html>
      `,
      text: (resetUrl, userName) => `
Bonjour${userName ? ` ${userName}` : ''},

Nous avons reçu une demande de réinitialisation de votre mot de passe pour votre compte Everywhere.

Cliquez sur le lien ci-dessous pour réinitialiser votre mot de passe :
${resetUrl}

IMPORTANT : Ce lien expirera dans 1 heure. Si vous n'avez pas demandé cette réinitialisation, veuillez ignorer cet email.

Cordialement,
L'équipe Everywhere
      `,
    },
  },
};

/**
 * Send password reset email
 * @param {string} email - Recipient email address
 * @param {string} resetToken - Password reset token
 * @param {string} userName - User's name (optional)
 * @param {string} language - Language for email template ('en' or 'fr')
 * @returns {Promise<Object>} - Email send result
 */
const sendPasswordResetEmail = async (email, resetToken, userName = '', language = 'en') => {
  try {
    const transporter = createTransporter();
    
    // Construct reset URL
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const resetUrl = `${frontendUrl}/reset-password/${resetToken}`;
    
    // Get template based on language (default to English)
    const lang = ['en', 'fr'].includes(language) ? language : 'en';
    const template = emailTemplates.passwordReset[lang];
    
    const mailOptions = {
      from: `"Everywhere" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
      to: email,
      subject: template.subject,
      text: template.text(resetUrl, userName),
      html: template.html(resetUrl, userName),
    };
    
    const info = await transporter.sendMail(mailOptions);
    
    console.log(`Password reset email sent to ${email}: ${info.messageId}`);
    
    return {
      success: true,
      messageId: info.messageId,
    };
  } catch (error) {
    console.error('Error sending password reset email:', error);
    throw new Error(`Failed to send password reset email: ${error.message}`);
  }
};

/**
 * Send rejection notification email
 * @param {string} email - Recipient email address
 * @param {Object} data - Rejection data
 * @param {string} data.userName - User's name
 * @param {string} data.peopleGroupName - Name of the rejected people group
 * @param {string} data.villageName - Village name
 * @param {string} data.dateSubmitted - Date the people group was submitted
 * @param {string} data.dateRejected - Date of rejection
 * @param {string} data.rejectedByName - Name of the supervisor who rejected
 * @param {string} data.rejectionReason - Reason for rejection
 * @param {string} language - Language for email template ('en' or 'fr')
 * @returns {Promise<Object>} - Email send result
 */
const sendRejectionNotificationEmail = async (email, data, language = 'en') => {
  try {
    const transporter = createTransporter();
    
    // Get frontend URL for links
    const appUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    
    // Get template based on language (default to English)
    const lang = ['en', 'fr'].includes(language) ? language : 'en';
    const template = emailTemplates.rejectionNotification[lang];
    
    const emailData = {
      ...data,
      appUrl,
    };
    
    const mailOptions = {
      from: `"Everywhere" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
      to: email,
      subject: template.subject,
      text: template.text(emailData),
      html: template.html(emailData),
    };
    
    const info = await transporter.sendMail(mailOptions);
    
    console.log(`Rejection notification email sent to ${email}: ${info.messageId}`);
    
    return {
      success: true,
      messageId: info.messageId,
    };
  } catch (error) {
    console.error('Error sending rejection notification email:', error);
    throw new Error(`Failed to send rejection notification email: ${error.message}`);
  }
};

/**
 * Verify email configuration is valid
 * @returns {Promise<boolean>} - True if configuration is valid
 */
const verifyEmailConfig = async () => {
  try {
    const transporter = createTransporter();
    await transporter.verify();
    console.log('Email configuration verified successfully');
    return true;
  } catch (error) {
    console.error('Email configuration error:', error.message);
    return false;
  }
};

module.exports = {
  sendPasswordResetEmail,
  sendRejectionNotificationEmail,
  verifyEmailConfig,
  emailTemplates,
};
