"use client";

import React from "react";
import {
  TrendingUp,
  BarChart3,
  PieChart,
  BarChartHorizontal,
  Layers,
  Calendar,
  MapPin,
  Image,
  FileText,
  Hash,
  Plus,
  Save,
  Settings,
  GripVertical,
  Trash2,
  ArrowUp,
  ArrowDown,
  Eye,
  ChevronLeft,
  CheckCircle,
  XCircle,
  Filter,
  Move,
  Maximize2,
} from "lucide-react";
import { v4 as uuidv4 } from "uuid";
import { apiClient } from "@/lib/apiClient";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  ScatterChart,
  Scatter,
  ResponsiveContainer,
} from "recharts";

// Widget types and their configurations
const WIDGET_TYPES = {
  // KPI Cards
  kpi: { label: "KPI Metric Card", icon: <TrendingUp size={18} />, description: "Display key performance indicators" },
  count: { label: "Count Card", icon: <Hash size={18} />, description: "Count of items" },
  sum: { label: "Sum Card", icon: <Hash size={18} />, description: "Sum of numeric values" },
  percentage: { label: "Percentage Card", icon: <TrendingUp size={18} />, description: "Percentage calculation" },
  
  // Charts
  line: { label: "Line Chart", icon: <TrendingUp size={18} />, description: "Trend analysis over time" },
  area: { label: "Area Chart", icon: <Layers size={18} />, description: "Cumulative trends" },
  bar: { label: "Bar Chart", icon: <BarChart3 size={18} />, description: "Vertical bar comparison" },
  bar_horizontal: { label: "Horizontal Bar", icon: <BarChartHorizontal size={18} />, description: "Horizontal bar comparison" },
  stacked: { label: "Stacked Bar", icon: <Layers size={18} />, description: "Stacked bar chart" },
  pie: { label: "Pie Chart", icon: <PieChart size={18} />, description: "Pie chart visualization" },
  donut: { label: "Donut Chart", icon: <PieChart size={18} />, description: "Donut chart visualization" },
  histogram: { label: "Histogram", icon: <BarChart3 size={18} />, description: "Distribution analysis" },
  scatter: { label: "Scatter Plot", icon: <TrendingUp size={18} />, description: "Correlation analysis" },
  bubble: { label: "Bubble Chart", icon: <TrendingUp size={18} />, description: "3D data visualization" },
  
  // Data Views
  table: { label: "Data Table", icon: <FileText size={18} />, description: "Tabular data view" },
  gallery: { label: "Image Gallery", icon: <Image size={18} />, description: "Image collection view" },
  
  // Specialized
  map: { label: "Map Clustering", icon: <MapPin size={18} />, description: "GPS data clustering" },
  heatmap: { label: "Calendar Heatmap", icon: <Calendar size={18} />, description: "Activity heatmap" },
  text: { label: "Text Block", icon: <FileText size={18} />, description: "Notes and text content" },
};

// Field type compatibility mapping
const FIELD_COMPATIBILITY = {
  numeric: ['kpi', 'line', 'area', 'bar', 'bar_horizontal', 'stacked', 'histogram', 'scatter', 'bubble', 'sum', 'count', 'percentage'],
  choice: ['bar', 'bar_horizontal', 'pie', 'donut', 'stacked', 'count'],
  select: ['bar', 'bar_horizontal', 'pie', 'donut', 'stacked', 'count'],
  toggle: ['bar', 'bar_horizontal', 'pie', 'donut', 'stacked', 'count'],
  date: ['line', 'area', 'heatmap', 'table'],
  time: ['line', 'area', 'heatmap', 'table'],
  datetime: ['line', 'area', 'heatmap', 'table'],
  gps: ['map', 'table'],
  image: ['gallery', 'table'],
  file: ['gallery', 'table'],
  text: ['table'],
  textarea: ['table'],
  email: ['table'],
  phone: ['table'],
};

// Filter operators
const FILTER_OPERATORS = [
  { value: 'equals', label: 'Equals' },
  { value: 'not_equals', label: 'Not Equals' },
  { value: 'contains', label: 'Contains' },
  { value: 'not_contains', label: 'Not Contains' },
  { value: 'in', label: 'In' },
  { value: 'not_in', label: 'Not In' },
  { value: 'between', label: 'Between' },
  { value: 'greaterThan', label: 'Greater Than' },
  { value: 'lessThan', label: 'Less Than' },
  { value: 'dateRange', label: 'Date Range' },
];

