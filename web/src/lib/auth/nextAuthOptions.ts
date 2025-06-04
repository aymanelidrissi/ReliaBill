import { type NextAuthOptions } from 'next-auth';
import EmailProvider from 'next-auth/providers/email';
import { PrismaAdapter } from '@next-auth/prisma-adapter';
import { prisma } from '../prisma';
import { sendVerificationEmail } from '@core/email/resendTransport';

export const nextAuthOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    EmailProvider({
      maxAge: 15 * 60,
      async sendVerificationRequest({ identifier, url }) {
        await sendVerificationEmail(identifier, url);
      },
    }),
  ],
  session: { strategy: 'database' },
  pages: { signIn: '/' },
};
