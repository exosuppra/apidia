import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Seo from "@/components/Seo";
import { 
  MapPin, 
  Bot, 
  Mail, 
  Globe, 
  FileText, 
  CheckCircle, 
  ArrowLeft, 
  Sparkles,
  Computer,
  Users,
  Calendar,
  Megaphone,
  Shield,
  Clock,
  Star
} from "lucide-react";

const ApidaeDetails = () => {
  return (
    <div className="min-h-screen bg-background">
      <Seo 
        title="Fiches APIDAE Intelligentes | ApidIA - Gestion Automatisée" 
        description="Découvrez comment ApidIA automatise la gestion de vos fiches APIDAE grâce à l'intelligence artificielle. Recherche automatique d'informations, proposition par email et mise à jour simplifiée."
        canonical={`${window.location.origin}/apidae-details`}
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
          <div className="flex items-center gap-4">
            <Button variant="outline" asChild>
              <Link to="/catalogue">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Retour
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
        <div className="container mx-auto px-4 text-center max-w-4xl">
          <div className="flex items-center justify-center gap-3 mb-6">
            <MapPin className="w-12 h-12 text-primary" />
            <Bot className="w-8 h-8 text-secondary" />
            <Sparkles className="w-6 h-6 text-yellow-500" />
          </div>
          
          <h1 className="text-4xl md:text-5xl font-bold mb-6 text-foreground">
            Fiches <span className="text-primary">APIDAE</span> Intelligentes
          </h1>
          
          <p className="text-xl text-muted-foreground mb-8 leading-relaxed">
            ApidIA se charge de rechercher automatiquement les informations sur internet pour remplir vos fiches APIDAE. 
            Fini la saisie manuelle fastidieuse, l'IA s'occupe de tout !
          </p>

          <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-8 border border-border shadow-sm mb-8">
            <div className="flex items-center justify-center gap-2 mb-4">
              <CheckCircle className="w-6 h-6 text-green-600" />
              <span className="font-semibold text-lg">Processus 100% Automatisé</span>
            </div>
            <p className="text-base text-muted-foreground">
              Plus besoin de passer des heures à remplir vos fiches. L'IA recherche, analyse et propose automatiquement du contenu de qualité.
            </p>
          </div>
        </div>
      </section>

      {/* How it Works Section */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Comment ça fonctionne ?</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Un processus simple et automatisé en 4 étapes
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Step 1 */}
            <Card className="relative group hover:shadow-lg transition-all duration-300">
              <div className="absolute -top-4 left-6 bg-primary text-primary-foreground w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm">
                1
              </div>
              <CardHeader className="pt-8">
                <div className="flex justify-center mb-4">
                  <div className="p-4 rounded-2xl bg-blue-100">
                    <Globe className="w-8 h-8 text-blue-600" />
                  </div>
                </div>
                <CardTitle className="text-center">Recherche Automatique</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-center">
                  ApidIA recherche automatiquement sur internet toutes les informations pertinentes concernant votre établissement.
                </CardDescription>
              </CardContent>
            </Card>

            {/* Step 2 */}
            <Card className="relative group hover:shadow-lg transition-all duration-300">
              <div className="absolute -top-4 left-6 bg-primary text-primary-foreground w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm">
                2
              </div>
              <CardHeader className="pt-8">
                <div className="flex justify-center mb-4">
                  <div className="p-4 rounded-2xl bg-purple-100">
                    <Bot className="w-8 h-8 text-purple-600" />
                  </div>
                </div>
                <CardTitle className="text-center">Analyse IA</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-center">
                  L'intelligence artificielle analyse et structure les informations trouvées pour créer un contenu de qualité.
                </CardDescription>
              </CardContent>
            </Card>

            {/* Step 3 */}
            <Card className="relative group hover:shadow-lg transition-all duration-300">
              <div className="absolute -top-4 left-6 bg-primary text-primary-foreground w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm">
                3
              </div>
              <CardHeader className="pt-8">
                <div className="flex justify-center mb-4">
                  <div className="p-4 rounded-2xl bg-green-100">
                    <Mail className="w-8 h-8 text-green-600" />
                  </div>
                </div>
                <CardTitle className="text-center">Proposition par Email</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-center">
                  Vous recevez un email avec une proposition de fiche complète que vous êtes libre de modifier selon vos souhaits.
                </CardDescription>
              </CardContent>
            </Card>

            {/* Step 4 */}
            <Card className="relative group hover:shadow-lg transition-all duration-300">
              <div className="absolute -top-4 left-6 bg-primary text-primary-foreground w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm">
                4
              </div>
              <CardHeader className="pt-8">
                <div className="flex justify-center mb-4">
                  <div className="p-4 rounded-2xl bg-yellow-100">
                    <FileText className="w-8 h-8 text-yellow-600" />
                  </div>
                </div>
                <CardTitle className="text-center">Mise à Jour APIDAE</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-center">
                  Une fois validée, les informations sont automatiquement mises à jour sur la plateforme APIDAE.
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* What is APIDAE Section */}
      <section className="py-16 bg-gradient-to-r from-secondary/5 to-primary/5">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-4 flex items-center justify-center gap-3">
                <Shield className="w-8 h-8 text-primary" />
                Qu'est-ce qu'APIDAE ?
              </h2>
              <p className="text-lg text-muted-foreground">
                La base de données touristique nationale qui propulse votre visibilité
              </p>
            </div>

            <div className="bg-white/60 backdrop-blur-sm rounded-3xl p-8 border border-border shadow-sm mb-8">
              <div className="grid lg:grid-cols-2 gap-8 items-center">
                <div>
                  <h3 className="text-2xl font-bold mb-4">APIDAE, le réseau national du tourisme</h3>
                  <p className="text-base text-muted-foreground leading-relaxed mb-6">
                    APIDAE est la <strong>base de données touristique nationale</strong> qui centralise et diffuse les informations 
                    de tous les acteurs du tourisme français. En alimentant votre fiche APIDAE, vous maximisez votre visibilité 
                    sur l'ensemble du territoire.
                  </p>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                      <span className="text-sm">Base de données officielle du tourisme français</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                      <span className="text-sm">Utilisée par tous les professionnels du secteur</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                      <span className="text-sm">Mise à jour en temps réel</span>
                    </div>
                  </div>
                </div>
                <div className="flex justify-center">
                  <div className="bg-gradient-to-br from-primary/20 to-secondary/20 rounded-2xl p-8 text-center">
                    <Globe className="w-16 h-16 text-primary mx-auto mb-4" />
                    <div className="text-2xl font-bold text-primary mb-2">300,000+</div>
                    <div className="text-sm text-muted-foreground">Offres touristiques référencées</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Distribution Channels Section */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4 flex items-center justify-center gap-3">
              <Megaphone className="w-8 h-8 text-primary" />
              Canaux de Diffusion APIDAE
            </h2>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
              Vos informations APIDAE sont automatiquement diffusées sur de nombreux supports pour maximiser votre visibilité
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Digital Channels */}
            <Card className="group hover:shadow-lg transition-all duration-300 border-l-4 border-l-blue-500">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Computer className="w-8 h-8 text-blue-600" />
                  <CardTitle className="text-blue-700">Sites Web Institutionnels</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <CardDescription>
                  • Offices de Tourisme<br/>
                  • Comités Départementaux du Tourisme<br/>
                  • Comités Régionaux du Tourisme
                </CardDescription>
              </CardContent>
            </Card>

            {/* Tourism Platforms */}
            <Card className="group hover:shadow-lg transition-all duration-300 border-l-4 border-l-green-500">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Globe className="w-8 h-8 text-green-600" />
                  <CardTitle className="text-green-700">Plateformes Touristiques</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <CardDescription>
                  • Sites de réservation en ligne<br/>
                  • Guides touristiques numériques<br/>
                  • Applications mobiles de tourisme<br/>
                  • Centrales de réservation<br/>
                  • Moteurs de recherche spécialisés
                </CardDescription>
              </CardContent>
            </Card>

            {/* Print Materials */}
            <Card className="group hover:shadow-lg transition-all duration-300 border-l-4 border-l-purple-500">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <FileText className="w-8 h-8 text-purple-600" />
                  <CardTitle className="text-purple-700">Supports Print</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <CardDescription>
                  • Programmes mensuels<br/>
                  • Brochures touristiques<br/>
                  • Guides papier<br/>
                  • Panneaux Akilux<br/>
                  • Affichage publicitaire
                </CardDescription>
              </CardContent>
            </Card>
          </div>

          <div className="mt-12 bg-gradient-to-r from-primary/10 to-secondary/10 rounded-2xl p-8 text-center">
            <h3 className="text-2xl font-bold mb-4">Portée de la Diffusion APIDAE</h3>
            <p className="text-base text-muted-foreground mb-6 max-w-3xl mx-auto">
              APIDAE est le réseau de diffusion touristique français qui permet une visibilité maximale 
              sur l'ensemble des canaux de communication du secteur.
            </p>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <div className="text-3xl font-bold text-primary">National</div>
                <div className="text-sm text-muted-foreground">Réseau de diffusion</div>
              </div>
              <div className="space-y-2">
                <div className="text-3xl font-bold text-primary">Multi-canal</div>
                <div className="text-sm text-muted-foreground">Web, mobile et print</div>
              </div>
              <div className="space-y-2">
                <div className="text-3xl font-bold text-primary">24/7</div>
                <div className="text-sm text-muted-foreground">Diffusion continue</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-16 bg-gradient-to-br from-primary/5 via-background to-secondary/5">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4 flex items-center justify-center gap-3">
              <Star className="w-8 h-8 text-primary" />
              Pourquoi Choisir ApidIA pour vos Fiches APIDAE ?
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <div className="space-y-6">
              <div className="flex items-start gap-4 p-6 bg-white/60 rounded-xl border shadow-sm">
                <Clock className="w-6 h-6 text-primary flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-semibold mb-2">Gain de Temps Considérable</h3>
                  <p className="text-sm text-muted-foreground">
                    Plus besoin de passer des heures à rechercher et saisir les informations. L'IA s'occupe de tout automatiquement.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-4 p-6 bg-white/60 rounded-xl border shadow-sm">
                <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-semibold mb-2">Informations Toujours À Jour</h3>
                  <p className="text-sm text-muted-foreground">
                    L'IA surveille automatiquement les changements et propose des mises à jour régulières de vos fiches.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-4 p-6 bg-white/60 rounded-xl border shadow-sm">
                <Users className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-semibold mb-2">Contrôle Total</h3>
                  <p className="text-sm text-muted-foreground">
                    Vous gardez le contrôle final sur toutes les informations. Modifiez, ajoutez ou supprimez selon vos besoins.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="flex items-start gap-4 p-6 bg-white/60 rounded-xl border shadow-sm">
                <Globe className="w-6 h-6 text-purple-600 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-semibold mb-2">Visibilité Maximisée</h3>
                  <p className="text-sm text-muted-foreground">
                    Vos informations sont diffusées sur des centaines de sites et supports pour une exposition optimale.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-4 p-6 bg-white/60 rounded-xl border shadow-sm">
                <Shield className="w-6 h-6 text-orange-600 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-semibold mb-2">Qualité Professionnelle</h3>
                  <p className="text-sm text-muted-foreground">
                    L'IA génère du contenu professionnel, optimisé et attractif pour valoriser votre établissement.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-4 p-6 bg-white/60 rounded-xl border shadow-sm">
                <Bot className="w-6 h-6 text-secondary flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-semibold mb-2">Technologie de Pointe</h3>
                  <p className="text-sm text-muted-foreground">
                    Bénéficiez des dernières avancées en intelligence artificielle spécialisée dans le secteur touristique.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Information Section */}
      <section className="py-16 bg-gradient-to-r from-primary/10 to-secondary/10 relative overflow-hidden">
        <div className="container mx-auto px-4 text-center">
          <div className="flex items-center justify-center gap-3 mb-6">
            <MapPin className="w-12 h-12 text-primary" />
            <Bot className="w-10 h-10 text-secondary" />
          </div>
          <h2 className="text-3xl font-bold mb-4 text-foreground">Service ApidIA Déjà Disponible</h2>
          <p className="text-lg mb-8 text-muted-foreground max-w-3xl mx-auto">
            Ce système d'automatisation des fiches APIDAE est déjà en place et disponible gratuitement. 
            L'IA recherche, analyse et propose automatiquement du contenu pour vos fiches.
          </p>
          <div className="bg-white/60 backdrop-blur-sm border border-border rounded-2xl p-6 mb-8 max-w-2xl mx-auto">
            <div className="flex items-center justify-center gap-2 mb-3">
              <CheckCircle className="w-6 h-6 text-green-600" />
              <span className="font-semibold text-lg text-foreground">Service Gratuit et Actif</span>
            </div>
            <p className="text-sm text-muted-foreground">
              🤖 Recherche automatique • ✉️ Proposition par email • ✅ Validation simple • 🚀 Diffusion immédiate
            </p>
          </div>
          <div className="flex justify-center gap-4">
            <Button size="lg" className="font-semibold" asChild>
              <Link to="/auth/login">Accéder au service</Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link to="/catalogue">Voir tous les services</Link>
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
            Fiches APIDAE intelligentes - Votre partenaire pour l'automatisation touristique
          </p>
          <p className="text-xs text-muted-foreground/70">
            Développé par l'Office de Tourisme et des Congrès du Pays de Manosque
          </p>
        </div>
      </footer>
    </div>
  );
};

export default ApidaeDetails;