interface Widget {
  id: string;
  type: keyof typeof WIDGET_TYPES;
  title: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
  config: {
    xAxis?: { field: string; label: string };
    yAxis?: { field: string; label: string };
    valueField?: string;
    aggregation?: 'count' | 'sum' | 'avg' | 'min' | 'max';
    filters?: Array<{
      field: string;
      operator: string;
      value: any;
    }>;
    color?: string;
    showLegend?: boolean;
    showGrid?: boolean;
  };
  data?: any[];
}

interface Field {
  id: string;
  field_key: string;
  label: string;
  field_type: string;
  options?: Array<{ value: string; label: string }>;
}

interface Template {
  id: string;
  name: string;
  description: string;
  fields: Field[];
}

export default function DashboardBuilder({
  dashboardId,
  onBack,
}: {
  dashboardId?: string;
  onBack?: () => void;
}) {
  const [widgets, setWidgets] = React.useState<Widget[]>([]);
  const [selectedWidget, setSelectedWidget] = React.useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = React.useState<Template | null>(null);
  const [templates, setTemplates] = React.useState<Template[]>([]);
  const [showTemplateModal, setShowTemplateModal] = React.useState(false);
  const [showCanvasModal, setShowCanvasModal] = React.useState(false);
  const [dashboardName, setDashboardName] = React.useState("");
  const [dashboardDescription, setDashboardDescription] = React.useState("");
  const [dirty, setDirty] = React.useState(false);
  const [showWidgetConfig, setShowWidgetConfig] = React.useState(false);
  const [configWidget, setConfigWidget] = React.useState<Widget | null>(null);
  const [draggedWidget, setDraggedWidget] = React.useState<string | null>(null);
  const [dragOffset, setDragOffset] = React.useState({ x: 0, y: 0 });
  const [dashboards, setDashboards] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);

  // Load templates and dashboards on mount
  React.useEffect(() => {
    loadTemplates();
    loadDashboards();
  }, []);

  const loadTemplates = async () => {
    try {
      const response = await apiClient<any>("/templates", { method: "GET", withAuth: true });
      const templateData = response?.templates || [];
      setTemplates(templateData.map((t: any) => ({
        id: t.id,
        name: t.name,
        description: t.description,
        fields: t.fields || []
      })));
    } catch (error) {
      console.error("Failed to load templates:", error);
    }
  };

  const loadDashboards = async () => {
    try {
      const response = await apiClient<any>("/dashboards", { method: "GET", withAuth: true });
      setDashboards(response?.dashboards || []);
    } catch (error) {
      console.error("Failed to load dashboards:", error);
    } finally {
      setLoading(false);
    }
  };

  const addWidget = (type: keyof typeof WIDGET_TYPES) => {
    if (!selectedTemplate) return;

    const newWidget: Widget = {
      id: uuidv4(),
      type,
      title: WIDGET_TYPES[type].label,
      position: { x: 50, y: 50 },
      size: { width: 400, height: 300 },
      config: {
        aggregation: 'count',
        showLegend: true,
        showGrid: true,
        color: '#3B82F6',
      },
    };

    setWidgets(prev => [...prev, newWidget]);
    setDirty(true);
    setSelectedWidget(newWidget.id);
    setConfigWidget(newWidget);
    setShowWidgetConfig(true);
  };

  const removeWidget = (id: string) => {
    setWidgets(prev => prev.filter(w => w.id !== id));
    setDirty(true);
    if (selectedWidget === id) {
      setSelectedWidget(null);
    }
  };

  const updateWidget = (id: string, updates: Partial<Widget>) => {
    setWidgets(prev => prev.map(w => w.id === id ? { ...w, ...updates } : w));
    setDirty(true);
  };

  const handleTemplateSelect = (template: Template) => {
    setSelectedTemplate(template);
    setShowTemplateModal(false);
    setShowCanvasModal(true);
  };

  const handleWidgetDragStart = (e: React.DragEvent, widgetId: string) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
    setDraggedWidget(widgetId);
  };

  const handleCanvasDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (draggedWidget) {
      const canvasRect = e.currentTarget.getBoundingClientRect();
      const newX = e.clientX - canvasRect.left - dragOffset.x;
      const newY = e.clientY - canvasRect.top - dragOffset.y;
      
      updateWidget(draggedWidget, {
        position: { x: Math.max(0, newX), y: Math.max(0, newY) }
      });
      setDraggedWidget(null);
    }
  };

  const handleCanvasDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const getCompatibleFields = (widgetType: keyof typeof WIDGET_TYPES) => {
    if (!selectedTemplate) return [];
    return selectedTemplate.fields.filter(field => {
      const compatibleTypes = FIELD_COMPATIBILITY[field.field_type as keyof typeof FIELD_COMPATIBILITY] || [];
      return compatibleTypes.includes(widgetType);
    });
  };

  const fetchWidgetData = async (widget: Widget) => {
    if (!selectedTemplate) return;
    
    try {
      const response = await apiClient(`/dashboards/widget-data`, {
        method: "POST",
        withAuth: true,
        body: {
          template_id: selectedTemplate.id,
          widget_type: widget.type,
          config: widget.config
        }
      });
      
      return response?.data || [];
    } catch (error) {
      console.error("Failed to fetch widget data:", error);
      return [];
    }
  };

  React.useEffect(() => {
    if (widgets.length > 0 && selectedTemplate) {
      widgets.forEach(async (widget) => {
        const data = await fetchWidgetData(widget);
        updateWidget(widget.id, { data });
      });
    }
  }, [widgets.length, selectedTemplate?.id]);

  const createNewDashboard = () => {
    setDashboardName("");
    setDashboardDescription("");
    setWidgets([]);
    setSelectedWidget(null);
    setSelectedTemplate(null);
    setDirty(false);
    setShowTemplateModal(true);
  };

  const editDashboard = (dashboard: any) => {
    setDashboardName(dashboard.name);
    setDashboardDescription(dashboard.description || "");
    setWidgets(dashboard.layout?.widgets || []);
    setSelectedTemplate(templates.find(t => t.id === dashboard.template_id) || null);
    setSelectedWidget(null);
    setDirty(false);
    setShowCanvasModal(true);
  };

  const saveDashboard = async () => {
    if (!dashboardName.trim() || !selectedTemplate) {
      alert("Please provide a dashboard name and select a template");
      return;
    }

    try {
      const dashboardData = {
        name: dashboardName,
        description: dashboardDescription,
        template_id: selectedTemplate.id,
        layout: {
          widgets: widgets.map(w => ({
            id: w.id,
            type: w.type,
            title: w.title,
            position: w.position,
            size: w.size,
            config: w.config
          }))
        }
      };

      if (dashboardId) {
        await apiClient(`/dashboards/${dashboardId}`, {
          method: "PUT",
          withAuth: true,
          body: dashboardData
        });
      } else {
        await apiClient("/dashboards", {
          method: "POST",
          withAuth: true,
          body: dashboardData
        });
      }
      
      setDirty(false);
      alert("Dashboard saved successfully!");
    } catch (error) {
      console.error("Failed to save dashboard:", error);
      alert("Failed to save dashboard. Please try again.");
    }
  };

  return (
    <div className="h-screen w-full flex flex-col bg-slate-50">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-slate-200 shadow-sm">
        <div className="flex items-center gap-4">
          <button
            className="flex items-center gap-2 px-4 py-2.5 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors border border-slate-300"
            onClick={() => {
              if (dirty) {
                if (confirm("You have unsaved changes. Are you sure you want to leave?")) {
                  onBack?.();
                }
              } else {
                onBack?.();
              }
            }}
          >
            <ChevronLeft size={18} />
            Back
          </button>
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
            <div className="text-lg font-semibold text-slate-900">Dashboard Builder</div>
          </div>
        </div>
        
        <button
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          onClick={createNewDashboard}
        >
          <Plus size={18} />
          Create Dashboard
        </button>
      </div>

      {/* Dashboards List */}
      <div className="flex-1 overflow-auto p-6">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-slate-500">Loading dashboards...</div>
          </div>
        ) : dashboards.length === 0 ? (
          <div className="border-2 border-dashed border-slate-300 rounded-2xl p-12 text-center bg-white">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-200 flex items-center justify-center">
              <BarChart3 size={24} className="text-slate-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-700 mb-2">No Dashboards Yet</h3>
            <p className="text-slate-500 mb-6 max-w-md mx-auto">
              Create your first dashboard to start visualizing your task data.
            </p>
            <button
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors mx-auto"
              onClick={createNewDashboard}
            >
              <Plus size={18} />
              Create First Dashboard
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {dashboards.map((dashboard) => (
              <div key={dashboard.id} className="bg-white rounded-xl border border-slate-200 p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-slate-900 mb-1">{dashboard.name}</h3>
                    <p className="text-sm text-slate-600">{dashboard.description}</p>
                  </div>
                  <button
                    className="p-2 text-slate-400 hover:text-blue-600 transition-colors"
                    onClick={() => editDashboard(dashboard)}
                  >
                    <Settings size={16} />
                  </button>
                </div>
                
                <div className="flex items-center justify-between text-sm text-slate-500">
                  <span>{dashboard.layout?.widgets?.length || 0} widgets</span>
                  <span className="text-xs bg-slate-100 px-2 py-1 rounded">
                    {templates.find(t => t.id === dashboard.template_id)?.name || 'Unknown Template'}
                  </span>
                </div>
                
                <button
                  className="w-full mt-4 flex items-center justify-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors"
                  onClick={() => editDashboard(dashboard)}
                >
                  <Eye size={16} />
                  View Dashboard
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Canvas Modal */}
      {showCanvasModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full h-full max-w-[95vw] max-h-[95vh] shadow-xl overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-slate-200 shadow-sm">
              <div className="flex items-center gap-4">
                <button
                  className="flex items-center gap-2 px-4 py-2.5 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors border border-slate-300"
                  onClick={() => {
                    if (dirty) {
                      if (confirm("You have unsaved changes. Are you sure you want to close?")) {
                        setShowCanvasModal(false);
                      }
                    } else {
                      setShowCanvasModal(false);
                    }
                  }}
                >
                  <ChevronLeft size={18} />
                  Close
                </button>
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
                  <div className="text-lg font-semibold text-slate-900">
                    {dashboardName || "Dashboard Builder"}
                  </div>
                  {selectedTemplate && (
                    <div className="text-sm text-slate-500">— {selectedTemplate.name}</div>
                  )}
                </div>
                {dirty && (
                  <div className="flex items-center gap-2 px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-sm">
                    <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></div>
                    Unsaved Changes
                  </div>
                )}
              </div>
              
              <div className="flex items-center gap-3">
                <button
                  className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 text-white rounded-lg hover:bg-slate-900 transition-colors"
                  onClick={() => setShowTemplateModal(true)}
                >
                  <Settings size={18} />
                  Change Template
                </button>
                
                <button
                  className="flex items-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                  onClick={saveDashboard}
                >
                  <Save size={18} />
                  Save Dashboard
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="flex flex-1 overflow-hidden">
              {/* Left Sidebar - Fields Panel */}
              <aside className="w-80 border-r border-slate-200 bg-white overflow-y-auto">
                <div className="p-6 border-b border-slate-200">
                  <h2 className="text-lg font-semibold text-slate-900 mb-2">Template Fields</h2>
                  <p className="text-sm text-slate-600">Drag fields to widgets to configure data</p>
                </div>
                
                {selectedTemplate ? (
                  <div className="p-4 space-y-3">
                    {selectedTemplate.fields.map((field) => (
                      <div
                        key={field.id}
                        className="p-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition-colors cursor-move"
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.setData("field/id", field.id);
                          e.dataTransfer.setData("field/key", field.field_key);
                          e.dataTransfer.setData("field/label", field.label);
                          e.dataTransfer.setData("field/type", field.field_type);
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <GripVertical size={16} className="text-slate-400" />
                          <div className="flex-1">
                            <div className="font-medium text-slate-900 text-sm">{field.label}</div>
                            <div className="text-xs text-slate-500 capitalize">{field.field_type}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 text-center">
                    <div className="text-sm text-slate-500">No template selected</div>
                  </div>
                )}
              </aside>

              {/* Center Canvas */}
              <main 
                className="flex-1 overflow-auto p-6 bg-slate-100 relative"
                onDrop={handleCanvasDrop}
                onDragOver={handleCanvasDragOver}
              >
                <div className="mb-6">
                  <h2 className="text-xl font-semibold text-slate-900 mb-2">Dashboard Canvas</h2>
                  <p className="text-sm text-slate-600">Drag widgets from the right sidebar to build your dashboard</p>
                </div>

                {widgets.length === 0 ? (
                  <div className="border-2 border-dashed border-slate-300 rounded-2xl p-12 text-center bg-white">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-200 flex items-center justify-center">
                      <BarChart3 size={24} className="text-slate-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-slate-700 mb-2">Start Building Your Dashboard</h3>
                    <p className="text-slate-500 mb-6 max-w-md mx-auto">
                      Drag widgets from the right sidebar to create your custom dashboard layout.
                    </p>
                  </div>
                ) : (
                  <div className="relative min-h-[800px]">
                    {widgets.map((widget) => (
                      <WidgetCard
                        key={widget.id}
                        widget={widget}
                        isSelected={selectedWidget === widget.id}
                        onSelect={() => setSelectedWidget(widget.id)}
                        onRemove={() => removeWidget(widget.id)}
                        onConfigure={() => {
                          setConfigWidget(widget);
                          setShowWidgetConfig(true);
                        }}
                        onDragStart={(e) => handleWidgetDragStart(e, widget.id)}
                        compatibleFields={getCompatibleFields(widget.type)}
                      />
                    ))}
                  </div>
                )}
              </main>

              {/* Right Sidebar - Widgets Panel */}
              <aside className="w-80 border-l border-slate-200 bg-white overflow-y-auto">
                <div className="p-6 border-b border-slate-200">
                  <h2 className="text-lg font-semibold text-slate-900 mb-2">Widget Library</h2>
                  <p className="text-sm text-slate-600">Drag widgets to the canvas</p>
                </div>
                
                <div className="p-4 space-y-6">
                  {/* KPI Cards */}
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">KPI Cards</h3>
                    <div className="space-y-2">
                      {['kpi', 'count', 'sum', 'percentage'].map((type) => (
                        <button
                          key={type}
                          className="w-full text-left p-3 rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-blue-50 transition-all"
                          onClick={() => addWidget(type as keyof typeof WIDGET_TYPES)}
                          draggable
                          onDragStart={(e) => {
                            e.dataTransfer.setData("widget/type", type);
                          }}
                        >
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-blue-100 text-blue-600">
                              {WIDGET_TYPES[type as keyof typeof WIDGET_TYPES].icon}
                            </div>
                            <div className="flex-1">
                              <div className="font-medium text-slate-900 text-sm">
                                {WIDGET_TYPES[type as keyof typeof WIDGET_TYPES].label}
                              </div>
                              <div className="text-xs text-slate-500">
                                {WIDGET_TYPES[type as keyof typeof WIDGET_TYPES].description}
                              </div>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Charts */}
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Charts</h3>
                    <div className="space-y-2">
                      {['line', 'area', 'bar', 'bar_horizontal', 'stacked', 'pie', 'donut', 'histogram', 'scatter', 'bubble'].map((type) => (
                        <button
                          key={type}
                          className="w-full text-left p-3 rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-blue-50 transition-all"
                          onClick={() => addWidget(type as keyof typeof WIDGET_TYPES)}
                          draggable
                          onDragStart={(e) => {
                            e.dataTransfer.setData("widget/type", type);
                          }}
                        >
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-green-100 text-green-600">
                              {WIDGET_TYPES[type as keyof typeof WIDGET_TYPES].icon}
                            </div>
                            <div className="flex-1">
                              <div className="font-medium text-slate-900 text-sm">
                                {WIDGET_TYPES[type as keyof typeof WIDGET_TYPES].label}
                              </div>
                              <div className="text-xs text-slate-500">
                                {WIDGET_TYPES[type as keyof typeof WIDGET_TYPES].description}
                              </div>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Data Views */}
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Data Views</h3>
                    <div className="space-y-2">
                      {['table', 'gallery'].map((type) => (
                        <button
                          key={type}
                          className="w-full text-left p-3 rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-blue-50 transition-all"
                          onClick={() => addWidget(type as keyof typeof WIDGET_TYPES)}
                          draggable
                          onDragStart={(e) => {
                            e.dataTransfer.setData("widget/type", type);
                          }}
                        >
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-purple-100 text-purple-600">
                              {WIDGET_TYPES[type as keyof typeof WIDGET_TYPES].icon}
                            </div>
                            <div className="flex-1">
                              <div className="font-medium text-slate-900 text-sm">
                                {WIDGET_TYPES[type as keyof typeof WIDGET_TYPES].label}
                              </div>
                              <div className="text-xs text-slate-500">
                                {WIDGET_TYPES[type as keyof typeof WIDGET_TYPES].description}
                              </div>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Specialized */}
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Specialized</h3>
                    <div className="space-y-2">
                      {['map', 'heatmap', 'text'].map((type) => (
                        <button
                          key={type}
                          className="w-full text-left p-3 rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-blue-50 transition-all"
                          onClick={() => addWidget(type as keyof typeof WIDGET_TYPES)}
                          draggable
                          onDragStart={(e) => {
                          e.dataTransfer.setData("widget/type", type);
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-orange-100 text-orange-600">
                            {WIDGET_TYPES[type as keyof typeof WIDGET_TYPES].icon}
                          </div>
                          <div className="flex-1">
                            <div className="font-medium text-slate-900 text-sm">
                              {WIDGET_TYPES[type as keyof typeof WIDGET_TYPES].label}
                            </div>
                            <div className="text-xs text-slate-500">
                              {WIDGET_TYPES[type as keyof typeof WIDGET_TYPES].description}
                            </div>
                          </div>
                        </div>
                      </button>
                      ))}
                    </div>
                  </div>
                </div>
              </aside>
            </div>
          </div>
        </div>
      )}

      {/* Template Selection Modal */}
      {showTemplateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-2xl w-full shadow-xl max-h-[80vh] overflow-y-auto">
            <div className="mb-6">
              <h2 className="text-2xl font-semibold text-slate-900 mb-2">Create New Dashboard</h2>
              <p className="text-slate-600">Select a task template and configure your dashboard</p>
            </div>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Dashboard Name</label>
                <input
                  className="w-full border border-slate-300 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={dashboardName}
                  onChange={(e) => setDashboardName(e.target.value)}
                  placeholder="Enter dashboard name"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Description</label>
                <textarea
                  className="w-full border border-slate-300 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  rows={3}
                  value={dashboardDescription}
                  onChange={(e) => setDashboardDescription(e.target.value)}
                  placeholder="Enter dashboard description"
                />
              </div>
            </div>

            <div className="mb-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Select Task Template</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {templates.map((template) => (
                  <button
                    key={template.id}
                    className={`p-4 rounded-xl border-2 text-left transition-all ${
                      selectedTemplate?.id === template.id
                        ? "border-blue-500 bg-blue-50"
                        : "border-slate-200 hover:border-slate-300 bg-white"
                    }`}
                    onClick={() => handleTemplateSelect(template)}
                  >
                    <div className="font-semibold text-slate-900 mb-1">{template.name}</div>
                    <div className="text-sm text-slate-600 mb-2">{template.description}</div>
                    <div className="text-xs text-slate-500">
                      {template.fields.length} fields
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-3 justify-end">
              <button
                className="px-6 py-2.5 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                onClick={() => {
                  setShowTemplateModal(false);
                  setDashboardName("");
                  setDashboardDescription("");
                  setSelectedTemplate(null);
                }}
              >
                Cancel
              </button>
              <button
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={() => setShowTemplateModal(false)}
                disabled={!selectedTemplate || !dashboardName.trim()}
              >
                Create Dashboard
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Widget Configuration Modal */}
      {showWidgetConfig && configWidget && (
        <WidgetConfigModal
          widget={configWidget}
          template={selectedTemplate!}
          onSave={(updatedWidget) => {
            updateWidget(configWidget.id, updatedWidget);
            setShowWidgetConfig(false);
            setConfigWidget(null);
          }}
          onClose={() => {
            setShowWidgetConfig(false);
            setConfigWidget(null);
          }}
        />
      )}
    </div>
  );
}

// Widget Card Component
const WidgetCard = ({
  widget,
  isSelected,
  onSelect,
  onRemove,
  onConfigure,
  onDragStart,
  compatibleFields,
}: {
  widget: Widget;
  isSelected: boolean;
  onSelect: () => void;
  onRemove: () => void;
  onConfigure: () => void;
  onDragStart: (e: React.DragEvent) => void;
  compatibleFields: Field[];
}) => {
  const renderChart = () => {
    if (!widget.data || widget.data.length === 0) {
      return (
        <div className="flex items-center justify-center h-full">
          <div className="text-center text-slate-500">
            <div className="text-2xl mb-2">{WIDGET_TYPES[widget.type].icon}</div>
            <div className="text-sm">No data available</div>
          </div>
        </div>
      );
    }

    const chartData = widget.data;
    const color = widget.config.color || '#3B82F6';

    switch (widget.type) {
      case 'kpi':
      case 'count':
      case 'sum':
      case 'percentage':
        const value = chartData[0]?.value || 0;
        return (
          <div className="flex flex-col items-center justify-center h-full p-4">
            <div className="text-3xl font-bold text-slate-900 mb-2">
              {widget.type === 'percentage' ? `${value}%` : value.toLocaleString()}
            </div>
            <div className="text-sm text-slate-600 text-center">
              {widget.config.aggregation === 'count' ? 'Total Count' :
               widget.config.aggregation === 'sum' ? 'Total Sum' :
               widget.config.aggregation === 'avg' ? 'Average' :
               widget.config.aggregation === 'min' ? 'Minimum' :
               widget.config.aggregation === 'max' ? 'Maximum' : 'Value'}
            </div>
          </div>
        );

      case 'line':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="name" stroke="#64748b" fontSize={12} />
              <YAxis stroke="#64748b" fontSize={12} />
              <Tooltip />
              <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        );

      case 'area':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="name" stroke="#64748b" fontSize={12} />
              <YAxis stroke="#64748b" fontSize={12} />
              <Tooltip />
              <Area type="monotone" dataKey="value" stroke={color} fill={color} fillOpacity={0.3} />
            </AreaChart>
          </ResponsiveContainer>
        );

      case 'bar':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="name" stroke="#64748b" fontSize={12} />
              <YAxis stroke="#64748b" fontSize={12} />
              <Tooltip />
              <Bar dataKey="value" fill={color} />
            </BarChart>
          </ResponsiveContainer>
        );

      case 'pie':
      case 'donut':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <RechartsPieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                outerRadius={80}
                innerRadius={widget.type === 'donut' ? 40 : 0}
                dataKey="value"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={`hsl(${index * 45}, 70%, 60%)`} />
                ))}
              </Pie>
              <Tooltip />
            </RechartsPieChart>
          </ResponsiveContainer>
        );

      case 'table':
        return (
          <div className="p-4 overflow-auto h-full">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  {Object.keys(chartData[0] || {}).map(key => (
                    <th key={key} className="text-left py-2 px-3 font-medium text-slate-700 capitalize">
                      {key.replace('_', ' ')}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {chartData.slice(0, 10).map((row, index) => (
                  <tr key={index} className="border-b border-slate-100">
                    {Object.values(row).map((value, i) => (
                      <td key={i} className="py-2 px-3 text-slate-600">
                        {String(value)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            {chartData.length > 10 && (
              <div className="text-xs text-slate-500 text-center py-2">
                Showing 10 of {chartData.length} rows
              </div>
            )}
          </div>
        );

      default:
        return (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-slate-500">
              <div className="text-2xl mb-2">{WIDGET_TYPES[widget.type].icon}</div>
              <div className="text-sm">{widget.title}</div>
              <div className="text-xs">{chartData.length} data points</div>
            </div>
          </div>
        );
    }
  };

  return (
    <div
      className={`absolute group cursor-move ${
        isSelected ? "ring-2 ring-blue-500" : ""
      }`}
      style={{
        left: widget.position.x,
        top: widget.position.y,
        width: widget.size.width,
        height: widget.size.height,
      }}
      onClick={onSelect}
      draggable
      onDragStart={onDragStart}
    >
      <div className="h-full bg-white rounded-lg shadow-lg border border-slate-200 overflow-hidden">
        {/* Widget Header */}
        <div className="flex items-center justify-between p-3 bg-slate-50 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <div className="text-blue-600">
              {WIDGET_TYPES[widget.type].icon}
            </div>
            <span className="font-medium text-slate-900 text-sm">{widget.title}</span>
          </div>
          
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              className="p-1 text-slate-400 hover:text-blue-600 transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                onConfigure();
              }}
              title="Configure"
            >
              <Settings size={14} />
            </button>
            <button
              className="p-1 text-slate-400 hover:text-red-500 transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                onRemove();
              }}
              title="Delete"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>

        {/* Widget Content */}
        <div className="h-full" style={{ height: 'calc(100% - 48px)' }}>
          {renderChart()}
        </div>
      </div>
    </div>
  );
};

// Widget Configuration Modal
const WidgetConfigModal = ({
  widget,
  template,
  onSave,
  onClose,
}: {
  widget: Widget;
  template: Template;
  onSave: (widget: Widget) => void;
  onClose: () => void;
}) => {
  const [config, setConfig] = React.useState(widget.config);
  const [newFilter, setNewFilter] = React.useState({ field: "", operator: "equals", value: "" });

  const compatibleFields = template.fields.filter(field => {
    const compatibleTypes = FIELD_COMPATIBILITY[field.field_type as keyof typeof FIELD_COMPATIBILITY] || [];
    return compatibleTypes.includes(widget.type);
  });

  const handleSave = () => {
    onSave({ ...widget, config });
  };

  const addFilter = () => {
    if (newFilter.field && newFilter.operator && newFilter.value) {
      setConfig(prev => ({
        ...prev,
        filters: [...(prev.filters || []), { ...newFilter }]
      }));
      setNewFilter({ field: "", operator: "equals", value: "" });
    }
  };

  const removeFilter = (index: number) => {
    setConfig(prev => ({
      ...prev,
      filters: prev.filters?.filter((_, i) => i !== index) || []
    }));
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 max-w-4xl w-full shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="mb-6">
          <h2 className="text-2xl font-semibold text-slate-900 mb-2">Configure Widget</h2>
          <p className="text-slate-600">Set up data sources and visualization options</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Data Configuration */}
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-slate-900 mb-3">Data Configuration</h3>
              
              {/* X-Axis Configuration */}
              {['line', 'area', 'bar', 'bar_horizontal', 'stacked', 'scatter', 'bubble', 'histogram'].includes(widget.type) && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-slate-700 mb-2">X-Axis Field</label>
                  <select
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={config.xAxis?.field || ""}
                    onChange={(e) => {
                      const field = e.target.value;
                      const fieldData = template.fields.find(f => f.field_key === field);
                      setConfig(prev => ({
                        ...prev,
                        xAxis: { field, label: fieldData?.label || field }
                      }));
                    }}
                  >
                    <option value="">Select X-Axis field</option>
                    {compatibleFields.map(field => (
                      <option key={field.field_key} value={field.field_key}>
                        {field.label} ({field.field_type})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Y-Axis Configuration */}
              {['line', 'area', 'bar', 'bar_horizontal', 'stacked', 'scatter', 'bubble', 'histogram', 'kpi', 'sum', 'count', 'percentage'].includes(widget.type) && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-slate-700 mb-2">Y-Axis / Value Field</label>
                  <select
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={config.yAxis?.field || config.valueField || ""}
                    onChange={(e) => {
                      const field = e.target.value;
                      const fieldData = template.fields.find(f => f.field_key === field);
                      if (['line', 'area', 'bar', 'bar_horizontal', 'stacked', 'scatter', 'bubble', 'histogram'].includes(widget.type)) {
                        setConfig(prev => ({
                          ...prev,
                          yAxis: { field, label: fieldData?.label || field }
                        }));
                      } else {
                        setConfig(prev => ({
                          ...prev,
                          valueField: field
                        }));
                      }
                    }}
                  >
                    <option value="">Select value field</option>
                    {compatibleFields.map(field => (
                      <option key={field.field_key} value={field.field_key}>
                        {field.label} ({field.field_type})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Aggregation */}
              {['kpi', 'sum', 'count', 'percentage'].includes(widget.type) && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-slate-700 mb-2">Aggregation</label>
                  <select
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={config.aggregation || "count"}
                    onChange={(e) => setConfig(prev => ({ ...prev, aggregation: e.target.value as any }))}
                  >
                    <option value="count">Count</option>
                    <option value="sum">Sum</option>
                    <option value="avg">Average</option>
                    <option value="min">Minimum</option>
                    <option value="max">Maximum</option>
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* Filters */}
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-slate-900 mb-3">Filters</h3>
              
              <div className="space-y-3 mb-4">
                {config.filters?.map((filter, index) => (
                  <div key={index} className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-slate-700">
                        {template.fields.find(f => f.field_key === filter.field)?.label}
                      </span>
                      <button
                        className="text-red-500 hover:text-red-700"
                        onClick={() => removeFilter(index)}
                      >
                        <XCircle size={16} />
                      </button>
                    </div>
                    <div className="text-xs text-slate-600">
                      {filter.operator}: {filter.value}
                    </div>
                  </div>
                ))}
              </div>

              {/* Add Filter */}
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <h4 className="text-sm font-medium text-slate-700 mb-3">Add Filter</h4>
                <div className="space-y-2">
                  <select
                    className="w-full border border-slate-300 rounded px-3 py-2 text-sm"
                    value={newFilter.field}
                    onChange={(e) => setNewFilter(prev => ({ ...prev, field: e.target.value }))}
                  >
                    <option value="">Select field</option>
                    {template.fields.map(field => (
                      <option key={field.field_key} value={field.field_key}>
                        {field.label}
                      </option>
                    ))}
                  </select>
                  
                  <select
                    className="w-full border border-slate-300 rounded px-3 py-2 text-sm"
                    value={newFilter.operator}
                    onChange={(e) => setNewFilter(prev => ({ ...prev, operator: e.target.value }))}
                  >
                    {FILTER_OPERATORS.map(op => (
                      <option key={op.value} value={op.value}>{op.label}</option>
                    ))}
                  </select>
                  
                  <input
                    type="text"
                    className="w-full border border-slate-300 rounded px-3 py-2 text-sm"
                    placeholder="Filter value"
                    value={newFilter.value}
                    onChange={(e) => setNewFilter(prev => ({ ...prev, value: e.target.value }))}
                  />
                  
                  <button
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded px-3 py-2 text-sm transition-colors"
                    onClick={addFilter}
                  >
                    Add Filter
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 flex gap-3 justify-end">
          <button
            className="px-6 py-2.5 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            onClick={handleSave}
          >
            Save Configuration
          </button>
        </div>
      </div>
    </div>
  );
};