# Resumo geral do projeto alankon Gaming

Atualizado em: 2026-07-09

Este documento resume o que foi construido, melhorado, validado e publicado no repositorio `Gaming`.

## Visao geral

O projeto evoluiu para um portal web autoral chamado `alankon Gaming`, publicado localmente via Flask e tambem em GitHub Pages.

Jogos disponiveis:

- `Git Grid 2048`: uma versao customizada do 2048 com identidade visual propria e tema Git.
- `Aprender Teclas`: jogo infantil para aprender letras, numeros e teclas com imagens animadas e sons fofos.

URL publica principal:

- https://alankon.github.io/Gaming/aprender-teclas.html

## Git Grid 2048

O 2048 foi transformado em uma versao autoral com identidade `alankon Gaming`.

Principais melhorias:

- Branding proprio, removendo referencias genericas/de terceiros.
- Tema visual inspirado em Git, com tiles como `clone`, `commit`, `push`, `merge`.
- Score, recorde persistente e botao visual de nova run.
- Animacoes reais de movimento dos tiles ate o merge.
- Correcoes de direcao das setas para cima/baixo.
- Ajuste de tamanho para caber melhor na tela.
- Layout mobile mais largo, aproveitando melhor a largura do celular.
- Swipe/arrasto em qualquer area da tela, nao apenas no tabuleiro.
- Efeitos visuais de merge, particulas, conquistas e feedback de score.
- Estado textual via `window.render_game_to_text` para validacao automatizada.
- Hook `window.advanceTime` para facilitar testes com Playwright.

## Aprender Teclas

O Aprender Teclas virou um jogo infantil, visual, touch-friendly e multiplataforma.

Principais comportamentos:

- Teclado fisico e teclado touch funcionam.
- Cada letra, numero ou tecla mostra uma imagem/emoji grande e animada.
- Cada item toca um som relacionado.
- Clique/toque na tela sorteia um amiguinho aleatorio.
- Arrastar no celular tambem aciona sons e imagens.
- Espaco mostra a estrelinha.
- Seta para baixo chama o burrinho.
- Teclas nao mapeadas sorteiam amiguinhos aleatorios.
- `Ctrl` tambem passou a responder corretamente.
- `F` foi ajustado para `F de Foca`.
- `J` foi ajustado para `J de jacare`.
- Palavras foram revisadas para portugues do Brasil.

## Evolucao dos sons

O motor de audio passou por varias fases ate chegar ao estado atual.

Melhorias importantes:

- Remocao de voz/letras grandes demais.
- Substituicao de sons antigos por sons fofos, infantis e curtos.
- Correcao do bug de dois sons tocando ao mesmo tempo.
- Ao apertar uma nova tecla, o som anterior para imediatamente.
- Sons baixados/publicos sao usados quando existem.
- Imitacoes WebAudio ficaram como fallback tecnico.
- Sons longos sao cortados automaticamente apos um trecho curto.
- Estado textual expoe `active_voice_count` para confirmar que so ha uma voz ativa.

Estado atual:

- Todos os sons usados pelo jogo possuem fonte baixada/publica.
- A lista de sons sem arquivo ficou vazia.
- Versao atual do motor: `animal-sounds-v17-fuller-sound-map`.

Exemplos de sons cobertos:

- Gato, cachorro, tigre/leao/dragao, elefante, sapo, macaco, bebe, abelha.
- Foca, jacare, robo, yoyo/boing, bola, balao/pop.
- Estrelinha, tap/xicara, hipopotamo/plop e carrinho/vroom.

## Publicacao GitHub Pages

Foi criada uma esteira simples para gerar a versao estatica em `docs/`, usada pelo GitHub Pages.

Comando de build:

```bash
npm run build:pages
```

O build:

- Copia assets de `static/` para `docs/static/`.
- Renderiza rotas principais em HTML estatico.
- Copia `manifest.webmanifest`.
- Copia `service-worker.js`.
- Mantem a publicacao em `https://alankon.github.io/Gaming/`.

Tambem foram feitos varios cache bumps para garantir que o navegador e o service worker nao fiquem presos em versoes antigas.

## Servidor local, WSL e Windows

O servidor Flask foi preparado para rodar bem tanto em WSL/Linux quanto em Windows.

Scripts principais:

- `server.sh`: gerenciador principal no WSL/Linux.
- `server.ps1`: equivalente no PowerShell/Windows.
- `start.sh`: atalho para iniciar limpo no WSL.
- `stop.sh`: atalho para parar no WSL.

