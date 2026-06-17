# Progetto informatica grafica: Ray marched planet
Francesco virgili
Informatica Grafica [2526-3-E3101Q134] 
Consegna il 18/06/2026

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

