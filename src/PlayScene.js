import Phaser from "phaser";

class PlayScene extends Phaser.Scene {
  constructor() {
    super("PlayScene");
  }

  create() {
    const { height, width } = this.game.config;

    // ground move 10px every update
    this.gameSpeed = 10;
    this.isGameRyunning = false;
    this.respawnTime = 0;
    this.score = 0;

    this.jumpSound = this.sound.add("jump", { volume: 0.2 });
    this.hitSound = this.sound.add("hit", { volume: 0.2 });
    this.reachSound = this.sound.add("reach", { volume: 0.2 });

    this.startTrigger = this.physics.add
      .sprite(0, 10)
      .setOrigin(0, 1)
      .setImmovable();

    // width of canvas size -> 1000, height of ground img -> 26
    this.ground = this.add
      .tileSprite(0, height, width, 26, "ground")
      .setOrigin(0, 1);

    // x -> 0, y -> 340, setOrigin(0,1) -> left bottom corner
    // Dino go forward at the rate 5k every sec
    // dino always on top layer = setDepth(1)
    this.dino = this.physics.add
      .sprite(0, height, "dino-idle")
      .setCollideWorldBounds(true)
      .setBodySize(44, 92)
      .setGravityY(5000)
      .setDepth(1) 
      .setOrigin(0, 1);

    this.obstacles = this.physics.add.group();

    // decorate cloud in background
    this.environment = this.add.group();
    this.environment.addMultiple([
      this.add.image(width / 2, 170, "cloud"),
      this.add.image(width - 80, 80, "cloud"),
      this.add.image(width / 1.3, 100, "cloud"),
    ]);
    this.environment.setAlpha(0);

    // setAlpha(0) to make gameOverScreen hidden
    this.gameOverScreen = this.add
      .container(width / 2, height / 2 - 50)
      .setAlpha(0);
    this.gameOverText = this.add.image(0, 0, "game-over");
    this.restart = this.add.image(0, 80, "restart").setInteractive();

    this.gameOverScreen.add([this.gameOverText, this.restart]);

    this.scoreText = this.initText();
    this.slashDivide = this.initText();
    this.highScoreText = this.initText();

    this.initAnims();
    this.initStartTrigger();
    this.createControll();
    this.initColliders();
    this.handleScores();
  }
  /**
   * dino-run animation
   * state: standing and jumping
   * frames(0.4) run process
   * frames(2,3) play at the rate of 10 FPS
   */
  initAnims() {
    this.anims.create({
      key: "dino-run",
      frames: this.anims.generateFrameNumbers("dino", { start: 2, end: 3 }),
      frameRate: 10,
      repeat: -1,
    });

    this.anims.create({
      key: "dino-down",
      frames: this.anims.generateFrameNumbers("dino-down", {
        start: 0,
        end: 1,
      }),
      frameRate: 10,
      repeat: -1,
    });

    this.anims.create({
      key: "enemy-bird",
      frames: this.anims.generateFrameNumbers("enemy-bird", {
        start: 0,
        end: 1,
      }),
      frameRate: 6,
      repeat: -1,
    });
  }

  initStartTrigger() {
    const { width, height } = this.game.config;

    this.physics.add.overlap(
      this.startTrigger,
      this.dino,
      () => {
        //check position of box
        if (this.startTrigger.y === 10) {
          this.startTrigger.body.reset(0, height);
          return;
        }

        //delay 60 times per sec
        const startEvent = this.time.addEvent({
          delay: 1000 / 60,
          loop: true,
          callbackScope: this,
          callback: () => {
            this.dino.setVelocityX(80);
            this.dino.play("dino-run", 1);
            // extend width ground when dino running
            if (this.ground.width < width) {
              this.ground.width += 17 * 2;
            }

            if (this.ground.width >= 1000) {
              this.ground.width = width;
              this.isGameRunning = true;
              this.dino.setVelocityX(0);
              this.scoreText.setAlpha(1);
              this.environment.setAlpha(1);
              startEvent.remove();
            }
          },
        });
        this.startTrigger.disableBody(true, true);
      },
      null,
      this
    );
  }

  doRestart() {
    this.dino.setVelocityY(0);
    this.dino.body.height = 92;
    this.dino.body.offset.y = 0;
    this.physics.resume();

    // remove from screen and destroy child
    this.obstacles.clear(true, true);

    this.isGameRunning = true;
    this.gameOverScreen.setAlpha(0);
    this.anims.resumeAll();
  }

