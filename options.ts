import { Options } from "./lib/Audience";

export function buildOptions(): Options {
  return {
    // Alsa device ID.
    device: process.env.DEVICE_ID ?? 'hw:1',

    // Alsa input format.
    format: process.env.DEVICE_FORMAT ?? 'S16_LE',

    // Alsa input rate.
    rate: Number.parseInt(process.env.DEVICE_RATE || '44100', 10),

    // Alsa input window size.
    windowSize: Number.parseInt(process.env.WINDOW_SIZE || '2048', 10),

    // Array of intercom sound frequencies (Hz)
    frequencies: (process.env.TARGET_HZ_SET || '650,513').split(',').map((v) => Number.parseInt(v, 10)),

    // Detection play (Hz).
    detectionPlay: Number.parseInt(process.env.TARGET_HZ_PLAY || '50', 10),

    // Maximum ticks of sound detection. (barely ms)
    duration: Number.parseInt(process.env.TARGET_DURATION || '6000', 10),

    // Array of the total number of ticks for which a ping or pong sound detects to determine that "ping-pong" has been detected. (barely ms)
    targetScoresbyFreq: (process.env.TARGET_SCORES_BY_HZ || '2000,3500').split(',').map((v) => Number.parseInt(v, 10)),

    // The lowest index of the range for evaluation in the input wave array.
    cutoffLowIndex: Number.parseInt(process.env.CUTOFF_LOW_INDEX || '8', 10),

    // The highest index of the range for evaluation in the input wave array.
    cutoffHighIndex: Number.parseInt(process.env.CUTOFF_HIGHT_INDEX || '20', 10),

    // Lowest detection threshold of input peak(gain level).
    peakThreshold: Number.parseFloat(process.env.PEAK_THRESHOLD || '0.35'),
  };
}
