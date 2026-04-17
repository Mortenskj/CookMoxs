# Claude Handoff Message

Du arbejder paa CookMoxs.

Autoritativ dokumentation:

- `docs/cookmoxs-master-decision-doc.md` fastlaaser faseorden og gates
- `docs/cookmoxs-phase-b-execution-brief.md` er den aktuelle correctness-brief for aabne B-rester

Passiv reference:

- `docs/cookmoxs-reference-facitliste.md` maa bruges som loesningsreference, men maa ikke genfortaelles eller broadene scope

Arbejdsregel:

- brug current repo state som source of truth
- vaer kritisk mod docs, hvis kode og docs ikke matcher
- implementer ikke blindt
- arbejd kun med de sidste rester, der stadig blokerer Gate B -> C

Token-disciplin:

- gengiv ikke eksisterende kode i tekst
- opsummer ikke hele repoet
- beskriv kun delta
- aendr kun det der faktisk giver mening i current code
- undgaa sidequests og opportunistiske refactors

Scope:

- Fase C er ikke go endnu
- arbejd kun med live signoff og de correctness-rester, som current repo state stadig viser
- roer ikke efficiency/foundation-sporet endnu

Arbejdsstil:

- vaer diff-orienteret
- hold aendringer smaa og afgraensede
- hvis et paastaaet problem allerede er loest i current code, sig det eksplicit og lad vaere med at roere det
- hvis et punkt kraever stoerre omskrivning end noedvendigt, vaelg den mindst invasive loesning der faktisk lukker problemet
- hvis et punkt kraever stoerre omskrivning end rimeligt, saa stop og rapporter det som `deferred` i stedet for at broadene scope

Aktuelle blockers foer Gate B -> C:

- service worker asset fallback skal vaere korrekt lukket eller verificeret lukket i praksis
- Beef Wellington heat-fixet skal have live observer-signoff, ikke kun harness-pass
- loading/branding skal have reel runtime-signoff der, hvor current behavior stadig ser forkert ud
- SpisBedre og andre JS-SPA imports maa kun rapporteres som separat deferred import-follow-up, ikke broades ind i Fase C

Naar du er faerdig, stop.

Rapporter kun:

- `verified`
- `changed`
- `files`
- `checks`
- `deferred`
