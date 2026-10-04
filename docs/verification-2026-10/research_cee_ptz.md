# CEE / Coup de pouce and éco-PTZ: regulatory check as of 2026-10-04

## 0. How this was checked (read first)

- **Access.** I could not read any official page directly. The egress proxy returns 403 for every `*.gouv.fr` host, and also for `ademe.fr`, `calculateur-cee.ademe.fr`, `atee.fr` and `anil.org` (tested with curl and WebFetch). Every finding comes from **WebSearch result summaries limited to official domains**: ecologie.gouv.fr, legifrance.gouv.fr, economie.gouv.fr, service-public.fr, france-renov.gouv.fr, anah.gouv.fr and bofip.impots.gouv.fr.
- **Quotes.** French text in « » is the wording the search tool returned from the official page. It is usually verbatim, but I could not check it on the page itself. Before hard-coding anything, re-read the consolidated texts on Légifrance:
  - arrêté du 29/12/2014 « modalités », art. 3-1 and following;
  - arrêté du 22/12/2014 « opérations standardisées », annexes;
  - Code de l'énergie, art. R221-22;
  - CGI, art. 244 quater U.
- **Search budget.** The session's search quota ran out (200/200, shared with other agents) after about 45 queries from this agent. Because of that:
  - B6 (éco-PTZ) got only one query;
  - C7 and C8 got none.
  - These gaps are listed in §9 as NON VÉRIFIÉ.
- **Confidence scale:**
  - **High:** at least two official sources agree, or a Légifrance text matches a ministry page.
  - **Medium:** one official source, or sources that disagree slightly.
  - **Low:** indirect or garbled evidence.

---

## A1. Coup de pouce « Chauffage » (individual homes)

