 class Snake {
    constructor(id,color,xMax,yMax) {
        this.body = []; // Array di oggetti { x: number, y: number, dir: string, pat: number }
        this.color = color; // Colore del serpente
		this.xMax = xMax;
		this.yMax = yMax;
        this.stopFor = 0;
        this.oldColor = color;
        this.id = id;
    }

    // Metodo per far crescere il serpente aggiungendo un elemento al corpo
    grow() {
        if (this.body.length > 0) {
            // Ottieni il secondo elemento (indice 1) o, se non esiste, duplica la testa
            const referenceSegment = this.body[1] || this.body[0];
            this.body.splice(1, 0, { 
                x: referenceSegment.x, 
                y: referenceSegment.y, 
                dir: referenceSegment.dir, 
                pat: referenceSegment.pat 
            });
        } else {
            // Se il corpo è vuoto, aggiungi un elemento iniziale
            this.body.push({ x: 0, y: 0, dir: 'up', pat: 0 });
        }
    }

    decrease()
    {
        if (this.body.length > 2) {
            this.body.pop();
        }
        else
        {
            this.reset();
        }
    }

    // Metodo per controllare se la testa del serpente coincide con le coordinate date
    checkHead(position) {
        if(this.stopFor>-10){ return false; }
        if (this.body.length > 0) {
            const head = this.body[0];
            return head.x === position.x && head.y === position.y;
        }
        return false;
    }

    reset()
    {
        while(this.body.length > 2){ this.body.pop(); }
        this.stopFor = 5;        
    }
	
	move(snakeDirection){
        if(this.stopFor>0){ this.stopFor--; this.color = "white"; return true; }
        else if(this.stopFor>-10){ this.stopFor--; this.color = "white";  }
        else { this.color = this.oldColor; }

		let head = { ...this.body[0] };
		switch (snakeDirection) {
            case 'left':
                head.x--;
				if(head.x<0){ head.x = this.xMax-1; }
                break;
            case 'up':
                head.y--;
				if(head.y<0){ head.y = this.yMax-1; }
                break;
            case 'right':
                head.x++;
				if(head.x>=this.xMax){ head.x = 0; }
                break;
            case 'down':
                head.y++;
				if(head.y>=this.yMax){ head.y = 0; }
                break;
        }
		this.body.unshift(head);
		this.body.pop();
		
		return !this.selfCollision();
	}

	selfCollision()
	{
		let head = { ...this.body[0] };
		for(let i=2;i<this.body.length;i++)
		{
			if(head.x == this.body[i].x && head.y == this.body[i].y){
				return true;
			}
		}
		
		return false;
	}

    
	
	snakeCollision(otherSnake) {
        // Scorriamo tutti i segmenti del corpo del serpente in input (otherSnake)
        for (const [index, segment] of otherSnake.body.entries()) {
            // Se la testa del serpente corrente coincide con un segmento del serpente in input
            if (this.checkHead({ x: segment.x, y: segment.y })) {
                // Se la collisione è con l'ultimo segmento
                if (index === otherSnake.body.length - 1) {
                    return 2; // Collisione con l'ultimo segmento
                }
                else if (index === otherSnake.body.length - 2) {
                    return 0; // Collisione con l'ultimo segmento
                }
                return 1; // Collisione con un segmento qualsiasi
            }
        }
        return 0; // Nessuna collisione
    }

    poop()
    {
        if(this.body.length<4){ return null; }
        const lastElement = this.body.pop();
        return {x:lastElement.x, y:lastElement.y};
    }
    
}

module.exports = Snake;