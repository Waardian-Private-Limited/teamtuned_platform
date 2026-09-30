import type { LetterDto } from '../api/salaryRevisions.api';

const esc = (v: unknown) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));
const inr = (n: number | null | undefined) => (n === null || n === undefined ? '—' : `₹${Math.round(n).toLocaleString('en-IN')}`);

export function printLetter(letter: LetterDto) {
  const rows = letter.structure.map((r) => `<tr><td>${esc(r.name)}</td><td class="n">${inr(r.monthly)}</td><td class="n">${inr(r.annual)}</td></tr>`).join('');
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${esc(letter.title)} - ${esc(letter.recipient.name)}</title>
<style>
@page{margin:22mm 18mm}body{font-family:Exo,system-ui,sans-serif;color:#111;font-size:12.5px;line-height:1.6;margin:0}
header{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:1.5px solid #111;padding-bottom:12px;margin-bottom:22px}
header img{max-height:48px}h1{font-size:18px;margin:0}small{color:#555}h2{font-size:15px;text-align:center;margin:18px 0}
table{width:100%;border-collapse:collapse;margin:14px 0}td,th{border:1px solid #bbb;padding:6px 8px;text-align:left}.n{text-align:right}th{background:#f2f2f2}
.sign{margin-top:48px}
</style></head><body>
<header><div><h1>${esc(letter.company.name)}</h1>${letter.company.address ? `<small>${esc(letter.company.address)}</small>` : ''}</div>${letter.company.logo_url ? `<img src="${esc(letter.company.logo_url)}" alt="">` : ''}</header>
<p>${esc(letter.date)}</p>
<p><b>${esc(letter.recipient.name)}</b>${letter.recipient.employee_code ? `<br>Employee code: ${esc(letter.recipient.employee_code)}` : ''}${letter.recipient.designation ? `<br>${esc(letter.recipient.designation)}` : ''}${letter.recipient.department ? `, ${esc(letter.recipient.department)}` : ''}</p>
<h2>${esc(letter.title)}</h2>
${letter.paragraphs.map((p) => `<p>${esc(p).replace(/\n/g, '<br>')}</p>`).join('')}
${rows ? `<table><thead><tr><th>Component</th><th class="n">Monthly</th><th class="n">Annual</th></tr></thead><tbody>${rows}<tr><th>Gross</th><th class="n">${inr(letter.totals.monthly_gross)}</th><th class="n">${inr(letter.totals.monthly_gross === null ? null : letter.totals.monthly_gross * 12)}</th></tr><tr><th>Annual CTC</th><th></th><th class="n">${inr(letter.totals.annual_ctc)}</th></tr></tbody></table>` : ''}
<div class="sign"><p>For ${esc(letter.company.name)}</p><br><p><b>${esc(letter.signatory || 'Authorised signatory')}</b></p></div>
</body></html>`;
  const frame = document.createElement('iframe');
  frame.style.position = 'fixed';
  frame.style.width = '0';
  frame.style.height = '0';
  frame.style.border = '0';
  document.body.appendChild(frame);
  const doc = frame.contentWindow?.document;
  if (!doc) return;
  doc.open();
  doc.write(html);
  doc.close();
  setTimeout(() => {
    frame.contentWindow?.focus();
    frame.contentWindow?.print();
    setTimeout(() => frame.remove(), 1000);
  }, 300);
}
