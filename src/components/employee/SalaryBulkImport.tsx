"use client";

import React, { useState, useEffect } from "react";
import { apiClient } from "@/lib/apiClient";
import { useAuth } from "@/context/AuthContext";
import { Upload, Download, X, CheckCircle, AlertCircle, FileText, AlertTriangle } from "lucide-react";

export default function SalaryBulkImport() {
    const { role, permissions } = useAuth();
    const isOrgAdmin = (role || "").toLowerCase() === "orgadmin";
    const hasPerm = (code: string) => (permissions || []).some((p) => (p || "").toUpperCase() === code.toUpperCase());
    const canManage = isOrgAdmin || hasPerm("EMP_ADD");

    const [sites, setSites] = useState<any[]>([]);
    const [selectedSiteId, setSelectedSiteId] = useState<number | string | null>(null);
    const [file, setFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [downloadLoading, setDownloadLoading] = useState(false);
    const [results, setResults] = useState<any>(null);

    useEffect(() => {
        fetchSites();
    }, []);

    const fetchSites = async () => {
        try {
            const data = await apiClient<{ sites?: any[] }>("/sites", { method: "GET", withAuth: true });
            const siteList = data?.sites || [];
            setSites(siteList);

            // Auto-select "All Sites"
            if (!selectedSiteId) {
                setSelectedSiteId("all");
            }
        } catch (error: any) {
            console.error("Failed to fetch sites:", error);
        }
    };

    const downloadTemplate = async () => {
        if (!selectedSiteId) {
            alert("Please select a site first");
            return;
        }

        setDownloadLoading(true);
        try {
            const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3002/api/v1";
            const response = await fetch(
                `${baseUrl}/organization/employees/salary-import/template?site_id=${selectedSiteId}`,
                {
                    method: "GET",
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem("token")}`,
                    },
                }
            );

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || "Failed to download template");
            }

            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            const filename = selectedSiteId === "all"
                ? `Salary_Mapping_All_Sites_${Date.now()}.xlsx`
                : `Salary_Mapping_Site_${selectedSiteId}_${Date.now()}.xlsx`;
            a.download = filename;
            a.click();
            URL.revokeObjectURL(url);
        } catch (error: any) {
            alert(error?.message || "Failed to download template");
        } finally {
            setDownloadLoading(false);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            setFile(selectedFile);
            parseExcel(selectedFile);
        }
    };

    const parseExcel = async (file: File) => {
        try {
            const XLSX = await import("xlsx");
            const reader = new FileReader();
            reader.onload = (e) => {
                const data = e.target?.result;
                const workbook = XLSX.read(data, { type: "binary" });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const jsonData = XLSX.utils.sheet_to_json(worksheet, { raw: false });

                // Skip instructions row (row 2)
                const mappings = jsonData.slice(1);
                setPreview(mappings.slice(0, 10)); // Show first 10 for preview
            };
            reader.readAsBinaryString(file);
        } catch (error) {
            console.error("Failed to parse Excel:", error);
            alert("Failed to parse Excel file");
        }
    };

    const handleSubmit = async () => {
        if (!file) {
            alert("Please upload an Excel file first");
            return;
        }

        setLoading(true);
        setResults(null);
        try {
            const formData = new FormData();
            formData.append("file", file);

            const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3002/api/v1";
            const response = await fetch(
                `${baseUrl}/organization/employees/salary-import`,
                {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem("token")}`,
                    },
                    body: formData,
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || "Failed to import salary mappings");
            }

            setResults(data);
            setFile(null);
            setPreview([]);
        } catch (error: any) {
            alert(error?.message || "Failed to process salary import");
        } finally {
            setLoading(false);
        }
    };

    if (!canManage) {
        return (
            <div className="p-6">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="text-red-800">You don't have permission to access this feature.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Salary Mapping Bulk Import</h1>
                    <p className="text-sm text-gray-600 mt-1">
                        Download pre-populated template, update salary components and debit rules, then upload
                    </p>
                </div>
            </div>

            {/* Site Selector */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Select Site</h2>
                <div className="flex items-center gap-4">
                    <select
                        value={selectedSiteId || ""}
                        onChange={(e) => {
                            const value = e.target.value;
                            setSelectedSiteId(value === "all" ? "all" : Number(value));
                        }}
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    >
                        <option value="">Select a site...</option>
                        <option value="all">All Sites</option>
                        {sites.map((site) => (
                            <option key={site.id} value={site.id}>
                                {site.name} {site.city ? `(${site.city})` : ""}
                            </option>
                        ))}
                    </select>
                    <button
                        onClick={downloadTemplate}
                        disabled={!selectedSiteId || downloadLoading}
                        className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Download size={20} />
                        {downloadLoading ? "Generating..." : "Download Template"}
                    </button>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                    {selectedSiteId === "all"
                        ? "Template will include all active employees from all sites"
                        : "Template will include all active employees for the selected site (primary site only)"}
                </p>
            </div>

            {/* Upload Section */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Upload Salary Mappings</h2>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                    <input
                        type="file"
                        accept=".xlsx,.xls"
                        onChange={handleFileChange}
                        className="hidden"
                        id="excel-upload"
                    />
                    <label htmlFor="excel-upload" className="cursor-pointer">
                        <Upload className="mx-auto mb-4 text-gray-400" size={48} />
                        <p className="text-gray-600 mb-2">
                            {file ? file.name : "Click to upload or drag and drop"}
                        </p>
                        <p className="text-sm text-gray-500">Excel file only (max 5MB)</p>
                    </label>
                </div>
            </div>

            {/* Preview Section */}
            {preview.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                        <h2 className="text-lg font-semibold text-gray-900">
                            Preview (showing first 10 of {preview.length} records)
                        </h2>
                        <button
                            onClick={handleSubmit}
                            disabled={loading}
                            className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                        >
                            {loading ? "Processing..." : "Upload & Update"}
                        </button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee ID</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Designation</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Gross Salary</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {preview.map((row: any, index: number) => (
                                    <tr key={index} className="hover:bg-gray-50">
                                        <td className="px-4 py-3 text-sm text-gray-900">{row["Employee ID*"]}</td>
                                        <td className="px-4 py-3 text-sm text-gray-900">{row["Name"]}</td>
                                        <td className="px-4 py-3 text-sm text-gray-900">{row["Designation"]}</td>
                                        <td className="px-4 py-3 text-sm text-gray-900">₹{Number(row["Gross Salary*"] || 0).toLocaleString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Results Section */}
            {results && (
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Import Results</h2>
                    <div className="grid grid-cols-2 gap-4 mb-6">
                        <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                            <div className="flex items-center gap-2 mb-2">
                                <CheckCircle className="text-green-600" size={20} />
                                <span className="font-semibold text-green-900">Updated</span>
                            </div>
                            <p className="text-2xl font-bold text-green-600">{results.updated || 0}</p>
                        </div>
                        <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                            <div className="flex items-center gap-2 mb-2">
                                <AlertCircle className="text-red-600" size={20} />
                                <span className="font-semibold text-red-900">Failed</span>
                            </div>
                            <p className="text-2xl font-bold text-red-600">{results.failed || 0}</p>
                        </div>
                    </div>

                    {/* Warnings */}
                    {results.warnings && results.warnings.length > 0 && (
                        <div className="mb-6">
                            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                <AlertTriangle className="text-yellow-600" size={20} />
                                Warnings ({results.warnings.length}):
                            </h3>
                            <div className="space-y-2">
                                {results.warnings.map((warn: any, index: number) => (
                                    <div key={index} className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                                        <p className="text-sm text-yellow-900">
                                            <strong>Row {warn.row} - {warn.employee}:</strong> {warn.message}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Errors */}
                    {results.errors && results.errors.length > 0 && (
                        <div>
                            <h3 className="font-semibold text-gray-900 mb-3">Failed Updates:</h3>
                            <div className="space-y-2">
                                {results.errors.map((error: any, index: number) => (
                                    <div key={index} className="p-3 bg-red-50 rounded-lg border border-red-200">
                                        <p className="text-sm text-red-900">
                                            <strong>Row {error.row} - {error.field}:</strong> {error.message}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