  createControll() {
    this.restart.on("pointerdown", () => {
      this.doRestart();
    });

    // Dino go upwards at the rate of 1k6 per sec
    this.input.keyboard.on("keydown_SPACE", () => {
      if (!this.dino.body.onFloor() || this.dino.body.velocity.x > 0) {
        return;
      }

      this.jumpSound.play();

      // jumping state, 58 + 34 = 92
      this.dino.body.height = 92;
      this.dino.body.offset.y = 0;

      this.dino.setTexture("dino", 0);
      this.dino.setVelocityY(-1600);
    });

    this.input.keyboard.on("keydown_DOWN", () => {
      if (!this.dino.body.onFloor() || !this.isGameRunning) {
        return;
      }

      // down state
      this.dino.body.height = 58;
      this.dino.body.offset.y = 34;
    });

    this.input.keyboard.on("keyup_DOWN", () => {
      if (this.score !== 0 && !this.isGameRunning) {
        return;
      }

      this.dino.body.height = 92;
      this.dino.body.offset.y = 0;
    });

    this.input.keyboard.on("keydown_ENTER", () => {
      if (this.gameOverScreen.alpha == 1 && !this.isGameRunning) {
        this.doRestart();
      }
    });
  }

  /**
   * Moving ground effect
   * by Phaser 60FPS
   */
  update(time, delta) {
    if (!this.isGameRunning) {
      return;
    }

    this.ground.tilePositionX += this.gameSpeed;

    // Change position of every member in obstacle groups
    Phaser.Actions.IncX(this.obstacles.getChildren(), -this.gameSpeed);
    Phaser.Actions.IncX(this.environment.getChildren(), -2.5);

    // respawn time for an obstacle = time of last frame (appr ~16ms) * 10 * 0.08
    this.respawnTime += delta * this.gameSpeed * 0.08;
    if (this.respawnTime >= 1500) {
      this.placeObstacle();
      this.respawnTime = 0;
    }

    // whenever obstacle are going to collide, they still exist in computer memory -> need to destroy obstacle object
    this.obstacles.getChildren().forEach((obstacle) => {
      if (obstacle.getBounds().right < 0) {
        // this.obstacles.destroy()
        this.obstacles.killAndHide(obstacle);
      }
    });

    // Check current movement of Dino
    if (this.dino.body.deltaAbsY() > 0) {
      this.dino.anims.stop();
      this.dino.setTexture("dino", 0);
    } else {
      this.dino.body.height <= 58
        ? this.dino.play("dino-down", true)
        : this.dino.play("dino-run", true);
    }

    this.environment.getChildren().forEach((env) => {
      if (env.getBounds().right < 0) {
        env.x = this.game.config.width + 30;
      }
    });
  }

  placeObstacle() {
    const { width, height } = this.game.config;
    const obstacleNum = Math.floor(Math.random() * 7) + 1;
    const distance = Phaser.Math.Between(600, 900);

    let obstacle;
    if (obstacleNum > 6) {
      const enemyHeight = [20, 50];
      obstacle = this.obstacles
        .create(
          width + distance,
          height - enemyHeight[Math.floor(Math.random() * 2.5)],
          `enemy-bird`
        )
        .setOrigin(0, 1);
      obstacle.play("enemy-bird", 1);
      obstacle.body.height = obstacle.body.height / 1.5;
    } else {
      obstacle = this.obstacles
        .create(width + distance, height, `obstacle-${obstacleNum}`)
        .setOrigin(0, 1);

      obstacle.body.offset.y = +10;
    }
    obstacle.setImmovable();
  }
  /**
   *
   */
  initColliders() {
    this.physics.add.collider(
      this.dino,
      this.obstacles,
      () => {
        this.highScoreText.x = this.scoreText.x - this.scoreText.width - 20;
        this.slashDivide.x = this.highScoreText.x + 20;

        const highScore = this.highScoreText.text.substr(
          this.highScoreText.text.length - 5
        );
        const newScore =
          Number(this.scoreText.text) > Number(highScore)
            ? this.scoreText.text
            : highScore;

        this.highScoreText.setText(newScore);
        this.highScoreText.setAlpha(1);

        this.slashDivide.setText("/");
        this.slashDivide.setAlpha(1);

        this.physics.pause();
        this.isGameRunning = false;
        this.anims.pauseAll();
        this.dino.setTexture("dino-hurt");
        this.respawnTime = 0;
        this.gameSpeed = 10;
        this.gameOverScreen.setAlpha(1);
        this.score = 0;
        this.hitSound.play();
      },
      null,
      this
    );
  }

  handleScores() {
    this.time.addEvent({
      delay: 1000 / 10,
      loop: true,
      callbackScope: this,
      callback: () => {
        if (!this.isGameRunning) {
          return;
        }

        this.score++;
        this.gameSpeed += 0.05;

        if (this.score % 100 === 0) {
          this.reachSound.play();

          // animation
          this.tweens.add({
            targets: this.scoreText,
            duration: 100,
            repeat: 3, // -1: infinity
            alpha: 0,
            yoyo: true,
          });
        }

        // transform score into 5 digit string
        const scores = Array.from(String(this.score), Number);
        for (let i = 0; i < 5 - String(this.score).length; i++) {
          scores.unshift(0);
        }

        this.scoreText.setText(scores.join(""));
      },
    });
  }

  initText() {
    return this.add
      .text(this.game.config.width, 0, "00000", {
        fill: "#535353",
        font: "900 35px Courier",
        resolution: 5,
      })
      .setOrigin(1, 0)
      .setAlpha(0);
  }
}

export default PlayScene;
