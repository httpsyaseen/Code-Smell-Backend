import nodemailer from "nodemailer";

const createTransporter = () => {
  const host = process.env.EMAIL_HOST;
  const port = Number(process.env.EMAIL_PORT || 587);
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: user && pass ? { user, pass } : undefined,
  });
};

const sendEmail = async ({ to, subject, text, html }) => {
  const transporter = createTransporter();

  const from = process.env.EMAIL_FROM || "no-reply@codesmell.local";

  await transporter.sendMail({ from, to, subject, text, html });
};

export default sendEmail;
