"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ClipboardList, Download, Printer, RotateCcw } from "lucide-react";
import { fetchClasses, fetchSettings } from "@/lib/db";
import { admissionFormBlobUrl, downloadAdmissionForm } from "@/lib/admissionFormPdf";
import { Loading, PageHeader, Spinner, useToast } from "@/components/ui";

const BLANK = {
  form_no: "",
  location: "",
  class_name: "",
  student_first: "",
  student_middle: "",
  student_last: "",
  dob_d: "",
  dob_m: "",
  dob_y: "",
  gender: "",
  nationality: "",
  first_language: "",
  other_languages: "",
  address: "",
  city: "",
  country: "",
  father_first: "", father_middle: "", father_last: "",
  father_email: "", father_qualification: "", father_profession: "", father_designation: "", father_phone: "",
  mother_first: "", mother_middle: "", mother_last: "",
  mother_email: "", mother_qualification: "", mother_profession: "", mother_designation: "", mother_phone: "",
  guardian_first: "", guardian_middle: "", guardian_last: "",
  guardian_email: "", guardian_relation: "", guardian_phone: "",
  prev_school: "",
  class_completed: "",
  medical_problem: "",
  chronic: "",
  allergies: "",
  reference_through: "",
  reference_address: "",
  reference_address2: "",
  declaration_date: "",
  birth_certificate: false,
  father_cnic: false,
  school_report: false,
  transfer_certificate: false,
  photos: false,
  medical_form: false,
  office_student_name: "",
  office_class: "",
  office_section: "",
  office_date: "",
};

const CHECKLIST = [
  ["birth_certificate", "Birth Certificate"],
  ["father_cnic", "Father CNIC copy"],
  ["school_report", "School Report"],
  ["transfer_certificate", "Transfer Certificate"],
  ["photos", "Passport size Photos"],
  ["medical_form", "Medical Form"],
];

