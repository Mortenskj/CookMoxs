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
- byg den mindste recipe-scoped assistant-surface, ikke en ny chatplatform

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
- genbrug eksisterende AI-handlinger foerst
- hvis `assistant-ui` broadener current repo state, saa brug en enklere repo-native loesning
- indfoer ikke NeMo Guardrails, Guardrails AI, Rasa eller anden ny guardrails/agent-stack i denne fase
- behandl shared listener churn som deferred til Fase D, ikke som aktivt Fase C-spor, medmindre current repo state viser at det er direkte noedvendigt for et konkret C-flow der allerede roeres

Fase C-retning:

- UI upgrade og shell-naer performance maa gerne loeses i samme batch
- lazy loading, analytics defer, queue watcher cleanup, timer isolation og motion-oprydning er legitime C-punkter
- shared listener churn og andre rene tekniske effektivitetspunkter maa ikke broades ind nu
- assistanten er kun ét workstream i Fase C, ikke hele Fase C
- assistant-overfladen skal vaere recipe-scoped, section-naer og rolig
- v1 assistant-surface er kun for `RecipeView` / recipe-edit flow
- faste action-startere er bedre end fri chat som primaer indgang
- `no_change` er first-class og maa vaere udfaldet, hvis input allerede er godt
- `proposal` skal vaere tydelig delta/before-after med `Behold` / `Fortryd`
- `assistant-ui` er valgfrit og ikke et forudvalgt stack-valg
- byg ikke global chatbot, generel madcoach, `CookView` assistant eller cook-mode assistant-editing i denne fase

Naar du er faerdig, stop.

Rapporter kun:

- `verified`
- `changed`
- `files`
- `checks`
- `deferred`
