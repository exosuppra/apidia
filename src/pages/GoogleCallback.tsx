import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";

export default function GoogleCallback() {
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const error = searchParams.get('error');
    const code = searchParams.get('code');
    
    if (error) {
      // Envoyer l'erreur au parent
      if (window.opener) {
        window.opener.postMessage({
          type: 'GOOGLE_AUTH_ERROR',
          error: error
        }, window.location.origin);
      }
      window.close();
      return;
    }

    if (code) {
      // Pour récupérer le token, on devrait normalement faire un appel à l'API Google
      // Mais ici on va essayer une approche différente via Supabase
      const fragment = window.location.hash.substring(1);
      const params = new URLSearchParams(fragment);
      const accessToken = params.get('access_token');
      const refreshToken = params.get('refresh_token');
      
      if (accessToken) {
        // Envoyer le token au parent
        if (window.opener) {
          window.opener.postMessage({
            type: 'GOOGLE_AUTH_SUCCESS',
            token: accessToken,
            refreshToken: refreshToken
          }, window.location.origin);
        }
        window.close();
        return;
      }
    }

    // Si aucun code ni token, attendre un peu puis fermer
    setTimeout(() => {
      if (window.opener) {
        window.opener.postMessage({
          type: 'GOOGLE_AUTH_ERROR',
          error: 'Aucun token reçu'
        }, window.location.origin);
      }
      window.close();
    }, 2000);
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