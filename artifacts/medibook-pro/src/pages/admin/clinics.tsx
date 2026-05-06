import { useState } from "react";
import { Search, CheckCircle, XCircle, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import Layout from "@/components/Layout";
import { useAdminListClinics, useApproveClinic, useRejectClinic, getAdminListClinicsQueryKey } from "@workspace/api-client-react";
import { formatDate, getStatusColor, cn } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";

export default function AdminClinicsPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [rejectDialog, setRejectDialog] = useState<{ id: number; name: string } | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const { data: clinics, isLoading } = useAdminListClinics({ params: { status: status || undefined } });
  const approveMutation = useApproveClinic();
  const rejectMutation = useRejectClinic();

  const clinicsList = (clinics as any[]) ?? [];
  const filtered = search ? clinicsList.filter((c: any) => c.name.toLowerCase().includes(search.toLowerCase()) || c.city.toLowerCase().includes(search.toLowerCase())) : clinicsList;

  const invalidate = () => queryClient.invalidateQueries({ queryKey: getAdminListClinicsQueryKey() });

  const handleApprove = async (id: number) => {
    await approveMutation.mutateAsync({ id });
    invalidate();
    toast({ title: "Clinic approved" });
  };

  const handleReject = async () => {
    if (!rejectDialog) return;
    await rejectMutation.mutateAsync({ id: rejectDialog.id, data: { reason: rejectReason } });
    invalidate();
    setRejectDialog(null);
    setRejectReason("");
    toast({ title: "Clinic rejected" });
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">Clinic Management</h1>
            <p className="text-muted-foreground text-sm">{filtered.length} clinics</p>
          </div>
          <div className="flex gap-2">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8 w-48" />
            </div>
            <Select value={status || "__all__"} onValueChange={v => setStatus(v === "__all__" ? "" : v)}>
              <SelectTrigger className="w-36"><SelectValue placeholder="All Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-3">{Array.from({ length: 5 }, (_, i) => <div key={i} className="h-20 bg-muted rounded-xl animate-pulse" />)}</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <Building2 size={40} className="text-muted-foreground mx-auto mb-3" />
            <h3 className="font-semibold">No clinics found</h3>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((c: any) => (
              <div key={c.id} className="bg-card border rounded-xl p-4 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0 font-bold text-primary text-sm">
                  {c.name?.slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Link href={`/clinics/${c.id}`}><h3 className="font-semibold hover:text-primary cursor-pointer">{c.name}</h3></Link>
                    <Badge variant="outline" className={cn("text-xs", getStatusColor(c.status))}>{c.status}</Badge>
                    <Badge variant="outline" className="text-xs">{c.subscriptionPlan}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{c.city}, {c.state} · {c.email} · Registered {formatDate(c.createdAt)}</p>
                  {c.rejectionReason && <p className="text-xs text-red-600 mt-0.5">Reason: {c.rejectionReason}</p>}
                </div>
                {c.status === "pending" && (
                  <div className="flex gap-2 flex-shrink-0">
                    <Button size="sm" onClick={() => handleApprove(c.id)} disabled={approveMutation.isPending} className="gap-1 text-xs bg-green-600 hover:bg-green-700">
                      <CheckCircle size={12} />Approve
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setRejectDialog({ id: c.id, name: c.name })} className="gap-1 text-xs text-red-600 border-red-200 hover:bg-red-50">
                      <XCircle size={12} />Reject
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={!!rejectDialog} onOpenChange={() => setRejectDialog(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Reject Clinic: {rejectDialog?.name}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Rejection Reason *</Label>
              <Textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder="Explain why this clinic is being rejected..." className="mt-1" rows={3} />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setRejectDialog(null)} className="flex-1">Cancel</Button>
              <Button onClick={handleReject} disabled={!rejectReason || rejectMutation.isPending} className="flex-1 bg-red-600 hover:bg-red-700">
                {rejectMutation.isPending ? "Rejecting..." : "Confirm Reject"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