export default function AdmissionFormPage() {
  const toast = useToast();
  const [classes, setClasses] = useState([]);
  const [settings, setSettings] = useState({});
  const [data, setData] = useState(BLANK);
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const urlRef = useRef("");

  const set = (k) => (e) =>
    setData((d) => ({ ...d, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [cl, cfg] = await Promise.all([fetchClasses(), fetchSettings()]);
        if (!alive) return;
        setClasses(cl);
        setSettings(cfg);
      } catch (e) {
        toast(e.message, "error");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [toast]);

  // Rebuild the preview shortly after typing stops, so every keystroke does not
  // regenerate a PDF.
  const rebuild = useCallback(async () => {
    try {
      const next = await admissionFormBlobUrl({ classes, settings, data });
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
      urlRef.current = next;
      setUrl(next);
    } catch (e) {
      toast(e.message, "error");
    }
  }, [classes, settings, data, toast]);

  useEffect(() => {
    if (loading) return undefined;
    const id = setTimeout(rebuild, 400);
    return () => clearTimeout(id);
  }, [rebuild, loading]);

  useEffect(
    () => () => {
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    },
    []
  );

  const download = async () => {
    setBusy(true);
    try {
      await downloadAdmissionForm({ classes, settings, data });
      toast("Admission form downloaded.");
    } catch (e) {
      toast(e.message, "error");
    } finally {
      setBusy(false);
    }
  };

  const print = () => {
    if (!url) return;
    const w = window.open(url, "_blank");
    if (!w) return toast("Allow pop-ups to print, or use Download instead.", "error");
    w.addEventListener("load", () => w.print(), { once: true });
  };

  const studentName = useMemo(
    () => [data.student_first, data.student_middle, data.student_last].filter(Boolean).join(" "),
    [data]
  );

  if (loading) return <Loading label="Preparing the admission form…" />;

  return (
    <>
      <PageHeader
        icon={ClipboardList}
        title="Student Admission Form"
        subtitle={
          studentName
            ? `Filling in the form for ${studentName}`
            : "Type the details in and download — or leave it blank to print an empty form."
        }
      >
        <button className="btn-secondary" onClick={() => setData(BLANK)}>
          <RotateCcw className="h-4 w-4" /> Clear
        </button>
        <button className="btn-secondary" onClick={print}>
          <Printer className="h-4 w-4" /> Print
        </button>
        <button className="btn-primary" onClick={download} disabled={busy}>
          {busy ? <Spinner className="h-4 w-4" /> : <Download className="h-4 w-4" />} Download PDF
        </button>
      </PageHeader>

      <div className="grid gap-6 xl:grid-cols-2">
        {/* ---------------------------------------------------- the form -- */}
        <div className="space-y-6">
          <Card title="Form header" hint="Top right of page 1.">
            <Grid>
              <Field label="Form No." value={data.form_no} onChange={set("form_no")} />
              <Field label="Location" value={data.location} onChange={set("location")} />
            </Grid>
          </Card>

          <Card title="Admission seeking in" hint="Ticks the matching box on the form.">
            <select className="input" value={data.class_name} onChange={set("class_name")}>
              <option value="">— none ticked —</option>
              {classes.map((c) => (
                <option key={c.id} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          </Card>

          <Card title="Candidate's personal details">
            <Grid cols={3}>
              <Field label="First name" value={data.student_first} onChange={set("student_first")} />
              <Field label="Middle name" value={data.student_middle} onChange={set("student_middle")} />
              <Field label="Last name" value={data.student_last} onChange={set("student_last")} />
            </Grid>
            <Grid cols={4} className="mt-4">
              <Field label="DOB day" value={data.dob_d} onChange={set("dob_d")} placeholder="DD" />
              <Field label="Month" value={data.dob_m} onChange={set("dob_m")} placeholder="MM" />
              <Field label="Year" value={data.dob_y} onChange={set("dob_y")} placeholder="YYYY" />
              <div>
                <label className="label">Gender</label>
                <select className="input" value={data.gender} onChange={set("gender")}>
                  <option value="">—</option>
                  <option>Male</option>
                  <option>Female</option>
                </select>
              </div>
            </Grid>
            <Grid className="mt-4">
              <Field label="Nationality" value={data.nationality} onChange={set("nationality")} />
              <Field label="First language" value={data.first_language} onChange={set("first_language")} />
            </Grid>
            <div className="mt-4">
              <Field label="Other languages known" value={data.other_languages} onChange={set("other_languages")} />
            </div>
          </Card>

          <Card title="Address">
            <Field label="Address" value={data.address} onChange={set("address")} />
            <Grid className="mt-4">
              <Field label="City" value={data.city} onChange={set("city")} />
              <Field label="Country" value={data.country} onChange={set("country")} />
            </Grid>
          </Card>

          <ParentCard title="Father" prefix="father" data={data} set={set} />
          <ParentCard title="Mother" prefix="mother" data={data} set={set} />

          <Card title="Guardian" hint="If applicable.">
            <Grid cols={3}>
              <Field label="First name" value={data.guardian_first} onChange={set("guardian_first")} />
              <Field label="Middle name" value={data.guardian_middle} onChange={set("guardian_middle")} />
              <Field label="Last name" value={data.guardian_last} onChange={set("guardian_last")} />
            </Grid>
            <Grid cols={3} className="mt-4">
              <Field label="E-mail" value={data.guardian_email} onChange={set("guardian_email")} />
              <Field label="Relation with student" value={data.guardian_relation} onChange={set("guardian_relation")} />
              <Field label="Phone" value={data.guardian_phone} onChange={set("guardian_phone")} />
            </Grid>
          </Card>

          <Card title="Previous schooling" hint="If any.">
            <Grid>
              <Field label="Name of school" value={data.prev_school} onChange={set("prev_school")} />
              <Field label="Class completed" value={data.class_completed} onChange={set("class_completed")} />
            </Grid>
          </Card>

          <Card title="Medical information">
            <Field label="Any medical problem" value={data.medical_problem} onChange={set("medical_problem")} />
            <Grid className="mt-4">
              <Field label="Chronic illness / special needs" value={data.chronic} onChange={set("chronic")} />
              <Field label="Allergies" value={data.allergies} onChange={set("allergies")} />
            </Grid>
          </Card>

          <Card title="Reference details">
            <Field label="Reference through" value={data.reference_through} onChange={set("reference_through")} />
            <div className="mt-4">
              <Field label="Address with tel no." value={data.reference_address} onChange={set("reference_address")} />
            </div>
            <div className="mt-2">
              <Field label="" value={data.reference_address2} onChange={set("reference_address2")} placeholder="second line" />
            </div>
          </Card>

          <Card title="Declaration">
            <Field label="Date" type="date" value={data.declaration_date} onChange={set("declaration_date")} />
            <p className="mt-2 text-xs text-slate-500">
              The signature line always prints blank — it is signed by hand.
            </p>
          </Card>

          <Card title="For school office use only">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {CHECKLIST.map(([key, label]) => (
                <label key={key} className="flex items-center gap-2 text-sm text-slate-700">
                  <input type="checkbox" className="h-4 w-4 rounded" checked={data[key]} onChange={set(key)} />
                  {label}
                </label>
              ))}
            </div>
            <div className="mt-4">
              <Field label="Name of the student" value={data.office_student_name} onChange={set("office_student_name")} />
            </div>
            <Grid cols={3} className="mt-4">
              <Field label="Class" value={data.office_class} onChange={set("office_class")} />
              <Field label="Section" value={data.office_section} onChange={set("office_section")} />
              <Field label="Date" type="date" value={data.office_date} onChange={set("office_date")} />
            </Grid>
          </Card>
        </div>

        {/* ----------------------------------------------------- preview -- */}
        <div>
          <div className="card xl:sticky xl:top-24 overflow-hidden">
            <div className="border-b border-slate-200 px-5 py-4">
              <h2 className="text-base font-bold text-navy-900">Live preview</h2>
              <p className="text-xs text-slate-500">
                Both pages, exactly as they download. Updates a moment after you stop typing.
              </p>
            </div>
            {url ? (
              <iframe src={url} title="Student Admission Form preview" className="h-[60vh] w-full border-0 xl:h-[75vh]" />
            ) : (
              <Loading label="Building the form…" />
            )}
          </div>
        </div>
      </div>
    </>
  );
}

/* ------------------------------------------------------------- form parts */

function Card({ title, hint, children }) {
  return (
    <div className="card card-pad">
      <h2 className="text-base font-bold text-navy-900">{title}</h2>
      {hint && <p className="mb-3 text-xs text-slate-500">{hint}</p>}
      <div className={hint ? "" : "mt-4"}>{children}</div>
    </div>
  );
}

function Grid({ cols = 2, className = "", children }) {
  const map = { 2: "sm:grid-cols-2", 3: "sm:grid-cols-3", 4: "sm:grid-cols-4" };
  return <div className={`grid gap-4 ${map[cols]} ${className}`}>{children}</div>;
}

function Field({ label, value, onChange, placeholder, type = "text" }) {
  return (
    <div>
      {label && <label className="label">{label}</label>}
      <input type={type} className="input" value={value || ""} onChange={onChange} placeholder={placeholder} />
    </div>
  );
}

function ParentCard({ title, prefix, data, set }) {
  return (
    <Card title={title}>
      <Grid cols={3}>
        <Field label="First name" value={data[`${prefix}_first`]} onChange={set(`${prefix}_first`)} />
        <Field label="Middle name" value={data[`${prefix}_middle`]} onChange={set(`${prefix}_middle`)} />
        <Field label="Last name" value={data[`${prefix}_last`]} onChange={set(`${prefix}_last`)} />
      </Grid>
      <Grid className="mt-4">
        <Field label="E-mail" value={data[`${prefix}_email`]} onChange={set(`${prefix}_email`)} />
        <Field
          label="Educational qualification"
          value={data[`${prefix}_qualification`]}
          onChange={set(`${prefix}_qualification`)}
        />
      </Grid>
      <Grid cols={3} className="mt-4">
        <Field label="Profession" value={data[`${prefix}_profession`]} onChange={set(`${prefix}_profession`)} />
        <Field label="Designation" value={data[`${prefix}_designation`]} onChange={set(`${prefix}_designation`)} />
        <Field label="Phone" value={data[`${prefix}_phone`]} onChange={set(`${prefix}_phone`)} />
      </Grid>
    </Card>
  );
}
