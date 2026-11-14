# Letter to Ajuntament de Barcelona — RESCCUE street flooding licence

Status: draft, not sent. Related: `docs/DATA_LICENSES.md` section 5.2, `docs/features/067-licence-followups.md`.

## Addressees

Send as one message with the others in copy. **The email addresses were not verified** (no address is published on the
pages checked). Find them before sending, or use the web forms.

| Role | Who | Channel |
|---|---|---|
| To | Open Data BCN / Oficina Municipal de Dades (Ajuntament de Barcelona) | contact form of the Open Data BCN portal (opendata-ajuntament.barcelona.cat); the address `opendata@bcn.cat` is to be confirmed |
| To | Àrea d'Ecologia, Urbanisme i Mobilitat, Resiliència Urbana (publisher of the Atles de resiliència) | contact page https://ajuntament.barcelona.cat/ecologiaurbana/ca/contacte, or "Atenció en línia", category *Medi ambient*: https://atencioenlinia.ajuntament.barcelona.cat/ca/fitxa/resultat-busqueda?category=29 |
| Cc | Barcelona Cicle de l'Aigua SA (BCASA), author of the PDISBA'19 model | address to be found |
| Cc | CETAQUA (RESCCUE project partner, holder of the toolkit.resccue.eu content) | address to be found |

## Subject

Sol·licitud de llicència de reutilització de les dades d'inundació urbana (RESCCUE, Atles de resiliència)

## Text (Catalan)

Bon dia,

Escric en relació amb la capa **«Alçària d'aigua en superfície» (T-10 i T-100, escenari actual)** de l'Atles de
resiliència de la ciutat de Barcelona
(https://coneixement-eu.bcn.cat/widget/atles-resiliencia/index_resccue_inun_urbana.html), la font de la qual
s'indica com «PDISBA'19 (BCASA) – RESCCUE Project».

Estic desenvolupant una eina web gratuïta per ajudar les persones a triar on viure a Barcelona i a l'àrea
metropolitana, a partir de dades obertes (soroll, inundabilitat fluvial, risc d'incendi, transport, serveis). L'eina
estarà disponible a **https://livability.time2map.com/**. Mostra, per a cada edifici, el risc d'inundació i permet
a la persona usuària donar-li més o menys pes en la valoració del lloc.

Voldria utilitzar la capa d'inundació urbana de l'Atles amb aquest fi: el calat de l'aigua als carrers (classes de
profunditat per a T-10 i T-100) es dibuixa sobre el mapa i s'assigna a cada edifici segons el carrer on té la
porta. La font s'esmenta de forma visible a l'eina, i la llicència de la capa s'hi indica tal com es mostra avui:
sense llicència explícita.

He revisat les condicions que hi ha publicades i no he trobat una llicència per a aquesta capa:

- La pàgina de la capa no indica cap règim de reutilització ni enllaç a Open Data BCN. En canvi, les altres 23
  capes de l'Atles que hi ha a Open Data BCN estan publicades amb llicència **CC BY 4.0**.
- L'Avís legal de l'Ajuntament permet reutilitzar les dades difoses al web citant la font, sense alterar-ne el
  contingut, però diu també que, quan no s'especifica cap règim, es consideren reservats tots els drets i que no es
  pot reutilitzar el material de tercers. No tinc clar si això cobreix aquesta capa, que ha estat elaborada per BCASA
  en el marc del projecte RESCCUE.
- El Pla de gestió de dades del projecte RESCCUE (lliurable D8.6) preveu publicar les simulacions de drenatge urbà
  de Barcelona (Aquatec, BCASA) a INSPIRE i Zenodo amb «la reutilització més àmplia possible», però no he trobat
  aquest conjunt de dades publicat enlloc, ni amb llicència.

Per això us demano, si us sembla bé:

1. Que confirmeu **per escrit** que puc reutilitzar la capa (classes de profunditat T-10 i T-100, escenari actual)
   citant-ne la font, i amb quina llicència (idealment **CC BY 4.0**).
2. Que m'indiqueu si aquest permís inclou la **transformació** de les dades (conversió a teselꞏles vectorials i
   càlcul d'un indicador per edifici) i, en aquest cas, l'**ús comercial**, per si l'eina evoluciona cap a un servei de
   pagament.
3. Que valoreu **publicar la capa a Open Data BCN** sota CC BY 4.0, com la resta de l'Atles, perquè pugui
   reutilitzar-la qualsevol persona.
4. Que m'indiqueu **com voleu que es cite la font** (text i enllaç) i qui és el titular dels drets (Ajuntament, BCASA,
   Aquatec o CETAQUA), per adreçar-me a qui correspongui.

Fins que rebi resposta, la capa es mostra amb l'avís que no té llicència explícita, i puc desactivar-la si ho
preferiu. Quedo a la vostra disposició per ampliar qualsevol detall tècnic.

Gràcies per la vostra atenció,

[Nom i cognoms]
[Correu electrònic]
https://livability.time2map.com/

## Notes before sending

- Fill in the name and the contact address (not stored in the repo).
- The site must be live at the stated address, with the street-flooding layer and its "no explicit licence" notice
  visible, before the letter is sent.
- The letter says the tool is free. Change it if that is no longer true.
- If a reply allows reuse, update `DATA_LICENSES.md` (5.2, risk table row 2, the legend and the dialog in
  `frontend/src/services/dataSources.ts`) and the feature file, and keep the reply with the records.
