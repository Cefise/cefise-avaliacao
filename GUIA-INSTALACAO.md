# Cefise Academy — Guia de Instalação
## Passo a passo completo (sem precisar saber programar)

---

## PARTE 1 — Criar o banco de dados (Supabase)

### Passo 1 — Criar conta no Supabase
1. Acesse **https://supabase.com**
2. Clique em **"Start your project"**
3. Entre com sua conta Google ou crie um e-mail/senha
4. Confirme o e-mail se necessário

### Passo 2 — Criar um novo projeto
1. Clique em **"New project"**
2. Dê um nome: `cefise-avaliacao`
3. Crie uma **senha do banco** (anote em lugar seguro)
4. Em **Region**, selecione **South America (São Paulo)**
5. Clique em **"Create new project"**
6. Aguarde 1-2 minutos enquanto o projeto é criado

### Passo 3 — Criar as tabelas
1. No menu lateral esquerdo, clique em **"SQL Editor"**
2. Clique em **"New query"**
3. Abra o arquivo `banco-de-dados.sql` (que está na pasta do projeto)
4. Copie todo o conteúdo e cole no editor do Supabase
5. Clique em **"Run"** (ou pressione Ctrl+Enter)
6. Você verá a mensagem "Success" em verde

### Passo 4 — Pegar as credenciais
1. No menu lateral, clique em **"Settings"** (ícone de engrenagem)
2. Clique em **"API"**
3. Copie dois valores:
   - **Project URL** (começa com `https://xxx.supabase.co`)
   - **anon public** key (texto longo que começa com `eyJ...`)

### Passo 5 — Colocar as credenciais no sistema
1. Abra o arquivo `supabase-config.js` com o Bloco de Notas
2. Substitua `COLE_AQUI_SUA_URL_DO_SUPABASE` pela **Project URL**
3. Substitua `COLE_AQUI_SUA_ANON_KEY_DO_SUPABASE` pela **anon public key**
4. Salve o arquivo

---

## PARTE 2 — Criar o primeiro usuário administrador

### Passo 6 — Criar conta de login
1. No Supabase, vá em **"Authentication"** → **"Users"**
2. Clique em **"Invite user"** ou **"Add user"**
3. Coloque seu e-mail e uma senha forte
4. Anote o **UUID** que aparece na coluna "User UID"

### Passo 7 — Registrar como administrador
1. Vá em **"SQL Editor"** → **"New query"**
2. Cole o texto abaixo, substituindo os valores:

```sql
insert into profissionais (user_id, nome, especialidade, role)
values ('COLE-SEU-UUID-AQUI', 'Seu Nome Completo', 'Fisioterapeuta', 'admin');
```

3. Clique em **"Run"**

---

## PARTE 3 — Colocar o sistema no ar (Vercel)

### Passo 8 — Criar conta no GitHub (necessário para o Vercel)
1. Acesse **https://github.com** e crie uma conta gratuita
2. Confirme o e-mail

### Passo 9 — Subir os arquivos no GitHub
1. Clique em **"New repository"** (botão verde)
2. Nome: `cefise-avaliacao`
3. Deixe como **Private** (privado)
4. Clique em **"Create repository"**
5. Clique em **"uploading an existing file"**
6. Arraste TODOS os arquivos da pasta do projeto para a área indicada:
   - `index.html`
   - `style.css`
   - `app.js`
   - `supabase-config.js` (com suas credenciais já preenchidas)
   - `banco-de-dados.sql`
   - A pasta `public/` com o logo
7. Clique em **"Commit changes"**

### Passo 10 — Criar conta no Vercel
1. Acesse **https://vercel.com**
2. Clique em **"Sign up"** → **"Continue with GitHub"**
3. Autorize o acesso

### Passo 11 — Publicar o sistema
1. Na dashboard do Vercel, clique em **"Add New Project"**
2. Selecione o repositório `cefise-avaliacao`
3. Clique em **"Deploy"**
4. Aguarde 1-2 minutos
5. O Vercel vai gerar um link como: `cefise-avaliacao.vercel.app`

---

## PARTE 4 — Configurar os profissionais

### Passo 12 — Adicionar mais profissionais
1. Acesse o sistema pelo link gerado
2. Faça login com o e-mail/senha do administrador
3. No menu lateral, clique em **"Profissionais"**
4. Clique em **"Adicionar profissional"**
5. Preencha nome, especialidade, CRF, e-mail e senha
6. O profissional receberá os dados de acesso para entrar

---

## DÚVIDAS FREQUENTES

**O sistema vai sair do ar?**
Não, enquanto o Supabase e o Vercel tiverem seus projetos ativos (plano gratuito).

**Os dados ficam salvos?**
Sim! Todos os dados ficam no banco de dados do Supabase, permanentemente.

**10 profissionais é o limite?**
Não é um limite técnico — é só o que foi configurado. Pode adicionar mais.

**Posso usar no celular?**
Sim! O sistema é responsivo e funciona em qualquer navegador mobile.

**Os dados são seguros?**
Sim. O Supabase usa criptografia e autenticação. Apenas usuários logados acessam os dados.

---

## SUPORTE

Em caso de dúvidas na configuração, o ChatGPT ou o Claude podem ajudar — basta descrever em qual passo travou.
