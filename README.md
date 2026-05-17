# alankon Gaming

Menu web com dois jogos:

- `Git Grid 2048` em `/2048`
- `Aprender Teclas` em `/aprender-teclas`

## Rodar localmente

```bash
python -m pip install -r requirements.txt
python app.py
```

Abra `http://127.0.0.1:5000` para o menu de jogos.

## Encerrar totalmente o servidor

Temos tres formas agora:

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

```bash
# via endpoint local (somente localhost)
PORT=5001 # exemplo
curl http://127.0.0.1:$PORT/status
curl http://127.0.0.1:$PORT/quit
# aliases: /exit e /kill
```

Importante:
- No WSL/Linux use `./server.sh ...`
- No PowerShell use `.\\server.ps1 ...`
- Se a 5000 estiver presa por outro servico, use `free-port 5000` no ambiente correspondente.

## Validacao

O projeto inclui os payloads de Playwright:

- `playwright-menu-actions.json`
- `playwright-2048-actions.json`
