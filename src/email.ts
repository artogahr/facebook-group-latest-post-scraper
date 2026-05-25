import nodemailer from 'nodemailer';

export async function sendEmailNotification(
  senderEmail: string,
  senderPassword: string,
  recipientEmail: string,
  groupUrl: string,
  postText: string,
): Promise<void> {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: senderEmail, pass: senderPassword },
  });

  await transporter.sendMail({
    from: senderEmail,
    to: recipientEmail,
    subject: `New post in ${groupUrl}`,
    text: postText,
  });
}
