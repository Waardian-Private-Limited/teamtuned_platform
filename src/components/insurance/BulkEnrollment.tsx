"use client";

import React, { useState, useEffect } from "react";
import { apiClient } from "@/lib/apiClient";
import { showSuccess, showError } from "@/lib/toast";
import { Upload, Download, X, CheckCircle, AlertCircle, FileText } from "lucide-react";

export default function BulkEnrollment() {
    const [policies, setPolicies] = useState<any[]>([]);
    const [file, setFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [results, setResults] = useState<any>(null);

    useEffect(() => {
        fetchPolicies();
    }, []);

    const fetchPolicies = async () => {
        try {
            const data = await apiClient<any[]>("/insurance/policies", { method: "GET", withAuth: true });
            setPolicies(data || []);
        } catch (error: any) {
            showError(error?.message || "Failed to fetch policies");
        }
    };

    const downloadTemplate = () => {
        const headers = ["employee_id", "policy_id", "start_date", "end_date", "premium_employee", "premium_company", "sum_insured"];
        const sampleRow = ["123", "1", "2025-01-01", "2025-12-31", "1000", "2000", "500000"];
        const csv = headers.join(",") + "\n" + sampleRow.join(",") + "\n";
        const blob = new Blob([csv], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "bulk_enrollment_template.csv";
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            setFile(selectedFile);
            parseCSV(selectedFile);
        }
    };

    const parseCSV = (file: File) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const text = e.target?.result as string;
            const lines = text.split("\n").filter((line) => line.trim());
            const headers = lines[0].split(",");

            const data = lines.slice(1).map((line, index) => {
                const values = line.split(",");
                const row: any = { row: index + 2 };
                headers.forEach((header, i) => {
                    row[header.trim()] = values[i]?.trim() || "";
                });
                return row;
            });

            setPreview(data);
        };
        reader.readAsText(file);
    };

    const handleSubmit = async () => {
        if (preview.length === 0) {
            showError("Please upload a CSV file first");
            return;
        }

        setLoading(true);
        try {
            const enrollments = preview.map((row) => ({
                employee_id: Number(row.employee_id),
                policy_id: Number(row.policy_id),
                start_date: row.start_date,
                end_date: row.end_date,
                premium_employee: Number(row.premium_employee) || 0,
                premium_company: Number(row.premium_company) || 0,
                sum_insured: Number(row.sum_insured) || 0,
            }));

            const response = await apiClient<any>("/insurance/enrollments/bulk", {
                method: "POST",
                body: { enrollments },
                withAuth: true,
            });

            setResults(response.results);
            showSuccess(response.message);
            setFile(null);
            setPreview([]);
        } catch (error: any) {
            showError(error?.message || "Failed to process bulk enrollment");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-gray-900">Bulk Enrollment</h1>
                <button
                    onClick={downloadTemplate}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                    <Download size={20} />
                    Download Template
                </button>
            </div>

            {/* Upload Section */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Upload CSV File</h2>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                    <input
                        type="file"
                        accept=".csv"
                        onChange={handleFileChange}
                        className="hidden"
                        id="csv-upload"
                    />
                    <label htmlFor="csv-upload" className="cursor-pointer">
                        <Upload className="mx-auto mb-4 text-gray-400" size={48} />
                        <p className="text-gray-600 mb-2">
                            {file ? file.name : "Click to upload or drag and drop"}
                        </p>
                        <p className="text-sm text-gray-500">CSV file only (max 5MB)</p>
                    </label>
                </div>
            </div>

            {/* Preview Section */}
            {preview.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                        <h2 className="text-lg font-semibold text-gray-900">
                            Preview ({preview.length} records)
                        </h2>
                        <button
                            onClick={handleSubmit}
                            disabled={loading}
                            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
                        >
                            {loading ? "Processing..." : "Confirm Enrollment"}
                        </button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Row</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee ID</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Policy ID</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Start Date</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">End Date</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sum Insured</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {preview.map((row, index) => (
                                    <tr key={index} className="hover:bg-gray-50">
                                        <td className="px-4 py-3 text-sm text-gray-900">{row.row}</td>
                                        <td className="px-4 py-3 text-sm text-gray-900">{row.employee_id}</td>
                                        <td className="px-4 py-3 text-sm text-gray-900">{row.policy_id}</td>
                                        <td className="px-4 py-3 text-sm text-gray-900">{row.start_date}</td>
                                        <td className="px-4 py-3 text-sm text-gray-900">{row.end_date}</td>
                                        <td className="px-4 py-3 text-sm text-gray-900">₹{Number(row.sum_insured).toLocaleString()}</td>
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
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Enrollment Results</h2>
                    <div className="grid grid-cols-2 gap-4 mb-6">
                        <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                            <div className="flex items-center gap-2 mb-2">
                                <CheckCircle className="text-green-600" size={20} />
                                <span className="font-semibold text-green-900">Successful</span>
                            </div>
                            <p className="text-2xl font-bold text-green-600">{results.success?.length || 0}</p>
                        </div>
                        <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                            <div className="flex items-center gap-2 mb-2">
                                <AlertCircle className="text-red-600" size={20} />
                                <span className="font-semibold text-red-900">Failed</span>
                            </div>
                            <p className="text-2xl font-bold text-red-600">{results.failed?.length || 0}</p>
                        </div>
                    </div>

                    {results.failed && results.failed.length > 0 && (
                        <div>
                            <h3 className="font-semibold text-gray-900 mb-3">Failed Enrollments:</h3>
                            <div className="space-y-2">
                                {results.failed.map((fail: any, index: number) => (
                                    <div key={index} className="p-3 bg-red-50 rounded-lg border border-red-200">
                                        <p className="text-sm text-red-900">
                                            <strong>Employee ID {fail.employee_id}:</strong> {fail.error}
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
