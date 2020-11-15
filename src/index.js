import Phaser from 'phaser';

import PlayScene from './PlayScene';
import PreloadScene from './PreloadScene';

// debug = true to bring up pink debug box
const config = {
  type: Phaser.AUTO,
  width: parseFloat(window.getComputedStyle(document.getElementById('gameWrapper')).width),
  height: 340,
  parent: document.getElementById("gameWrapper"),
  pixelArt: true,
  transparent: true, 
  physics: {
    default: 'arcade',
    arcade: {
      debug: false
    }
  },
  scene: [PreloadScene, PlayScene]
};

new Phaser.Game(config);
