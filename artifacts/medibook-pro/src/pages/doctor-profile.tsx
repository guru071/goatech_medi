import { useParams, Link } from "wouter";
import { Star, Briefcase, GraduationCap, Clock, MapPin, ArrowLeft, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import Layout from "@/components/Layout";
import { useGetDoctor } from "@workspace/api-client-react";
import { formatCurrency } from "@/lib/utils";

export default function DoctorProfilePage() {
  const { id } = useParams<{ id: string }>();
  const doctorId = parseInt(id, 10);
  const { data: doctor, isLoading } = useGetDoctor(doctorId, { query: { enabled: !!doctorId } });

  if (isLoading) return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="h-48 bg-muted rounded-2xl animate-pulse mb-4" />
        <div className="h-6 bg-muted rounded w-1/2 animate-pulse" />
      </div>
    </Layout>
  );

  const d = doctor as any;
  if (!d) return (
    <Layout>
      <div className="container mx-auto px-4 py-20 text-center">
        <h2 className="text-2xl font-bold">Doctor not found</h2>
        <Link href="/clinics"><Button className="mt-4">Find Clinics</Button></Link>
      </div>
    </Layout>
  );

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Link href={`/clinics/${d.clinicId}`}>
          <span className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4 cursor-pointer">
            <ArrowLeft size={14} />Back to Clinic
          </span>
        </Link>

        <div className="bg-card border rounded-2xl p-6 mb-6">
          <div className="flex items-start gap-4">
            <Avatar className="w-20 h-20 flex-shrink-0">
              {d.imageUrl && <img src={d.imageUrl} alt={d.name} className="w-full h-full object-cover rounded-full" />}
              <AvatarFallback className="bg-primary/10 text-primary text-2xl font-bold">
                {d.name?.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h1 className="text-2xl font-bold">{d.name}</h1>
              <p className="text-muted-foreground">{d.qualification}</p>
              <div className="flex flex-wrap gap-2 mt-2">
                <Badge variant="secondary">{d.specialization}</Badge>
                {d.isActive && <Badge className="bg-green-100 text-green-800 border-green-200 text-xs">Available</Badge>}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 py-4 border-y">
            {[
              { icon: <Briefcase size={16} />, value: `${d.experience} yrs`, label: "Experience" },
              { icon: <Clock size={16} />, value: `${d.slotDurationMinutes} min`, label: "Per Slot" },
              { icon: <Calendar size={16} />, value: formatCurrency(d.consultationFee), label: "Fee" },
              { icon: <Clock size={16} />, value: `${d.startTime}–${d.endTime}`, label: "Hours" },
            ].map(item => (
              <div key={item.label} className="text-center">
                <div className="flex justify-center text-primary mb-1">{item.icon}</div>
                <p className="font-semibold text-sm">{item.value}</p>
                <p className="text-xs text-muted-foreground">{item.label}</p>
              </div>
            ))}
          </div>

          {d.bio && (
            <div className="mt-4">
              <h3 className="font-semibold mb-2">About</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{d.bio}</p>
            </div>
          )}

          <div className="mt-4">
            <h3 className="font-semibold mb-2">Availability</h3>
            <div className="flex flex-wrap gap-1.5">
              {d.availableDays?.split(",").map((day: string) => (
                <Badge key={day} variant="outline" className="text-xs">{day.trim()}</Badge>
              ))}
            </div>
          </div>

          <div className="mt-6">
            <Link href={`/clinics/${d.clinicId}/book`}>
              <Button size="lg" className="w-full gap-2">
                <Calendar size={16} />Book Appointment with {d.name}
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </Layout>
  );
}
