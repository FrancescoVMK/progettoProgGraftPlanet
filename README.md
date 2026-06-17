# Progetto: Graft Planet (shader-based)

Breve README per compilare e usare il programma nel repository.

Requisiti (Linux, Debian/Ubuntu):
- build-essential
- libglew-dev
- freeglut3-dev
- libglu1-mesa-dev

Installazione dipendenze (Debian/Ubuntu):
```bash
sudo apt update
sudo apt install build-essential libglew-dev freeglut3-dev libglu1-mesa-dev
```

Compilazione (usando il Makefile presente):
1. Aprire un terminale nella cartella del progetto:
   cd /home/fra/uni/pg/00-test
2. Eseguire:
   make
3. Il binario risultante sarà creato secondo le regole del `Makefile` (controlla il nome dell'eseguibile nel Makefile).

Compilazione manuale (se non vuoi usare il Makefile):
```bash
g++ main.cpp -o planet -std=c++11 -lGLEW -lGL -lGLU -lglut
```

Esecuzione:
- Assicurati che `shader.vert` e `shader.frag` siano nella stessa directory del binario.
- Esegui il programma:
```bash
./planet
```
- Nota: nel repository potrebbe esserci un eseguibile Windows (`test_code.exe`). Non eseguirlo su Linux.

Debug / problemi comuni:
- "Impossibile trovare GLEW/freeglut": installare i pacchetti di sviluppo (vedi requisiti).
- Errori di linking: verifica l'ordine delle librerie e che le versioni di dev-packages siano installate.
- Se il programma non carica gli shader, controlla i percorsi relativi e i nomi dei file (`shader.vert`, `shader.frag`).

Contatti:
- Per modifiche al codice shader, il file principale è `shader.frag`.

Fine.
