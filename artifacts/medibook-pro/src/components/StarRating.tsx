import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface StarRatingProps {
  rating: number;
  max?: number;
  size?: number;
  className?: string;
  interactive?: boolean;
  onChange?: (rating: number) => void;
}

export default function StarRating({ rating, max = 5, size = 16, className, interactive, onChange }: StarRatingProps) {
  return (
    <div className={cn("flex items-center gap-0.5", className)}>
      {Array.from({ length: max }, (_, i) => i + 1).map(star => (
        <Star
          key={star}
          size={size}
          className={cn(
            "transition-colors",
            star <= rating ? "fill-amber-400 text-amber-400" : "text-gray-200",
            interactive && "cursor-pointer hover:fill-amber-300 hover:text-amber-300"
          )}
          onClick={interactive && onChange ? () => onChange(star) : undefined}
        />
      ))}
    </div>
  );
}
