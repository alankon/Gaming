# alankon Gaming

Git Grid 2048 e a primeira versao oficial do jogo no repositorio `Gaming`.

## Rodar localmente

```bash
python -m pip install -r requirements.txt
python app.py
```

Abra `http://127.0.0.1:5000`.

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

```bash
# via endpoint local (somente localhost)
PORT=5001 # exemplo
curl http://127.0.0.1:$PORT/status
curl http://127.0.0.1:$PORT/quit
# aliases: /exit e /kill
```

## Validacao

O projeto inclui os payloads de Playwright:

- `playwright-menu-actions.json`
- `playwright-2048-actions.json`
