"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/db/client";
import { Button } from "@/lib/ui/button";

// Reasons the /auth/callback route can redirect back here with ?error=.
const URL_ERROR_MESSAGES: Record<string, string> = {
  expired:
    "That link expired or was already used — magic links only work once. Request a new one below.",
  forbidden: "That email isn't authorized for the baker dashboard.",
  auth: "Couldn't sign you in — request a new link and try again.",
};

export default function BakerLoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const searchParams = useSearchParams();
  const urlError = searchParams.get("error");

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
        <p className="text-[10.5px] font-semibold uppercase tracking-[0.08em]" style={{ color: "var(--wine-fg)" }}>
          Baker
        </p>
        <h1 className="font-display text-[26px] italic font-semibold">
          Sign in
        </h1>
        <p className="text-[14px] text-muted">
          Enter your email and I&rsquo;ll send a magic link. Only the bakery
          owner can get in.
        </p>
      </div>

      {status === "idle" && urlError && (
        <div
          className="rounded-[var(--radius-card)] border px-4 py-3 text-[13px] leading-relaxed"
          style={{
            background: "var(--coral-bg)",
            color: "var(--coral-fg)",
            borderColor: "var(--coral-border)",
          }}
        >
          {URL_ERROR_MESSAGES[urlError] ?? URL_ERROR_MESSAGES.auth}
        </div>
      )}

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
            className="w-full border-0 border-b border-hairline bg-transparent px-0 py-2 text-sm outline-none placeholder:text-muted focus:border-ink"
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
