const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const startBtn = document.getElementById('start');
const pauseBtn = document.getElementById('pause');
const speedUp = document.getElementById('speedUp');
const speedDown = document.getElementById('speedDown');
const wrapCheckbox = document.getElementById('wrap');
const highscoreListEl = document.getElementById('highscoreList');

const GRID = 26;
let CELL;

let snake, dir, pendingDir, food, loopId, speed, paused, score, gameOverFlag;
let highscores = JSON.parse(localStorage.getItem('snakeHighscores')) || [];

// Imagens
const snakeImg = new Image();
snakeImg.src = 'cobra.png';
const foodImg = new Image();
foodImg.src = 'comida.png';

// Canvas proporcional
function resizeCanvas() {
  const size = Math.min(window.innerWidth * 0.95, window.innerHeight * 0.7, 400);
  canvas.width = size;
  canvas.height = size;
  CELL = canvas.width / GRID;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// Reset do jogo
function reset(){
  snake = [{x:12,y:12},{x:11,y:12},{x:10,y:12}];
  dir={x:1,y:0}; pendingDir=null;
  placeFood();
  speed=8; paused=false; score=0; gameOverFlag=false;
  scoreEl.textContent=score;
  updateHighscoreDisplay();
  if(loopId) cancelAnimationFrame(loopId);
  lastTime=0; tickInterval=1000/speed;
  run();
}

// Coloca comida em posição aleatória
function placeFood(){
  while(true){
    const fx = Math.floor(Math.random()*GRID);
    const fy = Math.floor(Math.random()*GRID);
    if(!snake.some(s=>s.x===fx&&s.y===fy)){ food={x:fx,y:fy}; break; }
  }
}

// Desenha tudo
function draw(){
  // Fundo do canvas
  ctx.fillStyle='#071127';
  ctx.fillRect(0,0,canvas.width,canvas.height);

  // Grade branca visível
  ctx.strokeStyle='rgba(255,255,255,0.5)';
  ctx.lineWidth=1.5;
  for(let i=0;i<=GRID;i++){
    ctx.beginPath(); ctx.moveTo(i*CELL,0); ctx.lineTo(i*CELL,canvas.height); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0,i*CELL); ctx.lineTo(canvas.width,i*CELL); ctx.stroke();
  }

  // Comida
  const foodSize = CELL*0.9;
  ctx.drawImage(foodImg, food.x*CELL+(CELL-foodSize)/2, food.y*CELL+(CELL-foodSize)/2, foodSize, foodSize);

  // Cobra
  const snakeSize = CELL*0.9;
  for(let i=0;i<snake.length;i++){
    const s=snake[i];
    ctx.drawImage(snakeImg, s.x*CELL+(CELL-snakeSize)/2, s.y*CELL+(CELL-snakeSize)/2, snakeSize, snakeSize);
  }

  // Game Over pixelado
  if(gameOverFlag){
    drawGameOver();
  }
}

// Função para desenhar “MORREU KKKKK” em estilo pixelado
function drawGameOver(){
  const pixelSize = canvas.width / 60; // tamanho de cada bloco
  const startX = canvas.width / 2 - pixelSize * 25; // centraliza
  const startY = canvas.height / 2 - pixelSize * 5;

  // Mapa simplificado das letras (1 = bloco, 0 = vazio)
  const letters = {
    'M': [
      [1,0,0,0,1],
      [1,1,0,1,1],
      [1,0,1,0,1],
      [1,0,0,0,1],
      [1,0,0,0,1]
    ],
    'O': [
      [0,1,1,1,0],
      [1,0,0,0,1],
      [1,0,0,0,1],
      [1,0,0,0,1],
      [0,1,1,1,0]
    ],
    'R': [
      [1,1,1,0,0],
      [1,0,0,1,0],
      [1,1,1,0,0],
      [1,0,1,0,0],
      [1,0,0,1,0]
    ],
    'E': [
      [1,1,1],
      [1,0,0],
      [1,1,0],
      [1,0,0],
      [1,1,1]
    ],
    'U': [
      [1,0,0,1],
      [1,0,0,1],
      [1,0,0,1],
      [1,0,0,1],
      [0,1,1,0]
    ],
    'K': [
      [1,0,1],
      [1,1,0],
      [1,0,0],
      [1,1,0],
      [1,0,1]
    ]
  };

  const text = 'MORREU KKKKK';
  let xOffset = 0;

  ctx.fillStyle = '#ff0000';
  for(let char of text){
    if(char === ' '){ xOffset += pixelSize*6; continue; }
    const map = letters[char];
    if(!map) continue;

    for(let y=0;y<map.length;y++){
      for(let x=0;x<map[y].length;x++){
        if(map[y][x] === 1){
          ctx.fillRect(startX + xOffset + x*pixelSize, startY + y*pixelSize, pixelSize, pixelSize);
        }
      }
    }
    xOffset += map[0].length * pixelSize + pixelSize; // espaço entre letras
  }

  // Pontuação abaixo (maior que antes)
  ctx.fillStyle = '#ffffff';
  ctx.font = `${pixelSize*3}px "Press Start 2P", monospace`; // aumentei aqui
  ctx.textAlign='center';
  ctx.fillText('Pontuação: '+score, canvas.width/2, startY + pixelSize*9);
}

