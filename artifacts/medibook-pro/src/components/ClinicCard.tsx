import { Link } from "wouter";
import { Star, MapPin, Phone, Clock, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn, formatCurrency } from "@/lib/utils";

interface ClinicCardProps {
  clinic: {
    id: number;
    name: string;
    categoryName?: string | null;
    address: string;
    city: string;
    phone: string;
    rating?: string | number | null;
    reviewCount?: number;
    logoUrl?: string | null;
    subscriptionPlan?: string;
    isEmergencyAvailable?: boolean;
    workingHours?: string | null;
    status?: string;
  };
  compact?: boolean;
}

const planColors: Record<string, string> = {
  premium: "bg-amber-100 text-amber-800 border-amber-200",
  enterprise: "bg-purple-100 text-purple-800 border-purple-200",
  basic: "bg-gray-100 text-gray-600 border-gray-200",
};

export default function ClinicCard({ clinic, compact }: ClinicCardProps) {
  const rating = clinic.rating ? parseFloat(String(clinic.rating)) : null;

  return (
    <div className={cn(
      "group bg-card border rounded-xl overflow-hidden hover:shadow-md transition-all duration-200 hover:-translate-y-0.5",
      compact ? "flex gap-3 p-3" : "flex flex-col"
    )}>
      {/* Logo/Image */}
      <div className={cn(
        "bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center flex-shrink-0",
        compact ? "w-14 h-14 rounded-lg" : "h-36 w-full"
      )}>
        {clinic.logoUrl ? (
          <img src={clinic.logoUrl} alt={clinic.name} className="w-full h-full object-cover" />
        ) : (
          <span className="text-2xl font-bold text-primary/50">{clinic.name.slice(0, 2).toUpperCase()}</span>
        )}
      </div>

      <div className={cn("flex flex-col gap-1 flex-1", compact ? "" : "p-4")}>
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-foreground truncate group-hover:text-primary transition-colors">
              {clinic.name}
            </h3>
            {clinic.categoryName && (
              <span className="text-xs text-muted-foreground">{clinic.categoryName}</span>
            )}
          </div>
          <div className="flex flex-col items-end gap-1">
            {clinic.subscriptionPlan && clinic.subscriptionPlan !== "basic" && (
              <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", planColors[clinic.subscriptionPlan])}>
                {clinic.subscriptionPlan.toUpperCase()}
              </Badge>
            )}
            {clinic.isEmergencyAvailable && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-red-50 text-red-700 border-red-200 flex items-center gap-0.5">
                <Zap size={8} />EMERGENCY
              </Badge>
            )}
          </div>
        </div>

        {/* Rating */}
        {rating !== null && (
          <div className="flex items-center gap-1">
            <Star size={12} className="fill-amber-400 text-amber-400" />
            <span className="text-xs font-medium">{rating.toFixed(1)}</span>
            <span className="text-xs text-muted-foreground">({clinic.reviewCount || 0} reviews)</span>
          </div>
        )}

        {/* Info */}
        {!compact && (
          <div className="space-y-1 mt-1">
            <div className="flex items-start gap-1.5 text-xs text-muted-foreground">
              <MapPin size={12} className="mt-0.5 flex-shrink-0 text-primary/60" />
              <span className="truncate">{clinic.address}, {clinic.city}</span>
            </div>
            {clinic.workingHours && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Clock size={12} className="flex-shrink-0 text-primary/60" />
                <span>{clinic.workingHours}</span>
              </div>
            )}
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Phone size={12} className="flex-shrink-0 text-primary/60" />
              <span>{clinic.phone}</span>
            </div>
          </div>
        )}

        {!compact && (
          <div className="mt-3 flex gap-2">
            <Link href={`/clinics/${clinic.id}`} className="flex-1">
              <Button variant="outline" size="sm" className="w-full text-xs">View Details</Button>
            </Link>
            <Link href={`/clinics/${clinic.id}/book`} className="flex-1">
              <Button size="sm" className="w-full text-xs">Book Now</Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
