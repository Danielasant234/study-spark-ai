# 🚀 Study Spark AI

Bem-vindo ao **Study Spark AI**, uma plataforma inteligente e revolucionária projetada para transformar automaticamente anotações, apostilas, slides e até longas palestras em áudio num ecossistema completo de materiais de estudo estruturados através de Inteligência Artificial.

---

## 🌟 Funcionalidades Principais

- **🧠 Geração Inteligente de Materiais**: Converta qualquer conteúdo instantaneamente em:
  - **Resumos**: Textos bem estruturados focados nos conceitos centrais.
  - **Flashcards**: Cartões de perguntas e respostas para revisão espaçada.
  - **Listas de Exercícios**: Prática com gabarito incluído.
  - **Mapas Mentais**: Estruturação hierárquica e conexões lógicas.

- **🎙️ Transcrição Avançada de Áudios Longos (1 a 2 horas)**:
  - Motor de processamento frontal utilizando a **Web Audio API** (`OfflineAudioContext`).
  - Decodificação rápida e conversão (downmix) na memória local.
  - Fragmentação com sobreposição (*overlap*), exportando pacotes limpos no formato `.wav` para garantir que **nenhuma palavra ou contexto seja perdido na transcrição**.
  - Formatação com IA para corrigir falhas de pontuação e gramática, além da sumarização e extração fluída de **Tópicos Principais**.

- **📄 Suporte a Múltiplos Formatos (Client-Side Parsing)**:
  - Extração de texto **completamente via navegador** sem estourar limites de backend.
  - Suporta: Arquivos `.txt`, **PDFs** (completos e extensos via `pdfjs-dist`), Apresentações PowerPoint (`.pptx`) e Documentos Word (`.docx`).

- **🎨 Interface e Usabilidade**:
  - Design estético, acessível e ultrarrápido criado com TailwindCSS e componentes Shadcn UI.
  - Suporte total a temas (*Light/Dark mode*).
  - Exportação nativa dos materiais gerados diretamente para PDF estilizado para leitura offline.

---

## 🛠 Tecnologias e Bibliotecas Utilizadas

O sistema é contruído sobre uma stack moderna e de alta escalabilidade:

### Frontend
* **React 18** e **TypeScript**: Base sólida e fortemente tipada.
* **Vite**: Bundler super veloz para uma experiência de desenvolvimento instantânea.
* **Tailwind CSS**: Estilização versátil via classes utilitárias.
* **Shadcn/UI & Radix UI**: Componentes semânticos, acessíveis e customizáveis (Diálogos, Accordions, Tabs, Tooltips, etc).
* **TanStack React Query**: Gerenciamento sofisticado de estado assíncrono e cache de servidores.
* **React Markdown**: Motor inteligente de renderização em tempo real das entregas da Inteligência Artificial.
* **Lucide React**: Biblioteca refinada de ícones em SVG.
* **pdfjs-dist**: Leitor dinâmico do framework da Mozilla para PDFs nativos na web.

### Backend & Inteligência Artificial
* **Supabase**: Toda nossa infraestrutura, incluindo:
  * Banco de Dados Potente em **PostgreSQL** para o histórico dos Flashcards, Disciplinas e Materiais Gerados.
  * Autenticação e Storage (Armazenamento de imagens/assets).
  * **Edge Functions** rodando em *Deno* para processamentos sigilosos sem servidor.
* **IA API Gateway (Lovable / Gemini 2.5 Flash)**: O núcleo de inteligência para orquestrar toda a pedagogia generativa, chamadas lógicas e sumarições com precisão clínica da linguagem e alta janela de contexto temporal.

---

## ⚙️ Como Funciona a Arquitetura Backend

### Supabase Edge Functions
A aplicação delega funções computacionalmente exigentes (aquilo que não ocorre no client-side) a _Edge Functions_ localizadas em `supabase/functions`:
1. **`transcribe-audio`**: Recebe áudios otimizados (ou framentados) do Frontend e negocia com a API de IA a transcrição exata e formatada parágrafo a parágrafo.
2. **`analyze-transcription`**: Revê profundamente fluxos textuais limpos antes de transformá-los em objetos de estudo conclusivos.
3. **`generate-material`**: Orquestradora especialista: interpreta um conteúdo referenciado pelo usuário no Client-side e desenha estruturas educacionais assertivas (ex: Flashcards e resumos) baseando-se no que foi demandado.

---

## 🚀 Como Executar o Projeto Localmente

### 1. Pré-Requisitos
Certifique-se de possuir instalado em sua máquina:
* [Node.js](https://nodejs.org/en/) (Versão LTS, preferencialmente Node 18+)
* [npm](https://www.npmjs.com/) ou [yarn](https://yarnpkg.com/).

### 2. Passo-A-Passo de Instalação

Clone o projeto ou entre no diretório raiz:
```bash
cd study-spark-ai
```

Instale as dependências essenciais e auxiliares:
```bash
npm install
```

### 3. Variáveis de Ambiente
Crie um arquivo chamado `.env` (ou utilize o `.env.local`) na base de seu projeto e garanta a definição correta das chaves do seu projeto **Supabase**. Dependendo da sua configuração, inclua:

```bash
VITE_SUPABASE_URL=seu-supabase-project-url
VITE_SUPABASE_PUBLISHABLE_KEY=sua-supabase-anon-key
```
*(Nota: as chaves para as Edge Functions como o `LOVABLE_API_KEY` devem ser inseridas e declaradas diretamente no ambiente do Cloud do Supabase).*

### 4. Executando o Servidor de Desenvolvimento
Rode o projeto localmente com as funcionalidades em tempo real (incluindo HMR para edições de código):

```bash
npm run dev
```

Acesse via navegador pela URI informada no seu terminal, normalmente `http://localhost:5173`.

---

## 🎯 Como Usar a Plataforma

1. **Dashboard & Disciplinas**: No primeiro acesso, estruture sua rotina separando-a por "Assuntos", facilitando a classificação.
2. **Gerar Material Rápido**: Clique na guia de *Gerar Materiais*, faça o upload de um texto, um PDF, um documento Word ou carregue um arquivo longo de áudio pelo menu flutuante e aguarde a indexação (toda na tela cliente). Com o envio decodificado, clique na emissão em abas de acordo com a sua preferência (`Resumo`, `Flashcards`, `Mapa Mental`).
3. **Página de Transcrições**: Quando houver gravações originais de sala de aula, anexe o áudio na guia **Transcrição** e tenha um ambiente híbrido para você primeiro revisar fisicamente cada linha documentada antes de delegar para a IA montar seus tópicos pedagógicos.
4. **Flashcards**: Todo item catalogado da IA pode gerar cartões com respostas ocultas e botões rotacionais. Teste sua fixação na página própria de `Flashcards`!
5. **PDF Offline**: Goste de revisar no papel? Pressione <kbd>Download PDF</kbd> no frame do Resultado para que o CSS de impressão renderize tudo com limpeza estética perfeita.

---

> Desenvolvido para maximizar o potencial estudantil e poupar incontáveis horas de fichamento de conteúdo, aliando acessibilidade Frontend com as melhores práticas de Arquitetura Serverless. Bons estudos! 📚✨
