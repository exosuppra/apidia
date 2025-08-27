import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Seo from "@/components/Seo";
import tourismOfficeImage from "@/assets/tourism-office-clean.jpg";
import { 
  QrCode, 
  Users, 
  Mail, 
  Database, 
  BarChart3, 
  Smartphone,
  Target,
  Zap,
  Clock,
  CheckCircle,
  ArrowRight,
  Shield,
  Lightbulb,
  TrendingUp,
  MessageCircle,
  Globe,
  BookOpen,
  Star,
  Calendar,
  UserPlus,
  FileText,
  Settings,
  Sparkles
} from "lucide-react";

const crmFeatures = [
  {
    category: "Collecte de données",
    color: "bg-primary/10 text-primary",
    services: [
      {
        icon: <QrCode className="w-8 h-8" />,
        title: "QR Code personnalisé",
        description: "Génération de QR codes uniques pour chaque établissement permettant aux clients de s'enregistrer facilement",
        cta: "Générer mon QR Code",
        price: "Inclus"
      },
      {
        icon: <UserPlus className="w-8 h-8" />,
        title: "Formulaire intelligent",
        description: "Interface mobile optimisée pour collecter les informations clients essentielles en quelques secondes",
        cta: "Voir le formulaire",
        price: "Inclus"
      },
    ]
  },
  {
    category: "Gestion clients",
    color: "bg-secondary/10 text-secondary-foreground",
    services: [
      {
        icon: <FileText className="w-8 h-8" />,
        title: "Export des données",
        description: "Exportation en CSV, Excel ou connexion API vers vos outils marketing existants",
        cta: "Configurer l'export",
        price: "19€/mois"
      }
    ]
  },
  {
    category: "Marketing automation - Option Premium",
    color: "bg-gradient-to-r from-amber-500/10 to-orange-500/10 text-amber-700 dark:text-amber-300 border border-amber-200/20",
    services: [
      {
        icon: <Mail className="w-8 h-8" />,
        title: "Campagnes email automatisées",
        description: "Création automatique d'emails personnalisés basés sur le profil et comportement client",
        cta: "Créer une campagne",
        price: "79€/mois"
      },
      {
        icon: <Calendar className="w-8 h-8" />,
        title: "Automation avancée",
        description: "Séquences automatisées : emails de bienvenue, relances, offres personnalisées",
        cta: "Configurer l'automation",
        price: "59€/mois"
      }
    ]
  }
];

const integrations = [
  { name: "Booking.com", logo: "🏨" },
  { name: "Airbnb", logo: "🏠" },
  { name: "Expedia", logo: "✈️" },
  { name: "TripAdvisor", logo: "⭐" },
  { name: "Google My Business", logo: "📍" },
  { name: "Facebook", logo: "📘" }
];

const steps = [
  {
    step: "1",
    title: "Installation du QR Code",
    description: "Affichez votre QR Code personnalisé dans votre établissement (réception, chambres, restaurant)",
    icon: <QrCode className="w-6 h-6" />
  },
  {
    step: "2",
    title: "Scan par le client",
    description: "Vos clients scannent le code et remplissent leurs informations en 30 secondes",
    icon: <Smartphone className="w-6 h-6" />
  },
  {
    step: "3",
    title: "Enrichissement automatique",
    description: "Le système enrichit automatiquement les profils avec des données comportementales",
    icon: <Zap className="w-6 h-6" />
  },
  {
    step: "4",
    title: "Campagnes personnalisées",
    description: "Lancez des campagnes marketing ultra-ciblées basées sur les données collectées",
    icon: <Target className="w-6 h-6" />
  }
];

const benefits = [
  {
    icon: <TrendingUp className="w-6 h-6" />,
    title: "Récupérez VOS données clients",
    description: "Fini la dépendance aux plateformes tierces qui gardent vos données clients"
  },
  {
    icon: <Mail className="w-6 h-6" />,
    title: "Marketing direct efficace",
    description: "Contactez directement vos clients pour des offres personnalisées"
  },
  {
    icon: <Shield className="w-6 h-6" />,
    title: "Conformité RGPD garantie",
    description: "Collecte et stockage des données en parfaite conformité avec la réglementation. Case à cocher obligatoire pour le consentement des clients."
  },
  {
    icon: <Clock className="w-6 h-6" />,
    title: "Gain de temps considérable",
    description: "Automatisation complète des processus de collecte et segmentation"
  }
];

