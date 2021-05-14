import ft from 'fourier-transform';
import AlsaCapture from "alsa-capture";
import { EventEmitter } from "events";
import StrictEventEmitter from 'strict-event-emitter-types/types/src';
import { Subject } from 'rxjs';
import { debounceTime, throttleTime } from 'rxjs/operators';

export interface Options {
  device: string;
  rate: number;
  format: string;
  windowSize: number;

  frequencies: number[];
  detectionPlay: number;
  duration: number;

  targetScoresbyFreq: number[];

  cutoffLowIndex: number;
  cutoffHighIndex: number;
  peakThreshold: number;
  listeningInterval?: number;
}

interface Events {
  audio: (data: { time: Date, hz: number, peak: number, tick: number }) => void;
  start: (data: { time: Date }) => void;
  reset: (data: { time: Date }) => void;
  tone: (data: {time: Date, freqIndex: number, hz: number, peak: number, tick: number, score: number}) => void;
  silent: (data: {time: Date, hz: number, peak: number, tick: number, score: number}) => void;
  detect: (data: { time: Date, scores: number[] }) => void;
  abort: (data: { time: Date, scores: number[] }) => void;
}

const defaultAlsaCaptureOptions = {
  channels: 1,
  debug: false,
};

function isScoreQuaolified(scores: number[], thresholds: number[]): boolean {
  return scores.every((s, i) => s >= thresholds[i]);
}

function inRange(value: number, target: number, play: number): boolean {
  return ((target - play) < value) && ((target + play) > value);
}

function convertBlock(incomingData: Uint8Array): Float32Array {
  let i, l = incomingData.length;
  let outputData = new Float32Array(incomingData.length);
  for (i = 0; i < l; i++) {
    outputData[i] = (incomingData[i] - 128) / 128.0;
  }
  return outputData;
}

function indexToHz(index: number, windowSize: number): number {
  return index * 44100 * 2 / windowSize;
}

export class Audience extends (EventEmitter as new () => StrictEventEmitter<EventEmitter, Events>) {
  static readonly DEFAULT_LISTENING_INTERVAL_MS = 100;
  static readonly ABORTING_SILENCE_THRESHOLD_MS = 2000;

  private instance: AlsaCapture;
  private subject: Subject<Uint8Array>;

  private tick = 0;
  private scores: number[] = [];
  private silenceScore: number = 0;
  private listeningInterval = Audience.DEFAULT_LISTENING_INTERVAL_MS;

  constructor(private options: Options) {
    super();

    const { device, rate, format, windowSize } = this.options;

    this.instance = new AlsaCapture({
      ...defaultAlsaCaptureOptions,
      ...{
        device,
        rate,
        format,
        periodSize: windowSize / 2,
      }
    });

    this.subject = new Subject();

    if (this.options.listeningInterval) {
      this.listeningInterval = this.options.listeningInterval;
    }

    this.reset(new Date());
  }

  public listen(): void {
    this.instance.on('audio', (data) => {
      this.subject.next(data);
    });

    this.subject
      .pipe(throttleTime(this.listeningInterval))
      .pipe(debounceTime(this.listeningInterval))
      .subscribe(async (data) => { this.process(data as Uint8Array); } );
  }

  private process(data: Uint8Array): void {
    const time = new Date();
    const signals = convertBlock(data);
    const phasors = ft(signals);

    const peak = Math.max(...phasors.slice(this.options.cutoffLowIndex, this.options.cutoffHighIndex + 1));
    const index = phasors.indexOf(peak);
    const hz = indexToHz(index, this.options.windowSize);
    const detectedHz = this.getDetectedHz(hz);

    this.emit('audio', { time, hz, peak, tick: this.tick });

    if (peak > this.options.peakThreshold && detectedHz) {
      if (this.tick === 0) {
        this.start(time);
      }

      for (let i=0; i<this.options.frequencies.length; i++) {
        if (detectedHz === this.options.frequencies[i]) {
          this.scores[i] += this.listeningInterval;
          this.emit('tone', {time, freqIndex: i, hz, peak, score: this.scores[i], tick: this.tick});
        }
      }
    } else {
      if (this.tick > 0) {
        this.silenceScore += this.listeningInterval;
        this.emit('silent', {time, hz, peak, score: this.silenceScore, tick: this.tick});
      }
    }

    if (this.tick > this.options.duration || this.silenceScore >= Audience.ABORTING_SILENCE_THRESHOLD_MS) {
      if (isScoreQuaolified(this.scores, this.options.targetScoresbyFreq)) {
        this.emit('detect', { time, scores: this.scores});
      } else {
        this.emit('abort', { time, scores: this.scores });
      }

      this.reset(time);
    } else if (this.tick > 0) {
      this.tick += this.listeningInterval;
    }
  }

  private start(time: Date): void {
    this.tick = this.listeningInterval;
    this.emit('start', { time });
  }

  private reset(time: Date): void {
    this.tick = 0;
    this.scores = this.options.frequencies.map(() => 0);
    this.silenceScore = 0;
    this.emit('reset', { time });
  }

  private getDetectedHz(value: number): number | undefined {
    return this.options.frequencies.find((freq) => inRange(value, freq, this.options.detectionPlay));
  }
}
