import { useEffect, useRef, useState, useCallback } from "react";
import { Canvas as FabricCanvas, FabricImage, Text, Rect, Group, Gradient } from "fabric";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { 
  Download, 
  RotateCcw, 
  Move, 
  Type as TypeIcon, 
  Palette,
  Layout,
  Layers,
  ZoomIn,
  ZoomOut,
  Undo,
  Redo,
  Loader2
} from "lucide-react";

interface PosterData {
  id: string;
  title: string;
  type: string;
  dateDebut: string;
  dateFin: string;
  lieu: string;
  description: string;
  image: string;
}

interface FabricPosterCanvasProps {
  posterData: PosterData;
  selectedStyle: string;
  customText?: string;
  onGenerate: (canvasData: any) => void;
}

// Professional poster templates with modern design principles
const getTemplateByStyle = (style: string, eventType: string) => {
  const eventLower = eventType.toLowerCase();
  
  // Determine colors based on event type
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
        type: 'linear',
        coords: { x1: 0, y1: 0, x2: 0, y2: 1 },
        colorStops: [
          { offset: 0, color: 'rgba(0,0,0,0.7)' },
          { offset: 0.6, color: 'rgba(0,0,0,0.3)' },
          { offset: 1, color: 'rgba(0,0,0,0.8)' }
        ]
      },
      typography: {
        title: { fontFamily: 'Montserrat', fontSize: 80, fontWeight: 'bold', color: '#ffffff' },
        subtitle: { fontFamily: 'Poppins', fontSize: 32, fontWeight: '600', color: '#e2e8f0' },
        detail: { fontFamily: 'Inter', fontSize: 24, fontWeight: '500', color: '#cbd5e1' }
      },
      layout: {
        titleY: 0.15,
        contentSpacing: 60,
        margins: 80,
        accentHeight: 8
      },
      accent: colors.primary
    },
    elegant: {
      overlay: {
        type: 'radial',
        coords: { x1: 0.5, y1: 0.3, r1: 0, x2: 0.5, y2: 0.3, r2: 0.8 },
        colorStops: [
          { offset: 0, color: 'rgba(15,23,42,0.4)' },
          { offset: 1, color: 'rgba(15,23,42,0.9)' }
        ]
      },
      typography: {
        title: { fontFamily: 'Playfair Display', fontSize: 70, fontWeight: '700', color: '#f8fafc' },
        subtitle: { fontFamily: 'Cormorant Garamond', fontSize: 28, fontWeight: '500', color: '#e2e8f0' },
        detail: { fontFamily: 'Crimson Text', fontSize: 22, fontWeight: '400', color: '#cbd5e1' }
      },
      layout: {
        titleY: 0.2,
        contentSpacing: 50,
        margins: 100,
        accentHeight: 4
      },
      accent: colors.secondary
    },
    festif: {
      overlay: {
        type: 'linear',
        coords: { x1: 0.2, y1: 0, x2: 0.8, y2: 1 },
        colorStops: [
          { offset: 0, color: `rgba(236,72,153,0.8)` },
          { offset: 0.5, color: 'rgba(147,51,234,0.6)' },
          { offset: 1, color: 'rgba(59,130,246,0.8)' }
        ]
      },
      typography: {
        title: { fontFamily: 'Fredoka', fontSize: 85, fontWeight: '700', color: '#ffffff' },
        subtitle: { fontFamily: 'Comfortaa', fontSize: 35, fontWeight: '600', color: '#ffffff' },
        detail: { fontFamily: 'Poppins', fontSize: 26, fontWeight: '500', color: '#f1f5f9' }
      },
      layout: {
        titleY: 0.12,
        contentSpacing: 65,
        margins: 70,
        accentHeight: 12
      },
      accent: '#fbbf24'
    },
    vintage: {
      overlay: {
        type: 'linear',
        coords: { x1: 0, y1: 0, x2: 0, y2: 1 },
        colorStops: [
          { offset: 0, color: 'rgba(92,66,46,0.9)' },
          { offset: 0.5, color: 'rgba(120,85,60,0.7)' },
          { offset: 1, color: 'rgba(69,48,33,0.95)' }
        ]
      },
      typography: {
        title: { fontFamily: 'Playfair Display', fontSize: 65, fontWeight: '700', color: '#fef3c7' },
        subtitle: { fontFamily: 'Cormorant Garamond', fontSize: 30, fontWeight: '500', color: '#fde68a' },
        detail: { fontFamily: 'Crimson Text', fontSize: 24, fontWeight: '400', color: '#fcd34d' }
      },
      layout: {
        titleY: 0.18,
        contentSpacing: 55,
        margins: 90,
        accentHeight: 6
      },
      accent: '#d97706'
    }
  };

  return templates[style as keyof typeof templates] || templates.moderne;
};

