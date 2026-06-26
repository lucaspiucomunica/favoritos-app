# Favoritos — Direção visual

> Sistema de design para a UI. Toda cor e escolha tipográfica deriva daqui.
> Conceito: **arquivo pessoal em tinta violeta** — uma coleção curada de links,
> entre o pessoal/afetivo e o estruturado/técnico (a IA que classifica).

## Tese

O sujeito é a coleção em si + o gesto de capturar. O herói da página é a
**barra de captura** (colar um link) seguida da grade de links salvos. Duas forças
convivem e viram as duas cores da marca:
- **Índigo** = o sistema / a IA / a estrutura (classificação, foco, filtro ativo).
- **Coral** = você / o pessoal / o marcado (a fita de favorito).

Disciplina de cor: SÓ índigo e coral são cores de marca. Categorias são
tipográficas (não um arco-íris de 12 cores).

## Color (4–6 hex nomeados)

- `--paper`   #F2F1F6  — fundo da página (lavanda-acinzentado frio, NÃO creme)
- `--surface` #FFFFFF  — cartões
- `--ink`     #241B2E  — texto primário (quase-preto com fundo violeta quente)
- `--muted`   #6B6475  — texto secundário / metadados
- `--indigo`  #5538EE  — ação primária, foco, filtro ativo, links
- `--coral`   #FF5C49  — fita de favorito (a assinatura), estados de destaque
- bordas: `--line` #E5E2EC (hairline fria)

Suporta `prefers-color-scheme: dark` opcionalmente como segunda passada; o MVP
pode ser só claro (navegar muitos cartões é melhor no claro).

## Type (3 papéis)

- **Display:** `Bricolage Grotesque` (variable) — wordmark e títulos dos cartões.
  Expressivo, moderno, não-default. Usar com peso (600–700) e tracking levemente
  negativo nos títulos.
- **Body:** `Geist Sans` — texto corrido, descrições, labels de UI.
- **Utility/mono:** `Geist Mono` — metadados: domínio, data, tags, contadores,
  tabs de categoria (caixa alta, tamanho pequeno, tracking positivo). O mono dá o
  ar de "ficha de catálogo / dado" que combina com link + conteúdo tech.

Carregar via `next/font/google` (Bricolage_Grotesque, Geist, Geist_Mono).

Escala de tipo intencional: wordmark ~20px; título do cartão ~17–18px/600;
body 14–15px; mono metadados 11–12px caixa alta tracking +0.06em.

## Layout

```
┌───────────────────────────────────────────────────────────┐
│  Favoritos                                      [sair]      │  wordmark + logout
│                                                             │
│  ┌─────────────────────────────────────────────┐  ┌─────┐  │
│  │  Cole um link…                                │  │Salvar│ │  CAPTURA (herói)
│  └─────────────────────────────────────────────┘  └─────┘  │
│                                                             │
│  [buscar…]   ARTIGOS · IA · RECEITAS · …  ♥ Favoritos  ◷ Não│  filtros
│                                                lidos        │
├───────────────────────────────────────────────────────────┤
│  ┌───────────┐ ┌───────────┐ ┌───────────┐                 │
│  │ [og img]  │ │ [og img]  │ │ initial   │  ← sem imagem:   │
│  │ Título    │ │ Título  ◣ │ │ Título    │     placeholder  │  GRADE de cartões
│  │ domínio·dt│ │ domínio   │ │ domínio   │     com inicial   │  (◣ = fita coral
│  │ IA #tag…  │ │ #tag #tag │ │ #tag      │     do domínio    │   = favorito)
│  └───────────┘ └───────────┘ └───────────┘     em índigo     │
└───────────────────────────────────────────────────────────┘
```

- Grade responsiva: 1 col (mobile) / 2 (tablet) / 3 (desktop). `max-width` ~1100px.
- Tabs de categoria: linha horizontal rolável em mono caixa-alta; ativa em índigo
  com sublinhado; "Todas" como reset. Em telas estreitas pode virar select.
- Cartão: imagem og (object-cover, ratio ~16:10) OU placeholder (inicial do domínio
  grande em índigo sobre superfície). Abaixo: título (Bricolage), linha mono
  domínio · data, tab de categoria pequena, chips de tags (mono). Rodapé de ações.

## Signature element — a fita de favorito (bookmark ribbon)

O elemento memorável e on-subject: favoritar um link **dobra uma fita coral** no
canto superior direito do cartão (uma dobra real em CSS, com sombra sutil do vinco).
O toggle de favorito é "prender/soltar a fita". É a única ousadia — todo o resto
permanece quieto e disciplinado. Sem fita = não favoritado.

## Ações por cartão (copy em PT, voz ativa)

- Favoritar (fita) · Marcar como lido / Não lido · Editar · Excluir.
- Se `ai_status='failed'`: faixa discreta "Não classificado" + ação **Reclassificar**.
- Editar abre um diálogo: trocar categoria (select com "Sem categoria" + criar nova),
  editar tags (chips editáveis). Salvar via PATCH.

## Estados

- **Captura trabalhando:** enquanto classifica, a barra mostra estado ocupado
  (um shimmer/pulso suave no slot + texto "Salvando e classificando…"). Sem spinner
  genérico no meio da tela.
- **Vazio:** "Nada salvo ainda. Cole seu primeiro link acima." (convite à ação)
- **Erro de carregamento (banco indisponível):** a página NÃO deve quebrar — o
  fetch inicial é envolto em try/catch e degrada para um estado vazio com aviso
  discreto "Não foi possível carregar seus links." Assim a shell carrega mesmo sem
  banco configurado.

## Motion (contido, respeita `prefers-reduced-motion`)

- Hover do cartão: leve elevação (translateY -2px + sombra suave).
- Fita: pequena animação de "dobrar" ao favoritar.
- Captura: shimmer no estado ocupado.
- Nada além disso — excesso de animação faz parecer gerado por IA.

## Piso de qualidade

Responsivo até mobile; foco de teclado visível (anel índigo); `prefers-reduced-motion`
respeitado; contraste AA no texto sobre paper/surface.
