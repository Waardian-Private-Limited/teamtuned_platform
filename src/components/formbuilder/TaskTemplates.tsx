"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/apiClient";
import {
  Plus,
  FileEdit,
  Trash2,
  Loader2,
  AlertCircle,
  ExternalLink,
  Layers,
  User,
  Clock
} from "lucide-react";

type ServerTemplate = {
  id: number;
  name: string;
  description?: string | null;
  type: string;
  version: number;
  is_published: number | boolean;
  author_name?: string;
  author_designation?: string;
  created_at?: string;
};

export default function TaskTemplates({ basePath = "/org-admin" }: { basePath?: string }) {
  const router = useRouter();
  const [items, setItems] = React.useState<ServerTemplate[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [showCreate, setShowCreate] = React.useState(false);
  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [showDelete, setShowDelete] = React.useState<{ open: boolean; item?: ServerTemplate }>({ open: false });

  const fetchTemplates = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient<ServerTemplate[]>("/templates", { method: "GET", withAuth: true });
      setItems(Array.isArray(res) ? res : []);
    } catch (e: any) {
      setError(e?.message || "Failed to load templates");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const createTemplate = async () => {
    if (!name.trim()) return;
    try {
      const created = await apiClient<{ id: number }>("/templates", {
        method: "POST",
        withAuth: true,
        body: { name: name.trim(), description: description.trim(), type: "task" },
      });
      setShowCreate(false);
      setName("");
      setDescription("");
      await fetchTemplates();
      const id = created?.id ?? null;
      if (id) {
        router.push(`${basePath}/form-builder?id=${encodeURIComponent(String(id))}&name=${encodeURIComponent(name.trim())}&description=${encodeURIComponent(description.trim())}`);
      }
    } catch (e: any) {
      setError(e?.message || "Failed to create template");
    }
  };

  const confirmDelete = (item: ServerTemplate) => setShowDelete({ open: true, item });

  const performDelete = async () => {
    const target = showDelete.item;
    if (!target) return;
    try {
      await apiClient(`/templates/${target.id}`, { method: "DELETE", withAuth: true });
      setShowDelete({ open: false, item: undefined });
      await fetchTemplates();
    } catch (e: any) {
      setError(e?.message || "Failed to delete template");
    }
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <div className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="h-16 flex items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 rounded-lg">
              <Layers className="h-5 w-5 text-indigo-600" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-slate-900">Task Templates</h1>
              <p className="text-sm text-slate-500">Manage and create task templates</p>
            </div>
          </div>
          <button
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-gradient-to-r from-indigo-600 to-indigo-700 text-white font-medium hover:from-indigo-700 hover:to-indigo-800 transition-all duration-200 shadow-sm hover:shadow-md"
            onClick={() => setShowCreate(true)}
          >
            <Plus className="h-4 w-4" />
            New Template
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6 max-w-7xl mx-auto">
        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-8 w-8 text-indigo-600 animate-spin" />
              <p className="text-sm text-slate-600">Loading templates...</p>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-red-800">Error loading templates</p>
              <p className="text-sm text-red-600 mt-1">{error}</p>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!loading && items.length === 0 && !error && (
          <div className="text-center py-16">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-100 flex items-center justify-center">
              <FileEdit className="h-8 w-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-medium text-slate-900 mb-2">No templates yet</h3>
            <p className="text-slate-500 mb-6 max-w-sm mx-auto">
              Get started by creating your first task template to streamline your workflow.
            </p>
            <button
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 transition-colors"
              onClick={() => setShowCreate(true)}
            >
              <Plus className="h-4 w-4" />
              Create Template
            </button>
          </div>
        )}

        {/* Templates Grid */}
        {!loading && items.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {items.map((template) => (
              <div
                key={template.id}
                className="group bg-white rounded-xl border border-slate-200 p-5 hover:border-indigo-300 hover:shadow-md transition-all duration-200"
              >
                <div className="flex items-start justify-between mb-3">
                  <h3 className="font-semibold text-slate-900 group-hover:text-indigo-700 transition-colors line-clamp-1">
                    {template.name}
                  </h3>
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${template.is_published
                    ? "bg-green-100 text-green-800"
                    : "bg-amber-100 text-amber-800"
                    }`}>
                    {template.is_published ? "Published" : "Draft"}
                  </span>
                </div>

                {template.description && (
                  <p className="text-sm text-slate-600 mb-4 line-clamp-2">
                    {template.description}
                  </p>
                )}



                <div className="flex items-center justify-between text-xs text-slate-500 mb-4">
                  <span>v{template.version}</span>
                  <span>Task Template</span>
                </div>

                <div className="flex items-center gap-2 pt-4 border-t border-slate-100">
                  <button
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 hover:border-slate-400 transition-colors"
                    onClick={() => router.push(`${basePath}/form-builder?id=${encodeURIComponent(String(template.id))}&name=${encodeURIComponent(template.name)}&description=${encodeURIComponent(template.description || "")}`)}
                  >
                    <FileEdit className="h-4 w-4" />
                    Edit
                  </button>
                  <button
                    className="flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-red-600 bg-white border border-red-200 rounded-lg hover:bg-red-50 hover:border-red-300 transition-colors"
                    onClick={() => confirmDelete(template)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                {(template.author_name) && (
                  <div className="mt-4 pt-3 flex items-center justify-between border-t border-slate-50">
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                      <Clock className="w-3 h-3" />
                      <span>{new Date(template.created_at || new Date()).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center gap-1.5 pl-2 pr-2.5 py-1 bg-slate-50 rounded-full border border-slate-100">
                      <div className="p-1 bg-indigo-100 rounded-full">
                        <User className="w-3 h-3 text-indigo-600" />
                      </div>
                      <div className="flex items-baseline gap-1 text-[10px] leading-none">
                        <span className="font-medium text-slate-400">Created by</span>
                        <span className="font-semibold text-slate-700">{template.author_name}</span>
                        {template.author_designation && (
                          <>
                            <span className="text-slate-300">|</span>
                            <span className="text-slate-500 font-medium">{template.author_designation}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white rounded-2xl p-6 shadow-xl animate-in fade-in duration-200">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-indigo-100 rounded-lg">
                <Plus className="h-5 w-5 text-indigo-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-900">New Task Template</h2>
                <p className="text-sm text-slate-500">Create a new template to get started</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Template Name <span className="text-red-500">*</span>
                </label>
                <input
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                  placeholder="Enter template name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Description
                </label>
                <textarea
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors resize-none"
                  placeholder="Describe what this template is for..."
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 mt-8 pt-6 border-t border-slate-200">
              <button
                className="px-4 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                onClick={() => setShowCreate(false)}
              >
                Cancel
              </button>
              <button
                className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={createTemplate}
                disabled={!name.trim()}
              >
                <ExternalLink className="h-4 w-4" />
                Create & Open Builder
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDelete.open && showDelete.item && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-white rounded-2xl p-6 shadow-xl animate-in fade-in duration-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertCircle className="h-5 w-5 text-red-600" />
              </div>
              <h2 className="text-lg font-semibold text-slate-900">Delete template?</h2>
            </div>

            <p className="text-sm text-slate-600 mb-2">
              You are about to delete the template:
            </p>
            <p className="text-sm font-medium text-slate-900 mb-6">
              "{showDelete.item.name}"
            </p>
            <p className="text-sm text-red-600 mb-6">
              This action cannot be undone. All associated data will be permanently removed.
            </p>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
              <button
                className="px-4 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                onClick={() => setShowDelete({ open: false, item: undefined })}
              >
                Cancel
              </button>
              <button
                className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
                onClick={performDelete}
              >
                <Trash2 className="h-4 w-4" />
                Delete Template
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}