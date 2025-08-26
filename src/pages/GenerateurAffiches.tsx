import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  Layout
} from "lucide-react";

// Mock data pour les fiches Apidae (en attendant l'intégration avec l'API)
const mockFiches = [
  {
    id: "1",
    title: "Festival de Jazz de Montpellier",
    type: "Manifestation culturelle",
    dateDebut: "2024-06-15",
    dateFin: "2024-06-22",
    lieu: "Esplanade Charles de Gaulle, Montpellier",
    description: "Le plus grand festival de jazz du Sud de la France avec des artistes internationaux. Une semaine de concerts exceptionnels dans un cadre unique.",
    image: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=240&fit=crop&crop=center"
  },
  {
    id: "2", 
    title: "Marché de Noël artisanal",
    type: "Manifestation commerciale",
    dateDebut: "2024-12-01",
    dateFin: "2024-12-24",
    lieu: "Place de la Comédie, Montpellier",
    description: "Marché de Noël traditionnel avec des artisans locaux, produits du terroir et animations pour toute la famille.",
    image: "https://images.unsplash.com/photo-1512389142860-9c449e58a543?w=400&h=240&fit=crop&crop=center"
  },
  {
    id: "3",
    title: "Trail des Vignes",
    type: "Manifestation sportive", 
    dateDebut: "2024-09-14",
    dateFin: "2024-09-14",
    lieu: "Domaine viticole de Pic Saint-Loup",
    description: "Course nature de 15km et 25km à travers les vignobles avec dégustation à l'arrivée.",
    image: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&h=240&fit=crop&crop=center"
  }
];

const styles = [
  { id: "moderne", name: "Moderne", description: "Design épuré et contemporain" },
  { id: "vintage", name: "Vintage", description: "Style rétro et authentique" },
  { id: "festif", name: "Festif", description: "Coloré et dynamique" },
  { id: "elegant", name: "Élégant", description: "Sobre et sophistiqué" },
];

const formats = [
  { id: "a4", name: "A4 Portrait", dimensions: "21x29.7cm" },
  { id: "a3", name: "A3 Paysage", dimensions: "42x29.7cm" },
  { id: "square", name: "Carré", dimensions: "30x30cm" },
  { id: "web", name: "Web/Réseaux sociaux", dimensions: "1080x1080px" },
];

