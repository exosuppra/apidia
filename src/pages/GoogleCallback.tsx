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
        
        console.log('Session:', {
          hasSession: !!session,
          hasUser: !!session?.user,
          provider: session?.user?.app_metadata?.provider,
          error: sessionError
        });

        if (sessionError) {
          throw new Error(`Erreur session: ${sessionError.message}`);
        }

        if (!session) {
          throw new Error('Aucune session trouvée');
        }

        // Récupérer le provider_token qui contient le vrai token Google My Business
        console.log('🔍 Récupération du provider token...');
        const { data: providerData, error: providerError } = await supabase.auth.getUser();
        
        if (providerError) {
          throw new Error(`Erreur provider: ${providerError.message}`);
        }

        // Le provider token est dans l'identité du provider
        const googleIdentity = providerData.user?.identities?.find(
          (identity) => identity.provider === 'google'
        );

        console.log('Google identity:', {
          found: !!googleIdentity,
          hasToken: !!googleIdentity?.identity_data?.token,
        });

        if (!googleIdentity?.identity_data) {
          throw new Error('Token Google My Business non trouvé');
        }

        console.log('✅ Token Google My Business trouvé');
        
        if (window.opener) {
          window.opener.postMessage({
            type: 'GOOGLE_AUTH_SUCCESS',
            token: session.provider_token, // Utiliser le provider_token de la session
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
    }, 1000);
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