
-- Editions de la foire
CREATE TABLE public.santons_editions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  year INTEGER NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.santons_editions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage santons_editions" ON public.santons_editions FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Bénévoles
CREATE TABLE public.santons_benevoles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  edition_id UUID REFERENCES public.santons_editions(id) ON DELETE CASCADE NOT NULL,
  civilite TEXT,
  prenom TEXT,
  nom TEXT NOT NULL,
  ville TEXT,
  telephone TEXT,
  email TEXT,
  stand_souhaite TEXT,
  souhaite_etre_avec TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.santons_benevoles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage santons_benevoles" ON public.santons_benevoles FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Disponibilités des bénévoles
CREATE TABLE public.santons_disponibilites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  benevole_id UUID REFERENCES public.santons_benevoles(id) ON DELETE CASCADE NOT NULL,
  jour DATE NOT NULL,
  disponible BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(benevole_id, jour)
);
ALTER TABLE public.santons_disponibilites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage santons_disponibilites" ON public.santons_disponibilites FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Santonniers
CREATE TABLE public.santons_santonniers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  edition_id UUID REFERENCES public.santons_editions(id) ON DELETE CASCADE NOT NULL,
  nom_stand TEXT NOT NULL,
  prenom TEXT,
  nom TEXT,
  ville TEXT,
  telephone TEXT,
  email TEXT,
  site_web TEXT,
  presence_info TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.santons_santonniers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage santons_santonniers" ON public.santons_santonniers FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Préférences des santonniers
CREATE TABLE public.santons_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  santonnier_id UUID REFERENCES public.santons_santonniers(id) ON DELETE CASCADE NOT NULL,
  benevole_souhaite TEXT,
  benevole_non_souhaite TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.santons_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage santons_preferences" ON public.santons_preferences FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Planning (affectations)
CREATE TABLE public.santons_planning (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  edition_id UUID REFERENCES public.santons_editions(id) ON DELETE CASCADE NOT NULL,
  jour DATE NOT NULL,
  santonnier_id UUID REFERENCES public.santons_santonniers(id) ON DELETE CASCADE NOT NULL,
  benevole_id UUID REFERENCES public.santons_benevoles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(jour, santonnier_id, benevole_id)
);
ALTER TABLE public.santons_planning ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage santons_planning" ON public.santons_planning FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
