# 🧟‍♂️ Sistema de Inventário (estilo Resident Evil)

Aplicação web inspirada no inventário clássico de *Survival Horror* (Baú/Stash + Inventário do Jogador), usando **Next.js + TypeScript + Tailwind** e **Supabase (PostgreSQL)**.

## ✨ Funcionalidades atuais

- **Movimentação entre Baú e Inventário** via Enter e duplo clique.
- **Empilhamento (stacking)** de itens iguais respeitando `max_stack`.
- **Combinação (merge/crafting)** consultando `item_combinations`.
- **Check de item** com modal de nome, descrição e imagem.
- **Inventário em grade com slots persistidos** por `slot_index`.
- **Interface inspirada no estilo clássico** de inventário Resident Evil.

## 🚧 Roadmap (próximos passos)

- Drag-and-drop completo entre Baú e Inventário.
- Lógica avançada de recarga de armas por tipo de munição.
- API pública para leitura/integração de inventário (planejada para versões futuras).

## ✅ Requisitos

- Node.js (recomendado >= 18)
- Conta no [Supabase](https://supabase.com/) (caso queira usar seu próprio banco)

## ▶️ Rodando localmente

1. Instale as dependências:

```bash
npm install
```

2. Configure variáveis de ambiente em `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://SEU-PROJETO.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxxxxxxxx
```

3. Rode o servidor:

```bash
npm run dev
```

4. Acesse `http://localhost:3000`.

## 🗄️ Configuração do Banco de Dados (Supabase)

Para rodar este projeto, você precisa configurar o banco de dados relacional no seu próprio projeto do [Supabase](https://supabase.com/). A estrutura utiliza PostgreSQL e consiste em um catálogo de itens, receitas de fusão (crafting) e as instâncias do inventário do jogador e do baú.

### 1. Criando o Schema

Navegue até o **SQL Editor** no painel do seu Supabase e rode o script abaixo para criar as tabelas, tipos (enums) e relações necessárias:

```sql
-- Habilita a geração automática de UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Cria a tabela de Catálogo (items)
CREATE TABLE items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    image_url TEXT,
    stackable BOOLEAN DEFAULT false,
    max_stack INTEGER DEFAULT 1,
    is_combinable BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 2. Cria a tabela de Receitas/Combinações (item_combinations)
CREATE TABLE item_combinations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    item_a_id UUID REFERENCES items(id) ON DELETE CASCADE,
    item_b_id UUID REFERENCES items(id) ON DELETE CASCADE,
    result_item_id UUID REFERENCES items(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 3. Cria o tipo (Enum) para a localização
CREATE TYPE inventory_location AS ENUM ('PLAYER', 'STASH');

-- 4. Cria a tabela de Instâncias (inventory)
CREATE TABLE inventory (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    item_id UUID REFERENCES items(id) ON DELETE CASCADE,
    quantity INTEGER DEFAULT 1,
    location inventory_location DEFAULT 'STASH',
    slot_index INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);
```

### 2. Popular dados iniciais (recomendado)

Depois de criar as tabelas:

- Insira itens base em `items` (armas, munições, chaves, ervas).
- Insira receitas em `item_combinations` (ex.: Green Herb + Red Herb).
- Insira slots iniciais em `inventory` com `location` e `slot_index`.

## 📦 Stack

- Next.js (App Router)
- TypeScript
- TailwindCSS
- Supabase (`@supabase/supabase-js`)

## 🛠️ Troubleshooting

### 1) Erro de imagem externa no `next/image`

Se aparecer erro como:

`hostname "..." is not configured under images in your next.config.js`

adicione o domínio em `next.config.ts`:

```ts
images: {
  remotePatterns: [
    { protocol: "https", hostname: "mcyruricwobkowcdzbui.supabase.co" },
    { protocol: "https", hostname: "www.evilresource.com" },
  ],
}
```

Depois reinicie o servidor (`Ctrl+C` e `npm run dev`).

### 2) Variáveis de ambiente do Supabase não carregam

- Verifique se o arquivo está com o nome exato: `.env.local`
- Confirme as chaves:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- Sempre reinicie o `next dev` após alterar env.

### 3) Aviso de hydration mismatch no dev

Em alguns casos, extensões do navegador injetam atributos no HTML e causam aviso de hydration. O projeto já está configurado com `suppressHydrationWarning` em `layout.tsx`, mas se o aviso persistir:

- teste em aba anônima
- desative extensões que alteram DOM/página

### 4) Item não move para o inventário

Quando o inventário estiver cheio (8 slots ocupados), o app mostra `Inventário cheio.` ao tentar mover item do Baú para o jogador.

### 5) Receitas de combinação não funcionam

Confira no banco:

- os `item_id` existem em `items`
- a receita existe em `item_combinations`
- os IDs da receita batem com os itens reais (ordem A/B não importa no app)

## 💻 Comandos úteis

```bash
# desenvolvimento
npm run dev

# checagem de lint
npm run lint

# build de produção
npm run build
```

---

## 🇺🇸 English Version

# 🧟‍♂️ Resident Evil Style Inventory System

A web app inspired by classic *Survival Horror* inventory management (Stash + Player Inventory), built with **Next.js + TypeScript + Tailwind** and **Supabase (PostgreSQL)**.

## ✨ Current Features

- Move items between **Stash** and **Player Inventory** (Enter / double click).
- Item **stacking** for equal items, respecting `max_stack`.
- Item **combination/crafting** through `item_combinations`.
- **Check item** modal with title, description, and image.
- Persistent slot positioning via `slot_index`.
- UI inspired by classic Resident Evil inventory screens.

## 🚧 Roadmap

- Full drag-and-drop between Stash and Inventory.
- Advanced weapon reload logic by compatible ammo type.
- Public API layer for direct inventory consumption/integration (planned).

## ✅ Requirements

- Node.js (recommended >= 18)
- A [Supabase](https://supabase.com/) project if you want your own database

## ▶️ Run locally

1. Install dependencies:

```bash
npm install
```

2. Create `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxxxxxxxx
```

3. Start the app:

```bash
npm run dev
```

4. Open `http://localhost:3000`.

## 🗄️ Supabase Database Setup

Use the same SQL script from the Portuguese section above to create:

- `items`
- `item_combinations`
- `inventory`
- enum `inventory_location`

Then seed your database with base items, recipes, and initial inventory slots.

## 🛠️ Troubleshooting

### 1) External image host blocked by `next/image`

If you get:

`hostname "..." is not configured under images in your next.config.js`

add the host in `next.config.ts`:

```ts
images: {
  remotePatterns: [
    { protocol: "https", hostname: "mcyruricwobkowcdzbui.supabase.co" },
    { protocol: "https", hostname: "www.evilresource.com" },
  ],
}
```

Then restart dev server (`Ctrl+C` and `npm run dev`).

### 2) Supabase environment variables not picked up

- Ensure file is exactly named `.env.local`
- Ensure keys are set:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- Restart `next dev` after any env change.

### 3) Hydration mismatch warning in development

Browser extensions may inject attributes and cause hydration warnings. This project already uses `suppressHydrationWarning` in `layout.tsx`, but if warnings persist:

- test in incognito mode
- disable DOM-modifying browser extensions

### 4) Item cannot move to player inventory

If all 8 slots are occupied, moving an item from Stash to Inventory will show `Inventário cheio.` (inventory full).

### 5) Combination recipes not working

Check your DB:

- `item_id` values exist in `items`
- recipe rows exist in `item_combinations`
- recipe IDs match real item IDs (A/B order is handled by the app)

## 💻 Useful commands

```bash
# development
npm run dev

# lint checks
npm run lint

# production build
npm run build
```
