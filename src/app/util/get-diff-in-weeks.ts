export const getDiffInWeeks = (d1: Date, d2: Date): number => {
  const d1Copy = new Date(d1);
  const d2Copy = new Date(d2);
  // NOTE we want the diff regarding the dates not the absolute one
  d1Copy.setHours(0, 0, 0, 0);
  d2Copy.setHours(0, 0, 0, 0);
  let diff = (d2Copy.getTime() - d1Copy.getTime()) / 1000;
  diff /= 60 * 60 * 24 * 7;
  return Math.round(diff);
};
