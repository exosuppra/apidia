import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthProvider";
import { Building2, Star, MessageSquare, Clock } from "lucide-react";
import Seo from "@/components/Seo";

interface Business {
  id: string;
  name: string;
  address: string;
  averageRating: number;
  totalReviews: number;
  unreadReviews: number;
}

interface Review {
  id: string;
  author: string;
  rating: number;
  text: string;
  createTime: string;
  replied: boolean;
}

export default function BusinessDashboard() {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      loadBusinesses();
    }
  }, [user]);

  const loadBusinesses = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke('get-businesses');
      
      if (error) {
        throw error;
      }
      
      setBusinesses(data.businesses || []);
    } catch (error) {
      console.error('Error loading businesses:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger vos établissements",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadReviews = async (businessId: string) => {
    try {
      setLoadingReviews(true);
      const { data, error } = await supabase.functions.invoke('get-reviews', {
        body: { businessId }
      });
      
      if (error) {
        throw error;
      }
      
      setReviews(data.reviews || []);
    } catch (error) {
      console.error('Error loading reviews:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les avis",
        variant: "destructive",
      });
    } finally {
      setLoadingReviews(false);
    }
  };

  const handleBusinessSelect = (business: Business) => {
    setSelectedBusiness(business);
    loadReviews(business.id);
  };

  const handleGoogleLogin = async () => {
    try {
      setGoogleLoading(true);
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/avis`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
          scopes: 'https://www.googleapis.com/auth/business.manage',
        },
      });

      if (error) {
        toast({
          title: "Erreur",
          description: error.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de se connecter avec Google",
        variant: "destructive",
      });
    } finally {
      setGoogleLoading(false);
    }
  };

  if (!selectedBusiness) {
    return (
      <>
        <Seo
          title="Dashboard ApidIA | Vos Établissements"
          description="Gérez vos établissements Google My Business et leurs avis depuis ApidIA."
          canonical={`${window.location.origin}/avis`}
        />
        <div className="container mx-auto p-6">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Vos Établissements</h1>
            <p className="text-muted-foreground">
              Sélectionnez un établissement pour gérer ses avis Google My Business
            </p>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="animate-pulse">
                  <CardHeader>
                    <div className="h-4 bg-muted rounded w-3/4"></div>
                    <div className="h-3 bg-muted rounded w-1/2"></div>
                  </CardHeader>
                  <CardContent>
                    <div className="h-20 bg-muted rounded"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : businesses.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <Building2 className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">Aucun établissement trouvé</h3>
                <p className="text-muted-foreground mb-4">
                  Pour accéder à vos établissements Google My Business, connectez-vous avec votre compte Google professionnel.
                </p>
                <div className="flex gap-3 justify-center">
                  <Button onClick={handleGoogleLogin} disabled={googleLoading}>
                    {googleLoading ? "Connexion..." : "Se connecter avec Google"}
                  </Button>
                  <Button variant="outline" onClick={loadBusinesses}>Actualiser</Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {businesses.map((business) => (
                <Card 
                  key={business.id}
                  className="cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => handleBusinessSelect(business)}
                >
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Building2 className="h-5 w-5" />
                      {business.name}
                    </CardTitle>
                    <CardDescription>{business.address}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        <span className="font-medium">{business.averageRating}</span>
                      </div>
                      <Badge variant="secondary">
                        {business.totalReviews} avis
                      </Badge>
                    </div>
                    
                    {business.unreadReviews > 0 && (
                      <div className="flex items-center gap-2">
                        <MessageSquare className="h-4 w-4 text-primary" />
                        <span className="text-sm font-medium text-primary">
                          {business.unreadReviews} nouveau{business.unreadReviews > 1 ? 'x' : ''} avis
                        </span>
                      </div>
                    )}
                    
                    <Button className="w-full">
                      Gérer les avis
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </>
    );
  }

  return (
    <>
      <Seo
        title={`Avis - ${selectedBusiness.name} | ApidIA`}
        description={`Gérez les avis Google My Business de ${selectedBusiness.name} avec ApidIA.`}
        canonical={`${window.location.origin}/avis`}
      />
      <div className="container mx-auto p-6">
        <div className="mb-6">
          <Button 
            variant="ghost" 
            onClick={() => setSelectedBusiness(null)}
            className="mb-4"
          >
            ← Retour aux établissements
          </Button>
          
          <div className="flex items-center gap-4 mb-4">
            <Building2 className="h-6 w-6" />
            <div>
              <h1 className="text-2xl font-bold">{selectedBusiness.name}</h1>
              <p className="text-muted-foreground">{selectedBusiness.address}</p>
            </div>
          </div>
          
          <div className="flex gap-4 mb-6">
            <div className="flex items-center gap-2">
              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
              <span>{selectedBusiness.averageRating} étoiles</span>
            </div>
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              <span>{selectedBusiness.totalReviews} avis au total</span>
            </div>
          </div>
        </div>

        {loadingReviews ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="space-y-3">
                    <div className="h-4 bg-muted rounded w-1/4"></div>
                    <div className="h-3 bg-muted rounded w-full"></div>
                    <div className="h-3 bg-muted rounded w-3/4"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : reviews.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <MessageSquare className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Aucun avis</h3>
              <p className="text-muted-foreground">
                Cet établissement n'a pas encore d'avis
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {reviews.map((review) => (
              <Card key={review.id}>
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-medium">{review.author}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star 
                              key={star}
                              className={`h-4 w-4 ${
                                star <= review.rating 
                                  ? 'fill-yellow-400 text-yellow-400' 
                                  : 'text-gray-300'
                              }`}
                            />
                          ))}
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {new Date(review.createTime).toLocaleDateString('fr-FR')}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      {review.replied ? (
                        <Badge variant="default">Répondu</Badge>
                      ) : (
                        <Badge variant="secondary" className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          En attente
                        </Badge>
                      )}
                    </div>
                  </div>
                  
                  <p className="text-gray-700 mb-4">{review.text}</p>
                  
                  {!review.replied && (
                    <Button>
                      Générer des réponses
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </>
  );
}