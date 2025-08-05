-- Créer un utilisateur admin de test (à adapter avec votre email)
-- D'abord, vous devez vous inscrire normalement via l'interface
-- Puis exécuter cette requête pour vous donner le rôle admin

-- Exemple : UPDATE profiles SET role = 'admin' WHERE email = 'votre-email@example.com';

-- Ou pour créer directement un profil admin pour un utilisateur existant :
-- INSERT INTO profiles (user_id, email, full_name, role) 
-- VALUES ('uuid-de-votre-utilisateur', 'admin@bic.org', 'Administrateur BIC', 'admin');