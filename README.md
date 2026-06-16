# Fisio Nadine

Protótipo em desenvolvimento de uma aplicação para rotina de fisioterapia, com foco em agenda, pacientes, atendimentos e controle financeiro simples.

> Status: estudo/protótipo. Este repositório ainda não representa uma aplicação finalizada. Ele existe para registrar aprendizado, testar fluxos de interface e evoluir a organização do código.

## O que o protótipo já explora

- Visão do dia com atendimentos agendados.
- Agenda por datas.
- Cadastro e detalhe de pacientes.
- Registro de pagamentos.
- Ações de atendimento: concluir, cancelar, desfazer e excluir.
- Recorrência semanal de agendamentos.
- Interface mobile-first com navegação inferior.

## Tecnologias em estudo neste projeto

- React.
- TypeScript/TSX.
- Componentização de interface.
- Estado local com hooks.
- Ícones com `lucide-react`.
- Formatação de datas e valores em português do Brasil.

## Limitações atuais

Hoje o projeto está concentrado em um único arquivo grande: [`remixed-0d42ce5b.tsx`](./remixed-0d42ce5b.tsx).

Isso foi útil para prototipar rápido, mas o próximo passo de engenharia é transformar o protótipo em uma aplicação organizada, com estrutura clara de pastas, componentes menores, tipos explícitos e fluxo de execução documentado.

## Próximos passos técnicos

- Criar estrutura Vite + React para rodar o projeto localmente com `npm install` e `npm run dev`.
- Separar componentes por domínio: agenda, pacientes, financeiro, formulários e navegação.
- Criar tipos TypeScript para pacientes, atendimentos e pagamentos.
- Substituir dependências de runtime experimental por persistência explícita e documentada.
- Adicionar validação nos formulários.
- Criar testes simples para funções de data, recorrência e cálculo financeiro.
- Adicionar capturas de tela no README.

## O que este repositório demonstra

Este projeto mostra uma etapa real do meu aprendizado: sair de uma ideia funcional e começar a caminhar para uma base mais organizada, legível e preparada para manutenção.

A meta não é fingir que está pronto. A meta é evoluir o protótipo com boas práticas de engenharia.
