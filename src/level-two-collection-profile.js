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
    [0, 0], [900, 0], [1_000, 32], [1_200, 59], [1_400, 73], [1_433, 75],
    [1_483, 76], [1_517, 77], [1_550, 78], [1_617, 79], [1_867, 80], [1_950, 81],
    [2_017, 82], [2_117, 83], [2_183, 84], [2_250, 85], [2_333, 86],
    [2_483, 87], [2_517, 88], [2_567, 89], [2_583, 90], [2_650, 91],
    [2_717, 92], [2_900, 93], [2_917, 94], [2_950, 96], [2_983, 98],
    [3_033, 99], [3_050, 100],
  ],
};

export const LEVEL_TWO_COLLECTION_ANNOUNCEMENTS = {
  red: [81, 93, 95, 100],
  green: [25, 50, 75, 100],
  yellow: [32, 73, 90, 100],
};

export const LEVEL_TWO_YELLOW_ATLAS = {
  columns: 10,
  frameCount: 101,
  framesPerSecond: 60,
  sourceStartSeconds: 4.5,
  sourceCropOffset: { x: 17, y: 310 },
  tile: { width: 298, height: 100 },
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

export function levelTwoRecordedBucketPosition(color, sourceTime) {
  const interpolate = (from, to, fraction) => from + ((to - from) * Math.max(0, Math.min(1, fraction)));
  if (color === 'red') {
    return sourceTime < 0.3
      ? { x: 350, y: interpolate(733, 533, (sourceTime - 0.2) / 0.1) }
      : { x: 350, y: 533 };
  }
  if (color === 'green') {
    if (sourceTime < 2.6) return { x: 50, y: 733 };
    if (sourceTime < 2.7) {
      const lift = Math.max(0, Math.min(1, (sourceTime - 2.6) / 0.1));
      return { x: 50, y: interpolate(733, 493, lift), height: interpolate(198, 238, lift) };
    }
    return { x: 50, y: 493, height: 238 };
  }
  if (color === 'yellow') {
    if (sourceTime < 4.5) return { x: 151, y: 831 };
    if (sourceTime < 4.9) {
      return {
        x: interpolate(151, 50, (sourceTime - 4.5) / 0.4),
        y: interpolate(831, 520, (sourceTime - 4.5) / 0.4),
      };
    }
    if (sourceTime < 5.5) return { x: 61, y: interpolate(520, 530, (sourceTime - 4.9) / 0.6) };
    if (sourceTime < 6.5) return { x: 50, y: 530 };
    const reposition = [
      [6.5, 50, 530],
      [6.9, 50, 520],
      [6.95, 106, 510],
      [6.983333, 170, 507],
      [7.016667, 205, 511],
      [7.066667, 245, 526],
      [7.083333, 247, 526],
      [7.6, 246, 529],
    ];
    for (let index = 1; index < reposition.length; index += 1) {
      const [endTime, endX, endY] = reposition[index];
      if (sourceTime > endTime) continue;
      const [startTime, startX, startY] = reposition[index - 1];
      const fraction = (sourceTime - startTime) / (endTime - startTime);
      return {
        x: startX + ((endX - startX) * fraction),
        y: startY + ((endY - startY) * fraction),
      };
    }
    return { x: 246, y: 529 };
  }
  return null;
}

export function levelTwoYellowAtlasSource(progress) {
  const value = Math.max(0, Math.min(100, Math.round(progress)));
  const elapsedMs = levelTwoSourceArrivalAt('yellow', value, 0);
  const sourceFrame = Math.round(
    (LEVEL_TWO_YELLOW_ATLAS.sourceStartSeconds + elapsedMs / 1_000)
      * LEVEL_TWO_YELLOW_ATLAS.framesPerSecond,
  );
  const sourceTime = sourceFrame / LEVEL_TWO_YELLOW_ATLAS.framesPerSecond;
  return {
    progress: value,
    sourceFrame,
    sourceTime,
  };
}
