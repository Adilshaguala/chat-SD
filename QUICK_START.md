# Quick Start Guide - Luma Chat App

## 1. Configuração Inicial

### Variáveis de Ambiente
Certifique-se de que as seguintes variáveis estão configuradas:
```
NEXT_PUBLIC_SUPABASE_URL=<sua-url-supabase>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<sua-chave-anonima>
```

### Iniciar o Dev Server
```bash
pnpm run dev
```

Acesse: http://localhost:3000

## 2. Testar a Aplicação (5 Minutos)

### Passo 1: Criar Conta (1 min)
- Ir para `/auth/sign-up`
- Email: `user1@example.com`
- Senha: `senha123`
- Criar conta
- Fazer login automático

### Passo 2: Completar Perfil (1 min)
- Clicar em ícone de perfil (canto inferior esquerdo)
- Mudar nome para "User 1"
- Fazer upload de avatar (opcional)
- Salvar alterações

### Passo 3: Criar Segundo Usuário (1 min)
- Abrir nova aba incógnita
- Ir para `/auth/sign-up`
- Email: `user2@example.com`
- Senha: `senha123`
- Fazer login

### Passo 4: Buscar Usuário e Criar Conversa (1 min)
- Na primeira aba (User 1), clicar em "+"
- Buscar "user2" ou "user2@example.com"
- Clicar no resultado
- Conversa privada criada automaticamente

### Passo 5: Testar Mensagens (1 min)
- User 1: Digitar "Olá, isso é um teste!"
- Pressionar Enter
- Ver mensagem aparecer em ambas as abas em tempo real
- User 2: Responder "Funciona! 🎉"

## 3. Testar Funcionalidades Avançadas

### Reações (Emoji)
1. Fazer hover sobre uma mensagem
2. Clicar no ícone 😊
3. Selecionar emoji (ex: 👍)
4. Ver reação aparecer na mensagem

### Respostas
1. Fazer hover sobre uma mensagem
2. Clicar no ícone de resposta ↩️
3. Digitar resposta
4. Enviar
5. Ver resposta linkada à mensagem original

### Upload de Arquivo
1. Clicar no ícone de clipe 📎
2. Selecionar imagem ou arquivo
3. Ver preview
4. Clicar no ícone de envio
5. Ver arquivo na conversa

### Gravação de Áudio
1. Clicar no ícone de microfone 🎤
2. Permitir acesso ao microfone
3. Falar algo
4. Clicar em parar
5. Enviar áudio
6. Ouvir em ambas as abas

### Criar Grupo
1. Clicar em "+"
2. Mudar para aba "Grupo"
3. Nome: "Teste de Grupo"
4. Buscar outro usuário
5. Clicar para adicionar
6. Clicar "Criar grupo (1 selecionado)"
7. Ver grupo na lista

### Status Online
1. Abrir duas abas do mesmo usuário
2. Sair do chat em uma aba
3. Ver status mudar para "offline"
4. Voltar para a aba
5. Ver status voltar para "online"

### Indicador de Digitação
1. User 1: Começar a digitar (não enviar)
2. User 2: Ver "User 1 está digitando..."
3. User 1: Terminar de digitar/enviar
4. Ver indicador desaparecer

## 4. Possíveis Problemas e Soluções

### Problema: "Conversa já existe"
**Solução**: Você já criou uma conversa com este usuário. Use a conversa existente na sidebar.

### Problema: "Erro ao fazer upload"
**Solução**: 
- Verificar tamanho do arquivo (máx 50MB recomendado)
- Verificar permissões de storage no Supabase
- Verificar se buckets existem

### Problema: Mensagens não aparecem em tempo real
**Solução**:
- Verificar conexão com internet
- Atualizar página (F5)
- Verificar se Real-time está habilitado no Supabase

### Problema: Não encontra usuários na busca
**Solução**:
- Verificar se usuário está cadastrado
- Usar email completo para buscar
- Esperar 300ms (debounce)

### Problema: Avatar não atualiza
**Solução**:
- Fazer cache clear (Ctrl+Shift+Delete)
- Verificar tamanho da imagem (máx 5MB)
- Verificar permissões de storage

## 5. Checklist de Funcionalidades

- [ ] Criar conta
- [ ] Editar perfil
- [ ] Upload de avatar
- [ ] Buscar usuários
- [ ] Criar conversa privada
- [ ] Enviar mensagem de texto
- [ ] Ver mensagem em tempo real
- [ ] Adicionar reação (emoji)
- [ ] Responder mensagem
- [ ] Deletar mensagem própria
- [ ] Upload de imagem
- [ ] Upload de vídeo
- [ ] Upload de áudio/documento
- [ ] Gravar áudio
- [ ] Criar grupo
- [ ] Adicionar membros ao grupo
- [ ] Ver status online
- [ ] Ver "visto por último"
- [ ] Ver indicador de digitação
- [ ] Logout

## 6. Arquivos Importantes

```
IMPLEMENTATION_STATUS.md  - Status detalhado da implementação
COMPLETION_SUMMARY.md     - Sumário completo de tudo que foi feito
app/actions/              - Server actions para operações
components/chat/          - Componentes da interface
hooks/                    - Hooks customizados
app/profile/              - Página de perfil
app/chat/                 - Página de chat
```

## 7. URLs Rápidas

- Home: http://localhost:3000/
- Login: http://localhost:3000/auth/login
- Sign Up: http://localhost:3000/auth/sign-up
- Chat: http://localhost:3000/chat
- Perfil: http://localhost:3000/profile

## 8. Debug

Para ver logs detalhados:
1. Abrir DevTools (F12)
2. Console
3. Procurar por logs com prefixo `[v0]`
4. Expandir objetos para ver dados

Exemplo de log:
```
[v0] Error creating private chat: Error creating conversation
```

## 9. Suporte

Se encontrar erros:
1. Verificar IMPLEMENTATION_STATUS.md
2. Verificar console do navegador (F12)
3. Verificar logs do servidor (terminal)
4. Verificar Supabase Dashboard para erros de banco de dados

## 10. Próximos Passos

Depois de testar tudo:
1. Deploy para Vercel (com `vercel deploy`)
2. Configurar domínio customizado
3. Adicionar notificações push
4. Implementar busca de mensagens
5. Adicionar chamadas de áudio/vídeo

---

**Status**: ✅ Pronto para testar!

Divirta-se testando a aplicação! 🚀
