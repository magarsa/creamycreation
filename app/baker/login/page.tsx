"use client";

import { useState } from "react";
import { createClient } from "@/lib/db/client";
import { Button } from "@/lib/ui/button";

export default function BakerLoginPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
    "idle",
  );

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setStatus("sending");
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=/baker/orders`,
      },
    });
    setStatus(error ? "error" : "sent");
  }

  return (
    <main className="mx-auto flex min-h-full w-full max-w-md flex-1 flex-col justify-center gap-6 px-[var(--screen-pad)] py-16">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold tracking-[-0.02em]">Baker sign in</h1>
        <p className="text-[14px] text-muted">
          Enter your email and I&rsquo;ll send a magic link. Only the bakery
          owner can get in.
        </p>
      </div>

      {status === "sent" ? (
        <div
          className="rounded-[var(--radius-card)] border px-4 py-3 text-[14px]"
          style={{
            background: "var(--amber-bg)",
            color: "var(--amber-fg)",
            borderColor: "var(--amber-border)",
          }}
        >
          Check your email for the sign-in link.
        </div>
      ) : (
        <form onSubmit={send} className="flex flex-col gap-3">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full rounded-[var(--radius-control)] border border-hairline bg-screen px-3 py-2.5 text-sm outline-none focus:border-black/30"
          />
          <Button
            className="w-full"
            type="submit"
            disabled={status === "sending"}
          >
            {status === "sending" ? "Sending…" : "Send magic link"}
          </Button>
          {status === "error" && (
            <p className="text-[13px]" style={{ color: "var(--coral-fg)" }}>
              Couldn&rsquo;t send the link. Check the email and try again.
            </p>
          )}
        </form>
      )}
    </main>
  );
}
