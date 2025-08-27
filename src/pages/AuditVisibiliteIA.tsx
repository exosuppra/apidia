import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Seo from "@/components/Seo";
import { 
  Globe, 
  MapPin, 
  Users, 
  Clock, 
  Monitor, 
  TrendingUp,
  Lightbulb,
  Shield,
  CheckCircle,
  AlertTriangle,
  Target,
  Eye,
  FileText,
  ArrowLeft,
  Zap,
  Bot,
  Search,
  Smartphone,
  Star,
  MessageCircle,
  Facebook,
  Instagram,
  Twitter,
  Mail
} from "lucide-react";

const AuditVisibiliteIA = () => {
  const features = [
    {
      icon: <Globe className="w-6 h-6" />,
      title: "Analyse de présence en ligne",
      description: "Détection de votre site internet, évaluation de sa qualité et de son référencement naturel"
    },
    {
      icon: <MapPin className="w-6 h-6" />,
      title: "Vérification Google Business Profile",
      description: "Contrôle de l'existence et de l'optimisation de votre fiche Google My Business"
    },
    {
      icon: <Users className="w-6 h-6" />,
      title: "Cohérence des informations",
      description: "Vérification que vos données Apidae correspondent à celles des réseaux sociaux et sites"
    },
    {
      icon: <Star className="w-6 h-6" />,
      title: "Analyse de la réputation",
      description: "Étude de vos avis clients et de votre e-réputation sur les différentes plateformes"
    },
    {
      icon: <MessageCircle className="w-6 h-6" />,
      title: "Présence sur les réseaux sociaux",
      description: "Évaluation de votre activité sur Facebook, Instagram et autres réseaux pertinents"
    },
    {
      icon: <Search className="w-6 h-6" />,
      title: "Positionnement dans les recherches",
      description: "Analyse de votre visibilité dans les résultats de recherche Google locaux"
    }
  ];

  const benefits = [
    {
      icon: <Eye className="w-5 h-5" />,
      title: "Diagnostic complet de votre visibilité",
      description: "Vue d'ensemble de votre présence digitale sur tous les canaux importants"
    },
    {
      icon: <Lightbulb className="w-5 h-5" />,
      title: "Recommandations prioritaires",
      description: "Conseils personnalisés classés par ordre d'importance pour votre activité"
    },
    {
      icon: <CheckCircle className="w-5 h-5" />,
      title: "Points forts mis en valeur",
      description: "Identification de ce qui fonctionne bien dans votre stratégie digitale"
    },
    {
      icon: <AlertTriangle className="w-5 h-5" />,
      title: "Lacunes identifiées",
      description: "Détection précise des manques à combler pour améliorer votre visibilité"
    }
  ];

  const steps = [
    {
      icon: <Bot className="w-8 h-8" />,
      title: "L'IA analyse votre présence",
      description: "Notre intelligence artificielle scanne automatiquement votre présence en ligne"
    },
    {
      icon: <Search className="w-8 h-8" />,
      title: "Collecte des données",
      description: "Récupération des informations depuis Apidae, Google, réseaux sociaux et votre site"
    },
    {
      icon: <FileText className="w-8 h-8" />,
      title: "Génération du rapport",
      description: "Création automatique d'un rapport détaillé avec recommandations personnalisées"
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <Seo 
        title="Audit de Visibilité IA Gratuit | Analyse Présence Digitale - ApidIA"
        description="Obtenez gratuitement un audit complet de votre visibilité en ligne : analyse de votre site, Google Business Profile, réseaux sociaux et cohérence des données. Conseils personnalisés par IA."
        canonical={`${window.location.origin}/audit-visibilite-ia`}
        keywords="audit visibilité gratuit, analyse présence en ligne, google business profile, audit digital tourisme, visibilité internet, IA audit digital"
        ogImage="/lovable-uploads/d4594427-d5ec-4616-9298-7912d6c72b56.png"
        ogUrl={`${window.location.origin}/audit-visibilite-ia`}
        structuredData={{
          "@context": "https://schema.org",
          "@type": "Service",
          "name": "Audit de Visibilité IA - Analyse Présence Digitale",
          "description": "Service gratuit d'audit complet de visibilité en ligne par intelligence artificielle, incluant analyse de site, Google Business Profile et réseaux sociaux",
          "provider": {
            "@type": "Organization",
            "name": "ApidIA",
            "url": window.location.origin
          },
          "offers": {
            "@type": "Offer",
            "price": "0",
            "priceCurrency": "EUR",
            "availability": "https://schema.org/InStock"
          }
        }}
      />

      {/* Header */}
      <header className="border-b bg-white/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img 
              src="/lovable-uploads/d4594427-d5ec-4616-9298-7912d6c72b56.png" 
              alt="Logo ApidIA - Solutions d'intelligence artificielle pour professionnels du tourisme" 
              className="w-10 h-10 object-contain"
            />
            <h1 className="text-xl font-bold text-primary">ApidIA</h1>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="outline" asChild>
              <Link to="/catalogue" className="flex items-center gap-2">
                <ArrowLeft className="w-4 h-4" />
                Retour au catalogue
              </Link>
            </Button>
            <Button asChild>
              <Link to="/auth/login">Se connecter</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-16 bg-gradient-to-br from-primary/5 via-background to-secondary/5">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="text-center mb-12">
            <div className="flex items-center justify-center gap-3 mb-6">
              <div className="bg-primary/10 p-3 rounded-full">
                <Bot className="w-8 h-8 text-primary" />
              </div>
              <Badge variant="secondary" className="bg-green-100 text-green-700 hover:bg-green-100">
                100% Gratuit
              </Badge>
            </div>
            
            <h2 className="text-3xl md:text-4xl font-bold mb-6 text-foreground">
              Audit de Visibilité <span className="text-primary">IA</span>
            </h2>
            
            <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed mb-8">
              Notre intelligence artificielle analyse automatiquement votre présence digitale et vous propose des conseils personnalisés pour améliorer votre visibilité en ligne.
            </p>

            <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-6 mb-8">
              <div className="flex items-center justify-center gap-2 mb-3">
                <CheckCircle className="w-6 h-6 text-green-600" />
                <span className="text-green-800 font-semibold text-lg">Audit 100% automatisé par IA</span>
              </div>
              <p className="text-green-700 text-center">
                Aucune saisie manuelle requise - L'IA utilise directement les informations de votre fiche Apidae
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* What We Analyze Section */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="text-center mb-12">
            <h3 className="text-2xl md:text-3xl font-bold mb-4">Ce que notre IA analyse pour vous</h3>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Un diagnostic complet de votre présence digitale en quelques minutes
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="border-2 hover:border-primary/20 transition-colors">
                <CardHeader className="text-center pb-4">
                  <div className="bg-primary/10 p-3 rounded-full w-fit mx-auto mb-4">
                    <div className="text-primary">{feature.icon}</div>
                  </div>
                  <CardTitle className="text-lg">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-center text-base">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-16 bg-gradient-to-br from-secondary/5 to-primary/5">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="text-center mb-12">
            <h3 className="text-2xl md:text-3xl font-bold mb-4">Comment ça fonctionne ?</h3>
            <p className="text-lg text-muted-foreground">
              Un processus 100% automatisé en 3 étapes
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {steps.map((step, index) => (
              <div key={index} className="text-center">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-border mb-4">
                  <div className="bg-primary/10 p-4 rounded-full w-fit mx-auto mb-4">
                    <div className="text-primary">{step.icon}</div>
                  </div>
                  <div className="bg-primary text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold mx-auto mb-4">
                    {index + 1}
                  </div>
                  <h4 className="text-xl font-bold mb-3">{step.title}</h4>
                  <p className="text-muted-foreground">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="text-center mb-12">
            <h3 className="text-2xl md:text-3xl font-bold mb-4">Ce que vous obtenez</h3>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Un rapport détaillé avec des recommandations concrètes et prioritaires
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {benefits.map((benefit, index) => (
              <div key={index} className="flex gap-4 p-6 bg-gradient-to-r from-secondary/5 to-primary/5 rounded-xl border border-border">
                <div className="bg-primary/10 p-3 rounded-full flex-shrink-0">
                  <div className="text-primary">{benefit.icon}</div>
                </div>
                <div>
                  <h4 className="text-lg font-semibold mb-2">{benefit.title}</h4>
                  <p className="text-muted-foreground">{benefit.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-gradient-to-br from-primary/10 via-background to-secondary/10">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="text-center">
            <h3 className="text-2xl md:text-3xl font-bold mb-6">
              Découvrez votre potentiel de visibilité
            </h3>
            <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
              Obtenez dès maintenant votre audit gratuit et personnalisé pour améliorer votre présence en ligne
            </p>

            <div className="flex flex-col items-center gap-4">
              <Button size="lg" className="px-12 py-6 text-lg">
                Lancer mon audit gratuit
              </Button>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="w-4 h-4" />
                <span>Rapport généré en moins de 5 minutes</span>
              </div>
            </div>

            <div className="mt-12 grid md:grid-cols-3 gap-6 text-center">
              <div className="bg-white/50 backdrop-blur-sm rounded-xl p-6 border border-border">
                <Bot className="w-8 h-8 text-primary mx-auto mb-3" />
                <div className="text-2xl font-bold text-primary">100%</div>
                <div className="text-sm text-muted-foreground">Automatisé par IA</div>
              </div>
              <div className="bg-white/50 backdrop-blur-sm rounded-xl p-6 border border-border">
                <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-3" />
                <div className="text-2xl font-bold text-green-600">Gratuit</div>
                <div className="text-sm text-muted-foreground">Sans engagement</div>
              </div>
              <div className="bg-white/50 backdrop-blur-sm rounded-xl p-6 border border-border">
                <Zap className="w-8 h-8 text-yellow-600 mx-auto mb-3" />
                <div className="text-2xl font-bold text-yellow-600">Rapide</div>
                <div className="text-sm text-muted-foreground">Résultats immédiats</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t bg-muted/30">
        <div className="container mx-auto px-4">
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
  );
};

export default AuditVisibiliteIA;