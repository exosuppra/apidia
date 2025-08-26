import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Seo from "@/components/Seo";
import { 
  Search, 
  BarChart3, 
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
  Zap
} from "lucide-react";

const BilanSiteWeb = () => {
  const features = [
    {
      icon: <Search className="w-6 h-6" />,
      title: "Analyse SEO complète",
      description: "Audit technique de votre référencement naturel : balises, structure, mots-clés, vitesse de chargement"
    },
    {
      icon: <BarChart3 className="w-6 h-6" />,
      title: "Performance technique",
      description: "Temps de chargement, compatibilité mobile, sécurité HTTPS, optimisation des images"
    },
    {
      icon: <Target className="w-6 h-6" />,
      title: "Analyse concurrentielle",
      description: "Comparaison avec vos concurrents directs sur les mêmes mots-clés et secteur d'activité"
    },
    {
      icon: <FileText className="w-6 h-6" />,
      title: "Qualité du contenu",
      description: "Évaluation de la pertinence, la longueur et l'optimisation de vos textes pour le SEO"
    }
  ];

  const benefits = [
    {
      icon: <Eye className="w-5 h-5" />,
      title: "Vision claire de votre positionnement",
      description: "Comprenez exactement où vous en êtes par rapport à la concurrence"
    },
    {
      icon: <Lightbulb className="w-5 h-5" />,
      title: "Conseils personnalisés",
      description: "Recommandations concrètes et priorisées selon votre secteur d'activité"
    },
    {
      icon: <CheckCircle className="w-5 h-5" />,
      title: "Points forts identifiés",
      description: "Mise en valeur de ce qui fonctionne déjà bien sur votre site"
    },
    {
      icon: <AlertTriangle className="w-5 h-5" />,
      title: "Axes d'amélioration ciblés",
      description: "Identification précise des éléments à optimiser en priorité"
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <Seo 
        title="Bilan de Site Web | Analyse SEO et Performance - ApidIA"
        description="Obtenez une analyse complète de votre site web : audit SEO, performance technique, comparaison concurrentielle et conseils personnalisés pour améliorer votre visibilité en ligne."
        canonical={`${window.location.origin}/bilan-site-web`}
        keywords="bilan site web, audit SEO, analyse performance web, audit technique site internet, conseils SEO, optimisation site web tourisme"
        ogImage="/lovable-uploads/d4594427-d5ec-4616-9298-7912d6c72b56.png"
        ogUrl={`${window.location.origin}/bilan-site-web`}
        structuredData={{
          "@context": "https://schema.org",
          "@type": "Service",
          "name": "Bilan de Site Web - Analyse SEO et Performance",
          "description": "Service d'audit complet de site web incluant analyse SEO, performance technique et recommandations personnalisées",
          "provider": {
            "@type": "Organization",
            "name": "ApidIA",
            "url": window.location.origin
          },
          "offers": {
            "@type": "Offer",
            "price": "49",
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
              <div className="bg-primary/10 p-3 rounded-2xl">
                <TrendingUp className="w-8 h-8 text-primary" />
              </div>
            </div>
            
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-foreground">
              Bilan de Site Web
            </h2>
            
            <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed mb-6">
              Obtenez une analyse complète de votre site web pour comprendre sa performance SEO 
              et recevoir des conseils personnalisés d'amélioration.
            </p>

            <div className="flex justify-center items-center gap-4 mb-8">
              <Badge variant="secondary" className="text-sm">
                Analyse en 24h
              </Badge>
              <Badge variant="outline" className="text-sm">
                Rapport détaillé
              </Badge>
            </div>
          </div>
        </div>
      </section>

      {/* What We Analyze Section */}
      <section className="py-16">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="text-center mb-12">
            <h3 className="text-2xl md:text-3xl font-bold mb-4">
              Ce que nous analysons
            </h3>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
              Notre IA examine en profondeur tous les aspects techniques et stratégiques de votre site web
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="border-border/50 hover:border-primary/30 transition-colors">
                <CardHeader>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="bg-primary/10 p-2 rounded-lg">
                      {feature.icon}
                    </div>
                    <CardTitle className="text-xl">{feature.title}</CardTitle>
                  </div>
                  <CardDescription className="text-base leading-relaxed">
                    {feature.description}
                  </CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* What You Get Section */}
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="text-center mb-12">
            <h3 className="text-2xl md:text-3xl font-bold mb-4">
              Ce que vous recevez
            </h3>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
              Un rapport complet avec des conseils concrets et applicables immédiatement
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 mb-12">
            {benefits.map((benefit, index) => (
              <div key={index} className="flex items-start gap-4 p-6 bg-background rounded-lg border border-border/50">
                <div className="bg-primary/10 p-2 rounded-lg flex-shrink-0">
                  {benefit.icon}
                </div>
                <div>
                  <h4 className="font-semibold text-lg mb-2">{benefit.title}</h4>
                  <p className="text-muted-foreground">{benefit.description}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Important Notice */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 mb-8">
            <div className="flex items-start gap-3">
              <Shield className="w-6 h-6 text-amber-600 flex-shrink-0 mt-1" />
              <div>
                <h4 className="font-semibold text-amber-800 mb-2">Important à savoir</h4>
                <div className="text-amber-700 space-y-2">
                  <p className="font-medium">✅ Ce que nous faisons :</p>
                  <ul className="list-disc list-inside space-y-1 ml-4 text-sm">
                    <li>Analyse technique complète de votre site</li>
                    <li>Audit SEO approfondi</li>
                    <li>Comparaison avec la concurrence</li>
                    <li>Recommandations personnalisées et priorisées</li>
                  </ul>
                  
                  <p className="font-medium mt-4">❌ Ce que nous ne faisons pas :</p>
                  <ul className="list-disc list-inside space-y-1 ml-4 text-sm">
                    <li>Nous n'intervenons pas directement sur votre site</li>
                    <li>Nous ne modifions aucun code ou contenu</li>
                    <li>Nous ne garantissons pas d'amélioration automatique du référencement</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Process Section */}
      <section className="py-16">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="text-center mb-12">
            <h3 className="text-2xl md:text-3xl font-bold mb-4">
              Comment ça fonctionne
            </h3>
            <p className="text-lg text-muted-foreground">
              Un processus simple et transparent en 3 étapes
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-primary">1</span>
              </div>
              <h4 className="text-xl font-semibold mb-3">Vous commandez</h4>
              <p className="text-muted-foreground">
                Renseignez l'URL de votre site et quelques informations sur votre activité
              </p>
            </div>

            <div className="text-center">
              <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Zap className="w-8 h-8 text-primary" />
              </div>
              <h4 className="text-xl font-semibold mb-3">Notre IA analyse</h4>
              <p className="text-muted-foreground">
                Audit automatique complet de votre site en moins de 24h
              </p>
            </div>

            <div className="text-center">
              <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <FileText className="w-8 h-8 text-primary" />
              </div>
              <h4 className="text-xl font-semibold mb-3">Vous recevez votre bilan</h4>
              <p className="text-muted-foreground">
                Rapport détaillé avec conseils concrets et plan d'action priorisé
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-gradient-to-br from-primary/5 via-background to-secondary/5">
        <div className="container mx-auto px-4 max-w-4xl text-center">
          <h3 className="text-2xl md:text-3xl font-bold mb-4">
            Prêt à découvrir le potentiel de votre site ?
          </h3>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            Obtenez votre bilan complet pour comprendre les forces et faiblesses de votre site web
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button size="lg" className="px-8">
              Commander mon bilan - 49€
            </Button>
            <span className="text-sm text-muted-foreground">Rapport livré sous 24h</span>
          </div>

          <div className="mt-8 text-center">
            <p className="text-sm text-muted-foreground">
              Vous recevrez un rapport détaillé avec des conseils concrets pour améliorer votre visibilité en ligne
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default BilanSiteWeb;