### Status in 2026: in force, but redesigned (High)
- From 1 Jan 2026 the scheme works differently. The € minimums of the old charters are gone: « Les montants de primes des anciennes chartes « Coup de pouce » ne sont plus applicables pour les opérations engagées depuis le 1er janvier 2026 ».
  - Sources: [ecologie.gouv.fr, CdP Chauffage](https://www.ecologie.gouv.fr/politiques-publiques/coup-pouce-chauffage) and [economie.gouv.fr, CdP chauffage](https://www.economie.gouv.fr/particuliers/faire-des-economies-denergie/comment-beneficier-de-la-prime-coup-de-pouce-chauffage). Page dates not shown; the list of offers was updated 17/07/2026.
- Companies had to send a newly signed charter to the DGEC (energy directorate) **before 1 Feb 2026**, including former signatories, to make CdP offers for operations engaged from 01/01/2026.
- The bonus is now a **multiplier on the CEE volume** (kWh cumac), not a regulated € amount. Each signatory sets its own € prime and publishes it in the PDF « Les offres Coup de pouce » ([example, updated 10/03/2026](https://www.ecologie.gouv.fr/sites/default/files/documents/Les%20offres%20Coup%20de%20pouce%20-%20Chauffage%20-%20maj%2010-03-2026.pdf)).
- **Trap:** some search snippets still show old minimums such as « 4 000 € PAC ménages modestes » or « 700 € réseau de chaleur ». These come from pre-2026 charters. Do not use them.

### End date
- **Heat pumps (BAR-TH-171/172), High.** The September 2025 CEE newsletter says: « Le Coup de pouce « Chauffage » associé aux fiches BAR-TH-171 et BAR-TH-172 est prolongé jusqu'à la fin de la 6ème période, soit pour les opérations engagées jusqu'au **31 décembre 2030** et achevées jusqu'au **31 décembre 2031** ».
  - Source: [Lettre d'information CEE, Sept 2025](https://www.ecologie.gouv.fr/sites/default/files/documents/2025-09%20lettre%20d'infos%20CEE%20vf.pdf). The ecologie.gouv.fr CdP page says the same.
- **Other equipment (biomass, combined solar system, heat network), Medium.** Probably also engaged ≤ 31/12/2030. Evidence:
  - economie.gouv.fr says the solar-system premium must be requested « au plus tard le 31 décembre 2030 »;
  - an ambiguous Légifrance summary mentions « IV bis… engagées jusqu'au 31 décembre 2030 et achevées jusqu'au 31 décembre 2031 ».

### Existing heating that must be removed
| Existing system | CdP Chauffage 2026 | Confidence / source |
|---|---|---|
| Individual coal, oil or gas boiler | **Eligible.** economie.gouv.fr: « remplacement d'une chaudière au gaz, au charbon, ou au fioul ». Arrêté du 29/05/2026: equipment that « remplace une chaudière individuelle au charbon, au fioul ou au gaz ». | High |
| Gas **condensing** boiler | **NON VÉRIFIÉ.** One summary carries the old qualifier « autre qu'à condensation »; the 2026 pages found only say « au gaz ». | Low |
| Electric heating | Not in any 2026 CdP list → **no CdP bonus**. The standard, non-bonified CEE may still apply (NON VÉRIFIÉ). | Medium |
| Coal stove or insert | Only as the case where a wood appliance (BAR-TH-112) replaces it. | Low–Medium |
| Collective boiler | Separate scheme: **CdP « Chauffage des bâtiments résidentiels collectifs et tertiaires »** (BRCT). In force for operations engaged from 01/01/2026; offers list updated 31/07/2026 ([page](https://www.ecologie.gouv.fr/politiques-publiques/coup-pouce-chauffage-batiments-residentiels-collectifs-tertiaires)). End date NON VÉRIFIÉ. | Medium |

### Qualifying new equipment and bonus, for operations engaged in October 2026
| New equipment (fiche) | Conditions | Bonus on CEE volume | Confidence |
|---|---|---|---|
| Air/water heat pump (BAR-TH-171) | Replaces a coal/oil/gas boiler; **main residence only** (since 01/10/2025); since 01/09/2026 the **model must hold the « agrément qualité et résilience industrielle »** | **×5** | High |
| Water/water or brine/water heat pump, i.e. geothermal (BAR-TH-172) | Same conditions as BAR-TH-171 | **×5** | High |
| Individual biomass boiler (BAR-TH-113) | Replaces a coal/oil/gas boiler | ×5 | Medium |
| Combined solar system (BAR-TH-143) | Replaces a coal/oil/gas boiler; main residence (arrêté du 27/12/2025); **since 01/09/2026, heating and/or hot water fully decarbonised after the works** | ×2 | Medium |
| Connection of a house to a heat network (BAR-TH-137) | Replaces a coal/oil/gas boiler; network must be « efficace » | **×2 modest households / ×1.5 others** | Medium |
| High-performance wood appliance (BAR-TH-112) | Replaces a coal heating appliance | ×5 modest / ×4 others | Low–Medium |
| Hybrid heat pump (BAR-TH-159) | Not in any 2026 list (economie.gouv.fr lists only biomass, approved heat pumps, combined solar, heat network) | **NON VÉRIFIÉ**, probably not eligible | Low |

Notes on the heat-pump bonus:
- **Coefficient.** The [arrêté du 6 septembre 2025](https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000052212320) sets ×6 for operations engaged 01/10/2025–31/03/2026, then ×5 from 01/04/2026. The September 2025 newsletter says ×5 from 01/10/2025. Either way the coefficient is **×5 in October 2026**. The same arrêté **excludes secondary residences** from the CdP for BAR-TH-171/172.
- **Model approval.** The [arrêté du 29 mai 2026](https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000054152008) applies to operations engaged from 01/09/2026. It sets ×5 when the heat pump replaces a coal/oil/gas boiler **and** the model is approved under the [décret n° 2026-413 du 29/05/2026](https://www.legifrance.gouv.fr/loda/id/JORFTEXT000054151822/2026-06-04).
  - The approved list is the [arrêté du 2 juillet 2026](https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000054388298), amended by the [arrêté du 29 juillet 2026](https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000054708473).
  - economie.gouv.fr confirms: « ne s'applique qu'aux pompes à chaleur figurant sur la liste officielle des modèles agréés, fixée par l'arrêté du 2 juillet » ([Ce qui change en septembre 2026](https://www.economie.gouv.fr/actualites/ce-qui-change-en-septembre-2026)).
- **Fiche versions and controls.** BAR-TH-171 vA78-4 has applied since 01/01/2026 ([arrêté du 15/12/2025](https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000053043176)); that arrêté also raises controls towards 100 % on-site checks by 2028. BAR-TH-172 vA82-5 applies from 01/09/2026.

### Who can get it
- **Main residence only** for BAR-TH-171/172. Newsletter: « exclusion des résidences secondaires du Coup de pouce Chauffage pour les fiches BAR-TH-171 et BAR-TH-172 ». Secondary residences can still get standard, non-bonified CEE. (High)
- economie.gouv.fr: « Si vous êtes propriétaire, vous pouvez obtenir cette prime pour votre résidence principale ». Whether a **tenant** can get the CdP is NON VÉRIFIÉ.

### Income bonus and household categories
- The CdP is **open to all households**. In the 2026 rules found, only two items carry a regulatory income split: the heat network (×2 vs ×1.5) and the wood appliance (×5 vs ×4). For heat pumps, biomass and combined solar the coefficient is the same for everyone. Any extra for modest households comes from each signatory's offer (my inference).
- 2026 CEE ceilings come from the [arrêté du 22 décembre 2025 « portant actualisation des plafonds de revenus pour l'année 2026 »](https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000053165580), which says it is built « en s'appuyant sur les plafonds 2026 de l'Anah ». It applies to operations engaged from 01/01/2026.
- **Mapping (Medium):**
  - CEE « ménages en situation de **précarité énergétique** » = Anah **« très modestes »** scale. Three summaries say so; one summary has the two labels inverted.
  - CEE **« ménages modestes »** = Anah **« modestes »** scale (High: economie.gouv.fr, « ménage modeste en 2026 … 22 259 € pour 1 personne (hors Île-de-France) », plus the Légifrance summary).
  - Whether « modestes » legally includes the précarité households is NON VÉRIFIÉ, though it is likely.

| Household size | Précarité (= Anah très modestes) IDF | Précarité, other regions | Modestes (= Anah modestes) IDF | Modestes, other regions |
|---|---|---|---|---|
| 1 | 24 031 € | 17 363 € | 29 253 € | 22 259 € |
| 2 | 35 270 € | 25 393 € | 42 933 € | 32 553 € |
| 3 | 42 357 € | 30 540 € | 51 564 € | 39 148 € |
| 4 | 49 455 € | 35 676 € | 60 208 € | 45 735 € |
| 5 | 56 580 € | 40 835 € | 68 877 € | 52 348 € |
| Each extra person | +7 116 € | +5 151 € | +8 663 € | +6 598 € |

- The 1-person and per-extra-person values also match the Anah 2026 guide ([Anah, Feb 2026](https://www.anah.gouv.fr/sites/default/files/2026-02/Anah-FR-Guide_des_aides_Fev2026_WEB_20260224.pdf); [france-renov.gouv.fr/bareme](https://france-renov.gouv.fr/bareme)). (High)
- The 3–5 person rows come from one Légifrance summary. (Medium)
- Which year of « revenu fiscal de référence » is used: NON VÉRIFIÉ.

---

## A2. Coup de pouce « Rénovation performante d'une maison individuelle » / « Rénovation d'ampleur »

- **« Rénovation performante d'une maison individuelle » no longer exists (High).** The [arrêté du 19 décembre 2023](https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000048680133) repealed it together with BAR-TH-164 « Rénovation globale d'une maison individuelle ».
  - BAR-TH-164 covered operations engaged up to 31/12/2023, to be completed by 31/12/2025.
  - Since 01/01/2024 it is replaced by **BAR-TH-174** (house) and **BAR-TH-175** (apartment), both « France métropolitaine », and by the **CdP « Rénovation d'ampleur des maisons et appartements individuels »** ([page](https://www.ecologie.gouv.fr/politiques-publiques/coup-pouce-renovation-dampleur-maisons-appartements-individuels)).
- **2026 timeline:**
  - **[Arrêté du 7 janvier 2026](https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000053373748).** Extends the CdP Rénovation d'ampleur (and the CdP Rénovation performante bâtiment résidentiel collectif) for operations engaged **from 17/01/2026**, with **no completion deadline** and **secondary residences excluded**. (Medium–High)
    - The government release says « prolongée pour les opérations engagées à compter du 1er janvier 2026. Les résidences secondaires en seront toutefois désormais exclues ». The **1 January vs 17 January** discrepancy is unresolved.
  - **BAR-TH-174/175 eligibility.** Limited to dwellings rated **DPE E, F or G before works**, in at most **two stages**. The second stage must reach at least C (from F or G) or at least B (from E). (Medium)
  - **[Arrêté du 17 août 2026](https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000054734487)** (JO 23/08/2026), for operations engaged **from 01/09/2026**:
    - it « recentre la bonification Coup de pouce sur les **maisons individuelles du parc social** »;
    - BAR-TH-174 requires heating **and** hot water to be **fully decarbonised after works**;
    - CEE cumulation rules change.
    - Operations engaged up to 31/08/2026 under earlier versions had to be listed with the DGEC by 18/09/2026 ([Flash Info 24/08/2026](https://www.ecologie.gouv.fr/sites/default/files/documents/2026-08-24%20Flash%20Info%20Recencement%20BAR-TH-174%20et%20BAR-TH-175.pdf)). (Medium–High)
- **Engine consequence (Medium).** For a **private household** with an operation engaged on or after 01/09/2026, treat the CdP Rénovation d'ampleur as **not available**. Standard BAR-TH-174/175 CEE (without the bonus) may still apply if the conditions above are met.
- One summary says the CdP targeted households not eligible for Anah aid, such as homes under 15 years old and social landlords. (Low; do not encode.)

---

## A3. General conditions of standard CEE operations

### Building age (High)
- « Bâtiment résidentiel existant depuis plus de 2 ans à la date d'engagement de l'opération » (fiche [BAR-EN-101 vA64-6](https://www.ecologie.gouv.fr/sites/default/files/documents/BAR-EN-101%20vA64-6%20%C3%A0%20compter%20du%2001-01-2025_0.pdf)).
- [France Rénov', CEE page](https://france-renov.gouv.fr/aides/cee): the dwelling must be completed more than two years ago.

### RGE (High for building-works fiches)
- The fiches require the professional to be « titulaire d'un signe de qualité conforme aux exigences prévues à l'article 2 du décret n° 2014-812 du 16 juillet 2014 », i.e. RGE.
- The [France Rénov' CEE page](https://france-renov.gouv.fr/aides/cee) and the [ecologie.gouv.fr RGE page](https://www.ecologie.gouv.fr/politiques-publiques/label-reconnu-garant-lenvironnement-rge) agree.
- Checking each fiche individually is still recommended.

### Who can benefit (High)
- Owner-occupiers, landlords and **tenants**, for a **main or secondary** residence (France Rénov' CEE page).
- **Exceptions:** the Coup de pouce bonuses exclude secondary residences:
  - BAR-TH-171/172, since 01/10/2025;
  - Rénovation d'ampleur, since January 2026;
  - BAR-TH-143 bonus, main residence only.

### Timing rule (High)
- **Date d'engagement** = « date d'acceptation du contrat de réalisation de l'opération par le bénéficiaire (par exemple : date d'acceptation du devis ou du bon de commande), matérialisée par la date de signature de ce contrat ».
  - Sources: [arrêté du 4 septembre 2014](https://www.legifrance.gouv.fr/loda/id/JORFTEXT000029460644) (consolidated) and the [CEE Q&A](https://www.ecologie.gouv.fr/politiques-publiques/questions-reponses-dispositif-cee).
- **Rôle actif et incitatif** ([C. énergie art. R221-22](https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000046816614)): « toute contribution directe, quelle qu'en soit la nature », from the CEE applicant or a contracted intermediary, that makes the operation possible.
  - The contribution must come **before the operation is triggered**.
  - Proof must be dated **no later than the date d'engagement**.
  - « aucun avenant au document de preuve postérieur à l'engagement de l'opération ne sera admis par le PNCEE ».
- **14-day exception for individuals and syndicats de copropriétaires.** Introduced by [décret n° 2021-1662 du 16/12/2021](https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000044505589); still in R221-22 and the arrêté du 4/09/2014:
  - « Le cadre contribution est envoyé au bénéficiaire avant la date d'engagement de l'opération ou, lorsque le bénéficiaire est une personne physique ou un syndicat de copropriétaires, **au plus tard quatorze jours après la date d'engagement de l'opération, et en tout état de cause avant la date de début des travaux** ».
  - The value of the contribution must also be fixed within those 14 days and before works start.
- **What this means for a quote already signed.** It is **not automatically ineligible** for a household. It stays eligible if the CEE offer is formalised **within 14 days of the quote signature AND before works start**. After 14 days, or once works have started, the operation is **ineligible**.
  - Obligés may apply stricter internal rules (NON VÉRIFIÉ).
  - No change to this rule was found in the P6 [arrêté du 21/12/2025](https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000053158200). That arrêté extends the maximum contract length for legal-entity beneficiaries from 4 to 5 years and adds data to the CEE file.
- **Timing rules inside BAR-EN-101 (Medium–High):**
  - a technical visit before the quote is drawn up;
  - « Un délai minimal de sept jours francs est respecté entre la date d'acceptation du devis et la date de début des travaux ».
  - Whether the same applies to BAR-EN-102/103 is NON VÉRIFIÉ.

### Fiche status in October 2026 (6th period started 01/01/2026)
| Fiche | Status found | Confidence |
|---|---|---|
| BAR-EN-101 (attic/roof insulation) | In force (vA64-6). The fiche PDF says « La présente fiche est abrogée à compter du **1er mai 2027** ». | Medium |
| BAR-EN-102 (walls) | In force (vA65-4); repeal scheduled 1 May 2027 | Medium |
| BAR-EN-103 (floor) | In force (vA64-6); repeal scheduled 1 May 2027 | Medium |
| BAR-EN-104 (windows) | NON VÉRIFIÉ | — |
| BAR-TH-171 / 172 | In force; modified for 2026 (see A1) | High |
| BAR-TH-129 (air/air heat pump) | In force (vA27-3 since 01/04/2018, new « Partie A » from 01/07/2026); **no repeal found** | Medium |
| BAR-TH-148 (heat-pump water heater) | vA78-4 since 01/01/2026 | Medium |
| BAR-TH-101 (solar water heater, mainland) | vA78-3 since 01/01/2026 | Medium |
| BAR-TH-112 (wood appliance) | In the catalogue; current version NON VÉRIFIÉ | Low |
| BAR-TH-113 (biomass boiler) | vA79-4 since 01/01/2026 | Medium |
| BAR-TH-125 (double-flow ventilation) | In the catalogue; current version NON VÉRIFIÉ | Low |
| BAR-TH-164 (global house renovation) | **Repealed** (operations engaged ≤ 31/12/2023) → replaced by BAR-TH-174/175 | High |
| BAR-TH-106 (high-performance gas boiler) | Repealed since 01/01/2024 (fossil-fuel fiches removed) | High |

Other notes on fiches:
- The **1 May 2027 repeal date** was introduced by the 64th arrêté ([CSE report](https://www.ecologie.gouv.fr/sites/default/files/documents/1%20-%2064%C3%A8me%20arr%C3%AAt%C3%A9%20CEE%20-%20Rapport%20vCSE.pdf)). Summaries list it for BAR-EN-101/102/103/105/106/107 and BAT/IND equivalents, though the lists differ between summaries. New versions may be published before that date.
- Several fiches get a new « Partie A » (attestation model) from 01/07/2026.
- Other repeals found are not residential-relevant:
  - BAR-EQ-110 (LED lighting in common areas), repealed in February 2026;
  - TRA-SE-104 and AGRI-EQ-110 (arrêté du 18/09/2026).

---

## A4. CEE in Outre-mer (DROM)

- **The scheme applies in the DROM** (art. 73 territories: Guadeloupe, Guyane, Martinique, La Réunion, Mayotte), per the [CEE Q&A](https://www.ecologie.gouv.fr/politiques-publiques/questions-reponses-dispositif-cee). (Medium–High)
- **Mainland vs overseas fiches.** A fiche « s'applique exclusivement à la France métropolitaine lorsqu'il existe une fiche équivalente applicable exclusivement à la France d'outre-mer ». For CEE, overseas France except Saint-Pierre-et-Miquelon is climate zone **H3**. (Medium)
- **Overseas-specific residential fiches (Medium):**
  - **BAR-EN-106** « Isolation de combles ou de toitures (France d'outre-mer) », used instead of BAR-EN-101;
  - **BAR-EN-107** « Isolation des murs (France d'outre-mer) », used instead of BAR-EN-102;
  - **BAR-EN-109** « Réduction des apports solaires par la toiture (France d'outre-mer) »;
  - **BAR-TH-124** « Chauffe-eau solaire individuel (France d'outre-mer) ».
  - The full DROM list is NON VÉRIFIÉ.
- **Mainland-only fiches**, so not usable in the DROM: BAR-TH-174/175, BAR-TH-143, BAR-TH-101 and BAR-TH-125 are titled « (France métropolitaine) ». The CdP Rénovation d'ampleur is mainland only.
- CdP Chauffage in the DROM: NON VÉRIFIÉ (and likely not relevant).
- There is a CEE support programme for DROM buildings called « OMBREE ».

---

## A5. Are CEE primes State subsidies?

**No. (High)**
- They are paid for by the **« obligés »**: « les fournisseurs d'électricité, de gaz, de chaleur et de froid, ainsi que les metteurs à la consommation de carburants et de fioul domestique ».
- The State sets their obligations by decree. For P6 this is the [décret n° 2025-1048 du 30/10/2025](https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000052486193), covering 2026–2030:
  - 1 050 TWh cumac per year in total;
  - of which 280 TWh cumac per year for households in précarité énergétique ([press release](https://presse.economie.gouv.fr/le-decret-relatif-a-la-6e-periode-des-certificats-deconomies-denergie-est-publie-ce-jour-avec-une-volonte-de-maintenir-lambition-ecologique-tout-en-luttant-contre-les-fraudes-et-les-effets-daubaine/)).
- France Rénov' calls them « Les aides des fournisseurs d'énergie (CEE) ».
- **Suggested wording:** « Prime CEE versée par un fournisseur d'énergie (ou son partenaire) dans le cadre du dispositif réglementaire des certificats d'économies d'énergie encadré par l'État ; ce n'est pas une subvention budgétaire de l'État ; son montant dépend de l'offre de l'acteur. »

---

## B6. Éco-PTZ (thin evidence: only one search was possible)

Sources: [ecologie.gouv.fr éco-PTZ](https://www.ecologie.gouv.fr/politiques-publiques/eco-pret-taux-zero-eco-ptz), [france-renov.gouv.fr éco-PTZ](https://france-renov.gouv.fr/aides/eco-pret-taux-zero), [economie.gouv.fr](https://www.economie.gouv.fr/particuliers/emprunter-et-sassurer/leco-pret-taux-zero-eco-ptz-pouvez-vous-en-beneficier), [service-public A18201](https://www.service-public.fr/particuliers/actualites/A18201).

| Rule | Finding | Confidence |
|---|---|---|
| Income condition | **None.** « prêt réglementé qui finance **sans condition de ressources** les travaux de rénovation énergétique des logements privés et des copropriétés, et pour lequel l'État prend les intérêts à sa charge » | Medium–High |
| Maximum amount and term | « L'emprunt peut atteindre **50 000 €** et être souscrit pour une durée maximale de **20 ans** » | Medium–High |
| Dwelling | « logements **achevés depuis au moins 2 ans** et utilisés à titre de **résidence principale** » | Medium–High |
| Borrowers | Owner-occupiers (main residence); landlords whose dwelling is rented, or lent free of charge, as a main residence; **syndicats de copropriétaires** (common parts and private parts of collective interest); sociétés civiles not subject to corporate tax with at least one individual partner | Medium–High |
| Eligible works | At least one action among: roof insulation; external-wall insulation; glazing and external doors; installing, regulating or replacing heating or hot-water systems… (the full list, including renewable heating/hot water, floors and « performance énergétique globale », is NON VÉRIFIÉ) | Medium |
| Change from 01/09/2026 | « Les offres d'éco-PTZ « Performance énergétique globale » émises à compter du 1er septembre 2026 pour financer un projet en maison individuelle doivent … comprendre la décarbonation des équipements de chauffage et d'eau chaude sanitaire » (non-hybrid heat pump, heat network, biomass or solar) | Medium |
| RGE | Required: the RGE page says RGE is needed « pour bénéficier … de l'éco-PTZ » | Medium |
| 2026 anti-fraud update | BOFiP published clarifications on how the works must be carried out, following loi n° 2025-594 du 30/06/2025 « contre toutes les fraudes aux aides publiques », art. 26 ([ACTU-2026-00011](https://bofip.impots.gouv.fr/bofip/14937-PGP.html/ACTU-2026-00011); [BOI-BIC-RICI-10-110-10, 22/07/2026](https://bofip.impots.gouv.fr/bofip/6464-PGP.html/identifiant=BOI-BIC-RICI-10-110-10-20260722)). Content NON VÉRIFIÉ. | High that it exists |
| Amount tiers by number of actions, « éco-PTZ MaPrimeRénov' » variant, top-up loan, **end date**, **Outre-mer** | **NON VÉRIFIÉ** | — |

- **Related change from 01/09/2026 (Medium):** economie.gouv.fr « Ce qui change en septembre 2026 » says:
  - MaPrimeRénov' « par geste » no longer covers insulation, heating equipment, ventilation, solar thermal, or heat pumps for hot water;
  - MaPrimeRénov' « rénovation d'ampleur » is no longer granted if gas heating is kept.
  - This may affect the éco-PTZ MaPrimeRénov' variant (NON VÉRIFIÉ).

---

## C7. Reduced VAT at 5.5 % for energy-renovation works
**NON VÉRIFIÉ** (no search was left).
- Lead to confirm: art. 278-0 bis A CGI, dwellings completed more than 2 years ago.

## C8. Prêt avance rénovation (PAR / PAR+)
**NON VÉRIFIÉ** (no search was left).
- Lead to confirm: the PAR is a mortgage-backed loan repaid when the home is sold or passed on; the PAR+ is a zero-interest version for modest households.
- Whether both exist in 2026, and on what terms, is NON VÉRIFIÉ.

---

## 8. Suggested engine rules (derived only from the points above)

**CdP Chauffage, operation engaged between 01/09/2026 and 31/12/2030 (heat pumps):**
- **Eligible when:**
  - the existing system is an individual coal/oil/gas boiler;
  - the dwelling is a main residence;
  - the new system is a heat pump (BAR-TH-171/172) whose model is on the arrêté du 02/07/2026 list (as amended);
  - the installer is RGE;
  - the building was completed more than 2 years ago.
- **Bonus:** ×5 on the CEE volume. Display the € amount as « selon offre du signataire ».
- **Unresolved inputs to flag:** gas condensing boiler, tenant applicant.

**Other CdP Chauffage equipment:**
- Biomass ×5.
- Combined solar ×2, and since 01/09/2026 only with full decarbonisation of heating/hot water.
- Heat network ×2 for « ménages modestes », ×1.5 otherwise.

**CdP Rénovation d'ampleur:**
- Engaged on or after 01/09/2026 → not available to private households (social housing only).

**Timing check (CEE, individuals):**
- Offer accepted before the quote was signed → OK.
- Quote signed ≤ 14 days ago and works not started → « régularisable ».
- Otherwise → ineligible.

**Location:**
- If the dwelling is in a DROM, use the « (France d'outre-mer) » fiches. The mainland-only fiches and Coup de pouce schemes do not apply.

---

## 9. Points NON VÉRIFIÉS

1. Whether the CdP Chauffage still excludes **gas condensing** boilers (« autre qu'à condensation ») in 2026.
2. Whether **hybrid heat pumps** (BAR-TH-159) are in the 2026 CdP Chauffage. Probably not.
3. Whether a **tenant** can receive the CdP Chauffage bonus.
4. The exact CdP end date for biomass, combined solar, heat network and wood appliances. Likely 31/12/2030, confidence Medium.
5. Whether « ménages modestes » legally includes the précarité households, and which tax-notice year is used. The précarité ↔ Anah « très modestes » mapping is Medium (one summary inverted it).
6. The BAR-TH-112 coefficients (×5/×4) and the heat-network condition « réseau efficace ».
7. The 1 January vs 17 January 2026 start date of the extended CdP Rénovation d'ampleur, and the exact wording of the 01/09/2026 « parc social » refocus.
8. The status and version of BAR-EN-104, BAR-TH-112 and BAR-TH-125. The exact list of fiches with the 01/05/2027 repeal date.
9. Whether the 7-day delay and pre-quote visit also apply to BAR-EN-102/103.
10. Whether obligés apply stricter rules than the regulatory 14-day window.
11. The full list of DROM residential fiches, and the CdP Chauffage in the DROM.
12. Éco-PTZ: end date (lead to confirm: 31/12/2027, CGI art. 244 quater U), amount tiers by number of actions, the éco-PTZ MaPrimeRénov' variant in 2026, the top-up loan, availability in Outre-mer, the full works list, and the content of the 2026 BOFiP anti-fraud update.
13. Reduced VAT at 5.5 % and its 2-year dwelling-age condition.
14. PAR and PAR+ in 2026.
15. Every quote above is the wording returned by the search tool. None was checked on the page itself.
