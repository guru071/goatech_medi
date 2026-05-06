import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Layout from "@/components/Layout";
import { useGetBookingAnalytics } from "@workspace/api-client-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell } from "recharts";

const COLORS = ["hsl(174 72% 40%)", "hsl(38 92% 50%)", "hsl(142 71% 45%)", "hsl(0 84% 60%)", "hsl(222 47% 55%)"];

export default function AdminAnalyticsPage() {
  const { data: analytics } = useGetBookingAnalytics({});
  const a = analytics as any;

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Booking Analytics</h1>
          <p className="text-muted-foreground text-sm">Platform-wide booking trends and statistics</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <CardHeader><CardTitle className="text-base">Daily Bookings (Last 30 Days)</CardTitle></CardHeader>
            <CardContent>
              {a?.dailyBookings?.length > 0 ? (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={a.dailyBookings}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={d => d.slice(5)} />
                    <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip />
                    <Bar dataKey="count" fill="hsl(174 72% 40%)" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">No booking data yet</div>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Appointments by Status</CardTitle></CardHeader>
            <CardContent>
              {a?.byStatus?.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height={160}>
                    <PieChart>
                      <Pie data={a.byStatus} dataKey="count" nameKey="status" cx="50%" cy="50%" outerRadius={60}>
                        {a.byStatus.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-1.5 mt-2">
                    {a.byStatus.map((s: any, i: number) => (
                      <div key={s.status} className="flex justify-between text-sm">
                        <span className="flex items-center gap-1.5 capitalize">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                          {s.status}
                        </span>
                        <span className="font-medium">{s.count}</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : <p className="text-muted-foreground text-sm text-center py-8">No data yet</p>}
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
