const AudioContext = window.AudioContext || window.webkitAudioContext;
const audioCtx = new AudioContext();

const stems = [
  'stem1.wav',
  'stem2.wav',
  'stem3.wav',
  'stem4.wav'
];

let buffers = [];
let sources = [];
let gains = [];
let isPlaying = false;
let startTime = 0;
let pauseOffset = 0;

const canvas = document.getElementById('waveform');
const ctx = canvas.getContext('2d');

function resizeCanvas() {
  canvas.width = canvas.offsetWidth;
  canvas.height = canvas.offsetHeight;
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

// LOAD
async function loadStems() {
  for (let url of stems) {
    const res = await fetch(url);
    const data = await res.arrayBuffer();
    const buffer = await audioCtx.decodeAudioData(data);
    buffers.push(buffer);
  }
  drawWaveform(buffers[0]); // waveform dal primo stem
}

// DRAW WAVEFORM
function drawWaveform(buffer) {
  const data = buffer.getChannelData(0);
  const step = Math.ceil(data.length / canvas.width);
  const amp = canvas.height / 2;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#00ffcc';

  for (let i = 0; i < canvas.width; i++) {
    let min = 1.0;
    let max = -1.0;

    for (let j = 0; j < step; j++) {
      const datum = data[(i * step) + j];
      if (datum < min) min = datum;
      if (datum > max) max = datum;
    }

    ctx.fillRect(i, (1 + min) * amp, 1, Math.max(1, (max - min) * amp));
  }
}

// PLAYHEAD
function drawPlayhead() {
  if (!isPlaying) return;

  const elapsed = audioCtx.currentTime - startTime;
  const duration = buffers[0].duration;
  const x = (elapsed / duration) * canvas.width;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawWaveform(buffers[0]);

  ctx.strokeStyle = '#ff0055';
  ctx.beginPath();
  ctx.moveTo(x, 0);
  ctx.lineTo(x, canvas.height);
  ctx.stroke();

  requestAnimationFrame(drawPlayhead);
}

// AUDIO
function createSources() {
  sources = [];
  gains = [];

  buffers.forEach(buffer => {
    const source = audioCtx.createBufferSource();
    source.buffer = buffer;

    const gain = audioCtx.createGain();
    gain.gain.value = 1;

    source.connect(gain);
    gain.connect(audioCtx.destination);

    sources.push(source);
    gains.push(gain);
  });
}

function play() {
  createSources();
  startTime = audioCtx.currentTime - pauseOffset;
  sources.forEach(src => src.start(0, pauseOffset));
  isPlaying = true;
  drawPlayhead();
}

function pause() {
  sources.forEach(src => src.stop());
  pauseOffset = audioCtx.currentTime - startTime;
  isPlaying = false;
}

// UI
document.getElementById('playBtn').addEventListener('click', async () => {
  if (audioCtx.state === 'suspended') await audioCtx.resume();
  if (!buffers.length) await loadStems();

  if (!isPlaying) {
    play();
    playBtn.innerText = 'Pause';
  } else {
    pause();
    playBtn.innerText = 'Play';
  }
});

document.querySelectorAll('input[type="range"]').forEach(slider => {
  slider.addEventListener('input', e => {
    const i = e.target.dataset.stem;
    if (gains[i]) gains[i].gain.value = e.target.value;
  });
});
