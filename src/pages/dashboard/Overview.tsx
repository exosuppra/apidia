import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Seo from "@/components/Seo";
import { Activity, MessageSquare, Star, TrendingUp, FileText } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import GoogleMyBusinessReviews from "@/components/GoogleMyBusinessReviews";

export default function Overview() {
  const kpis = [
    { title: "Note moyenne", value: "4.6/5", icon: Star, help: "Derniers 90 jours" },
    { title: "Avis non répondus", value: "12", icon: MessageSquare, help: "À traiter" },
    { title: "Tendance", value: "+18%", icon: TrendingUp, help: "vs. mois dernier" },
    { title: "Santé locale", value: "82/100", icon: Activity, help: "Score global" },
  ];

  return (
    <>
      <Seo
        title="Tableau de bord – Aperçu | Apidia"
        description="Vue d'ensemble: KPIs, santé de la réputation et actions prioritaires."
      />
      <section className="space-y-6 animate-fade-in">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-playfair">Tableau de bord — Aperçu</h1>
            <p className="text-muted-foreground mt-1">Suivez vos indicateurs clés en un coup d'œil.</p>
          </div>
          <Button asChild>
            <Link to="/dashboard/fiches" aria-label="Aller à mes fiches">
              <FileText className="mr-2 h-4 w-4" /> Mes fiches
            </Link>
          </Button>
        </header>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {kpis.map(({ title, value, icon: Icon, help }) => (
            <Card key={title} className="animate-scale-in">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">{title}</CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{value}</div>
                <p className="text-xs text-muted-foreground mt-1">{help}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <article className="rounded-lg border bg-card p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Résumé</h2>
          <p className="text-sm text-muted-foreground mt-2">
            Votre réputation se renforce: la note moyenne progresse et la part d'avis
            non répondus diminue. Continuez à répondre rapidement et maintenez la
            cadence de publications pour améliorer le score local.
          </p>
        </article>

        <GoogleMyBusinessReviews />
      </section>
    </>
  );
}
