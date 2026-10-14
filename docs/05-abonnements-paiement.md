# Étape 5 — Abonnements et préparation du paiement

## 1. Ce qui est en place

| Élément | État |
|---|---|
| Essai gratuit de 4 jours calculé côté serveur à l'inscription (`TRIAL_DAYS`) | ✅ depuis l'étape 3 |
| Date de fin d'essai affichée (bandeau, page Abonnement, profil) | ✅ |
| Blocage des fonctions IA à l'expiration (code `premium_required` → page Abonnement) ; cours importés, historique et profil restent consultables | ✅ |
| Page Abonnement : état (essai / actif / expiré), formules 1 000 FCFA/mois et 10 000 FCFA/an (« à confirmer » tant que `PRICING_CONFIRMED=1` n'est pas défini), historique des paiements, lien « Gérer mon compte » | ✅ |
| Démarrage d'un paiement (`startCheckout`) avec référence `SAVI-XXXXXXXX`, montant figé, réutilisation d'une tentative récente, limitation à 10 démarrages/heure | ✅ |
| Activation du Premium **uniquement** par `applyPaymentEvent` : signature vérifiée (webhook) ou confirmation manuelle tracée ; idempotent ; contrôle strict du montant et de la devise ; prolongation d'une période encore active | ✅ |
| Page de retour `/abonnement/retour` : état réel lu en base (confirmé / en vérification / échoué), jamais déduit du simple retour de l'élève | ✅ |
| Prestataires : `disabled`, `link` (lien fourni + confirmation manuelle), `webhook` (notification signée générique), `sandbox` (tests et prévisualisation, refusé en production) | ✅ |
| Administration minimale `/admin/paiements` : paiements en attente avec identifiants masqués, confirmation avec numéro de transaction, rejet ; journal d'audit | ✅ |
| Conservation anonymisée de la trace comptable après suppression du compte (`payments.user_id` devient NULL) | ✅ |
| Prestataire mobile money réel (Orange Money, Moov Money, Wave, carte) | ⏳ en attente du choix et des accès du prestataire |

## 2. Parcours

```
Élève ─ clique « Payer 1 000 FCFA » ─▶ startCheckout : paiement `pending`, référence SAVI-… ─▶ page du prestataire
                                                                                     │
      ┌──────────────────────────────────────────────────────────────────────────────┘
      ▼
Prestataire notifie POST /api/paiements/webhook/<prestataire>  (corps brut + X-Savi-Signature)
      ─▶ signature vérifiée ─▶ applyPaymentEvent ─▶ montant/devise identiques ? ─▶ Premium prolongé (30 ou 365 jours)
Élève revient sur /abonnement/retour?ref=SAVI-… ─▶ lit l'état réel (la page se rafraîchit tant que c'est en attente)
```

Avec le prestataire `link` (pas de notification automatique) : page d'instructions (montant exact, référence à indiquer,
bouton vers le lien), bouton « J'ai payé » avec numéro de transaction facultatif, puis un administrateur confirme dans
`/admin/paiements` après avoir vérifié la transaction sur son compte mobile money. Le délai annoncé à l'élève est « en
général sous 24 h ».

## 3. Règles de sécurité appliquées

- Aucune clé ni secret côté navigateur ; les prix viennent du serveur ; le montant est figé à la création du paiement.
- Le webhook n'accepte que le prestataire configuré, vérifie la signature HMAC-SHA256 sur le corps brut avec une
  tolérance de 5 minutes (anti-rejeu), limite le débit par adresse (60/min, adresse hachée) et refuse les corps > 64 Ko.
- Transition `pending → confirmed` unique en base : un rejeu ou une double notification ne prolonge jamais deux fois.
- Montant ou devise différents → paiement marqué `failed` (`amount_mismatch`), rien n'est activé, événement audité.
- Le bac à sable est interdit si `APP_ENV=production` (vérifié au chargement de la configuration et dans l'action).
- Les administrateurs voient seulement : référence, formule, montant, prénom, identifiant masqué, numéro déclaré.
  Aucune route n'expose conversations, documents ou corrections.

## 4. Brancher un prestataire réel

Le code n'invente aucun lien de paiement. Trois options, par ordre de fiabilité :

1. **Agrégateur avec notification serveur** (CinetPay, PayDunya, FedaPay, Ligdicash… selon disponibilité au Burkina
   Faso) : écrire un adaptateur `src/server/billing/providers/<nom>.ts` qui implémente `PaymentProvider`
   (`createCheckout` : appel API de création de transaction → URL ; `parseWebhook` : vérification de la signature ou
   re-vérification par l'API du prestataire → `PaymentEvent`). Compter environ une journée par prestataire, à tester sur
   son environnement de test avant toute mise en production. Commission habituelle : 2 à 4 %.
2. **Lien de paiement + relais signé** : si le prestataire fournit seulement un lien et une notification non signée, un
   petit relais (fonction serverless) peut la re-vérifier et la transmettre à SAVI au format `webhook` signé.
3. **Lien de paiement seul** (`PAYMENT_PROVIDER=link`) : confirmation manuelle dans `/admin/paiements`. Fonctionne dès
   maintenant, adapté à un pilote, pas à l'échelle.

Informations à fournir par l'équipe SAVI : prestataire choisi, accès au compte marchand et à l'environnement de test,
URL publique de l'application (pour le webhook : `https://<domaine>/api/paiements/webhook/<prestataire>`), tarifs
définitifs (`PRICING_CONFIRMED=1`).

## 5. Variables d'environnement

Voir `.env.example` : `APP_ENV`, `PAYMENT_PROVIDER`, `PAYMENT_LINK_URL`, `PAYMENT_CHECKOUT_URL`, `PAYMENT_WEBHOOK_SECRET`,
`ADMIN_IDENTIFIERS`, `PRICING_MONTHLY_XOF`, `PRICING_YEARLY_XOF`, `PRICING_CONFIRMED`, `TRIAL_DAYS`.

## 6. Format du webhook générique (`PAYMENT_PROVIDER=webhook`)

```
POST /api/paiements/webhook/webhook
X-Savi-Signature: t=1760450000,v1=<hex HMAC-SHA256(secret, "<t>.<corps brut>")>
Content-Type: application/json

{"reference":"SAVI-7K3M9PQ2","transaction_id":"MP240914.1234.A56789","status":"success","amount":1000,"currency":"XOF"}
```

`status` accepté : `success|confirmed|paid|accepted` → confirmé ; `failed|cancelled|refused` → échoué ; autre → en attente.
Réponses : `200 {ok:true,outcome}`, `401` signature invalide, `404` prestataire ou référence inconnus, `429` débit.

## 7. Tests

`tests/unit/billing.test.ts` (signature, références, calcul des périodes, masquage, configuration, interdiction du bac à
sable en production) et `tests/integration/billing.test.ts` (paiement en attente, activation idempotente, prolongation,
montant erroné, référence inconnue, confirmation manuelle + audit, webhook HTTP avec signature invalide/valide, suppression
de compte). Total du projet : 64 tests.
