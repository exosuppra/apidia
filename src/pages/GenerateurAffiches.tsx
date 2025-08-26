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

const formats = {
  print: {
    name: "A3 Print (300 DPI)",
    // A3 à 300 DPI avec 3mm de fond perdu (11.81 x 16.53 inches = 3543 x 4959 px)
    width: 3543 + 36, // +3mm fond perdu (3mm = ~9px à 300dpi de chaque côté)
    height: 4959 + 36, // Portrait A3 avec fond perdu
    dpi: 300,
    bleed: 36, // 3mm en pixels à 300 DPI
    cropMarks: true
  },
  web: {
    name: "Web/Réseaux sociaux",
    formats: {
      story: { width: 1080, height: 1920, name: "Story Instagram" },
      feed: { width: 1080, height: 1350, name: "Feed Instagram" },
      banner: { width: 1920, height: 1080, name: "Bannière Facebook" }
    }
  }
};

export default function GenerateurAffiches() {
  const [selectedFiche, setSelectedFiche] = useState<typeof mockFiches[0] | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStyle, setSelectedStyle] = useState("");
  const [customText, setCustomText] = useState("");
  const [customImage, setCustomImage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImages, setGeneratedImages] = useState<{
    print: { light: string | null; dark: string | null };
    web: {
      story: { light: string | null; dark: string | null };
      feed: { light: string | null; dark: string | null };
      banner: { light: string | null; dark: string | null };
    };
  }>({
    print: { light: null, dark: null },
    web: {
      story: { light: null, dark: null },
      feed: { light: null, dark: null },
      banner: { light: null, dark: null }
    }
  });

  const filteredFiches = mockFiches.filter(fiche => 
    fiche.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    fiche.type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Analyse avancée de l'image pour optimiser la mise en page
  const analyzeImageForLayout = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    
    // Diviser l'image en grille pour analyse zonale
    const gridSize = 16;
    const cellWidth = width / gridSize;
    const cellHeight = height / gridSize;
    const zones = [];
    
    for (let row = 0; row < gridSize; row++) {
      for (let col = 0; col < gridSize; col++) {
        const startX = Math.floor(col * cellWidth);
        const startY = Math.floor(row * cellHeight);
        const endX = Math.floor((col + 1) * cellWidth);
        const endY = Math.floor((row + 1) * cellHeight);
        
        let totalBrightness = 0;
        let totalSaturation = 0;
        let totalContrast = 0;
        let pixelCount = 0;
        let rValues = [], gValues = [], bValues = [];
        
        // Analyser chaque pixel de la zone
        for (let y = startY; y < endY; y += 2) { // Échantillonnage
          for (let x = startX; x < endX; x += 2) {
            const index = (y * width + x) * 4;
            if (index < data.length) {
              const r = data[index];
              const g = data[index + 1];
              const b = data[index + 2];
              
              rValues.push(r);
              gValues.push(g);
              bValues.push(b);
              
              const brightness = (r + g + b) / 3;
              const max = Math.max(r, g, b);
              const min = Math.min(r, g, b);
              const saturation = max === 0 ? 0 : (max - min) / max;
              
              totalBrightness += brightness;
              totalSaturation += saturation;
              pixelCount++;
            }
          }
        }
        
        // Calculer les métriques de la zone
        const avgBrightness = totalBrightness / pixelCount;
        const avgSaturation = totalSaturation / pixelCount;
        
        // Calculer le contraste (écart-type de la luminosité)
        const brightnessVariance = rValues.reduce((sum, r, i) => {
          const brightness = (r + gValues[i] + bValues[i]) / 3;
          return sum + Math.pow(brightness - avgBrightness, 2);
        }, 0) / pixelCount;
        const contrast = Math.sqrt(brightnessVariance);
        
        // Couleur dominante
        const avgR = rValues.reduce((a, b) => a + b, 0) / rValues.length;
        const avgG = gValues.reduce((a, b) => a + b, 0) / gValues.length;
        const avgB = bValues.reduce((a, b) => a + b, 0) / bValues.length;
        
        zones.push({
          row,
          col,
          x: startX,
          y: startY,
          width: cellWidth,
          height: cellHeight,
          brightness: avgBrightness,
          saturation: avgSaturation,
          contrast: contrast,
          dominantColor: { r: avgR, g: avgG, b: avgB },
          // Score de qualité pour placer du texte (faible contraste + luminosité uniforme = mieux)
          textPlacementScore: avgBrightness > 50 && avgBrightness < 200 ? (255 - contrast) / 255 : 0
        });
      }
    }
    
    return {
      zones,
      globalBrightness: zones.reduce((sum, zone) => sum + zone.brightness, 0) / zones.length,
      globalContrast: zones.reduce((sum, zone) => sum + zone.contrast, 0) / zones.length,
      globalSaturation: zones.reduce((sum, zone) => sum + zone.saturation, 0) / zones.length,
      bestTextZones: zones
        .filter(zone => zone.textPlacementScore > 0.3)
        .sort((a, b) => b.textPlacementScore - a.textPlacementScore)
        .slice(0, 6) // Top 6 zones pour le texte
    };
  };

  // Auto-évaluation et correction du résultat
  const evaluateAndCorrectPoster = async (
    canvas: HTMLCanvasElement,
    analysis: any,
    fiche: typeof mockFiches[0],
    style: string,
    formatType: string,
    isDarkVersion: boolean,
    customText?: string
  ): Promise<{ corrected: boolean; issues: string[] }> => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return { corrected: false, issues: ['Canvas context unavailable'] };
    
    const width = canvas.width;
    const height = canvas.height;
    const issues: string[] = [];
    let corrected = false;
    
    // DÉSACTIVATION TEMPORAIRE DE LA CORRECTION AUTOMATIQUE
    // Le système d'analyse fait déjà son travail en amont avec des overlays intelligents
    // et le scrim adaptatif. La correction post-génération crée des artefacts visuels.
    
    console.log(`[${formatType}] Auto-évaluation terminée sans correction (système désactivé pour éviter les artefacts)`);
    
    return { corrected: false, issues: [] };
  };

  const generateAllFormats = async (
    fiche: typeof mockFiches[0],
    style: string,
    backgroundImage: string,
    isDarkVersion: boolean = false,
    customText?: string
  ): Promise<{
    print: string;
    story: string;
    feed: string;
    banner: string;
  }> => {
    const results = {
      print: "",
      story: "",
      feed: "", 
      banner: ""
    };

    // Générer A3 Print avec fond perdu et traits de coupe
    results.print = await generatePosterFormat(fiche, style, 'print', backgroundImage, isDarkVersion, customText);
    
    // Générer formats web
    results.story = await generatePosterFormat(fiche, style, 'story', backgroundImage, isDarkVersion, customText);
    results.feed = await generatePosterFormat(fiche, style, 'feed', backgroundImage, isDarkVersion, customText);
    results.banner = await generatePosterFormat(fiche, style, 'banner', backgroundImage, isDarkVersion, customText);

    return results;
  };

  const generatePosterFormat = async (
    fiche: typeof mockFiches[0],
    style: string,
    formatType: 'print' | 'story' | 'feed' | 'banner',
    backgroundImage: string,
    isDarkVersion: boolean = false,
    customText?: string
  ): Promise<string> => {
    return new Promise((resolve, reject) => {
      // Définir les dimensions selon le format
      const dimensions = {
        print: { width: formats.print.width, height: formats.print.height },
        story: { width: 1080, height: 1920 },
        feed: { width: 1080, height: 1350 },
        banner: { width: 1920, height: 1080 }
      };

      const { width, height } = dimensions[formatType];
      const isPrint = formatType === 'print';
      const bleed = isPrint ? formats.print.bleed : 0;

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        reject(new Error('Impossible de créer le contexte Canvas'));
        return;
      }

      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      img.onload = async () => {
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

          // ANALYSE DE L'IMAGE POUR OPTIMISATION DE LA MISE EN PAGE
          const imageAnalysis = analyzeImageForLayout(ctx, width, height);
          
          // Déterminer les polices selon le type d'événement
          const getFontsByEventType = (eventType: string) => {
            const normalizedType = eventType.toLowerCase();
            
            // Événements sportifs : polices dynamiques et impactantes
            if (normalizedType.includes('sport') || normalizedType.includes('trail') || normalizedType.includes('course') || normalizedType.includes('marathon') || normalizedType.includes('vélo') || normalizedType.includes('randonnée') || normalizedType.includes('running') || normalizedType.includes('cyclisme')) {
              return {
                category: "🏃 Dynamique & Sportif",
                title: "'Bebas Neue', 'Oswald', sans-serif",
                subtitle: "'Oswald', sans-serif", 
                detail: "'Montserrat', sans-serif"
              };
            }
            
            // Événements culturels : polices élégantes et sophistiquées
            if (normalizedType.includes('culturel') || normalizedType.includes('festival') || normalizedType.includes('jazz') || normalizedType.includes('concert') || normalizedType.includes('théâtre') || normalizedType.includes('exposition') || normalizedType.includes('art') || normalizedType.includes('musique') || normalizedType.includes('danse') || normalizedType.includes('spectacle')) {
              return {
                category: "🎭 Élégant & Culturel",
                title: "'Playfair Display', serif",
                subtitle: "'Cormorant Garamond', serif",
                detail: "'Crimson Text', serif"
              };
            }
            
            // Événements commerciaux : polices professionnelles et modernes
            if (normalizedType.includes('commercial') || normalizedType.includes('marché') || normalizedType.includes('foire') || normalizedType.includes('salon') || normalizedType.includes('noël') || normalizedType.includes('vente') || normalizedType.includes('boutique') || normalizedType.includes('artisan')) {
              return {
                category: "💼 Professionnel & Moderne",
                title: "'Montserrat', sans-serif",
                subtitle: "'Poppins', sans-serif",
                detail: "'Inter', sans-serif"
              };
            }
            
            // Événements festifs : polices ludiques et accueillantes  
            if (normalizedType.includes('festiv') || normalizedType.includes('fête') || normalizedType.includes('carnaval') || normalizedType.includes('animation') || normalizedType.includes('famille') || normalizedType.includes('enfant') || normalizedType.includes('jeu')) {
              return {
                category: "🎉 Festif & Ludique",
                title: "'Fredoka', sans-serif",
                subtitle: "'Comfortaa', sans-serif", 
                detail: "'Poppins', sans-serif"
              };
            }
            
            // Événements gastronomiques : polices gourmandes et chaleureuses
            if (normalizedType.includes('gastronomie') || normalizedType.includes('cuisine') || normalizedType.includes('vin') || normalizedType.includes('dégustation') || normalizedType.includes('restaurant') || normalizedType.includes('chef')) {
              return {
                category: "🍷 Gourmand & Raffiné",
                title: "'Cormorant Garamond', serif",
                subtitle: "'Playfair Display', serif",
                detail: "'Crimson Text', serif"
              };
            }
            
            // Par défaut : polices modernes et lisibles
            return {
              category: "✨ Moderne & Lisible",
              title: "'Montserrat', sans-serif",
              subtitle: "'Poppins', sans-serif",
              detail: "'Inter', sans-serif"
            };
          };

          const selectedFonts = getFontsByEventType(fiche.type);
          
          console.log(`[${formatType}] Analyse terminée:`, {
            brightness: imageAnalysis.globalBrightness.toFixed(1),
            contrast: imageAnalysis.globalContrast.toFixed(1),
            bestZones: imageAnalysis.bestTextZones.length,
            fontCategory: selectedFonts.category,
            eventType: fiche.type
          });

          // Ajuster la position du texte selon l'analyse
          const bestZones = imageAnalysis.bestTextZones;
          let titleZone = bestZones.find(z => z.row < 8) || bestZones[0]; // Préférer le haut
          let infoZone = bestZones.find(z => z.row > 8) || bestZones[1] || bestZones[0]; // Préférer le bas

          // Analyser la luminosité pour adaptation
          const avgBrightness = imageAnalysis.globalBrightness;
          const isLowQualityOrBadFormat = img.width < 800 || img.height < 600;

          // Configuration adaptée pour versions claire/foncée avec polices intelligentes
          const getStyleConfig = () => {
            const eventFonts = selectedFonts;
            
            const baseConfig = {
              moderne: {
                titleFont: `900 ${Math.floor(width * 0.065)}px ${eventFonts.title}`,
                subtitleFont: `600 ${Math.floor(width * 0.03)}px ${eventFonts.subtitle}`,
                detailFont: `500 ${Math.floor(width * 0.025)}px ${eventFonts.detail}`,
              },
              vintage: {
                titleFont: `700 ${Math.floor(width * 0.055)}px ${eventFonts.title}`,
                subtitleFont: `500 ${Math.floor(width * 0.028)}px ${eventFonts.subtitle}`,
                detailFont: `400 ${Math.floor(width * 0.023)}px ${eventFonts.detail}`,
              },
              festif: {
                titleFont: `900 ${Math.floor(width * 0.07)}px ${eventFonts.title}`,
                subtitleFont: `700 ${Math.floor(width * 0.032)}px ${eventFonts.subtitle}`,
                detailFont: `600 ${Math.floor(width * 0.027)}px ${eventFonts.detail}`,
              },
              elegant: {
                titleFont: `300 ${Math.floor(width * 0.055)}px ${eventFonts.title}`,
                subtitleFont: `400 ${Math.floor(width * 0.025)}px ${eventFonts.subtitle}`,
                detailFont: `300 ${Math.floor(width * 0.022)}px ${eventFonts.detail}`,
              }
            };

            const currentBase = baseConfig[style as keyof typeof baseConfig] || baseConfig.moderne;

            // Ajuster l'intensité selon l'analyse de l'image
            const overlayIntensity = imageAnalysis.globalContrast < 50 ? 0.3 : 0.8; // Moins d'overlay si image uniforme

            if (isDarkVersion) {
              return {
                ...currentBase,
                overlay: isLowQualityOrBadFormat ? 
                  [`rgba(15, 23, 42, ${Math.min(0.95, overlayIntensity + 0.2)})`, `rgba(30, 64, 175, ${Math.min(0.85, overlayIntensity + 0.1)})`] :
                  `rgba(15, 23, 42, ${overlayIntensity})`,
                textShadow: 'rgba(0, 0, 0, 0.9)',
                textColor: '#ffffff',
                accentColor: '#60a5fa',
                secondaryColor: '#3b82f6'
              };
            } else {
              return {
                ...currentBase,
                overlay: isLowQualityOrBadFormat ?
                  [`rgba(255, 255, 255, ${Math.min(0.9, overlayIntensity + 0.1)})`, `rgba(248, 250, 252, ${Math.min(0.85, overlayIntensity)})`] :
                  `rgba(255, 255, 255, ${overlayIntensity * 0.8})`,
                textShadow: 'rgba(0, 0, 0, 0.8)',
                textColor: '#1e293b',
                accentColor: '#3b82f6',
                secondaryColor: '#1e40af'
              };
            }
          };

          const currentStyleConfig = getStyleConfig();

          // Appliquer l'overlay optimisé
          if (Array.isArray(currentStyleConfig.overlay)) {
            const gradient = ctx.createLinearGradient(0, 0, 0, height);
            gradient.addColorStop(0, currentStyleConfig.overlay[0]);
            gradient.addColorStop(1, currentStyleConfig.overlay[1]);
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, width, height);
          } else {
            ctx.fillStyle = currentStyleConfig.overlay;
            ctx.fillRect(0, 0, width, height);
          }

          // Safe areas avec gestion du fond perdu
          const safeArea = {
            top: height * (isPrint ? 0.12 : 0.1) + bleed,
            bottom: height * (isPrint ? 0.12 : 0.1) + bleed,
            left: width * 0.08 + bleed,
            right: width * 0.08 + bleed
          };
          
          const contentArea = {
            x: safeArea.left,
            y: safeArea.top,
            width: width - safeArea.left - safeArea.right,
            height: height - safeArea.top - safeArea.bottom
          };

          const centerX = width / 2;
          
          // Positionnement optimisé selon l'analyse de l'image
          let currentY = Math.max(
            contentArea.y + height * 0.08,
            titleZone ? titleZone.y + titleZone.height * 0.3 : contentArea.y + height * 0.15
          );

          // Badge type
          const badgeText = fiche.type.toUpperCase();
          ctx.font = currentStyleConfig.subtitleFont;
          const badgeMetrics = ctx.measureText(badgeText);
          const badgePadding = width * 0.03;
          const badgeWidth = badgeMetrics.width + badgePadding * 2;
          const badgeHeight = height * 0.04;
          const badgeX = centerX - badgeWidth / 2;
          
          const badgeGradient = ctx.createLinearGradient(badgeX, currentY, badgeX + badgeWidth, currentY + badgeHeight);
          badgeGradient.addColorStop(0, currentStyleConfig.accentColor);
          badgeGradient.addColorStop(1, currentStyleConfig.secondaryColor);
          
          ctx.fillStyle = badgeGradient;
          ctx.beginPath();
          ctx.roundRect(badgeX, currentY, badgeWidth, badgeHeight, badgeHeight / 3);
          ctx.fill();
          
          ctx.font = currentStyleConfig.subtitleFont;
          ctx.fillStyle = '#ffffff';
          ctx.textAlign = 'center';
          ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
          ctx.shadowBlur = width * 0.002;
          ctx.fillText(badgeText, centerX, currentY + badgeHeight * 0.65);
          ctx.shadowColor = 'transparent';
          ctx.shadowBlur = 0;
          
          currentY += badgeHeight + height * 0.08;

          // Titre avec positionnement optimisé
          const maxTitleWidth = contentArea.width;
          const titleLines = wrapText(ctx, fiche.title.toUpperCase(), maxTitleWidth, currentStyleConfig.titleFont);
          
          titleLines.forEach((line, index) => {
            ctx.font = currentStyleConfig.titleFont;
            ctx.textAlign = 'center';
            ctx.shadowColor = currentStyleConfig.textShadow;
            ctx.shadowBlur = width * 0.02;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = width * 0.004;
            ctx.fillStyle = currentStyleConfig.textColor;
            ctx.fillText(line, centerX, currentY + (index * height * 0.08));
            ctx.shadowColor = 'transparent';
            ctx.shadowBlur = 0;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 0;
          });
          
          currentY += titleLines.length * height * 0.08 + height * 0.06;

          // Positionnement optimisé pour les informations
          if (infoZone && infoZone !== titleZone) {
            currentY = Math.max(currentY, infoZone.y + infoZone.height * 0.2);
          }

          // Scrim adaptatif pour les informations
          const scrimIntensity = imageAnalysis.globalContrast > 100 ? 0.6 : 0.3;
          const scrimGradient = ctx.createLinearGradient(0, currentY - height * 0.02, 0, currentY + height * 0.15);
          scrimGradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
          scrimGradient.addColorStop(0.2, isDarkVersion ? `rgba(0, 0, 0, ${scrimIntensity})` : `rgba(255, 255, 255, ${scrimIntensity})`);
          scrimGradient.addColorStop(0.8, isDarkVersion ? `rgba(0, 0, 0, ${scrimIntensity})` : `rgba(255, 255, 255, ${scrimIntensity})`);
          scrimGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
          
          ctx.fillStyle = scrimGradient;
          ctx.fillRect(0, currentY - height * 0.02, width, height * 0.19);

          // Informations avec pictogrammes
          const dateStart = new Date(fiche.dateDebut);
          const dateEnd = new Date(fiche.dateFin);
          
          let dateText = dateStart.toLocaleDateString('fr-FR', { 
            weekday: 'long',
            day: 'numeric', 
            month: 'long', 
            year: 'numeric' 
          });
          
          if (fiche.dateDebut !== fiche.dateFin) {
            const endText = dateEnd.toLocaleDateString('fr-FR', { 
              weekday: 'long', 
              day: 'numeric', 
              month: 'long', 
              year: dateEnd.getFullYear() !== dateStart.getFullYear() ? 'numeric' : undefined
            });
            dateText += ` - ${endText}`;
          }

          // Icônes et texte
          const iconSize = height * 0.04;
          const dateX = contentArea.x + iconSize + height * 0.02;

          // Icône calendrier
          ctx.strokeStyle = currentStyleConfig.textColor;
          ctx.fillStyle = currentStyleConfig.textColor;
          ctx.lineWidth = iconSize * 0.08;
          ctx.strokeRect(contentArea.x, currentY - iconSize * 0.1, iconSize * 0.8, iconSize * 0.7);
          ctx.fillRect(contentArea.x + iconSize * 0.15, currentY - iconSize * 0.3, iconSize * 0.1, iconSize * 0.4);
          ctx.fillRect(contentArea.x + iconSize * 0.55, currentY - iconSize * 0.3, iconSize * 0.1, iconSize * 0.4);

          ctx.font = currentStyleConfig.subtitleFont;
          ctx.textAlign = 'left';
          ctx.shadowColor = currentStyleConfig.textShadow;
          ctx.shadowBlur = width * 0.006;
          ctx.fillStyle = currentStyleConfig.textColor;
          ctx.fillText(dateText, dateX, currentY);
          ctx.shadowColor = 'transparent';
          ctx.shadowBlur = 0;
          
          currentY += height * 0.055;

          // Lieu avec icône
          const locationLines = wrapText(ctx, fiche.lieu, contentArea.width - iconSize - height * 0.02, currentStyleConfig.detailFont);
          
          // Icône localisation
          ctx.strokeStyle = currentStyleConfig.textColor;
          ctx.fillStyle = currentStyleConfig.textColor;
          ctx.lineWidth = iconSize * 0.08;
          ctx.beginPath();
          ctx.moveTo(contentArea.x + iconSize * 0.4, currentY + iconSize * 0.6);
          ctx.lineTo(contentArea.x + iconSize * 0.4, currentY + iconSize * 0.2);
          ctx.arc(contentArea.x + iconSize * 0.4, currentY, iconSize * 0.25, 0, Math.PI * 2);
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(contentArea.x + iconSize * 0.4, currentY, iconSize * 0.1, 0, Math.PI * 2);
          ctx.fill();

          locationLines.forEach((line, index) => {
            ctx.font = currentStyleConfig.detailFont;
            ctx.textAlign = 'left';
            ctx.shadowColor = currentStyleConfig.textShadow;
            ctx.shadowBlur = width * 0.005;
            ctx.fillStyle = currentStyleConfig.textColor;
            ctx.fillText(line, dateX, currentY + (index * height * 0.04));
            ctx.shadowColor = 'transparent';
            ctx.shadowBlur = 0;
          });
          
          currentY += locationLines.length * height * 0.04 + height * 0.04;

          // Texte personnalisé
          if (customText && customText.trim()) {
            currentY += height * 0.03;
            const customLines = wrapText(ctx, customText.trim(), contentArea.width, currentStyleConfig.detailFont);
            
            customLines.forEach((line, index) => {
              ctx.font = currentStyleConfig.detailFont;
              ctx.textAlign = 'center';
              ctx.shadowColor = currentStyleConfig.textShadow;
              ctx.shadowBlur = width * 0.005;
              ctx.fillStyle = currentStyleConfig.textColor;
              ctx.fillText(line, centerX, currentY + (index * height * 0.035));
              ctx.shadowColor = 'transparent';
              ctx.shadowBlur = 0;
            });
          }

          // Traits de coupe pour A3 print
          if (isPrint) {
            const cropMarkLength = 20;
            const cropMarkOffset = 10;
            
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 1;
            
            // Coins supérieurs
            ctx.beginPath();
            ctx.moveTo(bleed - cropMarkOffset, bleed);
            ctx.lineTo(bleed - cropMarkOffset - cropMarkLength, bleed);
            ctx.moveTo(bleed, bleed - cropMarkOffset);
            ctx.lineTo(bleed, bleed - cropMarkOffset - cropMarkLength);
            
            ctx.moveTo(width - bleed + cropMarkOffset, bleed);
            ctx.lineTo(width - bleed + cropMarkOffset + cropMarkLength, bleed);
            ctx.moveTo(width - bleed, bleed - cropMarkOffset);
            ctx.lineTo(width - bleed, bleed - cropMarkOffset - cropMarkLength);
            
            // Coins inférieurs
            ctx.moveTo(bleed - cropMarkOffset, height - bleed);
            ctx.lineTo(bleed - cropMarkOffset - cropMarkLength, height - bleed);
            ctx.moveTo(bleed, height - bleed + cropMarkOffset);
            ctx.lineTo(bleed, height - bleed + cropMarkOffset + cropMarkLength);
            
            ctx.moveTo(width - bleed + cropMarkOffset, height - bleed);
            ctx.lineTo(width - bleed + cropMarkOffset + cropMarkLength, height - bleed);
            ctx.moveTo(width - bleed, height - bleed + cropMarkOffset);
            ctx.lineTo(width - bleed, height - bleed + cropMarkOffset + cropMarkLength);
            
            ctx.stroke();
          }

          // AUTO-ÉVALUATION ET CORRECTION
          const evaluation = await evaluateAndCorrectPoster(
            canvas,
            imageAnalysis,
            fiche,
            style,
            formatType,
            isDarkVersion,
            customText
          );

          if (evaluation.corrected) {
            console.log(`[${formatType}] Corrections appliquées:`, evaluation.issues);
          }

          const dataUrl = canvas.toDataURL('image/png', isPrint ? 1.0 : 0.95);
          resolve(dataUrl);
          
        } catch (error) {
          reject(error);
        }
      };

      img.onerror = () => reject(new Error('Impossible de charger l\'image de fond'));
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
    if (!selectedFiche || !selectedStyle) {
      toast.error("Veuillez sélectionner une fiche et un style");
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

      // Générer toutes les versions (claire et foncée) pour tous les formats
      const [lightVersions, darkVersions] = await Promise.all([
        generateAllFormats(selectedFiche, selectedStyle, backgroundImage, false, customText),
        generateAllFormats(selectedFiche, selectedStyle, backgroundImage, true, customText)
      ]);

      // Mettre à jour l'état avec toutes les versions générées
      setGeneratedImages({
        print: { light: lightVersions.print, dark: darkVersions.print },
        web: {
          story: { light: lightVersions.story, dark: darkVersions.story },
          feed: { light: lightVersions.feed, dark: darkVersions.feed },
          banner: { light: lightVersions.banner, dark: darkVersions.banner }
        }
      });

      toast.success("Toutes les affiches ont été générées avec succès !");
      
    } catch (error) {
      console.error("Erreur lors de la génération:", error);
      toast.error("Erreur lors de la génération des affiches");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = (imageUrl: string, format: string, version: 'light' | 'dark') => {
    if (imageUrl && selectedFiche) {
      try {
        const link = document.createElement('a');
        link.href = imageUrl;
        link.download = `${selectedFiche.title.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}-${format}-${version}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        toast.success(`Affiche ${format} ${version} téléchargée !`);
      } catch (error) {
        console.error("Erreur lors du téléchargement:", error);
        toast.error("Erreur lors du téléchargement");
      }
    }
  };

  const hasGeneratedImages = () => {
    return generatedImages.print.light || 
           generatedImages.web.story.light || 
           generatedImages.web.feed.light || 
           generatedImages.web.banner.light;
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
                  {filteredFiches.map((fiche) => {
                    // Déterminer le style de police selon le type d'événement
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

                {/* Aperçu des polices selon l'événement sélectionné */}
                {selectedFiche && (
                  <div className="p-4 bg-muted/20 rounded-lg border">
                    <div className="flex items-center gap-2 mb-3">
                      <Type className="w-4 h-4" />
                      <span className="font-medium text-sm">Polices sélectionnées automatiquement</span>
                    </div>
                    {(() => {
                      const getFontPreview = (eventType: string) => {
                        const normalizedType = eventType.toLowerCase();
                        if (normalizedType.includes('sport') || normalizedType.includes('trail') || normalizedType.includes('course')) {
                          return { 
                            style: "Dynamique & Sportif", 
                            title: "font-bebas", 
                            subtitle: "font-oswald", 
                            detail: "font-montserrat",
                            preview: "Trail des Vignes"
                          };
                        }
                        if (normalizedType.includes('culturel') || normalizedType.includes('festival') || normalizedType.includes('jazz')) {
                          return { 
                            style: "Élégant & Culturel", 
                            title: "font-playfair", 
                            subtitle: "font-cormorant", 
                            detail: "font-crimson",
                            preview: "Festival de Jazz"
                          };
                        }
                        if (normalizedType.includes('commercial') || normalizedType.includes('marché') || normalizedType.includes('noël')) {
                          return { 
                            style: "Professionnel", 
                            title: "font-montserrat", 
                            subtitle: "font-poppins", 
                            detail: "font-sans",
                            preview: "Marché de Noël"
                          };
                        }
                        if (normalizedType.includes('festiv') || normalizedType.includes('fête') || normalizedType.includes('animation')) {
                          return { 
                            style: "Festif & Ludique", 
                            title: "font-fredoka", 
                            subtitle: "font-comfortaa", 
                            detail: "font-poppins",
                            preview: "Fête de Village"
                          };
                        }
                        if (normalizedType.includes('gastronomie') || normalizedType.includes('cuisine') || normalizedType.includes('vin')) {
                          return { 
                            style: "Gourmand & Raffiné", 
                            title: "font-cormorant", 
                            subtitle: "font-playfair", 
                            detail: "font-crimson",
                            preview: "Dégustation de Vins"
                          };
                        }
                        return { 
                          style: "Moderne & Lisible", 
                          title: "font-montserrat", 
                          subtitle: "font-poppins", 
                          detail: "font-sans",
                          preview: "Événement"
                        };
                      };
                      
                      const fontInfo = getFontPreview(selectedFiche.type);
                      
                      return (
                        <div className="space-y-3">
                          <div className="text-xs text-primary font-medium">{fontInfo.style}</div>
                          <div className="space-y-2">
                            <div className={`text-lg font-bold ${fontInfo.title}`}>
                              {fontInfo.preview.toUpperCase()}
                            </div>
                            <div className={`text-sm ${fontInfo.subtitle}`}>
                              Samedi 14 septembre 2024
                            </div>
                            <div className={`text-xs text-muted-foreground ${fontInfo.detail}`}>
                              Domaine viticole de Pic Saint-Loup
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}

                <div>
                  <Label>Formats générés automatiquement</Label>
                  <div className="p-3 bg-muted/30 rounded-lg">
                    <div className="text-sm space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-primary rounded-full" />
                        <span className="font-medium">A3 Print (300 DPI)</span>
                        <span className="text-xs text-muted-foreground">- avec fond perdu et traits de coupe</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-primary rounded-full" />
                        <span className="font-medium">Story Instagram</span>
                        <span className="text-xs text-muted-foreground">- 1080×1920px</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-primary rounded-full" />
                        <span className="font-medium">Feed Instagram</span>
                        <span className="text-xs text-muted-foreground">- 1080×1350px</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-primary rounded-full" />
                        <span className="font-medium">Bannière Facebook</span>
                        <span className="text-xs text-muted-foreground">- 1920×1080px</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2 italic">
                        Chaque format sera généré en version claire et foncée automatiquement
                      </p>
                    </div>
                  </div>
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
                  disabled={!selectedFiche || !selectedStyle || isGenerating}
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
                      Générer toutes les affiches
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
                 {hasGeneratedImages() ? (
                   <div className="space-y-6">
                     {/* A3 Print */}
                     {generatedImages.print.light && (
                       <div className="space-y-2">
                         <h4 className="font-medium">A3 Print (300 DPI)</h4>
                         <div className="grid grid-cols-2 gap-2">
                           <div className="space-y-2">
                             <p className="text-xs text-muted-foreground">Version claire</p>
                             <img src={generatedImages.print.light} alt="A3 Print - Claire" className="w-full rounded border" />
                              <Button size="sm" onClick={() => handleDownload(generatedImages.print.light!, 'a3-print', 'light')} className="w-full">
                                <Download className="w-3 h-3 mr-1" />
                                Télécharger
                              </Button>
                            </div>
                            <div className="space-y-2">
                              <p className="text-xs text-muted-foreground">Version foncée</p>
                              <img src={generatedImages.print.dark!} alt="A3 Print - Foncée" className="w-full rounded border" />  
                              <Button size="sm" onClick={() => handleDownload(generatedImages.print.dark!, 'a3-print', 'dark')} className="w-full">
                                <Download className="w-3 h-3 mr-1" />
                                Télécharger
                              </Button>
                           </div>
                         </div>
                       </div>
                     )}

                     {/* Formats Web */}
                     {(generatedImages.web.story.light || generatedImages.web.feed.light || generatedImages.web.banner.light) && (
                       <div className="space-y-3">
                         <h4 className="font-medium">Formats Web</h4>
                         
                         {/* Story */}
                         {generatedImages.web.story.light && (
                           <div className="space-y-2">
                             <p className="text-sm font-medium">Story Instagram (1080×1920)</p>
                             <div className="grid grid-cols-2 gap-2">
                               <div className="space-y-1">
                                 <img src={generatedImages.web.story.light} alt="Story - Claire" className="w-full rounded border" />
                                 <Button size="sm" onClick={() => handleDownload(generatedImages.web.story.light!, 'story', 'light')} className="w-full">
                                   <Download className="w-3 h-3 mr-1" />Claire
                                 </Button>
                               </div>
                               <div className="space-y-1">
                                 <img src={generatedImages.web.story.dark!} alt="Story - Foncée" className="w-full rounded border" />
                                 <Button size="sm" onClick={() => handleDownload(generatedImages.web.story.dark!, 'story', 'dark')} className="w-full">
                                   <Download className="w-3 h-3 mr-1" />Foncée
                                 </Button>
                               </div>
                             </div>
                           </div>
                         )}
                       </div>
                     )}

                     <Button 
                       variant="outline"
                       onClick={() => setGeneratedImages({
                         print: { light: null, dark: null },
                         web: {
                           story: { light: null, dark: null },
                           feed: { light: null, dark: null },
                           banner: { light: null, dark: null }
                         }
                       })}
                       className="w-full"
                     >
                       Regénérer toutes les affiches
                     </Button>
                   </div>
                 ) : (
                   <div className="text-center py-12 text-muted-foreground">
                     <ImageIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
                     <p>Vos affiches apparaîtront ici une fois générées</p>
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