import { useState } from "react";
import { AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Layout from "@/components/Layout";
import { useListComplaints, useUpdateComplaint, getListComplaintsQueryKey } from "@workspace/api-client-react";
import { formatDate, getStatusColor, cn } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

export default function AdminComplaintsPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [filter, setFilter] = useState("");
  const { data: complaints, isLoading } = useListComplaints();
  const updateMutation = useUpdateComplaint();

  const all = (complaints as any[]) ?? [];
  const filtered = filter ? all.filter((c: any) => c.status === filter) : all;

  const handleUpdate = async (id: number, status: string) => {
    await updateMutation.mutateAsync({ id, data: { status } });
    queryClient.invalidateQueries({ queryKey: getListComplaintsQueryKey() });
    toast({ title: "Complaint updated" });
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">Complaints</h1>
            <p className="text-muted-foreground text-sm">{filtered.length} complaints</p>
          </div>
          <Select value={filter || "__all__"} onValueChange={v => setFilter(v === "__all__" ? "" : v)}>
            <SelectTrigger className="w-36"><SelectValue placeholder="All" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All</SelectItem>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="space-y-3">{Array.from({ length: 5 }, (_, i) => <div key={i} className="h-24 bg-muted rounded-xl animate-pulse" />)}</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <AlertCircle size={40} className="text-muted-foreground mx-auto mb-3" />
            <h3 className="font-semibold">No complaints found</h3>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((c: any) => (
              <div key={c.id} className="bg-card border rounded-xl p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h3 className="font-semibold">{c.subject}</h3>
                      <Badge variant="outline" className={cn("text-xs", getStatusColor(c.priority))}>{c.priority}</Badge>
                      <Badge variant="outline" className={cn("text-xs", getStatusColor(c.status))}>{c.status}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{c.description}</p>
                    <p className="text-xs text-muted-foreground mt-1">{formatDate(c.createdAt)}</p>
                  </div>
                  <div className="flex gap-1.5 flex-shrink-0">
                    {c.status === "open" && (
                      <Button size="sm" variant="outline" onClick={() => handleUpdate(c.id, "in_progress")} className="text-xs">In Progress</Button>
                    )}
                    {c.status !== "resolved" && c.status !== "closed" && (
                      <Button size="sm" variant="outline" onClick={() => handleUpdate(c.id, "resolved")} className="text-xs text-green-600 border-green-200 hover:bg-green-50">Resolve</Button>
                    )}
                    {c.status === "resolved" && (
                      <Button size="sm" variant="outline" onClick={() => handleUpdate(c.id, "closed")} className="text-xs">Close</Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
