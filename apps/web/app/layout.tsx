import "./globals.css";
import Link from "next/link";
import { Toaster } from "@/components/ui/sonner";
import { LogoutButton } from "@/components/LogoutButton";

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en">
            <body className="min-h-screen bg-background text-foreground">
                <header className="border-b">
                    <div className="mx-auto max-w-5xl px-4 h-14 flex items-center gap-6">
                        <Link href="/" className="font-semibold">ReliaBill</Link>
                        <nav className="flex items-center gap-4 text-sm">
                            <Link href="/clients">Clients</Link>
                            <Link href="/invoices">Invoices</Link>
                            <Link href="/invoices/new">New</Link>
                            <Link href="/settings">Settings</Link>
                        </nav>
                        <div className="ml-auto">
                            <LogoutButton />
                        </div>
                    </div>
                </header>
                <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
                <Toaster />
            </body>
        </html>
    );
}
