import dotenv from 'dotenv';
import { requestToSlack } from './lib/Requests';
import { Audience } from './lib/Audience';
import { buildOptions } from './options';
import { floatFormatter, integerFormatter, log } from './lib/Logger';

dotenv.config();

const options = buildOptions();
const audience = new Audience(options);
const nf = integerFormatter();
const ff = floatFormatter();

// audience.on('audio', (data) => {
//   log(`Hz: ${nf(data.hz)}, Peak: ${ff(data.peak)}, Tick: ${data.tick}`);
// });

// audience.on('tone', (data) => {
//   log(`TONE   | Hz: ${nf(data.hz)}, Peak: ${ff(data.peak)}, score: ${nf(data.score)}, Tick: ${data.tick}`);
// });

// audience.on('silent', (data) => {
//   log(`SILENT | Hz: ${nf(data.hz)}, Peak: ${ff(data.peak)}, score: ${nf(data.score)}, Tick: ${data.tick}`);
// });

// audience.on('start', () => {
//   log('START  | Detecting...');
// });

audience.on('detect', ({scores}) => {
  log(`DETECT | ✨ Intercom detected, notification sent.`, `scores: ${scores.map((p, i) => `${options.frequencies[i]}: ${nf(p)}`)}`);
  requestToSlack(process.env.MESSAGE ?? 'Intercom detected');
});

// audience.on('abort', ({ scores }) => {
//   log(`ABORT  | 😌 Detection aborted. (timed-out or too much silence)`, `scores: ${scores.map((p, i) => `${options.frequencies[i]}: ${nf(p)}`)}`);
// });

audience.listen();

log('BOOT   | Homehello Listening...');
log(`INFO   | options: \n${JSON.stringify(options, null, 4)}`);
