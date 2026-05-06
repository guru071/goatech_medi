import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { ArrowLeft, ArrowRight, Check, Calendar, Clock, User, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import Layout from "@/components/Layout";
import { useGetClinic, useListDoctors, useGetDoctorSlots, useCreateAppointment } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";
import { formatCurrency, formatTime, cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { getListAppointmentsQueryKey } from "@workspace/api-client-react";

type Step = "doctor" | "date" | "slot" | "confirm";

export default function BookAppointmentPage() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const clinicId = parseInt(id, 10);
  const [step, setStep] = useState<Step>("doctor");
  const [selectedDoctor, setSelectedDoctor] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedSlot, setSelectedSlot] = useState<any>(null);
  const [notes, setNotes] = useState("");
  const [patientName, setPatientName] = useState(user?.name || "");
  const [patientPhone, setPatientPhone] = useState(user?.phone || "");

  const { data: clinic } = useGetClinic(clinicId, { query: { enabled: !!clinicId } });
  const { data: doctors } = useListDoctors(clinicId, { query: { enabled: !!clinicId } });
  const { data: slots } = useGetDoctorSlots(
    selectedDoctor?.id,
    { params: { date: selectedDate } },
    { query: { enabled: !!selectedDoctor && !!selectedDate } }
  );
  const createAppt = useCreateAppointment();

  const steps: { key: Step; label: string; icon: React.ReactNode }[] = [
    { key: "doctor", label: "Doctor", icon: <User size={14} /> },
    { key: "date", label: "Date", icon: <Calendar size={14} /> },
    { key: "slot", label: "Time Slot", icon: <Clock size={14} /> },
    { key: "confirm", label: "Confirm", icon: <Check size={14} /> },
  ];
  const stepIndex = steps.findIndex(s => s.key === step);

  const today = new Date().toISOString().split("T")[0];
  const maxDate = new Date(); maxDate.setDate(maxDate.getDate() + 30);

  const handleBook = async () => {
    if (!user) { navigate("/login"); return; }
    if (!selectedDoctor || !selectedDate || !selectedSlot) return;
    try {
      const appt = await createAppt.mutateAsync({
        data: {
          userId: user.id as unknown as number,
          clinicId, doctorId: selectedDoctor.id,
          appointmentDate: selectedDate, appointmentTime: selectedSlot.time,
          notes: notes || undefined, patientName, patientPhone,
        }
      });
      queryClient.invalidateQueries({ queryKey: getListAppointmentsQueryKey() });
      toast({ title: "Appointment Booked!", description: `Your token number is #${(appt as any).tokenNumber}` });
      navigate("/appointments");
    } catch (err: any) {
      toast({ title: "Booking Failed", description: err?.data?.error || "Please try again", variant: "destructive" });
    }
  };

  const clinicData = clinic as any;
  const doctorsList = (doctors as any[]) ?? [];
  const slotsList = (slots as any[]) ?? [];

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="flex items-center gap-2 mb-6">
          <button onClick={() => navigate(`/clinics/${id}`)} className="text-muted-foreground hover:text-foreground">
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-2xl font-bold">Book Appointment</h1>
            {clinicData && <p className="text-muted-foreground text-sm">{clinicData.name}</p>}
          </div>
        </div>

        {/* Stepper */}
        <div className="flex items-center mb-8">
          {steps.map((s, i) => (
            <div key={s.key} className="flex items-center flex-1 last:flex-none">
              <div className={cn(
                "flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full transition-all",
                i < stepIndex ? "bg-primary/10 text-primary" :
                i === stepIndex ? "bg-primary text-primary-foreground shadow-sm" :
                "bg-muted text-muted-foreground"
              )}>
                {i < stepIndex ? <Check size={12} /> : s.icon}
                <span className="hidden sm:block">{s.label}</span>
              </div>
              {i < steps.length - 1 && <div className={cn("h-0.5 flex-1 mx-1", i < stepIndex ? "bg-primary" : "bg-muted")} />}
            </div>
          ))}
        </div>

        {/* Step: Doctor */}
        {step === "doctor" && (
          <div className="space-y-3 animate-slide-up">
            <h2 className="font-semibold text-lg">Select a Doctor</h2>
            {doctorsList.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No doctors available</p>
            ) : (
              doctorsList.filter((d: any) => d.isActive).map((doc: any) => (
                <button
                  key={doc.id}
                  onClick={() => { setSelectedDoctor(doc); setStep("date"); }}
                  className={cn(
                    "w-full text-left bg-card border rounded-xl p-4 hover:border-primary hover:shadow-sm transition-all",
                    selectedDoctor?.id === doc.id && "border-primary bg-primary/5"
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 font-bold text-primary">
                      {doc.name?.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-semibold">{doc.name}</h3>
                          <p className="text-xs text-muted-foreground">{doc.qualification} · {doc.specialization}</p>
                          <p className="text-xs text-muted-foreground">{doc.experience} years experience</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-primary">{formatCurrency(doc.consultationFee)}</p>
                          <p className="text-xs text-muted-foreground">{doc.slotDurationMinutes} min slots</p>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">Available: {doc.availableDays}</p>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        )}

        {/* Step: Date */}
        {step === "date" && (
          <div className="space-y-4 animate-slide-up">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-lg">Select Date</h2>
              <button onClick={() => setStep("doctor")} className="text-sm text-muted-foreground hover:text-foreground">Change Doctor</button>
            </div>
            <div className="bg-card border rounded-xl p-4">
              <p className="text-sm font-medium mb-1">Selected Doctor: {selectedDoctor?.name}</p>
              <p className="text-xs text-muted-foreground">Available days: {selectedDoctor?.availableDays}</p>
            </div>
            <div>
              <Label htmlFor="date">Appointment Date</Label>
              <Input
                id="date" type="date"
                min={today}
                max={maxDate.toISOString().split("T")[0]}
                value={selectedDate}
                onChange={e => setSelectedDate(e.target.value)}
                className="mt-1"
              />
            </div>
            <Button onClick={() => setStep("slot")} disabled={!selectedDate} className="w-full gap-2">
              View Available Slots <ArrowRight size={16} />
            </Button>
          </div>
        )}

        {/* Step: Slot */}
        {step === "slot" && (
          <div className="space-y-4 animate-slide-up">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-lg">Select Time Slot</h2>
              <button onClick={() => setStep("date")} className="text-sm text-muted-foreground hover:text-foreground">Change Date</button>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {slotsList.length === 0 ? (
                <p className="col-span-4 text-center text-muted-foreground py-6">No slots available for this date</p>
              ) : slotsList.map((slot: any) => (
                <button
                  key={slot.time}
                  onClick={() => !slot.isAvailable ? null : setSelectedSlot(slot)}
                  disabled={!slot.isAvailable}
                  className={cn(
                    "py-2 px-3 rounded-lg border text-sm font-medium transition-all",
                    !slot.isAvailable ? "opacity-40 cursor-not-allowed bg-muted text-muted-foreground line-through" :
                    selectedSlot?.time === slot.time ? "bg-primary text-primary-foreground border-primary shadow-sm" :
                    "bg-card hover:border-primary hover:text-primary"
                  )}
                >
                  <div>{formatTime(slot.time)}</div>
                  <div className="text-xs opacity-70">Token #{slot.token}</div>
                </button>
              ))}
            </div>
            <Button onClick={() => setStep("confirm")} disabled={!selectedSlot} className="w-full gap-2">
              Continue <ArrowRight size={16} />
            </Button>
          </div>
        )}

        {/* Step: Confirm */}
        {step === "confirm" && (
          <div className="space-y-4 animate-slide-up">
            <h2 className="font-semibold text-lg">Confirm Booking</h2>

            {/* Summary */}
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 space-y-2">
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Clinic</span><span className="font-medium">{clinicData?.name}</span></div>
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Doctor</span><span className="font-medium">{selectedDoctor?.name}</span></div>
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Date</span><span className="font-medium">{selectedDate}</span></div>
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Time</span><span className="font-medium">{formatTime(selectedSlot?.time)}</span></div>
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Token</span><span className="font-medium">#{selectedSlot?.token}</span></div>
              <div className="border-t pt-2 flex justify-between font-semibold"><span>Consultation Fee</span><span className="text-primary">{formatCurrency(selectedDoctor?.consultationFee)}</span></div>
            </div>

            {/* Patient info */}
            <div className="space-y-3">
              <div>
                <Label htmlFor="pname">Patient Name</Label>
                <Input id="pname" value={patientName} onChange={e => setPatientName(e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label htmlFor="pphone">Patient Phone</Label>
                <Input id="pphone" type="tel" value={patientPhone} onChange={e => setPatientPhone(e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label htmlFor="notes">Notes (optional)</Label>
                <Textarea id="notes" placeholder="Any symptoms or concerns..." value={notes} onChange={e => setNotes(e.target.value)} className="mt-1" rows={3} />
              </div>
            </div>

            {!user && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
                Please <a href="/login" className="underline font-medium">sign in</a> to complete your booking
              </div>
            )}

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep("slot")} className="flex-1">Back</Button>
              <Button onClick={handleBook} disabled={createAppt.isPending || !user} className="flex-1 gap-2">
                {createAppt.isPending ? "Booking..." : <><CreditCard size={14} />Confirm Booking</>}
              </Button>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
