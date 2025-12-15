"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/apiClient";
import { Upload, Download, CheckCircle, XCircle, AlertCircle, ArrowLeft, Filter, ChevronDown, ChevronUp } from "lucide-react";

export default function EmployeeImportPage() {
    const router = useRouter();
    const [file, setFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [result, setResult] = useState<any>(null);

    // API Base URL
    const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3002/api/v1';

    // Modern notification system
    const createNotificationContainer = () => {
        let container = document.getElementById('notification-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'notification-container';
            container.style.position = 'fixed';
            container.style.top = '20px';
            container.style.right = '20px';
            container.style.zIndex = '9999';
            document.body.appendChild(container);
        }
        return container;
    };

    const showNotification = (message: string, type: 'success' | 'error') => {
        const container = createNotificationContainer();
        const notification = document.createElement('div');
        notification.className = `p-4 mb-3 rounded-lg shadow-lg flex items-center space-x-3 ${type === 'success' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
            }`;

        const icon = document.createElement('div');
        icon.className = `p-2 rounded-full ${type === 'success' ? 'bg-green-100' : 'bg-red-100'}`;
        icon.innerHTML = type === 'success'
            ? '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-green-600"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>'
            : '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-red-600"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>';

        const content = document.createElement('div');
        content.className = 'flex-1';
        content.innerHTML = `<p class="${type === 'success' ? 'text-green-800' : 'text-red-800'} font-medium">${message}</p>`;

        notification.appendChild(icon);
        notification.appendChild(content);
        container.appendChild(notification);

        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transition = 'opacity 0.5s ease';
            setTimeout(() => {
                if (container.contains(notification)) {
                    container.removeChild(notification);
                }
            }, 500);
        }, 5000);
    };

    const downloadTemplate = async () => {
        try {
            const response = await fetch(`${BASE_URL}/organization/employees/import/template`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'ngrok-skip-browser-warning': 'true',
                },
            });

            if (!response.ok) {
                showNotification('Failed to download template', 'error');
                return;
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'Employee_Import_Template.xlsx';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            showNotification('Template downloaded successfully', 'success');
        } catch (error) {
            console.error('Download error:', error);
            showNotification('Failed to download template', 'error');
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
            setResult(null);
        }
    };

    const handleUpload = async () => {
        if (!file) return;

        setUploading(true);
        setResult(null);

        try {
            const formData = new FormData();
            formData.append('file', file);

            const response = await fetch(`${BASE_URL}/organization/employees/import`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'ngrok-skip-browser-warning': 'true',
                },
                body: formData,
            });

            const data = await response.json();
            setResult(data);

            if (data.imported > 0) {
                showNotification(`Successfully imported ${data.imported} employee(s)`, 'success');
            }
            if (data.failed > 0) {
                showNotification(`${data.failed} employee(s) failed to import`, 'error');
            }

        } catch (error) {
            console.error('Upload error:', error);
            showNotification('Failed to upload file', 'error');
            setResult({
                success: false,
                imported: 0,
                failed: 0,
                errors: [{ row: 0, field: 'general', message: 'Failed to upload file' }]
            });
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-6xl mx-auto">
                {/* Header - Matching EmployeeManagement style */}
                <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">Bulk Employee Import</h1>
                            <p className="text-gray-600 mt-1">Import multiple employees at once using an Excel file</p>
                        </div>
                        <button
                            onClick={() => router.back()}
                            className="px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors flex items-center gap-2"
                        >
                            <ArrowLeft size={18} />
                            Back
                        </button>
                    </div>
                </div>

                {/* Download Template Card */}
                <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
                    <div className="flex items-start gap-4">
                        <div className="p-3 bg-blue-50 rounded-lg">
                            <Download className="w-6 h-6 text-blue-600" />
                        </div>
                        <div className="flex-1">
                            <h2 className="text-lg font-semibold text-gray-900 mb-2">Step 1: Download Template</h2>
                            <p className="text-gray-600 mb-4">
                                Download the Excel template with all required fields. Fill in employee details including salary components (credits and debits).
                            </p>
                            <button
                                onClick={downloadTemplate}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                            >
                                <Download size={18} />
                                Download Template
                            </button>
                        </div>
                    </div>
                </div>

                {/* Upload Card */}
                <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
                    <div className="flex items-start gap-4">
                        <div className="p-3 bg-green-50 rounded-lg">
                            <Upload className="w-6 h-6 text-green-600" />
                        </div>
                        <div className="flex-1">
                            <h2 className="text-lg font-semibold text-gray-900 mb-2">Step 2: Upload Filled Template</h2>
                            <p className="text-gray-600 mb-4">
                                Select the completed Excel file to import employees. Maximum 500 employees per import.
                            </p>

                            {/* File Input */}
                            <div className="mb-4">
                                <label className="block w-full">
                                    <div className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${file ? 'border-green-500 bg-green-50' : 'border-gray-300 hover:border-gray-400'
                                        }`}>
                                        <input
                                            type="file"
                                            accept=".xlsx,.xls"
                                            onChange={handleFileChange}
                                            className="hidden"
                                        />
                                        {file ? (
                                            <div className="flex items-center justify-center gap-2 text-green-600">
                                                <CheckCircle size={24} />
                                                <span className="font-medium">{file.name}</span>
                                            </div>
                                        ) : (
                                            <div className="text-gray-500">
                                                <Upload className="w-12 h-12 mx-auto mb-2 opacity-50" />
                                                <p>Click to select Excel file or drag and drop</p>
                                                <p className="text-sm mt-1">Maximum file size: 5MB</p>
                                            </div>
                                        )}
                                    </div>
                                </label>
                            </div>

                            {/* Upload Button */}
                            <button
                                onClick={handleUpload}
                                disabled={!file || uploading}
                                className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                            >
                                {uploading ? (
                                    <>
                                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                        Importing...
                                    </>
                                ) : (
                                    <>
                                        <Upload size={18} />
                                        Import Employees
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Results */}
                {result && (
                    <div className="bg-white rounded-xl shadow-sm p-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">Import Results</h2>

                        {/* Summary */}
                        <div className="grid grid-cols-2 gap-4 mb-6">
                            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                                <div className="flex items-center gap-2 text-green-700 mb-1">
                                    <CheckCircle size={20} />
                                    <span className="font-semibold">Imported Successfully</span>
                                </div>
                                <p className="text-3xl font-bold text-green-900">{result.imported}</p>
                            </div>
                            <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                                <div className="flex items-center gap-2 text-red-700 mb-1">
                                    <XCircle size={20} />
                                    <span className="font-semibold">Failed</span>
                                </div>
                                <p className="text-3xl font-bold text-red-900">{result.failed}</p>
                            </div>
                        </div>

                        {/* Errors */}
                        {result.errors && result.errors.length > 0 && (
                            <div>
                                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                    <AlertCircle size={18} className="text-orange-500" />
                                    Errors ({result.errors.length})
                                </h3>
                                <div className="space-y-2 max-h-96 overflow-y-auto">
                                    {result.errors.map((error: any, index: number) => (
                                        <div key={index} className="p-3 bg-red-50 border border-red-200 rounded-lg">
                                            <p className="text-sm text-red-900">
                                                <span className="font-semibold">Row {error.row}:</span> {error.message}
                                                {error.field && error.field !== 'general' && (
                                                    <span className="text-red-700"> (Field: {error.field})</span>
                                                )}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Success Message */}
                        {result.imported > 0 && (
                            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                                <p className="text-blue-900">
                                    <strong>Note:</strong> Onboarding emails have been sent to all successfully imported employees.
                                </p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
