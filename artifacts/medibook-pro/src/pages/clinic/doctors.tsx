import { useState } from "react";
import { Plus, Edit, Trash2, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import Layout from "@/components/Layout";
import { useListDoctors, useCreateDoctor, useUpdateDoctor, useDeleteDoctor, getListDoctorsQueryKey } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";
import { formatCurrency } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

export default function ClinicDoctorsPage() {
  const { user } = useAuth();
  const clinicId = (user as any)?.clinicId || 1;
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({
    name: "", qualification: "", specialization: "", experience: "0",
    consultationFee: "500", availableDays: "Mon,Tue,Wed,Thu,Fri",
    startTime: "09:00", endTime: "17:00", slotDurationMinutes: "30", bio: "", isActive: true,
  });

  const { data: doctors, isLoading } = useListDoctors(clinicId, { query: { enabled: !!clinicId } });
  const createMutation = useCreateDoctor();
  const updateMutation = useUpdateDoctor();
  const deleteMutation = useDeleteDoctor();

  const invalidate = () => queryClient.invalidateQueries({ queryKey: getListDoctorsQueryKey(clinicId) });
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, [k]: e.target.value }));

  const openNew = () => {
    setEditing(null);
    setForm({ name: "", qualification: "", specialization: "", experience: "0", consultationFee: "500", availableDays: "Mon,Tue,Wed,Thu,Fri", startTime: "09:00", endTime: "17:00", slotDurationMinutes: "30", bio: "", isActive: true });
    setOpen(true);
  };

  const openEdit = (doc: any) => {
    setEditing(doc);
    setForm({ name: doc.name, qualification: doc.qualification, specialization: doc.specialization, experience: String(doc.experience), consultationFee: String(doc.consultationFee), availableDays: doc.availableDays, startTime: doc.startTime, endTime: doc.endTime, slotDurationMinutes: String(doc.slotDurationMinutes), bio: doc.bio || "", isActive: doc.isActive });
    setOpen(true);
  };

  const handleSave = async () => {
    try {
      const data = { ...form, experience: parseInt(form.experience), consultationFee: parseFloat(form.consultationFee), slotDurationMinutes: parseInt(form.slotDurationMinutes) };
      if (editing) {
        await updateMutation.mutateAsync({ id: editing.id, data });
      } else {
        await createMutation.mutateAsync({ clinicId, data });
      }
      invalidate();
      setOpen(false);
      toast({ title: editing ? "Doctor updated" : "Doctor added" });
    } catch { toast({ title: "Failed", variant: "destructive" }); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Remove this doctor?")) return;
    await deleteMutation.mutateAsync({ id });
    invalidate();
    toast({ title: "Doctor removed" });
  };

  const doctorsList = (doctors as any[]) ?? [];

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">Manage Doctors</h1>
            <p className="text-muted-foreground text-sm">{doctorsList.length} doctor{doctorsList.length !== 1 ? "s" : ""}</p>
          </div>
          <Button onClick={openNew} className="gap-2"><Plus size={16} />Add Doctor</Button>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 4 }, (_, i) => <div key={i} className="h-48 bg-muted rounded-xl animate-pulse" />)}
          </div>
        ) : doctorsList.length === 0 ? (
          <div className="text-center py-20">
            <UserCheck size={40} className="text-muted-foreground mx-auto mb-3" />
            <h3 className="font-semibold">No doctors yet</h3>
            <p className="text-muted-foreground text-sm mt-1">Add your first doctor to start accepting bookings</p>
            <Button onClick={openNew} className="mt-4 gap-2"><Plus size={16} />Add Doctor</Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {doctorsList.map((doc: any) => (
              <div key={doc.id} className="bg-card border rounded-xl p-4">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-semibold">{doc.name}</h3>
                    <p className="text-xs text-muted-foreground">{doc.qualification}</p>
                    <p className="text-xs text-muted-foreground">{doc.specialization}</p>
                  </div>
                  <Badge variant={doc.isActive ? "default" : "secondary"} className="text-xs">
                    {doc.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>
                <div className="text-sm space-y-1 text-muted-foreground mb-3">
                  <p>{doc.experience} years experience</p>
                  <p className="font-semibold text-foreground">{formatCurrency(doc.consultationFee)}</p>
                  <p className="text-xs">{doc.availableDays} · {doc.startTime}–{doc.endTime}</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => openEdit(doc)} className="flex-1 gap-1"><Edit size={12} />Edit</Button>
                  <Button variant="outline" size="sm" onClick={() => handleDelete(doc.id)} className="flex-1 gap-1 text-destructive border-destructive/30"><Trash2 size={12} />Remove</Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Doctor" : "Add Doctor"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {[
              { l: "Full Name *", k: "name", p: "Dr. Jane Smith" },
              { l: "Qualification *", k: "qualification", p: "MBBS, MD" },
              { l: "Specialization *", k: "specialization", p: "General Physician" },
              { l: "Experience (years)", k: "experience", p: "5", t: "number" },
              { l: "Consultation Fee (₹)", k: "consultationFee", p: "500", t: "number" },
              { l: "Available Days", k: "availableDays", p: "Mon,Tue,Wed,Thu,Fri" },
              { l: "Start Time", k: "startTime", p: "09:00", t: "time" },
              { l: "End Time", k: "endTime", p: "17:00", t: "time" },
              { l: "Slot Duration (min)", k: "slotDurationMinutes", p: "30", t: "number" },
              { l: "Bio", k: "bio", p: "Brief description..." },
            ].map(({ l, k, p, t }) => (
              <div key={k}>
                <Label>{l}</Label>
                <Input value={(form as any)[k]} onChange={set(k)} placeholder={p} type={t || "text"} className="mt-1" />
              </div>
            ))}
            <div className="flex items-center gap-3">
              <Switch checked={form.isActive} onCheckedChange={v => setForm(f => ({ ...f, isActive: v }))} />
              <Label>Active</Label>
            </div>
            <Button onClick={handleSave} disabled={createMutation.isPending || updateMutation.isPending} className="w-full">
              {createMutation.isPending || updateMutation.isPending ? "Saving..." : "Save Doctor"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
