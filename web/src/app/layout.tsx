"use client";

import { SessionProvider } from "next-auth/react";
import Link from "next/link";
import "../app/global.css"
import { UserMenu } from "../components/userMenu";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <SessionProvider refetchOnWindowFocus={false} refetchInterval={300}>
          <header className="w-full p-4 border-b">
            <nav className="max-w-4xl mx-auto flex justify-between">
              <Link href="/" className="text-lg font-bold">
                Reliabill
              </Link>
              <UserMenu />
            </nav>
          </header>
          <main className="max-w-4xl mx-auto p-4">{children}</main>
        </SessionProvider>
      </body>
    </html>
  );
}