export const FabricPosterCanvas = ({ posterData, selectedStyle, customText, onGenerate }: FabricPosterCanvasProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [fabricCanvas, setFabricCanvas] = useState<FabricCanvas | null>(null);
  const [zoom, setZoom] = useState([100]);
  const [selectedFormat, setSelectedFormat] = useState("story");
  const [isGenerating, setIsGenerating] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // Format definitions
  const formats = {
    story: { width: 1080, height: 1920, name: "Story Instagram" },
    feed: { width: 1080, height: 1350, name: "Feed Instagram" },
    banner: { width: 1920, height: 1080, name: "Bannière Facebook" },
    print: { width: 2480, height: 3508, name: "A4 Print (300 DPI)" }
  };

  const currentFormat = formats[selectedFormat as keyof typeof formats];

  // Initialize Fabric Canvas
  useEffect(() => {
    if (!canvasRef.current || fabricCanvas) return;

    console.log('Initializing Fabric Canvas...');
    
    const canvas = new FabricCanvas(canvasRef.current, {
      width: 800,
      height: (800 * currentFormat.height) / currentFormat.width,
      backgroundColor: "#f8fafc",
      preserveObjectStacking: true,
    });

    setFabricCanvas(canvas);
    
    // Save initial state after canvas is fully ready
    const timer = setTimeout(() => {
      if (canvas) {
        saveToHistory(canvas);
      }
    }, 200);

    return () => {
      clearTimeout(timer);
    };
  }, [currentFormat.width, currentFormat.height]);

  // Cleanup canvas on unmount
  useEffect(() => {
    return () => {
      if (fabricCanvas) {
        console.log('Disposing Fabric Canvas...');
        fabricCanvas.dispose();
        setFabricCanvas(null);
      }
    };
  }, []);

  // Save canvas state to history
  const saveToHistory = useCallback((canvas: FabricCanvas) => {
    if (!canvas || !canvas.toJSON) return;
    
    try {
      const state = JSON.stringify(canvas.toJSON());
      setHistory(prev => {
        const newHistory = prev.slice(0, historyIndex + 1);
        newHistory.push(state);
        return newHistory.slice(-20); // Keep last 20 states
      });
      setHistoryIndex(prev => Math.min(prev + 1, 19));
    } catch (error) {
      console.warn('Failed to save history:', error);
    }
  }, [historyIndex]);

  // Undo/Redo functionality
  const undo = useCallback(() => {
    if (historyIndex > 0 && fabricCanvas) {
      const prevState = history[historyIndex - 1];
      try {
        fabricCanvas.loadFromJSON(prevState, () => {
          fabricCanvas.renderAll();
          setHistoryIndex(prev => prev - 1);
        });
      } catch (error) {
        console.warn('Undo failed:', error);
      }
    }
  }, [fabricCanvas, history, historyIndex]);

  const redo = useCallback(() => {
    if (historyIndex < history.length - 1 && fabricCanvas) {
      const nextState = history[historyIndex + 1];
      try {
        fabricCanvas.loadFromJSON(nextState, () => {
          fabricCanvas.renderAll();
          setHistoryIndex(prev => prev + 1);
        });
      } catch (error) {
        console.warn('Redo failed:', error);
      }
    }
  }, [fabricCanvas, history, historyIndex]);

  // Generate professional poster
  const generatePoster = useCallback(async () => {
    if (!fabricCanvas || !posterData) {
      toast.error("Canvas non initialisé. Veuillez patienter...");
      return;
    }

    setIsGenerating(true);
    toast("Génération de l'affiche professionnelle...");

    try {
      // Clear canvas safely
      fabricCanvas.getObjects().forEach(obj => fabricCanvas.remove(obj));
      fabricCanvas.renderAll();
      
      const template = getTemplateByStyle(selectedStyle, posterData.type);
      const canvasWidth = fabricCanvas.width!;
      const canvasHeight = fabricCanvas.height!;

      // 1. Load and add background image
      if (posterData.image) {
        try {
          const img = await FabricImage.fromURL(posterData.image);
          
          // Scale image to fill canvas
          const scaleX = canvasWidth / img.width!;
          const scaleY = canvasHeight / img.height!;
          const scale = Math.max(scaleX, scaleY);
          
          img.set({
            scaleX: scale,
            scaleY: scale,
            left: canvasWidth / 2,
            top: canvasHeight / 2,
            originX: 'center',
            originY: 'center',
            selectable: false
          });
          
          fabricCanvas.add(img);
        } catch (error) {
          console.warn('Could not load background image:', error);
        }
      }

      // 2. Add simple overlay instead of gradient for now
      const overlay = new Rect({
        left: 0,
        top: 0,
        width: canvasWidth,
        height: canvasHeight,
        fill: template.overlay.colorStops[0].color,
        selectable: false
      });
      
      fabricCanvas.add(overlay);

      // 3. Add event type badge
      const badge = new Rect({
        left: template.layout.margins,
        top: template.layout.margins,
        width: 200,
        height: 40,
        fill: template.accent,
        rx: 20,
        ry: 20
      });

      const badgeText = new Text(posterData.type.toUpperCase(), {
        left: template.layout.margins + 100,
        top: template.layout.margins + 20,
        originX: 'center',
        originY: 'center',
        fontFamily: template.typography.detail.fontFamily,
        fontSize: 18,
        fontWeight: '600',
        fill: '#ffffff'
      });

      const badgeGroup = new Group([badge, badgeText], {
        selectable: true
      });

      fabricCanvas.add(badgeGroup);

      // 4. Add main title
      const titleY = canvasHeight * template.layout.titleY;
      const title = new Text(customText || posterData.title, {
        left: canvasWidth / 2,
        top: titleY,
        originX: 'center',
        originY: 'top',
        fontFamily: template.typography.title.fontFamily,
        fontSize: Math.min(template.typography.title.fontSize, canvasWidth / 12),
        fontWeight: template.typography.title.fontWeight as any,
        fill: template.typography.title.color,
        textAlign: 'center',
        selectable: true
      });

      // Enable text wrapping
      title.set({
        splitByGrapheme: false,
        width: canvasWidth - template.layout.margins * 2
      });

      fabricCanvas.add(title);

      // 5. Add date information
      const dateText = posterData.dateDebut === posterData.dateFin 
        ? new Date(posterData.dateDebut).toLocaleDateString('fr-FR', { 
            weekday: 'long', 
            day: 'numeric', 
            month: 'long' 
          })
        : `${new Date(posterData.dateDebut).toLocaleDateString('fr-FR')} - ${new Date(posterData.dateFin).toLocaleDateString('fr-FR')}`;

      const dateObj = new Text(dateText.toUpperCase(), {
        left: canvasWidth / 2,
        top: titleY + template.layout.contentSpacing * 2,
        originX: 'center',
        originY: 'top',
        fontFamily: template.typography.subtitle.fontFamily,
        fontSize: template.typography.subtitle.fontSize,
        fontWeight: template.typography.subtitle.fontWeight as any,
        fill: template.typography.subtitle.color,
        textAlign: 'center',
        selectable: true
      });

      fabricCanvas.add(dateObj);

      // 6. Add location
      const location = new Text(posterData.lieu.split(',')[0].toUpperCase(), {
        left: canvasWidth / 2,
        top: titleY + template.layout.contentSpacing * 3,
        originX: 'center',
        originY: 'top',
        fontFamily: template.typography.detail.fontFamily,
        fontSize: template.typography.detail.fontSize,
        fontWeight: template.typography.detail.fontWeight as any,
        fill: template.typography.detail.color,
        textAlign: 'center',
        selectable: true
      });

      fabricCanvas.add(location);

      // 7. Add accent line
      const accentLine = new Rect({
        left: canvasWidth / 2 - 100,
        top: canvasHeight - template.layout.margins - 60,
        width: 200,
        height: template.layout.accentHeight,
        fill: template.accent,
        originX: 'center',
        selectable: false
      });

      fabricCanvas.add(accentLine);

      fabricCanvas.renderAll();
      saveToHistory(fabricCanvas);
      
      toast.success("Affiche générée avec succès !");
      
    } catch (error) {
      console.error('Erreur lors de la génération:', error);
      toast.error("Erreur lors de la génération de l'affiche");
    } finally {
      setIsGenerating(false);
    }
  }, [fabricCanvas, posterData, selectedStyle, customText, saveToHistory]);

  // Update zoom
  useEffect(() => {
    if (fabricCanvas) {
      const zoomLevel = zoom[0] / 100;
      fabricCanvas.setZoom(zoomLevel);
      fabricCanvas.renderAll();
    }
  }, [zoom, fabricCanvas]);

  // Export canvas
  const exportCanvas = useCallback((format: 'png' | 'pdf' = 'png') => {
    if (!fabricCanvas) return;

    const dataURL = fabricCanvas.toDataURL({
      format: 'png',
      quality: 1,
      multiplier: currentFormat.width / fabricCanvas.width!,
    });

    const link = document.createElement('a');
    link.download = `affiche-${posterData.title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.${format}`;
    link.href = dataURL;
    link.click();

    toast.success(`Affiche exportée en ${format.toUpperCase()}`);
  }, [fabricCanvas, posterData.title, currentFormat]);

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Layout className="w-5 h-5" />
            Éditeur Professionnel
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 items-center">
            {/* Format Selection */}
            <div className="flex items-center gap-2">
              <Label className="text-sm">Format:</Label>
              <Select value={selectedFormat} onValueChange={setSelectedFormat}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(formats).map(([key, format]) => (
                    <SelectItem key={key} value={key}>
                      {format.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Zoom Control */}
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setZoom([Math.max(25, zoom[0] - 25)])}>
                <ZoomOut className="w-4 h-4" />
              </Button>
              <div className="w-20">
                <Slider
                  value={zoom}
                  onValueChange={setZoom}
                  min={25}
                  max={200}
                  step={25}
                />
              </div>
              <Button variant="outline" size="sm" onClick={() => setZoom([Math.min(200, zoom[0] + 25)])}>
                <ZoomIn className="w-4 h-4" />
              </Button>
              <span className="text-sm text-muted-foreground">{zoom[0]}%</span>
            </div>

            {/* History Controls */}
            <div className="flex items-center gap-1">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={undo}
                disabled={historyIndex <= 0}
              >
                <Undo className="w-4 h-4" />
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={redo}
                disabled={historyIndex >= history.length - 1}
              >
                <Redo className="w-4 h-4" />
              </Button>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 ml-auto">
              <Button 
                onClick={generatePoster} 
                disabled={isGenerating}
                className="gap-2"
              >
                {isGenerating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Palette className="w-4 h-4" />
                )}
                Générer
              </Button>
              <Button 
                variant="outline" 
                onClick={() => exportCanvas('png')}
                className="gap-2"
              >
                <Download className="w-4 h-4" />
                Exporter
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Canvas */}
      <Card>
        <CardContent className="p-6">
          <div className="flex justify-center">
            <div className="border rounded-lg shadow-lg overflow-hidden bg-white">
              <canvas ref={canvasRef} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Format Info */}
      <div className="flex justify-center">
        <Badge variant="secondary" className="gap-2">
          <Layers className="w-3 h-3" />
          {currentFormat.name} - {currentFormat.width}×{currentFormat.height}px
        </Badge>
      </div>
    </div>
  );
};