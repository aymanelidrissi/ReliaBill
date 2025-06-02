"use client";
import { useState, FormEvent } from "react";
import { signIn } from "next-auth/react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    await signIn("email", { email, redirect: false });
    setSent(true);
  }

  return (
    <main className="flex items-center justify-center h-screen">
      <div className="w-full max-w-sm border rounded-2xl p-6 shadow-lg">
        <h1 className="text-xl font-semibold mb-4">Magic-Link Login</h1>
        {sent ? (
          <p className="text-green-700">
            Check your inbox (mail.reliabill.be) for the sign-in link.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="email"
              required
              placeholder="you@mail.reliabill.be"
              className="w-full p-2 border rounded-md"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <button
              type="submit"
              className="w-full py-2 rounded-md bg-blue-600 text-white font-medium"
            >
              Send Link
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
