# Claude Handoff Message

Du arbejder paa CookMoxs.

Autoritativ dokumentation:

- `docs/cookmoxs-master-decision-doc.md` fastlaaser faseorden og gates
- `docs/cookmoxs-phase-c-execution-brief.md` er den aktuelle aktive brief

Passiv reference:

- `docs/cookmoxs-reference-facitliste.md` maa bruges som loesningsreference, men maa ikke genfortaelles eller broadene scope
- `docs/cookmoxs-phase-d-execution-brief.md` er pending og maa ikke aktiveres endnu

Arbejdsregel:

- brug current repo state som source of truth
- vaer kritisk mod docs, hvis kode og docs ikke matcher
- implementer ikke blindt
- arbejd kun med Fase C-scope

Token-disciplin:

- gengiv ikke eksisterende kode i tekst
- opsummer ikke hele repoet
- beskriv kun delta
- aendr kun det der faktisk giver mening i current code
- undgaa sidequests og opportunistiske refactors

Scope:

- Fase C er aktiv
- Fase D er ikke go endnu
- roer ikke gamle correctness-spor, medmindre current repo state viser en reel regression

Arbejdsstil:

- vaer diff-orienteret
- hold aendringer smaa og afgraensede
- hvis et punkt allerede er loest i current code, sig det eksplicit og lad vaere med at roere det
- hvis et punkt viser sig at vaere rent teknisk og ikke naturligt hoerer til UI/shell-batchen, saa rapporter det som `deferred` til Fase D
- hvis et punkt kraever stoerre omskrivning end rimeligt, saa stop og rapporter det som `deferred`

Fase C-retning:

- UI upgrade og shell-naer performance maa gerne loeses i samme batch
- lazy loading, analytics defer, queue watcher cleanup, timer isolation og motion-oprydning er legitime C-punkter
- shared listener churn og andre rene tekniske effektivitetspunkter maa ikke broades ind nu

Naar du er faerdig, stop.

Rapporter kun:

- `verified`
- `changed`
- `files`
- `checks`
- `deferred`
