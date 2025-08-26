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

export default function GenerateurAffiches() {
  const [selectedFiche, setSelectedFiche] = useState<typeof mockFiches[0] | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStyle, setSelectedStyle] = useState("");
  const [customText, setCustomText] = useState("");
  const [customImage, setCustomImage] = useState<string | null>(null);
  const [showEditor, setShowEditor] = useState(false);

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

  const handleGenerate = () => {
    if (!selectedFiche) {
      toast.error("Veuillez sélectionner un événement");
      return;
    }
    if (!selectedStyle) {
      toast.error("Veuillez sélectionner un style");
      return;
    }
    setShowEditor(true);
    toast.success("Éditeur professionnel ouvert !");
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
          
          {/* Show Editor if activated */}
          {showEditor && selectedFiche ? (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 mb-2">
                    Éditeur Professionnel - {selectedFiche.title}
                  </h2>
                  <p className="text-slate-600">
                    Créez et personnalisez votre affiche avec l'éditeur Fabric.js
                  </p>
                </div>
                <Button 
                  variant="outline" 
                  onClick={() => setShowEditor(false)}
                  className="gap-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Retour à la sélection
                </Button>
              </div>
              
              <FabricPosterCanvas
                posterData={selectedFiche}
                selectedStyle={selectedStyle}
                customText={customText}
                onGenerate={(data) => {
                  console.log('Generated poster data:', data);
                  toast.success("Affiche générée avec succès !");
                }}
              />
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
                        <Label>Texte personnalisé (optionnel)</Label>
                        <Textarea
                          placeholder="Remplacer le titre par un texte personnalisé..."
                          value={customText}
                          onChange={(e) => setCustomText(e.target.value)}
                          rows={3}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Image personnalisée (optionnel)</Label>
                        <Input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onload = (e) => setCustomImage(e.target?.result as string);
                              reader.readAsDataURL(file);
                            }
                          }}
                        />
                        {customImage && (
                          <div className="w-full h-24 rounded bg-muted overflow-hidden">
                            <img src={customImage} alt="Aperçu" className="w-full h-full object-cover" />
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
                        <Layout className="w-5 h-5" />
                        3. Lancer l'éditeur
                      </CardTitle>
                      <CardDescription>
                        Ouvrir l'éditeur professionnel Fabric.js
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <Button 
                        onClick={handleGenerate}
                        disabled={!selectedFiche || !selectedStyle}
                        size="lg"
                        className="w-full gap-2"
                      >
                        <Wand2 className="w-5 h-5" />
                        Ouvrir l'éditeur professionnel
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

                      {/* Aperçu des fonctionnalités */}
                      <div className="space-y-3 pt-4 border-t">
                        <h4 className="font-medium text-sm">Fonctionnalités de l'éditeur :</h4>
                        <div className="space-y-2 text-xs text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                            Édition interactive en temps réel
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                            Templates professionnels 2024-2025
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 bg-purple-500 rounded-full" />
                            Export haute qualité (PNG, PDF)
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 bg-orange-500 rounded-full" />
                            Historique Annuler/Refaire
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 bg-red-500 rounded-full" />
                            Formats adaptés (Instagram, Print)
                          </div>
                        </div>
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