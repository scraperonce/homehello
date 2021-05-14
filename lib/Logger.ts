export function log(...message: string[]) {
  const dt = (new Date()).toISOString();
  console.log(`[${dt}] ${message.join(' ')}`);
}

export function integerFormatter(): (num: number) => string {
  const formatter = new Intl.NumberFormat('en-US', { minimumIntegerDigits: 4, maximumFractionDigits: 0, useGrouping: false });
  return (num) => {
    return formatter.format(num);
  };
}

export function floatFormatter(): (num: number) => string {
  const formatter = new Intl.NumberFormat('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3, useGrouping: false });
  return (num) => {
    return formatter.format(num);
  };
}
