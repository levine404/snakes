(() => {

  class GameObject {
    constructor (container, id, type, x = 0, y = 0, size = 1) {
      this.container = container;
      this.id = id;
      this.type = type;
      this.size = size;
      this.x = x;
      this.y = y;
    }

    // Update game object position
    move (x, y) {
      this.x = x;
      this.y = y;
    }

    resize (size) {
      this.size = size;
    }

    // Draw game object to the screen
    draw () {
      let gameObjectEl = this.container.querySelector(`.${this.type + '-' + this.id}`);
      
      // Create new DOM element if it does not exist
      if (!gameObjectEl) {
        gameObjectEl = document.createElement('div');
        gameObjectEl.classList = `game-object ${this.type} ${this.type + '-' + this.id}`;
        this.container.appendChild(gameObjectEl);
      }

      // Update coords
      gameObjectEl.style.left = this.x * 16 + 'px';
      gameObjectEl.style.top = this.y * 16 + 'px';
      gameObjectEl.style.width = this.size * 16 + 'px';
      gameObjectEl.style.height = this.size * 16 + 'px';
    }
  }

  class SnakeSegment extends GameObject {
    constructor(container, index, x = 0, y = 0) {
      super(container, index, 'snake', x, y);
    }
  }

  class Snake {
    constructor (container, segmentAmount = 4) {
      this.container = container;
      this.direction = 'DOWN';
      this.segments = Array.from({ length: segmentAmount }).map((x, i) => {
        return new SnakeSegment(this.container, i);
      });
    }

    changeDirection (direction) {
      this.direction = direction;
    }

    _getCurrentSegmentState () {
      return this.segments.map(segment => {
        return {
          x: segment.x,
          y: segment.y
        };
      });
    }

    move () {
      // Get current state
      const currentSegmentState = this._getCurrentSegmentState();

      // Move each segment of except for the head to the next segment position
      for (let i = 1; i < this.segments.length; i++) {
        const nextSegment = currentSegmentState[i - 1];
        this.segments[i].move(nextSegment.x, nextSegment.y);
      }

      // Assign head
      const head = this.segments[0];
      // Move head according to current snake direction
      switch (this.direction) {
        case 'DOWN':
          head.move(head.x, head.y + 1);
          break;
        case 'UP':
          head.move(head.x, head.y - 1);
          break;
        case 'LEFT':
          head.move(head.x - 1, head.y);
          break;
        case 'RIGHT':
          head.move(head.x + 1, head.y);
          break;
        default:
      }
    }

    grow (length) {
      const last = this.segments[this.segments.length - 1];
      const currSegmentLength = this.segments.length;
      for (let i = 0; i < length; i++) {
        this.segments.push(new SnakeSegment(this.container, currSegmentLength + i, last.x, last.y));
      }
    }

    // Draw all segments of snake
    draw () {
      this.segments.forEach(segment => segment.draw());
    }
  }

  class Fruit extends GameObject {
    constructor(container, border, isCollided, type = 'regular-fruit', x = 0, y = 0) {
      super(container, type, 'fruit', x, y);
      this.expire();
      this.border = border;
      this.isCollided = isCollided
      this.timeout = null;
    }

    getRandomPosition () {
      return {
        x: Math.floor(Math.random() * 50),
        y: Math.floor(Math.random() * 50),
        size: 1
      };
    }

    moveToNewPosition () {
      // Clear timeout
      if (this.timeout) {
        clearTimeout(this.timeout);
      }

      // Move
      let newPosition = this.getRandomPosition();
      let max = 0;
      while (!this.isCollided(this.border, newPosition) && max < 1000) {
        newPosition = this.getRandomPosition();
        max++;
      }
      this.move(newPosition.x, newPosition.y);

      // Reset new expiry
      this.expire();
    }

    expire () {
      // Assign random time
      const randomTime = Math.floor(Math.random() * (10 - 4)) + 4;

      // Create timeout
      this.timeout = setTimeout(() => {
        this.moveToNewPosition();
      }, randomTime * 1000);
    }
  }

  class Border extends GameObject {
    constructor (container) {
      super(container, 'border', 'border', 0, 0, 800 / 16);
    }

    reset () {
      this.size = 800;
    }

    shrink (side) {
      this.size = Math.max(113 / 16, this.size - 113 / 16);
      this.move((800 / 16 - this.size) / 2, (800 / 16 - this.size) / 2);
    }
  }

  class Game {

    constructor (container) {
      this.container = container;
      this.gameState = 'PAUSE';
      this.gameSpeed = 100;
      this.points = 0;
      this.prevPoints = null;
      this.interval = setInterval(this.gameLoop.bind(this), this.gameSpeed);
      this.snake = new Snake(this.container);
      this.border = new Border(this.container);
      this.fruit = new Fruit(this.container, this.border, this.isCollided, 'regular-fruit', 25, 25);
      this.gracePeriod = 0;
      this.addListeners();
    }

    gameLoop() {

      if (this.gameState === 'PLAY') {

        // Move the snake incrementally according to its current direction
        this.snake.move();

        // Assign snake head
        const head = this.snake.segments[0];

        // Now that the snake has moved, check intersections
        // Check if collided with border
        if (!this.isCollided(head, this.border)) {
          if (!this.gracePeriod) {
            this.border.shrink();
            this.setGrace();
            if (!this.isCollided(this.fruit, this.border)) {
              this.fruit.moveToNewPosition();
            }
          }
        }

        // Check if collided with fruit
        if (this.isCollided(head, this.fruit)) {
          this.snake.grow(1);
          this.fruit.moveToNewPosition();
          this.addPoints(1);
        }
        
        // Check if collided with self
        if (
          this.snake.segments
            .slice(1)
            .some(segment =>
              this.isCollided(head, segment)
            )
        ) {
          this.end();
        }
        
        // Draw the game objects
        this.snake.draw();
        this.border.draw();
        this.fruit.draw();

        // Update points
        this.updatePoints();
      
      }

      // Reduce grace period
      if (this.gracePeriod) {
        this.gracePeriod = Math.max(0, this.gracePeriod - this.gameSpeed);
      }

    }

    start () {
      this.gameState = 'PLAY';
      this.hideReplay();
    }

    pause () {
      this.gameState = 'PAUSE';
    }

    end () {
      this.allowReplay();
      this.gameState = 'END';
    }

    allowReplay () {
      document.getElementById('play').style.visibility = 'visible';
      document.getElementById('play').innerHTML = 'PLAY AGAIN';
    }

    hideReplay () {
      document.getElementById('play').style.visibility = 'hidden';
    }

    reset () {
      this.prevPoints = this.points;
      this.snake = new Snake(this.container);
      this.border = new Border(this.container);
      this.fruit = new Fruit(this.container, this.border, this.isCollided, 'regular-fruit', 25, 25);
      this.points = 0;
      this.container.innerHTML = '';
      this.pause();
    }

    addPoints (points = 1) {
      this.points += points
    }

    updatePoints () {
      document.getElementById('points').innerHTML = 'Points: ' + this.points;
    }

    setGrace (period = 2000) {
      this.gracePeriod = period;
    }

    addListeners () {
      window.addEventListener('keydown', event => {
        switch (event.code) {
          case 'ArrowDown':
            this.snake.changeDirection('DOWN');
            break;
          case 'ArrowUp':
            this.snake.changeDirection('UP');
            break;
          case 'ArrowLeft':
            this.snake.changeDirection('LEFT');
            break;
          case 'ArrowRight':
            this.snake.changeDirection('RIGHT');
            break;
          case 'Space':
            if (this.gameState === 'PAUSE') {
              this.start();
            }
            break;
          default:
        }
      });
      document.getElementById('play').addEventListener('click', () => {
        this.reset();
        this.start();
      });
    }

    isCollided (obj1, obj2) {
      return obj1.x < obj2.x + obj2.size &&
        obj1.x + obj1.size > obj2.x &&
        obj1.y < obj2.y + obj2.size &&
        obj1.y + obj1.size > obj2.y;
    }

  }

  const game = new Game(
    document.getElementById('container')
  );

})();
