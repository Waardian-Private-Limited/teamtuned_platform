"use client";

import React from "react";
import { apiClient } from "@/lib/apiClient";
import { Loader2, TrendingUp, Users, Clock, AlertCircle, CheckCircle, XCircle, BarChart3, MapPin, Calendar, Zap, Activity, Shield } from "lucide-react";

import { useAuth } from "@/context/AuthContext";
type TrendsEntry = { date: string; pending?: number; submitted?: number; in_review?: number; approved?: number; rejected?: number };
type SiteRow = { site_name: string | null; approved: number; pending: number; rejected: number };
type AnalyticsResponse = {
  trend: Array<{ day: string; status: string; cnt: number }>;
  sitePerformance: Array<{ site_name: string | null; approved: number; pending: number; rejected: number }>;
  recurrence: Array<{ bucket: string; cnt: number }>;
  productivity: Array<{ user_id: number; first_name: string | null; last_name: string | null; day: string; cnt: number }>;
  bottlenecks: Array<{ approver_id: number; first_name: string | null; last_name: string | null; avg_hours: number }>;
  lifecycle: Array<{ submission_id: number; assign_to_submit_hours: number | null; submit_to_approve_hours: number | null }>;
  tasksCounts?: { total: number; active: number; paused: number; cancelled: number };
  assignmentCounts?: { assigned: number; pending: number; approved: number; rejected: number };
};

