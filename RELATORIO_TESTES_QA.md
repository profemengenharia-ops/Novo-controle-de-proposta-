# Relatório de Testes de Qualidade — ProFem Proposal Gen

**Data:** 2026-05-08  
**Versão analisada:** branch `claude/nostalgic-spence-fe3dde` (commit base: `dccee7a`)  
**Modo de execução:** Mock Mode (localStorage — sem Supabase)  
**Analista:** Claude Code (simulação de dois perfis de usuário)

---

## 1. Perfis Testados

| Perfil | Papel | Fluxos avaliados |
|--------|-------|-----------------|
| **Orçamentista** | Engenheiro responsável por montar propostas técnicas e financeiras | ProposalWizard, PricingFormulation, BudgetManager, NormsManager |
| **Equipe Comercial** | Vendedor/gestor que acompanha o funil e interações com clientes | Dashboard, ProposalList, ManualProposalModal, Reports |

---

## 2. Cenários de Teste

### 2.1 Criar proposta via Wizard (Orçamentista)

| Passo | Ação | Resultado esperado | Resultado observado |
|-------|------|--------------------|---------------------|
| 1 | Clicar em "Nova Proposta > Gerar com IA" | Navegar para ProposalWizard, aba Geral | ✅ Correto |
| 2 | Preencher cliente, número, prazo, validade | Campos preenchidos, avançar para Referências | ✅ Correto |
| 3 | Adicionar itens comerciais manualmente | Itens aparecem na lista com valor | ✅ Correto |
| 4 | Abrir formação de preço BDI | Modal PricingFormulation abre inline | ✅ Correto |
| 5 | Ajustar parâmetros BDI e clicar "Aplicar à Proposta" | "Valor Final Sugerido" na sidebar exibe o preço BDI | ❌ BUG-001 — exibia soma dos itens |
| 6 | Verificar sugestão de margem 15% | Porcentagem exibida corretamente | ❌ BUG-002 — fórmula usava ×1.15 (≈13%) |
| 7 | Salvar proposta | Proposta gravada no mock store | ✅ Correto |

### 2.2 Registro manual de proposta (Equipe Comercial)

| Passo | Ação | Resultado esperado | Resultado observado |
|-------|------|--------------------|---------------------|
| 1 | Clicar "Nova Proposta > Registro Manual" | Abre ManualProposalModal | ✅ Correto |
| 2 | Selecionar status | Lista exibe nomes legíveis em português | ❌ BUG-008 — exibia enum em maiúsculas (ex.: "RASCUNHO") |
| 3 | Salvar | Proposta criada e lista atualizada | ✅ Correto |
| 4 | Verificar aba ativa na sidebar | "Propostas" fica destacada ao abrir modal | ❌ BUG-009 — aba correta não ficava ativa |

### 2.3 Dashboard — visão geral (Equipe Comercial)

| Passo | Ação | Resultado esperado | Resultado observado |
|-------|------|--------------------|---------------------|
| 1 | Acessar Dashboard | KPIs e tabela de propostas recentes | ✅ Correto |
| 2 | Verificar badge de status na tabela | Exibe label em português ("Rascunho", "Ganha") | ❌ BUG-005 — exibia valor do enum ("rascunho") |
| 3 | Verificar prazo de vencimento | Calcula dias restantes dinamicamente | ❌ BUG-006 — hardcoded "Vence em 12 dias" |

### 2.4 Lista de propostas — ações de menu (Equipe Comercial)

| Passo | Ação | Resultado esperado | Resultado observado |
|-------|------|--------------------|---------------------|
| 1 | Clicar "..." > Copiar Link Público | URL copiada para área de transferência | ❌ BUG-004 — abria nova aba ao invés de copiar |
| 2 | Clicar "..." > Baixar PDF | Abre view de impressão/PDF | ❌ BUG-003 — botão sem onClick (sem efeito) |
| 3 | Expandir linha > ver Probabilidade | Reflete status real da proposta | ❌ BUG-007 — sempre "Alta (IA Calc)" |

### 2.5 Gerenciamento de normas (Orçamentista)

