import ft from 'fourier-transform';
import AlsaCapture from 'alsa-capture';
import { requestToSlack } from './request.mjs';
import dotenv from 'dotenv';

dotenv.config();

const RATE = 44100;
const WINDOW_SIZE = 2048;

const CUTOFF_LOW = 8;
const CUTOFF_HIGH = 20;
const THRESHOLD = 0.35;

const TARGET_HZ_PING = 650;
const TARGET_HZ_PONG = 513;
const TARGET_PLAY = 50;
const TARGET_TICK_MAX = 200;
const TARGET_SCORE = Number.parseInt(TARGET_TICK_MAX * 1 / 3, 10);
const TARGET_SCORE_STRICT = Number.parseInt(TARGET_TICK_MAX * 1 / 2, 10);

let tick = 0;
let score = 0;

const instance = new AlsaCapture({
  device: 'hw:2',
  rate: RATE,
  format: 'S16_LE',
  channels: 1,
  debug: false,
  periodSize: WINDOW_SIZE / 2,
});

instance.on('audio', (data) => {
  const signals = convertBlock(data);
  const phasors = ft(signals);

  const peak = Math.max(...phasors.slice(CUTOFF_LOW, CUTOFF_HIGH + 1));
  const index = phasors.indexOf(peak);
  const hz = ("00000" + Number.parseInt(indexToHz(index))).slice(-5);
  const idx = ("000" + index).slice(-3);

  if (peak > THRESHOLD && (inRange(hz, TARGET_HZ_PING) || inRange(hz, TARGET_HZ_PONG))) {
    if (tick === 0) {
      tick = 1;
      console.log('EVALUATION START');
      start();
    }

    score++;

    // console.log('DETECTED as ', inRange(hz, TARGET_HZ_PING) ? "PING" : "PONG", ". / score: ", score);
  }

  if (tick > TARGET_TICK_MAX) {
    console.log('EVALUATION TIMED-OUT');

    if (score > TARGET_SCORE) {
      requestToSlack('多分なったと思う');
      console.log('✨ MAY BE PING-PONG.');
    } else if (score > TARGET_SCORE_STRICT) {
      requestToSlack('絶対なったと思う');
      console.log('✨ IT IS PING-PONG!');
    } else {
      console.log('😌 NOT PING-PONG.');
    }

    reset();
  } else if (tick > 0) {
    tick++;
  }

  // lowPong = Math.max(lowPong, phasors[LOW_PING_INDEX]);
  // highPing = Math.max(highPing, phasors[HIGH_PING_INDEX]);
  
  // printProgress(`PEAK: ${LOW_PONG_HZ}Hz: ${lowPong}\t/ ${HIGH_PING_HZ}Hz: ${highPing}`);
});

console.log('Listening...');

function start() {
  tick = 1;
  score += 5;
}

function reset() {
  tick = 0;
  score = 0;
}

function inRange(value, target) {
  return ((target - TARGET_PLAY) < value) && ((target + TARGET_PLAY) > value);
}

function indexToHz(index) {
  return index * 44100 * 2 / WINDOW_SIZE;
}

function convertBlock(incomingData) { // incoming data is a UInt8Array
  var i, l = incomingData.length;
  var outputData = new Float32Array(incomingData.length);
  for (i = 0; i < l; i++) {
      outputData[i] = (incomingData[i] - 128) / 128.0;
  }
  return outputData;
}

function printProgress(progress){
    process.stdout.clearLine();
    process.stdout.cursorTo(0);
    process.stdout.write(`${progress}`);
}
