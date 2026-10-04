# MaPrimeRénov' : règles 2026 vérifiées (état au 4 octobre 2026)

Prepared on 2026-10-04 for a deterministic pre-eligibility engine. Scope: MaPrimeRénov' (MPR) **par geste** and **rénovation d'ampleur** (RA, formerly "parcours accompagné"), in metropolitan France and the DROM.

---

## 0. Method, limits and confidence scale

- **Access.** Direct fetches of `*.gouv.fr`, `service-public.fr` and `legifrance.gouv.fr` are blocked by the egress proxy (HTTP 403 on CONNECT, confirmed). All official content was therefore obtained through **WebSearch restricted to official domains** (about 70 queries, until the session's web-search budget ran out). WebSearch returns an extract or summary of the matched page, not the raw PDF.
  - **Rule applied:** a number was accepted only when at least two independent queries or pages returned the identical value.
  - **About the quotes:** they are shown **as returned by the search tool** from the cited page. They are near-verbatim French extracts, so punctuation and wording may differ slightly from the source.
- **Additional official source.** The Anah's own GitHub organisation, [github.com/anahgouv/mes-aides-reno](https://github.com/anahgouv/mes-aides-reno), holds the source code of the official simulator "Mes Aides Réno" (mesaides.france-renov.gouv.fr).
  - It is a **snapshot of 9 Jan 2026**: it encodes the rules at 1 Jan 2026 but still uses the **2025** income table.
  - I used it only to confirm structure: comparison operators, the list of gestes at 1 Jan 2026, and DROM handling. It is cited as **[code Anah janv. 2026]**.
  - It is not a legal text.
- **Confidence levels:**
  - **HIGH:** at least two official pages or texts agree.
  - **MEDIUM:** a single official page, the official code only, or official but ambiguous wording.
  - **LOW:** indirect evidence.
- **Recommendation before production:** have a human open the Anah PDF *Les aides financières en 2026 – Édition septembre 2026* and the page france-renov.gouv.fr/bareme, and check the 36 numbers by eye. This takes about 5 minutes.

---

## TL;DR (what changes the engine logic)

1. **Guichet status in 2026.**
   - Closed from **31 Dec 2025 at 12:00** to **22 Feb 2026**: there was no 2026 budget, because the State ran on the "loi spéciale".
   - **Reopened on Monday 23 Feb 2026** for all parcours.
   - No official announcement of any later 2026 suspension was found.
2. **Par geste: removals effective 1 Jan 2026.** Wall insulation (ITE and ITI) and **biomass boilers** were removed. **This confirms your recollection.**
3. **Par geste: list since 1 Sept 2026** (applies to demands filed from that date).
   - **Metropolitan France:** only **PAC air/eau**, **PAC géothermique or solarothermique**, **raccordement à un réseau de chaleur et/ou de froid**, plus the **audit énergétique** (outside regulatory obligations, and only together with at least one geste) and the **dépose or comblement de cuve à fioul**.
   - **Removed:** all insulation (including combles, rampants, toiture-terrasse and windows), all ventilation (including VMC double flux), all wood and biomass appliances (stoves and inserts), thermodynamic water heaters (CET), and solar-thermal systems (CESI, SSC and hybrid collectors).
   - **Exception:** solar thermal is kept **in the Outre-mer**.
4. **Par geste: who is eligible.** Income categories très modestes, modestes and intermédiaires (**supérieurs excluded**). Dwelling at least 15 years old in metropolitan France, at least 2 years in the DROM, and at least 2 years when the work replaces an oil boiler. Main residence at least 8 months a year. RGE contractor. Demand filed **before works start**.
   - No DPE condition applies in 2026: F and G houses keep par geste access until **31 Dec 2027**, and the DPE obligation is postponed to **1 Jan 2028** in metropolitan France.
5. **Rénovation d'ampleur (RA).**
   - Open to **all four income categories** since 23 Feb 2026, but **only for DPE E, F or G** dwellings.
   - The dwelling must be at least 15 years old, and the works must gain at least 2 DPE classes and include at least 2 insulation gestes.
   - **Mon Accompagnateur Rénov'** is mandatory, and so is a **prior appointment with a France Rénov' advisor**, which produces an attestation to attach.
   - **Since 1 Sept 2026, for maisons individuelles:** the aid is refused if gas or fuel-oil heating or hot water is installed or kept.
   - RA is **not applicable in the Outre-mer** (per [code Anah janv. 2026]).
6. **Income ceilings 2026.** All 36 numbers are verified in the final table below.
   - The thresholds are **inclusive** (RFR ≤ plafond).
   - The **DROM use the "hors Île-de-France" table.**
7. **Cumul in par geste.** MPR can be combined with CEE and local aids, but **MPR + CEE may not exceed 90 % / 75 % / 60 %** of the TTC eligible expense (très modestes / modestes / intermédiaires).

---

## Q1. Status of the MaPrimeRénov' guichet in 2026

**Summary.** The guichet was **open from 23 Feb 2026** for **both par geste and rénovation d'ampleur**. Before that, it was **closed from 31 Dec 2025 at noon until the 2026 finance law was adopted**. I found **no official announcement of a new suspension or closure** for the rest of 2026, including September and October. Restrictions in force:

- **Par geste** is open only to the très modestes, modestes and intermédiaires categories; supérieurs are excluded, as a structural rule.
- **RA** is open to all income categories, but **only for dwellings rated DPE E, F or G**. A **France Rénov' appointment** is mandatory before filing.
- **Quotas:** none published. The 2026 budget of **€3.6 bn** comes with **targets** ("au moins 120 000 rénovations d'ampleur et 150 000 rénovations par geste"), not filing quotas.

| Date | Event | Short quote | Source | Confidence |
|---|---|---|---|---|
| 31 Dec 2025, 12:00 → 22 Feb 2026 | Guichet closed to new demands because there was no 2026 budget ("loi spéciale") | « fermeture temporaire du guichet de dépôt de nouvelles demandes d'aides … à compter du 31 décembre midi et jusqu'à l'adoption de la loi de finances pour 2026 » | https://www.ecologie.gouv.fr/actualites/reouverture-du-guichet-maprimerenov ; https://www.anah.gouv.fr/document/faq-loi-speciale ; https://www.economie.gouv.fr/particuliers/particuliers-ce-qui-change-au-1er-janvier-2026 | HIGH |
| Mon 23 Feb 2026 | Reopening of all parcours; files pending since end 2025 were engaged | « le guichet MaPrimeRénov' réouvre ce lundi 23 février 2026. À partir de cette date, il sera à nouveau possible de déposer des demandes pour l'ensemble des parcours de rénovation » | https://www.info.gouv.fr/actualite/reouverture-de-maprimerenov ; https://france-renov.gouv.fr/actualites/maprimerenov-reouverture-du-guichet-la-promulgation-de-la-loi-de-finances ; https://www.anah.gouv.fr/presse/maprimerenov-reouverture-du-guichet-la-promulgation-de-la-loi-de-finances | HIGH |
| From 23 Feb 2026 | RA open to all incomes, but only for DPE E, F or G; France Rénov' appointment mandatory before an RA demand | « La rénovation d'ampleur est à nouveau ouverte à tous les ménages, mais uniquement pour les logements classés E, F ou G » ; « Un rendez-vous personnalisé avec un conseiller France Rénov' est désormais obligatoire avant le dépôt d'une demande d'aide » (the appointment « donne lieu à une attestation qui sera jointe au dossier ») | https://www.info.gouv.fr/actualite/reouverture-de-maprimerenov-pour-les-renovations-d-ampleur ; info.gouv.fr and france-renov.gouv.fr pages cited above | HIGH |
| Legal basis (demands filed from 1 Jan 2026) | Arrêté du 20 février 2026: before filing for the expense in point 15° of annex 1 (the cases where support by an approved operator is mandatory, i.e. RA), the applicant must attest a prior visit to an advice desk (« guichet », art. L.232-2 of the code de l'énergie) | n/a (search summary) | https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000053569113 | HIGH for the text; MEDIUM for "15° = RA", which I inferred from its wording |
| Budget 2026 | €3.6 bn | « au moins 120 000 rénovations d'ampleur et 150 000 rénovations par geste » | info.gouv.fr and ecologie.gouv.fr pages above | HIGH |
| 17 Aug 2026 | All households create their account on france-renov.gouv.fr, now the single entry point for Anah aid demands | n/a | https://france-renov.gouv.fr/actualites/france-renov-est-desormais-le-point-d-entree-unique-pour-toutes-les-demandes-d-aide-la | MEDIUM |
| 1 Sept 2026 | Major reform: par geste refocused on heat pumps; in RA, a maison individuelle may no longer keep gas or fuel oil (see Q3 and Q4). Décret n° 2026-822 and arrêté du 25 août 2026, published in JORF n° 0199 of 27 Aug 2026, apply to demands filed from 1 Sept 2026 | see Q3 | https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000054750381 ; https://www.legifrance.gouv.fr/loda/id/JORFTEXT000054750363 ; https://www.economie.gouv.fr/actualites/ce-qui-change-en-septembre-2026 ; https://www.info.gouv.fr/actualite/ce-qui-change-en-septembre-2026 | HIGH |
| 30 Sept 2026 | Launch of an "offre intégrée" for heat pumps (purchase, installation, maintenance and financing) aimed at modest households. This adds an offer and does **not** change MPR rules | n/a | https://www.economie.gouv.fr/actualites/lancement-dune-offre-integree-pour-sequiper-dune-pompe-chaleur | MEDIUM |
| Outlook | The PLF 2027 (budget.gouv.fr) says State support « sera orientée en priorité sur les rénovations les plus performantes ». Changes are therefore likely from 2027; nothing is in force yet | n/a | https://www.budget.gouv.fr/documentation/file-download/33478 | MEDIUM |

**Situation in September and October 2026.** The guichet is open under the rules of 1 Sept 2026: the official texts apply « aux demandes déposées à compter du 1er septembre 2026 », and the September 2026 Anah guides describe this regime. **Confidence MEDIUM**, because I found no official page dated October 2026 that explicitly says "the guichet is open". The finding rests on the absence of any suspension notice and on texts in force.

---

## Q2. Income ceilings ("plafonds de ressources") in force since 1 Jan 2026

**Values:** all 36 are in the **Final table** below. They were cross-checked across:

- france-renov.gouv.fr/bareme (several queries);
- the Anah guide *Les aides financières en 2026* (February and September 2026 editions);
- the Anah *MaPrimeRénov' – Mode d'emploi – Septembre 2026*.

**Confidence: HIGH.**

**Inclusive boundary (« inférieur ou égal »): YES.**

- france-renov.gouv.fr/bareme shows each class as « jusqu'à X € » and the next class as « à partir de X+1 € ». For example, a 1-person household outside Île-de-France is violet « jusqu'à 31 185 € » and rose « à partir de 31 186 € ».
- The official Anah simulator code encodes the test as `revenu < plafond + 1 €`, which means ≤ plafond. Example from the 2025 table: `revenu < 23768 + 1 €`.
- The RFR is entered as a whole number (« nombre entier sans décimale »).
- Sources: https://france-renov.gouv.fr/bareme ; [code Anah janv. 2026], file app/règles/revenus.yaml.
- **Confidence: HIGH/MEDIUM.**

**Which RFR is used:**

- economie.gouv.fr (par geste page): « Les revenus retenus sont les revenus fiscaux de référence de l'année N-1, soit ceux de 2025 pour les demandes faites en 2026 ». The applicant must supply « votre dernier avis d'impôt sur les revenus ».
- The RFR is pre-filled from the tax administration. France Rénov' FAQ: it is « communiqué automatiquement par le site des impôts ».
- **The wording is ambiguous.** "Ceux de 2025" most likely means the **avis 2025, covering 2024 income**, which is the only notice available until the summer of 2026. It could also be read as 2025 income. The mesaides.france-renov.gouv.fr barème page appears to be labelled "(revenus 2024)", but this comes from a search extract only (**LOW**).
- **Engine recommendation:** by default, use the RFR on the **most recent tax notice available on the filing date** (in 2026, the avis 2025 on 2024 income), and make the year a parameter.
- **Exact rule: NON VÉRIFIÉ.**
- Source: https://www.economie.gouv.fr/particuliers/faire-des-economies-denergie/maprimerenov-parcours-par-geste-la-prime-pour-la-renovation-energetique ; https://france-renov.gouv.fr/foire-aux-questions/personnes-situation

**Household composition.** Count all persons in the household. If they have separate tax notices, **add up their RFRs**.

- Quote: « Si ces dernières ont des avis d'imposition distincts, le montant à prendre en compte est la somme de leurs "revenus fiscaux de référence" ».
- Sources: Anah guides 2026; France Rénov' FAQ. **Confidence: HIGH.**

**DROM.** The DROM use the **same ceilings as "autres régions"**.

- france-renov.gouv.fr titles its table « Barème hors Île-de-France et en Outre-mer ».
- The Anah titles its table « Plafonds de ressources hors Île-de-France et en Outre-mer au 1er janvier 2026 ».
- **Confidence: HIGH.**

**Annual revision.** The Anah revises the ceilings every year « pour application au 1er janvier », using the change in the consumer price index excluding tobacco between years n-2 and n-1.

- Source: arrêté du 24 mai 2013, https://www.legifrance.gouv.fr/loda/id/JORFTEXT000027481142 . **Confidence: HIGH.**

**Île-de-France or not.** Per the CHANGELOG v2.3.1 of [code Anah janv. 2026]:

- **owner-occupier:** use the address of the **dwelling being renovated**;
- **landlord:** use the address of the **owner's main residence**.

**Confidence: MEDIUM.** This comes from the official code only; I did not find it in a regulatory text.

---

## Q3. MaPrimeRénov' par geste in 2026

### 3.1 Eligible owner statuses

| Status | Eligible? | Source | Confidence |
|---|---|---|---|
| Propriétaire occupant | Yes | economie.gouv.fr par geste page; Anah guide Sept 2026 | HIGH |
| Propriétaire bailleur | Yes | same; https://france-renov.gouv.fr/proprietaire-bailleur | HIGH |
| Usufruitier; holder of a real right conferring use of the property | Yes | Anah guide 2026 (search extract) | MEDIUM |
| Joint owners (indivision) | Yes, if all co-owners agree | Anah guide 2026 (search extract) | MEDIUM |
| Buyer ("acquéreur") | Yes, per the official code (statut 'propriétaire' or 'acquéreur'); exact conditions not checked | [code Anah janv. 2026]; Anah guide extract | MEDIUM |
| Natural person holding shares in an SCI that owns the home they occupy | Yes, treated as an owner-occupier; must provide a **commodat** (loan-for-use contract) | Anah guide 2026 (search extract) | MEDIUM |
| Owner with modest or very modest income who houses someone free of charge | Yes | Anah guide 2026 and France Rénov' FAQ | MEDIUM |
| Nu-propriétaire; legal entities ("personnes morales") | **No** | Anah guide 2026 (search extract) | MEDIUM |
| **Tenant (locataire)** | **No.** MPR is reserved to owners: « accessible à tous les propriétaires, qu'ils habitent leur logement ou le mettent en location » | https://france-renov.gouv.fr/aides/maprimerenov ; [code Anah]: 'non propriétaire' is excluded | HIGH |

### 3.2 Income categories

- Très modestes (bleu), modestes (jaune) and intermédiaires (violet) are **eligible**.
- **Supérieurs (rose) are NOT eligible.** The September 2026 forfait tables mark them « non éligible ». The official code has the excluding condition `ménage . revenu . classe = "supérieure"`.
- Sources: Anah guide Sept 2026; economie.gouv.fr; [code Anah janv. 2026]. **Confidence: HIGH.**

### 3.3 Minimum dwelling age

- **Metropolitan France:** the dwelling must be « construit depuis au moins 15 ans ».
- **Outre-mer:** at least 2 years.
- **Exception for oil boilers:** a dwelling of **at least 2 years** qualifies when the new heating or hot-water equipment replaces an oil boiler. Quote: « À titre exceptionnel, il est possible de bénéficier de MaPrimeRénov' dans un logement de moins de 15 ans pour l'installation d'un nouvel équipement de chauffage et/ou de production d'eau chaude sanitaire en remplacement d'une chaudière au fioul. Les ménages concernés doivent demander simultanément une prime « dépose de cuve à fioul » ».
- Sources: Anah guide Sept 2026 (https://www.anah.gouv.fr/sites/default/files/2026-08/202609_guide-aides-financieres_WEB.pdf) ; https://www.economie.gouv.fr/particuliers/prime-renovation-energetique ; https://france-renov.gouv.fr/aides/mpr ; [code Anah]: `si outre-mer alors au moins 2 ans sinon au moins 15 ans`.
- **Confidence: HIGH.**

### 3.4 Main residence

- The dwelling must be the main residence, « occupé en tant que résidence principale au moins huit mois par an ».
- That means the owner's own main residence or the tenant's ([code Anah]: « la vôtre (propriétaire occupant) ou celle de votre locataire (vous êtes propriétaire bailleur) »).
- Sources: economie.gouv.fr par geste page; [code Anah]. **Confidence: HIGH.**

### 3.5 Landlord commitments

**Core rental commitment (HIGH):**

- Rent the dwelling **as a main residence for 6 years**, starting **within 1 year after the date of the request for payment of the balance** of the prime.
- If the commitment is broken, part of the aid must be repaid. The repayment is 1/6 of the aid per year not rented; that fraction is **MEDIUM**.
- Tell the tenant about the MPR-funded works.
- If the rent is raised, deduct the MPR amount from the cost of works used to justify the increase.

**Additional limits (MEDIUM):**

- A landlord may claim for at most **3 dwellings**.
- The aid is capped at **€20,000 per dwelling over 5 years**.

Sources: https://france-renov.gouv.fr/proprietaire-bailleur ; economie.gouv.fr par geste page; Anah guide Feb 2026.

### 3.6 DPE restrictions

**In 2026 there is no DPE condition for par geste.**

- **Status since 1 Sept 2026:** access to par geste for dwellings rated F or G « est prolongé jusqu'au 31 décembre 2027 en France métropolitaine ».
- **Legal basis:** the arrêté du 25 août 2026 « reporte au 1er janvier 2028 l'obligation de fournir un diagnostic de performance énergétique » in metropolitan France, for the remaining gestes.
- **Earlier step:** décret n° 2025-956 had first extended F and G access for maisons individuelles to 31 Dec 2026, and lifted the obligation to carry out an eligible heating geste until that date.
- **Planned from 1 Jan 2028 (metropolitan France):** maisons individuelles rated F or G lose par geste access but remain eligible for RA (**MEDIUM**).
- Sources: https://www.economie.gouv.fr/actualites/ce-qui-change-en-septembre-2026 ; https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000054750381 ; https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000052212707
- **Confidence: HIGH.**

### 3.7 Quote signature and start of works

**Quote signature (MEDIUM/HIGH):**

- The quote does **not** need to be signed at filing.
- Signing it before the aid is accepted is **« déconseillé »** (discouraged) but **not forbidden**.
- Sources: https://france-renov.gouv.fr/preparer-projet/dossier-demande-aide/guide-geste ; https://france-renov.gouv.fr/actualites/4-regles-dossier-maprimerenov

**Start of works (HIGH):**

- Works must **not** start before the demand is filed: « L'éligibilité à la prime est conditionnée à un dépôt du dossier … avant le démarrage des travaux ».
- Starting before the aid is accepted is strongly discouraged.

**Urgent-works exception (MEDIUM/HIGH):**

- **When it applies:** a heating breakdown during the winter period (**1 Oct to 30 Apr**), or a hot-water breakdown at any time of year.
- **Effect:** works may start first, and the demand must be filed **within 2 months after installation** with the form « Attestation travaux urgents » (applicable since 1 Apr 2025).
- **Inference:** hot-water-only appliances are no longer eligible in metropolitan France since 1 Sept 2026, so the hot-water branch now matters mainly in the DROM (**NON VÉRIFIÉ**).
- Source: https://www.anah.gouv.fr/formulaires-cerfas/attestation-travaux-urgents-demandeur-MPR

### 3.8 RGE requirement

- An RGE-certified contractor is mandatory (« sauf exceptions », i.e. except in specified cases).
- The exceptions themselves are **NON VÉRIFIÉ**.
- Sources: economie.gouv.fr; France Rénov' « 4 règles ». **Confidence: HIGH.**

### 3.9 Eligible gestes in 2026

The decisive date is **the date the demand is filed**:

- From 1 Jan 2026, under the arrêté and décret of 8 Sept 2025 (secured by the décret n° 2026-516 and arrêtés of 12 June 2026).
- From 1 Sept 2026, under the arrêté and décret n° 2026-822 of 25 Aug 2026.

**Official quote listing what was removed on 1 Sept 2026** (economie.gouv.fr and info.gouv.fr, *Ce qui change en septembre 2026*):
> « À partir du 1er septembre 2026, les travaux suivants ne sont plus pris en compte dans le cadre du dispositif MaPrimeRénov' parcours par geste : travaux d'installation d'équipements de chauffage ou de fourniture d'eau chaude sanitaire indépendants fonctionnant au bois ou autres biomasses, pompes à chaleur dédiées à la production d'eau chaude sanitaire, systèmes de ventilation, isolation, équipements de chauffage et de fourniture d'eau chaude sanitaire fonctionnant à l'énergie solaire thermique ou avec des capteurs solaires hybrides (sauf dans les Outre-mer). »

**Anah wording (guide, September 2026 edition):**
> « les forfaits MaPrimeRénov' sont recentrés sur les pompes à chaleur, et les forfaits pour l'isolation, la ventilation et les autres systèmes de chauffage ne seront plus disponibles (hors raccordement à un réseau de chaleur) ».

**Remaining list since 1 Sept 2026, metropolitan France** (economie.gouv.fr par geste page): raccordement à un réseau de chaleur et/ou de froid; pompe à chaleur air/eau; pompe à chaleur géothermique ou solarothermique; plus the « audit énergétique hors obligation réglementaire » (once per dwelling, done « simultanément à au moins un geste de travaux ») and the « dépose ou comblement de cuve à fioul ».

**Removed on 1 Jan 2026 (your recollection is CONFIRMED):**

- The arrêté du 8 septembre 2025 removes the forfaits « correspondant aux chaudières biomasse et aux travaux d'isolation des murs ».
- ecologie.gouv.fr: from 1 Jan 2026, wall insulation and biomass boilers are no longer funded through single gestes. For the rest of 2026, insulation was kept only for combles (attics) and « planchers », and biomass only for stoves.
- The official code dated 9 Jan 2026 confirms both: there is no MPR amount for ITE, ITI or wood boilers.
- Sources: https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000052212786 ; https://www.ecologie.gouv.fr/actualites/reouverture-du-guichet-maprimerenov-30-septembre-reponses-vos-questions ; [code Anah janv. 2026]
- **Confidence: HIGH.**

| Geste | Demands filed 1 Jan – 31 Aug 2026 | Demands filed since 1 Sept 2026 (metropolitan France) | Notes | Confidence |
|---|---|---|---|---|
| PAC air/eau | ✅ | ✅ | Forfait **€5,000 / €4,000 / €3,000** (TM / M / I); expense cap **€12,000**; house or apartment. Hybrid heat pumps were treated as air/eau in the Jan 2026 code; **hybrids after 1 Sept 2026: NON VÉRIFIÉ** | HIGH |
| PAC géothermique / solarothermique | ✅ | ✅ | **€11,000 / €9,000 / €6,000**; cap **€18,000** | HIGH |
| PAC air/air | ❌ (never MPR; CEE only) | ❌ | Not in the official remaining list; the code has no MPR amount | HIGH |
| Chaudière biomasse (bois or granulés) | ❌ (removed 1 Jan 2026) | ❌ | — | HIGH |
| Poêle à bûches or granulés, foyer fermé / insert | ✅ | ❌ | Removed as « équipements … indépendants fonctionnant au bois ou autres biomasses » | HIGH |
| Chauffe-eau thermodynamique | ✅ | ❌ | « PAC dédiées à la production d'ECS » | HIGH |
| Chauffe-eau solaire individuel | ✅ | ❌ metropolitan France; ✅ DROM | « sauf dans les Outre-mer » | HIGH |
| Système solaire combiné (and PVT hot-water collectors) | ✅ | ❌ metropolitan France (DROM: see Q5) | Solar thermal or hybrid | HIGH |
| VMC double flux | ✅ (in the Jan 2026 code, conditioned on an insulation geste) | ❌ | « systèmes de ventilation » | HIGH |
| Wall insulation, exterior (ITE) or interior (ITI) | ❌ (removed 1 Jan 2026) | ❌ | — | HIGH |
| Rampants or combles (including lost-attic floors) | ✅ | ❌ | « isolation » | HIGH |
| Toiture-terrasse | ✅ | ❌ | « isolation » | HIGH |
| Planchers bas | ❌ per the Jan 2026 code (no MPR forfait); an ecologie.gouv.fr extract mentions « planchers » (probably attic floors) | ❌ | Jan–Aug 2026 status is **NON VÉRIFIÉ** but irrelevant now | MEDIUM |
| Windows / joinery (replacing single glazing only) | ✅ | ❌ | Removed as « isolation »; not in the remaining list | HIGH/MEDIUM |
| Dépose or comblement de cuve à fioul | ✅ | ✅ | **€1,200 / €800 / €400**; cap €4,000 (code only) | HIGH (eligibility), MEDIUM (cap) |
| Raccordement réseau de chaleur et/ou de froid | ✅ | ✅ | **€1,200 / €800 / €400**; cap **€1,800** | HIGH |
| Audit énergétique (outside regulatory obligations) | ✅ | ✅ | **€500 / €400 / €300**; cap €800 (code only); once per dwelling; only together with at least one geste | HIGH (eligibility), MEDIUM (cap) |

Forfaits are listed in the order très modestes / modestes / intermédiaires. **Supérieurs are not eligible.**

Sources: economie.gouv.fr par geste page; https://www.economie.gouv.fr/actualites/ce-qui-change-en-septembre-2026 ; Anah guide Sept 2026; https://france-renov.gouv.fr/aides/mpr ; arrêtés of 8 Sept 2025 and 25 Aug 2026; [code Anah janv. 2026], files gestes/*.yaml.

---

## Q4. MaPrimeRénov' rénovation d'ampleur in 2026

**Eligibility conditions:**

| Rule | Value | Source | Confidence |
|---|---|---|---|
| Income categories | **All 4** (TM, M, I, S) since 23 Feb 2026: « à nouveau ouverte à tous les ménages » | info.gouv.fr (Feb 2026) | HIGH |
| DPE before works | **E, F or G only.** Décret n° 2025-956 « recentre le parcours accompagné sur les logements de classe E à G » (in force since 30 Sept 2025). Code: « Avant les travaux, le logement doit avoir une classe de DPE E, F ou G » | https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000052212707 ; info.gouv.fr; [code Anah] | HIGH |
| Dwelling age | **At least 15 years** | economie.gouv.fr RA page; [code Anah] | HIGH |
| Required gain | **At least 2 DPE classes** | economie.gouv.fr RA page; info.gouv.fr; [code Anah] (`sauts minimum: 2`) | HIGH |
| Works content | **At least 2 insulation gestes** (roof, windows or joinery, floors, or walls); RGE contractors | economie.gouv.fr RA page (search extract); [code Anah] | MEDIUM/HIGH |
| Support | **Mon Accompagnateur Rénov' (MAR) is mandatory** | economie.gouv.fr; france-renov.gouv.fr/aides/maprimerenov-renovation-ampleur | HIGH |
| France Rénov' advisor | Appointment **mandatory before filing**; it produces an attestation to attach (arrêté 20 Feb 2026, for demands filed from 1 Jan 2026) | info.gouv.fr; legifrance JORFTEXT000053569113 | HIGH |
| Fossil heating, demands filed since 1 Sept 2026 | **Maison individuelle:** the aid cannot be granted if gas or fuel-oil heating or hot water is kept. Anah: « toute nouvelle demande pour une maison individuelle devra intégrer la décarbonation des systèmes de chauffage et d'eau chaude sanitaire ». economie.gouv.fr (gist): the works programme must not install or keep heating running on fuel oil, gas or coal | https://www.anah.gouv.fr/actualites/electrifions-la-france-et-ses-impacts-sur-l-amelioration-de-l-habitat-prive ; https://www.economie.gouv.fr/actualites/ce-qui-change-en-septembre-2026 ; Anah guide Sept 2026 | HIGH |
| Fossil heating, before 1 Sept 2026 | « Le projet ne doit pas prévoir d'installer un chauffage fonctionnant majoritairement aux énergies fossiles » | [code Anah janv. 2026] | MEDIUM |
| Owner-occupier commitment | Occupy the dwelling for at least 3 years from the request for payment of the balance | economie.gouv.fr RA page (search extract) | MEDIUM |
| Quote | « vous devez attendre l'accord de l'Anah avant de signer le devis » (wait for the Anah's approval before signing the quote) | [code Anah janv. 2026] | MEDIUM |
| Landlords | Probably eligible, with a 6-year rental commitment as in earlier years, but **NON VÉRIFIÉ for 2026** | — | LOW |
| Mandatory energy audit | **NON VÉRIFIÉ.** I found no 2026 official extract stating it | — | — |
| Outre-mer | **Not applicable** in the Outre-mer (`non applicable si: outre-mer`) | [code Anah janv. 2026] | MEDIUM |

**Financing** (for information; the engine does not need it for pre-eligibility):

- **Rates** TM 80 %, M 60 %, I 45 %, S 10 % ([code Anah janv. 2026], **MEDIUM**).
- **Ceiling:** « jusqu'à 80 % des travaux … plafond de travaux de 40 000 € maximum » (info.gouv.fr search extract, **MEDIUM**).
- **Bonus removed:** the « bonus sortie de passoire » no longer exists since 30 Sept 2025 (décret n° 2025-956, **HIGH**).

---

## Q5. Outre-mer (Guadeloupe, Martinique, Guyane, La Réunion, Mayotte)

**What is confirmed:**

| Point | Value | Source | Confidence |
|---|---|---|---|
| Par geste available | Yes in the DROM (Guadeloupe, Martinique, Guyane, La Réunion, Mayotte). Excluded in the COM (the overseas collectivities, e.g. Saint-Martin and Polynesia) | [code Anah]: `conditions excluantes: … outre-mer . COM`; the Anah *Les aides financières 2026 en Outre-mer* guide (Sept 2026 edition) exists | MEDIUM/HIGH |
| Dwelling age | **At least 2 years** (instead of 15) | https://france-renov.gouv.fr/aides/mpr ; [code Anah] | HIGH |
| Income ceilings | Same as hors Île-de-France | france-renov.gouv.fr/bareme; Anah | HIGH |
| Solar thermal after 1 Sept 2026 | **Kept in the Outre-mer** (« sauf dans les Outre-mer ») | economie.gouv.fr and info.gouv.fr *Ce qui change en septembre 2026*; arrêté du 25 août 2026 | HIGH |
| DPE obligation | The postponement to 2028 concerns « France métropolitaine »; the par geste DPE logic is not applied in the DROM | arrêté du 25 août 2026 (notice) | MEDIUM (inference) |
| Rénovation d'ampleur | **Not applicable in the Outre-mer** | [code Anah janv. 2026], MPRA.publicodes | MEDIUM |
| CESI forfait in the DROM (Jan 2026) | €1,600 / €1,300 / €1,000 | [code Anah janv. 2026] | MEDIUM |
| Solar protection, ceiling fans, efficient air conditioners, heat-reflective paint (Mayotte), etc. | In the simulator these are a « bonus outre-mer » (CEE type) with **MPR = 0 €**, so not MPR | [code Anah janv. 2026], gestes/bonus-outre-mer | LOW/MEDIUM |

**What is NON VÉRIFIÉ:**

- The complete list of DROM gestes and forfaits after 1 Sept 2026, beyond solar thermal.
- Whether heat pumps and connection to heating networks are relevant there.
- Any rule specific to Mayotte.

These should be read in the Anah guide *Les aides financières 2026 en Outre-mer – Édition septembre 2026*: https://www.anah.gouv.fr/sites/default/files/2026-08/202609_Guide_AidesFinancieresOutreMer_WEB.pdf (I could not read it directly; a fetch would be blocked).

---

## Q6. MaPrimeRénov' Copropriété

**It exists.** It funds collective works on the common parts of a copropriété (multi-owner building).

- Official pages: « MaPrimeRénov' Copropriété : tout savoir sur l'aide à la rénovation des parties communes » (https://www.economie.gouv.fr/particuliers/faire-des-economies-denergie/maprimerenov-copropriete-tout-savoir-sur-laide-la-renovation-des-parties-communes) and https://france-renov.gouv.fr/aides/maprimerenov-copropriete
- **Confidence: HIGH.**
- → Mark it out of scope.

---

## Q7. Combining with CEE ("primes énergie") and the écrêtement cap

**Par geste:**

- MPR can be combined with **CEE and local authority aids**.
- **Cap (écrêtement):** « Le montant cumulé de MaPrimeRénov' et des certificats d'économie d'énergie (CEE) ne peut pas dépasser » **90 %** (très modestes), **75 %** (modestes) or **60 %** (intermédiaires) of the **TTC eligible expense**.
- Not combinable with the RA ("parcours accompagné") forfait for the same works.
- The code shows 40 % for supérieurs, which is moot since they are excluded.
- Sources: Anah guide Sept 2026 (two separate queries); [code Anah] `pourcentage d'écrêtement`.
- **Confidence: HIGH.**

**Rénovation d'ampleur:**

- Cap per the code: **100 % TM / 90 % M / 80 % I / 50 % S** of the TTC amount ([code Anah janv. 2026]).
- **2026 cap figures: NON VÉRIFIÉ** in any regulatory document.
- **Rules for combining RA with CEE: NON VÉRIFIÉ.**

**CEE side note:** since 1 Sept 2026, the « Coup de pouce Chauffage » bonus for heat pumps is reserved to models holding an official approval ("agrément").

- Source: https://www.economie.gouv.fr/actualites/ce-qui-change-en-septembre-2026 . **Confidence: MEDIUM.**

---

## Q8. How long these rules are stated to apply

| Rule | Validity | Source | Confidence |
|---|---|---|---|
| Income ceilings | Apply since **1 Jan 2026** and are revised every year « pour application au 1er janvier ». The next table is expected on **1 Jan 2027** | arrêté du 24 mai 2013 | HIGH |
| Par geste list (heat pumps, heating networks, audit, oil tank) and RA without gas or fuel oil | Apply to demands **filed from 1 Sept 2026**. **No end date is stated** | arrêté and décret of 25 Aug 2026; economie.gouv.fr | HIGH |
| Par geste access for F and G dwellings / DPE obligation | Access until **31 Dec 2027**; DPE obligation from **1 Jan 2028** (metropolitan France) | arrêté du 25 août 2026; economie.gouv.fr | HIGH |
| Reference documents | Anah *Les aides financières en 2026 – Édition septembre 2026*; *MaPrimeRénov' – Le mode d'emploi – SEPTEMBRE 2026*; *Les aides financières 2026 en Outre-mer – Édition septembre 2026* | anah.gouv.fr | HIGH |
| Outlook | The PLF 2027 announces that support will be refocused on the most efficient renovations, so changes are expected from 2027. A year-end closure like the one on 31 Dec 2025 has not been announced; this point is speculative | budget.gouv.fr | MEDIUM |

**The March 2026 mode d'emploi you listed is superseded.** `https://www.anah.gouv.fr/sites/default/files/2026-03/202603-MPR-modeEmploi_WEB.pdf` is outdated for the par geste list. Use the September 2026 edition: `https://www.anah.gouv.fr/sites/default/files/2026-08/202609-MPR-modeEmploi_WEB.pdf` (document page `https://www.anah.gouv.fr/document/maprimerenov-mode-emploi`).

---

## FINAL TABLE: income ceilings in force since 1 Jan 2026 (RFR in €/year; the category applies if **RFR ≤ value**)

Cross-checked across france-renov.gouv.fr/bareme (several queries), the Anah guide *Les aides financières en 2026* (February and September 2026 editions), and the Anah *MPR mode d'emploi* (September 2026). **Confidence: HIGH.**

### Île-de-France

| Persons in household | Très modestes (bleu) | Modestes (jaune) | Intermédiaires (violet) | Supérieurs (rose) |
|---|---|---|---|---|
| 1 | 24 031 | 29 253 | 40 851 | > 40 851 |
| 2 | 35 270 | 42 933 | 60 051 | > 60 051 |
| 3 | 42 357 | 51 564 | 71 846 | > 71 846 |
| 4 | 49 455 | 60 208 | 84 562 | > 84 562 |
| 5 | 56 580 | 68 877 | 96 817 | > 96 817 |
| Each extra person | + 7 116 | + 8 663 | + 12 257 | + 12 257 |

### Other regions (hors Île-de-France), also used in the DROM

| Persons in household | Très modestes (bleu) | Modestes (jaune) | Intermédiaires (violet) | Supérieurs (rose) |
|---|---|---|---|---|
| 1 | 17 363 | 22 259 | 31 185 | > 31 185 |
| 2 | 25 393 | 32 553 | 45 842 | > 45 842 |
| 3 | 30 540 | 39 148 | 55 196 | > 55 196 |
| 4 | 35 676 | 45 735 | 64 550 | > 64 550 |
| 5 | 40 835 | 52 348 | 73 907 | > 73 907 |
| Each extra person | + 5 151 | + 6 598 | + 9 357 | + 9 357 |

**Formula for n > 5:** plafond(n) = plafond(5) + (n − 5) × increment.

**Sanity check:** every 2026 value is the corresponding 2025 value × about 1.011 (the CPI revision); for example, 2025 IDF 1 person TM = 23 768, and 2026 = 24 031. The official [code Anah janv. 2026] still contains the 2025 table, so **do not use it for 2026 numbers.**

---

## Engine-ready summary (YAML)

```yaml
mpr_2026:
  source_date: "2026-10-04"
  plafonds_rfr:            # RFR <= plafond -> category ; valid for demands in 2026
    idf:
      tres_modeste:  [24031, 35270, 42357, 49455, 56580]
      modeste:       [29253, 42933, 51564, 60208, 68877]
      intermediaire: [40851, 60051, 71846, 84562, 96817]
      increment:     {tres_modeste: 7116, modeste: 8663, intermediaire: 12257}
    hors_idf_et_drom:
      tres_modeste:  [17363, 25393, 30540, 35676, 40835]
      modeste:       [22259, 32553, 39148, 45735, 52348]
      intermediaire: [31185, 45842, 55196, 64550, 73907]
      increment:     {tres_modeste: 5151, modeste: 6598, intermediaire: 9357}
  guichet:
    closed: {from: "2025-12-31T12:00", to: "2026-02-22"}
    open_since: "2026-02-23"
  par_geste:
    categories_eligibles: [tres_modeste, modeste, intermediaire]   # supérieur excluded
    statuts: [proprietaire_occupant, proprietaire_bailleur, usufruitier, titulaire_droit_reel_usage, indivision_avec_accord]  # locataire / nu-propriétaire / personne morale excluded
    residence_principale_min_mois: 8
    age_min_ans: {metropole: 15, drom: 2, metropole_remplacement_chaudiere_fioul: 2}   # fioul exception requires simultaneous 'dépose de cuve' demand
    bailleur: {location_rp_ans: 6, delai_mise_en_location_apres_solde_ans: 1}
    dpe_condition: {none_until: "2027-12-31"}   # F/G houses excluded from 2028-01-01 (metropole)
    depot_avant_travaux: true                   # exception: urgent breakdown (heating 1 Oct-30 Apr; ECS any time), file within 2 months
    rge: true
    gestes_depuis_2026_09_01_metropole: [pac_air_eau, pac_geothermique_ou_solarothermique, raccordement_reseau_chaleur_froid, audit_energetique_hors_obligation, depose_cuve_fioul]
    gestes_1jan_31aug_2026_supplementaires: [poele_buches, poele_granules, foyer_ferme_insert, chauffe_eau_thermodynamique, cesi, ssc, pvt_eau, vmc_double_flux, isolation_rampants_combles, isolation_toiture_terrasse, fenetres_remplacement_simple_vitrage]
    retires_au_2026_01_01: [ite, iti, chaudiere_biomasse]
    drom_maintenu_apres_2026_09_01: [solaire_thermique]
    ecretement_mpr_plus_cee: {tres_modeste: 0.90, modeste: 0.75, intermediaire: 0.60}
  renovation_ampleur:
    categories_eligibles: [tres_modeste, modeste, intermediaire, superieur]
    dpe_avant_travaux: [E, F, G]
    age_min_ans: 15
    gain_min_classes: 2
    min_gestes_isolation: 2
    mon_accompagnateur_renov: mandatory
    rdv_conseiller_france_renov_attestation: mandatory
    maison_individuelle_depuis_2026_09_01: no_gas_no_fuel_heating_or_ecs_kept_or_installed
    outre_mer: not_applicable          # MEDIUM (official simulator code)
```

---

## Points NON VÉRIFIÉS (do not hard-code without a human check)

1. **Exact RFR year.** "N-1, soit ceux de 2025 pour les demandes faites en 2026" is ambiguous: avis 2025 on 2024 income, or 2025 income? I also could not check any derogation for a drop in income (avis N). The default chosen is the most recent tax notice available on the filing date.
2. **Explicit confirmation that the guichet is open on 4 Oct 2026.** I found no notice dated October 2026; the conclusion rests on texts in force since 1 Sept 2026 and the absence of any suspension notice.
3. **2026 quotas or regional/departmental funding envelopes:** none found, and none confirmed.
4. **RA in 2026:**
   - eligibility of landlords and their conditions;
   - whether an energy audit is mandatory;
   - the 2026 écrêtement cap (code: 100/90/80/50 %);
   - combining RA with CEE;
   - exact 2026 rates and work ceilings (code: 80/60/45/10 %; info.gouv.fr: €40,000 maximum);
   - the treatment of apartments under the fossil-heating rule effective 1 Sept 2026.
5. **Hybrid heat pumps (PAC hybrides) after 1 Sept 2026.**
6. **Planchers bas** between 1 Jan and 31 Aug 2026 (extracts conflict; moot since 1 Sept 2026).
7. **The RGE exceptions** behind « sauf exceptions ».
8. **DROM:**
   - full list of eligible gestes and forfaits after 1 Sept 2026, beyond solar thermal;
   - Mayotte specifics;
   - "RA not applicable in the Outre-mer" (official code only).
9. **Landlords:** maximum of 3 dwellings, €20,000 per dwelling over 5 years, repayment of 1/6 per year (single-source extracts).
10. **Which barème applies (Île-de-France or not):** dwelling address for owner-occupiers, owner's main-residence address for landlords (official code changelog only).
11. **Buyers ("acquéreurs")** and their exact conditions in par geste.
12. **The urgent-works derogation after 1 Sept 2026** (the hot-water branch in metropolitan France).
13. **The mapping "15° of annex 1 = rénovation d'ampleur"** in the arrêté of 20 Feb 2026 (inferred from « accompagnement obligatoire »).
14. **Every quote** was returned by the search tool rather than read in the source PDF, so its exact wording is unverified.

---

## Sources (official)

- info.gouv.fr: https://www.info.gouv.fr/actualite/reouverture-de-maprimerenov ; https://www.info.gouv.fr/actualite/reouverture-de-maprimerenov-pour-les-renovations-d-ampleur ; https://www.info.gouv.fr/actualite/ce-qui-change-en-septembre-2026
- ecologie.gouv.fr: https://www.ecologie.gouv.fr/actualites/reouverture-du-guichet-maprimerenov ; https://www.ecologie.gouv.fr/presse/maprimerenov-reouverture-du-guichet-promulgation-loi-finances ; https://www.ecologie.gouv.fr/actualites/reouverture-du-guichet-maprimerenov-30-septembre-reponses-vos-questions ; https://www.ecologie.gouv.fr/sites/default/files/documents/20260423_DP_PLanElectrification.pdf
- economie.gouv.fr: https://www.economie.gouv.fr/particuliers/faire-des-economies-denergie/maprimerenov-parcours-par-geste-la-prime-pour-la-renovation-energetique ; https://www.economie.gouv.fr/particuliers/faire-des-economies-denergie/maprimerenov-renovation-dampleur-tout-savoir-sur-cette-aide ; https://www.economie.gouv.fr/actualites/ce-qui-change-en-septembre-2026 ; https://www.economie.gouv.fr/particuliers/particuliers-ce-qui-change-au-1er-janvier-2026 ; https://www.economie.gouv.fr/actualites/lancement-dune-offre-integree-pour-sequiper-dune-pompe-chaleur ; https://www.economie.gouv.fr/particuliers/faire-des-economies-denergie/maprimerenov-copropriete-tout-savoir-sur-laide-la-renovation-des-parties-communes
- france-renov.gouv.fr: https://france-renov.gouv.fr/bareme ; https://france-renov.gouv.fr/aides/mpr ; https://france-renov.gouv.fr/aides/maprimerenov ; https://france-renov.gouv.fr/aides/maprimerenov-renovation-ampleur ; https://france-renov.gouv.fr/aides/maprimerenov-copropriete ; https://france-renov.gouv.fr/proprietaire-bailleur ; https://france-renov.gouv.fr/preparer-projet/dossier-demande-aide/guide-geste ; https://france-renov.gouv.fr/actualites/4-regles-dossier-maprimerenov ; https://france-renov.gouv.fr/foire-aux-questions/personnes-situation ; https://france-renov.gouv.fr/actualites/maprimerenov-reouverture-du-guichet-la-promulgation-de-la-loi-de-finances ; https://mesaides.france-renov.gouv.fr/aides/bareme-revenus
- anah.gouv.fr: guide Sept 2026 https://www.anah.gouv.fr/sites/default/files/2026-08/202609_guide-aides-financieres_WEB.pdf (page https://www.anah.gouv.fr/document/guide-des-aides-financieres-0226) ; guide Feb 2026 https://www.anah.gouv.fr/sites/default/files/2026-02/Anah-FR-Guide_des_aides_Fev2026_WEB_20260224.pdf ; MPR mode d'emploi Sept 2026 https://www.anah.gouv.fr/sites/default/files/2026-08/202609-MPR-modeEmploi_WEB.pdf ; Outre-mer guide Sept 2026 https://www.anah.gouv.fr/sites/default/files/2026-08/202609_Guide_AidesFinancieresOutreMer_WEB.pdf ; https://www.anah.gouv.fr/document/faq-loi-speciale ; https://www.anah.gouv.fr/actualites/electrifions-la-france-et-ses-impacts-sur-l-amelioration-de-l-habitat-prive ; https://www.anah.gouv.fr/formulaires-cerfas/attestation-travaux-urgents-demandeur-MPR
- legifrance.gouv.fr:
  - Arrêté du 25 août 2026 https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000054750381
  - Décret n° 2026-822 du 25 août 2026 https://www.legifrance.gouv.fr/loda/id/JORFTEXT000054750363
  - JORF n° 0199 du 27 août 2026 https://www.legifrance.gouv.fr/jorf/jo/2026/08/27/0199
  - Décret n° 2026-516 du 12 juin 2026 https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000054264135
  - Arrêté du 12 juin 2026 https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000054264156
  - Arrêté du 20 février 2026 https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000053569113
  - Décret n° 2025-956 du 8 septembre 2025 https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000052212707
  - Arrêté du 8 septembre 2025 https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000052212786
  - Arrêté du 24 mai 2013 https://www.legifrance.gouv.fr/loda/id/JORFTEXT000027481142
- budget.gouv.fr: PLF 2027 https://www.budget.gouv.fr/documentation/file-download/33478
- Official Anah code (not a legal text): https://github.com/anahgouv/mes-aides-reno (snapshot of 9 Jan 2026; files app/règles/index.yaml, revenus.yaml, MPRA.publicodes, ampleur.publicodes, gestes/*). Its predecessor https://github.com/betagouv/reno is archived; it was used only to locate the Anah repository.
