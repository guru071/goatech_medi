import { TrendingUp, Calendar, Users, Star, Clock, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Layout from "@/components/Layout";
import { useGetClinicStats, useListAppointments } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";
import { formatCurrency, formatDate, formatTime, getStatusColor, cn } from "@/lib/utils";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { Link } from "wouter";

export default function ClinicDashboardPage() {
  const { user } = useAuth();
  const clinicId = (user as any)?.clinicId || 1;

  const { data: stats } = useGetClinicStats(clinicId, { query: { enabled: !!clinicId } });
  const { data: appts } = useListAppointments({ params: { clinicId, limit: 5 } });

  const s = stats as any;
  const apptList = (appts as any[]) ?? [];

  const statCards = [
    { label: "Total Appointments", value: s?.totalAppointments ?? "-", icon: <Calendar size={18} />, color: "text-teal-600", bg: "bg-teal-50" },
    { label: "Today's Appointments", value: s?.todayAppointments ?? "-", icon: <Clock size={18} />, color: "text-blue-600", bg: "bg-blue-50" },
    { label: "Total Patients", value: s?.totalPatients ?? "-", icon: <Users size={18} />, color: "text-purple-600", bg: "bg-purple-50" },
    { label: "Total Revenue", value: s?.totalRevenue != null ? formatCurrency(s.totalRevenue) : "-", icon: <TrendingUp size={18} />, color: "text-green-600", bg: "bg-green-50" },
    { label: "Avg Rating", value: s?.averageRating ? `${parseFloat(s.averageRating).toFixed(1)}/5` : "No ratings", icon: <Star size={18} />, color: "text-amber-600", bg: "bg-amber-50" },
    { label: "Completed", value: s?.completedAppointments ?? "-", icon: <Calendar size={18} />, color: "text-green-600", bg: "bg-green-50" },
  ];

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">Clinic Dashboard</h1>
            <p className="text-muted-foreground text-sm">Overview of your clinic performance</p>
          </div>
          <Link href="/clinic/appointments">
            <Button variant="outline" size="sm" className="gap-1">View All <ChevronRight size={14} /></Button>
          </Link>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          {statCards.map(s => (
            <Card key={s.label} className="relative overflow-hidden">
              <CardContent className="p-4">
                <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center mb-3", s.bg, s.color)}>
                  {s.icon}
                </div>
                <p className="text-2xl font-bold truncate">{s.value}</p>
                <p className="text-xs text-muted-foreground mt-0.5 leading-tight">{s.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Charts + Recent Appointments */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Revenue Chart */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Monthly Revenue</CardTitle>
              </CardHeader>
              <CardContent>
                {s?.monthlyRevenue ? (
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={s.monthlyRevenue}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                      <XAxis dataKey="month" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} />
                      <Tooltip formatter={(v: number) => formatCurrency(v)} />
                      <Bar dataKey="revenue" fill="hsl(174 72% 40%)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">No revenue data yet</div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Recent Appointments */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex justify-between items-center">
                <CardTitle className="text-base">Recent Appointments</CardTitle>
                <Link href="/clinic/appointments"><span className="text-xs text-primary hover:underline cursor-pointer">View all</span></Link>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {apptList.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-4">No appointments yet</p>
              ) : apptList.map((a: any) => (
                <div key={a.id} className="flex items-center gap-2 py-1.5 border-b last:border-0">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 text-xs font-bold text-primary">#{a.tokenNumber}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{a.patientName}</p>
                    <p className="text-xs text-muted-foreground">{formatTime(a.appointmentTime)}</p>
                  </div>
                  <Badge variant="outline" className={cn("text-[10px] flex-shrink-0", getStatusColor(a.status))}>{a.status}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
