"use client";

import { useSession, signOut } from "next-auth/react";
import Link from "next/link";

export function UserMenu() {
  const { data: session, status } = useSession();

  if (status === "loading") return <p>Loading…</p>;

  if (!session?.user) {
    return (
      <Link href="/login" className="text-sm underline">
        Login
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm">{session.user.email}</span>
      <button
        onClick={() => signOut({ callbackUrl: "/" })}
        className="px-3 py-1 rounded-md bg-gray-200 text-xs"
      >
        Sign Out
      </button>
    </div>
  );
}
