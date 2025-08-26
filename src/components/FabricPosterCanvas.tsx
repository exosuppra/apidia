import { useEffect, useRef, useState, useCallback } from "react";
import { Canvas as FabricCanvas, FabricImage, Text, Rect, Group } from "fabric";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
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
  Loader2,
  Settings,
  Eye,
  Maximize2,
  Save,
  Sparkles
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
      overlay: 'rgba(0,0,0,0.6)',
      typography: {
        title: { fontFamily: 'Arial', fontSize: 80, fontWeight: 'bold', color: '#ffffff' },
        subtitle: { fontFamily: 'Arial', fontSize: 32, fontWeight: '600', color: '#e2e8f0' },
        detail: { fontFamily: 'Arial', fontSize: 24, fontWeight: '500', color: '#cbd5e1' }
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
      overlay: 'rgba(15,23,42,0.75)',
      typography: {
        title: { fontFamily: 'Arial', fontSize: 70, fontWeight: '700', color: '#f8fafc' },
        subtitle: { fontFamily: 'Arial', fontSize: 28, fontWeight: '500', color: '#e2e8f0' },
        detail: { fontFamily: 'Arial', fontSize: 22, fontWeight: '400', color: '#cbd5e1' }
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
      overlay: 'rgba(236,72,153,0.7)',
      typography: {
        title: { fontFamily: 'Arial', fontSize: 85, fontWeight: '700', color: '#ffffff' },
        subtitle: { fontFamily: 'Arial', fontSize: 35, fontWeight: '600', color: '#ffffff' },
        detail: { fontFamily: 'Arial', fontSize: 26, fontWeight: '500', color: '#f1f5f9' }
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
      overlay: 'rgba(92,66,46,0.85)',
      typography: {
        title: { fontFamily: 'Arial', fontSize: 65, fontWeight: '700', color: '#fef3c7' },
        subtitle: { fontFamily: 'Arial', fontSize: 30, fontWeight: '500', color: '#fde68a' },
        detail: { fontFamily: 'Arial', fontSize: 24, fontWeight: '400', color: '#fcd34d' }
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
  const [previewMode, setPreviewMode] = useState(false);

  // Format definitions
  const formats = {
    story: { width: 1080, height: 1920, name: "Story Instagram", icon: "📱" },
    feed: { width: 1080, height: 1350, name: "Feed Instagram", icon: "📷" },
    banner: { width: 1920, height: 1080, name: "Bannière Facebook", icon: "🖥️" },
    print: { width: 2480, height: 3508, name: "A4 Print (300 DPI)", icon: "🖨️" }
  };

  const currentFormat = formats[selectedFormat as keyof typeof formats];

  // Initialize Fabric Canvas
  useEffect(() => {
    if (!canvasRef.current || fabricCanvas) return;

    console.log('Initializing Fabric Canvas...');
    
    const canvas = new FabricCanvas(canvasRef.current, {
      width: 600,
      height: (600 * currentFormat.height) / currentFormat.width,
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
    toast("🎨 Génération de votre affiche professionnelle...");

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

      // 2. Add overlay
      const overlay = new Rect({
        left: 0,
        top: 0,
        width: canvasWidth,
        height: canvasHeight,
        fill: template.overlay,
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
        fontFamily: 'Arial',
        fontSize: 16,
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
        fontSize: Math.min(template.typography.title.fontSize * 0.6, canvasWidth / 15),
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
        top: titleY + template.layout.contentSpacing * 1.5,
        originX: 'center',
        originY: 'top',
        fontFamily: template.typography.subtitle.fontFamily,
        fontSize: template.typography.subtitle.fontSize * 0.6,
        fontWeight: template.typography.subtitle.fontWeight as any,
        fill: template.typography.subtitle.color,
        textAlign: 'center',
        selectable: true
      });

      fabricCanvas.add(dateObj);

      // 6. Add location
      const location = new Text(posterData.lieu.split(',')[0].toUpperCase(), {
        left: canvasWidth / 2,
        top: titleY + template.layout.contentSpacing * 2.2,
        originX: 'center',
        originY: 'top',
        fontFamily: template.typography.detail.fontFamily,
        fontSize: template.typography.detail.fontSize * 0.6,
        fontWeight: template.typography.detail.fontWeight as any,
        fill: template.typography.detail.color,
        textAlign: 'center',
        selectable: true
      });

      fabricCanvas.add(location);

      // 7. Add accent line
      const accentLine = new Rect({
        left: canvasWidth / 2 - 80,
        top: canvasHeight - template.layout.margins - 40,
        width: 160,
        height: template.layout.accentHeight,
        fill: template.accent,
        originX: 'center',
        selectable: false
      });

      fabricCanvas.add(accentLine);

      fabricCanvas.renderAll();
      saveToHistory(fabricCanvas);
      
      toast.success("✨ Affiche générée avec succès !");
      
    } catch (error) {
      console.error('Erreur lors de la génération:', error);
      toast.error("❌ Erreur lors de la génération de l'affiche");
    } finally {
      setIsGenerating(false);
    }
  }, [fabricCanvas, posterData, selectedStyle, customText, saveToHistory]);

  // Update canvas size when format changes
  useEffect(() => {
    if (fabricCanvas && canvasRef.current) {
      const newWidth = 600;
      const newHeight = (600 * currentFormat.height) / currentFormat.width;
      
      fabricCanvas.setWidth(newWidth);
      fabricCanvas.setHeight(newHeight);
      fabricCanvas.renderAll();
    }
  }, [fabricCanvas, currentFormat]);

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

    toast.success(`📁 Affiche exportée en ${format.toUpperCase()}`);
  }, [fabricCanvas, posterData.title, currentFormat]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Modern Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-slate-200/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Left section */}
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-slate-900">Éditeur Professionnel</h1>
                  <p className="text-sm text-slate-500">{posterData.title}</p>
                </div>
              </div>
              
              <Separator orientation="vertical" className="h-8" />
              
              {/* Format selector */}
              <div className="flex items-center gap-3">
                <Label className="text-sm font-medium text-slate-700">Format:</Label>
                <Select value={selectedFormat} onValueChange={setSelectedFormat}>
                  <SelectTrigger className="w-48 bg-white/50 border-slate-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white/95 backdrop-blur-sm border-slate-200">
                    {Object.entries(formats).map(([key, format]) => (
                      <SelectItem key={key} value={key} className="hover:bg-slate-50">
                        <div className="flex items-center gap-2">
                          <span>{format.icon}</span>
                          <span>{format.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Right section */}
            <div className="flex items-center gap-3">
              {/* Zoom controls */}
              <div className="flex items-center gap-2 bg-white/50 rounded-lg px-3 py-2">
                <Button variant="ghost" size="sm" onClick={() => setZoom([Math.max(25, zoom[0] - 25)])}>
                  <ZoomOut className="w-4 h-4" />
                </Button>
                <div className="w-20">
                  <Slider
                    value={zoom}
                    onValueChange={setZoom}
                    min={25}
                    max={200}
                    step={25}
                    className="cursor-pointer"
                  />
                </div>
                <Button variant="ghost" size="sm" onClick={() => setZoom([Math.min(200, zoom[0] + 25)])}>
                  <ZoomIn className="w-4 h-4" />
                </Button>
                <span className="text-sm text-slate-600 min-w-[40px]">{zoom[0]}%</span>
              </div>

              {/* History controls */}
              <div className="flex items-center gap-1 bg-white/50 rounded-lg p-1">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={undo}
                  disabled={historyIndex <= 0}
                  className="hover:bg-white/80"
                >
                  <Undo className="w-4 h-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={redo}
                  disabled={historyIndex >= history.length - 1}
                  className="hover:bg-white/80"
                >
                  <Redo className="w-4 h-4" />
                </Button>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline"
                  onClick={() => setPreviewMode(!previewMode)}
                  className="gap-2 bg-white/50 hover:bg-white/80"
                >
                  <Eye className="w-4 h-4" />
                  {previewMode ? 'Éditer' : 'Aperçu'}
                </Button>
                
                <Button 
                  onClick={generatePoster} 
                  disabled={isGenerating}
                  className="gap-2 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white shadow-lg"
                >
                  {isGenerating ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Palette className="w-4 h-4" />
                  )}
                  {isGenerating ? 'Génération...' : 'Générer'}
                </Button>
                
                <Button 
                  variant="outline"
                  onClick={() => exportCanvas('png')}
                  className="gap-2 bg-green-50 hover:bg-green-100 text-green-700 border-green-200"
                >
                  <Download className="w-4 h-4" />
                  Exporter
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main workspace */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid lg:grid-cols-4 gap-8">
          
          {/* Side panel - Tools */}
          <div className="lg:col-span-1">
            <Card className="bg-white/80 backdrop-blur-sm border-slate-200/50 shadow-lg">
              <CardHeader className="bg-gradient-to-r from-slate-50 to-blue-50">
                <CardTitle className="flex items-center gap-2 text-slate-800">
                  <Settings className="w-5 h-5" />
                  Outils & Paramètres
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6 p-6">
                
                {/* Style info */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium text-slate-700">Style actuel</Label>
                  <div className="p-3 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-100">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-3 h-3 rounded-full bg-gradient-to-r from-blue-500 to-purple-600"></div>
                      <span className="font-medium text-sm capitalize">{selectedStyle}</span>
                    </div>
                    <p className="text-xs text-slate-600">
                      Optimisé pour les événements de type "{posterData.type}"
                    </p>
                  </div>
                </div>

                {/* Format info */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium text-slate-700">Format de sortie</Label>
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg">{currentFormat.icon}</span>
                      <span className="font-medium text-sm">{currentFormat.name}</span>
                    </div>
                    <p className="text-xs text-slate-500">
                      {currentFormat.width} × {currentFormat.height}px
                    </p>
                  </div>
                </div>

                {/* Quick actions */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium text-slate-700">Actions rapides</Label>
                  <div className="space-y-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full justify-start gap-2 hover:bg-slate-50"
                      onClick={() => fabricCanvas?.getObjects().forEach(obj => fabricCanvas.remove(obj))}
                    >
                      <RotateCcw className="w-4 h-4" />
                      Vider le canvas
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full justify-start gap-2 hover:bg-slate-50"
                      onClick={() => setZoom([100])}
                    >
                      <Maximize2 className="w-4 h-4" />
                      Réinitialiser zoom
                    </Button>
                  </div>
                </div>

                {/* Tips */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium text-slate-700">💡 Conseils</Label>
                  <div className="text-xs text-slate-600 space-y-2">
                    <p>• Utilisez le zoom pour les détails précis</p>
                    <p>• Les éléments sont déplaçables et redimensionnables</p>
                    <p>• Ctrl+Z pour annuler, Ctrl+Y pour refaire</p>
                    <p>• Testez différents formats pour vos besoins</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main canvas area */}
          <div className="lg:col-span-3">
            <Card className="bg-white/80 backdrop-blur-sm border-slate-200/50 shadow-xl overflow-hidden">
              <CardContent className="p-8">
                <div className="flex justify-center">
                  <div className={`relative rounded-xl shadow-2xl overflow-hidden bg-white ${previewMode ? 'ring-4 ring-blue-500/20' : ''}`}>
                    <canvas 
                      ref={canvasRef} 
                      className="block max-w-full transition-all duration-300 hover:shadow-lg"
                    />
                    {previewMode && (
                      <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent pointer-events-none" />
                    )}
                  </div>
                </div>
                
                {/* Canvas info */}
                <div className="flex justify-center mt-6">
                  <div className="flex items-center gap-4 px-4 py-2 bg-slate-50 rounded-full border border-slate-200">
                    <Badge variant="secondary" className="gap-2 bg-white">
                      <Layers className="w-3 h-3" />
                      {currentFormat.name}
                    </Badge>
                    <div className="text-xs text-slate-500">
                      {currentFormat.width}×{currentFormat.height}px
                    </div>
                    <div className="text-xs text-slate-500">
                      Zoom: {zoom[0]}%
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};