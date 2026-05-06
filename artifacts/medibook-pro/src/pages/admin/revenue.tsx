import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Layout from "@/components/Layout";
import { useGetAdminRevenue } from "@workspace/api-client-react";
import { formatCurrency } from "@/lib/utils";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell } from "recharts";

const COLORS = ["hsl(174 72% 40%)", "hsl(222 47% 35%)", "hsl(38 92% 50%)"];

export default function AdminRevenuePage() {
  const { data: revenue } = useGetAdminRevenue({});
  const r = revenue as any;

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Revenue Reports</h1>
          <p className="text-muted-foreground text-sm">Platform-wide financial overview</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardContent className="p-4">
              <p className="text-2xl font-bold">{r?.totalRevenue != null ? formatCurrency(r.totalRevenue) : "-"}</p>
              <p className="text-xs text-muted-foreground mt-1">Total Platform Revenue</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-2xl font-bold">{r?.byPlan?.reduce((s: number, p: any) => s + p.count, 0) ?? "-"}</p>
              <p className="text-xs text-muted-foreground mt-1">Total Transactions</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-2xl font-bold">{r?.byPlan?.find((p: any) => p.plan === "premium")?.count ?? 0} Premium</p>
              <p className="text-xs text-muted-foreground mt-1">Active Premium Clinics</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <CardHeader><CardTitle className="text-base">Monthly Revenue</CardTitle></CardHeader>
            <CardContent>
              {r?.monthlyData ? (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={r.monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(v: number) => formatCurrency(v)} />
                    <Bar dataKey="revenue" fill="hsl(174 72% 40%)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">No data</div>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Revenue by Plan</CardTitle></CardHeader>
            <CardContent>
              {r?.byPlan && r.byPlan.some((p: any) => p.revenue > 0) ? (
                <>
                  <ResponsiveContainer width="100%" height={160}>
                    <PieChart>
                      <Pie data={r.byPlan.filter((p: any) => p.revenue > 0)} dataKey="revenue" nameKey="plan" cx="50%" cy="50%" outerRadius={60}>
                        {r.byPlan.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={(v: number) => formatCurrency(v)} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-1.5 mt-2">
                    {r.byPlan.map((p: any, i: number) => (
                      <div key={p.plan} className="flex justify-between text-sm">
                        <span className="flex items-center gap-1.5 capitalize">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                          {p.plan}
                        </span>
                        <span className="font-medium">{formatCurrency(p.revenue)}</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : <p className="text-muted-foreground text-sm text-center py-8">No revenue yet</p>}
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
