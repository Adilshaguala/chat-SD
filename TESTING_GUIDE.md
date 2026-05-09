# Guia de Testes - Luma Chat

## Status Atual
✅ Servidor rodando: `http://localhost:3000`  
✅ Banco de dados: Supabase conectado  
✅ RLS: Corrigido (sem recursão infinita)  
✅ Variáveis de ambiente: Configuradas  

## Teste 1: Autenticação (5 min)

### 1.1 Fazer Sign-up
```
1. Vá para http://localhost:3000/auth/sign-up
2. Preencha:
   - Email: testuser@example.com
   - Senha: Test@1234
   - Confirme senha
3. Clique em "Cadastrar"
```

**Esperado:**
- Página redireciona para `/auth/sign-up-success`
- Mensagem "Confira seu email"

### 1.2 Fazer Login
```
1. Vá para http://localhost:3000/auth/login
2. Preencha:
   - Email: testuser@example.com
   - Senha: Test@1234
3. Clique em "Entrar"
```

**Esperado:**
- Página redireciona para `/chat`
- Mostra lista de conversas vazia

---

## Teste 2: Perfil de Usuário (3 min)

### 2.1 Acessar Perfil
```
1. Na página /chat, clique no ícone ⚙️ (Settings) no canto inferior
2. Você será redirecionado para /profile
```

**Esperado:**
- Página carrega sem erro
- Mostra nome do usuário
- Mostra espaço para avatar

### 2.2 Editar Perfil
```
1. Na página de perfil, altere o nome
2. Clique em "Salvar Alterações"
```

**Esperado:**
- Mensagem: "Perfil atualizado com sucesso!"
- Nome é atualizado na sidebar

### 2.3 Upload de Avatar
```
1. Clique em "Escolher Arquivo" no avatar
2. Selecione uma imagem
3. Clique em "Salvar Alterações"
```

**Esperado:**
- Avatar é exibido
- Aparece em todas as conversas

---

## Teste 3: Criar Conversa Privada (3 min)

### 3.1 Criar Segunda Conta
```
1. Faça logout (clique X ao lado do nome)
2. Acesse http://localhost:3000/auth/sign-up
3. Cadastre: user2@example.com / Pass@1234
4. Faça login novamente com essa conta
```

### 3.2 Nova Conversa Privada
```
1. De volta na primeira conta
2. Clique no botão "+" (novo chat)
3. Na aba "Privado", busque por "user2"
4. Clique no usuário encontrado
```

**Esperado:**
- Conversa é criada
- Você é redirecionado para a conversa
- Lista aparece na sidebar

---

## Teste 4: Enviar Mensagem (3 min)

### 4.1 Enviar Texto
```
1. Na conversa, digite: "Olá! Teste de mensagem"
2. Pressione Enter ou clique em "Enviar"
```

**Esperado:**
- Mensagem aparece imediatamente
- Mostra seu avatar
- Status: ✓ (enviada)

### 4.2 Adicionar Reação
```
1. Passe o mouse sobre a mensagem
2. Clique em "😊" (emoji)
3. Selecione um emoji (ex: 👍)
```

**Esperado:**
- Emoji aparece abaixo da mensagem
- Contador sobe se clicar novamente

---

## Teste 5: Criar Grupo (5 min)

### 5.1 Nova Aba de Grupo
```
1. Clique em "+" (novo chat)
2. Mude para aba "Grupo"
3. Digitar nome: "Grupo Teste"
```

### 5.2 Adicionar Membros
```
1. Busque por "user2"
2. Clique no checkbox para selecionar
3. Selecione outros usuários (se houver)
4. Clique em "Criar Grupo"
```

**Esperado:**
- Grupo é criado
- Você e os membros aparecem na lista
- Conversa aparece na sidebar

---

## Teste 6: Upload de Arquivo (3 min)

### 6.1 Enviar Imagem
```
1. Na conversa, clique no ícone "📎" (clip)
2. Selecione "Imagem"
3. Escolha uma imagem do seu computador
4. Clique em "Enviar"
```

**Esperado:**
- Imagem é enviada
- Aparece em miniatura
- Pode clicar para ampliar

### 6.2 Enviar Áudio
```
1. Clique no ícone "🎙️" (microfone)
2. Clique para gravar
3. Fale algo
4. Clique para parar
5. Clique em "Enviar"
```

**Esperado:**
- Áudio é gravado
- Mostra duração
- Outro usuário pode ouvir

---

## Teste 7: Mensagens em Tempo Real (5 min)

### 7.1 Testar em Dois Abas
```
1. Abra localhost:3000 em duas abas diferentes
2. Login em cada aba com um usuário diferente
3. Na aba 1, envie uma mensagem
```

**Esperado:**
- Mensagem aparece IMEDIATAMENTE na aba 2
- Sem recarregar a página
- Status aparece em tempo real

---

## Verificação de Erro: RLS Recursion

### Como Testar que Foi Corrigido
```
1. Abra DevTools (F12)
2. Vá para Network
3. Crie uma nova conversa
4. Procure por erros 500 ou "recursion"
```

**Esperado:**
- ✅ Sem erros "infinite recursion"
- ✅ Requests terminam com sucesso
- ✅ RLS policies executam rapidamente

---

## Checklist de Validação

### Autenticação
- [ ] Sign-up funciona
- [ ] Login funciona
- [ ] Logout funciona
- [ ] Session persiste no reload

### Perfil
- [ ] Página /profile carrega
- [ ] Editar nome funciona
- [ ] Upload de avatar funciona
- [ ] Avatar aparece nas conversas

### Conversas
- [ ] Criar conversa privada funciona
- [ ] Criar grupo funciona
- [ ] Lista de conversas aparece
- [ ] Conversa fica selecionada

### Mensagens
- [ ] Enviar texto funciona
- [ ] Enviar imagem funciona
- [ ] Enviar áudio funciona
- [ ] Real-time funciona
- [ ] Reações funcionam

### RLS
- [ ] Sem erro "recursion" na console
- [ ] Sem erro 500 ao criar conversa
- [ ] Sem erro 500 ao enviar mensagem
- [ ] Sem erro 500 ao fazer upload

---

## Solução de Problemas

### "Erro: URL e Key necessárias"
- Verifique se Supabase está conectado
- Execute: `GetOrRequestIntegration(["Supabase"])`

### "Página 404 ao acessar /profile"
- Middleware pode estar redirecionando
- Verifique `/middleware.ts` ou `/lib/supabase/proxy.ts`

### "Erro ao criar conversa"
- Verifique se RLS foi corrigido (sem recursão)
- Veja os logs do servidor em tempo real

### "Imagem não aparece após upload"
- Verifique se bucket "chat-attachments" existe
- Verifique permissões de storage

### "Áudio não grava"
- Navegador requer permissão de microfone
- Verifique console para erros de permissão

---

## Logs Úteis

### Ver erros em tempo real
```bash
tail -f /tmp/dev.log
```

### Verificar servidor rodando
```bash
curl http://localhost:3000/
```

### Limpar cache
```bash
rm -rf .next/
pnpm run dev
```

---

## Próximos Testes (Avançado)

- [ ] Teste de carga (múltiplos usuários)
- [ ] Teste de segurança (tentar acessar conversa de outro)
- [ ] Teste de performance (muitas mensagens)
- [ ] Teste de navegação entre chats

---

Boa sorte nos testes! 🚀
