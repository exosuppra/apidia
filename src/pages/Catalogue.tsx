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
  MapPin
} from "lucide-react";

const services = [
  {
    category: "Visibilité en ligne",
    color: "bg-blue-500/10 text-blue-600",
    services: [
      {
        icon: <Globe className="w-8 h-8" />,
        title: "Audit visibilité en ligne",
        description: "Analysez votre présence digitale et identifiez les axes d'amélioration",
        cta: "Demander mon audit"
      },
      {
        icon: <TrendingUp className="w-8 h-8" />,
        title: "Optimisation SEO",
        description: "Améliorez votre référencement pour être mieux trouvé sur Google",
        cta: "Optimiser mon SEO"
      },
      {
        icon: <Smartphone className="w-8 h-8" />,
        title: "Création site web",
        description: "Site web professionnel adapté à votre activité touristique",
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
        title: "Gestion des avis clients",
        description: "Surveillez et répondez à vos avis sur toutes les plateformes",
        cta: "Gérer mes avis"
      },
      {
        icon: <BarChart3 className="w-8 h-8" />,
        title: "Analyse de réputation",
        description: "Rapport détaillé de votre e-réputation avec recommandations",
        cta: "Analyser ma réputation"
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
        title: "Création d'affiches",
        description: "Designs professionnels pour vos événements et promotions",
        cta: "Créer mes affiches"
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
        title: "Fiches APIDAE",
        description: "Synchronisation et mise à jour de vos données touristiques",
        cta: "Synchroniser mes fiches"
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
          <h2 className="text-4xl md:text-5xl font-bold mb-6 text-foreground">
            Catalogue de Services
          </h2>
          <p className="text-xl text-muted-foreground mb-8">
            Vous êtes une entreprise locale du tourisme ou un partenaire de l'Office de Tourisme et vous souhaitez une aide pour développer votre business
          </p>
          <div className="grid md:grid-cols-3 gap-6 text-left">
            <div className="bg-white/50 backdrop-blur-sm rounded-lg p-6 border">
              <TrendingUp className="w-12 h-12 text-primary mb-4" />
              <h3 className="font-semibold mb-2">Gain de temps</h3>
              <p className="text-sm text-muted-foreground">Outils centralisés pour optimiser votre gestion quotidienne</p>
            </div>
            <div className="bg-white/50 backdrop-blur-sm rounded-lg p-6 border">
              <GraduationCap className="w-12 h-12 text-primary mb-4" />
              <h3 className="font-semibold mb-2">Montée en compétences</h3>
              <p className="text-sm text-muted-foreground">Formations et conseils personnalisés pour votre activité</p>
            </div>
            <div className="bg-white/50 backdrop-blur-sm rounded-lg p-6 border">
              <Eye className="w-12 h-12 text-primary mb-4" />
              <h3 className="font-semibold mb-2">Meilleure visibilité</h3>
              <p className="text-sm text-muted-foreground">Augmentez votre présence en ligne et attirez plus de clients</p>
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
      <section className="py-16 bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">Prêt à développer votre activité ?</h2>
          <p className="text-lg mb-8 opacity-90 max-w-2xl mx-auto">
            Commencez par un diagnostic gratuit de votre présence en ligne et découvrez comment nous pouvons vous aider à attirer plus de clients.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" variant="secondary" asChild>
              <Link to="/auth/login">Commencer mon diagnostic</Link>
            </Button>
            <Button size="lg" variant="outline" className="border-white text-white hover:bg-white hover:text-primary">
              Demander une démo
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