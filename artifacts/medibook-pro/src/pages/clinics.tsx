import { useState } from "react";
import { useLocation } from "wouter";
import { Search, Filter, MapPin, SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Layout from "@/components/Layout";
import ClinicCard from "@/components/ClinicCard";
import { useListClinics, useListCategories } from "@workspace/api-client-react";
import { cn } from "@/lib/utils";

export default function ClinicsPage() {
  const [location] = useLocation();
  const searchParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : new URLSearchParams();
  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [category, setCategory] = useState(searchParams.get("category") || "");
  const [city, setCity] = useState("");
  const [subscriptionPlan, setSubscriptionPlan] = useState(searchParams.get("subscriptionPlan") || "");
  const [page, setPage] = useState(0);
  const limit = 12;

  const { data: categories } = useListCategories();
  const { data, isLoading } = useListClinics({
    params: {
      search: search || undefined,
      category: category || undefined,
      city: city || undefined,
      subscriptionPlan: subscriptionPlan || undefined,
      limit,
      offset: page * limit,
    }
  });

  const clinics = (data as any)?.clinics ?? [];
  const total = (data as any)?.total ?? 0;
  const hasMore = (data as any)?.hasMore ?? false;

  const activeFilters = [
    category && { key: "category", label: category, clear: () => setCategory("") },
    city && { key: "city", label: `City: ${city}`, clear: () => setCity("") },
    subscriptionPlan && { key: "plan", label: subscriptionPlan, clear: () => setSubscriptionPlan("") },
  ].filter(Boolean) as { key: string; label: string; clear: () => void }[];

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Find Clinics</h1>
          <p className="text-muted-foreground">Discover verified clinics across India</p>
        </div>

        {/* Search & Filters */}
        <div className="bg-card border rounded-xl p-4 mb-6 flex flex-col gap-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search clinics or doctors..."
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(0); }}
                className="pl-9"
              />
            </div>
            <Input
              placeholder="City..."
              value={city}
              onChange={e => { setCity(e.target.value); setPage(0); }}
              className="w-36"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Select value={category || "__all__"} onValueChange={v => { setCategory(v === "__all__" ? "" : v); setPage(0); }}>
              <SelectTrigger className="w-44 h-8 text-xs">
                <SelectValue placeholder="All Specialties" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All Specialties</SelectItem>
                {(categories as any[])?.map((c: any) => (
                  <SelectItem key={c.id} value={c.slug}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={subscriptionPlan || "__all__"} onValueChange={v => { setSubscriptionPlan(v === "__all__" ? "" : v); setPage(0); }}>
              <SelectTrigger className="w-40 h-8 text-xs">
                <SelectValue placeholder="All Plans" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All Plans</SelectItem>
                <SelectItem value="premium">Premium</SelectItem>
                <SelectItem value="enterprise">Enterprise</SelectItem>
                <SelectItem value="basic">Basic</SelectItem>
              </SelectContent>
            </Select>
            {activeFilters.length > 0 && (
              <Button variant="ghost" size="sm" className="h-8 text-xs gap-1" onClick={() => { setCategory(""); setCity(""); setSubscriptionPlan(""); }}>
                <X size={12} />Clear all
              </Button>
            )}
          </div>
          {activeFilters.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {activeFilters.map(f => (
                <Badge key={f.key} variant="secondary" className="text-xs gap-1 cursor-pointer" onClick={f.clear}>
                  {f.label}<X size={10} />
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* Results count */}
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-muted-foreground">
            {isLoading ? "Searching..." : `${total} clinic${total !== 1 ? "s" : ""} found`}
          </p>
        </div>

        {/* Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 8 }, (_, i) => <div key={i} className="h-72 rounded-xl bg-muted animate-pulse" />)}
          </div>
        ) : clinics.length === 0 ? (
          <div className="text-center py-20">
            <Search size={40} className="text-muted-foreground mx-auto mb-3" />
            <h3 className="font-semibold text-lg">No clinics found</h3>
            <p className="text-muted-foreground text-sm mt-1">Try adjusting your filters</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {clinics.map((clinic: any) => <ClinicCard key={clinic.id} clinic={clinic} />)}
            </div>
            <div className="mt-8 flex items-center justify-center gap-3">
              <Button variant="outline" onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}>Previous</Button>
              <span className="text-sm text-muted-foreground">Page {page + 1}</span>
              <Button variant="outline" onClick={() => setPage(p => p + 1)} disabled={!hasMore}>Next</Button>
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}
