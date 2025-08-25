import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Seo from "@/components/Seo";
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
  ArrowRight
} from "lucide-react";

const services = [
  {
    category: "Visibilité en ligne",
    color: "bg-blue-500/10 text-blue-600",
    services: [
      {
        icon: <Globe className="w-8 h-8" />,
        title: "Audit visibilité IA",
        description: "L'IA analyse votre présence digitale et optimise automatiquement vos points faibles",
        cta: "Lancer l'audit IA"
      },
      {
        icon: <TrendingUp className="w-8 h-8" />,
        title: "SEO Automatisé",
        description: "L'IA optimise votre référencement 24h/24 sans intervention manuelle",
        cta: "Activer le SEO IA"
      },
      {
        icon: <Smartphone className="w-8 h-8" />,
        title: "Site Web Auto-Géré",
        description: "Site web qui se met à jour automatiquement avec l'IA (contenus, prix, disponibilités)",
        cta: "Créer mon site IA"
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
        title: "Veille réputation IA",
        description: "Surveillance continue et alertes automatiques avec actions correctives suggérées",
        cta: "Lancer la veille IA"
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
        description: "Modules courts pour maîtriser les outils digitaux du tourisme",
        cta: "Commencer la formation"
      },
      {
        icon: <Eye className="w-8 h-8" />,
        title: "Webinaires spécialisés",
        description: "Sessions live avec des experts du tourisme digital",
        cta: "Voir les webinaires"
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
          <p className="text-xl text-muted-foreground mb-4">
            Vous êtes une entreprise locale du tourisme ou un partenaire de l'Office de Tourisme et vous souhaitez une aide pour développer votre business
          </p>
          <div className="bg-gradient-to-r from-primary/10 to-secondary/10 rounded-lg p-6 mb-4 border border-primary/20">
            <h3 className="text-2xl font-bold mb-3 text-primary">🤖 Propulsé par l'Intelligence Artificielle</h3>
            <p className="text-lg text-muted-foreground">
              ApidIA gère de façon <strong>quasi-autonome</strong> la promotion de votre établissement sur le web. 
              Une fois configuré, notre IA travaille 24h/24 pour optimiser votre visibilité sans intervention de votre part.
            </p>
          </div>
          <div className="bg-gradient-to-r from-secondary/10 to-primary/5 rounded-lg p-6 mb-8 border border-secondary/20">
            <h3 className="text-xl font-bold mb-3 text-secondary">🎯 Notre Objectif</h3>
            <p className="text-lg text-muted-foreground">
              <strong>Déléguer à l'IA la mission de promotion des établissements sur le web</strong> pour permettre aux 
              Acteurs Touristiques Locaux de <strong>réinvestir ce temps dans d'autres tâches</strong> plus stratégiques 
              pour leur activité.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6 text-left">
            <div className="bg-white/50 backdrop-blur-sm rounded-lg p-6 border">
              <Clock className="w-12 h-12 text-primary mb-4" />
              <h3 className="font-semibold mb-2">99% Automatisé</h3>
              <p className="text-sm text-muted-foreground">L'IA gère vos contenus, optimisations et campagnes automatiquement</p>
            </div>
            <div className="bg-white/50 backdrop-blur-sm rounded-lg p-6 border">
              <Zap className="w-12 h-12 text-primary mb-4" />
              <h3 className="font-semibold mb-2">Réactif 24h/24</h3>
              <p className="text-sm text-muted-foreground">Réponses aux avis, mises à jour SEO et veille concurrentielle en continu</p>
            </div>
            <div className="bg-white/50 backdrop-blur-sm rounded-lg p-6 border">
              <TrendingUp className="w-12 h-12 text-primary mb-4" />
              <h3 className="font-semibold mb-2">Résultats Mesurables</h3>
              <p className="text-sm text-muted-foreground">Tableaux de bord intelligents avec recommandations automatiques</p>
            </div>
          </div>
        </div>
      </section>

      {/* AI Features Section */}
      <section className="py-16 bg-gradient-to-r from-primary/5 to-secondary/5">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4 flex items-center justify-center gap-3">
              <Bot className="w-8 h-8 text-primary" />
              Comment ApidIA révolutionne votre marketing ?
            </h2>
          </div>
          
          <div className="grid lg:grid-cols-2 gap-8 items-center">
            <div className="space-y-6">
              <div className="flex items-start gap-4 p-4 bg-white/60 rounded-lg border">
                <div className="bg-primary/10 p-2 rounded-lg">
                  <Sparkles className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Génération automatique de contenus</h3>
                  <p className="text-sm text-muted-foreground">L'IA crée vos descriptions, posts réseaux sociaux, newsletters, affiches d'événements, sites internet et met à jour automatiquement vos fiches Apidae grâce à la recherche d'informations automatisée.</p>
                </div>
              </div>
              
              <div className="flex items-start gap-4 p-4 bg-white/60 rounded-lg border">
                <div className="bg-primary/10 p-2 rounded-lg">
                  <BarChart3 className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Bilan de visibilité en ligne & Bilan Social Média</h3>
                  <p className="text-sm text-muted-foreground">Analyse complète de votre présence digitale et performance sur les réseaux sociaux avec recommandations personnalisées.</p>
                </div>
              </div>
              
              <div className="flex items-start gap-4 p-4 bg-white/60 rounded-lg border">
                <div className="bg-primary/10 p-2 rounded-lg">
                  <MessageCircle className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Gestion des avis</h3>
                  <p className="text-sm text-muted-foreground">Audit complet des avis clients, analyse des verbatims, calcul du NPS et propositions de réponses automatiques personnalisées.</p>
                </div>
              </div>
              
              <div className="flex items-start gap-4 p-4 bg-white/60 rounded-lg border">
                <div className="bg-primary/10 p-2 rounded-lg">
                  <Users className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Gestion automatisée de la relation client</h3>
                  <p className="text-sm text-muted-foreground">Alimentation automatique de votre GRC avec fichier client et campagnes de mailings ciblées selon les profils de vos clients.</p>
                </div>
              </div>
            </div>
            
            <div className="relative">
              <div className="bg-gradient-to-br from-primary/20 to-secondary/20 rounded-2xl p-8 border border-primary/30">
                <div className="text-center space-y-4">
                  <Bot className="w-16 h-16 text-primary mx-auto" />
                  <h3 className="text-2xl font-bold">Votre Assistant IA Personnel</h3>
                  <div className="space-y-3 text-left">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-sm">Bilan SEO en temps réel</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-sm">Campagnes publicitaires automatisées</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-sm">Analyse prédictive de la demande</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-sm">Personnalisation des offres clients</span>
                    </div>
                  </div>
                  <div className="pt-4">
                    <div className="bg-primary/10 rounded-lg p-3">
                      <p className="text-sm font-medium text-primary">
                        💡 Une fois configuré, ApidIA fonctionne de manière quasi-autonome
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
            Commencez par un diagnostic IA gratuit. En 5 minutes, notre intelligence artificielle analyse votre présence digitale et configure vos outils automatiques.
          </p>
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 mb-8 max-w-2xl mx-auto">
            <p className="text-sm font-medium mb-2">⚡ Configuration en 5 minutes • 🤖 Gestion 100% autonome • 📈 Résultats dès la première semaine</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" variant="secondary" className="bg-white text-primary hover:bg-white/90" asChild>
              <Link to="/auth/login">🚀 Activer mon IA marketing</Link>
            </Button>
            <Button size="lg" variant="outline" className="border-white text-white hover:bg-white hover:text-primary">
              Voir une démo en live
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
          <p className="text-sm text-muted-foreground">
            Votre partenaire pour le développement digital de votre activité touristique
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Catalogue;