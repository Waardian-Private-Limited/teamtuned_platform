// Copy-paste examples for the careers API (Settings → Careers & API → Integration).
// The website example builds the apply form from the job's own form schema, so a client site keeps working
// when HR adds or changes fields on a position. Plain browser JavaScript, no build step.

export interface Snippet {
  key: string;
  label: string;
  code: string;
}

export function careersSnippets(base: string, key: string): Snippet[] {
  const jobs = `${base}/public/careers/jobs`;
  return [
    {
      key: 'list',
      label: 'List jobs (curl)',
      code: `curl "${jobs}?search=&department=&location=&page=1" \\
  -H "X-Careers-Key: ${key}"`,
    },
    {
      key: 'detail',
      label: 'Job detail (curl)',
      code: `curl "${jobs}/<jobSlug>" \\
  -H "X-Careers-Key: ${key}"

# The response carries the job's application form, exactly as HR set it up for that position.
# Render your form from it: when HR adds or changes a field, your form follows.
# {
#   "slug": "site-engineer", "title": "Site Engineer", "description": "...", "skills": ["AutoCAD"],
#   "form": {
#     "fields": [
#       { "key": "first_name", "label": "First name", "type": "text",   "required": true },
#       { "key": "email",      "label": "Email",      "type": "email",  "required": true },
#       { "key": "phone",      "label": "Phone",      "type": "tel",    "required": true },
#       { "key": "experience", "label": "Total experience (years)", "type": "number", "required": false }
#     ],
#     "resume": "required",               // off | optional | required
#     "questions": [
#       { "key": "relocate", "label": "Can you relocate to Pune?", "type": "yes_no", "required": true, "options": [] }
#     ],                                  // type: text | long_text | number | yes_no | choice (uses options)
#     "resumeTypes": ["pdf", "doc", "docx"], "resumeMaxBytes": 5242880, "consentRequired": true
#   }
# }
#
# Apply: POST ${jobs}/<jobSlug>/applications  (multipart/form-data)
#   every field by its key, answers = JSON {"<question key>": value}, resume = file,
#   consent = true, website = "" (honeypot, must stay empty)
#   201 {"status":"received"} | 200 {"status":"already_applied"} | 400 {"code","message","field"}`,
    },
    {
      key: 'js',
      label: 'Website (JavaScript)',
      code: `// Put <div id="tt-apply"></div> on your job page, then:
const API = "${jobs}";
const KEY = "${key}"; // publishable: reads published jobs, submits applications
const headers = { "X-Careers-Key": KEY };

// 1. List open jobs
const list = await (await fetch(API + "?page=1", { headers })).json();
// list.items: [{ slug, title, department, location, workMode, employmentType,
//               experience: { min, max }, salary: { min, max } | null, closesOn, postedAt }]

// 2. One job. job.form is the position's application form as HR set it up:
//    fields (each with required), resume (off | optional | required) and questions.
//    The form below is built from it, so new fields and questions appear without changing this code.
const slug = "<jobSlug>";
const job = await (await fetch(API + "/" + slug, { headers })).json();
renderApplyForm(document.getElementById("tt-apply"), job);

function renderApplyForm(root, job) {
  const { fields, resume, questions } = job.form;
  const el = (tag, attrs = {}, ...kids) => {
    const node = Object.assign(document.createElement(tag), attrs);
    node.append(...kids);
    return node;
  };
  const errorSlot = (name) => {
    const slot = el("small", { className: "tt-error" });
    slot.dataset.for = name;
    return slot;
  };
  const row = (name, label, required, input) =>
    el("label", { className: "tt-field" }, label + (required ? " *" : ""), input, errorSlot(name));

  const form = el("form", { noValidate: true });

  // Standard fields: f.type is text | email | tel | number | url
  for (const f of fields) {
    form.append(row(f.key, f.label, f.required, el("input", { name: f.key, type: f.type, required: f.required, step: "any" })));
  }

  if (resume !== "off") {
    form.append(row("resume", "Resume (PDF, DOC, DOCX, max 5 MB)", resume === "required",
      el("input", { name: "resume", type: "file", accept: ".pdf,.doc,.docx", required: resume === "required" })));
  }

  // Custom questions: q.type is text | long_text | number | yes_no | choice
  for (const q of questions) {
    const name = "answers." + q.key;
    const choices = q.type === "yes_no" ? ["Yes", "No"] : q.options;
    const input = q.type === "long_text" ? el("textarea", { name, rows: 4 })
      : q.type === "yes_no" || q.type === "choice"
        ? el("select", { name }, el("option", { value: "" }, "Select…"), ...choices.map((o) => el("option", { value: o }, o)))
        : el("input", { name, type: q.type === "number" ? "number" : "text", step: "any" });
    input.required = q.required;
    form.append(row(name, q.label, q.required, input));
  }

  form.append(
    el("label", { className: "tt-consent" },
      el("input", { type: "checkbox", name: "consent", required: true }),
      " I agree that " + ((job.company && job.company.name) || "the company") + " may use my details to assess my application."),
    errorSlot("consent"),
    el("input", { type: "text", name: "website", tabIndex: -1, autocomplete: "off", hidden: true }), // honeypot
    el("button", { type: "submit" }, "Submit application"),
    el("p", { className: "tt-status", role: "status" }),
  );

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    form.querySelectorAll(".tt-error").forEach((n) => (n.textContent = ""));
    const data = new FormData();
    const answers = {};
    for (const [name, value] of new FormData(form)) {
      if (name.startsWith("answers.")) { if (value !== "") answers[name.slice(8)] = value; }
      else if (name === "consent") data.append("consent", "true");
      else if (!(value instanceof File && value.size === 0)) data.append(name, value);
    }
    data.append("answers", JSON.stringify(answers));

    // multipart: let the browser set Content-Type
    const res = await fetch(API + "/" + job.slug + "/applications", { method: "POST", headers, body: data });
    const body = await res.json();
    const status = form.querySelector(".tt-status");
    if (res.ok) {
      status.textContent = body.status === "already_applied" ? "You have already applied for this role." : "Thanks, your application is in.";
      form.reset();
    } else {
      // 400 { code, message, field }: field names the input ("phone", "resume", "answers.<key>", "consent")
      const slot = body.field && form.querySelector('.tt-error[data-for="' + body.field + '"]');
      if (slot) slot.textContent = body.message; else status.textContent = body.message;
    }
  });

  root.replaceChildren(form);
}`,
    },
  ];
}
