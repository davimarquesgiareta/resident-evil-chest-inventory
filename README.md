# 🧟‍♂️ Sistema de Inventário (estilo Resident Evil)

Aplicação web inspirada no inventário clássico de *Survival Horror* (Baú/Stash + Inventário do Jogador), usando **Next.js + TypeScript + Tailwind** e **Supabase (PostgreSQL)**.

## ✨ Funcionalidades (alvo)

- **Movimentação**: mover itens entre **Baú** e **Inventário**.
- **Empilhamento (Stacking)**: somar itens iguais e empilháveis até `max_stack`, com overflow.
- **Combinação (Merge/Crafting)**: combinar itens diferentes conforme `item_combinations`.
- **Recarga de armas**: combinar munição com arma compatível (a ser evoluído).
- **Persistência de grade**: respeitar `slot_index` para desenhar a UI.

## ✅ Requisitos

- Node.js (recomendado \(>= 18\))

## ▶️ Rodando localmente

1) Instale as dependências:

```bash
npm install
```

2) Crie o arquivo `.env.local` (veja `.env.local.example`).

3) Rode o servidor:

```bash
npm run dev
```

Abra `http://localhost:3000`.

## 📦 Stack

- Next.js (App Router)
- TailwindCSS
- Supabase (`@supabase/supabase-js`)
