"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Lock, Mail } from "lucide-react";
import { supabase, supabaseConfigured } from "@/lib/supabase";
import { useAuth } from "@/components/AuthProvider";
import { LogoWordmark } from "@/components/Logo";
import { Spinner } from "@/components/ui";

export default function LoginPage() {
  const router = useRouter();
  const { session, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && session) router.replace("/dashboard");
  }, [loading, session, router]);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    const { error: err } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (err) {
      setError(err.message === "Invalid login credentials" ? "Wrong email or password." : err.message);
      return;
    }
    router.replace("/dashboard");
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* brand panel */}
      <div className="relative hidden flex-col justify-between bg-navy-900 p-12 lg:flex">
        <LogoWordmark />
        <div>
          <h1 className="text-4xl font-bold leading-tight text-white">
            Student &amp; Fee
            <br />
            Management System
          </h1>
          <p className="mt-4 max-w-md text-slate-300">
            Every student record, the fee structure for all nine classes, monthly challans and
            payment history — in one place.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            {["Daycare", "Playgroup", "Nursery", "KG", "Grade 1–5"].map((c) => (
              <span key={c} className="rounded-full bg-white/10 px-3.5 py-1.5 text-sm font-medium text-brand-100">
                {c}
              </span>
            ))}
          </div>
        </div>
        <p className="font-serif text-lg italic text-brand-200">Together for a Brighter Future</p>
      </div>

      {/* form panel */}
      <div className="flex items-center justify-center bg-slate-100 px-4 py-12">
        <div className="w-full max-w-md">
          <div className="mb-8 flex justify-center lg:hidden">
            <div className="rounded-2xl bg-navy-900 px-6 py-4">
              <LogoWordmark compact />
            </div>
          </div>

          <div className="card card-pad">
            <h2 className="text-2xl font-bold text-navy-900">Admin sign in</h2>
            <p className="mt-1 text-sm text-slate-500">Use the staff account created in Supabase.</p>

            {!supabaseConfigured && (
              <div className="mt-5 flex gap-2.5 rounded-xl bg-amber-50 p-3.5 text-sm text-amber-800 ring-1 ring-amber-200">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  Supabase keys are missing. Add <code className="font-mono">NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
                  <code className="font-mono">NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY</code> to your environment.
                </span>
              </div>
            )}

            <form onSubmit={submit} className="mt-6 space-y-4">
              <div>
                <label className="label" htmlFor="email">Email</label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    id="email"
                    type="email"
                    required
                    autoComplete="username"
                    className="input pl-9"
                    placeholder="admin@kindlesprout.pk"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="label" htmlFor="password">Password</label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    id="password"
                    type="password"
                    required
                    autoComplete="current-password"
                    className="input pl-9"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              </div>

              {error && (
                <p className="flex items-center gap-2 rounded-xl bg-rose-50 px-3.5 py-2.5 text-sm font-medium text-rose-700 ring-1 ring-rose-200">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {error}
                </p>
              )}

              <button type="submit" className="btn-primary w-full" disabled={busy}>
                {busy && <Spinner className="h-4 w-4" />}
                Sign in
              </button>
            </form>
          </div>

          <p className="mt-6 text-center text-xs text-slate-400">
            Kindle Sprout Daycare &amp; School · Service road South G-12/1, Islamabad
          </p>
        </div>
      </div>
    </div>
  );
}
