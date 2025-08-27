import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Seo from "@/components/Seo";
import { 
  Star, 
  MessageCircle, 
  BarChart3, 
  Bot, 
  CheckCircle, 
  ArrowRight,
  Clock,
  Target,
  Sparkles,
  TrendingUp,
  Users,
  Zap,
  Brain,
  Shield
} from "lucide-react";

const GestionAvis = () => {
  return (
    <div className="min-h-screen bg-background">
      <Seo 
        title="Gestion Complète des Avis | ApidIA - Solution IA pour la Réputation"
        description="Audit automatique des avis, analyse des verbatims, calcul NPS et réponses personnalisées générées par IA. Connectez votre compte Google et laissez l'IA gérer vos réponses aux avis clients."
        canonical={`${window.location.origin}/gestion-avis`}
        keywords="gestion avis IA, réponses automatiques avis, NPS tourisme, analyse verbatims, audit réputation, Google My Business, avis clients automatisation"
      />
      
      {/* Header */}
      <header className="border-b bg-white/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img 
              src="/lovable-uploads/d4594427-d5ec-4616-9298-7912d6c72b56.png" 
              alt="Logo ApidIA" 
              className="w-10 h-10 object-contain"
            />
            <h1 className="text-xl font-bold text-primary">ApidIA</h1>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" asChild>
              <Link to="/catalogue">← Catalogue</Link>
            </Button>
            <Button asChild>
              <Link to="/auth/login">Se connecter</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-16 pb-12 bg-gradient-to-br from-yellow-500/5 via-background to-orange-500/5">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="text-center mb-12">
            <div className="flex items-center justify-center gap-3 mb-6">
              <div className="bg-yellow-100 p-3 rounded-2xl">
                <Star className="w-8 h-8 text-yellow-600" />
              </div>
              <Bot className="w-10 h-10 text-primary" />
              <Sparkles className="w-6 h-6 text-yellow-500" />
            </div>
            
            <h1 className="text-3xl md:text-5xl font-bold mb-6 text-foreground leading-tight">
              Gestion Complète des <span className="text-yellow-600">Avis</span>
            </h1>
            
            <div className="flex justify-center mb-6">
              <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-700 px-4 py-2 text-base">
                <MessageCircle className="w-4 h-4 mr-2" />
                Intelligence Artificielle Conversationnelle
              </Badge>
            </div>
            
            <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed mb-8">
              L'IA analyse vos avis, calcule votre NPS et génère des réponses personnalisées. 
              Connectez simplement votre compte Google et validez les propositions.
            </p>

            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-border shadow-lg">
              <div className="flex items-center justify-center gap-4 mb-4">
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-green-600" />
                  <span className="text-sm font-medium">Économisez 10h/semaine</span>
                </div>
                <div className="w-1 h-1 bg-muted-foreground rounded-full"></div>
                <div className="flex items-center gap-2">
                  <Target className="w-5 h-5 text-blue-600" />
                  <span className="text-sm font-medium">Réponses personnalisées</span>
                </div>
                <div className="w-1 h-1 bg-muted-foreground rounded-full"></div>
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-purple-600" />
                  <span className="text-sm font-medium">Analyse NPS automatique</span>
                </div>
              </div>
              
              <div className="text-2xl font-bold text-primary mb-2">29€/mois</div>
              <p className="text-sm text-muted-foreground">Gestion illimitée d'avis</p>
            </div>
          </div>
        </div>
      </section>

      {/* Fonctionnalités principales */}
      <section className="py-16 bg-white/50">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Comment ça fonctionne ?</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Une solution complète pour transformer la gestion de vos avis en atout commercial
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Audit des avis */}
            <Card className="bg-gradient-to-br from-blue-50 to-blue-100/50 border-blue-200">
              <CardHeader className="text-center pb-4">
                <div className="bg-blue-100 p-3 rounded-2xl w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                  <BarChart3 className="w-8 h-8 text-blue-600" />
                </div>
                <CardTitle className="text-xl">Audit des Avis</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>Collecte automatique de tous vos avis</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>Classification par sentiment</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>Identification des tendances</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            {/* Analyse des verbatims */}
            <Card className="bg-gradient-to-br from-purple-50 to-purple-100/50 border-purple-200">
              <CardHeader className="text-center pb-4">
                <div className="bg-purple-100 p-3 rounded-2xl w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                  <Brain className="w-8 h-8 text-purple-600" />
                </div>
                <CardTitle className="text-xl">Analyse Verbatims</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>Extraction des mots-clés importants</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>Analyse des émotions exprimées</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>Points d'amélioration identifiés</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            {/* Calcul NPS */}
            <Card className="bg-gradient-to-br from-green-50 to-green-100/50 border-green-200">
              <CardHeader className="text-center pb-4">
                <div className="bg-green-100 p-3 rounded-2xl w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                  <TrendingUp className="w-8 h-8 text-green-600" />
                </div>
                <CardTitle className="text-xl">Calcul NPS</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>Score NPS automatique</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>Évolution dans le temps</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>Comparaison sectorielle</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            {/* Réponses automatiques */}
            <Card className="bg-gradient-to-br from-orange-50 to-orange-100/50 border-orange-200">
              <CardHeader className="text-center pb-4">
                <div className="bg-orange-100 p-3 rounded-2xl w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                  <MessageCircle className="w-8 h-8 text-orange-600" />
                </div>
                <CardTitle className="text-xl">Réponses IA</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>3 propositions par avis</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>Ton adapté à votre image</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>Validation ou modification facile</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Processus étape par étape */}
      <section className="py-16 bg-gradient-to-br from-primary/5 via-background to-secondary/5">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Processus Simple</h2>
            <p className="text-lg text-muted-foreground">En 3 étapes, transformez la gestion de vos avis</p>
          </div>

          <div className="space-y-8">
            <div className="flex items-start gap-6">
              <div className="bg-primary text-white rounded-full w-12 h-12 flex items-center justify-center font-bold text-xl flex-shrink-0">
                1
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold mb-2">Connectez votre compte Google</h3>
                <p className="text-muted-foreground">
                  Liez votre fiche Google My Business en un clic. L'IA accède automatiquement à tous vos avis 
                  pour commencer l'analyse et la gestion.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-6">
              <div className="bg-primary text-white rounded-full w-12 h-12 flex items-center justify-center font-bold text-xl flex-shrink-0">
                2
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold mb-2">L'IA analyse et génère</h3>
                <p className="text-muted-foreground">
                  Pour chaque avis, l'IA effectue une analyse complète et propose 3 réponses personnalisées 
                  adaptées au ton de votre établissement et au contexte de l'avis.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-6">
              <div className="bg-primary text-white rounded-full w-12 h-12 flex items-center justify-center font-bold text-xl flex-shrink-0">
                3
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold mb-2">Validez ou modifiez</h3>
                <p className="text-muted-foreground">
                  Choisissez la réponse qui vous convient le mieux, modifiez-la si nécessaire, et publiez-la 
                  directement. L'IA s'améliore avec vos préférences.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section NPS Explicative */}
      <section className="py-16 bg-gradient-to-br from-green-500/5 via-background to-blue-500/5">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="text-center mb-12">
            <div className="flex items-center justify-center gap-3 mb-6">
              <div className="bg-green-100 p-3 rounded-2xl">
                <TrendingUp className="w-8 h-8 text-green-600" />
              </div>
              <h2 className="text-3xl font-bold">Qu'est-ce que le NPS ?</h2>
            </div>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Le Net Promoter Score est l'indicateur de référence pour mesurer la satisfaction client
            </p>
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 border border-border shadow-lg mb-8">
            <div className="grid md:grid-cols-2 gap-8 items-center">
              <div>
                <h3 className="text-2xl font-bold mb-4">Le NPS en quelques mots</h3>
                <p className="text-muted-foreground mb-4">
                  Le <strong>Net Promoter Score</strong> mesure la probabilité qu'un client recommande 
                  votre établissement à son entourage. Il se base sur une question simple :
                </p>
                <div className="bg-blue-50 p-4 rounded-lg border-l-4 border-blue-500 mb-4">
                  <p className="text-blue-900 font-medium">
                    "Sur une échelle de 0 à 10, quelle est la probabilité que vous recommandiez 
                    notre établissement à un ami ou un collègue ?"
                  </p>
                </div>
                <p className="text-muted-foreground">
                  ApidIA calcule automatiquement votre NPS en analysant tous vos avis Google 
                  et en déterminant le niveau de satisfaction de chaque client.
                </p>
              </div>
              
              <div className="bg-gradient-to-br from-green-50 to-blue-50 p-6 rounded-xl">
                <h4 className="text-xl font-bold mb-4 text-center">Classification des clients</h4>
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="bg-red-100 text-red-700 rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold">
                      0-6
                    </div>
                    <div>
                      <div className="font-semibold text-red-700">Détracteurs</div>
                      <div className="text-sm text-muted-foreground">Clients insatisfaits</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="bg-yellow-100 text-yellow-700 rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold">
                      7-8
                    </div>
                    <div>
                      <div className="font-semibold text-yellow-700">Passifs</div>
                      <div className="text-sm text-muted-foreground">Clients neutres</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="bg-green-100 text-green-700 rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold">
                      9-10
                    </div>
                    <div>
                      <div className="font-semibold text-green-700">Promoteurs</div>
                      <div className="text-sm text-muted-foreground">Clients ambassadeurs</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Calcul du NPS */}
          <div className="bg-gradient-to-r from-primary/10 to-secondary/10 rounded-2xl p-8 border border-primary/20">
            <h3 className="text-2xl font-bold mb-6 text-center">Comment se calcule le NPS ?</h3>
            
            <div className="grid md:grid-cols-3 gap-6 mb-8">
              <div className="text-center">
                <div className="bg-white rounded-xl p-6 shadow-sm">
                  <div className="text-3xl font-bold text-green-600 mb-2">60%</div>
                  <div className="text-sm text-muted-foreground">Promoteurs</div>
                  <div className="text-xs text-muted-foreground mt-1">(Notes 9-10)</div>
                </div>
              </div>
              
              <div className="text-center flex items-center justify-center">
                <div className="text-2xl font-bold text-primary">-</div>
              </div>
              
              <div className="text-center">
                <div className="bg-white rounded-xl p-6 shadow-sm">
                  <div className="text-3xl font-bold text-red-600 mb-2">15%</div>
                  <div className="text-sm text-muted-foreground">Détracteurs</div>
                  <div className="text-xs text-muted-foreground mt-1">(Notes 0-6)</div>
                </div>
              </div>
            </div>
            
            <div className="text-center">
              <div className="inline-flex items-center gap-3 bg-white rounded-xl p-6 shadow-sm">
                <span className="text-lg">NPS =</span>
                <div className="bg-primary text-white rounded-lg px-4 py-2">
                  <span className="text-2xl font-bold">+45</span>
                </div>
              </div>
              <p className="text-sm text-muted-foreground mt-4">
                Un NPS positif indique que vous avez plus de promoteurs que de détracteurs
              </p>
            </div>
            
            <div className="bg-white/50 rounded-xl p-6 mt-6">
              <h4 className="font-bold mb-3">Interprétation du score :</h4>
              <div className="grid sm:grid-cols-3 gap-4 text-sm">
                <div className="text-center">
                  <div className="text-red-600 font-bold">-100 à 0</div>
                  <div className="text-muted-foreground">À améliorer</div>
                </div>
                <div className="text-center">
                  <div className="text-yellow-600 font-bold">0 à +50</div>
                  <div className="text-muted-foreground">Bon score</div>
                </div>
                <div className="text-center">
                  <div className="text-green-600 font-bold">+50 à +100</div>
                  <div className="text-muted-foreground">Excellent</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Avantages */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Pourquoi choisir notre solution ?</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <Card className="text-center">
              <CardHeader>
                <div className="bg-blue-100 p-3 rounded-2xl w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                  <Clock className="w-8 h-8 text-blue-600" />
                </div>
                <CardTitle>Gain de temps massif</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Économisez jusqu'à 10 heures par semaine sur la gestion de vos avis. 
                  Plus de réflexion sur quoi répondre.
                </p>
              </CardContent>
            </Card>

            <Card className="text-center">
              <CardHeader>
                <div className="bg-green-100 p-3 rounded-2xl w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                  <Shield className="w-8 h-8 text-green-600" />
                </div>
                <CardTitle>Réponses professionnelles</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  L'IA génère des réponses adaptées et professionnelles, même pour les avis négatifs. 
                  Maintenez une image de marque cohérente.
                </p>
              </CardContent>
            </Card>

            <Card className="text-center">
              <CardHeader>
                <div className="bg-purple-100 p-3 rounded-2xl w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                  <TrendingUp className="w-8 h-8 text-purple-600" />
                </div>
                <CardTitle>Amélioration continue</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Suivez l'évolution de votre réputation avec des analyses détaillées et des conseils 
                  d'amélioration personnalisés.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-gradient-to-br from-yellow-500/10 via-orange-500/5 to-primary/10">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="text-center">
            <h2 className="text-3xl font-bold mb-6">Prêt à automatiser la gestion de vos avis ?</h2>
            <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
              Rejoignez les professionnels du tourisme qui ont déjà adopté l'IA pour transformer 
              leur réputation en ligne en avantage concurrentiel.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" className="text-lg px-8 py-6" asChild>
                <Link to="/auth/login">
                  Activer la gestion avis IA
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Link>
              </Button>
              <Button variant="outline" size="lg" className="text-lg px-8 py-6" asChild>
                <Link to="/catalogue">Voir tous nos services</Link>
              </Button>
            </div>
            
            <div className="mt-6 text-sm text-muted-foreground">
              <span className="font-medium">29€/mois</span> • Annulation possible à tout moment • Support inclus
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default GestionAvis;