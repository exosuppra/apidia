import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

export default function GoogleCallback() {
  const [searchParams] = useSearchParams();

  useEffect(() => {
    console.log('🔍 GoogleCallback démarré');
    console.log('URL complète:', window.location.href);
    console.log('Hash:', window.location.hash);
    
    const error = searchParams.get('error');
    
    if (error) {
      console.log('❌ Erreur OAuth détectée:', error);
      if (window.opener) {
        window.opener.postMessage({
          type: 'GOOGLE_AUTH_ERROR',
          error: error
        }, window.location.origin);
      }
      window.close();
      return;
    }

    // Attendre que Supabase traite l'OAuth
    setTimeout(async () => {
      try {
        console.log('🔍 Récupération de la session Supabase...');
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        console.log('📋 Détails de la session complète:', {
          hasSession: !!session,
          hasUser: !!session?.user,
          provider: session?.user?.app_metadata?.provider,
          hasProviderToken: !!session?.provider_token,
          hasProviderRefreshToken: !!session?.provider_refresh_token,
          providerTokenStart: session?.provider_token?.substring(0, 20),
          sessionKeys: session ? Object.keys(session) : [],
          userMetadata: session?.user?.user_metadata,
          appMetadata: session?.user?.app_metadata,
          error: sessionError
        });

        if (sessionError) {
          throw new Error(`Erreur session: ${sessionError.message}`);
        }

        if (!session) {
          throw new Error('Aucune session trouvée');
        }

        // Vérifier si on a le provider_token
        if (!session.provider_token) {
          console.log('❌ Aucun provider_token dans la session');
          
          // Essayer de récupérer via getUser()
          console.log('🔍 Tentative de récupération via getUser...');
          const { data: userData, error: userError } = await supabase.auth.getUser();
          
          console.log('📋 Données utilisateur:', {
            hasUser: !!userData.user,
            hasIdentities: !!userData.user?.identities,
            identitiesCount: userData.user?.identities?.length || 0,
            identities: userData.user?.identities?.map(i => ({
              provider: i.provider,
              hasToken: !!i.identity_data,
            })),
            error: userError
          });
          
          const googleIdentity = userData.user?.identities?.find(
            (identity) => identity.provider === 'google'
          );
          
          if (!googleIdentity) {
            throw new Error('Identité Google non trouvée');
          }
          
          console.log('✅ Identité Google trouvée, mais pas de provider_token dans la session');
          throw new Error('Provider token non disponible - vérifiez la configuration OAuth Google dans Supabase');
        }

        console.log('✅ Provider token Google My Business trouvé !');
        
        if (window.opener) {
          window.opener.postMessage({
            type: 'GOOGLE_AUTH_SUCCESS',
            token: session.provider_token,
            refreshToken: session.provider_refresh_token
          }, window.location.origin);
        }
        
        window.close();
        
      } catch (error) {
        console.error('❌ Erreur lors de la récupération du token:', error);
        if (window.opener) {
          window.opener.postMessage({
            type: 'GOOGLE_AUTH_ERROR',
            error: error.message
          }, window.location.origin);
        }
        window.close();
      }
    }, 1500);
  }, [searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
        <p>Connexion avec Google en cours...</p>
      </div>
    </div>
  );
}