// Atualiza lógica
function update(){
  if(pendingDir){ dir = pendingDir; pendingDir=null; }

  const head={x:snake[0].x+dir.x,y:snake[0].y+dir.y};
  if(wrapCheckbox.checked){
    head.x=(head.x+GRID)%GRID; head.y=(head.y+GRID)%GRID;
  } else {
    if(head.x<0||head.y<0||head.x>=GRID||head.y>=GRID){ gameOver(); return; }
  }
  if(snake.some(s=>s.x===head.x&&s.y===head.y)){ gameOver(); return; }
  snake.unshift(head);
  if(head.x===food.x&&head.y===food.y){ score++; scoreEl.textContent=score; placeFood(); }
  else snake.pop();
}

// Game over
function gameOver(){
  paused=true;
  cancelAnimationFrame(loopId);
  gameOverFlag=true;
  highscores.push(score);
  highscores.sort((a,b)=>b-a);
  highscores=highscores.slice(0,5);
  localStorage.setItem('snakeHighscores',JSON.stringify(highscores));
  updateHighscoreDisplay();
  draw();
}

// Highscores
function updateHighscoreDisplay(){
  highscoreListEl.innerHTML='';
  highscores.forEach(s=>{ const li=document.createElement('li'); li.textContent=s; highscoreListEl.appendChild(li); });
}

// Loop
let lastTime=0; let tickInterval=1000/8;
function run(time){
  loopId=requestAnimationFrame(run);
  if(paused){ draw(); return; }
  if(!time) time=performance.now();
  const dt=time-lastTime;
  if(dt<tickInterval) return;
  lastTime=time;
  update();
  draw();
}

// Teclado
window.addEventListener('keydown', e=>{
  if(e.key===' '){ paused=!paused; if(!paused) run(); e.preventDefault(); return; }
  const map={ArrowUp:[0,-1],ArrowDown:[0,1],ArrowLeft:[-1,0],ArrowRight:[1,0], w:[0,-1],s:[0,1],a:[-1,0],d:[1,0]};
  const k=e.key.length===1? e.key.toLowerCase() : e.key;
  const dir2=map[k];
  if(dir2){
    if(dir.x===-dir2[0]&&dir.y===-dir2[1]) return;
    pendingDir={x:dir2[0],y:dir2[1]};
  }
});

// Botões de direção
document.getElementById('up').addEventListener('click', ()=>{ if(dir.y!==1) pendingDir={x:0,y:-1}; });
document.getElementById('down').addEventListener('click', ()=>{ if(dir.y!==-1) pendingDir={x:0,y:1}; });
document.getElementById('left').addEventListener('click', ()=>{ if(dir.x!==1) pendingDir={x:-1,y:0}; });
document.getElementById('right').addEventListener('click', ()=>{ if(dir.x!==-1) pendingDir={x:1,y:0}; });

// Botões do jogo
startBtn.addEventListener('click', ()=>{ paused=false; reset(); });
pauseBtn.addEventListener('click', ()=>{ paused=!paused; if(!paused) run(); pauseBtn.textContent=paused?'Retomar':'Pausar'; });
speedUp.addEventListener('click', ()=>{ if(speed<20) speed++; tickInterval=1000/speed; });
speedDown.addEventListener('click', ()=>{ if(speed>3) speed--; tickInterval=1000/speed; });

// Inicia o jogo
reset();
