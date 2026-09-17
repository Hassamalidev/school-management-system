"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ArrowRight, Check, Copy, MessageCircle, Phone, SkipForward } from "lucide-react";
import { canMessage, challanMessage, normalisePhone, whatsappLink } from "@/lib/whatsapp";
import { num, periodLabel } from "@/lib/format";
import { Modal, useToast } from "@/components/ui";

/**
 * Walks the office through sending challans on WhatsApp, one parent at a time.
 *
 * It has to be one at a time: browsers only allow a window to open in response
 * to a click, so a single "send all" could never open thirty chats. Each tap
 * opens that parent's chat with the message written, and the queue advances.
 */
export default function SendChallanModal({ challans, items, settings, onClose }) {
  const toast = useToast();
  const [note, setNote] = useState("");
  const [index, setIndex] = useState(0);
  const [sent, setSent] = useState(() => new Set());
  const [skipped, setSkipped] = useState(() => new Set());

  const list = challans || [];

  const sendable = useMemo(() => list.filter((c) => canMessage(c.phone)), [list]);
  const unreachable = useMemo(() => list.filter((c) => !canMessage(c.phone)), [list]);

  useEffect(() => {
    setIndex(0);
    setSent(new Set());
    setSkipped(new Set());
  }, [challans]);

  if (!list.length) return null;

  const current = sendable[index] || null;
  const done = index >= sendable.length;

  const itemsFor = (ch) => (items instanceof Map ? items.get(ch.id) : items?.[ch.id]) || [];
  const messageFor = (ch) => challanMessage(ch, settings, itemsFor(ch), note);

  const advance = () => setIndex((i) => i + 1);

  const send = () => {
    const link = whatsappLink(current.phone, messageFor(current));
    if (!link) return toast("That number cannot be used for WhatsApp.", "error");
    window.open(link, "_blank", "noopener");
    setSent((prev) => new Set(prev).add(current.id));
    advance();
  };

  const skip = () => {
    setSkipped((prev) => new Set(prev).add(current.id));
    advance();
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(messageFor(current));
      toast("Message copied.");
    } catch {
      toast("Could not copy — select the text instead.", "error");
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="Send challan on WhatsApp"
      subtitle={
        done
          ? "Finished"
          : `${index + 1} of ${sendable.length} · ${periodLabel(list[0].year, list[0].month)}`
      }
      width="max-w-2xl"
    >
      {/* progress */}
      <div className="mb-4 flex items-center gap-3">
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-200">
          <div
            className="h-full rounded-full bg-brand-600 transition-all"
            style={{ width: `${sendable.length ? (index / sendable.length) * 100 : 100}%` }}
          />
        </div>
        <span className="shrink-0 text-xs font-semibold text-slate-500">
          {sent.size} sent · {skipped.size} skipped
        </span>
      </div>

      {!done && (
        <>
          <div className="mb-4">
            <label className="label">Add a note to every message (optional)</label>
            <input
              className="input"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Kindly clear the balance before the 10th."
            />
          </div>

          <div className="rounded-2xl ring-1 ring-slate-200">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
              <div className="min-w-0">
                <p className="truncate font-bold text-navy-900">{current.student_name}</p>
                <p className="text-xs text-slate-500">
                  {current.class_name || "—"} · remaining{" "}
                  <b className="text-rose-700">PKR {num(current.remaining)}</b>
                </p>
              </div>
              <span className="chip bg-emerald-50 text-emerald-700 ring-emerald-200">
                <Phone className="h-3 w-3" /> +{normalisePhone(current.phone)}
              </span>
            </div>

            <pre className="scroll-thin max-h-56 overflow-auto whitespace-pre-wrap px-4 py-3 font-sans text-xs leading-relaxed text-slate-700">
              {messageFor(current)}
            </pre>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button className="btn-primary flex-1" onClick={send}>
              <MessageCircle className="h-4 w-4" /> Open WhatsApp &amp; next
            </button>
            <button className="btn-secondary" onClick={copy} title="Copy the message">
              <Copy className="h-4 w-4" /> Copy
            </button>
            <button className="btn-secondary" onClick={skip}>
              <SkipForward className="h-4 w-4" /> Skip
            </button>
          </div>

          <p className="mt-3 text-xs text-slate-500">
            WhatsApp opens in a new tab with the message ready — press send there, then come back to this tab
            for the next parent.
          </p>
        </>
      )}

      {done && (
        <div className="py-2">
          <div className="flex items-center gap-2.5 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800 ring-1 ring-emerald-200">
            <Check className="h-4 w-4 shrink-0" />
            <span>
              Opened WhatsApp for <b>{sent.size}</b> parent{sent.size === 1 ? "" : "s"}
              {skipped.size ? `, skipped ${skipped.size}` : ""}.
            </span>
          </div>
          <button className="btn-secondary mt-4 w-full" onClick={() => setIndex(0)}>
            <ArrowRight className="h-4 w-4" /> Start again from the top
          </button>
        </div>
      )}

      {unreachable.length > 0 && (
        <div className="mt-5 rounded-xl bg-amber-50 p-4 ring-1 ring-amber-200">
          <p className="flex items-center gap-2 text-sm font-bold text-amber-900">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            {unreachable.length} student{unreachable.length === 1 ? " has" : "s have"} no usable number
          </p>
          <p className="mt-1 text-xs text-amber-800">
            These are not in the queue. Add a mobile number on the Students page and they will be included next
            time.
          </p>
          <ul className="mt-2 space-y-0.5 text-xs text-amber-900">
            {unreachable.map((c) => (
              <li key={c.id}>
                • {c.student_name}
                {c.phone ? ` — "${c.phone}" is not a valid mobile number` : " — no number on record"}
              </li>
            ))}
          </ul>
        </div>
      )}
    </Modal>
  );
}
