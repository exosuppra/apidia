import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Seo from "@/components/Seo";
import tourismOfficeImage from "@/assets/tourism-office-clean.jpg";
import { 
  Eye, 
  Star, 
  GraduationCap, 
  MessageCircle, 
  Users, 
  Globe, 
  TrendingUp, 
  Camera,
  Mail,
  BarChart3,
  Smartphone,
  MapPin,
  Bot,
  Zap,
  Clock,
  Sparkles,
  ArrowRight,
  Target,
  Shield,
  Lightbulb,
  Rocket,
  CheckCircle
} from "lucide-react";

const services = [
  {
    category: "Visibilité en ligne",
    color: "bg-blue-500/10 text-blue-600",
    services: [
      {
        icon: <Globe className="w-8 h-8" />,
        title: "Audit visibilité IA",
        description: "L'IA analyse votre présence digitale, détermine vos points faibles et propose des conseils adaptés",
        cta: "Lancer l'audit IA"
      },
      {
        icon: <TrendingUp className="w-8 h-8" />,
        title: "Bilan de site web",
        description: "Analyse complète : qualité SEO, textes, temps de chargement des pages, différences avec la concurrence",
        cta: "Obtenir mon bilan"
      },
      {
        icon: <Smartphone className="w-8 h-8" />,
        title: "Génération de site internet",
        description: "Création de site web avec module de disponibilité intégré pour vos réservations",
        cta: "Créer mon site"
      }
    ]
  },
  {
    category: "Réputation",
    color: "bg-yellow-500/10 text-yellow-600",
    services: [
      {
        icon: <Star className="w-8 h-8" />,
        title: "Gestion complète des avis",
        description: "Audit des avis, analyse des verbatims, calcul du NPS et réponses automatiques personnalisées",
        cta: "Activer la gestion avis IA"
      },
      {
        icon: <BarChart3 className="w-8 h-8" />,
        title: "Veille des avis Google",
        description: "Surveillance automatique de vos avis Google avec alertes et actions correctives suggérées",
        cta: "Activer la veille"
      }
    ]
  },
  {
    category: "E-learning",
    color: "bg-green-500/10 text-green-600",
    services: [
      {
        icon: <GraduationCap className="w-8 h-8" />,
        title: "Formation marketing digital",
        description: "Modules interactifs pour apprendre à booster sa visibilité en ligne et maîtriser les outils digitaux du tourisme",
        cta: "Commencer la formation"
      }
    ]
  },
  {
    category: "Communication",
    color: "bg-purple-500/10 text-purple-600",
    services: [
      {
        icon: <Camera className="w-8 h-8" />,
        title: "Création automatisée de contenus visuels",
        description: "Génération d'affiches d'événements, visuels pour sites web et contenus marketing personnalisés",
        cta: "Créer mes contenus visuels"
      },
      {
        icon: <MessageCircle className="w-8 h-8" />,
        title: "Stratégie réseaux sociaux",
        description: "Plan de contenus adapté à votre audience touristique",
        cta: "Définir ma stratégie"
      }
    ]
  },
  {
    category: "Relation client",
    color: "bg-red-500/10 text-red-600",
    services: [
      {
        icon: <Users className="w-8 h-8" />,
        title: "CRM simplifié",
        description: "Gestion de votre fichier clients avec outils de fidélisation",
        cta: "Organiser mes clients"
      },
      {
        icon: <Mail className="w-8 h-8" />,
        title: "Campagnes emailing",
        description: "Newsletters et campagnes automatisées pour vos clients",
        cta: "Lancer mes campagnes"
      }
    ]
  },
  {
    category: "Données touristiques",
    color: "bg-indigo-500/10 text-indigo-600",
    services: [
      {
        icon: <MapPin className="w-8 h-8" />,
        title: "Fiches APIDAE intelligentes",
        description: "Mise à jour automatique de vos fiches Apidae grâce à la recherche d'informations par l'IA",
        cta: "Activer la mise à jour IA"
      }
    ]
  }
];

