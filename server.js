const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors'); // Middleware per CORS
const Snake = require('./CSnake'); // Importa la classe Snake

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: '*', // Consente tutte le origini
        methods: ['GET', 'POST'],
    },
});

const PORT = 3000;

// Stato globale del gioco
const snakes = {}; // Mappa degli ID dei serpenti e relativi dati
let poops = []; //elementi cacca {x:int, y:int, count:20}
let food = generateFood(20, 20); // Genera la posizione iniziale del cibo
let playerNum = -1;
// Middleware per servire file statici (HTML, CSS, JS)
app.use(cors());
app.use(express.static(__dirname + '/public'));

function indexToColor(indice)
{
    if (indice == 0) return "green";
    if (indice == 1) return "blue";
    if (indice == 2) return "yellow";    
    if (indice == 3) return "purple";
    if (indice == 4) return "orange";
    if (indice == 5) return "pink";
    if (indice == 6) return "lime";
    if (indice == 7) return "teal";

    return "cyan";
}

// Funzione per generare una posizione casuale per il cibo
function generateFood(xmax, ymax) {
    return {
        x: Math.floor(Math.random() * (xmax + 1)),
        y: Math.floor(Math.random() * (ymax + 1)),
    };
}

// Gestione delle connessioni Socket.IO
io.on('connection', (socket) => {
    console.log(`Nuovo client connesso: ${socket.id}`);
    playerNum=(playerNum+1)%7;
    // Inizializza un nuovo serpente per il giocatore
    socket.on('initializeSnake', (data) => {
        color = indexToColor(playerNum);
        snakes[socket.id] = new Snake(socket.id,color, data.xMax, data.yMax);
        snakes[socket.id].body.push({ x: 10, y: 10-playerNum, dir: 'right', pat: 0 }); // Posizione iniziale
        snakes[socket.id].body.push({ x: 9, y: 10-playerNum, dir: 'right', pat: 0 }); // Posizione iniziale
        snakes[socket.id].body.push({ x: 8, y: 10-playerNum, dir: 'right', pat: 0 }); // Posizione iniziale
        socket.emit('snakeInitialized', { id: socket.id, snake: snakes[socket.id] });
        io.emit('updateSnakes', snakes); // Aggiorna lo stato per tutti i giocatori
    });

    // Aggiorna la direzione del serpente
    socket.on('updateDirection', (direction) => {
        if (snakes[socket.id]) {
            if(direction == "up" && snakes[socket.id].body[0].dir=="down"){ return; }
            if(direction == "down" && snakes[socket.id].body[0].dir=="up"){ return; }
            if(direction == "left" && snakes[socket.id].body[0].dir=="right"){ return; }
            if(direction == "right" && snakes[socket.id].body[0].dir=="left"){ return; }
            snakes[socket.id].body[0].dir = direction; // Cambia la direzione della testa
        }
    });

    socket.on('getFood', () => {
        console.log(`Inviando posizione del cibo al client: ${socket.id}`);
        socket.emit('food', food); // Invia solo al client che ha richiesto
    });
    
    socket.on('eatFood', () => {
        console.log(`Cibo mangiato da ${socket.id}. Genero nuovo cibo e faccio crescere il serpente.`);
        
        // Fai crescere il serpente
        if (snakes[socket.id]) {
            const snake = snakes[socket.id];
            //const tail = snake.body[snake.body.length - 1];
            snake.grow(); // Aggiungi un nuovo segmento alla fine
        }
    
        // Rigenera il cibo
        food = generateFood(20, 20);
        io.emit('food', food); // Invia la nuova posizione del cibo a tutti i client
        io.emit('updateSnakes', snakes); // Aggiorna lo stato dei serpenti per tutti
    });

    socket.on('poop',() =>{
        let poop = snakes[socket.id].poop();
        if(poop !== null)
        {
            poops.push({x:poop.x, y:poop.y, count: 20});
            console.log("Cacca: "+poop.x+","+poop.y);
        }
        
        io.emit('poop',poops);
    });

    // Gestisce la disconnessione del client
    socket.on('disconnect', () => {
        console.log(`Client disconnesso: ${socket.id}`);
        delete snakes[socket.id]; // Rimuovi il serpente dallo stato globale
        io.emit('updateSnakes', snakes); // Aggiorna lo stato per tutti
    });
});

// Loop di aggiornamento periodico
setInterval(() => {
    //progressione della cacca
    const poopSize = poops.length;
    for(let i = poops.length-1; i>=0; i--)
    {
            poops[i].count--;
            if(poops[i].count<=0){ poops.pop();  }
    }
    if(poopSize != poops.length){ 
        io.emit('poop',poops); //invia le posizioni aggiornate delle cacche
    }
    


    for (let id in snakes) {
        const snake = snakes[id];
        const direction = snake.body[0].dir;

        // Calcola il nuovo segmento per la testa
        const head = snake.body[0];
        let newHead;
        
       if(! snake.move(direction))
       {
         io.emit("selfCollision",id);
         snake.reset();
         continue;
       }

       for(let idPoop in poops)
       {
        let poop = poops[idPoop];
        if(snake.checkHead(poop))
        {
            snake.reset();
            
            io.emit('pooped',id);
            break;
        }
       }
       

        // Controlla collisioni con gli altri serpenti
        for (let otherId in snakes) {
            if (id !== otherId) {
                const otherSnake = snakes[otherId];
                let res = snake.snakeCollision(otherSnake); 
                if (res == 1 ) {
                    // Collisione con un altro serpente
                    io.emit("snakeCollision", { collider: id, collidedWith: otherId });
                    snake.reset(); // Resetta il serpente che ha colpito
                    break; // Esci dal loop interno
                }
                else if(res == 2)
                {
                    io.emit("snakeBite", { collider: id, collidedWith: otherId });
                    otherSnake.decrease();
                    snake.grow();
                }
                
            }
        }

        
    }    

    // Aggiorna lo stato dei serpenti per tutti i giocatori
    io.emit('updateSnakes', snakes);
}, 100); // Aggiorna ogni 100 ms

// Avvio del server
server.listen(PORT, () => {
    console.log(`Server in esecuzione su http://localhost:${PORT}`);
});
