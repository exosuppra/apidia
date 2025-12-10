import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { 
  Globe, 
  Smartphone, 
  Search, 
  Zap, 
  Calendar,
  CheckCircle,
  ArrowLeft,
  Star,
  TrendingUp,
  Users,
  Clock,
  MapPin,
  Wifi,
  Shield,
  Sparkles,
  Mail
} from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import Seo from "@/components/Seo";

const GenerationSiteWeb = () => {
  const [formData, setFormData] = useState({
    businessName: "",
    businessType: "",
    website: "",
    email: ""
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success("Demande envoyée ! Nous vous contacterons sous 24h pour discuter de votre projet.");
  };

  const features = [
    {
      icon: <Globe className="w-6 h-6 text-primary" />,
      title: "Site vitrine moderne",
      description: "Design responsive et professionnel adapté à votre image de marque"
    },
    {
      icon: <Shield className="w-6 h-6 text-primary" />,
      title: "Back-office sur mesure",
      description: "Interface d'administration personnalisée pour gérer vos contenus en autonomie"
    },
    {
      icon: <Search className="w-6 h-6 text-primary" />,
      title: "SEO optimisé",
      description: "Structure technique et contenus optimisés pour les moteurs de recherche"
    },
    {
      icon: <Zap className="w-6 h-6 text-primary" />,
      title: "Performance ultra-rapide",
      description: "Temps de chargement optimisé pour une meilleure expérience utilisateur"
    },
    {
      icon: <Smartphone className="w-6 h-6 text-primary" />,
      title: "Mobile-first",
      description: "Parfaitement adapté aux appareils mobiles et tablettes"
    },
    {
      icon: <Sparkles className="w-6 h-6 text-primary" />,
      title: "IA intégrée",
      description: "Optimisation automatique des contenus pour les nouvelles recherches IA"
    }
  ];

  const seoFeatures = [
    {
      title: "SEO Technique",
      items: [
        "Structure HTML sémantique",
        "Balises meta optimisées",
        "Schema.org intégré",
        "Sitemap automatique",
        "Optimisation des images",
        "Core Web Vitals optimisés"
      ]
    },
    {
      title: "Generative Engine Optimization (GEO)",
      items: [
        "Contenus structurés pour l'IA",
        "Optimisation pour ChatGPT et Bard",
        "Réponses directes aux questions fréquentes",
        "Format adapté aux citations IA",
        "Données contextuelles enrichies"
      ]
    },
    {
      title: "Generative Search Optimization (GSO)",
      items: [
        "Contenus conversationnels",
        "Réponses aux requêtes longues",
        "Optimisation pour la recherche vocale",
        "Snippets optimisés",
        "FAQ structurées"
      ]
    }
  ];

  const process = [
    {
      step: 1,
      title: "Analyse de vos besoins",
      description: "Étude de votre activité, concurrence et objectifs à partir des données ApidIA"
    },
    {
      step: 2,
      title: "Création du site vitrine",
      description: "Développement avec notre technologie avancée"
    },
    {
      step: 3,
      title: "Back-office sur mesure",
      description: "Développement de votre interface d'administration personnalisée"
    },
    {
      step: 4,
      title: "Optimisation SEO/IA",
      description: "Mise en place des optimisations SEO, GEO et GSO"
    },
    {
      step: 5,
      title: "Tests et livraison",
      description: "Validation complète et mise en ligne de votre site"
    }
  ];

  return (
    <>
      <Seo
        title="Génération de Site Vitrine - ApidIA | Création de Site Web Optimisé IA"
        description="Création de sites vitrines modernes avec back-office sur mesure. Optimisation SEO, GEO et GSO pour une visibilité maximale dans les recherches IA et traditionnelles."
        keywords="création site vitrine, site internet tourisme, back-office sur mesure, SEO, GEO, GSO, optimisation IA"
      />

      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="container flex h-14 items-center">
            <Link to="/catalogue" className="flex items-center gap-2 mr-6">
              <ArrowLeft className="w-4 h-4" />
              <span className="text-sm text-muted-foreground">Retour au catalogue</span>
            </Link>
            <div className="flex items-center gap-2">
              <Globe className="w-6 h-6 text-primary" />
              <span className="font-semibold">ApidIA</span>
            </div>
            <div className="ml-auto">
              <Button variant="outline" asChild>
                <Link to="/auth/login">Se connecter</Link>
              </Button>
            </div>
          </div>
        </header>

        {/* Hero Section */}
        <section className="py-12 md:py-24 lg:py-32 bg-gradient-to-br from-primary/5 via-background to-secondary/5">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center space-y-4 text-center">
              <Badge variant="secondary" className="px-4 py-2">
                <Sparkles className="w-4 h-4 mr-2" />
                Technologie IA Avancée
              </Badge>
              <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl lg:text-6xl">
                Site Vitrine Professionnel
                <span className="text-primary block mt-2">Optimisé pour l'IA</span>
              </h1>
              <p className="mx-auto max-w-[700px] text-muted-foreground md:text-xl">
                Créez un site vitrine moderne avec un back-office sur mesure pour gérer vos contenus en autonomie. 
                Optimisé SEO, GEO et GSO pour une visibilité maximale dans les recherches traditionnelles et IA.
              </p>
              <div className="space-x-4">
                <Button size="lg" className="px-8">
                  Demander un devis
                </Button>
                <Button variant="outline" size="lg">
                  Voir des exemples
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-12 md:py-24">
          <div className="container px-4 md:px-6">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-4">Fonctionnalités Incluses</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Tous nos sites incluent les dernières technologies pour une performance optimale
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {features.map((feature, index) => (
                <Card key={index} className="h-full">
                  <CardHeader>
                    <div className="flex items-center gap-3 mb-2">
                      {feature.icon}
                      <CardTitle className="text-xl">{feature.title}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-sm leading-relaxed">
                      {feature.description}
                    </CardDescription>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Back-office sur mesure */}
        <section className="py-12 md:py-24 bg-muted/30">
          <div className="container px-4 md:px-6">
            <div className="max-w-3xl mx-auto">
              <div className="text-center mb-8">
                <Badge variant="secondary" className="mb-4">
                  <Shield className="w-4 h-4 mr-2" />
                  Administration personnalisée
                </Badge>
                <h2 className="text-3xl font-bold mb-6">
                  Back-office Développé Sur Mesure
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  Chaque site vitrine est livré avec une interface d'administration entièrement personnalisée, 
                  développée selon vos besoins spécifiques pour vous permettre de gérer vos contenus en toute autonomie.
                </p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-primary mt-0.5" />
                  <div>
                    <h4 className="font-semibold">Gestion des contenus</h4>
                    <p className="text-sm text-muted-foreground">Modifiez textes, images et médias en quelques clics</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-primary mt-0.5" />
                  <div>
                    <h4 className="font-semibold">Interface intuitive</h4>
                    <p className="text-sm text-muted-foreground">Aucune compétence technique requise</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-primary mt-0.5" />
                  <div>
                    <h4 className="font-semibold">Fonctionnalités adaptées</h4>
                    <p className="text-sm text-muted-foreground">Développement sur mesure selon votre activité</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-primary mt-0.5" />
                  <div>
                    <h4 className="font-semibold">Formation incluse</h4>
                    <p className="text-sm text-muted-foreground">Accompagnement pour la prise en main de votre back-office</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SEO et Optimisations IA */}
        <section className="py-12 md:py-24">
          <div className="container px-4 md:px-6">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-4">Optimisations SEO & IA</h2>
              <p className="text-muted-foreground max-w-3xl mx-auto">
                Votre site sera optimisé pour les moteurs de recherche traditionnels ET les nouveaux moteurs de recherche IA
              </p>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {seoFeatures.map((category, index) => (
                <Card key={index} className="h-full">
                  <CardHeader>
                    <CardTitle className="text-xl">{category.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-3">
                      {category.items.map((item, itemIndex) => (
                        <li key={itemIndex} className="flex items-start gap-2">
                          <CheckCircle className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                          <span className="text-sm">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="mt-12 p-6 bg-gradient-to-r from-primary/5 to-secondary/5 rounded-lg">
              <div className="text-center">
                <h3 className="text-xl font-semibold mb-3">SEO, GEO, GSO : Quelles différences ?</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
                  <div>
                    <h4 className="font-semibold text-primary mb-2">🔍 SEO - Search Engine Optimization</h4>
                    <p className="text-sm text-muted-foreground">
                      Le référencement classique : que votre site apparaisse dans les résultats Google par mots-clés.
                      <span className="block mt-1 font-medium">Objectif : SEO = je veux que Google me montre</span>
                    </p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-primary mb-2">🧠 GEO - Generative Engine Optimization</h4>
                    <p className="text-sm text-muted-foreground">
                      Que votre contenu soit utilisé comme source par les IA (ChatGPT, Perplexity, Mistral). 
                      Répondre clairement et complètement aux questions.
                      <span className="block mt-1 font-medium">Objectif : GEO = je veux que ChatGPT me cite</span>
                    </p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-primary mb-2">⚙️ GSO - Generative Search Optimization</h4>
                    <p className="text-sm text-muted-foreground">
                      Optimisation pour les IA intégrées aux moteurs (Google AI Overview). 
                      Que Google IA affiche votre contenu directement, sans clic.
                      <span className="block mt-1 font-medium">Objectif : GSO = je veux que Google IA m'intègre</span>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Process */}
        <section className="py-12 md:py-24 bg-muted/30">
          <div className="container px-4 md:px-6">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-4">Notre Processus</h2>
              <p className="text-muted-foreground">5 étapes pour créer votre site parfait</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
              {process.map((step, index) => (
                <div key={index} className="text-center">
                  <div className="w-12 h-12 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold text-lg mx-auto mb-4">
                    {step.step}
                  </div>
                  <h3 className="font-semibold mb-2">{step.title}</h3>
                  <p className="text-sm text-muted-foreground">{step.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Contact Form */}
        <section className="py-12 md:py-24">
          <div className="container px-4 md:px-6">
            <div className="max-w-2xl mx-auto">
              <Card>
                <CardHeader className="text-center">
                  <CardTitle className="text-2xl">Demander un Devis</CardTitle>
                  <CardDescription>
                    Parlez-nous de votre projet et recevez une estimation personnalisée
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="businessName">Nom de l'établissement *</Label>
                        <Input
                          id="businessName"
                          value={formData.businessName}
                          onChange={(e) => setFormData({...formData, businessName: e.target.value})}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="businessType">Type d'activité *</Label>
                        <Input
                          id="businessType"
                          placeholder="Ex: Hôtel, Gîte, Camping..."
                          value={formData.businessType}
                          onChange={(e) => setFormData({...formData, businessType: e.target.value})}
                          required
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="website">Site web actuel (optionnel)</Label>
                      <Input
                        id="website"
                        type="url"
                        placeholder="https://votre-site-actuel.com"
                        value={formData.website}
                        onChange={(e) => setFormData({...formData, website: e.target.value})}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="email">Email *</Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                        required
                      />
                    </div>
                    
                    <Button type="submit" className="w-full" size="lg">
                      Recevoir mon devis gratuit
                    </Button>
                    
                    <p className="text-xs text-muted-foreground text-center">
                      Réponse sous 24h • Devis gratuit et sans engagement
                    </p>
                  </form>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Stats */}
        <section className="py-12 bg-primary text-primary-foreground">
          <div className="container px-4 md:px-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
              <div>
                <div className="text-3xl font-bold mb-2">150+</div>
                <div className="text-sm opacity-90">Sites créés</div>
              </div>
              <div>
                <div className="text-3xl font-bold mb-2">98%</div>
                <div className="text-sm opacity-90">Clients satisfaits</div>
              </div>
              <div>
                <div className="text-3xl font-bold mb-2">24h</div>
                <div className="text-sm opacity-90">Temps de réponse</div>
              </div>
              <div>
                <div className="text-3xl font-bold mb-2">3.2s</div>
                <div className="text-sm opacity-90">Temps de chargement moyen</div>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="py-8 border-t bg-muted/30">
          <div className="container px-4 md:px-6">
            <div className="text-center mb-6">
              <div className="flex items-center justify-center gap-3 mb-4">
                <img 
                  src="/lovable-uploads/d4594427-d5ec-4616-9298-7912d6c72b56.png" 
                  alt="ApidIA Logo" 
                  className="w-8 h-8 object-contain"
                />
                <span className="font-semibold">ApidIA</span>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                Votre partenaire pour le développement digital de votre activité touristique
              </p>
              
              {/* Contact Information */}
              <div className="flex flex-col md:flex-row items-center justify-center gap-6 mb-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Mail className="w-4 h-4" />
                  <a href="mailto:direction@paysdemanosque.com" className="hover:text-primary transition-colors">
                    direction@paysdemanosque.com
                  </a>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                  </svg>
                  <a href="tel:+33492737193" className="hover:text-primary transition-colors">
                    04 92 73 71 93
                  </a>
                </div>
              </div>
              
              <p className="text-xs text-muted-foreground/70">
                Développé par l'Office de Tourisme et des Congrès du Pays de Manosque
              </p>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
};

export default GenerationSiteWeb;