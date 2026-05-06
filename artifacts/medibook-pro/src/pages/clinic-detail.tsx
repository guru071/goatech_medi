import { Link, useParams } from "wouter";
import { MapPin, Phone, Clock, Star, MessageCircle, Instagram, Globe, Calendar, ArrowLeft, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Layout from "@/components/Layout";
import StarRating from "@/components/StarRating";
import { useGetClinic, useListDoctors, useListClinicReviews } from "@workspace/api-client-react";
import { formatDate, formatCurrency, cn } from "@/lib/utils";

export default function ClinicDetailPage() {
  const { id } = useParams<{ id: string }>();
  const clinicId = parseInt(id, 10);

  const { data: clinic, isLoading } = useGetClinic(clinicId, { query: { enabled: !!clinicId } });
  const { data: doctors } = useListDoctors(clinicId, { query: { enabled: !!clinicId } });
  const { data: reviews } = useListClinicReviews(clinicId, { query: { enabled: !!clinicId } });

  if (isLoading) return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="space-y-4">
          <div className="h-48 bg-muted rounded-xl animate-pulse" />
          <div className="h-8 bg-muted rounded w-1/2 animate-pulse" />
          <div className="h-4 bg-muted rounded w-1/3 animate-pulse" />
        </div>
      </div>
    </Layout>
  );

  if (!clinic) return (
    <Layout>
      <div className="container mx-auto px-4 py-20 text-center">
        <h2 className="text-2xl font-bold">Clinic not found</h2>
        <Link href="/clinics"><Button className="mt-4">Back to Clinics</Button></Link>
      </div>
    </Layout>
  );

  const c = clinic as any;
  const docsList = (doctors as any[]) ?? [];
  const reviewsList = (reviews as any[]) ?? [];
  const avgRating = reviewsList.length ? reviewsList.reduce((s: number, r: any) => s + r.rating, 0) / reviewsList.length : null;

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <Link href="/clinics"><span className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4 cursor-pointer"><ArrowLeft size={14} />Back to Clinics</span></Link>

        {/* Header */}
        <div className="bg-card border rounded-2xl overflow-hidden mb-6">
          <div className="h-40 gradient-hero relative">
            {c.photos?.[0] && <img src={c.photos[0]} alt="" className="w-full h-full object-cover opacity-50" />}
            <div className="absolute inset-0 flex items-end p-6">
              <div className="flex items-end gap-4">
                <div className="w-20 h-20 rounded-xl bg-white/90 flex items-center justify-center shadow-lg flex-shrink-0">
                  {c.logoUrl ? (
                    <img src={c.logoUrl} alt={c.name} className="w-full h-full object-cover rounded-xl" />
                  ) : (
                    <span className="text-2xl font-bold text-primary">{c.name?.slice(0, 2).toUpperCase()}</span>
                  )}
                </div>
                <div className="text-white">
                  <h1 className="text-2xl font-bold">{c.name}</h1>
                  <div className="flex items-center gap-2 mt-1">
                    {c.categoryName && <Badge className="bg-white/20 text-white text-xs">{c.categoryName}</Badge>}
                    {c.subscriptionPlan === "premium" && <Badge className="bg-amber-400/90 text-amber-900 text-xs">Premium</Badge>}
                    {c.isEmergencyAvailable && <Badge className="bg-red-500/90 text-white text-xs flex items-center gap-1"><Zap size={10} />24/7 Emergency</Badge>}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="p-6">
            <div className="flex flex-wrap gap-6 text-sm text-muted-foreground mb-4">
              <span className="flex items-center gap-1.5"><MapPin size={14} className="text-primary" />{c.address}, {c.city}, {c.state} {c.pincode}</span>
              <span className="flex items-center gap-1.5"><Phone size={14} className="text-primary" />{c.phone}</span>
              {c.workingHours && <span className="flex items-center gap-1.5"><Clock size={14} className="text-primary" />{c.workingHours}</span>}
              {avgRating !== null && (
                <span className="flex items-center gap-1.5">
                  <Star size={14} className="fill-amber-400 text-amber-400" />
                  {avgRating.toFixed(1)} ({reviewsList.length} reviews)
                </span>
              )}
            </div>

            <div className="flex flex-wrap gap-2 mb-4">
              {c.whatsappNumber && (
                <a href={`https://wa.me/${c.whatsappNumber}`} target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" size="sm" className="gap-2 text-green-600 border-green-200 hover:bg-green-50">
                    <MessageCircle size={14} />WhatsApp
                  </Button>
                </a>
              )}
              {c.instagramUrl && (
                <a href={c.instagramUrl} target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" size="sm" className="gap-2 text-pink-600 border-pink-200 hover:bg-pink-50">
                    <Instagram size={14} />Instagram
                  </Button>
                </a>
              )}
              {c.websiteUrl && (
                <a href={c.websiteUrl} target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" size="sm" className="gap-2"><Globe size={14} />Website</Button>
                </a>
              )}
            </div>

            <Link href={`/clinics/${clinicId}/book`}>
              <Button size="lg" className="gap-2">
                <Calendar size={16} />Book Appointment
              </Button>
            </Link>
          </div>
        </div>

        {/* Google Map */}
        {c.latitude && c.longitude && import.meta.env.VITE_GOOGLE_MAPS_API_KEY && (
          <div className="bg-card border rounded-xl overflow-hidden mb-6 h-52">
            <iframe
              title="Clinic Location"
              width="100%" height="100%"
              src={`https://www.google.com/maps/embed/v1/place?key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}&q=${c.latitude},${c.longitude}`}
              className="border-0"
            />
          </div>
        )}
        {c.latitude && c.longitude && !import.meta.env.VITE_GOOGLE_MAPS_API_KEY && (
          <a
            href={`https://www.google.com/maps?q=${c.latitude},${c.longitude}`}
            target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-2 bg-card border rounded-xl p-4 mb-6 hover:border-primary hover:shadow-sm transition-all text-sm text-muted-foreground hover:text-primary"
          >
            <MapPin size={16} className="text-primary" />
            View on Google Maps — {c.address}, {c.city}
          </a>
        )}

        {/* Tabs */}
        <Tabs defaultValue="doctors">
          <TabsList className="mb-4">
            <TabsTrigger value="doctors">Doctors ({docsList.length})</TabsTrigger>
            <TabsTrigger value="reviews">Reviews ({reviewsList.length})</TabsTrigger>
            {c.services?.length > 0 && <TabsTrigger value="services">Services</TabsTrigger>}
          </TabsList>

          <TabsContent value="doctors">
            {docsList.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No doctors listed yet</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {docsList.map((doc: any) => (
                  <div key={doc.id} className="bg-card border rounded-xl p-4 flex gap-3">
                    <Avatar className="w-14 h-14 flex-shrink-0">
                      {doc.imageUrl && <img src={doc.imageUrl} alt={doc.name} className="w-full h-full object-cover rounded-full" />}
                      <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                        {doc.name?.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold truncate">{doc.name}</h4>
                      <p className="text-xs text-muted-foreground">{doc.qualification} · {doc.specialization}</p>
                      <p className="text-xs text-muted-foreground">{doc.experience} yrs experience</p>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-sm font-semibold text-primary">{formatCurrency(doc.consultationFee)}</span>
                        <Link href={`/clinics/${clinicId}/book`}>
                          <Button size="sm" variant="outline" className="h-7 text-xs">Book</Button>
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="reviews">
            {reviewsList.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No reviews yet. Be the first to review!</p>
            ) : (
              <div className="space-y-3">
                {reviewsList.map((r: any) => (
                  <div key={r.id} className="bg-card border rounded-xl p-4">
                    <div className="flex items-start gap-3">
                      <Avatar className="w-9 h-9 flex-shrink-0">
                        <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                          {r.userName?.slice(0, 2).toUpperCase() || "?"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-sm">{r.userName}</span>
                          <span className="text-xs text-muted-foreground">{formatDate(r.createdAt)}</span>
                        </div>
                        <StarRating rating={r.rating} size={14} className="mt-0.5 mb-1" />
                        {r.comment && <p className="text-sm text-muted-foreground">{r.comment}</p>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="services">
            <div className="flex flex-wrap gap-2">
              {c.services?.map((s: string, i: number) => (
                <Badge key={i} variant="secondary">{s}</Badge>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
