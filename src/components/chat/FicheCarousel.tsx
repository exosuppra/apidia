import { useRef, useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import FichePreviewCard, { FichePreview } from "./FichePreviewCard";
import { cn } from "@/lib/utils";

interface FicheCarouselProps {
  fiches: FichePreview[];
  /** Compact mode for floating chat widget */
  compact?: boolean;
}

export default function FicheCarousel({ fiches, compact = false }: FicheCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const updateScrollState = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;

    const { scrollLeft, scrollWidth, clientWidth } = el;
    setCanScrollLeft(scrollLeft > 4);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 4);

    // Calculate active page based on card width + gap
    const cardWidth = compact ? 244 : 276; // w-[228px] + gap or w-[260px] + gap
    const visibleCards = Math.max(1, Math.floor(clientWidth / cardWidth));
    const total = Math.ceil(fiches.length / visibleCards);
    const currentPage = Math.round(scrollLeft / (cardWidth * visibleCards));
    setTotalPages(total);
    setActiveIndex(Math.min(currentPage, total - 1));
  }, [fiches.length, compact]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    updateScrollState();
    el.addEventListener("scroll", updateScrollState, { passive: true });
    const ro = new ResizeObserver(updateScrollState);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", updateScrollState);
      ro.disconnect();
    };
  }, [updateScrollState]);

  const scroll = (direction: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;
    const scrollAmount = el.clientWidth * 0.85;
    el.scrollBy({ left: direction === "left" ? -scrollAmount : scrollAmount, behavior: "smooth" });
  };

  const scrollToPage = (page: number) => {
    const el = scrollRef.current;
    if (!el) return;
    const cardWidth = compact ? 244 : 276;
    const visibleCards = Math.max(1, Math.floor(el.clientWidth / cardWidth));
    el.scrollTo({ left: page * cardWidth * visibleCards, behavior: "smooth" });
  };

  if (fiches.length === 0) return null;

  return (
    <div className="space-y-2">
      {/* Header row with count + arrows */}
      <div className="flex items-center justify-between px-1">
        <p className="text-xs text-muted-foreground">
          {fiches.length} résultat{fiches.length > 1 ? "s" : ""}
        </p>
        {fiches.length > 1 && (
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className={cn("h-7 w-7 rounded-full", !canScrollLeft && "opacity-40")}
              disabled={!canScrollLeft}
              onClick={() => scroll("left")}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className={cn("h-7 w-7 rounded-full", !canScrollRight && "opacity-40")}
              disabled={!canScrollRight}
              onClick={() => scroll("right")}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Scrollable card area */}
      <div
        ref={scrollRef}
        className="-mx-1 overflow-x-auto overscroll-x-contain scroll-smooth scrollbar-none"
      >
        <div className={cn("flex w-max gap-3 px-1 pr-4", compact && "gap-2")}>
          {fiches.map((fiche) => (
            <FichePreviewCard key={fiche.fiche_id} fiche={fiche} compact={compact} />
          ))}
        </div>
      </div>

      {/* Dot indicators */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-1.5 pt-1">
          {Array.from({ length: totalPages }).map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => scrollToPage(i)}
              className={cn(
                "h-1.5 rounded-full transition-all duration-200",
                i === activeIndex
                  ? "w-4 bg-primary"
                  : "w-1.5 bg-muted-foreground/30 hover:bg-muted-foreground/50"
              )}
              aria-label={`Page ${i + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
