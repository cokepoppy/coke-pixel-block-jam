// Progress timing transcribed from the 60 fps Level 2 sequence in
// .research/events/level2-frame-sequence. Times start at the first drag for
// that color; percentages are read from the source bucket labels.
export const LEVEL_TWO_COLLECTION_PROFILE = {
  red: [
    [0, 0], [100, 0], [300, 0], [600, 15], [800, 34], [1_000, 51],
    [1_200, 66], [1_300, 69], [1_500, 72], [2_400, 81], [2_500, 83],
    [2_700, 86], [3_000, 87], [3_100, 89], [3_200, 90], [3_400, 92],
    [3_600, 93], [3_900, 95], [5_300, 95], [5_400, 97], [5_500, 98],
    [5_600, 99], [5_700, 100],
  ],
  green: [
    [0, 0], [500, 0], [585, 25], [600, 25], [700, 45], [800, 60], [900, 72],
    [1_000, 87], [1_100, 97], [1_200, 100],
  ],
  yellow: [
    [0, 0], [900, 0], [1_000, 32], [1_200, 59], [1_400, 73], [1_500, 76],
    [2_000, 81], [2_200, 84], [2_600, 90], [2_900, 95], [3_000, 98],
    [3_100, 100],
  ],
};

export const LEVEL_TWO_COLLECTION_ANNOUNCEMENTS = {
  red: [81, 93, 95, 100],
  green: [25, 50, 75, 100],
  yellow: [32, 73, 90, 100],
};

export function levelTwoSourceProgressAt(color, elapsedMs) {
  const points = LEVEL_TWO_COLLECTION_PROFILE[color];
  if (!points?.length) return 0;
  if (elapsedMs <= points[0][0]) return points[0][1];
  for (let index = 1; index < points.length; index += 1) {
    const [endTime, endProgress] = points[index];
    if (elapsedMs > endTime) continue;
    const [startTime, startProgress] = points[index - 1];
    const fraction = (elapsedMs - startTime) / (endTime - startTime);
    return startProgress + (endProgress - startProgress) * fraction;
  }
  return points.at(-1)[1];
}

export function levelTwoSourceArrivalAt(color, progressPercent, startedAt) {
  const points = LEVEL_TWO_COLLECTION_PROFILE[color];
  if (!points?.length) return startedAt;
  if (progressPercent <= points[0][1]) return startedAt + points[0][0];
  for (let index = 1; index < points.length; index += 1) {
    const [endTime, endProgress] = points[index];
    if (progressPercent > endProgress) continue;
    const [startTime, startProgress] = points[index - 1];
    const progressRange = endProgress - startProgress;
    const fraction = progressRange ? (progressPercent - startProgress) / progressRange : 0;
    return startedAt + startTime + (endTime - startTime) * fraction;
  }
  return startedAt + points.at(-1)[0];
}
