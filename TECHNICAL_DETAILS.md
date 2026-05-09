# Detalhes Técnicos - Luma Chat

## Stack Técnico

### Frontend
- **Framework**: Next.js 16 (App Router)
- **React**: v19
- **Styling**: Tailwind CSS v4
- **UI Components**: shadcn/ui
- **State Management**: SWR (client-side), React hooks
- **Icons**: Lucide Icons
- **Notifications**: Sonner
- **Date Formatting**: date-fns

### Backend
- **Runtime**: Node.js (Vercel Serverless)
- **Server Actions**: Next.js Server Actions
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth
- **Storage**: Supabase Storage
- **Real-time**: Supabase Realtime

### APIs & Integrações
- **Supabase Client**: @supabase/supabase-js
- **Supabase SSR**: @supabase/ssr
- **Web APIs**: MediaRecorder, Notification API

---

## Arquitetura da Aplicação

### Fluxo de Dados

```
┌─────────────────────────────────────────────────────────────────┐
│                        Browser / Cliente                         │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │           Next.js 16 App Router (Frontend)               │  │
│  │  ┌─────────────────────────────────────────────────────┐ │  │
│  │  │            React Components                         │ │  │
│  │  │  ├─ ChatArea                                        │ │  │
│  │  │  ├─ MessageInput                                    │ │  │
│  │  │  ├─ NewChatDialog                                   │ │  │
│  │  │  └─ ProfilePage                                     │ │  │
│  │  └─────────────────────────────────────────────────────┘ │  │
│  │                           ↓                                 │  │
│  │  ┌─────────────────────────────────────────────────────┐ │  │
│  │  │           SWR + React Hooks (State)                 │ │  │
│  │  │  ├─ useMessageRealtime                              │ │  │
│  │  │  ├─ useAudioRecorder                                │ │  │
│  │  │  └─ usePresence                                     │ │  │
│  │  └─────────────────────────────────────────────────────┘ │  │
│  └──────────────────────────────────────────────────────────┘  │
│                           ↓                                      │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │        Supabase Client (@supabase/supabase-js)          │  │
│  │  ├─ Database queries                                    │  │
│  │  ├─ Real-time subscriptions                             │  │
│  │  ├─ Storage operations                                  │  │
│  │  └─ Auth operations                                     │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                           ↓ HTTPS
┌─────────────────────────────────────────────────────────────────┐
│                    Vercel Edge Network                           │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │        Next.js 16 Server Actions (Backend API)          │  │
│  │  ├─ /app/actions/chat.ts                                │  │
│  │  ├─ /app/actions/profile.ts                             │  │
│  │  ├─ /app/actions/user.ts                                │  │
│  │  └─ /app/actions/files.ts                               │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                           ↓ HTTPS
┌─────────────────────────────────────────────────────────────────┐
│                      Supabase Backend                            │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │        PostgreSQL Database (com RLS)                     │  │
│  │  ├─ profiles                                             │  │
│  │  ├─ conversations                                        │  │
│  │  ├─ conversation_participants                            │  │
│  │  ├─ messages                                             │  │
│  │  ├─ message_attachments                                  │  │
│  │  ├─ message_status                                       │  │
│  │  └─ message_reactions                                    │  │
│  └──────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │            Storage (S3-compatible)                       │  │
│  │  ├─ chat-attachments                                     │  │
│  │  └─ avatars                                              │  │
│  └──────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │        Realtime (WebSocket)                              │  │
│  │  └─ PostgreSQL Changes Subscriptions                     │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Server Actions Pattern

### Benefícios
- Type-safe RPC calls
- Automatic serialization
- Server-side data validation
- Secure authentication (automatic)
- No API routes needed
- Built-in error handling

### Estrutura
```typescript
// /app/actions/example.ts
"use server";

import { createClient } from "@/lib/supabase/server";

export async function exampleAction(param: string) {
  // Sempre conseguir usuário autenticado
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) throw new Error("Unauthorized");
  
  // Executar lógica
  const result = await supabase.from("table").insert({ ... });
  
  return result;
}
```

### Uso no Cliente
```typescript
// Componente React
"use client";

import { exampleAction } from "@/app/actions/example";

export function Component() {
  const handleClick = async () => {
    try {
      const result = await exampleAction("param");
      // Usar resultado
    } catch (error) {
      // Tratamento de erro
    }
  };
}
```

---

## Real-Time Subscriptions

### PostgreSQL Changes
```typescript
const channel = supabase
  .channel(`messages-${conversationId}`)
  .on(
    "postgres_changes",
    {
      event: "*", // INSERT, UPDATE, DELETE
      schema: "public",
      table: "messages",
      filter: `conversation_id=eq.${conversationId}`,
    },
    (payload) => {
      // Handle change
      refreshMessages();
    }
  )
  .subscribe();

// Cleanup
supabase.removeChannel(channel);
```

### Limitações & Considerações
- Requer `REALTIME` policy habilitada (padrão: on)
- WebSocket mantém-se aberto enquanto subscrito
- Desconexões automáticas após inatividade
- Máximo 200 canals por cliente

---

## Row Level Security (RLS)

### Exemplo: Política para Mensagens
```sql
CREATE POLICY "Users can view messages in conversations they're part of"
  ON messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversation_participants
      WHERE conversation_id = messages.conversation_id
      AND user_id = auth.uid()
    )
  );
```

### Verificação de Segurança
- Cada query SELECT/INSERT/UPDATE/DELETE é verificada
- O usuário autenticado é automaticamente injetado
- `auth.uid()` retorna UUID do usuário
- Sem RLS habilitado, ninguém consegue acessar (exceto anon)

---

## State Management

### Client-Side (SWR)
```typescript
const { data: messages, mutate } = useSWR(
  `messages-${conversationId}`,
  () => fetchMessages(conversationId)
);

