"use client";

import React from "react";
import { apiClient } from "@/lib/apiClient";
import { useRouter } from "next/navigation";

type Prefill = {
  organization?: {
    id: number;
    name: string;
    email: string;
    contact: string;
    status: string;
    address?: string;
    pincode?: string;
    city?: string;
    state?: string;
    country?: string;
    type?: string;
  };
  features?: { id: number; code: string; name: string; description?: string }[];
};

export default function OrganizationOnboardingPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = React.use(params);
  const router = useRouter();
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [prefill, setPrefill] = React.useState<Prefill | null>(null);
  const [saving, setSaving] = React.useState(false);

  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [contact, setContact] = React.useState("");
  const [address, setAddress] = React.useState("");
  const [city, setCity] = React.useState("");
  const [state, setState] = React.useState("");
  const [country, setCountry] = React.useState("");
  const [pincode, setPincode] = React.useState("");
  const [pinLoading, setPinLoading] = React.useState(false);
  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  // logo upload state
  const [logoFile, setLogoFile] = React.useState<File | null>(null);
  const [logoPreview, setLogoPreview] = React.useState<string | null>(null);
  const [logoUploading, setLogoUploading] = React.useState(false);
  const [logoUrl, setLogoUrl] = React.useState<string | null>(null);

  // success dialog
  const [showSuccess, setShowSuccess] = React.useState(false);

  // lightweight toast
  const [toast, setToast] = React.useState<{ type: "success" | "error"; message: string } | null>(null);
  const showToast = (type: "success" | "error", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3500);
  };

  React.useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await apiClient<Prefill>(`/onboarding/organization/validate/${encodeURIComponent(token)}`, { method: "GET" });
        setPrefill(data);
        setName(data?.organization?.name || "");
        setEmail(data?.organization?.email || "");
        setContact(data?.organization?.contact || "");
        setAddress(data?.organization?.address || "");
        setCity(data?.organization?.city || "");
        setState(data?.organization?.state || "");
        setCountry(data?.organization?.country || "");
        setPincode(data?.organization?.pincode || "");
        setLogoUrl((data?.organization as any)?.logo_url || null);
        if ((data?.organization as any)?.logo_url) setLogoPreview((data.organization as any).logo_url);
      } catch (e: any) {
        setError(e?.message || "Failed to validate token");
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  const fetchPincode = async (pin: string) => {
    if (!pin || pin.length !== 6) return;
    try {
      setPinLoading(true);
      const res = await fetch(`https://api.postalpincode.in/pincode/${pin}`);
      const json = await res.json();
      const first = Array.isArray(json) ? json[0] : null;
      const po = first?.PostOffice && first.PostOffice[0];
      if (po) {
        setCity(po.District || "");
        setState(po.State || "");
        if (!country) setCountry("India");
      }
    } catch (_) {}
    finally {
      setPinLoading(false);
    }
  };

  const onLogoChange = (file: File | null) => {
    if (!file) return;
    if (!['image/png', 'image/jpeg'].includes(file.type)) {
      showToast('error', 'Only PNG or JPEG files are allowed');
      return;
    }
    setLogoFile(file);
    const url = URL.createObjectURL(file);
    setLogoPreview(url);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) onLogoChange(file);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const removeLogo = () => {
    setLogoFile(null);
    setLogoPreview(null);
    setLogoUrl(null);
  };

  const uploadLogoIfNeeded = async (): Promise<string | null> => {
    if (!logoFile) return logoUrl || null;
    setLogoUploading(true);
    try {
      const fd = new FormData();
      fd.append('files', logoFile);
      const res = await apiClient<{ success: boolean; files: { url: string }[] }>(`/files/upload/logo`, {
        method: 'POST',
        body: fd,
        params: { token },
      });
      const url = res?.files?.[0]?.url || null;
      setLogoUrl(url);
      return url;
    } catch (e: any) {
      showToast('error', e?.message || 'Logo upload failed');
      return null;
    } finally {
      setLogoUploading(false);
    }
  };

  const [orgType, setOrgType] = React.useState<string>("");
  React.useEffect(() => {
    if (prefill?.organization?.type) setOrgType(prefill.organization.type);
  }, [prefill?.organization?.type]);

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      // basic password validation
      if (!password || password.length < 6) {
        showToast('error', 'Password must be at least 6 characters');
        setSaving(false);
        return;
      }
      if (password !== confirmPassword) {
        showToast('error', 'Passwords do not match');
        setSaving(false);
        return;
      }

      const uploadedLogoUrl = await uploadLogoIfNeeded();
      const payload = {
        token,
        name,
        email,
        contact,
        address,
        city,
        state,
        pincode,
        country,
        type: orgType,
        logoUrl: uploadedLogoUrl,
        password,
        confirmPassword,
      };
      await apiClient(`/onboarding/organization/complete`, { method: "POST", body: payload });
      setShowSuccess(true);
    } catch (e: any) {
      const msg = e?.message || "Failed to complete onboarding";
      setError(msg);
      showToast("error", msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-black">
      {/* Brand header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
       <div className="flex items-center gap-3">
          <img
            src={"/assets/teamTunedLogos.png"}
            alt="Organization Logo"
            className="w-12 h-12 rounded-full object-cover"
          />
          <div className="flex flex-col">
            <div className="text-lg font-semibold">TeamTuned</div>
            <div className="text-xs text-gray-400 italic">Crafted by Waardian</div>
          </div>
        </div>

        <div className="text-sm text-gray-600">Organization Onboarding</div>
      </div>

      <div className="mx-auto max-w-2xl py-10 px-4">
        <h1 className="text-2xl font-semibold">Welcome</h1>
        <p className="mt-2 text-gray-700">Fill in your details and confirm to activate your account.</p>

        {loading && <div className="mt-6">Validating invite...</div>}
        {error && !loading && <div className="mt-6 text-red-600">{error}</div>}

        {!loading && !error && (
          <div className="mt-6 space-y-4">
            {/* Organization Name */}
            <div>
              <label className="block text-sm text-gray-700">Organization Name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-black shadow-sm"
              />
            </div>

            {/* Email & Contact */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-700">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-black shadow-sm"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-700">Contact Number</label>
                <input
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                  className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-black shadow-sm"
                />
              </div>
            </div>

            {/* Password & Confirm Password */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-700">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-black shadow-sm"
                  placeholder="At least 6 characters"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-700">Confirm Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-black shadow-sm"
                />
              </div>
            </div>

            {/* ✅ Logo Upload Section (moved here) */}
            <div>
              <label className="block text-sm text-gray-700">Organization Logo (PNG/JPEG)</label>
              <div
                className="mt-1 flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg p-6 cursor-pointer hover:border-black"
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onClick={() => document.getElementById('logoInput')?.click()}
              >
                <input
                  id="logoInput"
                  type="file"
                  accept="image/png,image/jpeg"
                  onChange={(e) => onLogoChange(e.target.files?.[0] || null)}
                  className="hidden"
                />
                {logoPreview ? (
                  <>
                    <img src={logoPreview} alt="Logo Preview" className="w-32 h-32 object-cover rounded-lg border" />
                    <button
                      type="button"
                      onClick={removeLogo}
                      className="mt-2 px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600"
                    >
                      Remove
                    </button>
                  </>
                ) : (
                  <p className="text-gray-500 text-center">Drag & Drop or Click to select logo</p>
                )}
                {logoUploading && <span className="mt-2 text-xs text-gray-500">Uploading…</span>}
              </div>
            </div>

            {/* Address */}
            <div>
              <label className="block text-sm text-gray-700">Address</label>
              <input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-black shadow-sm"
              />
            </div>

            {/* Pincode, City, State, Country */}
            <div className="grid grid-cols-4 gap-4">
              <div>
                <label className="block text-sm text-gray-700">Pincode</label>
                <input
                  value={pincode}
                  onChange={(e) => { const v = e.target.value; setPincode(v); if (v.length === 6) fetchPincode(v); }}
                  className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-black shadow-sm"
                />
                {pinLoading && <div className="mt-1 text-xs text-gray-500">Fetching location…</div>}
              </div>
              <div>
                <label className="block text-sm text-gray-700">City</label>
                <input
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-black shadow-sm"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-700">State</label>
                <input
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-black shadow-sm"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-700">Country</label>
                <input
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-black shadow-sm"
                />
              </div>
            </div>

            {/* Organization Type */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-700">Organization Type</label>
                <select
                  value={orgType}
                  onChange={(e) => setOrgType(e.target.value)}
                  className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-black shadow-sm"
                >
                  <option value="">Select type</option>
                  <option value="Individual">Individual</option>
                  <option value="Private Limited">Private Limited</option>
                  <option value="Public Limited">Public Limited</option>
                </select>
              </div>
            </div>

            {/* Features */}
            {prefill?.features && prefill.features.length > 0 && (
              <div className="mt-4">
                <h2 className="text-lg font-semibold">Included Features</h2>
                <ul className="mt-2 list-disc pl-6 text-gray-700">
                  {prefill.features.map((f) => (
                    <li key={f.id}>
                      {f.name} <span className="text-gray-500">({f.code})</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Buttons */}
            <div className="pt-4 flex items-center justify-end gap-2">
              <button
                className="px-4 py-2 rounded-md border border-gray-300 text-black hover:bg-gray-50"
                onClick={() => window.history.back()}
              >
                Cancel
              </button>
              <button
                className={`px-4 py-2 rounded-md ${saving ? 'bg-gray-300' : 'bg-black text-white hover:bg-gray-800'}`}
                onClick={save}
                disabled={saving || logoUploading}
              >
                {saving ? 'Saving…' : 'Complete Onboarding'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Success Dialog */}
      {showSuccess && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg w-[90%] max-w-sm p-6">
            <div className="text-lg font-semibold">Onboarding completed</div>
            <p className="mt-2 text-gray-700">Please login to continue.</p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                className="px-4 py-2 rounded-md border border-gray-300 text-black"
                onClick={() => setShowSuccess(false)}
              >
                Close
              </button>
              <button
                className="px-4 py-2 rounded-md bg-black text-white"
                onClick={() => router.push('/login')}
              >
                Go to Login
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-4 right-4 rounded-md px-4 py-2 shadow-lg ${
            toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
          }`}
        >
          {toast.message}
        </div>
      )}
    </div>
  );
}
