"use client";

import React from "react";
import { apiClient } from "@/lib/apiClient";

type OrgForm = {
  name: string;
  email: string;
  contact: string;
  trialEnabled: boolean;
  trialMonths: number | "";
  featureCodes: string[]; // selected features
};

type Feature = {
  id: number;
  code: string;
  name: string;
  description?: string;
  category?: string;
  pricing_model?: "per_user" | "fixed" | "hybrid";
  price_per_user?: number;
  fixed_price?: number;
  billing_cycle?: "monthly" | "yearly";
  is_active?: boolean;
};

type OrganizationListItem = {
  id: number;
  organization_name: string;
  email: string;
  contact_number: string;
  type?: string | null;
  status: string;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  created_at?: string;
};

type OrganizationDetail = {
  id: number;
  organization_name: string;
  email: string;
  contact_number: string;
  type?: string | null;
  status: string;
  address?: string | null;
  pincode?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  subscription_id?: number | null;
  database_name?: string | null;
  created_at?: string;
  updated_at?: string;
};

export default function SuperadminOrganizations() {
  const [showModal, setShowModal] = React.useState(false);
  const [form, setForm] = React.useState<OrgForm>({
    name: "",
    email: "",
    contact: "",
    trialEnabled: false,
    trialMonths: "",
    featureCodes: [],
  });

  const [features, setFeatures] = React.useState<Feature[]>([]);
  const [loadingFeatures, setLoadingFeatures] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Toast
  const [toast, setToast] = React.useState<{ type: "success" | "error"; message: string } | null>(null);
  const showToast = (type: "success" | "error", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3500);
  };

  const onChange = (field: keyof OrgForm, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const validateEmail = (email: string) => /.+@.+\..+/.test(email);
  const validateContact = (contact: string) => /^(\+?\d{7,15})$/.test(contact.replace(/\s+/g, ""));

  const isValid = () => {
    if (!form.name.trim()) return false;
    if (!validateEmail(form.email)) return false;
    if (!validateContact(form.contact)) return false;
    if (form.trialEnabled) {
      const months = Number(form.trialMonths);
      if (!months || months < 1) return false;
    }
    return true;
  };

  const openModal = async () => {
    setShowModal(true);
    setLoadingFeatures(true);
    try {
      const data = await apiClient<Feature[]>("/superadmin/features", { method: "GET" });
      setFeatures(data || []);
    } catch {
      setFeatures([]);
    } finally {
      setLoadingFeatures(false);
    }
  };

  const toggleFeature = (code: string) => {
    setForm((prev) => {
      const has = prev.featureCodes.includes(code);
      return { ...prev, featureCodes: has ? prev.featureCodes.filter((c) => c !== code) : [...prev.featureCodes, code] };
    });
  };

  const handleSubmit = async () => {
    if (!isValid() || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const payload = {
        name: form.name.trim(),
        email: form.email.trim(),
        contact: form.contact.trim(),
        featureCodes: form.featureCodes,
      };
      const res = await apiClient<{ success: boolean; onboardingLink: string; emailSent: boolean }>(
        "/superadmin/organizations/invite",
        { method: "POST", body: payload }
      );
      const link = res?.onboardingLink;
      setShowModal(false);
      setForm({ name: "", email: "", contact: "", trialEnabled: false, trialMonths: "", featureCodes: [] });
      showToast(
        "success",
        `Organization invited. ${res?.emailSent ? "Email sent." : "Share onboarding link."}`
      );
    } catch (e: any) {
      const msg = e?.message || "Invitation failed";
      setError(msg);
      showToast("error", msg);
    } finally {
      setSubmitting(false);
      // refresh list
      await fetchOrganizations();
    }
  };

  // Organizations table
  const [orgs, setOrgs] = React.useState<OrganizationListItem[]>([]);
  const [loadingOrgs, setLoadingOrgs] = React.useState(false);

  const fetchOrganizations = async () => {
    setLoadingOrgs(true);
    try {
      const data = await apiClient<OrganizationListItem[]>("/superadmin/organizations", { method: "GET" });
      setOrgs(Array.isArray(data) ? data : []);
    } catch (e) {
      showToast("error", "Failed to fetch organizations");
      setOrgs([]);
    } finally {
      setLoadingOrgs(false);
    }
  };

  React.useEffect(() => {
    fetchOrganizations();
  }, []);

  // Details / Edit modal
  const [showDetails, setShowDetails] = React.useState(false);
  const [selectedOrg, setSelectedOrg] = React.useState<OrganizationDetail | null>(null);
  const [edit, setEdit] = React.useState<Partial<OrganizationDetail>>({});
  const [savingEdit, setSavingEdit] = React.useState(false);

  const openDetails = async (orgId: number) => {
    try {
      const detail = await apiClient<OrganizationDetail>(`/superadmin/organizations/${orgId}`, { method: "GET" });
      setSelectedOrg(detail);
      setEdit({
        organization_name: detail.organization_name,
        email: detail.email,
        contact_number: detail.contact_number,
        type: detail.type || "",
        address: detail.address || "",
        pincode: detail.pincode || "",
        city: detail.city || "",
        state: detail.state || "",
        country: detail.country || "",
      });
      setShowDetails(true);
    } catch (e) {
      showToast("error", "Failed to load organization details");
    }
  };

  const saveEdit = async () => {
    if (!selectedOrg) return;
    setSavingEdit(true);
    try {
      const payload = {
        organization_name: edit.organization_name,
        email: edit.email,
        contact_number: edit.contact_number,
        type: edit.type,
        address: edit.address,
        pincode: edit.pincode,
        city: edit.city,
        state: edit.state,
        country: edit.country,
      };
      await apiClient(`/superadmin/organizations/${selectedOrg.id}`, { method: "PUT", body: payload });
      showToast("success", "Organization updated");
      setShowDetails(false);
      await fetchOrganizations();
    } catch (e: any) {
      const msg = e?.message || "Update failed";
      showToast("error", msg);
    } finally {
      setSavingEdit(false);
    }
  };

  const setInactive = async () => {
    if (!selectedOrg) return;
    try {
      await apiClient(`/superadmin/organizations/${selectedOrg.id}/status`, { method: "PATCH", body: { status: "inactive" } });
      showToast("success", "Organization set to inactive");
      setShowDetails(false);
      await fetchOrganizations();
    } catch (e: any) {
      showToast("error", e?.message || "Failed to update status");
    }
  };

  return (
    <section>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-black">Organizations Management</h1>
        <button
          className="px-4 py-2 rounded bg-black text-white hover:bg-gray-800"
          onClick={openModal}
        >
          Add Organization
        </button>
      </div>
      <p className="mt-2 text-black">Manage organizations. Add new via the button.</p>

      {error && <div className="mt-4 text-red-600">{error}</div>}

      <div className="mt-6">
        <div className="flex items-center justify-between mb-2">
          <div className="text-lg font-semibold text-black">Organizations</div>
          {loadingOrgs && <div className="text-sm text-black">Fetching…</div>}
        </div>
        <div className="overflow-x-auto rounded border">
          <table className="min-w-full text-left text-sm text-black">
            <thead className="bg-gray-100 text-black">
              <tr>
                <th className="px-3 py-2">Name</th>
                <th className="px-3 py-2">Email</th>
                <th className="px-3 py-2">Type</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {orgs.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-3 py-4 text-center text-black">No organizations</td>
                </tr>
              )}
              {orgs.map((o) => (
                <tr key={o.id} className="border-t">
                  <td className="px-3 py-2 text-black">{o.organization_name}</td>
                  <td className="px-3 py-2 text-black">{o.email}</td>
                  <td className="px-3 py-2 text-black">{o.type || "-"}</td>
                  <td className="px-3 py-2 text-black">{o.status}</td>
                  <td className="px-3 py-2">
                    <button className="text-blue-600 hover:underline mr-3" onClick={() => openDetails(o.id)}>👁️ View</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowModal(false)} />
          <div className="relative mx-auto mt-24 w-[95%] max-w-xl rounded bg-white shadow-lg">
            <div className="flex items-center justify-between border-b p-4">
              <h2 className="text-lg font-semibold text-black">Add Organization</h2>
              <button className="text-black hover:opacity-80" onClick={() => setShowModal(false)}>✕</button>
            </div>

            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-black">Organization Name</label>
                <input
                  type="text"
                  className="mt-1 w-full rounded border px-3 py-2 text-black placeholder-gray-400"
                  value={form.name}
                  onChange={(e) => onChange("name", e.target.value)}
                  placeholder="e.g., Acme Corp"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-black">Email</label>
                <input
                  type="email"
                  className="mt-1 w-full rounded border px-3 py-2 text-black placeholder-gray-400"
                  value={form.email}
                  onChange={(e) => onChange("email", e.target.value)}
                  placeholder="org@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-black">Contact Number</label>
                <input
                  type="tel"
                  className="mt-1 w-full rounded border px-3 py-2 text-black placeholder-gray-400"
                  value={form.contact}
                  onChange={(e) => onChange("contact", e.target.value)}
                  placeholder="+1234567890"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  id="trialEnabled"
                  type="checkbox"
                  checked={form.trialEnabled}
                  onChange={(e) => onChange("trialEnabled", e.target.checked)}
                />
                <label htmlFor="trialEnabled" className="text-sm font-medium text-black">Trial Period</label>
              </div>

              {form.trialEnabled && (
                <div>
                  <label className="block text-sm font-medium text-black">Trial Period (Months)</label>
                  <input
                    type="number"
                    min={1}
                    className="mt-1 w-full rounded border px-3 py-2 text-black placeholder-gray-400"
                    value={form.trialMonths}
                    onChange={(e) =>
                      onChange("trialMonths", e.target.value === "" ? "" : Number(e.target.value))
                    }
                    placeholder="e.g., 3"
                  />
                </div>
              )}

              {/* Features Checkbox List */}
              <div>
                <label className="block text-sm font-medium text-black">Features</label>
                {loadingFeatures ? (
                  <div className="mt-2 text-black">Loading features...</div>
                ) : (
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    {features.map((f) => (
                      <label key={f.code} className="flex items-center gap-2 text-black">
                        <input
                          type="checkbox"
                          checked={form.featureCodes.includes(f.code)}
                          onChange={() => toggleFeature(f.code)}
                        />
                        <span className="text-sm">{f.name} ({f.code})</span>
                      </label>
                    ))}
                    {features.length === 0 && (
                      <div className="text-black">No features available.</div>
                    )}
                  </div>
                )}
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button className="px-4 py-2 rounded border text-black" onClick={() => setShowModal(false)}>Cancel</button>
                <button
                  className={`px-4 py-2 rounded text-white ${
                    isValid() && !submitting ? "bg-black hover:bg-gray-800" : "bg-gray-400 cursor-not-allowed"
                  }`}
                  onClick={handleSubmit}
                  disabled={!isValid() || submitting}
                >
                  {submitting ? "Adding..." : "Add"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showDetails && selectedOrg && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowDetails(false)} />
          <div className="relative mx-auto mt-20 w-[95%] max-w-2xl rounded bg-white shadow-lg">
            <div className="flex items-center justify-between border-b p-4">
              <h2 className="text-lg font-semibold text-black">Organization Details</h2>
              <button className="text-black hover:opacity-80" onClick={() => setShowDetails(false)}>✕</button>
            </div>

            <div className="p-4 grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-black">Name</label>
                <input className="mt-1 w-full rounded border px-3 py-2 text-black" value={edit.organization_name as string} onChange={(e) => setEdit((p) => ({ ...p, organization_name: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-medium text-black">Email</label>
                <input className="mt-1 w-full rounded border px-3 py-2 text-black" value={edit.email as string} onChange={(e) => setEdit((p) => ({ ...p, email: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-medium text-black">Contact</label>
                <input className="mt-1 w-full rounded border px-3 py-2 text-black" value={edit.contact_number as string} onChange={(e) => setEdit((p) => ({ ...p, contact_number: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-medium text-black">Type</label>
                <select className="mt-1 w-full rounded border px-3 py-2 text-black" value={(edit.type as string) || ""} onChange={(e) => setEdit((p) => ({ ...p, type: e.target.value }))}>
                  <option value="">Select type</option>
                  <option value="Individual">Individual</option>
                  <option value="Private Limited">Private Limited</option>
                  <option value="Public Limited">Public Limited</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-black">Address</label>
                <input className="mt-1 w-full rounded border px-3 py-2 text-black" value={edit.address as string} onChange={(e) => setEdit((p) => ({ ...p, address: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-medium text-black">Pincode</label>
                <input className="mt-1 w-full rounded border px-3 py-2 text-black" value={edit.pincode as string} onChange={(e) => setEdit((p) => ({ ...p, pincode: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-medium text-black">City</label>
                <input className="mt-1 w-full rounded border px-3 py-2 text-black" value={edit.city as string} onChange={(e) => setEdit((p) => ({ ...p, city: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-medium text-black">State</label>
                <input className="mt-1 w-full rounded border px-3 py-2 text-black" value={edit.state as string} onChange={(e) => setEdit((p) => ({ ...p, state: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-medium text-black">Country</label>
                <input className="mt-1 w-full rounded border px-3 py-2 text-black" value={edit.country as string} onChange={(e) => setEdit((p) => ({ ...p, country: e.target.value }))} />
              </div>
            </div>

            <div className="px-4 pb-4 flex items-center justify-end gap-2">
              <button className="px-4 py-2 rounded border text-black" onClick={() => setShowDetails(false)}>Close</button>
              <button className="px-4 py-2 rounded bg-gray-200 text-black hover:bg-gray-300" onClick={setInactive}>Make Inactive</button>
              <button className={`px-4 py-2 rounded text-white ${savingEdit ? 'bg-gray-400' : 'bg-black hover:bg-gray-800'}`} onClick={saveEdit} disabled={savingEdit}>
                {savingEdit ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 rounded-md px-4 py-2 shadow-lg ${toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
          {toast.message}
        </div>
      )}
    </section>
  );
}