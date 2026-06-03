"use client";

import React, { useState, useEffect } from "react";
import { apiClient } from "@/lib/apiClient";
import { toast } from "react-hot-toast";
import { 
    FileText, 
    Plus, 
    Download,
    Loader2,
    Search,
    ChevronLeft,
    ChevronRight,
    X,
    Trash2,
    CheckCircle2,
    Clock,
    User,
    Receipt
} from "lucide-react";

export default function CustomInvoices() {
    const [invoices, setInvoices] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [downloadingId, setDownloadingId] = useState<number | null>(null);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [creating, setCreating] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    
    const [pagination, setPagination] = useState({
        page: 1, limit: 10, total: 0, totalPages: 1
    });

    const [formData, setFormData] = useState({
        client_name: "",
        client_address: "",
        client_gst: "",
        place_of_supply: "27-MAHARASHTRA",
        due_date: new Date().toISOString().split('T')[0],
        paid_amount: "0",
        status: "PENDING",
        without_gst: false,
        items: [{ description: "", rate: "", quantity: "1" }]
    });

    useEffect(() => {
        fetchInvoices();
    }, [pagination.page]);

    const fetchInvoices = async () => {
        try {
            setLoading(true);
            const res = await apiClient.get("/superadmin/custom-invoices", { 
                page: pagination.page, 
                limit: pagination.limit 
            });
            if (res.success) {
                setInvoices(res.invoices);
                setPagination(res.pagination);
            }
        } catch (error: any) {
            toast.error(error.message || "Failed to fetch invoices");
        } finally {
            setLoading(false);
        }
    };

    const handleAddItem = () => {
        setFormData({
            ...formData,
            items: [...formData.items, { description: "", rate: "", quantity: "1" }]
        });
    };

    const handleRemoveItem = (index: number) => {
        if (formData.items.length === 1) return;
        const newItems = formData.items.filter((_, i) => i !== index);
        setFormData({ ...formData, items: newItems });
    };

    const handleItemChange = (index: number, field: string, value: string) => {
        const newItems = [...formData.items];
        (newItems[index] as any)[field] = value;
        setFormData({ ...formData, items: newItems });
    };

    const handleCreateInvoice = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setCreating(true);
            const method = editingId ? apiClient.put : apiClient.post;
            const url = editingId ? `/superadmin/custom-invoices/${editingId}` : "/superadmin/custom-invoices";
            
            const res = await method(url, formData);
            if (res.success) {
                toast.success(editingId ? "Invoice updated successfully" : "Invoice generated successfully");
                handleCloseModal();
                fetchInvoices();
            }
        } catch (error: any) {
            toast.error(error.message || "Failed to save invoice");
        } finally {
            setCreating(false);
        }
    };

    const handleEditClick = async (inv: any) => {
        try {
            const res = await apiClient.get(`/superadmin/custom-invoices/${inv.id}`);
            if (res.success && res.invoice) {
                setEditingId(inv.id);
                setFormData({
                    client_name: res.invoice.client_name,
                    client_address: res.invoice.client_address,
                    client_gst: res.invoice.client_gst || "",
                    place_of_supply: res.invoice.place_of_supply || "27-MAHARASHTRA",
                    due_date: res.invoice.due_date ? new Date(res.invoice.due_date).toISOString().split('T')[0] : "",
                    paid_amount: res.invoice.paid_amount?.toString() || "0",
                    status: res.invoice.status,
                    without_gst: !!res.invoice.without_gst,
                    items: res.items?.length > 0 ? res.items.map((i: any) => ({
                        description: i.description,
                        rate: i.rate?.toString() || "",
                        quantity: i.quantity?.toString() || "1"
                    })) : [{ description: "", rate: "", quantity: "1" }]
                });
                setShowCreateModal(true);
            }
        } catch (error) {
            toast.error("Failed to fetch invoice details");
        }
    };

    const handleCloseModal = () => {
        setShowCreateModal(false);
        setEditingId(null);
        setFormData({
            client_name: "",
            client_address: "",
            client_gst: "",
            place_of_supply: "27-MAHARASHTRA",
            due_date: new Date().toISOString().split('T')[0],
            paid_amount: "0",
            status: "PENDING",
            without_gst: false,
            items: [{ description: "", rate: "", quantity: "1" }]
        });
    };

    const handleDownload = async (id: number, invNum: string) => {
        try {
            setDownloadingId(id);
            const blob = await apiClient.get(`/superadmin/custom-invoices/${id}/download`, {}, { 
                responseType: 'blob',
                withAuth: true 
            });
            const url = window.URL.createObjectURL(new Blob([blob as any]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `Invoice-${invNum}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (error: any) {
            toast.error("Download failed");
        } finally {
            setDownloadingId(null);
        }
    };

    const handleUpdateStatus = async (id: number, newStatus: string) => {
        try {
            const res = await apiClient.patch(`/superadmin/custom-invoices/${id}/status`, { status: newStatus });
            if (res.success) {
                toast.success(`Invoice marked as ${newStatus}`);
                fetchInvoices();
            }
        } catch (error: any) {
            toast.error("Failed to update status");
        }
    };

    return (
        <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-black text-black tracking-tighter flex items-center gap-3">
                        <Receipt className="text-black" size={32} /> Custom Invoices
                    </h1>
                    <p className="text-black/60 font-medium mt-2">Generate and manage manual billing records.</p>
                </div>
                <button 
                    onClick={() => setShowCreateModal(true)}
                    className="flex items-center gap-3 bg-black hover:bg-zinc-800 text-white font-black py-4 px-8 rounded-2xl shadow-xl shadow-gray-200 transition-all uppercase text-[10px] tracking-widest"
                >
                    <Plus size={18} /> Generate New Invoice
                </button>
            </div>

            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50/50 border-b border-gray-100">
                                <th className="px-6 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Invoice Ref</th>
                                <th className="px-6 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Client Name</th>
                                <th className="px-6 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Due Date</th>
                                <th className="px-6 py-5 text-[10px] font-black text-black/40 uppercase tracking-widest text-right">Amount</th>
                                <th className="px-6 py-5 text-[10px] font-black text-black/40 uppercase tracking-widest text-right">Balance</th>
                                <th className="px-6 py-5 text-[10px] font-black text-black/40 uppercase tracking-widest text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-20 text-center">
                                        <Loader2 className="animate-spin text-blue-600 mx-auto" size={32} />
                                    </td>
                                </tr>
                            ) : invoices.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-20 text-center text-gray-400">
                                        <FileText size={48} className="mx-auto mb-4 opacity-20" />
                                        <p className="font-bold">No custom invoices found.</p>
                                    </td>
                                </tr>
                            ) : (
                                invoices.map((inv) => (
                                    <tr key={inv.id} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-4">
                                                <div className="p-3 bg-black text-white rounded-xl shadow-sm">
                                                    <FileText size={18} />
                                                </div>
                                                <div>
                                                    <div className="font-black text-black text-sm tracking-tight">{inv.invoice_number}</div>
                                                    <div className="text-[10px] text-black/40 font-black uppercase tracking-widest">{new Date(inv.created_at).toLocaleDateString()}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 font-bold text-gray-700">{inv.client_name}</td>
                                        <td className="px-6 py-4">
                                            <div className="text-xs font-bold text-gray-600">{inv.due_date ? new Date(inv.due_date).toLocaleDateString() : 'N/A'}</div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="font-black text-gray-900">₹{parseFloat(inv.total_amount).toLocaleString()}</div>
                                            <div className="text-[9px] text-gray-400 font-bold uppercase">Incl. GST ({inv.tax_rate}%)</div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className={`font-black ${parseFloat(inv.total_amount) - parseFloat(inv.paid_amount) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                                ₹{(parseFloat(inv.total_amount) - parseFloat(inv.paid_amount)).toLocaleString()}
                                            </div>
                                            <div className="text-[9px] text-gray-400 font-bold uppercase">Paid: ₹{parseFloat(inv.paid_amount).toLocaleString()}</div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button 
                                                    onClick={() => handleEditClick(inv)}
                                                    className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-all border border-blue-100"
                                                    title="Edit Invoice"
                                                >
                                                    <FileText size={16} />
                                                </button>
                                                <button 
                                                    onClick={() => handleDownload(inv.id, inv.invoice_number)}
                                                    disabled={downloadingId === inv.id}
                                                    className="p-2 bg-gray-50 text-gray-600 rounded-lg hover:bg-gray-100 transition-all border border-gray-100"
                                                    title="Download PDF"
                                                >
                                                    {downloadingId === inv.id ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                                                </button>
                                                {inv.status === 'PENDING' && (
                                                    <button 
                                                        onClick={() => handleUpdateStatus(inv.id, 'PAID')}
                                                        className="p-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-all border border-green-100"
                                                        title="Mark as Paid"
                                                    >
                                                        <CheckCircle2 size={16} />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {pagination.totalPages > 1 && (
                    <div className="px-6 py-4 bg-gray-50/50 flex items-center justify-between border-t border-gray-100">
                        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Page {pagination.page} of {pagination.totalPages}</span>
                        <div className="flex gap-2">
                            <button 
                                disabled={pagination.page === 1}
                                onClick={() => setPagination({...pagination, page: pagination.page - 1})}
                                className="p-2 hover:bg-gray-100 disabled:opacity-30 transition-all"
                            >
                                <ChevronLeft size={20} />
                            </button>
                            <button 
                                disabled={pagination.page === pagination.totalPages}
                                onClick={() => setPagination({...pagination, page: pagination.page + 1})}
                                className="p-2 hover:bg-gray-100 disabled:opacity-30 transition-all"
                            >
                                <ChevronRight size={20} />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Create Invoice Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm" onClick={() => !creating && handleCloseModal()} />
                    <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
                        <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-blue-50/30">
                            <h3 className="text-xl font-black text-gray-900 uppercase tracking-tighter flex items-center gap-2">
                                <Plus className="text-blue-600" /> {editingId ? "Edit Invoice" : "Generate New Invoice"}
                            </h3>
                            <button onClick={() => !creating && handleCloseModal()} className="p-2 hover:bg-white rounded-full transition-all shadow-sm">
                                <X size={20} className="text-gray-400" />
                            </button>
                        </div>

                        <form onSubmit={handleCreateInvoice} className="p-8 space-y-8 overflow-y-auto">
                            {/* Client Section */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-8 border-b border-gray-50">
                                <div className="md:col-span-2">
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Client / Organization Name</label>
                                    <input 
                                        required
                                        type="text"
                                        value={formData.client_name}
                                        onChange={(e) => setFormData({...formData, client_name: e.target.value})}
                                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 transition-all font-bold text-black"
                                        placeholder="Enter client name..."
                                    />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Billing Address</label>
                                    <textarea 
                                        required
                                        value={formData.client_address}
                                        onChange={(e) => setFormData({...formData, client_address: e.target.value})}
                                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 transition-all font-medium text-black"
                                        placeholder="Enter full billing address..."
                                        rows={2}
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Client GST Number</label>
                                    <input 
                                        type="text"
                                        disabled={formData.without_gst}
                                        value={formData.client_gst}
                                        onChange={(e) => setFormData({...formData, client_gst: e.target.value})}
                                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 transition-all font-bold text-black uppercase disabled:opacity-50 disabled:bg-gray-50"
                                        placeholder={formData.without_gst ? "GST numbers disabled" : "Optional (e.g. 27XXXXX)"}
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Initial Status</label>
                                    <select 
                                        value={formData.status}
                                        onChange={(e) => setFormData({...formData, status: e.target.value})}
                                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 transition-all font-bold text-black"
                                    >
                                        <option value="PENDING">Pending (Unpaid)</option>
                                        <option value="PAID">Already Paid</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Due Date</label>
                                    <input 
                                        type="date"
                                        value={formData.due_date}
                                        onChange={(e) => setFormData({...formData, due_date: e.target.value})}
                                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 transition-all font-bold text-black"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Paid Amount (₹)</label>
                                    <input 
                                        type="number"
                                        value={formData.paid_amount}
                                        onChange={(e) => setFormData({...formData, paid_amount: e.target.value})}
                                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 transition-all font-bold text-black"
                                        placeholder="0.00"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Place of Supply</label>
                                    <input 
                                        type="text"
                                        value={formData.place_of_supply}
                                        onChange={(e) => setFormData({...formData, place_of_supply: e.target.value})}
                                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 transition-all font-bold text-black uppercase"
                                        placeholder="e.g. 27-MAHARASHTRA"
                                    />
                                </div>
                                <div className="flex items-center gap-3 pt-6 md:col-span-2">
                                    <input
                                        type="checkbox"
                                        id="without_gst"
                                        checked={formData.without_gst}
                                        onChange={(e) => setFormData({
                                            ...formData, 
                                            without_gst: e.target.checked,
                                            client_gst: e.target.checked ? "" : formData.client_gst
                                        })}
                                        className="w-5 h-5 rounded-md border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                    />
                                    <label htmlFor="without_gst" className="text-xs font-black text-gray-700 uppercase tracking-wider select-none cursor-pointer">
                                        Generate Invoice without GST (Exempt/Unregistered - Omit GSTINs & tax calculations)
                                    </label>
                                </div>
                            </div>

                            {/* Items Section */}
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Line Items</h4>
                                    <button 
                                        type="button"
                                        onClick={handleAddItem}
                                        className="text-[10px] font-bold text-blue-600 hover:text-blue-700 uppercase"
                                    >
                                        + Add Row
                                    </button>
                                </div>

                                {formData.items.map((item, index) => (
                                    <div key={index} className="grid grid-cols-12 gap-3 items-end bg-gray-50/50 p-4 rounded-2xl border border-gray-100">
                                        <div className="col-span-6">
                                            <label className="block text-[8px] font-bold text-gray-400 uppercase mb-1">Description</label>
                                            <input 
                                                required
                                                type="text"
                                                value={item.description}
                                                onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                                                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs font-bold text-black"
                                                placeholder="Service name..."
                                            />
                                        </div>
                                        <div className="col-span-2">
                                            <label className="block text-[8px] font-bold text-gray-400 uppercase mb-1">Rate (₹)</label>
                                            <input 
                                                required
                                                type="number"
                                                value={item.rate}
                                                onChange={(e) => handleItemChange(index, 'rate', e.target.value)}
                                                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs font-bold text-black"
                                            />
                                        </div>
                                        <div className="col-span-2">
                                            <label className="block text-[8px] font-bold text-gray-400 uppercase mb-1">Qty</label>
                                            <input 
                                                required
                                                type="number"
                                                value={item.quantity}
                                                onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                                                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs font-bold text-black"
                                            />
                                        </div>
                                        <div className="col-span-2 flex justify-end">
                                            <button 
                                                type="button" 
                                                onClick={() => handleRemoveItem(index)}
                                                className="p-2 text-red-400 hover:text-red-500"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="flex justify-end pt-6">
                                <button
                                    type="submit"
                                    disabled={creating}
                                    className="w-full sm:w-auto bg-gray-900 hover:bg-black text-white px-10 py-4 rounded-2xl font-black uppercase text-xs tracking-widest transition-all shadow-xl shadow-gray-200 disabled:opacity-50"
                                >
                                    {creating ? <Loader2 className="animate-spin mx-auto" size={20} /> : (editingId ? "Update Invoice" : "Generate & Save Invoice")}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