export default function CrmSimplifie() {
  return (
    <div className="min-h-screen bg-background">
      <Seo 
        title="CRM Simplifié - Récupérez vos données clients | ApidIA"
        description="Solution CRM avec QR Code pour les professionnels du tourisme. Collectez les données de vos clients directement, même avec Booking.com et autres plateformes."
        keywords="CRM tourisme, QR code hôtel, données clients, marketing automation, RGPD, booking.com alternative"
        ogImage="/tourism-professional-workspace.jpg"
        structuredData={{
          "@context": "https://schema.org",
          "@type": "SoftwareApplication",
          "name": "ApidIA CRM Simplifié",
          "description": "Solution CRM avec QR Code pour récupérer les données clients des professionnels du tourisme",
          "applicationCategory": "BusinessApplication",
          "offers": {
            "@type": "AggregateOffer",
            "lowPrice": "29",
            "highPrice": "79",
            "priceCurrency": "EUR"
          }
        }}
      />
      
      {/* Hero Section */}
      <section className="relative py-12 lg:py-20">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            <div className="space-y-6">
              <div className="space-y-2">
                <Badge variant="secondary" className="text-xs px-2 py-1">
                  <Sparkles className="w-3 h-3 mr-1" />
                  Solution CRM
                </Badge>
                <h1 className="text-3xl lg:text-4xl font-bold tracking-tight">
                  Récupérez enfin <span className="bg-gradient-to-br from-primary/20 via-primary/10 to-secondary/20 backdrop-blur-sm px-3 py-1 rounded-lg">VOS données clients</span>
                </h1>
                <p className="text-base text-muted-foreground leading-relaxed">
                  Grâce à notre système de QR Code innovant, collectez directement les informations de vos clients sur site, 
                  même si vous passez par Booking.com ou d'autres plateformes tierces.
                </p>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-3">
                <Button size="lg" className="text-sm">
                  <QrCode className="w-4 h-4 mr-2" />
                  Générer mon QR Code
                </Button>
                <Button variant="outline" size="lg">
                  <BookOpen className="w-4 h-4 mr-2" />
                  Voir la démo
                </Button>
              </div>
              
              <div className="bg-card/50 backdrop-blur-sm border rounded-lg p-4">
                <div className="text-center">
                  <div className="text-xs text-muted-foreground mb-1">À partir de</div>
                  <div className="text-2xl font-bold text-primary">19€<span className="text-sm font-normal text-muted-foreground">/mois</span></div>
                  <div className="text-xs text-muted-foreground">QR Code + Base de données inclus</div>
                </div>
              </div>
              
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <CheckCircle className="w-3 h-3 text-green-600" />
                  <span>RGPD Compliant</span>
                </div>
                <div className="flex items-center gap-1">
                  <CheckCircle className="w-3 h-3 text-green-600" />
                  <span>Installation en 5 min</span>
                </div>
                <div className="flex items-center gap-1">
                  <CheckCircle className="w-3 h-3 text-green-600" />
                  <span>Support inclus</span>
                </div>
              </div>
            </div>
            
            <div className="relative">
              <img 
                src={tourismOfficeImage} 
                alt="Bureau professionnel de tourisme avec interface CRM ApidIA" 
                className="rounded-lg shadow-lg w-full object-cover aspect-[4/3]"
              />
              <div className="absolute -bottom-4 -left-4 bg-card border rounded-lg p-3 shadow-lg">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  </div>
                  <div className="text-xs">
                    <div className="font-medium">RGPD Compliant</div>
                    <div className="text-muted-foreground">Données sécurisées</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Comment ça marche */}
      <section className="py-12 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-2xl lg:text-3xl font-bold mb-3">Comment ça marche ?</h2>
            <p className="text-sm text-muted-foreground max-w-2xl mx-auto">
              Un processus simple en 4 étapes pour transformer vos visiteurs en base de données marketing
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {steps.map((step, index) => (
              <div key={index} className="relative">
                <Card className="h-full text-center">
                  <CardHeader className="pb-3">
                    <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                      {step.icon}
                    </div>
                    <div className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-bold mx-auto mb-2">
                      {step.step}
                    </div>
                    <CardTitle className="text-base">{step.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-muted-foreground">{step.description}</p>
                  </CardContent>
                </Card>
                {index < steps.length - 1 && (
                  <ArrowRight className="hidden lg:block absolute top-1/2 -right-3 w-4 h-4 text-muted-foreground transform -translate-y-1/2" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Services */}
      <section className="py-12">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-2xl lg:text-3xl font-bold mb-3">Fonctionnalités CRM</h2>
            <p className="text-sm text-muted-foreground max-w-2xl mx-auto">
              De la collecte de données à l'automation marketing, une solution complète pour récupérer et exploiter vos données clients
            </p>
          </div>
          
          <div className="space-y-12">
            {crmFeatures.map((category, categoryIndex) => (
              <div key={categoryIndex} className="space-y-6">
                <div className="text-center">
                  <Badge className={`${category.color} text-xs px-3 py-1`}>
                    {category.category}
                  </Badge>
                </div>
                
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {category.services.map((service, index) => (
                    <Card key={index} className="group hover:shadow-lg transition-all duration-300 border-0 bg-card/50 backdrop-blur-sm">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between mb-3">
                          <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center text-primary">
                            {service.icon}
                          </div>
                          <Badge variant="secondary" className="text-xs">{service.price}</Badge>
                        </div>
                        <CardTitle className="text-base group-hover:text-primary transition-colors">
                          {service.title}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <CardDescription className="text-xs leading-relaxed">
                          {service.description}
                        </CardDescription>
                        <Button variant="outline" size="sm" className="w-full text-xs">
                          {service.cta}
                          <ArrowRight className="w-3 h-3 ml-2" />
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Intégrations */}
      <section className="py-12 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-8">
            <h2 className="text-xl lg:text-2xl font-bold mb-3">Compatible avec vos plateformes actuelles</h2>
            <p className="text-sm text-muted-foreground max-w-2xl mx-auto">
              Même si vous utilisez Booking.com, Airbnb ou d'autres plateformes, récupérez VOS données clients directement
            </p>
          </div>
          
          <div className="grid grid-cols-3 lg:grid-cols-6 gap-4">
            {integrations.map((integration, index) => (
              <Card key={index} className="p-4 text-center hover:shadow-md transition-shadow">
                <div className="text-2xl mb-2">{integration.logo}</div>
                <div className="text-xs font-medium">{integration.name}</div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Avantages */}
      <section className="py-12">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-2xl lg:text-3xl font-bold mb-3">Pourquoi choisir notre CRM ?</h2>
            <p className="text-sm text-muted-foreground max-w-2xl mx-auto">
              Les avantages concrets pour votre activité touristique
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {benefits.map((benefit, index) => (
              <Card key={index} className="text-center p-6">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4 text-primary">
                  {benefit.icon}
                </div>
                <h3 className="text-sm font-semibold mb-2">{benefit.title}</h3>
                <p className="text-xs text-muted-foreground">{benefit.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section className="py-12 bg-gradient-to-br from-primary/20 via-primary/10 to-secondary/20">
        <div className="container mx-auto px-4 text-center">
          <div className="max-w-2xl mx-auto space-y-6">
            <h2 className="text-2xl lg:text-3xl font-bold">
              Prêt à récupérer vos données clients ?
            </h2>
            <p className="text-sm text-muted-foreground">
              Commencez gratuitement avec la génération de votre QR Code personnalisé. 
              Aucun engagement, installation en 5 minutes.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button size="lg">
                <QrCode className="w-4 h-4 mr-2" />
                Générer mon QR Code gratuitement
              </Button>
              <Button variant="outline" size="lg">
                <MessageCircle className="w-4 h-4 mr-2" />
                Parler à un expert
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              🔒 Données sécurisées • ✅ RGPD compliant • 🚀 Support inclus
            </p>
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
}