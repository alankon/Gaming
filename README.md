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

```bash
# via endpoint local (somente localhost)
curl http://127.0.0.1:5000/quit
# aliases: /exit e /kill
```

## Validacao

O projeto inclui os payloads de Playwright:

- `playwright-menu-actions.json`
- `playwright-2048-actions.json`
