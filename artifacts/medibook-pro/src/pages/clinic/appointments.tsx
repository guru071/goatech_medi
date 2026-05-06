import { useState } from "react";
import { Calendar, CheckCircle, X, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import Layout from "@/components/Layout";
import { useListAppointments, useCancelAppointment, useCompleteAppointment, getListAppointmentsQueryKey } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";
import { formatDate, formatTime, formatCurrency, getStatusColor, cn } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

export default function ClinicAppointmentsPage() {
  const { user } = useAuth();
  const clinicId = (user as any)?.clinicId || 1;
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [statusFilter, setStatusFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");

  const { data: appointments, isLoading } = useListAppointments({
    params: { clinicId, status: statusFilter || undefined, date: dateFilter || undefined, limit: 100 }
  });
  const cancelMutation = useCancelAppointment();
  const completeMutation = useCompleteAppointment();

  const apptList = (appointments as any[]) ?? [];
  const invalidate = () => queryClient.invalidateQueries({ queryKey: getListAppointmentsQueryKey() });

  const handleComplete = async (id: number) => {
    await completeMutation.mutateAsync({ id });
    invalidate();
    toast({ title: "Marked as completed" });
  };

  const handleCancel = async (id: number) => {
    if (!confirm("Cancel this appointment?")) return;
    await cancelMutation.mutateAsync({ id });
    invalidate();
    toast({ title: "Appointment cancelled" });
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">Appointments</h1>
            <p className="text-muted-foreground text-sm">{apptList.length} appointment{apptList.length !== 1 ? "s" : ""}</p>
          </div>
          <div className="flex gap-2">
            <Input type="date" value={dateFilter} onChange={e => setDateFilter(e.target.value)} className="w-36 h-9 text-sm" />
            <Select value={statusFilter || "__all__"} onValueChange={v => setStatusFilter(v === "__all__" ? "" : v)}>
              <SelectTrigger className="w-36 h-9 text-sm"><SelectValue placeholder="All Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-3">{Array.from({ length: 4 }, (_, i) => <div key={i} className="h-24 bg-muted rounded-xl animate-pulse" />)}</div>
        ) : apptList.length === 0 ? (
          <div className="text-center py-20">
            <Calendar size={40} className="text-muted-foreground mx-auto mb-3" />
            <h3 className="font-semibold">No appointments found</h3>
          </div>
        ) : (
          <div className="space-y-3">
            {apptList.map((a: any) => (
              <div key={a.id} className={cn("bg-card border rounded-xl p-4 flex items-center gap-4", a.status === "cancelled" && "opacity-60")}>
                <div className="w-14 h-14 rounded-xl bg-primary/10 flex flex-col items-center justify-center flex-shrink-0">
                  <span className="text-[10px] text-muted-foreground">TOKEN</span>
                  <span className="text-xl font-bold text-primary">#{a.tokenNumber}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-semibold">{a.patientName}</h3>
                      <p className="text-xs text-muted-foreground">Dr. {a.doctorName}</p>
                    </div>
                    <Badge variant="outline" className={cn("text-xs flex-shrink-0", getStatusColor(a.status))}>{a.status}</Badge>
                  </div>
                  <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
                    <span>{formatDate(a.appointmentDate)}</span>
                    <span>{formatTime(a.appointmentTime)}</span>
                    <span>{formatCurrency(a.consultationFee)}</span>
                  </div>
                </div>
                {(a.status === "confirmed" || a.status === "pending") && (
                  <div className="flex gap-2 flex-shrink-0">
                    <Button variant="outline" size="sm" onClick={() => handleComplete(a.id)} className="gap-1 text-green-600 border-green-200 hover:bg-green-50">
                      <CheckCircle size={12} />Done
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleCancel(a.id)} className="gap-1 text-destructive border-destructive/30 hover:bg-destructive/5">
                      <X size={12} />Cancel
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
