import { Building2, Users, Calendar, DollarSign, AlertCircle, TrendingUp, Clock, CheckCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Layout from "@/components/Layout";
import { useGetAdminDashboard } from "@workspace/api-client-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { Link } from "wouter";
import { cn } from "@/lib/utils";

const COLORS = ["hsl(174 72% 40%)", "hsl(222 47% 35%)", "hsl(38 92% 50%)", "hsl(0 84% 60%)"];

export default function AdminDashboardPage() {
  const { data: dashboard, isLoading } = useGetAdminDashboard();
  const d = dashboard as any;

  const statCards = [
    { label: "Total Clinics", value: d?.totalClinics, icon: <Building2 size={18} />, color: "text-teal-600", bg: "bg-teal-50", href: "/admin/clinics" },
    { label: "Pending Approval", value: d?.pendingClinics, icon: <Clock size={18} />, color: "text-amber-600", bg: "bg-amber-50", href: "/admin/clinics?status=pending" },
    { label: "Total Patients", value: d?.totalPatients, icon: <Users size={18} />, color: "text-blue-600", bg: "bg-blue-50", href: "/admin/users" },
    { label: "Total Appointments", value: d?.totalAppointments, icon: <Calendar size={18} />, color: "text-purple-600", bg: "bg-purple-50" },
    { label: "Total Revenue", value: d?.totalRevenue != null ? formatCurrency(d.totalRevenue) : "-", icon: <DollarSign size={18} />, color: "text-green-600", bg: "bg-green-50", href: "/admin/revenue" },
    { label: "Open Complaints", value: d?.openComplaints, icon: <AlertCircle size={18} />, color: "text-red-600", bg: "bg-red-50", href: "/admin/complaints" },
    { label: "Active Subscriptions", value: d?.activeSubscriptions, icon: <CheckCircle size={18} />, color: "text-teal-600", bg: "bg-teal-50" },
    { label: "Today's Bookings", value: d?.todayAppointments, icon: <Calendar size={18} />, color: "text-blue-600", bg: "bg-blue-50" },
  ];

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground text-sm">Platform overview and management</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {statCards.map(s => (
            <Card key={s.label} className={cn("hover:shadow-md transition-all", s.href && "cursor-pointer")}>
              <CardContent className="p-4">
                {s.href ? (
                  <Link href={s.href}>
                    <div>
                      <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center mb-3", s.bg, s.color)}>{s.icon}</div>
                      <p className="text-xl font-bold">{isLoading ? "-" : s.value ?? "-"}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
                    </div>
                  </Link>
                ) : (
                  <div>
                    <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center mb-3", s.bg, s.color)}>{s.icon}</div>
                    <p className="text-xl font-bold">{isLoading ? "-" : s.value ?? "-"}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Revenue by Plan */}
          {d?.revenueByPlan && (
            <Card>
              <CardHeader><CardTitle className="text-base">Revenue by Plan</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie data={d.revenueByPlan.filter((p: any) => p.revenue > 0)} dataKey="revenue" nameKey="plan" cx="50%" cy="50%" outerRadius={60} label={({ plan }: any) => plan}>
                      {d.revenueByPlan.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v: number) => formatCurrency(v)} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-1 mt-2">
                  {d.revenueByPlan.map((p: any, i: number) => (
                    <div key={p.plan} className="flex justify-between text-xs">
                      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />{p.plan}</span>
                      <span className="font-medium">{p.count} active · {formatCurrency(p.revenue)}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Recent Clinics */}
          {d?.recentClinics && (
            <Card className="lg:col-span-2">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Recent Clinics</CardTitle>
                  <Link href="/admin/clinics"><span className="text-xs text-primary hover:underline cursor-pointer">View all</span></Link>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {d.recentClinics.map((c: any) => (
                    <div key={c.id} className="flex items-center justify-between gap-2 py-1.5 border-b last:border-0">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{c.name}</p>
                        <p className="text-xs text-muted-foreground">{c.city} · {formatDate(c.createdAt)}</p>
                      </div>
                      <Badge variant="outline" className={cn("text-xs flex-shrink-0",
                        c.status === "approved" ? "bg-green-50 text-green-700 border-green-200" :
                        c.status === "pending" ? "bg-amber-50 text-amber-700 border-amber-200" :
                        "bg-red-50 text-red-700 border-red-200"
                      )}>{c.status}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </Layout>
  );
}
