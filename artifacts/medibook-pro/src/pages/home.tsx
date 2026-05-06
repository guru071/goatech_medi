import { useState } from "react";
import { useLocation } from "wouter";
import { Search, MapPin, Sparkles, ArrowRight, ChevronRight, Star, Shield, Clock, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import Layout from "@/components/Layout";
import ClinicCard from "@/components/ClinicCard";
import {
  useListCategories, useListFeaturedClinics, useListNearbyClinics, useSuggestClinics
} from "@workspace/api-client-react";
import { Link } from "wouter";
import { cn } from "@/lib/utils";

const categoryIcons: Record<string, string> = {
  dental: "🦷", skin: "✨", eye: "👁", hair: "💆", ent: "👂",
  cardiology: "❤️", orthopedic: "🦴", pediatric: "👶", general: "🏥", cosmetic: "💄",
};

export default function HomePage() {
  const [, navigate] = useLocation();
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [symptom, setSymptom] = useState("");
  const [aiResult, setAiResult] = useState<{ category: string; reason: string } | null>(null);
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);

  const { data: categories } = useListCategories();
  const { data: featuredClinics } = useListFeaturedClinics();
  const suggestMutation = useSuggestClinics();

  const { data: nearbyClinics } = useListNearbyClinics(
    { params: { lat: userCoords?.lat ?? 0, lng: userCoords?.lng ?? 0, radius: 15 } },
    { query: { enabled: !!userCoords } }
  );

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (selectedCategory) params.set("category", selectedCategory);
    navigate(`/clinics?${params.toString()}`);
  };

  const handleNearby = () => {
    navigator.geolocation.getCurrentPosition(pos => {
      setUserCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
    });
  };

  const handleAiSuggest = async () => {
    if (!symptom.trim()) return;
    try {
      const result = await suggestMutation.mutateAsync({ data: { symptom, city: undefined } });
      setAiResult(result as any);
      navigate(`/clinics?category=${(result as any).category}`);
    } catch {}
  };

  const stats = [
    { icon: <Users size={20} />, value: "50,000+", label: "Patients Served" },
    { icon: <Star size={20} />, value: "4.8/5", label: "Average Rating" },
    { icon: <Shield size={20} />, value: "500+", label: "Verified Clinics" },
    { icon: <Clock size={20} />, value: "< 2 min", label: "Booking Time" },
  ];

  return (
    <Layout>
      {/* Hero */}
      <section className="gradient-hero text-white py-20 px-4 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 w-64 h-64 rounded-full bg-white blur-3xl" />
          <div className="absolute bottom-10 right-10 w-96 h-96 rounded-full bg-teal-400 blur-3xl" />
        </div>
        <div className="container mx-auto max-w-3xl text-center relative z-10">
          <Badge className="mb-4 bg-white/20 text-white border-white/30 hover:bg-white/25">
            <Sparkles size={12} className="mr-1" />India's trusted clinic platform
          </Badge>
          <h1 className="text-4xl md:text-5xl font-bold mb-4 leading-tight">
            Book the right doctor,<br />right now
          </h1>
          <p className="text-lg text-white/80 mb-8">
            Discover verified clinics near you. Book appointments in under 2 minutes. Get your token, skip the wait.
          </p>

          {/* Search Bar */}
          <div className="bg-white rounded-2xl p-2 flex flex-col sm:flex-row gap-2 shadow-2xl">
            <div className="flex-1 flex items-center gap-2 px-3">
              <Search size={18} className="text-muted-foreground flex-shrink-0" />
              <Input
                placeholder="Search clinics, doctors..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSearch()}
                className="border-0 shadow-none focus-visible:ring-0 text-foreground p-0"
              />
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={handleNearby} className="text-muted-foreground hover:text-foreground whitespace-nowrap">
                <MapPin size={16} className="mr-1" />Near me
              </Button>
              <Button onClick={handleSearch} className="px-6">Search</Button>
            </div>
          </div>

          {/* AI Suggestion */}
          <div className="mt-4 bg-white/10 border border-white/20 rounded-xl p-3 flex flex-col sm:flex-row gap-2">
            <div className="flex-1 flex items-center gap-2">
              <Sparkles size={16} className="text-teal-300 flex-shrink-0" />
              <Input
                placeholder="Describe your symptoms... e.g. 'tooth pain', 'skin rash'"
                value={symptom}
                onChange={e => setSymptom(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleAiSuggest()}
                className="border-0 shadow-none bg-transparent text-white placeholder:text-white/50 focus-visible:ring-0 p-0"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleAiSuggest}
              disabled={suggestMutation.isPending}
              className="bg-white/10 text-white border-white/30 hover:bg-white/20 whitespace-nowrap"
            >
              {suggestMutation.isPending ? "Finding..." : "AI Suggest"}
            </Button>
          </div>
          {aiResult && (
            <p className="mt-2 text-sm text-teal-200">{aiResult.reason}</p>
          )}
        </div>
      </section>

      {/* Stats */}
      <section className="border-b bg-card">
        <div className="container mx-auto px-4 py-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {stats.map(s => (
              <div key={s.label} className="text-center">
                <div className="flex justify-center text-primary mb-1">{s.icon}</div>
                <div className="text-2xl font-bold text-foreground">{s.value}</div>
                <div className="text-xs text-muted-foreground">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="py-12 px-4">
        <div className="container mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">Browse by Specialty</h2>
            <Link href="/clinics"><span className="text-sm text-primary flex items-center gap-1 hover:underline cursor-pointer">View all <ChevronRight size={14} /></span></Link>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
            {(categories as any[] | undefined)?.map((cat: any) => (
              <button
                key={cat.id}
                onClick={() => navigate(`/clinics?category=${cat.slug}`)}
                className={cn(
                  "flex flex-col items-center gap-2 p-3 rounded-xl border bg-card hover:border-primary hover:shadow-sm transition-all duration-150 cursor-pointer",
                  selectedCategory === cat.slug && "border-primary bg-primary/5"
                )}
              >
                <span className="text-2xl">{categoryIcons[cat.slug] || "🏥"}</span>
                <span className="text-xs font-medium text-center leading-tight">{cat.name}</span>
              </button>
            )) ?? Array.from({ length: 8 }, (_, i) => (
              <div key={i} className="h-20 rounded-xl bg-muted animate-pulse" />
            ))}
          </div>
        </div>
      </section>

      {/* Featured Clinics */}
      <section className="py-12 px-4 bg-muted/30">
        <div className="container mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold">Featured Clinics</h2>
              <p className="text-sm text-muted-foreground">Premium verified clinics, prioritized for you</p>
            </div>
            <Link href="/clinics?subscriptionPlan=premium">
              <Button variant="outline" size="sm" className="gap-1">See all <ArrowRight size={14} /></Button>
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {(featuredClinics as any[] | undefined)?.slice(0, 4).map((clinic: any) => (
              <ClinicCard key={clinic.id} clinic={clinic} />
            )) ?? Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="h-72 rounded-xl bg-muted animate-pulse" />
            ))}
          </div>
        </div>
      </section>

      {/* Nearby */}
      {userCoords && (
        <section className="py-12 px-4">
          <div className="container mx-auto">
            <h2 className="text-2xl font-bold mb-6">Clinics Near You</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {(nearbyClinics as any[] | undefined)?.slice(0, 6).map((clinic: any) => (
                <ClinicCard key={clinic.id} clinic={clinic} />
              ))}
            </div>
          </div>
        </section>
      )}

      {!userCoords && (
        <section className="py-12 px-4">
          <div className="container mx-auto text-center">
            <div className="bg-gradient-to-r from-primary/10 to-teal-100 rounded-2xl p-10">
              <MapPin size={40} className="text-primary mx-auto mb-3" />
              <h3 className="text-xl font-bold mb-2">Find Clinics Near You</h3>
              <p className="text-muted-foreground mb-4">Allow location access to discover clinics within your area</p>
              <Button onClick={handleNearby}>Enable Location</Button>
            </div>
          </div>
        </section>
      )}
    </Layout>
  );
}