// Revalidar
mutate();

// Usar data
{messages?.map(msg => <MessageBubble key={msg.id} {...msg} />)}
```

### Server-Side (React Server Components)
```typescript
// /app/chat/page.tsx
export default async function ChatPage() {
  const supabase = await createClient();
  const { data: conversations } = await supabase
    .from("conversations")
    .select("*");
  
  return <ChatLayout conversations={conversations} />;
}
```

---

## Padrões de Erro Handling

### Server Actions
```typescript
try {
  const result = await operation();
  return { success: true, data: result };
} catch (error) {
  console.error("[v0] Error:", error);
  throw error; // Re-throw para o cliente
}
```

### Componentes React
```typescript
try {
  await serverAction();
  toast.success("Sucesso!");
} catch (error) {
  console.error("[v0] Error:", error);
  toast.error(
    error instanceof Error 
      ? error.message 
      : "Algo deu errado"
  );
}
```

---

## Performance Optimization

### 1. Image Optimization
- Usar Next.js Image component para imagens
- Lazy loading automático
- WebP conversion

### 2. Code Splitting
- Componentes com `dynamic()` para lazy loading
- Route-based code splitting automático

### 3. Caching
- SWR cache padrão: 2000ms
- Revalidation on refocus habilitada
- ISR para páginas estáticas

### 4. Database Queries
- Índices em `conversation_id`, `sender_id`, `user_id`
- Select específicos (não `*`)
- Limit nas queries de lista

### 5. Real-Time
- Debounce de 300ms nas buscas
- Timeout automático de subscriptions
- Channel removal no cleanup

---

## Security Best Practices Implementadas

### 1. Authentication
- ✅ Supabase Auth com email/password
- ✅ JWT tokens armazenados em cookies (secure, httpOnly)
- ✅ Server-side validation em todas as actions

### 2. Authorization (RLS)
- ✅ Row Level Security em todas as tabelas
- ✅ Políticas granulares por operação (SELECT, INSERT, UPDATE, DELETE)
- ✅ Isolamento de dados por usuário

### 3. Input Validation
- ✅ Validação server-side em todas as actions
- ✅ Type-safe com TypeScript
- ✅ Sanitização de input

### 4. Data Protection
- ✅ HTTPS obrigatório
- ✅ Senhas com hash (bcrypt via Supabase)
- ✅ Tokens com expiração

### 5. API Security
- ✅ Server Actions (não expostas diretamente)
- ✅ Autenticação automática em cada ação
- ✅ CORS habilitado apenas para origem Vercel

---

## Logging & Debugging

### Console Logs
Todos os logs usam prefixo `[v0]`:
```typescript
console.error("[v0] Error creating conversation:", error);
console.log("[v0] Messages loaded:", messages.length);
```

### DevTools
1. **Network Tab**: Ver requisições para Supabase
2. **Console**: Buscar por `[v0]` para logs
3. **Application**: Ver tokens JWT em cookies
4. **Storage**: Ver localStorage (empty por design)

### Supabase Dashboard
1. **Logs**: Ver queries e erros
2. **Realtime**: Status das subscriptions
3. **Storage**: Ver arquivos uploaded
4. **Database**: Explorar dados

---

## Deploy Checklist

- [ ] Variáveis de ambiente configuradas no Vercel
- [ ] NEXT_PUBLIC_SUPABASE_URL configurada
- [ ] NEXT_PUBLIC_SUPABASE_ANON_KEY configurada
- [ ] Buckets criados no Supabase
- [ ] RLS policies habilitadas
- [ ] REALTIME habilitado
- [ ] Build succeeds: `npm run build`
- [ ] Sem erros TypeScript: `npm run type-check`
- [ ] Teste de login funcionando
- [ ] Teste de mensagem funcionando

---

## Troubleshooting

### Conexão com Banco
```
ERROR: "Failed to fetch"
→ Verificar variáveis de ambiente
→ Verificar se Supabase está online
```

### RLS Bloqueando Operação
```
ERROR: "new row violates row-level security policy"
→ Verificar RLS policies
→ Verificar auth.uid() é correto
```

### Real-Time Não Funcionando
```
SYMPTOM: Mensagens não atualizam em tempo real
→ Verificar WebSocket connection (DevTools → Network → WS)
→ Verificar REALTIME habilitado no Supabase
→ Verificar `removeChannel` sendo chamado
```

### Arquivo Não Upload
```
ERROR: "Not authenticated to access bucket"
→ Verificar Storage policies
→ Verificar bucket existe
→ Verificar tipo de arquivo permitido
```

---

## Próximas Melhorias Técnicas

1. **Offline Support**
   - Service Worker para cache
   - IndexedDB para dados locais
   - Sincronização quando volta online

2. **Escalabilidade**
   - Paginação de mensagens
   - Virtualização de listas
   - Compressão de imagens

3. **Observabilidade**
   - Sentry para error tracking
   - PostHog para analytics
   - OpenTelemetry para tracing

4. **Performance**
   - Redis cache para queries frecuentes
   - CDN para Storage
   - Image optimization pipeline

---

## Referências

- [Next.js Docs](https://nextjs.org/docs)
- [Supabase Docs](https://supabase.com/docs)
- [React Docs](https://react.dev)
- [Tailwind CSS](https://tailwindcss.com)
- [shadcn/ui](https://ui.shadcn.com)

---

**Last Updated**: 2026-05-09
**Version**: 1.0 (Complete Implementation)