| Passo | Ação | Resultado esperado | Resultado observado |
|-------|------|--------------------|---------------------|
| 1 | Criar norma | Norma salva | ✅ Correto |
| 2 | Editar norma existente | Campo de edição inline | ❌ BUG-010 — não existe botão/função de edição |
| 3 | Excluir norma | Confirmação e remoção | ✅ Correto |

---

## 3. Bugs Encontrados

### BUG-001 — Valor Final Sugerido ignora BDI aplicado
- **Severidade:** CRÍTICA  
- **Arquivo:** [`src/components/ProposalWizard.tsx:998`](src/components/ProposalWizard.tsx)  
- **Descrição:** Após clicar "Aplicar à Proposta" na formação BDI, a sidebar exibia `calculateTotal(items)` em vez de `commercialProposal.totalValue`, que é onde o preço BDI é armazenado. O usuário via o preço errado e poderia salvar sem perceber.  
- **Impacto:** Orçamentista pensa que o preço BDI foi aplicado, mas a sidebar mostra o custo direto — decisão financeira baseada em dado incorreto.  
- **Status:** ✅ Corrigido

**Antes:**
```tsx
{formatCurrency(calculateTotal(proposal.commercialProposal?.items || []))}
```
**Depois:**
```tsx
{formatCurrency(proposal.commercialProposal?.totalValue || calculateTotal(proposal.commercialProposal?.items || []))}
```

---

### BUG-002 — Fórmula de margem-alvo incorreta (×1.15 ≠ 15%)
- **Severidade:** CRÍTICA  
- **Arquivo:** [`src/components/PricingFormulation.tsx:426`](src/components/PricingFormulation.tsx)  
- **Descrição:** Para atingir margem líquida de 15%, o preço-alvo deve ser `custo / 0,85`. O código usava `custo × 1,15`, que resulta em ~13,04% de margem real. A sugestão exibida ao usuário induzia erro de precificação.  
- **Impacto:** Orçamentista que segue a sugestão perde ~2% de margem em cada proposta.  
- **Status:** ✅ Corrigido

**Antes:**
```tsx
{((totalBaseCost * 1.15 - salePrice) / salePrice * 100).toFixed(1)}%
```
**Depois:**
```tsx
{((totalBaseCost / 0.85 - salePrice) / salePrice * 100).toFixed(1)}%
```

---

### BUG-003 — "Baixar PDF" sem ação
- **Severidade:** MÉDIA  
- **Arquivo:** [`src/components/ProposalList.tsx:287`](src/components/ProposalList.tsx)  
- **Descrição:** O botão "Baixar PDF" no menu de ações não tinha `onClick`. Clicar não produzia nenhum efeito.  
- **Status:** ✅ Corrigido — abre `/proposal/{id}?print=1` em nova aba, acionando a view de impressão existente.

---

### BUG-004 — "Copiar Link Público" abria nova aba em vez de copiar
- **Severidade:** MÉDIA  
- **Arquivo:** [`src/components/ProposalList.tsx:283`](src/components/ProposalList.tsx)  
- **Descrição:** `onClick` usava `window.open()` ao invés de `navigator.clipboard.writeText()`.  
- **Status:** ✅ Corrigido — copia para clipboard e exibe toast de confirmação.

---

### BUG-005 — Badge de status exibe valor do enum bruto
- **Severidade:** MÉDIA  
- **Arquivo:** [`src/components/Dashboard.tsx:134`](src/components/Dashboard.tsx)  
- **Descrição:** A tabela de propostas recentes exibia `p.status` diretamente (ex.: `"rascunho"`, `"em_negociacao"`), ignorando o mapeamento `STATUS_TAGS` já disponível em `src/constants.ts`.  
- **Status:** ✅ Corrigido — usa `STATUS_TAGS[p.status]?.label` com fallback.

---

### BUG-006 — "Vence em 12 dias" hardcoded
- **Severidade:** MÉDIA  
- **Arquivo:** [`src/components/Dashboard.tsx:191`](src/components/Dashboard.tsx)  
- **Descrição:** Todas as propostas no painel de follow-up exibiam "Vence em 12 dias" independentemente da data real de criação e do prazo de validade.  
- **Status:** ✅ Corrigido — calcula dinamicamente: `validityDays - diasDesideCriação`, exibindo "EXPIRADA" quando negativo.

---

