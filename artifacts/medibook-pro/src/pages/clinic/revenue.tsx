import { TrendingUp, DollarSign } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Layout from "@/components/Layout";
import { useGetClinicStats, useListPayments } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";
import { formatCurrency, formatDate } from "@/lib/utils";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, LineChart, Line } from "recharts";

export default function ClinicRevenuePage() {
  const { user } = useAuth();
  const clinicId = (user as any)?.clinicId || 1;

  const { data: stats } = useGetClinicStats(clinicId, { query: { enabled: !!clinicId } });
  const { data: payments } = useListPayments({ params: { clinicId } });

  const s = stats as any;
  const paymentList = (payments as any[]) ?? [];

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Revenue</h1>
          <p className="text-muted-foreground text-sm">Track your clinic's earnings</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {[
            { label: "Total Revenue", value: formatCurrency(s?.totalRevenue || 0), icon: <DollarSign size={18} /> },
            { label: "Completed Appointments", value: s?.completedAppointments ?? "0", icon: <TrendingUp size={18} /> },
            { label: "Avg per Appointment", value: s?.completedAppointments && s?.totalRevenue ? formatCurrency(s.totalRevenue / s.completedAppointments) : "₹0", icon: <TrendingUp size={18} /> },
          ].map(item => (
            <Card key={item.label}>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">{item.icon}</div>
                <div>
                  <p className="text-xl font-bold">{item.value}</p>
                  <p className="text-xs text-muted-foreground">{item.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-base">Monthly Revenue Trend</CardTitle>
          </CardHeader>
          <CardContent>
            {s?.monthlyRevenue ? (
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={s.monthlyRevenue}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: number) => formatCurrency(v)} />
                  <Line type="monotone" dataKey="revenue" stroke="hsl(174 72% 40%)" strokeWidth={2} dot={{ fill: "hsl(174 72% 40%)", r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">No revenue data yet</div>
            )}
          </CardContent>
        </Card>

        {paymentList.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="text-base">Recent Transactions</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2">
                {paymentList.slice(0, 10).map((p: any) => (
                  <div key={p.id} className="flex items-center justify-between py-2 border-b last:border-0 text-sm">
                    <div>
                      <p className="font-medium">{p.purpose}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(p.createdAt)}</p>
                    </div>
                    <span className="font-semibold text-green-600">{formatCurrency(p.amount)}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}
