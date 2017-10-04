export const updateBird = playerEl => ({ rotation, position }) => {
  playerEl.style.transform = `rotate(${rotation}deg)`;
  playerEl.style.top = `${position}px`;
};

export const drawPipe = flyareaEl => pipe => {
  const pipeEl = document.createElement('div');
  const pipeUpperEl = document.createElement('div');
  const pipeLowerEl = document.createElement('div');
  pipeEl.className = 'pipe animated';
  pipeEl.id = `pipe-${pipe.id}`;
  pipeUpperEl.className = 'pipe_upper';
  pipeUpperEl.style.height = `${pipe.topPipeHeight}px`;
  pipeLowerEl.className = 'pipe_lower';
  pipeLowerEl.style.height = `${pipe.bottomPipeHeight}px`;

  pipeEl.appendChild(pipeUpperEl);
  pipeEl.appendChild(pipeLowerEl);
  flyareaEl.appendChild(pipeEl);
};

export const toggleAnimation = (on = true) => {
  document.querySelectorAll('.animated').forEach(anim => {
    anim.style['animation-play-state'] = on ? 'running' : 'paused';
    anim.style['-webkit-animation-play-state'] = on ? 'running' : 'paused';
  });
};

const createScoreImage = (digits, elemscore, type = 'small') => {
  for (var i = 0; i < digits.length; i++) {
    const img = document.createElement('img');
    img.src = `assets/font_${type}_${digits[i]}.png`;
    img.alt = digits[i];
    elemscore.appendChild(img);
  }
};

export const setBigScore = (score, erase = false) => {
  const elemscore = document.getElementById('bigscore');
  elemscore.innerHTML = '';
  if (erase) return false;

  createScoreImage(score.toString().split(''), elemscore, 'big');
};

export const setSmallScore = score => {
  const elemscore = document.getElementById('currentscore');
  elemscore.innerHTML = '';
  createScoreImage(score.toString().split(''), elemscore);
};

export const setHighScore = score => {
  const elemscore = document.getElementById('highscore');
  elemscore.innerHTML = '';
  createScoreImage(score.toString().split(''), elemscore);
};

export const setMedal = score => {
  const elemmedal = document.getElementById('medal');
  elemmedal.innerHTML = '';
  let medal = null;

  if (score < 10)
    //signal that no medal has been won
    return false;

  if (score >= 10) medal = 'bronze';
  if (score >= 20) medal = 'silver';
  if (score >= 30) medal = 'gold';
  if (score >= 40) medal = 'platinum';

  const img = document.createElement('img');
  img.src = `assets/medal_${medal}.png`;
  img.alt = medal;

  elemmedal.appendChild(img);

  //signal that a medal has been won
  return true;
};
