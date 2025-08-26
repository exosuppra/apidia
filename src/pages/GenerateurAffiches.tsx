import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FabricPosterCanvas } from "@/components/FabricPosterCanvas";
import Seo from "@/components/Seo";
import { toast } from "sonner";
import { 
  Camera, 
  Wand2, 
  Download, 
  Search,
  Calendar,
  MapPin,
  Clock,
  Users,
  Sparkles,
  ArrowLeft,
  Loader2,
  Image as ImageIcon,
  Palette,
  Type,
  Layout,
  RotateCcw
} from "lucide-react";

// Événements proposés pour la région
const mockFiches = [
  {
    id: "1",
    title: "Festival de Lavande",
    type: "Manifestation culturelle",
    dateDebut: "2024-07-08",
    dateFin: "2024-07-15",
    lieu: "Plateau de Valensole",
    description: "Festival annuel célébrant la lavande en fleur avec animations provençales, marchés d'artisans et spectacles traditionnels au cœur des champs violets.",
    image: "https://images.unsplash.com/photo-1499002238440-d264edd596ec?w=400&h=240&fit=crop&crop=center"
  },
  {
    id: "2", 
    title: "Thermalies & Bien-être",
    type: "Manifestation commerciale",
    dateDebut: "2024-10-05",
    dateFin: "2024-10-07",
    lieu: "Centre thermal, Gréoux-les-Bains",
    description: "Salon du thermalisme et du bien-être avec exposants, conférences santé, ateliers relaxation et découverte des soins thermaux.",
    image: "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=400&h=240&fit=crop&crop=center"
  },
  {
    id: "3",
    title: "Trail des Collines",
    type: "Manifestation sportive", 
    dateDebut: "2024-09-22",
    dateFin: "2024-09-22",
    lieu: "Centre-ville, Manosque",
    description: "Course nature de 10km et 21km à travers les collines manosquines, départ et arrivée place du Terreau avec ravitaillement local.",
    image: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&h=240&fit=crop&crop=center"
  }
];

const styles = [
  { id: "moderne", name: "Moderne", description: "Design épuré et contemporain" },
  { id: "vintage", name: "Vintage", description: "Style rétro et authentique" },
  { id: "festif", name: "Festif", description: "Coloré et dynamique" },
  { id: "elegant", name: "Élégant", description: "Sobre et sophistiqué" },
];

