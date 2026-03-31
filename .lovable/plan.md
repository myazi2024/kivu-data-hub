

# Réécriture de la page "À propos du BIC"

## Objectif
Enrichir le contenu de la page About avec un texte professionnel, détaillé et fidèle à ce que fait réellement la plateforme BIC : une plateforme numérique d'information cadastrale en RDC, basée à Goma.

## Modifications dans `src/pages/About.tsx`

### Structure proposée (6 sections au lieu de 2)

1. **Qui sommes-nous ?** — Présentation du BIC comme plateforme numérique dédiée à la transparence foncière en RDC. Mention du contexte : insécurité foncière, fragmentation des archives, besoin de digitalisation. Basé à Goma, Nord-Kivu.

2. **Notre mission** — Rendre l'information cadastrale accessible, fiable et vérifiable pour les citoyens, les professionnels du droit, les institutions et les investisseurs. Contribuer à la réduction des litiges fonciers par la transparence des données.

3. **Ce que nous faisons** — Liste des services concrets : recherche cadastrale en ligne, carte interactive, vérification d'hypothèques, historique fiscal, demandes de titre foncier, expertise immobilière, demandes de mutation, suivi des litiges, certificats de conformité cadastrale (CCC).

4. **Notre méthode** (enrichie) — Détailler les 4-5 piliers méthodologiques :
   - Collecte et numérisation des données cadastrales existantes
   - Enquêtes terrain et remontées communautaires
   - Cartographie interactive (OpenStreetMap, Mapbox)
   - Modélisation statistique et croisement de sources
   - Vérification juridique (titres, hypothèques, litiges)

5. **Notre engagement** — Ton sur la rigueur des données, la neutralité, la protection des données personnelles, et l'accessibilité numérique.

6. **Image** — Conserver l'illustration existante, repositionnée après "Qui sommes-nous".

### Détails techniques
- Fichier unique : `src/pages/About.tsx`
- Ajout d'icônes lucide-react pour chaque section (Target, Briefcase, Layers, ShieldCheck)
- Pas de nouveaux composants, juste enrichissement du contenu JSX existant
- Conserver Navigation + Footer + image existante

