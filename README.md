# 🚀 Study Spark AI

Plataforma inteligente que transforma anotações, apostilas, slides e áudios longos em materiais de estudo estruturados usando Inteligência Artificial.

---

## 🌟 Funcionalidades

### 🧠 Geração de Materiais com IA
- **Resumos** — Textos estruturados com conceitos-chave
- **Flashcards** — Perguntas e respostas com revisão espaçada (algoritmo SM-2)
- **Exercícios** — Listas de exercícios com gabarito
- **Mapas Mentais** — Organização hierárquica de conceitos

### 🎙️ Transcrição de Áudios Longos (1-2h)
- Processamento via **Web Audio API** (`OfflineAudioContext`) no navegador
- Fragmentação inteligente com sobreposição (*overlap*) em `.wav` — nenhuma palavra é perdida
- Formatação com IA para correção de pontuação e extração de **tópicos principais**

### 📄 Suporte a Múltiplos Formatos
Extração de texto **100% client-side**, sem limites de backend:
- `.txt`, **PDFs** (via `pdfjs-dist`), `.pptx` (PowerPoint), `.docx` (Word)

### 📊 Dashboard Dinâmico
- **Métricas em tempo real** — Matérias, flashcards, resumos e tempo estudado baseados nos dados reais do banco
- **Diário de Bordo** — Feed de atividades ordenado cronologicamente com timestamps relativos
- **StudyAI Recomenda** — Widget com dica de estudo personalizada gerada pela IA com base no seu progresso
- **Ações rápidas** — Botões para revisar, gerar materiais e conversar com a IA

### 📚 Gerenciamento de Matérias
- CRUD completo (criar, editar, excluir) com persistência no Supabase
- Seletor de cor personalizado para cada matéria
- Organização automática dos materiais gerados por matéria/categoria
- Filtragem por matéria na biblioteca de materiais

### 💬 Chat com Assistente IA
- Interface de conversação em tempo real com streaming
- Histórico de conversas salvo automaticamente no banco

### 🎨 Interface Premium
- Design com TailwindCSS e componentes **Shadcn/UI**
- Tema claro e escuro
- Animações suaves e micro-interações
- Exportação nativa para **PDF** estilizado

---

## 🛠 Stack Tecnológica

### Frontend
| Tecnologia | Uso |
|---|---|
| **React 18** + **TypeScript** | Base tipada e reativa |
| **Vite** | Bundler ultra-rápido com HMR |
| **Tailwind CSS** | Estilização via classes utilitárias |
| **Shadcn/UI** + **Radix UI** | Componentes acessíveis e customizáveis |
| **TanStack React Query** | Cache e gerenciamento de estado assíncrono |
| **React Markdown** | Renderização dos materiais gerados pela IA |
| **Lucide React** | Ícones SVG |
| **date-fns** | Formatação de datas relativas (pt-BR) |
| **pdfjs-dist** | Leitura de PDFs no navegador |

### Backend & IA
| Tecnologia | Uso |
|---|---|
| **Supabase (PostgreSQL)** | Banco de dados, autenticação, storage, RLS |
| **Edge Functions (Deno)** | Processamento serverless seguro |
| **API de IA (Gemini 2.5 Flash)** | Geração de materiais, chat, transcrição |

---

## 📦 Estrutura do Banco de Dados

| Tabela | Descrição |
|---|---|
| `subjects` | Matérias do estudante (nome, cor, progresso) |
| `flashcards` | Cartões de estudo com revisão espaçada SM-2 |
| `generated_materials` | Resumos, exercícios e mapas mentais salvos |
| `review_sessions` | Sessões de revisão com métricas de desempenho |
| `conversations` | Histórico do chat com a IA |
| `profiles` | Perfis de usuário |

---

## ⚙️ Edge Functions

| Função | Descrição |
|---|---|
| `chat` | Assistente de estudo com streaming |
| `generate-material` | Geração de materiais estruturados a partir de texto |
| `transcribe-audio` | Transcrição de áudios segmentados |
| `analyze-transcription` | Análise e formatação de transcrições |

---

## 🚀 Como Executar

### Pré-Requisitos
- [Node.js](https://nodejs.org/) (v18+)
- npm ou yarn

### Instalação

```bash
cd study-spark-ai
npm install
```

### Variáveis de Ambiente

Crie um arquivo `.env` na raiz do projeto:

```bash
VITE_SUPABASE_URL=seu-supabase-project-url
VITE_SUPABASE_PUBLISHABLE_KEY=sua-supabase-anon-key
```

> As chaves das Edge Functions (ex: `LOVABLE_API_KEY`) devem ser configuradas diretamente no painel do Supabase.

### Executando

```bash
npm run dev
```

Acesse `http://localhost:5173` no navegador.

### Build de Produção

```bash
npm run build
npm run preview
```

---

## 🎯 Como Usar

1. **Cadastre-se/Login** — Autenticação via Supabase Auth
2. **Crie Matérias** — Organize por área de conhecimento com cores personalizadas
3. **Gere Material** — Cole texto, envie PDF/DOCX/PPTX ou áudio e escolha o tipo de material
4. **Revise Flashcards** — Use o sistema de repetição espaçada para fixar conteúdo
5. **Acompanhe seu Progresso** — O Dashboard mostra métricas e atividades em tempo real
6. **Converse com a IA** — Tire dúvidas diretamente com o assistente inteligente
7. **Exporte para PDF** — Baixe qualquer material gerado com formatação profissional

---

> Desenvolvido para maximizar o potencial estudantil, aliando acessibilidade Frontend com as melhores práticas de Arquitetura Serverless. Bons estudos! 📚✨
