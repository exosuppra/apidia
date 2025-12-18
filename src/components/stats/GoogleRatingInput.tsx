import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ExternalLink, Save, Star, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface GoogleRatingData {
  id?: string;
  establishment_name: string;
  google_maps_url: string | null;
  current_rating: number | null;
  total_reviews: number | null;
  last_updated_at: string | null;
}

interface GoogleRatingInputProps {
  establishmentName: string;
  onRatingUpdated?: () => void;
}

export function GoogleRatingInput({ establishmentName, onRatingUpdated }: GoogleRatingInputProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [data, setData] = useState<GoogleRatingData>({
    establishment_name: establishmentName,
    google_maps_url: "",
    current_rating: null,
    total_reviews: null,
    last_updated_at: null,
  });

  useEffect(() => {
    fetchExistingData();
  }, [establishmentName]);

  const fetchExistingData = async () => {
    setLoading(true);
    try {
      const { data: existing, error } = await supabase
        .from("ereputation_google_ratings")
        .select("*")
        .eq("establishment_name", establishmentName)
        .maybeSingle();

      if (error) throw error;

      if (existing) {
        setData({
          id: existing.id,
          establishment_name: existing.establishment_name,
          google_maps_url: existing.google_maps_url,
          current_rating: existing.current_rating,
          total_reviews: existing.total_reviews,
          last_updated_at: existing.last_updated_at,
        });
      }
    } catch (err) {
      console.error("Erreur chargement données Google:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      
      const payload = {
        establishment_name: establishmentName,
        google_maps_url: data.google_maps_url || null,
        current_rating: data.current_rating,
        total_reviews: data.total_reviews,
        last_updated_at: new Date().toISOString(),
        updated_by: userData.user?.id || null,
      };

      if (data.id) {
        const { error } = await supabase
          .from("ereputation_google_ratings")
          .update(payload)
          .eq("id", data.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("ereputation_google_ratings")
          .insert(payload);
        if (error) throw error;
      }

      toast({
        title: "Enregistré",
        description: "Note Google Maps mise à jour",
      });

      fetchExistingData();
      onRatingUpdated?.();
    } catch (err: any) {
      console.error("Erreur sauvegarde:", err);
      toast({
        title: "Erreur",
        description: err.message || "Impossible de sauvegarder",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const openGoogleMaps = () => {
    if (data.google_maps_url) {
      window.open(data.google_maps_url, "_blank");
    }
  };

  const fetchRatingFromGoogle = async () => {
    if (!data.google_maps_url) {
      toast({
        title: "URL requise",
        description: "Veuillez d'abord entrer l'URL Google Maps",
        variant: "destructive",
      });
      return;
    }

    setFetching(true);
    try {
      const { data: result, error } = await supabase.functions.invoke("scrape-google-rating", {
        body: { googleMapsUrl: data.google_maps_url },
      });

      if (error) throw error;

      if (result.error) {
        toast({
          title: "Erreur",
          description: result.error,
          variant: "destructive",
        });
        return;
      }

      setData((prev) => ({
        ...prev,
        current_rating: result.rating ?? prev.current_rating,
        total_reviews: result.reviewCount ?? prev.total_reviews,
      }));

      toast({
        title: "Données récupérées",
        description: `Note: ${result.rating ?? "N/A"} - Avis: ${result.reviewCount ?? "N/A"}`,
      });
    } catch (err: any) {
      console.error("Erreur récupération note:", err);
      toast({
        title: "Erreur",
        description: err.message || "Impossible de récupérer les données",
        variant: "destructive",
      });
    } finally {
      setFetching(false);
    }
  };

  if (loading) {
    return (
      <div className="p-4 bg-muted/30 rounded-lg border border-border/50 animate-pulse">
        <div className="h-4 bg-muted rounded w-1/3 mb-2"></div>
        <div className="h-8 bg-muted rounded w-full"></div>
      </div>
    );
  }

  return (
    <div className="p-4 bg-muted/30 rounded-lg border border-border/50 space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <Star className="h-4 w-4 text-yellow-500" />
        Note Google Maps
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="md:col-span-2">
          <Label htmlFor={`url-${establishmentName}`} className="text-xs text-muted-foreground">
            URL Google Maps
          </Label>
          <div className="flex gap-2">
            <Input
              id={`url-${establishmentName}`}
              placeholder="https://maps.google.com/..."
              value={data.google_maps_url || ""}
              onChange={(e) => setData({ ...data, google_maps_url: e.target.value })}
              className="text-sm"
            />
            <Button
              variant="outline"
              size="icon"
              onClick={openGoogleMaps}
              disabled={!data.google_maps_url}
              title="Ouvrir dans Google Maps"
            >
              <ExternalLink className="h-4 w-4" />
            </Button>
            <Button
              variant="secondary"
              size="icon"
              onClick={fetchRatingFromGoogle}
              disabled={!data.google_maps_url || fetching}
              title="Récupérer la note automatiquement"
            >
              <RefreshCw className={`h-4 w-4 ${fetching ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>

        <div>
          <Label htmlFor={`rating-${establishmentName}`} className="text-xs text-muted-foreground">
            Note /5
          </Label>
          <Input
            id={`rating-${establishmentName}`}
            type="number"
            step="0.1"
            min="0"
            max="5"
            placeholder="4.3"
            value={data.current_rating ?? ""}
            onChange={(e) => setData({ ...data, current_rating: e.target.value ? parseFloat(e.target.value) : null })}
            className="text-sm"
          />
        </div>

        <div>
          <Label htmlFor={`reviews-${establishmentName}`} className="text-xs text-muted-foreground">
            Nombre d'avis
          </Label>
          <Input
            id={`reviews-${establishmentName}`}
            type="number"
            min="0"
            placeholder="127"
            value={data.total_reviews ?? ""}
            onChange={(e) => setData({ ...data, total_reviews: e.target.value ? parseInt(e.target.value) : null })}
            className="text-sm"
          />
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="text-xs text-muted-foreground">
          {data.last_updated_at ? (
            <>Dernière MàJ : {format(new Date(data.last_updated_at), "dd/MM/yyyy à HH:mm", { locale: fr })}</>
          ) : (
            <>Jamais mis à jour</>
          )}
        </div>
        <Button size="sm" onClick={handleSave} disabled={saving}>
          <Save className="h-4 w-4 mr-1" />
          {saving ? "..." : "Enregistrer"}
        </Button>
      </div>
    </div>
  );
}