export default function GenerateurAffiches() {
  const [selectedFiche, setSelectedFiche] = useState<typeof mockFiches[0] | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStyle, setSelectedStyle] = useState("");
  const [selectedFormat, setSelectedFormat] = useState("");
  const [customText, setCustomText] = useState("");
  const [customImage, setCustomImage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);

  const filteredFiches = mockFiches.filter(fiche => 
    fiche.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    fiche.type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const generatePosterCanvas = async (
    fiche: typeof mockFiches[0],
    style: string,
    format: string,
    backgroundImage: string,
    customText?: string
  ): Promise<string> => {
    return new Promise((resolve, reject) => {
      // Définir les dimensions selon le format (plus grandes pour meilleure qualité)
      const formatDimensions = {
        a4: { width: 1200, height: 1697 },
        a3: { width: 1697, height: 1200 }, 
        square: { width: 1600, height: 1600 },
        web: { width: 1080, height: 1350 }
      };

      const { width, height } = formatDimensions[format as keyof typeof formatDimensions] || formatDimensions.a4;

      // Créer le canvas
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        reject(new Error('Impossible de créer le contexte Canvas'));
        return;
      }

      // Charger l'image de fond
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      img.onload = () => {
        try {
          // Dessiner l'image de fond avec crop intelligent
          const imgAspect = img.width / img.height;
          const canvasAspect = width / height;
          
          let drawWidth, drawHeight, offsetX = 0, offsetY = 0;
          
          if (imgAspect > canvasAspect) {
            drawHeight = height;
            drawWidth = height * imgAspect;
            offsetX = (width - drawWidth) / 2;
          } else {
            drawWidth = width;
            drawHeight = width / imgAspect;
            offsetY = (height - drawHeight) / 2;
          }
          
          ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);

          // Configuration des styles améliorés
          const styleConfig = {
            moderne: {
              primaryGradient: { 
                start: 'rgba(15, 23, 42, 0.95)', 
                end: 'rgba(30, 64, 175, 0.85)' 
              },
              accentGradient: {
                start: 'rgba(59, 130, 246, 1)',
                end: 'rgba(147, 197, 253, 1)'
              },
              titleFont: `900 ${Math.floor(width * 0.065)}px 'Arial Black', sans-serif`,
              subtitleFont: `600 ${Math.floor(width * 0.03)}px 'Arial', sans-serif`,
              detailFont: `400 ${Math.floor(width * 0.025)}px 'Arial', sans-serif`,
              textColor: '#ffffff',
              shadowIntensity: 0.9
            },
            vintage: {
              primaryGradient: { 
                start: 'rgba(92, 51, 23, 0.9)', 
                end: 'rgba(180, 83, 9, 0.8)' 
              },
              accentGradient: {
                start: 'rgba(251, 191, 36, 1)',
                end: 'rgba(254, 240, 138, 1)'
              },
              titleFont: `700 ${Math.floor(width * 0.055)}px 'Georgia', serif`,
              subtitleFont: `500 ${Math.floor(width * 0.028)}px 'Georgia', serif`,
              detailFont: `400 ${Math.floor(width * 0.023)}px 'Georgia', serif`,
              textColor: '#fef7cd',
              shadowIntensity: 0.8
            },
            festif: {
              primaryGradient: { 
                start: 'rgba(190, 24, 93, 0.9)', 
                end: 'rgba(245, 101, 101, 0.85)' 
              },
              accentGradient: {
                start: 'rgba(251, 191, 36, 1)',
                end: 'rgba(252, 211, 77, 1)'
              },
              titleFont: `900 ${Math.floor(width * 0.07)}px 'Impact', sans-serif`,
              subtitleFont: `700 ${Math.floor(width * 0.032)}px 'Arial Black', sans-serif`,
              detailFont: `600 ${Math.floor(width * 0.027)}px 'Arial', sans-serif`,
              textColor: '#ffffff',
              shadowIntensity: 1.0
            },
            elegant: {
              primaryGradient: { 
                start: 'rgba(17, 24, 39, 0.92)', 
                end: 'rgba(75, 85, 99, 0.85)' 
              },
              accentGradient: {
                start: 'rgba(212, 175, 55, 1)',
                end: 'rgba(245, 208, 254, 0.8)'
              },
              titleFont: `300 ${Math.floor(width * 0.055)}px 'serif'`,
              subtitleFont: `400 ${Math.floor(width * 0.025)}px 'serif'`,
              detailFont: `300 ${Math.floor(width * 0.022)}px 'serif'`,
              textColor: '#f8fafc',
              shadowIntensity: 0.7
            }
          };

          const currentStyle = styleConfig[style as keyof typeof styleConfig] || styleConfig.moderne;

          // Overlay gradient sophistiqué
          const overlayGradient = ctx.createLinearGradient(0, 0, 0, height);
          overlayGradient.addColorStop(0, currentStyle.primaryGradient.start);
          overlayGradient.addColorStop(1, currentStyle.primaryGradient.end);
          
          ctx.fillStyle = overlayGradient;
          ctx.fillRect(0, 0, width, height);

          // Fonction pour dessiner du texte avec effets avancés
          const drawAdvancedText = (
            text: string, 
            x: number, 
            y: number, 
            font: string, 
            align: CanvasTextAlign = 'center',
            isTitle: boolean = false
          ) => {
            ctx.font = font;
            ctx.textAlign = align;
            
            // Ombre portée douce et élégante
            ctx.shadowColor = `rgba(0, 0, 0, ${currentStyle.shadowIntensity})`;
            ctx.shadowBlur = isTitle ? width * 0.015 : width * 0.008;
            ctx.shadowOffsetX = width * 0.002;
            ctx.shadowOffsetY = width * 0.002;
            
            // Texte principal
            ctx.fillStyle = currentStyle.textColor;
            ctx.fillText(text, x, y);
            
            // Reset shadow
            ctx.shadowColor = 'transparent';
            ctx.shadowBlur = 0;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 0;
          };

          // Zone de contenu principal
          const margin = width * 0.08;
          const centerX = width / 2;
          let currentY = height * 0.25;

          // Badge élégant pour le type d'événement
          const badgeHeight = height * 0.045;
          const badgeY = height * 0.15;
          const badgePadding = width * 0.04;
          
          // Mesurer la largeur du texte du badge
          ctx.font = currentStyle.subtitleFont;
          const badgeTextMetrics = ctx.measureText(fiche.type.toUpperCase());
          const badgeWidth = badgeTextMetrics.width + badgePadding * 2;
          const badgeX = centerX - badgeWidth / 2;
          
          // Gradient pour le badge
          const badgeGradient = ctx.createLinearGradient(badgeX, badgeY, badgeX + badgeWidth, badgeY + badgeHeight);
          badgeGradient.addColorStop(0, currentStyle.accentGradient.start);
          badgeGradient.addColorStop(1, currentStyle.accentGradient.end);
          
          // Dessiner le badge avec coins arrondis
          ctx.fillStyle = badgeGradient;
          ctx.beginPath();
          ctx.roundRect(badgeX, badgeY, badgeWidth, badgeHeight, badgeHeight / 4);
          ctx.fill();
          
          // Texte du badge
          ctx.font = currentStyle.subtitleFont;
          ctx.textAlign = 'center';
          ctx.fillStyle = style === 'vintage' ? '#000000' : '#000000';
          ctx.fillText(fiche.type.toUpperCase(), centerX, badgeY + badgeHeight * 0.65);

          // Titre principal avec découpe intelligente
          const maxTitleWidth = width - margin * 2;
          const titleLines = wrapText(ctx, fiche.title.toUpperCase(), maxTitleWidth, currentStyle.titleFont);
          
          // Espacement intelligent entre les lignes du titre
          const titleLineHeight = height * 0.08;
          const totalTitleHeight = titleLines.length * titleLineHeight;
          currentY = height * 0.35;
          
          titleLines.forEach((line, index) => {
            drawAdvancedText(line, centerX, currentY + (index * titleLineHeight), currentStyle.titleFont, 'center', true);
          });
          
          currentY += totalTitleHeight + height * 0.06;

          // Ligne décorative élégante
          const lineY = currentY;
          const lineLength = width * 0.3;
          const lineGradient = ctx.createLinearGradient(centerX - lineLength/2, lineY, centerX + lineLength/2, lineY);
          lineGradient.addColorStop(0, 'transparent');
          lineGradient.addColorStop(0.5, currentStyle.accentGradient.start);
          lineGradient.addColorStop(1, 'transparent');
          
          ctx.strokeStyle = lineGradient;
          ctx.lineWidth = height * 0.003;
          ctx.beginPath();
          ctx.moveTo(centerX - lineLength/2, lineY);
          ctx.lineTo(centerX + lineLength/2, lineY);
          ctx.stroke();
          
          currentY += height * 0.06;

          // Informations de date avec formatage élégant
          const dateStart = new Date(fiche.dateDebut);
          const dateEnd = new Date(fiche.dateFin);
          
          let dateText = dateStart.toLocaleDateString('fr-FR', { 
            weekday: 'long',
            day: 'numeric', 
            month: 'long', 
            year: 'numeric' 
          });
          
          if (fiche.dateDebut !== fiche.dateFin) {
            const endDateText = dateEnd.toLocaleDateString('fr-FR', { 
              weekday: 'long', 
              day: 'numeric', 
              month: 'long', 
              year: dateEnd.getFullYear() !== dateStart.getFullYear() ? 'numeric' : undefined
            });
            dateText += ` - ${endDateText}`;
          }
          
          drawAdvancedText(dateText, centerX, currentY, currentStyle.subtitleFont);
          currentY += height * 0.05;

          // Lieu avec style raffiné
          const locationLines = wrapText(ctx, fiche.lieu, width - margin * 3, currentStyle.detailFont);
          locationLines.forEach((line, index) => {
            drawAdvancedText(line, centerX, currentY + (index * height * 0.04), currentStyle.detailFont);
          });
          currentY += locationLines.length * height * 0.04 + height * 0.04;

          // Texte personnalisé avec mise en forme
          if (customText && customText.trim()) {
            currentY += height * 0.03;
            const customLines = wrapText(ctx, customText.trim(), width - margin * 3, currentStyle.detailFont);
            
            customLines.forEach((line, index) => {
              drawAdvancedText(line, centerX, currentY + (index * height * 0.035), currentStyle.detailFont);
            });
          }

          // Élément décoratif en bas (optionnel selon l'espace)
          if (currentY < height * 0.85) {
            const decorY = height * 0.9;
            ctx.strokeStyle = currentStyle.accentGradient.start;
            ctx.lineWidth = height * 0.002;
            ctx.globalAlpha = 0.6;
            
            // Motif géométrique simple
            for (let i = 0; i < 3; i++) {
              const circleRadius = height * 0.015 * (1 + i * 0.5);
              ctx.beginPath();
              ctx.arc(centerX, decorY, circleRadius, 0, Math.PI * 2);
              ctx.stroke();
            }
            
            ctx.globalAlpha = 1;
          }

          // Convertir en image haute qualité
          const dataUrl = canvas.toDataURL('image/png', 0.95);
          resolve(dataUrl);
          
        } catch (error) {
          reject(error);
        }
      };

      img.onerror = () => {
        reject(new Error('Impossible de charger l\'image de fond'));
      };

      img.src = backgroundImage;
    });
  };

  // Fonction améliorée pour découper le texte
  const wrapText = (ctx: CanvasRenderingContext2D, text: string, maxWidth: number, font: string): string[] => {
    ctx.font = font;
    const words = text.split(' ');
    const lines: string[] = [];
    
    if (words.length === 0) return lines;
    
    let currentLine = words[0];

    for (let i = 1; i < words.length; i++) {
      const word = words[i];
      const testLine = currentLine + " " + word;
      const metrics = ctx.measureText(testLine);
      
      if (metrics.width > maxWidth) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }
    
    lines.push(currentLine);
    return lines;
  };

  const handleGenerate = async () => {
    if (!selectedFiche || !selectedStyle || !selectedFormat) {
      toast.error("Veuillez sélectionner une fiche, un style et un format");
      return;
    }

    setIsGenerating(true);
    
    try {
      // Utiliser l'image personnalisée ou celle de la fiche
      const backgroundImage = customImage || selectedFiche.image;
      
      if (!backgroundImage) {
        toast.error("Aucune image disponible pour générer l'affiche");
        return;
      }

      // Générer l'affiche avec Canvas
      const generatedUrl = await generatePosterCanvas(
        selectedFiche,
        selectedStyle,
        selectedFormat, 
        backgroundImage,
        customText
      );
      
      setGeneratedImage(generatedUrl);
      toast.success("Affiche générée avec succès !");
      
    } catch (error) {
      console.error("Erreur lors de la génération:", error);
      toast.error("Erreur lors de la génération de l'affiche");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = () => {
    if (generatedImage && selectedFiche) {
      try {
        // Créer un élément a temporaire pour le téléchargement
        const link = document.createElement('a');
        link.href = generatedImage;
        link.download = `affiche-${selectedFiche.title.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        toast.success("Affiche téléchargée avec succès !");
      } catch (error) {
        console.error("Erreur lors du téléchargement:", error);
        toast.error("Erreur lors du téléchargement de l'affiche");
      }
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Seo 
        title="Générateur d'Affiches Événementielles | ApidIA"
        description="Créez automatiquement des affiches professionnelles pour vos événements et manifestations à partir de vos fiches Apidae."
        keywords="générateur affiche, événement, manifestation, apidae, création visuelle, marketing événementiel"
      />
      
      {/* Header */}
      <header className="border-b bg-white/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/catalogue">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Retour au catalogue
              </Link>
            </Button>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                <Camera className="w-4 h-4 text-primary" />
              </div>
              <h1 className="text-xl font-bold text-primary">Générateur d'Affiches</h1>
            </div>
          </div>
          <Button asChild>
            <Link to="/auth/login">Se connecter</Link>
          </Button>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-2">Créez vos affiches événementielles</h2>
          <p className="text-muted-foreground">
            Générez automatiquement des affiches professionnelles à partir de vos fiches Apidae
          </p>
        </div>

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
                  {filteredFiches.map((fiche) => (
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
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
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
                  Choisissez le style et le format de votre affiche
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <Label>Style visuel</Label>
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

                <div>
                  <Label>Format d'affiche</Label>
                  <Select value={selectedFormat} onValueChange={setSelectedFormat}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choisir un format" />
                    </SelectTrigger>
                    <SelectContent>
                      {formats.map((format) => (
                        <SelectItem key={format.id} value={format.id}>
                          <div>
                            <div className="font-medium">{format.name}</div>
                            <div className="text-xs text-muted-foreground">{format.dimensions}</div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Image personnalisée (optionnel)</Label>
                  <div className="space-y-2">
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = (event) => {
                            setCustomImage(event.target?.result as string);
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                      className="file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
                    />
                    {customImage && (
                      <div className="relative w-full h-20 rounded-lg overflow-hidden bg-muted">
                        <img 
                          src={customImage} 
                          alt="Image personnalisée"
                          className="w-full h-full object-cover"
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setCustomImage(null)}
                          className="absolute top-1 right-1 h-6 w-6 p-0 bg-background/80 hover:bg-background"
                        >
                          ×
                        </Button>
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Remplacera l'image par défaut de l'événement
                    </p>
                  </div>
                </div>

                <div>
                  <Label>Texte personnalisé (optionnel)</Label>
                  <Textarea 
                    placeholder="Ajoutez un texte personnalisé à votre affiche..."
                    value={customText}
                    onChange={(e) => setCustomText(e.target.value)}
                    className="min-h-[80px]"
                  />
                </div>

                <Button 
                  onClick={handleGenerate}
                  disabled={!selectedFiche || !selectedStyle || !selectedFormat || isGenerating}
                  className="w-full"
                  size="lg"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Génération en cours...
                    </>
                  ) : (
                    <>
                      <Wand2 className="w-4 h-4 mr-2" />
                      Générer l'affiche
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Étape 3: Aperçu et téléchargement */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ImageIcon className="w-5 h-5" />
                  3. Aperçu et téléchargement
                </CardTitle>
                <CardDescription>
                  Votre affiche générée apparaîtra ici
                </CardDescription>
              </CardHeader>
              <CardContent>
                {generatedImage ? (
                  <div className="space-y-4">
                    <div className="relative bg-muted/30 rounded-lg overflow-hidden">
                      <img 
                        src={generatedImage}
                        alt="Affiche générée"
                        className="w-full h-auto"
                        onLoad={() => console.log("Image chargée avec succès")}
                        onError={(e) => console.error("Erreur de chargement d'image:", e)}
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={handleDownload} className="flex-1">
                        <Download className="w-4 h-4 mr-2" />
                        Télécharger
                      </Button>
                      <Button 
                        variant="outline"
                        onClick={() => setGeneratedImage(null)}
                      >
                        Regénérer
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <ImageIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Votre affiche apparaîtra ici une fois générée</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Conseils */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Sparkles className="w-5 h-5" />
                  Conseils pour une belle affiche
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 bg-primary rounded-full mt-2 flex-shrink-0" />
                  <p>Choisissez un style adapté au type d'événement</p>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 bg-primary rounded-full mt-2 flex-shrink-0" />
                  <p>Le format web est idéal pour les réseaux sociaux</p>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 bg-primary rounded-full mt-2 flex-shrink-0" />
                  <p>Ajoutez un texte personnalisé pour mettre en avant des informations spécifiques</p>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 bg-primary rounded-full mt-2 flex-shrink-0" />
                  <p>L'affiche est automatiquement optimisée selon les informations de votre fiche</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}