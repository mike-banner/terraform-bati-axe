-- La restitution au partenaire (3 sous-traitants choisis par le chargé d'affaires) est supprimée :
-- le partenaire voit directement les artisans qui se positionnent sur l'AO. La colonne n'a plus d'usage.
-- Données de test uniquement ; la valeur d'audit 'b2b_restitution_sent' est conservée (historique).
ALTER TABLE b2b_requests DROP COLUMN IF EXISTS recommended_pros;
