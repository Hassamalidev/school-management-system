"use client";

import { useEffect, useState } from "react";
import { Building2, KeyRound, Save, Settings as SettingsIcon } from "lucide-react";
import { fetchSettings, saveSettings } from "@/lib/db";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/AuthProvider";
import { Loading, PageHeader, Spinner, useToast } from "@/components/ui";

export default function SettingsPage() {
  const toast = useToast();
  const { session } = useAuth();
  const [form, setForm] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetchSettings()
      .then((s) => setForm(s))
      .catch((e) => toast(e.message, "error"));
  }, [toast]);

  if (!form) return <Loading />;

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const saved = await saveSettings({ ...form, due_day: Number(form.due_day) || 10 });
      setForm(saved);
      toast("Settings saved. Challans will use the new details.");
    } catch (err) {
      toast(err.message, "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader icon={SettingsIcon} title="Settings" subtitle="School details printed on every challan and receipt" />

      <form onSubmit={submit} className="grid gap-6 lg:grid-cols-3">
        <div className="card card-pad lg:col-span-2">
          <h2 className="flex items-center gap-2 text-base font-bold text-navy-900">
            <Building2 className="h-4 w-4 text-brand-600" /> School information
          </h2>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="label">School name</label>
              <input className="input" value={form.school_name || ""} onChange={set("school_name")} />
            </div>
            <div>
              <label className="label">Tagline</label>
              <input className="input" value={form.tagline || ""} onChange={set("tagline")} />
            </div>
            <div>
              <label className="label">Contact number</label>
              <input className="input" value={form.phone || ""} onChange={set("phone")} />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Address</label>
              <input className="input" value={form.address || ""} onChange={set("address")} />
            </div>
            <div>
              <label className="label">Instagram</label>
              <input className="input" value={form.instagram || ""} onChange={set("instagram")} />
            </div>
            <div>
              <label className="label">Facebook</label>
              <input className="input" value={form.facebook || ""} onChange={set("facebook")} />
            </div>
            <div>
              <label className="label">Fee due day of month</label>
              <input type="number" min="1" max="28" className="input" value={form.due_day ?? 10} onChange={set("due_day")} />
              <p className="mt-1 text-xs text-slate-400">Used as the due date on newly generated challans.</p>
            </div>
          </div>

          <h2 className="mt-8 flex items-center gap-2 text-base font-bold text-navy-900">
            <KeyRound className="h-4 w-4 text-brand-600" /> Bank details
          </h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Account title</label>
              <input className="input" value={form.bank_title || ""} onChange={set("bank_title")} />
            </div>
            <div>
              <label className="label">Bank / branch</label>
              <input className="input" value={form.bank_name || ""} onChange={set("bank_name")} />
            </div>
            <div>
              <label className="label">Account number</label>
              <input className="input" value={form.account_number || ""} onChange={set("account_number")} />
            </div>
            <div>
              <label className="label">IBAN</label>
              <input className="input" value={form.iban || ""} onChange={set("iban")} />
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <button type="submit" className="btn-primary" disabled={busy}>
              {busy ? <Spinner className="h-4 w-4" /> : <Save className="h-4 w-4" />} Save settings
            </button>
          </div>
        </div>

        <div className="space-y-6">
          <div className="card card-pad">
            <h2 className="text-base font-bold text-navy-900">Signed in as</h2>
            <p className="mt-2 break-all text-sm font-semibold text-slate-700">{session?.user?.email}</p>
            <p className="mt-1 text-xs text-slate-500">
              Staff accounts are managed in the Supabase dashboard under Authentication → Users.
            </p>
            <ChangePassword />
          </div>

          <div className="card card-pad">
            <h2 className="text-base font-bold text-navy-900">How fees work</h2>
            <ul className="mt-3 space-y-2 text-sm text-slate-600">
              <li>• Each class has a monthly fee set under Fee Structure.</li>
              <li>• A student can carry a custom fee or a standing discount that overrides the class fee.</li>
              <li>• Generating challans creates one challan per active student for the chosen month.</li>
              <li>• Paid and Remaining are recalculated from the payments recorded against each challan.</li>
            </ul>
          </div>
        </div>
      </form>
    </>
  );
}

function ChangePassword() {
  const toast = useToast();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (password.length < 6) return toast("Password must be at least 6 characters.", "error");
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) return toast(error.message, "error");
    setPassword("");
    toast("Password updated.");
  };

  return (
    <div className="mt-4 border-t border-slate-200 pt-4">
      <label className="label">Change password</label>
      <div className="flex gap-2">
        <input
          type="password"
          className="input"
          placeholder="New password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button type="button" className="btn-secondary shrink-0" onClick={submit} disabled={busy || !password}>
          {busy ? <Spinner className="h-4 w-4" /> : "Update"}
        </button>
      </div>
    </div>
  );
}
