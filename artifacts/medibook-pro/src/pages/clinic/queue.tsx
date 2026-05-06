import { useState } from "react";
import { Clock, Loader2, CheckCircle, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Layout from "@/components/Layout";
import { useGetClinicQueue, useCompleteAppointment, getGetClinicQueueQueryKey } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";
import { formatTime, getStatusColor, cn } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";

export default function ClinicQueuePage() {
  const { user } = useAuth();
  const clinicId = (user as any)?.clinicId || 1;
  const queryClient = useQueryClient();
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const completeMutation = useCompleteAppointment();

  const { data: queue, isLoading } = useGetClinicQueue(clinicId, { params: { date } }, { query: { enabled: !!clinicId } });

  const queueList = (queue as any[]) ?? [];
  const pending = queueList.filter(q => q.status === "confirmed" || q.status === "pending");
  const done = queueList.filter(q => q.status === "completed");

  const handleComplete = async (id: number) => {
    await completeMutation.mutateAsync({ id });
    queryClient.invalidateQueries({ queryKey: getGetClinicQueueQueryKey(clinicId, { params: { date } }) });
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">Live Token Queue</h1>
            <p className="text-muted-foreground text-sm">{pending.length} waiting · {done.length} completed</p>
          </div>
          <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-40" />
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20"><Loader2 className="animate-spin text-primary" size={24} /></div>
        ) : queueList.length === 0 ? (
          <div className="text-center py-20">
            <Clock size={40} className="text-muted-foreground mx-auto mb-3" />
            <h3 className="font-semibold">No appointments for {date}</h3>
          </div>
        ) : (
          <div className="space-y-3">
            {queueList.map((item: any, i: number) => {
              const isActive = i === 0 && (item.status === "confirmed" || item.status === "pending");
              return (
                <div key={item.tokenNumber} className={cn(
                  "bg-card border rounded-xl p-4 flex items-center gap-4 transition-all",
                  isActive && "border-primary shadow-md bg-primary/5",
                  item.status === "completed" && "opacity-50"
                )}>
                  <div className={cn(
                    "w-14 h-14 rounded-xl flex flex-col items-center justify-center flex-shrink-0 font-bold",
                    isActive ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  )}>
                    <span className="text-[10px] font-normal opacity-70">TOKEN</span>
                    <span className="text-2xl leading-none">#{item.tokenNumber}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{item.patientName || "Patient"}</h3>
                      {isActive && <Badge className="text-[10px] bg-primary text-primary-foreground animate-pulse">NOW SERVING</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground">Dr. {item.doctorName} · {formatTime(item.appointmentTime)}</p>
                    {!isActive && item.status !== "completed" && (
                      <p className="text-xs text-muted-foreground">{item.waitingAheadCount} ahead in queue</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Badge variant="outline" className={cn("text-xs", getStatusColor(item.status))}>{item.status}</Badge>
                    {(item.status === "confirmed" || item.status === "pending") && (
                      <Button variant="outline" size="sm" onClick={() => handleComplete(item.id)} className="text-green-600 border-green-200 hover:bg-green-50 gap-1 text-xs">
                        <CheckCircle size={12} />Done
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
}
