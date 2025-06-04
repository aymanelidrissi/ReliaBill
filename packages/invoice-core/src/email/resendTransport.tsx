import { Resend } from 'resend';
import VerificationEmail from './VerificationEmail';

const resend = new Resend(process.env['RESEND_API_KEY'] ?? '');

export async function sendVerificationEmail(
  to: string,
  magicLink: string,
): Promise<void> {
  await resend.emails.send({
    from: process.env['EMAIL_FROM'] ?? 'ReliaBill <no-reply@mail.reliabill.be>',
    to,
    subject: 'Your ReliaBill sign-in link',
    react: <VerificationEmail magicLink={magicLink} />,
  });
}