export default function GenerateurAffiches() {
  const [selectedFiche, setSelectedFiche] = useState<typeof mockFiches[0] | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStyle, setSelectedStyle] = useState("");
  const [customText, setCustomText] = useState("");
  const [customImage, setCustomImage] = useState<string | null>(null);
  const [customImagePortrait, setCustomImagePortrait] = useState<string | null>(null);
  const [customImageLandscape, setCustomImageLandscape] = useState<string | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedPosters, setGeneratedPosters] = useState<{
    print: string | null;
    web: {
      story: string | null;
      feed: string | null;
      banner: string | null;
    };
  }>({
    print: null,
    web: {
      story: null,
      feed: null,
      banner: null
    }
  });

  // Sélection automatique du style selon l'événement
  const getAutoStyle = (eventType: string) => {
    const normalizedType = eventType.toLowerCase();
    
    if (normalizedType.includes('sport') || normalizedType.includes('trail') || normalizedType.includes('course')) {
      return {
        style: 'moderne',
        reason: 'Style moderne sélectionné pour les événements sportifs - design dynamique et énergique',
        colors: 'Palette orange/rouge pour l\'énergie et le mouvement'
      };
    }
    
    if (normalizedType.includes('culturel') || normalizedType.includes('festival') || normalizedType.includes('jazz')) {
      return {
        style: 'elegant',
        reason: 'Style élégant choisi pour les événements culturels - sophistiqué et raffiné',
        colors: 'Palette violette/pourpre pour l\'art et la créativité'
      };
    }
    
    if (normalizedType.includes('commercial') || normalizedType.includes('marché') || normalizedType.includes('noël')) {
      return {
        style: 'festif',
        reason: 'Style festif adapté aux événements commerciaux - accueillant et chaleureux',
        colors: 'Palette bleue/multicolore pour la convivialité'
      };
    }
    
    return {
      style: 'moderne',
      reason: 'Style moderne par défaut - design polyvalent et professionnel',
      colors: 'Palette neutre adaptable'
    };
  };

  // Filtrage des fiches
  const filteredFiches = mockFiches.filter(fiche =>
    fiche.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    fiche.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
    fiche.lieu.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Auto-sélection du style quand une fiche est sélectionnée
  useEffect(() => {
    if (selectedFiche && !selectedStyle) {
      const autoStyle = getAutoStyle(selectedFiche.type);
      setSelectedStyle(autoStyle.style);
    }
  }, [selectedFiche, selectedStyle]);

  // Fonction de génération automatique des affiches
  const generateAllPosters = async () => {
    if (!selectedFiche || !selectedStyle) {
      toast.error("Veuillez sélectionner un événement et un style");
      return;
    }

    setIsGenerating(true);
    toast("🎨 Génération automatique de vos affiches...");

    try {
      // Formats de sortie
      const formats = {
        print: { width: 3543, height: 4959, name: "A3 Print 300 DPI", dpi: 300 },
        story: { width: 1080, height: 1920, name: "Story Instagram" },
        feed: { width: 1080, height: 1350, name: "Feed Instagram" },
        banner: { width: 1920, height: 1080, name: "Bannière Facebook" }
      };

      const results: any = { print: null, web: { story: null, feed: null, banner: null } };

      // Générer chaque format
      for (const [formatKey, formatConfig] of Object.entries(formats)) {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = formatConfig.width;
          canvas.height = formatConfig.height;
          const ctx = canvas.getContext('2d')!;

          // Charger l'image de fond (utiliser l'image personnalisée appropriée selon le format)
          const img = new Image();
          img.crossOrigin = 'anonymous';
          
          await new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = reject;
            
            // Choisir l'image selon le format
            let imageSource = selectedFiche.image; // Image par défaut
            
            if (formatKey === 'banner' && customImageLandscape) {
              // Utiliser l'image paysage pour les bannières web
              imageSource = customImageLandscape;
            } else if (['print', 'story', 'feed'].includes(formatKey) && customImagePortrait) {
              // Utiliser l'image portrait pour les formats verticaux
              imageSource = customImagePortrait;
            } else if (customImage) {
              // Fallback sur l'ancienne variable si présente
              imageSource = customImage;
            }
            
            img.src = imageSource;
          });

          // Dessiner l'image de fond (couvrir tout le canvas)
          const scaleX = canvas.width / img.width;
          const scaleY = canvas.height / img.height;
          const scale = Math.max(scaleX, scaleY);
          
          const scaledWidth = img.width * scale;
          const scaledHeight = img.height * scale;
          const offsetX = (canvas.width - scaledWidth) / 2;
          const offsetY = (canvas.height - scaledHeight) / 2;
          
          ctx.drawImage(img, offsetX, offsetY, scaledWidth, scaledHeight);

          // Appliquer l'overlay selon le style
          const template = getTemplateStyle(selectedStyle, selectedFiche.type);
          
          // Overlay gradient ou solid
          if (template.overlay.type === 'gradient' && 'stops' in template.overlay) {
            const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
            template.overlay.stops.forEach(stop => {
              gradient.addColorStop(stop.offset, stop.color);
            });
            ctx.fillStyle = gradient;
          } else if (template.overlay.type === 'solid' && 'color' in template.overlay) {
            ctx.fillStyle = template.overlay.color;
          } else {
            ctx.fillStyle = 'rgba(0,0,0,0.7)'; // fallback
          }
          ctx.fillRect(0, 0, canvas.width, canvas.height);

          // Configuration responsive selon le format
          const isVertical = canvas.height > canvas.width;
          const baseSize = Math.min(canvas.width, canvas.height);
          
          const layout = {
            margin: baseSize * 0.08,
            titleSize: baseSize * (isVertical ? 0.10 : 0.07),
            subtitleSize: baseSize * (isVertical ? 0.04 : 0.035),
            detailSize: baseSize * (isVertical ? 0.03 : 0.025),
            spacing: baseSize * 0.05
          };

          // Polices Google Fonts selon le type d'événement avec fallbacks robustes
          const getFontFamily = (element: 'title' | 'subtitle' | 'detail') => {
            const eventLower = selectedFiche.type.toLowerCase();
            
            if (eventLower.includes('sport') || eventLower.includes('trail')) {
              // Sport: polices impactantes
              return element === 'title' ? '"Bebas Neue", "Oswald", Impact, "Arial Black", sans-serif' : 
                     element === 'subtitle' ? '"Oswald", "Roboto Condensed", "Arial Narrow", sans-serif' : 
                     '"Roboto", "Arial", sans-serif';
            } else if (eventLower.includes('culturel') || eventLower.includes('festival') || eventLower.includes('jazz')) {
              // Culture: polices élégantes
              return element === 'title' ? '"Playfair Display", "Times New Roman", serif' : 
                     element === 'subtitle' ? '"Crimson Text", "Georgia", serif' : 
                     '"Lato", "Arial", sans-serif';
            } else if (eventLower.includes('commercial') || eventLower.includes('marché')) {
              // Commercial: polices modernes
              return element === 'title' ? '"Montserrat", "Helvetica", sans-serif' : 
                     element === 'subtitle' ? '"Open Sans", "Arial", sans-serif' : 
                     '"Lato", "Arial", sans-serif';
            } else if (eventLower.includes('festiv') || eventLower.includes('fête')) {
              // Festif: polices ludiques
              return element === 'title' ? '"Fredoka One", "Comic Sans MS", cursive' : 
                     element === 'subtitle' ? '"Comfortaa", "Verdana", cursive' : 
                     '"Nunito", "Arial", sans-serif';
            } else {
              // Par défaut: polices professionnelles
              return element === 'title' ? '"Inter", "Helvetica", "Arial", sans-serif' : 
                     element === 'subtitle' ? '"Inter", "Helvetica", "Arial", sans-serif' : 
                     '"Inter", "Arial", sans-serif';
            }
          };

          console.log(`🎨 Génération ${formatKey}:`, {
            title: selectedFiche.title,
            type: selectedFiche.type,
            fonts: {
              title: getFontFamily('title'),
              subtitle: getFontFamily('subtitle'),
              detail: getFontFamily('detail')
            }
          });

          // Badge type d'événement
          const badgeY = layout.margin;
          const badgeHeight = layout.subtitleSize * 1.4;
          const badgeText = selectedFiche.type.toUpperCase();
          
          ctx.font = `600 ${layout.detailSize * 0.9}px ${getFontFamily('detail')}`;
          const badgeWidth = ctx.measureText(badgeText).width + layout.margin;
          
          // Fond du badge avec ombre
          ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
          ctx.shadowBlur = 8;
          ctx.shadowOffsetY = 4;
          
          ctx.fillStyle = template.accent;
          ctx.beginPath();
          ctx.roundRect(layout.margin, badgeY, badgeWidth, badgeHeight, badgeHeight / 3);
          ctx.fill();
          
          // Reset shadow pour le texte
          ctx.shadowColor = 'transparent';
          ctx.shadowBlur = 0;
          ctx.shadowOffsetY = 0;
          
          // Texte du badge
          ctx.fillStyle = '#ffffff';
          ctx.textAlign = 'left';
          ctx.font = `700 ${layout.detailSize * 0.9}px ${getFontFamily('detail')}`;
          ctx.fillText(badgeText, layout.margin + layout.margin/2, badgeY + badgeHeight * 0.65);

          // TITRE PRINCIPAL - Plus visible et imposant
          const titleY = canvas.height * (isVertical ? 0.3 : 0.4);
          // Utiliser le titre original + texte personnalisé en supplément
          const mainTitle = selectedFiche.title;
          const additionalText = customText;
          
          console.log(`📝 Titre principal à afficher: "${mainTitle}"`);
          if (additionalText) {
            console.log(`📝 Texte supplémentaire: "${additionalText}"`);
          }
          
          // Police et taille du titre selon le format
          const titleFontSize = isVertical ? layout.titleSize * 1.4 : layout.titleSize * 1.2;
          const titleFont = `900 ${titleFontSize}px ${getFontFamily('title')}`;
          
          console.log(`🎯 Police titre: ${titleFont}`);
          
          ctx.font = titleFont;
          ctx.fillStyle = template.textColor;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'top';
          
          // Ombre portée forte pour le titre
          ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
          ctx.shadowBlur = 15;
          ctx.shadowOffsetX = 3;
          ctx.shadowOffsetY = 6;
          
          // Découper le titre principal en lignes si nécessaire
          const maxTitleWidth = canvas.width - layout.margin * 2;
          const words = mainTitle.split(' ');
          const titleLines: string[] = [];
          let currentLine = '';
          
          for (const word of words) {
            const testLine = currentLine + (currentLine ? ' ' : '') + word;
            const metrics = ctx.measureText(testLine);
            if (metrics.width <= maxTitleWidth || !currentLine) {
              currentLine = testLine;
            } else {
              titleLines.push(currentLine);
              currentLine = word;
            }
          }
          if (currentLine) titleLines.push(currentLine);
          
          console.log(`📏 Titre principal divisé en ${titleLines.length} lignes:`, titleLines);
          
          // Afficher chaque ligne du titre principal
          titleLines.forEach((line, index) => {
            const lineY = titleY + index * titleFontSize * 1.2;
            console.log(`✏️ Ligne ${index + 1}: "${line}" à Y=${lineY}`);
            ctx.fillText(line, canvas.width / 2, lineY);
          });

          // TEXTE SUPPLÉMENTAIRE (si présent) - Mise en forme améliorée
          let additionalTextHeight = 0;
          if (additionalText) {
            const additionalTextY = titleY + titleLines.length * titleFontSize * 1.2 + layout.spacing * 1.2;
            const additionalFontSize = titleFontSize * 0.75; // Taille légèrement plus grande
            
            // Style du texte supplémentaire avec encadré
            ctx.font = `700 ${additionalFontSize}px ${getFontFamily('subtitle')}`;
            
            // Découper le texte supplémentaire en lignes
            const additionalWords = additionalText.split(' ');
            const additionalLines: string[] = [];
            let additionalCurrentLine = '';
            
            const maxAdditionalWidth = canvas.width - layout.margin * 3; // Un peu plus étroit
            
            for (const word of additionalWords) {
              const testLine = additionalCurrentLine + (additionalCurrentLine ? ' ' : '') + word;
              const metrics = ctx.measureText(testLine);
              if (metrics.width <= maxAdditionalWidth || !additionalCurrentLine) {
                additionalCurrentLine = testLine;
              } else {
                additionalLines.push(additionalCurrentLine);
                additionalCurrentLine = word;
              }
            }
            if (additionalCurrentLine) additionalLines.push(additionalCurrentLine);
            
            // Calculer la hauteur totale du bloc de texte
            const totalTextHeight = additionalLines.length * additionalFontSize * 1.3;
            
            // Afficher le texte supplémentaire avec ombre portée
            ctx.fillStyle = template.textColor;
            ctx.textAlign = 'center';
            
            // Ombre portée pour le texte supplémentaire
            ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
            ctx.shadowBlur = 15;
            ctx.shadowOffsetX = 3;
            ctx.shadowOffsetY = 6;
            
            additionalLines.forEach((line, index) => {
              const lineY = additionalTextY + index * additionalFontSize * 1.3;
              ctx.fillText(line, canvas.width / 2, lineY);
            });
            
            additionalTextHeight = totalTextHeight + layout.spacing;
          }
          
          // Reset shadow
          ctx.shadowColor = 'transparent';
          ctx.shadowBlur = 0;
          ctx.shadowOffsetX = 0;
          ctx.shadowOffsetY = 0;

          // DATE ET HEURE - Sous-titre proéminent
          const dateText = selectedFiche.dateDebut === selectedFiche.dateFin 
            ? new Date(selectedFiche.dateDebut).toLocaleDateString('fr-FR', { 
                weekday: 'long', 
                day: 'numeric', 
                month: 'long',
                year: 'numeric'
              }) + ' • 14:00' // Ajout d'une heure par défaut, à personaliser selon les données
            : `${new Date(selectedFiche.dateDebut).toLocaleDateString('fr-FR')} - ${new Date(selectedFiche.dateFin).toLocaleDateString('fr-FR')} • 14:00`;

          const dateY = titleY + titleLines.length * titleFontSize * 1.1 + additionalTextHeight + layout.spacing * 1.5;
          ctx.font = `700 ${layout.subtitleSize}px ${getFontFamily('subtitle')}`;
          ctx.fillStyle = template.secondaryColor;
          ctx.textAlign = 'center';
          
          // Ombre légère pour la date
          ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
          ctx.shadowBlur = 8;
          ctx.shadowOffsetY = 3;
          
          ctx.fillText(dateText.toUpperCase(), canvas.width / 2, dateY);

          // LIEU AVEC VILLE - Information importante
          const locationY = dateY + layout.spacing * 1.2;
          ctx.font = `600 ${layout.detailSize * 1.1}px ${getFontFamily('detail')}`;
          ctx.fillStyle = template.textColor;
          const location = selectedFiche.lieu; // Afficher le lieu complet avec la ville
          
          // Ombre pour le lieu
          ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
          ctx.shadowBlur = 6;
          ctx.shadowOffsetY = 2;
          
          ctx.fillText(`📍 ${location.toUpperCase()}`, canvas.width / 2, locationY);

          // Ligne d'accent décorative en bas
          const lineY = canvas.height - layout.margin * 1.5;
          const lineWidth = canvas.width * 0.4;
          
          // Ombre pour la ligne
          ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
          ctx.shadowBlur = 6;
          ctx.shadowOffsetY = 3;
          
          ctx.fillStyle = template.accent;
          ctx.fillRect((canvas.width - lineWidth) / 2, lineY, lineWidth, 12);

          // Reset tous les effets d'ombre
          ctx.shadowColor = 'transparent';
          ctx.shadowBlur = 0;
          ctx.shadowOffsetX = 0;
          ctx.shadowOffsetY = 0;

          // Convertir en image
          const dataURL = canvas.toDataURL('image/png', 1.0);
          
          if (formatKey === 'print') {
            results.print = dataURL;
          } else {
            results.web[formatKey as keyof typeof results.web] = dataURL;
          }

          toast(`✅ ${formatConfig.name} généré`);
          
        } catch (error) {
          console.error(`Erreur génération ${formatKey}:`, error);
          toast.error(`❌ Erreur ${formatKey}`);
        }
      }

      setGeneratedPosters(results);
      toast.success("🎉 Toutes les affiches ont été générées avec succès !");
      
    } catch (error) {
      console.error('Erreur génération globale:', error);
      toast.error("❌ Erreur lors de la génération");
    } finally {
      setIsGenerating(false);
    }
  };

  // Configuration des templates selon le style
  const getTemplateStyle = (style: string, eventType: string) => {
    const eventLower = eventType.toLowerCase();
    
    // Couleurs selon le type d'événement
    const getEventColors = () => {
      if (eventLower.includes('sport') || eventLower.includes('trail')) {
        return { primary: '#f97316', secondary: '#ea580c', accent: '#fb923c' };
      }
      if (eventLower.includes('culturel') || eventLower.includes('festival') || eventLower.includes('jazz')) {
        return { primary: '#8b5cf6', secondary: '#7c3aed', accent: '#a78bfa' };
      }
      if (eventLower.includes('commercial') || eventLower.includes('marché')) {
        return { primary: '#3b82f6', secondary: '#1d4ed8', accent: '#60a5fa' };
      }
      if (eventLower.includes('festiv') || eventLower.includes('fête')) {
        return { primary: '#ec4899', secondary: '#db2777', accent: '#f472b6' };
      }
      return { primary: '#6366f1', secondary: '#4f46e5', accent: '#818cf8' };
    };

    const colors = getEventColors();

    const templates = {
      moderne: {
        overlay: {
          type: 'gradient',
          stops: [
            { offset: 0, color: 'rgba(0,0,0,0.7)' },
            { offset: 0.6, color: 'rgba(0,0,0,0.3)' },
            { offset: 1, color: 'rgba(0,0,0,0.8)' }
          ]
        },
        textColor: '#ffffff',
        secondaryColor: '#e2e8f0',
        accent: colors.primary
      },
      elegant: {
        overlay: {
          type: 'solid',
          color: 'rgba(15,23,42,0.75)'
        },
        textColor: '#f8fafc',
        secondaryColor: '#e2e8f0',
        accent: colors.secondary
      },
      festif: {
        overlay: {
          type: 'gradient',
          stops: [
            { offset: 0, color: 'rgba(236,72,153,0.8)' },
            { offset: 0.5, color: 'rgba(147,51,234,0.6)' },
            { offset: 1, color: 'rgba(59,130,246,0.8)' }
          ]
        },
        textColor: '#ffffff',
        secondaryColor: '#ffffff',
        accent: '#fbbf24'
      },
      vintage: {
        overlay: {
          type: 'solid',
          color: 'rgba(92,66,46,0.85)'
        },
        textColor: '#fef3c7',
        secondaryColor: '#fde68a',
        accent: '#d97706'
      }
    };

    return templates[style as keyof typeof templates] || templates.moderne;
  };

  const handleGenerate = () => {
    generateAllPosters();
  };

  const getFontStyleForEvent = (eventType: string) => {
    const normalizedType = eventType.toLowerCase();
    if (normalizedType.includes('sport') || normalizedType.includes('trail') || normalizedType.includes('course')) {
      return { style: "Dynamique", fonts: "Bebas Neue, Oswald", color: "text-orange-600" };
    }
    if (normalizedType.includes('culturel') || normalizedType.includes('festival') || normalizedType.includes('jazz')) {
      return { style: "Élégant", fonts: "Playfair Display, Cormorant", color: "text-purple-600" };
    }
    if (normalizedType.includes('commercial') || normalizedType.includes('marché') || normalizedType.includes('noël')) {
      return { style: "Professionnel", fonts: "Montserrat, Poppins", color: "text-blue-600" };
    }
    if (normalizedType.includes('festiv') || normalizedType.includes('fête') || normalizedType.includes('animation')) {
      return { style: "Festif", fonts: "Fredoka, Comfortaa", color: "text-pink-600" };
    }
    if (normalizedType.includes('gastronomie') || normalizedType.includes('cuisine') || normalizedType.includes('vin')) {
      return { style: "Gourmand", fonts: "Cormorant, Playfair", color: "text-amber-600" };
    }
    return { style: "Moderne", fonts: "Montserrat, Poppins", color: "text-gray-600" };
  };

  return (
    <>
      <Seo 
        title="Générateur d'Affiches Professionnel - Créez des visuels impactants"
        description="Créez des affiches professionnelles pour vos événements avec notre éditeur Fabric.js. Templates modernes, export haute qualité, édition interactive."
      />
      
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        {/* Header */}
        <div className="bg-white border-b border-slate-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center gap-4">
                <Link to="/" className="flex items-center gap-2 text-slate-600 hover:text-slate-900">
                  <ArrowLeft className="w-4 h-4" />
                  Retour
                </Link>
                <div className="h-6 w-px bg-slate-200" />
                <h1 className="text-xl font-semibold text-slate-900">Générateur d'Affiches</h1>
              </div>
              <Badge variant="secondary" className="gap-1">
                <Sparkles className="w-3 h-3" />
                Éditeur Professionnel Fabric.js
              </Badge>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          
          {/* Show generated posters if available */}
          {(generatedPosters.print || Object.values(generatedPosters.web).some(Boolean)) ? (
            <div className="space-y-8">
              {/* Header */}
              <div className="text-center">
                <h2 className="text-3xl font-bold text-slate-900 mb-4">
                  🎉 Vos affiches sont prêtes !
                </h2>
                <p className="text-slate-600 max-w-2xl mx-auto">
                  Téléchargez vos affiches en haute qualité pour l'impression et le web
                </p>
              </div>

              {/* Generated results */}
              <div className="grid lg:grid-cols-2 gap-8">
                
                {/* Print version */}
                {generatedPosters.print && (
                  <Card className="overflow-hidden">
                    <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50">
                      <CardTitle className="flex items-center gap-2 text-green-800">
                        🖨️ Version Impression
                      </CardTitle>
                      <CardDescription>
                        Format A3 - 300 DPI - Haute qualité
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="p-6">
                      <div className="space-y-4">
                        <div className="aspect-[3/4] rounded-lg overflow-hidden bg-slate-100 shadow-lg">
                          <img 
                            src={generatedPosters.print} 
                            alt="Affiche impression"
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="flex items-center justify-between text-sm text-slate-600">
                          <span>3543 × 4959 pixels</span>
                          <Badge variant="secondary">300 DPI</Badge>
                        </div>
                        <Button 
                          onClick={() => {
                            const link = document.createElement('a');
                            link.download = `affiche-print-${selectedFiche?.title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.png`;
                            link.href = generatedPosters.print!;
                            link.click();
                            toast.success("🎉 Affiche téléchargée !");
                          }}
                          className="w-full gap-2 bg-green-600 hover:bg-green-700"
                        >
                          <Download className="w-4 h-4" />
                          Télécharger (Print)
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Web versions */}
                <Card className="overflow-hidden">
                  <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50">
                    <CardTitle className="flex items-center gap-2 text-blue-800">
                      📱 Versions Web & Réseaux sociaux
                    </CardTitle>
                    <CardDescription>
                      Formats optimisés pour Instagram et Facebook
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      
                      {/* Story Instagram */}
                      {generatedPosters.web.story && (
                        <div className="flex items-center gap-4 p-3 bg-slate-50 rounded-lg">
                          <div className="w-16 h-28 rounded overflow-hidden bg-white shadow-sm">
                            <img 
                              src={generatedPosters.web.story} 
                              alt="Story Instagram"
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="flex-1">
                            <h4 className="font-medium">📱 Story Instagram</h4>
                            <p className="text-sm text-slate-600">1080 × 1920 pixels</p>
                          </div>
                          <Button 
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              const link = document.createElement('a');
                              link.download = `story-instagram-${selectedFiche?.title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.png`;
                              link.href = generatedPosters.web.story!;
                              link.click();
                            }}
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                        </div>
                      )}

                      {/* Feed Instagram */}
                      {generatedPosters.web.feed && (
                        <div className="flex items-center gap-4 p-3 bg-slate-50 rounded-lg">
                          <div className="w-16 h-20 rounded overflow-hidden bg-white shadow-sm">
                            <img 
                              src={generatedPosters.web.feed} 
                              alt="Feed Instagram"
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="flex-1">
                            <h4 className="font-medium">📷 Feed Instagram</h4>
                            <p className="text-sm text-slate-600">1080 × 1350 pixels</p>
                          </div>
                          <Button 
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              const link = document.createElement('a');
                              link.download = `feed-instagram-${selectedFiche?.title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.png`;
                              link.href = generatedPosters.web.feed!;
                              link.click();
                            }}
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                        </div>
                      )}

                      {/* Banner Facebook */}
                      {generatedPosters.web.banner && (
                        <div className="flex items-center gap-4 p-3 bg-slate-50 rounded-lg">
                          <div className="w-16 h-9 rounded overflow-hidden bg-white shadow-sm">
                            <img 
                              src={generatedPosters.web.banner} 
                              alt="Banner Facebook"
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="flex-1">
                            <h4 className="font-medium">🖥️ Bannière Facebook</h4>
                            <p className="text-sm text-slate-600">1920 × 1080 pixels</p>
                          </div>
                          <Button 
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              const link = document.createElement('a');
                              link.download = `banner-facebook-${selectedFiche?.title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.png`;
                              link.href = generatedPosters.web.banner!;
                              link.click();
                            }}
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                        </div>
                      )}

                      {/* Download all */}
                      <Button 
                        onClick={() => {
                          // Télécharger tous les formats web
                          Object.entries(generatedPosters.web).forEach(([format, dataURL]) => {
                            if (dataURL) {
                              const link = document.createElement('a');
                              link.download = `${format}-${selectedFiche?.title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.png`;
                              link.href = dataURL;
                              link.click();
                            }
                          });
                          toast.success("📦 Tous les formats web téléchargés !");
                        }}
                        className="w-full gap-2"
                        variant="outline"
                      >
                        <Download className="w-4 h-4" />
                        Télécharger tous les formats web
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Actions */}
              <div className="flex justify-center gap-4">
                <Button 
                  variant="outline"
                  onClick={() => {
                    setGeneratedPosters({ print: null, web: { story: null, feed: null, banner: null } });
                    setSelectedFiche(null);
                    setSelectedStyle("");
                    setCustomText("");
                  }}
                  className="gap-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  Créer une nouvelle affiche
                </Button>
                
                <Button 
                  onClick={generateAllPosters}
                  disabled={isGenerating}
                  className="gap-2"
                >
                  <Wand2 className="w-4 h-4" />
                  Régénérer avec les mêmes paramètres
                </Button>
              </div>
            </div>
          ) : (
            <>
              {/* Introduction */}
              <div className="text-center mb-12">
                <div className="flex items-center justify-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                    <Wand2 className="w-6 h-6 text-white" />
                  </div>
                  <h1 className="text-4xl font-bold bg-gradient-to-r from-slate-900 to-slate-600 bg-clip-text text-transparent">
                    Générateur d'Affiches Professionnel
                  </h1>
                </div>
                <p className="text-lg text-slate-600 max-w-3xl mx-auto leading-relaxed">
                  Créez des visuels impactants pour vos événements avec notre éditeur Fabric.js. 
                  Templates professionnels, édition interactive et export haute qualité.
                </p>
              </div>

              {/* Steps */}
              <div className="grid lg:grid-cols-3 gap-8">
                {/* Étape 1: Sélection de la fiche */}
                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Calendar className="w-5 h-5" />
                        1. Choisir votre événement
                      </CardTitle>
                      <CardDescription>
                        Sélectionnez la fiche Apidae pour laquelle créer l'affiche
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="relative">
                        <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                        <Input
                          placeholder="Rechercher un événement..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                      
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {filteredFiches.map((fiche) => {
                          const fontInfo = getFontStyleForEvent(fiche.type);
                          
                          return (
                            <Card 
                              key={fiche.id}
                              className={`cursor-pointer transition-all ${
                                selectedFiche?.id === fiche.id 
                                  ? 'ring-2 ring-primary bg-primary/5' 
                                  : 'hover:bg-muted/50'
                              }`}
                              onClick={() => setSelectedFiche(fiche)}
                            >
                              <CardContent className="p-3">
                                <div className="flex gap-3">
                                  {fiche.image && (
                                    <img 
                                      src={fiche.image} 
                                      alt={fiche.title}
                                      className="w-16 h-10 object-cover rounded flex-shrink-0"
                                    />
                                  )}
                                  <div className="space-y-2 flex-1 min-w-0">
                                    <div className="flex items-start justify-between">
                                      <h4 className="font-medium text-sm truncate">{fiche.title}</h4>
                                      <Badge variant="secondary" className="text-xs ml-2 flex-shrink-0">
                                        {fiche.type}
                                      </Badge>
                                    </div>
                                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                      <div className="flex items-center gap-1">
                                        <Calendar className="w-3 h-3" />
                                        {new Date(fiche.dateDebut).toLocaleDateString('fr-FR')}
                                      </div>
                                      <div className="flex items-center gap-1">
                                        <MapPin className="w-3 h-3" />
                                        {fiche.lieu.split(',')[0]}
                                      </div>
                                    </div>
                                    {/* Indicateur de style de police */}
                                    <div className="flex items-center gap-2 text-xs">
                                      <Type className="w-3 h-3" />
                                      <span className={`font-medium ${fontInfo.color}`}>
                                        Style {fontInfo.style}
                                      </span>
                                      <span className="text-muted-foreground">
                                        • {fontInfo.fonts}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Détails de la fiche sélectionnée */}
                  {selectedFiche && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">{selectedFiche.title}</CardTitle>
                        <Badge variant="outline">{selectedFiche.type}</Badge>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {selectedFiche.image && (
                          <div className="w-full h-32 rounded-lg overflow-hidden bg-muted">
                            <img 
                              src={selectedFiche.image} 
                              alt={selectedFiche.title}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}
                        <div className="flex items-center gap-2 text-sm">
                          <Calendar className="w-4 h-4 text-muted-foreground" />
                          <span>
                            {new Date(selectedFiche.dateDebut).toLocaleDateString('fr-FR')}
                            {selectedFiche.dateDebut !== selectedFiche.dateFin && 
                              ` au ${new Date(selectedFiche.dateFin).toLocaleDateString('fr-FR')}`
                            }
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <MapPin className="w-4 h-4 text-muted-foreground" />
                          <span>{selectedFiche.lieu}</span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {selectedFiche.description}
                        </p>
                      </CardContent>
                    </Card>
                  )}
                </div>

                {/* Étape 2: Personnalisation */}
                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Palette className="w-5 h-5" />
                        2. Personnaliser le style
                      </CardTitle>
                      <CardDescription>
                        Choisissez le style et les options de votre affiche
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {/* Auto-sélection du style avec explication */}
                      {selectedFiche && (
                        <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
                          <div className="flex items-start gap-3">
                            <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                              <Sparkles className="w-4 h-4 text-primary" />
                            </div>
                            <div className="space-y-2 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-sm">Style sélectionné automatiquement</span>
                                <Badge variant="secondary" className="text-xs">
                                  {styles.find(s => s.id === selectedStyle)?.name}
                                </Badge>
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {(() => {
                                  const autoStyleInfo = getAutoStyle(selectedFiche.type);
                                  return (
                                    <div className="space-y-1">
                                      <p>{autoStyleInfo.reason}</p>
                                      <p className="text-xs">{autoStyleInfo.colors}</p>
                                    </div>
                                  );
                                })()}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      <div>
                        <Label>Style visuel {selectedFiche ? '(modifiable)' : ''}</Label>
                        <Select value={selectedStyle} onValueChange={setSelectedStyle}>
                          <SelectTrigger>
                            <SelectValue placeholder="Choisir un style" />
                          </SelectTrigger>
                          <SelectContent>
                            {styles.map((style) => (
                              <SelectItem key={style.id} value={style.id}>
                                <div>
                                  <div className="font-medium">{style.name}</div>
                                  <div className="text-xs text-muted-foreground">{style.description}</div>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Texte supplémentaire (optionnel)</Label>
                        <Textarea
                          placeholder="Ajouter un texte en complément du titre principal..."
                          value={customText}
                          onChange={(e) => setCustomText(e.target.value)}
                          rows={3}
                        />
                        <p className="text-xs text-muted-foreground">
                          Ce texte s'ajoutera au titre original, il ne le remplacera pas.
                        </p>
                      </div>

                      <div className="space-y-4">
                        <Label className="text-base font-medium">Images personnalisées HD (optionnel)</Label>
                        
                        <div className="grid grid-cols-1 gap-4">
                          {/* Image Portrait pour affiches */}
                          <div className="space-y-2">
                            <Label className="text-sm">Image portrait (affiches)</Label>
                            <Input
                              type="file"
                              accept="image/*"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  const reader = new FileReader();
                                  reader.onload = (e) => setCustomImagePortrait(e.target?.result as string);
                                  reader.readAsDataURL(file);
                                }
                              }}
                            />
                            <p className="text-xs text-muted-foreground">
                              Recommandé : Format vertical (3:4) en HD
                            </p>
                          </div>

                          {/* Image Paysage pour web */}
                          <div className="space-y-2">
                            <Label className="text-sm">Image paysage (web)</Label>
                            <Input
                              type="file"
                              accept="image/*"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  const reader = new FileReader();
                                  reader.onload = (e) => setCustomImageLandscape(e.target?.result as string);
                                  reader.readAsDataURL(file);
                                }
                              }}
                            />
                            <p className="text-xs text-muted-foreground">
                              Recommandé : Format horizontal (16:9) en HD
                            </p>
                          </div>
                        </div>

                         {(customImagePortrait || customImageLandscape) && (
                           <div className="w-full h-24 rounded bg-muted overflow-hidden">
                             <img 
                               src={customImagePortrait || customImageLandscape || ''} 
                               alt="Aperçu image personnalisée"
                               className="w-full h-full object-cover"
                             />
                           </div>
                         )}
                       </div>
                     </CardContent>
                   </Card>
                </div>

                {/* Étape 3: Génération */}
                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Wand2 className="w-5 h-5" />
                        3. Générer vos affiches
                      </CardTitle>
                      <CardDescription>
                        Génération automatique en A3 300DPI + formats web
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <Button 
                        onClick={handleGenerate}
                        disabled={!selectedFiche || !selectedStyle || isGenerating}
                        size="lg"
                        className="w-full gap-2"
                      >
                        {isGenerating ? (
                          <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            Génération en cours...
                          </>
                        ) : (
                          <>
                            <Wand2 className="w-5 h-5" />
                            Générer les affiches
                          </>
                        )}
                      </Button>
                      
                      {!selectedFiche && (
                        <p className="text-sm text-muted-foreground text-center">
                          Sélectionnez d'abord un événement
                        </p>
                      )}
                      
                      {selectedFiche && !selectedStyle && (
                        <p className="text-sm text-muted-foreground text-center">
                          Choisissez un style visuel
                        </p>
                      )}

                      {/* Aperçu des formats générés */}
                      <div className="space-y-3 pt-4 border-t">
                        <h4 className="font-medium text-sm">📦 Formats générés automatiquement :</h4>
                        <div className="space-y-2 text-xs text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                            <strong>A3 Print</strong> - 3543×4959px à 300 DPI
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                            <strong>Story Instagram</strong> - 1080×1920px
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 bg-purple-500 rounded-full" />
                            <strong>Feed Instagram</strong> - 1080×1350px
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 bg-orange-500 rounded-full" />
                            <strong>Bannière Facebook</strong> - 1920×1080px
                          </div>
                        </div>
                        
                        {isGenerating && (
                          <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                            <div className="flex items-center gap-2 text-blue-700">
                              <Loader2 className="w-4 h-4 animate-spin" />
                              <span className="text-sm font-medium">Génération en cours...</span>
                            </div>
                            <p className="text-xs text-blue-600 mt-1">
                              Patientez pendant que nous créons vos affiches haute qualité
                            </p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* Tips */}
              <Card className="mt-12">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5" />
                    Conseils pour créer une affiche efficace
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <h4 className="font-medium text-green-700">✅ À faire</h4>
                      <ul className="space-y-2 text-sm text-muted-foreground">
                        <li>• Hiérarchie claire : titre → date → lieu → détails</li>
                        <li>• Contraste élevé entre texte et arrière-plan</li>
                        <li>• Maximum 3 polices différentes</li>
                        <li>• Une couleur d'accent pour guider l'œil</li>
                        <li>• Tester la lisibilité à distance</li>
                      </ul>
                    </div>
                    <div className="space-y-3">
                      <h4 className="font-medium text-red-700">❌ À éviter</h4>
                      <ul className="space-y-2 text-sm text-muted-foreground">
                        <li>• Trop d'informations sur une seule affiche</li>
                        <li>• Polices fantaisistes pour les détails</li>
                        <li>• Couleurs criardes ou trop nombreuses</li>
                        <li>• Texte trop petit ou mal contrasté</li>
                        <li>• Images pixellisées ou déformées</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>
    </>
  );
}