/**
 * Profile values the old system left on a migrated labourer (keys `legacy_*`): shown as plain facts and links
 * instead of raw keys, JSON and long URLs.
 */
export interface LegacyLink { label: string; url: string }
export interface LegacyProfile {
  rest: Record<string, string>;
  facts: { label: string; value: string }[];
  links: LegacyLink[];
}

const FACTS: Record<string, string> = {
  legacy_id_proof_type: 'ID proof type (old system)',
  legacy_id_proof_number: 'ID proof number (old system)',
  legacy_email: 'Email (old system)',
};
const isUrl = (v: string) => /^https?:\/\//i.test(v);

export function splitLegacyProfile(profile: Record<string, unknown> | null | undefined): LegacyProfile {
  const out: LegacyProfile = { rest: {}, facts: [], links: [] };
  for (const [k, raw] of Object.entries(profile || {})) {
    const v = raw === null || raw === undefined ? '' : String(raw).trim();
    if (!v) continue;
    if (!k.startsWith('legacy_')) { out.rest[k] = v; continue; }
    if (FACTS[k]) out.facts.push({ label: FACTS[k], value: v });
    else if (k === 'legacy_is_twin') out.facts.push({ label: 'Twin (old system)', value: v === '1' || v === 'true' ? 'Yes' : 'No' });
    else if (k === 'legacy_face_image_url' && isUrl(v)) out.links.push({ label: 'Face photo', url: v });
    else if (k === 'legacy_id_proof_url' && isUrl(v)) out.links.push({ label: 'ID proof', url: v });
    else if (k === 'legacy_documents') {
      try {
        const list = JSON.parse(v) as { type?: string; name?: string; url?: string }[];
        for (const d of Array.isArray(list) ? list : []) {
          if (d?.url && isUrl(d.url)) out.links.push({ label: [d.type ? d.type.replace(/_/g, ' ').toLowerCase() : 'Document', d.name].filter(Boolean).join(' · '), url: d.url });
        }
      } catch { /* an unreadable list is not shown */ }
    }
  }
  // The same file can sit in both the single ID proof url and the documents list.
  const seen = new Set<string>();
  out.links = out.links.filter((l) => !seen.has(l.url) && seen.add(l.url));
  return out;
}
