# Claude Handoff Message

Du arbejder på CookMoxs.

Autoritativ dokumentation:

- `docs/cookmoxs-master-decision-doc.md` fastlåser faseorden og gates
- `docs/cookmoxs-phase-a-execution-brief.md` er den aktive arbejdsordre

Arbejdsregel:

- brug current repo state som source of truth
- vær kritisk mod docs, hvis kode og docs ikke matcher
- implementer ikke blindt
- arbejd kun med Fase A

Token-disciplin:

- gengiv ikke eksisterende kode i tekst
- opsummér ikke hele repoet
- beskriv kun delta
- ændr kun det der faktisk giver mening i current code
- undgå sidequests og opportunistiske refactors

Scope:

- kun Fase A fra `docs/cookmoxs-phase-a-execution-brief.md`
- intet fra Fase B eller C

Arbejdsstil:

- vær diff-orienteret
- hold ændringer små og afgrænsede
- hvis et Phase A-punkt viser sig allerede at være løst, sig det eksplicit og lad være med at røre det
- hvis et punkt kræver større omskrivning end nødvendigt, vælg den mindst invasive løsning der faktisk lukker problemet
- hvis et Phase A-punkt kræver større omskrivning end rimeligt, så stop og rapportér det som `deferred` i stedet for at broadene scope

Når du er færdig, stop.

Rapportér kun:

- `verified`
- `changed`
- `files`
- `checks`
- `deferred`
