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
      
      // Vérifier la session actuelle
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      console.log('🔍 Session actuelle:', { 
        session: session?.user?.id, 
        accessToken: session?.access_token ? 'PRÉSENT' : 'ABSENT',
        error: sessionError 
      });
      
      if (!session) {
        throw new Error('Pas de session active');
      }
      
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
      
      const currentUrl = window.location.origin;
      console.log('🚀 Ouverture popup Google OAuth:', {
        origin: currentUrl,
        redirectTo: `${currentUrl}/google-callback`
      });
      
      // Construire l'URL OAuth Google manuellement
      const supabaseUrl = 'https://krmeineyonriifvoexkx.supabase.co';
      const redirectUri = `${currentUrl}/google-callback`;
      const oauthUrl = `${supabaseUrl}/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(redirectUri)}&scopes=https://www.googleapis.com/auth/business.manage`;
      
      // Créer une popup pour Google OAuth
      const popup = window.open(
        oauthUrl, 
        'google-oauth', 
        'width=500,height=600,scrollbars=yes,resizable=yes'
      );
      
      if (!popup) {
        throw new Error('Popup bloquée par le navigateur');
      }
      
      // Écouter les messages de la popup
      const handlePopupMessage = async (event: MessageEvent) => {
        if (event.origin !== window.location.origin) return;
        
        if (event.data.type === 'GOOGLE_AUTH_SUCCESS') {
          console.log('✅ Token Google reçu');
          popup.close();
          window.removeEventListener('message', handlePopupMessage);
          
          // Attendre un peu que la session soit synchronisée
          setTimeout(async () => {
            try {
              // Vérifier la nouvelle session
              const { data: { session } } = await supabase.auth.getSession();
              console.log('🔍 Session après Google OAuth:', {
                userId: session?.user?.id,
                hasToken: !!session?.access_token
              });
              
              console.log('📤 Tentative d\'appel store-google-token avec:', {
                googleToken: event.data.token ? 'PRÉSENT' : 'ABSENT',
                refreshToken: event.data.refreshToken ? 'PRÉSENT' : 'ABSENT'
              });
              
              // Stocker le token Google pour l'utilisateur actuel
              const storeResult = await supabase.functions.invoke('store-google-token', {
                body: { 
                  googleToken: event.data.token,
                  refreshToken: event.data.refreshToken 
                }
              });
              
              console.log('📥 Résultat store-google-token:', {
                data: storeResult.data,
                error: storeResult.error
              });
              
              if (storeResult.error) {
                console.error('❌ Erreur stockage token:', storeResult.error);
                toast({
                  title: "Erreur",
                  description: `Impossible de sauvegarder le token Google: ${storeResult.error.message}`,
                  variant: "destructive",
                });
              } else {
                console.log('✅ Token stocké avec succès');
                toast({
                  title: "Succès",
                  description: "Compte Google lié avec succès !",
                });
                // Recharger les établissements
                loadBusinesses();
              }
            } catch (error) {
              console.error('❌ Erreur lors du traitement:', error);
              toast({
                title: "Erreur",
                description: `Problème de synchronisation: ${error.message}`,
                variant: "destructive",
              });
            }
          }, 1000);
        } else if (event.data.type === 'GOOGLE_AUTH_ERROR') {
          popup.close();
          window.removeEventListener('message', handlePopupMessage);
          toast({
            title: "Erreur",
            description: event.data.error,
            variant: "destructive",
          });
        }
      };
      
      window.addEventListener('message', handlePopupMessage);
      
      // Vérifier si la popup est fermée manuellement
      const checkClosed = setInterval(() => {
        if (popup.closed) {
          clearInterval(checkClosed);
          window.removeEventListener('message', handlePopupMessage);
          setGoogleLoading(false);
        }
      }, 1000);
      
    } catch (error) {
      console.error('❌ Erreur popup Google:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'ouvrir la fenêtre de connexion Google",
        variant: "destructive",
      });
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
                  Connectez votre compte Google My Business pour accéder à vos établissements tout en restant connecté à ApidIA.
                </p>
                <div className="space-y-2">
                  <p className="text-sm text-amber-600 bg-amber-50 p-2 rounded">
                    ⚠️ Pour accéder à Google My Business, vous devez vous connecter avec Google. Après avoir autorisé l'accès, revenez vous connecter à ApidIA avec vos identifiants habituels.
                  </p>
                  <div className="flex gap-3 justify-center">
                    <Button onClick={handleGoogleLogin} disabled={googleLoading}>
                      {googleLoading ? "Connexion..." : "Se connecter avec Google"}
                    </Button>
                    <Button variant="outline" onClick={loadBusinesses}>Actualiser</Button>
                  </div>
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