export default function TaskDashboard({ scope = "org" }: { scope?: "org" | "my" }) {
  const { role, permissions, user, employee } = useAuth();
  const [loading, setLoading] = React.useState<boolean>(true);
  const [error, setError] = React.useState<string>("");
  const [tasksCounts, setTasksCounts] = React.useState<{ total: number; active: number; paused: number; cancelled: number }>({ total: 0, active: 0, paused: 0, cancelled: 0 });
  const [assignCounts, setAssignCounts] = React.useState<{ assigned: number; pending: number; approved: number; rejected: number }>({ assigned: 0, pending: 0, approved: 0, rejected: 0 });
  const [trends, setTrends] = React.useState<TrendsEntry[]>([]);
  const [sites, setSites] = React.useState<SiteRow[]>([]);
  const [recurrence, setRecurrence] = React.useState<Array<{ bucket: string; cnt: number }>>([]);
  const [productivity, setProductivity] = React.useState<AnalyticsResponse["productivity"]>([]);
  const [bottlenecks, setBottlenecks] = React.useState<AnalyticsResponse["bottlenecks"]>([]);
  const [lifecycle, setLifecycle] = React.useState<AnalyticsResponse["lifecycle"]>([]);

  // Permission state
  const [userRole, setUserRole] = React.useState<string | null>(null);const [checkingPerms, setCheckingPerms] = React.useState(true);

  React.useEffect(() => {
    (async () => {
      try {
        // Session fetch removed (using useAuth)
        const session = { authenticated: true, role: role, employee: { permissions } };
        if (session?.authenticated) {
          setUserRole(session.role);
          // setPermissions(session.employee?.permissions || []);
        }
      } catch (_) { } finally {
        setCheckingPerms(false);
      }
    })();
  }, []);

  const isOrgAdmin = (userRole || "").toLowerCase() === "orgadmin";
  const canView = isOrgAdmin || permissions.includes("TASK_VIEW");

  const load = React.useCallback(async () => {
    if (!canView) return;
    setLoading(true);
    setError("");
    try {
      const data = await apiClient<AnalyticsResponse>(`/tasks/analytics?days=14`, { method: "GET", withAuth: true });

      // Handle the API response data properly
      const tc = data?.tasksCounts || { total: 0, active: 0, paused: 0, cancelled: 0 };
      const ac = data?.assignmentCounts || { assigned: 0, pending: 0, approved: 0, rejected: 0 };
      const tr = normalizeTrend(data?.trend || []);
      const sw = data?.sitePerformance || [];

      // Convert string numbers to actual numbers
      setTasksCounts({
        total: Number(tc.total || 0),
        active: Number(tc.active || 0),
        paused: Number(tc.paused || 0),
        cancelled: Number(tc.cancelled || 0)
      });
      setAssignCounts({
        assigned: Number(ac.assigned || 0),
        pending: Number(ac.pending || 0),
        approved: Number(ac.approved || 0),
        rejected: Number(ac.rejected || 0)
      });
      setTrends(tr);
      setSites(sw.map(site => ({
        site_name: site.site_name,
        approved: Number(site.approved || 0),
        pending: Number(site.pending || 0),
        rejected: Number(site.rejected || 0)
      })));
      setRecurrence(data?.recurrence || []);
      setProductivity(data?.productivity || []);
      setBottlenecks(data?.bottlenecks || []);
      setLifecycle(data?.lifecycle || []);
    } catch (e: any) {
      setError(e?.message || "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  }, [scope, canView]);

  React.useEffect(() => {
    if (!checkingPerms && canView) {
      load();
    }
  }, [load, checkingPerms, canView]);

  const StatCard = ({ title, value, icon: Icon, trend, color, subtitle }: { title: string; value: number | string; icon: any; trend?: string; color: string; subtitle?: string }) => (
    <div className={`rounded-2xl p-6 relative overflow-hidden group transition-all duration-300 hover:scale-105 hover:shadow-2xl ${color}`}>
      <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-16 translate-x-16 group-hover:scale-110 transition-transform duration-500"></div>
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <div className={`p-3 rounded-xl bg-white/20 backdrop-blur-sm`}>
            <Icon className="w-6 h-6 text-white" />
          </div>
          {trend && <span className="text-sm font-medium text-white/80 bg-white/20 px-2 py-1 rounded-full">{trend}</span>}
        </div>
        <div className="text-3xl font-bold text-white mb-1">{value}</div>
        <div className="text-white/90 font-medium">{title}</div>
        {subtitle && <div className="text-white/70 text-sm mt-1">{subtitle}</div>}
      </div>
    </div>
  );

  const StatusCard = ({ title, value, status, color, trend }: { title: string; value: number | string; status: string; color: string; trend?: string }) => (
    <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300 group">
      <div className="flex items-center justify-between mb-3">
        <span className={`w-3 h-3 rounded-full ${color} group-hover:scale-110 transition-transform duration-300`}></span>
        <div className="flex items-center gap-2">
          {trend && <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded-full">{trend}</span>}
          <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded-full">{status}</span>
        </div>
      </div>
      <div className="text-2xl font-bold text-gray-900 mb-1">{value}</div>
      <div className="text-sm text-gray-600">{title}</div>
    </div>
  );

  const maxTrend = React.useMemo(() => {
    let m = 0;
    for (const t of trends) {
      const sum = (Number(t.pending || 0) + Number(t.submitted || 0) + Number(t.in_review || 0) + Number(t.approved || 0) + Number(t.rejected || 0));
      if (sum > m) m = sum;
    }
    return m || 1;
  }, [trends]);

  function normalizeTrend(rows: AnalyticsResponse["trend"]) {
    const byDay: Record<string, TrendsEntry> = {};
    for (const r of rows) {
      const d = r.day.split('T')[0]; // Extract just the date part
      if (!byDay[d]) byDay[d] = { date: d } as TrendsEntry;
      (byDay[d] as any)[r.status as keyof TrendsEntry] = Number(r.cnt || 0);
    }
    return Object.keys(byDay).sort().map((k) => byDay[k]);
  }

  function formatDate(d: string) {
    try {
      const date = new Date(d);
      return date.toLocaleDateString(undefined, { month: "short", day: "2-digit" });
    } catch {
      return d;
    }
  }

  function percentile(arr: number[], p: number) {
    if (!arr.length) return 0;
    const a = [...arr].sort((x, y) => x - y);
    const idx = (p / 100) * (a.length - 1);
    const lo = Math.floor(idx);
    const hi = Math.ceil(idx);
    if (lo === hi) return a[lo];
    const w = idx - lo;
    return a[lo] * (1 - w) + a[hi] * w;
  }

  // Calculate additional metrics
  const totalAssignments = assignCounts.assigned + assignCounts.pending + assignCounts.approved + assignCounts.rejected;
  const approvalRate = totalAssignments > 0 ? Math.round((assignCounts.approved / totalAssignments) * 100) : 0;
  const avgBottleneckTime = bottlenecks.length > 0
    ? bottlenecks.reduce((sum, b) => sum + Number(b.avg_hours || 0), 0) / bottlenecks.length
    : 0;

  if (checkingPerms) return <div className="p-8 text-center text-gray-500">Checking access...</div>;

  if (!canView) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] p-8 text-center text-gray-500">
        <Shield size={48} className="mb-4 text-gray-300" />
        <h2 className="text-xl font-semibold text-gray-900">Access Denied</h2>
        <p className="mt-2">You do not have permission to view task dashboard.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50/30 p-4 lg:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Task Dashboard</h1>
            <p className="text-gray-600 mt-2">Real-time insights and performance metrics</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-2xl border border-gray-200 shadow-sm">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium text-gray-700">Live Data</span>
            </div>
            {loading && (
              <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-2xl border border-gray-200 shadow-sm">
                <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                <span className="text-sm font-medium text-gray-700">Updating...</span>
              </div>
            )}
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <div className="text-red-700 font-medium">{error}</div>
          </div>
        )}

        {/* Main Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Total Tasks"
            value={tasksCounts.total}
            icon={BarChart3}
            trend={tasksCounts.total > 0 ? "+12%" : "New"}
            color="bg-gradient-to-br from-blue-600 to-blue-700"
            subtitle="All tasks"
          />
          <StatCard
            title="Active Tasks"
            value={tasksCounts.active}
            icon={Zap}
            trend="Active"
            color="bg-gradient-to-br from-green-600 to-green-700"
            subtitle="In progress"
          />
          <StatCard
            title="Approval Rate"
            value={`${approvalRate}%`}
            icon={CheckCircle}
            trend="Success"
            color="bg-gradient-to-br from-emerald-600 to-emerald-700"
            subtitle="Completion rate"
          />
          <StatCard
            title="Team Members"
            value={productivity.length}
            icon={Users}
            trend="Online"
            color="bg-gradient-to-br from-purple-600 to-purple-700"
            subtitle="Active users"
          />
        </div>

        {/* Status Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatusCard
            title="Assigned"
            value={assignCounts.assigned}
            status="Ready"
            color="bg-blue-500"
            trend={assignCounts.assigned > 0 ? "Active" : "Ready"}
          />
          <StatusCard
            title="Pending"
            value={assignCounts.pending}
            status="Waiting"
            color="bg-amber-500"
            trend={assignCounts.pending > 0 ? "Review" : "Clear"}
          />
          <StatusCard
            title="Approved"
            value={assignCounts.approved}
            status="Completed"
            color="bg-green-500"
            trend="Done"
          />
          <StatusCard
            title="Rejected"
            value={assignCounts.rejected}
            status="Issues"
            color="bg-red-500"
            trend={assignCounts.rejected > 0 ? "Alert" : "Clear"}
          />
        </div>

        {/* Charts and Analytics Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Trend Chart */}
          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Task Completion Trend</h3>
                <p className="text-sm text-gray-600">Last 14 days performance</p>
              </div>
              <TrendingUp className="w-5 h-5 text-blue-600" />
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-2 mb-4">
              <span className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 text-xs">
                <span className="w-2 h-2 rounded-full bg-amber-500"></span>Pending
              </span>
              <span className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 text-xs">
                <span className="w-2 h-2 rounded-full bg-blue-500"></span>Submitted
              </span>
              <span className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-green-50 text-green-700 text-xs">
                <span className="w-2 h-2 rounded-full bg-green-500"></span>Approved
              </span>
              <span className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-red-50 text-red-700 text-xs">
                <span className="w-2 h-2 rounded-full bg-red-500"></span>Rejected
              </span>
            </div>

            <div className="h-64">
              {trends.length === 0 && (
                <div className="h-full flex items-center justify-center text-gray-500 bg-gray-50 rounded-lg">
                  <div className="text-center">
                    <Activity className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <div>No trend data available</div>
                    <div className="text-sm text-gray-400">Data will appear as tasks are completed</div>
                  </div>
                </div>
              )}
              {trends.length > 0 && (
                <div className="h-full flex flex-col">
                  <div className="flex-1 relative">
                    <svg viewBox={`0 0 ${Math.max(trends.length * 50, 400)} 200`} className="w-full h-full" preserveAspectRatio="xMidYMid meet">
                      {/* Grid lines */}
                      {[0, 25, 50, 75, 100].map((line, i) => (
                        <line
                          key={i}
                          x1="0"
                          y1={200 - line * 2}
                          x2={trends.length * 50}
                          y2={200 - line * 2}
                          stroke="#f3f4f6"
                          strokeWidth="1"
                        />
                      ))}

                      {/* Y-axis labels */}
                      {[0, 25, 50, 75, 100].map((line, i) => (
                        <text key={`ly-${i}`} x="4" y={200 - line * 2 - 4} fontSize="10" fill="#9ca3af">
                          {Math.round((line / 100) * maxTrend)}
                        </text>
                      ))}

                      {/* Trend lines */}
                      {([
                        { key: 'pending', color: '#f59e0b', label: 'Pending' },
                        { key: 'submitted', color: '#3b82f6', label: 'Submitted' },
                        { key: 'approved', color: '#22c55e', label: 'Approved' },
                        { key: 'rejected', color: '#ef4444', label: 'Rejected' }
                      ] as const).map((series) => {
                        const points = trends.map((t, idx) => {
                          const x = idx * 50 + 25;
                          const val = Number((t as any)[series.key] || 0);
                          const y = 180 - Math.min(160, Math.round((val / maxTrend) * 160));
                          return `${x},${y}`;
                        }).join(" ");

                        return (
                          <g key={series.key}>
                            <polyline
                              points={points}
                              fill="none"
                              stroke={series.color}
                              strokeWidth="3"
                              strokeLinecap="round"
                            />
                            {/* Dots */}
                            {trends.map((t, idx) => {
                              const x = idx * 50 + 25;
                              const val = Number((t as any)[series.key] || 0);
                              if (val === 0) return null;
                              const y = 180 - Math.min(160, Math.round((val / maxTrend) * 160));
                              return (
                                <circle
                                  key={idx}
                                  cx={x}
                                  cy={y}
                                  r="4"
                                  fill={series.color}
                                  stroke="#ffffff"
                                  strokeWidth="1.5"
                                  className="hover:r-6 transition-all duration-200"
                                />
                              );
                            })}
                          </g>
                        );
                      })}
                    </svg>
                  </div>

                  {/* X-axis labels */}
                  <div className="flex justify-between mt-4 pt-4 border-t border-gray-100 overflow-x-auto">
                    {trends.map((t, idx) => (
                      <div key={idx} className="text-center flex-shrink-0" style={{ width: '50px' }}>
                        <div className="text-xs text-gray-600 font-medium">{formatDate(t.date)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Site Performance */}
          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Site Performance</h3>
                <p className="text-sm text-gray-600">Approval rates by location</p>
              </div>
              <MapPin className="w-5 h-5 text-green-600" />
            </div>
            <div className="space-y-4">
              {sites.length === 0 && (
                <div className="text-center text-gray-500 py-8 bg-gray-50 rounded-lg">
                  <MapPin className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <div>No site data available</div>
                </div>
              )}
              {sites.map((s, i) => {
                const total = s.approved + s.pending + s.rejected || 1;
                const approvedPct = Math.round((s.approved / total) * 100);
                const performanceColor = approvedPct >= 80 ? 'text-green-600' : approvedPct >= 60 ? 'text-amber-600' : 'text-red-600';

                return (
                  <div key={i} className="flex items-center justify-between p-4 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors duration-200 group">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                        <MapPin className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">{s.site_name || 'Unassigned'}</div>
                        <div className="text-xs text-gray-600">{total} total tasks</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`font-semibold text-lg ${performanceColor}`}>{approvedPct}%</div>
                      <div className="text-xs text-gray-600">Success rate</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Recurrence Load */}
          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Task Frequency</h3>
                <p className="text-sm text-gray-600">Distribution by recurrence</p>
              </div>
              <Calendar className="w-5 h-5 text-purple-600" />
            </div>
            <div className="flex items-center justify-center">
              {recurrence.length === 0 && (
                <div className="text-gray-500 py-8 bg-gray-50 rounded-lg w-full text-center">
                  <Calendar className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <div>No recurrence data</div>
                </div>
              )}
              {recurrence.length > 0 && (() => {
                const total = recurrence.reduce((acc, r) => acc + Number(r.cnt || 0), 0) || 1;
                const colors: Record<string, string> = {
                  daily: '#3b82f6',
                  weekly: '#f59e0b',
                  monthly: '#22c55e',
                  one_time: '#8b5cf6'
                };

                return (
                  <div className="flex flex-col lg:flex-row items-center gap-8 w-full">
                    <div className="relative">
                      <svg viewBox="0 0 100 100" className="w-32 h-32">
                        {recurrence.map((r, i, arr) => {
                          const percentage = (Number(r.cnt || 0) / total) * 100;
                          const offset = arr.slice(0, i).reduce((acc, curr) => acc + (Number(curr.cnt || 0) / total) * 100, 0);

                          return (
                            <circle
                              key={r.bucket}
                              cx="50"
                              cy="50"
                              r="40"
                              fill="none"
                              stroke={colors[(r.bucket || '').toLowerCase()] || '#9ca3af'}
                              strokeWidth="8"
                              strokeDasharray={`${percentage} ${100 - percentage}`}
                              strokeDashoffset={-offset}
                              transform="rotate(-90 50 50)"
                            />
                          );
                        })}
                      </svg>
                    </div>
                    <div className="space-y-3 flex-1">
                      {recurrence.map((r, i) => {
                        const percentage = Math.round((Number(r.cnt || 0) / total) * 100);
                        return (
                          <div key={i} className="flex items-center justify-between gap-4 p-2 rounded-lg hover:bg-gray-50 transition-colors duration-200">
                            <div className="flex items-center gap-3">
                              <div
                                className="w-4 h-4 rounded-full"
                                style={{ backgroundColor: colors[(r.bucket || '').toLowerCase()] || '#9ca3af' }}
                              ></div>
                              <span className="text-sm font-medium text-gray-700 capitalize">{r.bucket}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-gray-900 font-semibold">{r.cnt}</span>
                              <span className="text-xs text-gray-500">({percentage}%)</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>

          {/* Productivity Heatmap */}
          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Team Productivity</h3>
                <p className="text-sm text-gray-600">Daily task completion</p>
              </div>
              <Users className="w-5 h-5 text-amber-600" />
            </div>
            <div className="max-h-64 overflow-y-auto">
              {productivity.length === 0 && (
                <div className="text-center text-gray-500 py-8 bg-gray-50 rounded-lg">
                  <Users className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <div>No productivity data available</div>
                </div>
              )}
              {productivity.length > 0 && (() => {
                const days = Array.from(new Set(productivity.map(p => p.day.split('T')[0]))).sort().slice(-7); // Last 7 days
                const users = Array.from(new Set(productivity.map(p => `${p.user_id}|${p.first_name || ''}|${p.last_name || ''}`)));
                const grid: Record<string, number> = {};

                for (const p of productivity) {
                  const day = p.day.split('T')[0];
                  grid[`${p.user_id}|${day}`] = Number(p.cnt || 0);
                }

                const maxVal = Math.max(...Object.values(grid).map(v => Number(v || 0))) || 1;

                return (
                  <div className="space-y-3">
                    {users.slice(0, 6).map((u) => {
                      const [uid, fn, ln] = u.split('|');
                      const name = `${fn} ${ln}`.trim() || `User ${uid}`;

                      return (
                        <div key={u} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors duration-200">
                          <div className="w-28 text-sm font-medium text-gray-700 truncate">{name}</div>
                          <div className="flex gap-1 flex-1">
                            {days.map((d) => {
                              const v = grid[`${uid}|${d}`] || 0;
                              const intensity = Math.round((v / maxVal) * 100);
                              const bg = intensity > 75 ? 'bg-green-500' :
                                intensity > 50 ? 'bg-green-400' :
                                  intensity > 25 ? 'bg-green-300' : 'bg-green-100';
                              const title = `${formatDate(d)}: ${v} task${v !== 1 ? 's' : ''}`;

                              return (
                                <div
                                  key={`${u}-${d}`}
                                  className={`flex-1 h-6 rounded ${bg} transition-all duration-300 hover:scale-110 relative group`}
                                  title={title}
                                >
                                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                    <span className="text-xs font-medium text-white drop-shadow-md">{v}</span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          </div>
        </div>

        {/* Bottom Row - Full Width */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Approval Bottlenecks */}
          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Approval Bottlenecks</h3>
                <p className="text-sm text-gray-600">Average approval time by approver</p>
              </div>
              <Clock className="w-5 h-5 text-red-600" />
            </div>
            <div className="space-y-4">
              {bottlenecks.length === 0 && (
                <div className="text-center text-gray-500 py-8 bg-gray-50 rounded-lg">
                  <Clock className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <div>No bottleneck data available</div>
                </div>
              )}
              {bottlenecks.map((b, i) => {
                const name = `${b.first_name || ''} ${b.last_name || ''}`.trim() || `Approver ${b.approver_id}`;
                const val = Number(b.avg_hours || 0);
                const max = Math.max(...bottlenecks.map(x => Number(x.avg_hours || 0))) || 1;
                const pct = Math.min(100, Math.round((val / max) * 100));
                const severity = val > 48 ? 'high' : val > 24 ? 'medium' : 'low';
                const severityColor = severity === 'high' ? 'bg-red-500' : severity === 'medium' ? 'bg-amber-500' : 'bg-green-500';
                const severityText = severity === 'high' ? 'text-red-600' : severity === 'medium' ? 'text-amber-600' : 'text-green-600';

                return (
                  <div key={i} className="space-y-2 p-3 rounded-lg hover:bg-gray-50 transition-colors duration-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                          <Users className="w-5 h-5 text-red-600" />
                        </div>
                        <div>
                          <span className="font-medium text-gray-900">{name}</span>
                          <div className="text-xs text-gray-500">Approver ID: {b.approver_id}</div>
                        </div>
                      </div>
                      <span className={`text-lg font-semibold ${severityText}`}>
                        {val.toFixed(1)}h
                      </span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2.5">
                      <div
                        className={`h-2.5 rounded-full transition-all duration-500 ${severityColor}`}
                        style={{ width: `${pct}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Task Lifecycle */}
          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Task Lifecycle</h3>
                <p className="text-sm text-gray-600">Time distribution analysis</p>
              </div>
              <BarChart3 className="w-5 h-5 text-blue-600" />
            </div>
            <div className="space-y-6">
              {lifecycle.length === 0 && (
                <div className="text-center text-gray-500 py-8 bg-gray-50 rounded-lg">
                  <BarChart3 className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <div>No lifecycle data available</div>
                </div>
              )}
              {lifecycle.length > 0 && (() => {
                const assignToSubmit = lifecycle.map(l => Number(l.assign_to_submit_hours || 0)).filter(v => Number.isFinite(v));
                const submitToApprove = lifecycle.map(l => Number(l.submit_to_approve_hours || 0)).filter(v => Number.isFinite(v));
                const series = [
                  { label: 'Assignment to Submission', data: assignToSubmit, color: 'bg-blue-500', textColor: 'text-blue-600' },
                  { label: 'Submission to Approval', data: submitToApprove, color: 'bg-green-500', textColor: 'text-green-600' },
                ];

                return (
                  <>
                    {series.map((s, i) => {
                      if (s.data.length === 0) return null;

                      const min = Math.min(...s.data);
                      const max = Math.max(...s.data);
                      const med = percentile(s.data, 50);
                      const avg = s.data.reduce((a, b) => a + b, 0) / s.data.length;

                      return (
                        <div key={i} className="space-y-3 p-4 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors duration-200">
                          <div className="flex items-center justify-between">
                            <span className={`text-sm font-medium ${s.textColor}`}>{s.label}</span>
                            <span className="text-sm text-gray-600">Avg: {avg.toFixed(1)}h</span>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="flex-1 bg-gray-200 rounded-full h-3 overflow-hidden">
                              <div
                                className={`h-3 rounded-full ${s.color} transition-all duration-1000`}
                                style={{ width: `${Math.min(100, (med / (max || 1)) * 100)}%` }}
                              ></div>
                            </div>
                            <div className="text-xs text-gray-600 w-20 text-right">
                              Med: {med.toFixed(1)}h
                            </div>
                          </div>
                          <div className="flex justify-between text-xs text-gray-500">
                            <span>Min: {min.toFixed(1)}h</span>
                            <span>Max: {max.toFixed(1)}h</span>
                          </div>
                        </div>
                      );
                    })}
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}