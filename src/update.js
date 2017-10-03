export const updateBird = playerEl => ({ rotation, position }) => {
  playerEl.style.transform = `rotate(${rotation}deg)`;
  playerEl.style.top = `${position}px`;
};

export const drawPipe = flyareaEl => pipe => {
  const pipeEl = document.createElement('div');
  const pipeUpperEl = document.createElement('div');
  const pipeLowerEl = document.createElement('div');
  pipeEl.className = 'pipe animated';
  pipeUpperEl.className = 'pipe_upper';
  pipeUpperEl.style.height = `${pipe.topheight}px`;
  pipeLowerEl.className = 'pipe_lower';
  pipeLowerEl.style.height = `${pipe.bottomheight}px`;

  pipeEl.appendChild(pipeUpperEl);
  pipeEl.appendChild(pipeLowerEl);
  flyareaEl.appendChild(pipeEl);
};
