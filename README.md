# alankon Gaming

Menu web com dois jogos:

- `Git Grid 2048` em `/2048`
- `Aprender Teclas` em `/aprender-teclas`
- GitHub Pages: https://alankon.github.io/Gaming/aprender-teclas.html

## Publicar GitHub Pages

Sempre que atualizar templates ou arquivos em `static`, gere a versao estatica antes do commit:

```bash
npm run build:pages
```

O build atualiza `docs/`, que e a pasta publicada no GitHub Pages.

## Rodar localmente

```bash
python -m pip install -r requirements.txt
./server.sh start
```

O servidor escuta a rede local por padrao e escolhe automaticamente uma porta livre entre `5000-5999`. Consulte a porta ativa com:

```bash
./server.sh status
```

Abra a URL exibida pelo status:

- nesta maquina: `http://127.0.0.1:<porta>`
- direto no WSL/Linux: `http://<ip-wsl>:<porta>` (normalmente `172.x.x.x`)
- pelo IP LAN do Windows: `http://192.168.15.99:<porta>` depois de configurar o portproxy

No WSL/Linux, o atalho recomendado e:

```bash
chmod +x start.sh stop.sh server.sh
./start.sh
```

## Encerrar totalmente o servidor

O gerenciador unico no WSL e `server.sh`; `start.sh` e `stop.sh` sao apenas atalhos de compatibilidade sem logica duplicada:

```bash
# via script no WSL/Linux
chmod +x server.sh
./server.sh start
./server.sh status
./server.sh stop
./server.sh kill   # alias: quit, exit
```

O `start` sempre procura uma porta livre no intervalo `5000-5999`.
Se `5000` estiver ocupada, ele sobe automaticamente em outra `5***`.
Use `./server.sh status` para ver a porta ativa.

No Windows (PowerShell), use o script equivalente:

```powershell
.\server.ps1 start
.\server.ps1 status
.\server.ps1 stop
.\server.ps1 kill   # alias: quit, exit
.\\server.ps1 free-port 5000
```

Tambem em PowerShell o `start` procura sempre uma porta livre em `5000-5999`.

Para acessar o servidor que esta rodando no WSL pelo IP LAN do Windows
(`http://192.168.15.99:5000/`, por exemplo), abra o PowerShell como
Administrador e configure o encaminhamento:

```powershell
cd E:\WSL\repos\Gaming
.\server.ps1 lan-proxy 5000
```

No WSL, `./server.sh lan-proxy 5000` mostra o mesmo passo com os IPs detectados.
Sem esse encaminhamento, o Flask pode aparecer como `0.0.0.0` dentro do WSL e
mesmo assim recusar conexoes no IP `192.168.*` do Windows.

```bash
# via endpoint local (somente localhost)
PORT=5001 # exemplo
curl http://127.0.0.1:$PORT/status
curl -X POST http://127.0.0.1:$PORT/quit
# aliases: /exit e /kill
```

Importante:
- No WSL/Linux use `./server.sh ...`
- Para iniciar diretamente, use `./start.sh`
- Para reiniciar explicitamente, use `./server.sh restart`
- Para parar, use `./stop.sh`
- No PowerShell use `.\\server.ps1 ...`
- Se a 5000 estiver presa por outro servico, use `free-port 5000` no ambiente correspondente.
- Se outro aparelho nao abrir a URL LAN do Windows, rode `.\\server.ps1 lan-proxy <porta>` como Administrador e confirme que ambos estao na mesma rede.

## Validacao

O projeto inclui os payloads de Playwright:

- `playwright-menu-actions.json`
- `playwright-2048-actions.json`
