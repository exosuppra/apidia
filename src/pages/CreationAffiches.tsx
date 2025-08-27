import { ArrowLeft, Camera, Download, Palette, Sparkles, Target, Zap, Mail } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

const CreationAffiches = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20">
      {/* Header */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link to="/catalogue" className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
              <ArrowLeft className="w-4 h-4" />
              Retour au catalogue
            </Link>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-primary/10 rounded-full">
              <Camera className="w-8 h-8 text-primary" />
            </div>
          </div>
          <h1 className="text-4xl font-bold mb-4">Création automatisée d'affiches événementiels</h1>
          <p className="text-xl text-muted-foreground mb-6">
            ApidIA transforme automatiquement vos fiches Apidae en affiches professionnelles
          </p>
          <Badge variant="secondary" className="text-lg px-4 py-2">
            39€/mois
          </Badge>
        </div>

        {/* Comment ça fonctionne */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5" />
              Comment ça fonctionne
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="p-3 bg-blue-100 rounded-full w-fit mx-auto mb-3">
                  <Target className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="font-semibold mb-2">1. Analyse automatique</h3>
                <p className="text-sm text-muted-foreground">
                  L'IA analyse le contenu de vos fiches Apidae : titre, description, dates, lieu, images
                </p>
              </div>
              <div className="text-center">
                <div className="p-3 bg-green-100 rounded-full w-fit mx-auto mb-3">
                  <Palette className="w-6 h-6 text-green-600" />
                </div>
                <h3 className="font-semibold mb-2">2. Design personnalisé</h3>
                <p className="text-sm text-muted-foreground">
                  Création d'un visuel adapté au type d'événement en respectant votre charte graphique
                </p>
              </div>
              <div className="text-center">
                <div className="p-3 bg-purple-100 rounded-full w-fit mx-auto mb-3">
                  <Zap className="w-6 h-6 text-purple-600" />
                </div>
                <h3 className="font-semibold mb-2">3. Génération instantanée</h3>
                <p className="text-sm text-muted-foreground">
                  Affiche professionnelle prête en quelques secondes, disponible en plusieurs formats
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Fonctionnalités */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Fonctionnalités incluses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              {[
                "Génération automatique à partir des fiches Apidae",
                "Adaptation du design selon le type d'événement",
                "Respect de votre identité graphique",
                "Formats multiples (A4, carré, story Instagram...)",
                "Personnalisation des couleurs et polices",
                "Téléchargement haute résolution",
                "Historique des créations",
                "Support technique dédié"
              ].map((feature, index) => (
                <div key={index} className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0" />
                  <span className="text-sm">{feature}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Separator className="my-8" />

        {/* Section Démo */}
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold mb-4">Testez notre générateur</h2>
          <p className="text-muted-foreground mb-6">
            Découvrez comment ApidIA peut transformer vos fiches événementielles en affiches professionnelles
          </p>
          <Link to="/generateur-affiches">
            <Button size="lg" className="gap-2">
              <Download className="w-4 h-4" />
              Accéder à la démo
            </Button>
          </Link>
        </div>

        {/* CTA Final */}
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="text-center p-8">
            <h3 className="text-xl font-semibold mb-2">Prêt à automatiser vos créations visuelles ?</h3>
            <p className="text-muted-foreground mb-4">
              Rejoignez les offices de tourisme qui font confiance à ApidIA
            </p>
            <Button size="lg">
              Commencer maintenant
            </Button>
          </CardContent>
        </Card>
      </div>

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

export default CreationAffiches;