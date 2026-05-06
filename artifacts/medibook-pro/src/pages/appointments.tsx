import { useState } from "react";
import { Calendar, Download, X, CheckCircle, Clock, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Layout from "@/components/Layout";
import { useListAppointments, useCancelAppointment, getListAppointmentsQueryKey } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";
import { formatDate, formatTime, formatCurrency, getStatusColor, downloadReceiptTxt, cn } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";

export default function AppointmentsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("");

  const { data: appointments, isLoading } = useListAppointments(
    { params: { userId: user?.id as any, status: statusFilter || undefined, limit: 50 } },
    { query: { enabled: !!user } }
  );
  const cancelMutation = useCancelAppointment();

  const apptList = (appointments as any[]) ?? [];

  const handleCancel = async (id: number) => {
    if (!confirm("Cancel this appointment?")) return;
    try {
      await cancelMutation.mutateAsync({ id });
      queryClient.invalidateQueries({ queryKey: getListAppointmentsQueryKey() });
      toast({ title: "Appointment cancelled" });
    } catch {
      toast({ title: "Failed to cancel", variant: "destructive" });
    }
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">My Appointments</h1>
            <p className="text-muted-foreground text-sm mt-1">{apptList.length} appointment{apptList.length !== 1 ? "s" : ""}</p>
          </div>
          <Select value={statusFilter || "__all__"} onValueChange={v => setStatusFilter(v === "__all__" ? "" : v)}>
            <SelectTrigger className="w-40">
              <Filter size={14} className="mr-2 text-muted-foreground" />
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="confirmed">Confirmed</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {!user && (
          <div className="text-center py-20">
            <Calendar size={40} className="text-muted-foreground mx-auto mb-3" />
            <h3 className="font-semibold text-lg">Sign in to view appointments</h3>
            <Link href="/login"><Button className="mt-4">Sign In</Button></Link>
          </div>
        )}

        {user && isLoading && (
          <div className="space-y-3">
            {Array.from({ length: 4 }, (_, i) => <div key={i} className="h-28 bg-muted rounded-xl animate-pulse" />)}
          </div>
        )}

        {user && !isLoading && apptList.length === 0 && (
          <div className="text-center py-20">
            <Calendar size={40} className="text-muted-foreground mx-auto mb-3" />
            <h3 className="font-semibold text-lg">No appointments found</h3>
            <p className="text-muted-foreground text-sm mt-1">Book your first appointment today</p>
            <Link href="/clinics"><Button className="mt-4">Find a Clinic</Button></Link>
          </div>
        )}

        <div className="space-y-3">
          {apptList.map((appt: any) => (
            <div key={appt.id} className={cn(
              "bg-card border rounded-xl p-4 flex flex-col sm:flex-row gap-4 transition-all",
              appt.status === "cancelled" && "opacity-60"
            )}>
              {/* Token Badge */}
              <div className="flex-shrink-0 flex items-center justify-center">
                <div className="w-16 h-16 rounded-xl bg-primary/10 flex flex-col items-center justify-center">
                  <span className="text-xs text-muted-foreground">TOKEN</span>
                  <span className="text-2xl font-bold text-primary">#{appt.tokenNumber}</span>
                </div>
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-semibold">{appt.clinicName}</h3>
                    <p className="text-sm text-muted-foreground">Dr. {appt.doctorName}</p>
                  </div>
                  <Badge variant="outline" className={cn("text-xs flex-shrink-0", getStatusColor(appt.status))}>
                    {appt.status}
                  </Badge>
                </div>
                <div className="flex flex-wrap gap-3 mt-2 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Calendar size={11} />{formatDate(appt.appointmentDate)}</span>
                  <span className="flex items-center gap-1"><Clock size={11} />{formatTime(appt.appointmentTime)}</span>
                  <span className="font-medium text-foreground">{formatCurrency(appt.consultationFee)}</span>
                </div>
                {appt.notes && <p className="text-xs text-muted-foreground mt-1 italic">{appt.notes}</p>}
              </div>

              {/* Actions */}
              <div className="flex sm:flex-col gap-2 justify-end flex-shrink-0">
                <Button
                  variant="outline" size="sm"
                  onClick={() => downloadReceiptTxt(appt)}
                  className="text-xs gap-1"
                >
                  <Download size={12} />Receipt
                </Button>
                {(appt.status === "pending" || appt.status === "confirmed") && (
                  <Button
                    variant="outline" size="sm"
                    onClick={() => handleCancel(appt.id)}
                    disabled={cancelMutation.isPending}
                    className="text-xs gap-1 text-destructive border-destructive/30 hover:bg-destructive/5"
                  >
                    <X size={12} />Cancel
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
}