Comandos suportados:

- `start`
- `stop`
- `status`
- `restart`
- `kill`
- `quit`
- `exit`
- `free-port`
- `lan-proxy`

Melhorias implementadas:

- Porta padrao `5000`, mas se estiver ocupada procura outra porta livre `5***`.
- Encerramento por PID e fallback por porta.
- Arquivos `.gaming-server.pid` e `.gaming-server.port`.
- Endpoint local `/status`.
- Endpoints locais POST `/quit`, `/exit` e `/kill`.
- Flask escuta em `0.0.0.0` por padrao para acesso LAN.
- Aliases `.html`: `/index.html`, `/2048.html`, `/aprender-teclas.html`.
- Suporte a acesso LAN via `http://192.168.15.99:5000/` usando portproxy quando necessario.

## PWA e multiplataforma

O projeto recebeu suporte basico de PWA:

- `manifest.webmanifest`.
- `service-worker.js`.
- Icone SVG autoral.
- Meta tags mobile.
- `viewport-fit=cover`.
- Ajustes de safe-area para celular.
- CSS responsivo para desktop, tablet e telefone.

## Seguranca e hardening

Foram aplicadas melhorias de seguranca no servidor Flask e no fluxo local.

Principais pontos:

- Headers de seguranca no Flask.
- CSP restritiva.
- `X-Frame-Options: DENY`.
- `X-Content-Type-Options: nosniff`.
- `Permissions-Policy` restritiva.
- Shutdown endpoints sao POST-only e local-only.
- CSRF configurado com excecao apenas para endpoints locais de encerramento.
- Download de sons limitado a hosts HTTPS confiaveis e tamanho maximo.
- `server.sh kill` evita matar portas amplas quando nao ha porta rastreada.
- `server.ps1 lan-proxy` exige Administrador para alterar portproxy/firewall.

## Validacoes realizadas

O projeto foi validado varias vezes com um loop Playwright, conforme o skill `develop-web-game`.

Validacoes comuns:

- `node --check static/learn_keys.js`
- `node --check static/game.js`
- `node --check service-worker.js`
- `python -m compileall app.py build_static.py fetch_sounds.py`
- `npm run build:pages`
- Testes de rotas Flask com status 200.
- Testes locais em `127.0.0.1`.
- Testes LAN em `192.168.15.99`.
- Testes publicos no GitHub Pages.
- Screenshots revisadas visualmente em `output/`.
- Estados revisados via `window.render_game_to_text`.

Validacoes recentes:

- Aprender Teclas validado em `output/validate-learn-sound-v17`.
- 2048 validado em `output/validate-2048-sound-v17`.
- GitHub Pages validado em `https://alankon.github.io/Gaming/aprender-teclas.html`.

## Commits recentes importantes

- `19d1bde Complete learn keys sound coverage`
- `376d6bf Add more public sounds to learn keys`
- `0a25edf Improve WSL LAN server startup`
- `ea01299 Fix overlapping sounds in learn keys`
- `b2ec095 Harden local server and static game security`
- `531b372 Set Aprender Teclas F de Foca`
- `dc09266 feat: add multiplatform pwa support`
- `d2af5c5 feat: add touch surprises and widen mobile grid`

## Estado atual

O projeto esta publicado, sincronizado e funcional.

Estado atual esperado:

- `Gaming` roda localmente via Flask.
- `Gaming` roda no WSL usando `./start.sh`.
- `Gaming` pode ser acessado pela LAN quando o portproxy esta configurado.
- GitHub Pages esta ativo.
- Aprender Teclas tem sons baixados/publicos para todos os sons usados.
- 2048 continua jogavel, responsivo e validado.

## Proximos passos sugeridos

Ideias para evoluir:

- Criar mais jogos no menu principal.
- Adicionar uma tela de creditos dos sons dentro do jogo.
- Criar seletor de volume para criancas/pais.
- Adicionar modo "quiz": a tela pede uma letra e a crianca precisa apertar a tecla certa.
- Adicionar modo "numeros": contar objetos na tela e apertar o numero correto.
- Criar mais imagens proprias em SVG para reduzir dependencia de emoji do sistema.
- Criar uma pagina `sobre.html` contando a historia do `alankon Gaming`.
- Melhorar acessibilidade com narracao opcional e foco visual mais forte.