### BUG-007 — Probabilidade de fechamento sempre "Alta (IA Calc)"
- **Severidade:** MÉDIA  
- **Arquivo:** [`src/components/ProposalList.tsx:389`](src/components/ProposalList.tsx)  
- **Descrição:** O card expandido de proposta exibia probabilidade hardcoded "Alta (IA Calc)" para todas as propostas, sem relação com o status real.  
- **Status:** ✅ Corrigido — derivado do `p.status`: Ganha/Perdida/Alta/Média/Em aberto.

---

### BUG-008 — Select de status exibe enum em maiúsculas brutas
- **Severidade:** MÉDIA  
- **Arquivo:** [`src/components/ManualProposalModal.tsx:139`](src/components/ManualProposalModal.tsx)  
- **Descrição:** As opções do select usavam `val.toUpperCase()` (ex.: "RASCUNHO", "EM_NEGOCIACAO") em vez do label amigável do `STATUS_TAGS`.  
- **Status:** ✅ Corrigido — usa `STATUS_TAGS[val]?.label` com fallback para o valor bruto.

---

### BUG-009 — Sidebar não destaca "Propostas" ao abrir modal manual
- **Severidade:** MÉDIA  
- **Arquivo:** [`src/App.tsx:118`](src/App.tsx)  
- **Descrição:** A condição que mapeia tabs filhas para o item "Propostas" no menu lateral cobria `new-proposal` e rotas `edit-*`, mas não `manual-proposal`. Ao abrir o modal manual, nenhum item ficava ativo na sidebar.  
- **Status:** ✅ Corrigido — adicionado `|| activeTab === 'manual-proposal'` à condição.

---

### BUG-010 — NormsManager sem funcionalidade de edição
- **Severidade:** BAIXA  
- **Arquivo:** [`src/components/NormsManager.tsx`](src/components/NormsManager.tsx)  
- **Descrição:** Tanto normas quanto blocos de texto padrão só suportam criação e exclusão. Não há botão ou fluxo de edição inline. Para corrigir um campo, o usuário precisa excluir e recriar.  
- **Status:** ⚠️ Não corrigido nesta sessão (requer redesign de UX do formulário de criação para modo duplo criar/editar).

---

### BUG-011 — "Anexos Inteligentes" com arquivos fictícios
- **Severidade:** BAIXA  
- **Arquivo:** [`src/components/ProposalWizard.tsx`](src/components/ProposalWizard.tsx) (passo 4)  
- **Descrição:** A seção de anexos exibe uma lista hardcoded de arquivos fictícios ("memorial_descritivo_v2.pdf", etc.) sem handler de upload ou download real.  
- **Status:** ⚠️ Não corrigido nesta sessão (requer integração com storage).

---

## 4. Resumo Executivo

| Categoria | Total | Corrigidos | Pendentes |
|-----------|-------|------------|-----------|
| CRÍTICO | 2 | 2 | 0 |
| MÉDIO | 7 | 7 | 0 |
| BAIXO | 2 | 0 | 2 |
| **Total** | **11** | **9** | **2** |

**Taxa de correção:** 81,8%

Os 2 bugs baixos pendentes (BUG-010 edição de normas, BUG-011 upload de anexos) requerem implementação de funcionalidade nova, não apenas correção de código existente, e devem ser tratados como histórias de usuário separadas.

---

## 5. Verificação de Tipos

```
npx tsc --noEmit
```
**Resultado:** ✅ Sem erros — todas as correções são type-safe.

---

## 6. Arquivos Modificados

| Arquivo | Bugs corrigidos |
|---------|----------------|
| [`src/App.tsx`](src/App.tsx) | BUG-009 |
| [`src/components/Dashboard.tsx`](src/components/Dashboard.tsx) | BUG-005, BUG-006 |
| [`src/components/ManualProposalModal.tsx`](src/components/ManualProposalModal.tsx) | BUG-008 |
| [`src/components/PricingFormulation.tsx`](src/components/PricingFormulation.tsx) | BUG-002 |
| [`src/components/ProposalList.tsx`](src/components/ProposalList.tsx) | BUG-003, BUG-004, BUG-007 |
| [`src/components/ProposalWizard.tsx`](src/components/ProposalWizard.tsx) | BUG-001 |
