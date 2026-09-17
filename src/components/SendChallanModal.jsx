"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Check,
  Copy,
  Download,
  MessageCircle,
  Paperclip,
  Phone,
  Share2,
  SkipForward,
} from "lucide-react";
import { canMessage, challanMessage, normalisePhone, whatsappLink } from "@/lib/whatsapp";
import { challanPdfBlob } from "@/lib/pdf";
import {
  BucketMissingError,
  LINK_VALID_DAYS,
  canShareFile,
  shareWithFile,
  uploadChallanPdf,
} from "@/lib/challanShare";
import { num, periodLabel } from "@/lib/format";
import { Modal, Spinner, useToast } from "@/components/ui";

/**
 * Walks the office through sending challans on WhatsApp, one parent at a time.
 *
 * It has to be one at a time: a browser only opens a window in response to a
 * click, so a single "send all" could never open thirty chats. For each parent
 * the challan PDF is built, uploaded, and a signed link folded into the message
 * — so the parent receives the actual challan, not just the figures.
 */
export default function SendChallanModal({ challans, items, settings, blanksFor, onClose }) {
  const toast = useToast();
  const [note, setNote] = useState("");
  const [index, setIndex] = useState(0);
  const [sent, setSent] = useState(() => new Set());
  const [skipped, setSkipped] = useState(() => new Set());

  // Per-challan attachment state, kept so stepping back never re-uploads.
  const [attach, setAttach] = useState(() => new Map());
  const [preparing, setPreparing] = useState(false);
  const [bucketMissing, setBucketMissing] = useState(false);

  const list = challans || [];
  const sendable = useMemo(() => list.filter((c) => canMessage(c.phone)), [list]);
  const unreachable = useMemo(() => list.filter((c) => !canMessage(c.phone)), [list]);

  useEffect(() => {
    setIndex(0);
    setSent(new Set());
    setSkipped(new Set());
    setAttach(new Map());
    setBucketMissing(false);
  }, [challans]);

  const current = sendable[index] || null;
  const done = index >= sendable.length;

  const itemsFor = useCallback(
    (ch) => (items instanceof Map ? items.get(ch.id) : items?.[ch.id]) || [],
    [items]
  );

  /** Build the PDF for one challan, upload it, and remember the link. */
  const prepare = useCallback(
    async (ch) => {
      if (!ch || attach.has(ch.id)) return;
      setPreparing(true);
      try {
        const blanks = blanksFor ? new Map([[ch.id, blanksFor(ch)]]) : undefined;
        const { blob, name } = await challanPdfBlob([ch], settings, new Map([[ch.id, itemsFor(ch)]]), blanks);

        let link = null;
        try {
          link = await uploadChallanPdf(blob, name, ch);
        } catch (e) {
          if (e instanceof BucketMissingError) setBucketMissing(true);
          else toast(e.message, "error");
        }
        setAttach((prev) => new Map(prev).set(ch.id, { blob, name, link }));
      } catch (e) {
        toast(e.message, "error");
        setAttach((prev) => new Map(prev).set(ch.id, { blob: null, name: null, link: null }));
      } finally {
        setPreparing(false);
      }
    },
    [attach, blanksFor, itemsFor, settings, toast]
  );

  // Get the current parent's challan ready while they are on screen.
  useEffect(() => {
    if (current) prepare(current);
  }, [current, prepare]);

  if (!list.length) return null;

  const pack = current ? attach.get(current.id) : null;

  const messageFor = (ch) => {
    const extra = [];
    const link = attach.get(ch.id)?.link;
    if (link) {
      extra.push(`📄 Your challan (PDF): ${link}`);
      extra.push(`_Link works for ${LINK_VALID_DAYS} days._`);
    }
    if (note.trim()) extra.push(note.trim());
    return challanMessage(ch, settings, itemsFor(ch), extra.join("\n"));
  };

  const advance = () => setIndex((i) => i + 1);

  const send = () => {
    const link = whatsappLink(current.phone, messageFor(current));
    if (!link) return toast("That number cannot be used for WhatsApp.", "error");
    window.open(link, "_blank", "noopener");
    setSent((prev) => new Set(prev).add(current.id));
    advance();
  };

  const shareFile = async () => {
    if (!pack?.blob) return;
    const ok = await shareWithFile({ blob: pack.blob, name: pack.name, text: messageFor(current) });
    if (!ok) toast("Sharing the file is not available on this device.", "error");
  };

  const downloadPdf = () => {
    if (!pack?.blob) return;
    const url = URL.createObjectURL(pack.blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = pack.name;
    a.click();
    URL.revokeObjectURL(url);
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
      subtitle={done ? "Finished" : `${index + 1} of ${sendable.length} · ${periodLabel(list[0].year, list[0].month)}`}
      width="max-w-2xl"
    >
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

      {bucketMissing && (
        <div className="mb-4 flex items-start gap-2.5 rounded-xl bg-amber-50 p-3.5 text-xs text-amber-900 ring-1 ring-amber-200">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            <b>The challan PDF cannot be attached yet.</b> Run{" "}
            <span className="font-mono">supabase/schema.sql</span> once more to create the storage bucket, and
            every message will carry a download link. Messages still send with the full figures in the
            meantime.
          </p>
        </div>
      )}

      {!done && current && (
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
              <div className="flex items-center gap-2">
                {preparing ? (
                  <span className="chip bg-slate-100 text-slate-600 ring-slate-200">
                    <Spinner className="h-3 w-3" /> preparing challan
                  </span>
                ) : pack?.link ? (
                  <span className="chip bg-brand-50 text-brand-700 ring-brand-200">
                    <Paperclip className="h-3 w-3" /> PDF attached
                  </span>
                ) : null}
                <span className="chip bg-emerald-50 text-emerald-700 ring-emerald-200">
                  <Phone className="h-3 w-3" /> +{normalisePhone(current.phone)}
                </span>
              </div>
            </div>

            <pre className="scroll-thin max-h-56 overflow-auto whitespace-pre-wrap px-4 py-3 font-sans text-xs leading-relaxed text-slate-700">
              {messageFor(current)}
            </pre>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button className="btn-primary flex-1" onClick={send} disabled={preparing}>
              {preparing ? <Spinner className="h-4 w-4" /> : <MessageCircle className="h-4 w-4" />}
              Open WhatsApp &amp; next
            </button>
            {canShareFile() && (
              <button className="btn-secondary" onClick={shareFile} disabled={!pack?.blob} title="Attach the PDF itself">
                <Share2 className="h-4 w-4" /> Share file
              </button>
            )}
            <button className="btn-secondary" onClick={downloadPdf} disabled={!pack?.blob} title="Download the challan">
              <Download className="h-4 w-4" />
            </button>
            <button className="btn-secondary" onClick={copy} title="Copy the message">
              <Copy className="h-4 w-4" />
            </button>
            <button className="btn-secondary" onClick={() => { setSkipped((p) => new Set(p).add(current.id)); advance(); }}>
              <SkipForward className="h-4 w-4" /> Skip
            </button>
          </div>

          <p className="mt-3 text-xs text-slate-500">
            WhatsApp opens in a new tab with the message and the challan link ready — press send there, then
            come back for the next parent.
            {canShareFile() && " “Share file” attaches the PDF itself, but lets you pick the contact."}
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
