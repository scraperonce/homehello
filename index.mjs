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
const TARGET_SCORE = Number.parseInt(TARGET_TICK_MAX * 1 / 8, 10);
const TARGET_SCORE_STRICT = Number.parseInt(TARGET_TICK_MAX * 1 / 5, 10);

let tick = 0;
let scorePing = 0;
let scorePong = 0;

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
  const hz = indexToHz(index);

  const detectedHz = getDetectedHz(hz);

  if (peak > THRESHOLD && detectedHz) {
    if (tick === 0) {
      tick = 1;
      console.log('EVALUATION START');
      start();
    }

    if (detectedHz === TARGET_HZ_PING) {
      scorePing++;
    } else if (detectedHz === TARGET_HZ_PONG) {
      scorePong++;
    }

    // console.log('DETECTED as ', inRange(hz, TARGET_HZ_PING) ? "PING" : "PONG", ". / score: ", score);
  }

  if (tick > TARGET_TICK_MAX) {
    console.log('EVALUATION TIMED-OUT');

    if (isScoreQuaolified(scorePing, scorePong, TARGET_SCORE_STRICT)) {
      requestToSlack('絶対なったと思う');
      console.log('✨ IT IS PING-PONG!');
    } else if (isScoreQuaolified(scorePing, scorePong, TARGET_SCORE)) {
      requestToSlack('多分なったと思う');
      console.log('✨ MAY BE PING-PONG.');
    } else {
      console.log('😌 NOT PING-PONG.');
    }

    reset();
  } else if (tick > 0) {
    tick++;
  }
});

console.log('Listening...');

function start() {
  tick = 1;
}

function reset() {
  tick = 0;
  scorePing = 0;
  scorePong = 0;
}

function isScoreQuaolified(scorePing, scorePong, TARGET) {
  return scorePing > TARGET && scorePong > TARGET;
}

function getDetectedHz(value) {
  if (inRange(value, TARGET_HZ_PING)) {
    return TARGET_HZ_PING;
  } else if (inRange(value, TARGET_HZ_PONG)) {
    return TARGET_HZ_PONG
  } else {
    return false;
  }
}

function inRange(value, target = null) {
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