const Catalogue = () => {
  return (
    <div className="min-h-screen bg-background">
      <Seo 
        title="Catalogue de Services ApidIA | Outils pour Professionnels du Tourisme" 
        description="Découvrez nos services dédiés aux professionnels du tourisme : audit digital, gestion d'avis, formation, création de sites web et bien plus."
        canonical={`${window.location.origin}/catalogue`}
      />
      
      {/* Header */}
      <header className="border-b bg-white/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img 
              src="/lovable-uploads/d4594427-d5ec-4616-9298-7912d6c72b56.png" 
              alt="ApidIA Logo" 
              className="w-10 h-10 object-contain"
            />
            <h1 className="text-xl font-bold text-primary">ApidIA</h1>
          </div>
          <Button asChild>
            <Link to="/auth/login">Se connecter</Link>
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-16 bg-gradient-to-br from-primary/5 via-background to-secondary/5">
        <div className="container mx-auto px-4 text-center max-w-4xl">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Bot className="w-10 h-10 text-primary" />
            <Sparkles className="w-6 h-6 text-yellow-500" />
          </div>
          <h2 className="text-4xl md:text-5xl font-bold mb-6 text-foreground">
            Catalogue de Services <span className="text-primary">IA</span>
          </h2>
          <p className="text-xl text-muted-foreground mb-8">
            Vous êtes une entreprise locale du tourisme ou un partenaire de l'Office de Tourisme et vous souhaitez une aide pour développer votre business
          </p>
          
          <div className="flex justify-center mb-8">
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium">
              <Sparkles className="w-4 h-4" />
              Intelligence Artificielle
            </div>
          </div>
          
          {/* Hero Layout - Modern Tourism Focused */}
          <div className="grid lg:grid-cols-2 gap-12 items-center mb-12">
            {/* Left: Content */}
            <div className="space-y-8">
              <div className="space-y-4 text-center">
                <h3 className="text-2xl font-bold leading-tight">
                  ApidIA gère de façon <span className="text-primary">quasi-autonome</span> la promotion de votre établissement
                </h3>
                <p className="text-xl text-muted-foreground leading-relaxed">
                  Une fois configuré, notre IA travaille <strong>en continu</strong> pour optimiser votre visibilité sans intervention de votre part.
                </p>
              </div>

              <div className="space-y-4">
                <ul className="space-y-3 text-left">
                  <li className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                    <div>
                      <h4 className="font-semibold mb-1">Économisez 15h/semaine</h4>
                      <p className="text-sm text-muted-foreground">Plus de gestion manuelle des réseaux sociaux, avis clients ou référencement</p>
                    </div>
                  </li>

                  <li className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                    <div>
                      <h4 className="font-semibold mb-1">+40% de visibilité</h4>
                      <p className="text-sm text-muted-foreground">Optimisation SEO continue et présence renforcée sur tous les canaux</p>
                    </div>
                  </li>

                  <li className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                    <div>
                      <h4 className="font-semibold mb-1">IA spécialisée tourisme</h4>
                      <p className="text-sm text-muted-foreground">Contenus, stratégies et actions adaptés aux codes du secteur touristique</p>
                    </div>
                  </li>
                </ul>
              </div>
            </div>

            {/* Right: Image */}
            <div className="relative">
              <div className="relative rounded-3xl overflow-hidden shadow-2xl">
                <img 
                  src={tourismOfficeImage} 
                  alt="Bureau moderne d'office de tourisme avec outils digitaux et écrans d'analytics"
                  className="w-full h-[400px] object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
                <div className="absolute bottom-6 left-6 text-white">
                   <div className="flex items-center gap-2 mb-2">
                     <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                     <span className="text-sm font-medium">IA Active en continu</span>
                   </div>
                   <p className="text-sm opacity-90">Marketing intelligent en cours...</p>
                </div>
              </div>
            </div>
          </div>

          {/* Mission Section - Restored */}
          <div className="bg-white/60 backdrop-blur-sm rounded-3xl p-8 border border-border shadow-sm mb-8">
            <div className="flex items-start gap-6">
              <div className="bg-primary/10 p-4 rounded-2xl flex-shrink-0">
                <TrendingUp className="w-12 h-12 text-primary" />
              </div>
              <div>
                <h3 className="text-2xl font-bold mb-4 text-foreground">Notre Mission</h3>
                <p className="text-lg text-foreground leading-relaxed max-w-3xl">
                  <strong>Déléguer à l'IA la mission de promotion des établissements sur le web</strong> pour permettre aux 
                  Acteurs Touristiques Locaux de <strong>réinvestir ce temps dans d'autres tâches</strong> plus stratégiques 
                  pour leur activité.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof Section */}
      <section className="py-12 bg-gradient-to-r from-secondary/5 to-primary/5">
        <div className="container mx-auto px-4">
          <div className="bg-gradient-to-r from-secondary/5 to-primary/5 rounded-3xl p-8 border border-border/50">
            <div className="text-center mb-8">
              <h3 className="text-2xl font-bold mb-4">Rejoignez les professionnels du tourisme qui nous font confiance</h3>
              <div className="flex justify-center items-center gap-8 opacity-60">
                <span className="text-sm font-medium">Hôtels • Restaurants • Commerces • Campings • Hébergements locatifs • Évènementiel • Prestataires d'activités • Producteurs</span>
              </div>
            </div>
            
            <div className="flex justify-center mb-8">
              <div className="bg-white/70 backdrop-blur-sm rounded-xl p-6 text-center">
                <div className="text-3xl font-bold text-primary mb-2">2800+</div>
                <div className="text-sm text-muted-foreground">Établissements accompagnés</div>
              </div>
            </div>

            {/* Typologies Carousel */}
            <div className="relative overflow-hidden">
              <div className="flex animate-scroll-infinite hover:animate-scroll-slow">
                {/* First set */}
                <div className="flex gap-4 min-w-fit">
                  <div className="bg-white/50 backdrop-blur-sm rounded-lg p-4 text-center min-w-[120px]">
                    <div className="w-16 h-16 bg-blue-100 rounded-lg mx-auto mb-3 flex items-center justify-center">
                      <span className="text-2xl">🏨</span>
                    </div>
                    <span className="text-sm font-medium">Hôtels</span>
                  </div>
                  <div className="bg-white/50 backdrop-blur-sm rounded-lg p-4 text-center min-w-[120px]">
                    <div className="w-16 h-16 bg-red-100 rounded-lg mx-auto mb-3 flex items-center justify-center">
                      <span className="text-2xl">🍽️</span>
                    </div>
                    <span className="text-sm font-medium">Restaurants</span>
                  </div>
                  <div className="bg-white/50 backdrop-blur-sm rounded-lg p-4 text-center min-w-[120px]">
                    <div className="w-16 h-16 bg-purple-100 rounded-lg mx-auto mb-3 flex items-center justify-center">
                      <span className="text-2xl">🛍️</span>
                    </div>
                    <span className="text-sm font-medium">Commerces</span>
                  </div>
                  <div className="bg-white/50 backdrop-blur-sm rounded-lg p-4 text-center min-w-[120px]">
                    <div className="w-16 h-16 bg-green-100 rounded-lg mx-auto mb-3 flex items-center justify-center">
                      <span className="text-2xl">🏕️</span>
                    </div>
                    <span className="text-sm font-medium">Campings</span>
                  </div>
                  <div className="bg-white/50 backdrop-blur-sm rounded-lg p-4 text-center min-w-[120px]">
                    <div className="w-16 h-16 bg-yellow-100 rounded-lg mx-auto mb-3 flex items-center justify-center">
                      <span className="text-2xl">🏠</span>
                    </div>
                    <span className="text-sm font-medium">Hébergements locatifs</span>
                  </div>
                  <div className="bg-white/50 backdrop-blur-sm rounded-lg p-4 text-center min-w-[120px]">
                    <div className="w-16 h-16 bg-pink-100 rounded-lg mx-auto mb-3 flex items-center justify-center">
                      <span className="text-2xl">🎉</span>
                    </div>
                    <span className="text-sm font-medium">Évènementiel</span>
                  </div>
                  <div className="bg-white/50 backdrop-blur-sm rounded-lg p-4 text-center min-w-[120px]">
                    <div className="w-16 h-16 bg-indigo-100 rounded-lg mx-auto mb-3 flex items-center justify-center">
                      <span className="text-2xl">🎯</span>
                    </div>
                    <span className="text-sm font-medium">Prestataires d'activités</span>
                  </div>
                  <div className="bg-white/50 backdrop-blur-sm rounded-lg p-4 text-center min-w-[120px]">
                    <div className="w-16 h-16 bg-orange-100 rounded-lg mx-auto mb-3 flex items-center justify-center">
                      <span className="text-2xl">🌾</span>
                    </div>
                    <span className="text-sm font-medium">Producteurs</span>
                  </div>
                </div>
                
                {/* Duplicate set for infinite scroll */}
                <div className="flex gap-4 min-w-fit ml-4">
                  <div className="bg-white/50 backdrop-blur-sm rounded-lg p-4 text-center min-w-[120px]">
                    <div className="w-16 h-16 bg-blue-100 rounded-lg mx-auto mb-3 flex items-center justify-center">
                      <span className="text-2xl">🏨</span>
                    </div>
                    <span className="text-sm font-medium">Hôtels</span>
                  </div>
                  <div className="bg-white/50 backdrop-blur-sm rounded-lg p-4 text-center min-w-[120px]">
                    <div className="w-16 h-16 bg-red-100 rounded-lg mx-auto mb-3 flex items-center justify-center">
                      <span className="text-2xl">🍽️</span>
                    </div>
                    <span className="text-sm font-medium">Restaurants</span>
                  </div>
                  <div className="bg-white/50 backdrop-blur-sm rounded-lg p-4 text-center min-w-[120px]">
                    <div className="w-16 h-16 bg-purple-100 rounded-lg mx-auto mb-3 flex items-center justify-center">
                      <span className="text-2xl">🛍️</span>
                    </div>
                    <span className="text-sm font-medium">Commerces</span>
                  </div>
                  <div className="bg-white/50 backdrop-blur-sm rounded-lg p-4 text-center min-w-[120px]">
                    <div className="w-16 h-16 bg-green-100 rounded-lg mx-auto mb-3 flex items-center justify-center">
                      <span className="text-2xl">🏕️</span>
                    </div>
                    <span className="text-sm font-medium">Campings</span>
                  </div>
                  <div className="bg-white/50 backdrop-blur-sm rounded-lg p-4 text-center min-w-[120px]">
                    <div className="w-16 h-16 bg-yellow-100 rounded-lg mx-auto mb-3 flex items-center justify-center">
                      <span className="text-2xl">🏠</span>
                    </div>
                    <span className="text-sm font-medium">Hébergements locatifs</span>
                  </div>
                  <div className="bg-white/50 backdrop-blur-sm rounded-lg p-4 text-center min-w-[120px]">
                    <div className="w-16 h-16 bg-pink-100 rounded-lg mx-auto mb-3 flex items-center justify-center">
                      <span className="text-2xl">🎉</span>
                    </div>
                    <span className="text-sm font-medium">Évènementiel</span>
                  </div>
                  <div className="bg-white/50 backdrop-blur-sm rounded-lg p-4 text-center min-w-[120px]">
                    <div className="w-16 h-16 bg-indigo-100 rounded-lg mx-auto mb-3 flex items-center justify-center">
                      <span className="text-2xl">🎯</span>
                    </div>
                    <span className="text-sm font-medium">Prestataires d'activités</span>
                  </div>
                  <div className="bg-white/50 backdrop-blur-sm rounded-lg p-4 text-center min-w-[120px]">
                    <div className="w-16 h-16 bg-orange-100 rounded-lg mx-auto mb-3 flex items-center justify-center">
                      <span className="text-2xl">🌾</span>
                    </div>
                    <span className="text-sm font-medium">Producteurs</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      <section className="py-16 bg-gradient-to-r from-primary/5 to-secondary/5">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4 flex items-center justify-center gap-3">
              <Shield className="w-8 h-8 text-primary" />
              Comment ApidIA révolutionne votre marketing ?
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Découvrez les fonctionnalités clés qui font d'ApidIA votre partenaire marketing intelligent
            </p>
          </div>
          
          <div className="grid lg:grid-cols-2 gap-12 items-start">
            {/* Left: Detailed Features */}
            <div className="space-y-6">
              <div className="flex items-start gap-4 p-6 bg-white/60 rounded-xl border shadow-sm">
                <div className="bg-green-100 p-3 rounded-lg flex-shrink-0">
                  <Sparkles className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Génération intelligente de contenus</h3>
                  <p className="text-sm text-muted-foreground">L'IA crée vos descriptions, posts réseaux sociaux, newsletters, affiches d'événements, et met à jour automatiquement vos fiches Apidae.</p>
                </div>
              </div>
              
              <div className="flex items-start gap-4 p-6 bg-white/60 rounded-xl border shadow-sm">
                <div className="bg-blue-100 p-3 rounded-lg flex-shrink-0">
                  <BarChart3 className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Analyse complète & Optimisation SEO</h3>
                  <p className="text-sm text-muted-foreground">Bilan complet de votre visibilité en ligne, performance réseaux sociaux et optimisation continue du référencement.</p>
                </div>
              </div>
              
              <div className="flex items-start gap-4 p-6 bg-white/60 rounded-xl border shadow-sm">
                <div className="bg-yellow-100 p-3 rounded-lg flex-shrink-0">
                  <Star className="w-6 h-6 text-yellow-600" />
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Gestion proactive des avis</h3>
                  <p className="text-sm text-muted-foreground">Audit des avis clients, analyse des verbatims, calcul du NPS et réponses automatiques personnalisées.</p>
                </div>
              </div>
              
              <div className="flex items-start gap-4 p-6 bg-white/60 rounded-xl border shadow-sm">
                <div className="bg-purple-100 p-3 rounded-lg flex-shrink-0">
                  <Users className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-semibold mb-2">CRM automatisé & Campagnes ciblées</h3>
                  <p className="text-sm text-muted-foreground">Gestion intelligente de votre fichier client avec campagnes de mailings personnalisées selon les profils.</p>
                </div>
              </div>
            </div>
            
            {/* Right: Key Benefits */}
            <div className="space-y-6">
              <div className="bg-gradient-to-br from-primary/20 to-secondary/20 rounded-2xl p-8 border border-primary/30">
                <div className="text-center space-y-6">
                  <div className="flex items-center justify-center gap-3">
                    <CheckCircle className="w-12 h-12 text-primary" />
                    <h3 className="text-2xl font-bold">Avantages Clés</h3>
                  </div>
                  
                  <div className="space-y-4 text-left">
                    <div className="flex items-center gap-3 p-3 bg-white/50 rounded-lg">
                      <Clock className="w-5 h-5 text-primary flex-shrink-0" />
                      <span className="text-sm font-medium">99% Automatisé - L'IA gère tout</span>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-white/50 rounded-lg">
                      <Zap className="w-5 h-5 text-primary flex-shrink-0" />
                      <span className="text-sm font-medium">Réactif en continu sans interruption</span>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-white/50 rounded-lg">
                      <TrendingUp className="w-5 h-5 text-primary flex-shrink-0" />
                      <span className="text-sm font-medium">Résultats mesurables dès J+7</span>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-white/50 rounded-lg">
                      <Target className="w-5 h-5 text-primary flex-shrink-0" />
                      <span className="text-sm font-medium">Spécialisé secteur touristique</span>
                    </div>
                  </div>
                  
                  <div className="pt-4">
                    <div className="bg-primary/10 rounded-lg p-4">
                      <p className="text-sm font-medium text-primary">
                        💡 Configuration en 5 minutes, puis fonctionne de manière quasi-autonome
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Services Catalog */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Nos Services</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Découvrez notre gamme complète de services conçus spécialement pour les professionnels du tourisme
            </p>
          </div>

          {services.map((category, categoryIndex) => (
            <div key={categoryIndex} className="mb-12">
              <div className="flex items-center gap-3 mb-6">
                <Badge className={category.color} variant="secondary">
                  {category.category}
                </Badge>
              </div>
              
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {category.services.map((service, serviceIndex) => (
                  <Card key={serviceIndex} className="group hover:shadow-lg transition-all duration-300 border-l-4 border-l-primary/20 hover:border-l-primary">
                    <CardHeader>
                      <div className="flex items-start gap-4">
                        <div className="p-3 rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                          {service.icon}
                        </div>
                        <div>
                          <CardTitle className="text-lg">{service.title}</CardTitle>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <CardDescription className="text-base">
                        {service.description}
                      </CardDescription>
                      <Button className="w-full" variant="outline">
                        {service.cta}
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-gradient-to-r from-primary to-secondary text-primary-foreground relative overflow-hidden">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="container mx-auto px-4 text-center relative z-10">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Bot className="w-12 h-12" />
            <ArrowRight className="w-6 h-6" />
            <Sparkles className="w-8 h-8" />
          </div>
          <h2 className="text-3xl font-bold mb-4">Prêt à laisser l'IA gérer votre marketing ?</h2>
          <p className="text-lg mb-6 opacity-90 max-w-3xl mx-auto">
            Commencez par un diagnostic IA gratuit. En 5 minutes, notre intelligence artificielle analyse votre présence digitale et sera force de propositions pour améliorer votre business en ligne.
          </p>
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 mb-8 max-w-2xl mx-auto">
            <p className="text-sm font-medium mb-2">⚡ Configuration en 5 minutes • ⏰ 15h/semaine économisées • 🤖 Gestion quasi-autonome</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" variant="secondary" className="bg-white text-primary hover:bg-white/90" asChild>
              <Link to="/auth/login">🚀 Activer mon IA marketing</Link>
            </Button>
            <Button size="lg" variant="outline" className="border-white text-white hover:bg-white hover:text-primary">
              Se connecter
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t bg-muted/30">
        <div className="container mx-auto px-4 text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <img 
              src="/lovable-uploads/d4594427-d5ec-4616-9298-7912d6c72b56.png" 
              alt="ApidIA Logo" 
              className="w-8 h-8 object-contain"
            />
            <span className="font-semibold">ApidIA</span>
          </div>
          <p className="text-sm text-muted-foreground mb-2">
            Votre partenaire pour le développement digital de votre activité touristique
          </p>
          <p className="text-xs text-muted-foreground/70">
            En partenariat avec l'Office de Tourisme et des Congrès du Pays de Manosque
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Catalogue;