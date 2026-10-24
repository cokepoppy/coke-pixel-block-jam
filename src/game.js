export const SCREEN = Object.freeze({ width: 597, height: 1296 });
export const GRID_RECT = Object.freeze({ x: 61, y: 269, width: 474, height: 219, cols: 37, rows: 17 });
export const COLORS = Object.freeze(['green', 'yellow', 'red', 'blue', 'purple', 'magenta', 'white', 'brown', 'orange']);
export const COLOR_HEX = Object.freeze({
  green: '#46e63b',
  yellow: '#f7f438',
  red: '#d32222',
  blue: '#25bbff',
  purple: '#302bd0',
  magenta: '#f078a7',
  white: '#f0f2f7',
  brown: '#7d2c28',
  orange: '#ee673c',
});

const LEVEL_ONE_BUCKETS = [
  { id: 'green', color: 'green', x: 49, y: 743, width: 125, height: 247 },
  { id: 'yellow', color: 'yellow', x: 174, y: 743, width: 249, height: 247 },
  { id: 'red', color: 'red', x: 423, y: 743, width: 125, height: 247 },
];

// Level 3 opening sampled at the 48 x 28 cell centers from S5 at 00:19.9.
const LEVEL_THREE_PIXELS = [
  'BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBYYYYY',
  'BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBYYYYYYYPP',
  'BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBYYYYYYYYYPPPP',
  'BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBYYYYYYYYYYYPPPPPP',
  'BBBBBBBBBBBBBBBBBBBBBBBBBBBYYYYYYYYYYYYYPPPPPPPP',
  'BBBBBBBBBBBBBBBBBBBBBBBYYYYYYYYYYYYYYYPPPPPPPPPP',
  'BBBBBBBBBBBBBBBBBBBYYYYYYYYYYYYYYYYYPPPPPPPPPPPP',
  'BBBBBBBBBBBBBBBYYYYYYYYYYYYYYYYYYYPPPPPPPPPPPPPP',
  'BBBBBBBBBBBYYYYYYYYYYYYYYYYYYYYYPPPPPPPPPPPPPPPP',
  'BBBBBBBBBYYYYYYYYYYYYYYYYYYYYYPPPPPPPPPPPPPPPPPP',
  'BBBBBBBBBBBYYYYYYYYYYYYYYYYYYPPPPPPPPPPPPPPPPPPP',
  'BBBBBBBBBBBBBBBBYYYYYYYYYYYYYYYYPPPPPPPPPPPPPPPP',
  'BBBBBBBBBBBBBBBBBBBYYYYYYYYYYYYYYYPPPPPPPPPPPPPP',
  'BBBBBBBBBBBBBBBBBBBYYYYYYYYYYYYYYYYYYPPPPPPPPPPP',
  'BBBBBBBBBBBBBBBBBBYYYYYYYYYYYYYYYYYYYYYPPPPPPPPP',
  'BBBBBBBBBBBBBBBBBYYYYYYYYYYYYYYYYYYYYPPPPPPPPPPP',
  'BBBBBBBBBBBBBBBYYYYYYYYYYYYYYYYYYYPPPPPPPPPPPPPP',
  'BBBBBBBBBBBBBBYYYYYYYYYYYYYYYYYYPPPPPPPPPPPPPPPP',
  'BBBBBBBBBBBBBYYYYYYYYYYYYYYYYPPPPPPPPPPPPPPPPPPP',
  'BBBBBBBBBBBYYYYYYYYYYYYYYYPPPPPPPPPPPPPPPPPPPPPP',
  'BBBBBBBBBBYYYYYYYYYYYYYPPPPPPPPPPPPPPPPPPPPPPPPP',
  'BBBBBBBBYYYYYYYYYYYYPPPPPPPPPPPPPPPPPPPPPPPPPPPP',
  'BBBBBBBYYYYYYYYYYYPPPPPPPPPPPPPPPPPPPPPPPPPPPPPP',
  'BBBBBBYYYYYYYYYPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPP',
  'BBBBYYYYYYYYPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPP',
  'BBBYYYYYYPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPP',
  'BBYYYYPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPP',
  'YYYYPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPB',
];

// Extracted from the Level 6 source frame at 00:01:40. The 37 x 28 map keeps
// empty blue cells explicit so the original stepped coastline remains visible.
const LEVEL_SIX_PIXELS = [
  'YYYYYYYYYYYYBBBBBBBBBBBBBBBBBBBBBBBBB',
  'YYYYYYYYYYYYYYBBBBBBBBBBBBBBBBBBBBBBB',
  'YYYYYYYYYYYYYYYBBBBBBBBBBBBBBBBBBBBBB',
  'YYYYYYYYYYYYYYYBBBBBBBBBBBBBBBBBBBBBB',
  'YYYYYYYYYYYYYYYYYBBBBBBBBBBBBBBBBBBBB',
  'YYYYYYYYYYYYYYYYYYGBBBBYBYYYYYYGBYYYY',
  'YYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYY',
  'GGGGGGGGGGGGGGYYYYYYYYYYYYYYYYYYYYYYY',
  'GGGGGGGGGGGGGGYYYYYYYYYYYYYYYYYYYYYYY',
  'GGGGGGGGGGGGGGGYYYYYYYYYYYYYYYYRYYYYY',
  'GGGGGGGGGGGGGGGYYYYYYYYYYYYYYYYYYYYYY',
  'GGGGGGGGGGGGGGGRYYYYYYYYYYYYYYYYYYYYY',
  'GGGGGGGGGGGGGGGRRRRYYRYRYRRRRRRRYRRRR',
  'GGGGGGGGGGGGGGGRRRRRRRRRRRRRRRRRRRRRR',
  'YYYYYYYYYYYYYYGRRRRRRRRRRRRRRRRRRRRRR',
  'YYYYYYYYYYYYYYGRRRRRRRRRRRRRRRRRRRRRR',
  'YYYYYYYYYYYYYYYRRRRRRRRRRRRRRRRRRRRRR',
  'YYYYYYYYYYYYYYYRRRRRRRRRRRRRRRRRRRRRR',
  'YRYYYYYYYYYYYYYRRRRRRRRRRRRRRRRRRRRRR',
  'YYYYYYYYYYYYYYYYYYRRRRRYRYYYYYYRRYYYY',
  'YYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYY',
  'RRRRRRRRRRRRRRYYYYYYYYYYYYYYYYYRYYYYY',
  'RRRRRRRRRRRRRRYYYYYYYYYYYYYYYYYYYYYYY',
  'RRRRRRRRRRRRRRYYYYYYYYYYYYYYYYYYYYYYY',
  'RRRRRRRRRRRRRRRYYYYYYYYYYYYYYYYYYYYYY',
  'RRRRRRRRRRRRRRRYYYYYYYYYYYYYYYYYYYYYY',
  'RRRRRRRRRRRRRRRGYYYYYYYYYYYYYYYYYYYYY',
  'RRRRRRRRRRRRRRRRGGGGGGGGGGGGGGGGGGGGG',
];

// Level 12's source frame shows a yellow T-shaped inner layer, purple side
// fields, and a blue centre channel. The purple lower layer starts locked.
const LEVEL_TWELVE_PIXELS = Array.from({ length: 24 }, (_, row) => (
  Array.from({ length: 37 }, (_, column) => {
    if (row < 12) return column >= 12 && column <= 24 ? 'Y' : 'P';
    if (row < 18) return column >= 6 && column <= 30 ? 'Y' : 'P';
    return column < 6 || column > 30 ? 'P' : 'B';
  }).join('')
));

// Sampled from the clean Level 10 opening frame at 00:04:23. The 14 x 37 map
// keeps the wall's broad pixel blocks; one center on a color boundary was
// assigned from its neighboring majority.
const LEVEL_TEN_PIXELS = [
  'YYYYYGGGGGGGGGGGPPPPPGGGGGGGGGGGYYYYY',
  'YYYYYGGGGGGGGGGGPPPPPGGGGGGGGGGGYYYYY',
  'YYYYYGGGGGGGGGGGPPPPPGGGGGGGGGGGYYYYY',
  'YYYYYGGGGGGGGGGGPPPPPGGGGGGGGGGGYYYYY',
  'YYYYYPPPPPPPPPPPPPPPPPPPPPPPPPPPYYYYY',
  'YYYYYPPPPPPPPPPPPPPPPPPPPPPPPPPPYYYYY',
  'YYYYYPPPPPPPPPPPPPPPPPPPPPPPPPPPYYYYY',
  'YYYYYPPPPPPPPPPPPPPPPPPPPPPPPPPPYYYYY',
  'YYYYYPPPPPPPPPPPPPPPPPPPPPPPPPPPYYYYY',
  'YYYYYPPPBPPPPPPPPPPPPPPPPPPPPPPPYYYYY',
  'BBBBBBBBBBYYYYYYYYYYYYYYYYYBBBBBBBBBB',
  'BBBBBBBBBBYYYYYYYYYYYYYYYYYBBBBBBBBBB',
  'BBBBBBBBBBYYYYYYYYYYYYYYYYYBBBBBBBBBB',
  'BBBBBBBBBBYYYYYYYYYYYYYYYYYBBBBBBBBBB',
];

// Exact 56 x 17 cell maps sampled from the clean Level 11 opening frame at
// 00:05:23. The upper board is yellow/purple and the lower board is blue/red.
const LEVEL_ELEVEN_UPPER_PIXELS = [
  'YYYYYYPYPYYYYYYYYYYYYYYYYPYPYYYYYYYYYYYYYYYYPYYPYYYYYYYY',
  'YYYYYPYYYPYYYYYYYYYYYYYYPYYYPYYYYYYYYYYYYYYPYYYYPYYYYYYY',
  'YYYYPYYYYYPYYYYYYYYYYYYPYYYYYPYYYYYYYYYYYYPYYYYYYPYYYYYY',
  'YYYPYYYYYYYPYYYYYYYYYYPYYYYYYYPYYYYYYYYYYPYYYYYYYYPYYYYY',
  'YYPYYYYYYYYYPYYYYYYYYPYYYYYYYYYPYYYYYYYYPYYYYYYYYYYPYYYY',
  'YPYYYYYYYYYYYPYYYYYYPYYYYYYYYYYYPYYYYYYPYYYYYYYYYYYYPYYY',
  'PYYYYYYYYYYYYYPYYYYPYYYYYYYYYYYYYPYYYYPYYYYYYYYYYYYYYPYY',
  'YYYYYYYYYYYYYYYPYYPYYYYYYYYYYYYYYYPYYPYYYYYYYYYYYYYYYYPY',
  'YYYYYYYYYYYYYYYYPPYYYYYYYYYYYYYYYYYPPYYYYYYYYYYYYYYYYYYP',
  'PPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPYYPPPPPPPPPPPPPPPPPPY',
  'PPPPPPPPPPPPPPPPYYPPPPPPPPPPPPPPPPYPPYPPPPPPPPPPPPPPPPYP',
  'YPPPPPPPPPPPPPPYPPYPPPPPPPPPPPPPPYPPPPYPPPPPPPPPPPPPPYPP',
  'PYPPPPPPPPPPPPYPPPPYPPPPPPPPPPPPYPPPPPPYPPPPPPPPPPPPYPPP',
  'PPYPPPPPPPPPPYPPPPPPYPPPPPPPPPPYPPPPPPPPYPPPPPPPPPPYPPPP',
  'PPPYPPPPPPPPYPPPPPPPPYPPPPPPPPYPPPPPPPPPPYPPPPPPPPYPPPPP',
  'PPPPYPPPPPPYPPPPPPPPPPYPPPPPPYPPPPPPPPPPPPYPPPPPPYPPPPPP',
  'PPPPPYPPPPYPPPPPPPPPPPPYPPPPYPPPPPPPPPPPPPPYPPPPYPPPPPPP',
];

const LEVEL_ELEVEN_LOWER_PIXELS = [
  'BBBBBRBBBBRBBBBBBBBBBBBBBRBBBBRBBBBBBBBBBBBBBRBBBRBBBBBB',
  'BBBBRBBBBBBRBBBBBBBBBBBBRBBBBBBRBBBBBBBBBBBBRBBBBBRBBBBB',
  'BBBRBBBBBBBBRBBBBBBBBBBRBBBBBBBBRBBBBBBBBBBRBBBBBBBRBBBB',
  'BBRBBBBBBBBBBRBBBBBBBBRBBBBBBBBBBRBBBBBBBBRBBBBBBBBBRRBB',
  'BRBBBBBBBBBBBBRBBBBBBRBBBBBBBBBBBBRBBBBBBRBBBBBBBBBBBBRB',
  'RBBBBBBBBBBBBBBRBBBBRBBBBBBBBBBBBBBRBBBBRBBBBBBBBBBBBBBR',
  'BBBBBBBBBBBBBBBBRBBRBBBBBBBBBBBBBBBBRBBRBBBBBBBBBBBBBBBB',
  'BBBBBBBBBBBBBBBBBRRBBBBBBBBBBBBBBBBBBRRBBBBBBBBBBBBBBBBB',
  'RRRRRRRRRRRRRRRRRBBRRRRRRRRRRRRRRRRRRBBRRRRRRRRRRRRRRRRR',
  'RRRRRRRRRRRRRRRRBRRBRRRRRRRRRRRRRRRRBRRBRRRRRRRRRRRRRRRR',
  'BRRRRRRRRRRRRRRBRRRRBRRRRRRRRRRRRRRBRRRRBRRRRRRRRRRRRRRR',
  'RBRRRRRRRRRRRRBRRRRRRBRRRRRRRRRRRRBRRRRRRBRRRRRRRRRRRRRB',
  'RRBRRRRRRRRRRBRRRRRRRRBRRRRRRRRRRBRRRRRRRRBRRRRRRRRRRRBR',
  'RRRBRRRRRRRRBRRRRRRRRRRBRRRRRRRRBRRRRRRRRRRBBRRRRRRRRBRR',
  'RRRRBRRRRRRBRRRRRRRRRRRRBRRRRRRBRRRRRRRRRRRRRBRRRRRRBRRR',
  'RRRRRBRRRRBRRRRRRRRRRRRRRBRRRRBRRRRRRRRRRRRRRRBRRRRBRRRR',
  'RRRRRRBRRBRRRRRRRRRRRRRRRRBRRBRRRRRRRRRRRRRRRRRBRRBRRRRR',
];

// Sampled at each cell center from the clean Level 13 frame at 00:06:26.
// Hue and brightness separate the pink candy from the dark brown outline.
const LEVEL_THIRTEEN_PIXELS = [
  'YYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYY',
  'YYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYY',
  'YYYYYYYYYDDDDDDDYYYYYYYYYYYYYYYYYYYYY',
  'YYYYYYYYYDDDMMMDDYYYYYYYYYYYYYYYYYYYY',
  'YYYYYYYYDMMMMMMMDDYYYYYYYYYYYYYYYYYYY',
  'YYYYYYMDMMMMMMMMMMMYYYYYYYYYYYYYYYYYY',
  'YYYYYYDDMMMMMMMMMMMDYYYYYYYYYYYYYYYYY',
  'YYYYYDDMDDMMMMMMMMMDDYYYYYYYYYYYYYYYY',
  'YYYYYDMOOOOOMMMMMMMMMDYYYYYYYYYYYYYYY',
  'YYYYYDODDOOODMMMMMMMMMDYYYYYYYYYYYYYY',
  'OOWWWDDDDDOOOMMMMMMMMMDDWWWWWWWWWWWDD',
  'OOWWWWWWWWDDOOMMMMMMMMMMDWWWWWWWWWWDD',
  'OOWWWWWWWWWDOOMMMMMMMMMMMDWWWWWWWWWDD',
  'OOWWWWWWWWWDOOMMMMMMMMMMMMDWWWWWWWWDD',
  'OOWWWWWWWWDDOMMMMMMMMMMMMMMDMWWWWWWDD',
  'OOWWWWWWWWWDMMMMMMMMMMMMMMMMDWWWWWWDD',
  'OOWWWWWWWWWWDMMMMMMMMMMMMMMMMDWWWWWDD',
  'OOWWWWWWODWWDDMMMMMMMMMMMMMMMDDWWWWDD',
  'OOWWWWWOOOOWWWDMMMMMMMMMMMMMMDWWWWWDD',
  'OOWWWWWOOOOWWWWDMMMMMMMMMMMMDWWWWWWDD',
  'OOWWWWWOOOOWWWWMDMMMMMMMMMMDDWWWWWWDD',
  'OOWWWWWWWWWWWWWWWDDMMMMMMMYYYDWWWWWDD',
  'OOWWWWWWWWWWWWWWWWDMMMMMDDYYYDDWWWWDD',
  'OOWWWWWWWWWWWWWWWWWDDMMDDDDYYYDDWWWDD',
  'OOWWWWWWWWWWWWWWWWWWDDDWWWWDDYYYDWWDD',
  'OOWWWWWWWWWWWWWWWWWWWDWWWWWWDYYYDDWDD',
  'OOWWWWWWWWWWWWWWWWWWWWWWWWWWWDYYYDWDD',
  'OOWWWWWWWWWWWWWWWWWWWWWWWWWWWWDDYDWDD',
  'OOWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWDDWDD',
];

// Clean 37 x 20 Level 7 wall from 00:02:14, including the two pixel smiles.
const LEVEL_SEVEN_PIXELS = [
  'RRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRR',
  'RRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRR',
  'RRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRR',
  'RRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRR',
  'RRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRR',
  'YYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYY',
  'YYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYY',
  'YYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYY',
  'YYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYY',
  'YYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYY',
  'GGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGG',
  'GGGYYYYGGGGGGGGGGGGGGGGGGGGGGGGYYYGGG',
  'GGYYYYYYGGGGGGGGGGGGGGGGGGGGGYYYYYYGG',
  'GYYGYYYYYGGGGGGGGGGGGGGGGGGGYYGYYYYYG',
  'GYYYGYYYYGGGGGGGGGGGGGGGGGGGYYYGYYYYG',
  'GYYYYYYYYGBBBBBBBBBBBBBBBBBGYYYYYYYYG',
  'GYGYYYYGYGBBBBBBBBBBBBBBBBBGYGGYYYGYG',
  'GYYGYYGYYGBBBBBBBBBBBBBBBBBGYYGYYGYYG',
  'GGYYYYYYGGBBBBBBBBBBBBBBBBBGGYYYYYYGG',
  'GGGGGGGGGGBBBBBBBBBBBBBBBBBGGGGGGGGGG',
];

// Sampled from the full Level 8 wall at 00:02:54.5 before collection starts.
// The source wall is 60 x 39 cells; the yellow ring is a drag effect, not pixels.
const LEVEL_EIGHT_PIXELS = [
  'OOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOMMMMMMMMMM',
  'OOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOMMMMMMMMMM',
  'OOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOMMMMMMMMMM',
  'OOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOMMMMMMMMMM',
  'OOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOMMMMMMMMMM',
  'OOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOMMMMMMMMMM',
  'OOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOMMMMMMMMMMM',
  'OOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOMMMMMMMMMMMMM',
  'OOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOMMMMMMMMMMMMMMMMMMM',
  'OOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOMMMMMMMMMMMMMMMMMMMM',
  'OOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOMMMMMMMMMMMMMMMMMMMM',
  'OOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOMMMMMMMMMMMMMMMMMMMM',
  'OOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOMMMMMMMMMMMMMMMMMMMMM',
  'OOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOMMMMMMMMMMMMMMMMMMMMM',
  'OOOOOOOOOOOOOOOOOOOOOOMMMMOOOOOOOMMOOMMMMMMMMMMMMMMMMMMMMMMM',
  'OOOOOOOOOOOOOOOOOOOOMMMMMMOOOMMMMMMOMMMMMMMMMMMMMMMMMMMMMMMM',
  'OOOOOOOOOOOOOOOOOOOMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMM',
  'OYYYYOOOOOOOOOMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMM',
  'YYYYYYYOOOMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMM',
  'YYYYYYYYOMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMM',
  'YYYYYYYYYMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMM',
  'YYYYYYYYYYMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMM',
  'YYYYYYYYYYYMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMM',
  'YYYYYYYYYYYYMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMM',
  'YYYYYYYYYYYYYYYYYYYOMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMM',
  'YYYYYYYYYYYYYYYYYYYYYMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMM',
  'YYYYYYYYYYYYYYYYYYYYYYYYYMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMM',
  'YYYYYYYYYYYYYYYYYYYYYYYYYYYMMMMYYYYMMMMMMMMMMMMMMMMMMMMMMMMM',
  'YYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYMMMMMMMMMMMMMMMMMMMMM',
  'YYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYMMMMMMMMMMMMMMMMMMMM',
  'YYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYMMMMMMMMMMMMMMMMMMM',
  'YYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYMMMMMMMMMMMMMMMMM',
  'YYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYMMMMMMMMMMMMMMMMM',
  'YYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYMMMMMMMMMMMMMMMM',
  'YYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYMMMMMMMMMMMMMM',
  'YYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYMMMMMMMMMMMMM',
  'YYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYMMMMMMMMMMMM',
  'YYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYOMMMMMMM',
  'YYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYOMMMMMMM',
];

// Final Level 8 wall at S5 00:02:58.950, sampled at the fitted 60 x 39
// cell centres. Dots are empty blue cells; two low-confidence samples were
// assigned from their 8-neighbour majority. The yellow ring remains visible
// in the source frame, so these are visible colours rather than hidden logic.
const LEVEL_EIGHT_SECOND_YELLOW_PIXELS = [
  '.OOOOOOOOOOOO...............................................',
  'OOOOOOOOOOOOOO..............................................',
  'OOOOOOOOOOOOOOOO............................................',
  'OOOOOOOOOOOOOOOOOO..........................................',
  'OOOOOOOOOOOOOOOOOO..........................................',
  'OOOOOOOOOOOOOOOOOOO.........................................',
  'OOOOOOOOOOOOOOOOOOOO........................................',
  'OOOOOOOOOOOOOOOOOOOOO.......................................',
  'OOOOOOOOOOOOOOOOOOOOOO......................................',
  'OOOOOOOOOOOOOOOOOOOOOOO..OOO.O..O........OM.................',
  'OOOOOOOOOOOOOOOOOOOOOOOO.OOOOO..OO.......OMM................',
  'OOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOO.OOMMM...............',
  'OOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOMMMMM..............',
  'OOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOMMMMMM.............',
  'OOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOMMMMMMM............',
  'OOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOMMMMMMMO...........',
  'OOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOMMMMMMMOOM.........',
  'OYYYYOOOOOOOOOMOOOOOOOOOOOOOOOOOOOOOOOOOOMMMMMMMOOMMM.......',
  'YYYYYYYOOOMMMOMMMMOOOOOOOOOOOOOOOOOOOOOOMMMMMMMMOMMMOM......',
  'YYYYYYYYOMMMMMMMMMOOOOOOOOOOOOOOOOOOOOOOMMMMMYMMMMMOOMM.....',
  'YYYYYYYYYMMMMMMMMMOOOOOOOOOOOOOOOOOOOOOOMMMMYMYYMMMMOOOO....',
  'YYYYYYYYYYMMMMMMMMOOOOOOOOOOOOOOOOOOOOOMMMMMYMMYMMMOOOOOO...',
  'YYYYYYYYYYYMMMMMMMMOOOOOOOOOOOOOOOOOOOOMMMMMMMMMMMMOOOOOMM..',
  'YYYYYYYYYYYYMMMMMMMMMOMMOMOOOOOOOMOOOOMMMMMYMMMMMMMOOOOOOMM.',
  'YYYYYYYYYYYYYMOOMMMMMMMMMMOOOMOOMMMOOMMMMMMYMMMMMMMOOMOOOOOO',
  'YYYYYYYYYYYYYYYYYYMMMMMMMMMMMMMMMMMOMMMMMMMYMMMMMMMOOMOOOOOO',
  'YYYYYYYYYYYYYYYYYYOMMMMMMMMMMMMMMMMMMMMMMMMYMMMMMMMMMMOMOOOO',
  'YYYYYYYYYYYYYYYYYYOMMMMMMMMMMMMMMMMMMMMMMMMYYMMMYYYOMMOOOOOO',
  'YYYYYYYYYYYYYYYYYYOMMMMMMMMMMMMMMMMMMMMMMMMMYMMMMMMMMMOOOOOO',
  'YYYYYYYYYYYYYYYYYYOMMMMMMMMMMMMMMMMMMMMMMMMMMYMMMMMMMMOOMOOO',
  'YYYYYYYYYYYYYYYYYYOMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMOO',
  'YYYYYYYYYYYYYYYYYYYYMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMM',
  'YYYYYYYYYYYYYYYYYYYYMMMMMMMMMMMMMMMMMMMMMMMMMMYMMMMMMMMMMMMM',
  'YYYYYYYYYYYYYYYYYYYYYMMMMMMMMMMMMMMMMMMMMMYMMMMYMMMMMMMMMMMM',
  'YYYYYYYYYYYYYYYYYYYYYMMMMMMMMMMMMMMMMMMMMMYMMMMYMMMMMMMMMMMM',
  'YYYYYYYYYYYYYYYYYYYYYYYYMMMMMMMMMMMMMMMMMYYMMYOOMMMMOYMMMMMM',
  'YYYYYYYYYYYYYYYYYYYYYYYYYYYMMMMMYYMMMMMMMYYYYYYYYYYYYYOMYYMM',
  'YYYYYYYYYYYYYYYYYYYYYYYYYYYYYYMYYYYMMMYMMYYYYYYYYYYYYYYYYYYM',
  'YYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYMYYYYYYYYYYYYYYYYYYYYYY.',
];

// Clean Level 9 wall from 00:03:33: blue pixel banks, a yellow center, and
// white banks beneath it. The open centre at the foot of the wall is empty.
const LEVEL_NINE_PIXELS = [
  'BBBBBBBBBYYYYYYYYYYYYYYYYYYYBBBBBBBBB',
  'BBBBBBBBBYYYYYYYYYYYYYYYYYYYBBBBBBBBB',
  'BBBBBBBBBYYYYYYYYYYYYYYYYYYYBBBBBBBBB',
  'BBBBBBBBBYYYYYYYYYYYYYYYYYYYBBBBBBBBB',
  'BBBBBBBBBYYYYYYYYYYYYYYYYYYYBBBBBBBBB',
  'BBBBBBBBBYYYYYYYYYYYYYYYYYYYBBBBBBBBB',
  'BBBBBBBBBYYYYYYYYYYYYYYYYYYYBBBBBBBBB',
  'BBBBBBBBBYYYYYYYYYYYYYYYYYYYBBBBBBBBB',
  'BBBBBBBBBYYYYYYYYYYYYYYYYYYYBBBBBBBBB',
  'BBBBBBBBBYYYYYYYYYYYYYYYYYYYBBBBBBBBB',
  'BBBBBBBBBYYYYYYYYYYYYYYYYYYYBBBBBBBBB',
  'BBBBBBBBBYYYYYYYYYYYYYYYYYYYBBBBBBBBB',
  'BBBBBBBBBYYYYYYYYYYYYYYYYYYYBBBBBBBBB',
  'BBBBBBBBBYYYYYYYYYYYYYYYYYYYBBBBBBBBB',
  'WWWWWWWWWYYYYYYYYYYYYYYYYYYYWWWWWWWWW',
  'WWWWWWWWWYYYYYYYYYYYYYYYYYYYWWWWWWWWW',
  'WWWWWWWWWYYYYYYYYYYYYYYYYYYYWWWWWWWWW',
  'WWWWWWWWWYYYYYYYYYYYYYYYYYYYWWWWWWWWW',
  'WWWWWWWWWYYYYYYYYYYYYYYYYYYYWWWWWWWWW',
  'WWWWWWWWWYYYYYYYYYYYYYYYYYYYWWWWWWWWW',
  'WWWWWWWWWYYYYYYYYYYYYYYYYYYYWWWWWWWWW',
  'WWWWWWWWWYYYYYYYYYYYYYYYYYYYWWWWWWWWW',
  'WWWWWWWWWYYYYYYYYYYYYYYYYYYYWWWWWWWWW',
  'WWWWWWWWWBBBBBBBBBBBBBBBBBBBWWWWWWWWW',
  'WWWWWWWWWBBBBBBBBBBBBBBBBBBBWWWWWWWWW',
  'WWWWWWWWWBBBBBBBBBBBBBBBBBBBWWWWWWWWW',
  'WWWWWWWWWBBBBBBBBBBBBBBBBBBBWWWWWWWWW',
  'WWWWWWWWWBBBBBBBBWBBBBBBBBBBWWWWWWWWW',
];

const levels = {
  1: {
    frame: { x: 17, y: 226, width: 563, height: 829 },
    wall: { x: 42, y: 251, width: 513, height: 257 },
    grid: GRID_RECT,
    pad: { x: 50, y: 527, cols: 4, rows: 2, cellWidth: 121, cellHeight: 121, gap: 4 },
    buckets: LEVEL_ONE_BUCKETS,
    paint(column) {
      if (column < 9) return { color: 'green', targetBucketId: 'green' };
      if (column < 28) return { color: 'yellow', targetBucketId: 'yellow' };
      return { color: 'red', targetBucketId: 'red' };
    },
  },
  2: {
    frame: { x: 17, y: 312, width: 563, height: 665 },
    wall: { x: 42, y: 333, width: 513, height: 200 },
    grid: { x: 60, y: 344, width: 478, height: 176, cols: 37, rows: 14 },
    pad: { x: 50, y: 555, cols: 5, rows: 4, cellWidth: 98, cellHeight: 94, gap: 4 },
    buckets: [
      { id: 'green', color: 'green', x: 50, y: 733, width: 201, height: 198, segments: [{ x: 0, y: 0, width: 201, height: 86 }, { x: 0, y: 45, width: 84, height: 153 }] },
      { id: 'red', color: 'red', x: 347, y: 733, width: 201, height: 198, segments: [{ x: 0, y: 0, width: 201, height: 86 }, { x: 117, y: 45, width: 84, height: 153 }] },
      { id: 'yellow', color: 'yellow', x: 151, y: 831, width: 298, height: 100 },
    ],
    paint(column, row) {
      if (row < 7) {
        if (column < 7) return { color: 'green', targetBucketId: 'green' };
        if (column < 23) return { color: 'yellow', targetBucketId: 'yellow' };
        return { color: 'red', targetBucketId: 'red' };
      }
      if (column < 15) return { color: 'green', targetBucketId: 'green' };
      if (column < 31) return { color: 'yellow', targetBucketId: 'yellow' };
      return { color: 'red', targetBucketId: 'red' };
    },
  },
  3: {
    gridBackground: '#1765a5',
    frame: { x: 22, y: 162, width: 553, height: 958 },
    wall: { x: 42, y: 182, width: 513, height: 300 },
    grid: { x: 59, y: 197, width: 478, height: 276, cols: 48, rows: 28 },
    // The source tray continues below the opening crop with two more rows.
    pad: { x: 50, y: 503, cols: 5, rows: 6, cellWidth: 97, cellHeight: 95, gap: 3 },
    buckets: [
      { id: 'purple', color: 'purple', x: 447, y: 773, width: 101, height: 296 },
      { id: 'yellow', color: 'yellow', x: 49, y: 773, width: 101, height: 296 },
      { id: 'blue', color: 'blue', x: 149, y: 872, width: 300, height: 192 },
    ],
    paint(column, row) {
      const color = { Y: 'yellow', B: 'blue', P: 'purple' }[LEVEL_THREE_PIXELS[row][column]];
      return { color, targetBucketId: color };
    },
  },
  4: {
    frame: { x: 17, y: 285, width: 563, height: 706 },
    wall: { x: 42, y: 298, width: 513, height: 345 },
    grid: { x: 61, y: 317, width: 474, height: 314, cols: 37, rows: 24 },
    pad: { x: 50, y: 650, cols: 4, rows: 3, cellWidth: 121, cellHeight: 100, gap: 4 },
    buckets: [
      { id: 'red-top', color: 'red', x: 216, y: 465, width: 176, height: 176 },
      { id: 'blue-left', color: 'blue', x: 50, y: 637, width: 166, height: 166 },
      { id: 'red-right', color: 'red', x: 381, y: 637, width: 166, height: 166 },
      { id: 'green-bottom', color: 'green', x: 50, y: 801, width: 166, height: 166 },
      { id: 'yellow-bottom', color: 'yellow', x: 216, y: 801, width: 166, height: 166 },
      { id: 'blue-right', color: 'blue', x: 381, y: 801, width: 166, height: 166 },
    ],
    paint(column, row) {
      if (row < 12) {
        if (column < 12) return { color: 'red', targetBucketId: 'red-top' };
        if (column < 25) return { color: 'green', targetBucketId: 'green-bottom' };
        return { color: 'red', targetBucketId: 'red-right' };
      }
      if (column < 12) return { color: 'yellow', targetBucketId: 'yellow-bottom' };
      if (column < 25) return null;
      return {
        color: 'blue',
        targetBucketId: column < 31 ? 'blue-left' : 'blue-right',
      };
    },
  },
  5: {
    frame: { x: 29, y: 375, width: 539, height: 551 },
    wall: { x: 43, y: 388, width: 511, height: 219 },
    grid: { x: 57, y: 401, width: 492, height: 198, cols: 37, rows: 15 },
    pad: { x: 50, y: 620, cols: 7, rows: 3, cellWidth: 69, cellHeight: 65, gap: 3 },
    buckets: [
      { id: 'red', color: 'red', x: 50, y: 747, width: 72, height: 140 },
      { id: 'magenta', color: 'magenta', x: 122, y: 747, width: 72, height: 140 },
      { id: 'yellow', color: 'yellow', x: 194, y: 747, width: 72, height: 140 },
      { id: 'brown', color: 'brown', x: 266, y: 747, width: 72, height: 140 },
      { id: 'green', color: 'green', x: 338, y: 747, width: 72, height: 140 },
      { id: 'blue', color: 'blue', x: 410, y: 605, width: 72, height: 153 },
      { id: 'white', color: 'white', x: 482, y: 747, width: 72, height: 140 },
    ],
    stripeColors: ['green', 'yellow', 'red', 'magenta', 'blue', 'white', 'brown'],
    paint(column) {
      const color = this.stripeColors[Math.min(6, Math.floor((column * 7) / 37))];
      return { color, targetBucketId: color };
    },
  },
  6: {
    gridBackground: '#428dce',
    frame: { x: 27, y: 164, width: 541, height: 958 },
    wall: { x: 47, y: 184, width: 503, height: 365 },
    grid: { x: 81, y: 195, width: 435, height: 334, cols: 37, rows: 28 },
    pad: { x: 73, y: 558, cols: 5, rows: 2, cellWidth: 87, cellHeight: 86, gap: 2 },
    duration: 180,
    buckets: [
      { id: 'yellow-upper-right', color: 'yellow', x: 344, y: 628, width: 183, height: 180, segments: [{ x: 0, y: 0, width: 183, height: 88 }, { x: 96, y: 76, width: 87, height: 104 }] },
      { id: 'yellow-left', color: 'yellow', x: 72, y: 718, width: 183, height: 179, segments: [{ x: 0, y: 0, width: 91, height: 179 }, { x: 75, y: 89, width: 108, height: 90 }] },
      { id: 'red-small', color: 'red', x: 163, y: 718, width: 92, height: 90 },
      { id: 'red-top', color: 'red', x: 253, y: 718, width: 183, height: 90 },
      { id: 'red-center', color: 'red', x: 253, y: 807, width: 183, height: 182, segments: [{ x: 0, y: 0, width: 183, height: 90 }, { x: 94, y: 76, width: 89, height: 106 }] },
      { id: 'yellow-tall', color: 'yellow', x: 435, y: 807, width: 92, height: 182 },
      { id: 'red-lower-left', color: 'red', x: 72, y: 895, width: 92, height: 182 },
      { id: 'yellow-lower', color: 'yellow', x: 163, y: 895, width: 183, height: 182, segments: [{ x: 0, y: 0, width: 183, height: 90 }, { x: 95, y: 77, width: 88, height: 105 }] },
      { id: 'green-long', color: 'green', x: 253, y: 980, width: 270, height: 90 },
    ],
    paint(column, row) {
      const pixel = LEVEL_SIX_PIXELS[row]?.[column];
      if (!pixel || pixel === 'B') return null;
      const color = ({ Y: 'yellow', G: 'green', R: 'red' })[pixel];
      let targetBucketId;
      if (pixel === 'G') targetBucketId = 'green-long';
      if (pixel === 'Y') {
        if (column < 15 && row < 14) targetBucketId = 'yellow-left';
        else if (row < 12 && column >= 15) targetBucketId = 'yellow-upper-right';
        else if (column >= 30 && row >= 19) targetBucketId = 'yellow-tall';
        else targetBucketId = 'yellow-lower';
      }
      if (pixel === 'R') {
        if (row >= 24 && column < 15) targetBucketId = 'red-lower-left';
        else if (row >= 21 && column < 15) targetBucketId = 'red-small';
        else if (row < 16) targetBucketId = 'red-top';
        else targetBucketId = 'red-center';
      }
      return { color, targetBucketId };
    },
  },
  7: {
    frame: { x: 27, y: 300, width: 541, height: 675 },
    wall: { x: 47, y: 310, width: 503, height: 292 },
    grid: { x: 55, y: 326, width: 487, height: 263, cols: 37, rows: 20 },
    pad: { x: 50, y: 530, cols: 7, rows: 3, cellWidth: 68, cellHeight: 64, gap: 3, rowRanges: [[2, 5], [0, 7], [0, 7]] },
    duration: 180,
    booster: 'freeze',
    buckets: [
      { id: 'green-left', color: 'green', x: 50, y: 738, width: 140, height: 140 },
      { id: 'yellow-top', color: 'yellow', x: 191, y: 738, width: 140, height: 140 },
      { id: 'red-top', color: 'red', x: 334, y: 738, width: 214, height: 70 },
      { id: 'green-right', color: 'green', x: 334, y: 810, width: 214, height: 140, segments: [{ x: 0, y: 0, width: 214, height: 70 }, { x: 144, y: 60, width: 70, height: 80 }] },
      { id: 'red-bottom', color: 'red', x: 50, y: 880, width: 214, height: 70 },
      { id: 'yellow-bottom', color: 'yellow', x: 265, y: 880, width: 214, height: 70 },
    ],
    paint(column, row) {
      const pixel = LEVEL_SEVEN_PIXELS[row]?.[column];
      if (pixel === 'R') return { color: 'red', targetBucketId: column < 18 ? 'red-bottom' : 'red-top' };
      if (pixel === 'Y') return { color: 'yellow', targetBucketId: column < 18 ? 'yellow-top' : 'yellow-bottom' };
      if (pixel === 'G') return { color: 'green', targetBucketId: column < 18 ? 'green-left' : 'green-right' };
      return null;
    },
  },
  8: {
    gridBackground: '#428dce',
    frame: { x: 27, y: 280, width: 541, height: 695 },
    wall: { x: 47, y: 280, width: 503, height: 340 },
    grid: { x: 58, y: 309, width: 485, height: 312, cols: 60, rows: 39 },
    pad: { x: 50, y: 648, cols: 7, rows: 4, cellWidth: 68, cellHeight: 64, gap: 3 },
    duration: 180,
    buckets: [
      { id: 'yellow-left', color: 'yellow', x: 50, y: 714, width: 164, height: 72 },
      { id: 'yellow-mid', color: 'yellow', x: 215, y: 714, width: 164, height: 72, hideWhenComplete: true },
      { id: 'magenta-top', color: 'magenta', x: 382, y: 706, width: 170, height: 184 },
      { id: 'orange-small', color: 'orange', x: 50, y: 790, width: 80, height: 80 },
      { id: 'yellow-small', color: 'yellow', x: 132, y: 790, width: 80, height: 80 },
      { id: 'magenta-mid', color: 'magenta', x: 215, y: 790, width: 164, height: 80 },
      { id: 'orange-left', color: 'orange', x: 50, y: 872, width: 164, height: 74 },
      { id: 'orange-mid', color: 'orange', x: 215, y: 872, width: 164, height: 74 },
      { id: 'magenta-bottom', color: 'magenta', x: 385, y: 872, width: 162, height: 74 },
    ],
    // The source has no visible touch trace. These per-bucket cell groups are
    // spatial partitions for playable web behavior, not confirmed source rules.
    paint(column, row) {
      const pixel = LEVEL_EIGHT_PIXELS[row]?.[column];
      if (pixel === 'O') return { color: 'orange', targetBucketId: column < 11 ? 'orange-small' : column < 32 ? 'orange-left' : 'orange-mid' };
      if (pixel === 'M') return { color: 'magenta', targetBucketId: row < 16 ? 'magenta-top' : row < 27 ? 'magenta-mid' : 'magenta-bottom' };
      if (pixel === 'Y') return { color: 'yellow', targetBucketId: row >= 23 && column < 13 ? 'yellow-small' : column < 29 ? 'yellow-left' : 'yellow-mid' };
      return null;
    },
  },
  9: {
    gridBackground: '#428dce',
    frame: { x: 27, y: 285, width: 541, height: 700 },
    wall: { x: 47, y: 295, width: 503, height: 365 },
    grid: { x: 55, y: 305, width: 487, height: 353, cols: 37, rows: 28 },
    pad: { x: 50, y: 640, cols: 7, rows: 5, cellWidth: 68, cellHeight: 60, gap: 3 },
    duration: 180,
    booster: 'hammer',
    buckets: [
      { id: 'blue-left-top', color: 'blue', x: 50, y: 724, width: 150, height: 66 },
      { id: 'white-top-right', color: 'white', x: 398, y: 724, width: 150, height: 66 },
      { id: 'yellow-left-l', color: 'yellow', x: 50, y: 790, width: 150, height: 174, segments: [{ x: 0, y: 0, width: 150, height: 66 }, { x: 0, y: 52, width: 66, height: 122 }] },
      { id: 'yellow-small-left', color: 'yellow', x: 413, y: 790, width: 66, height: 66 },
      { id: 'yellow-small-right', color: 'yellow', x: 480, y: 790, width: 66, height: 66 },
      { id: 'white-left-l', color: 'white', x: 130, y: 856, width: 148, height: 106, segments: [{ x: 0, y: 0, width: 148, height: 66 }, { x: 0, y: 48, width: 66, height: 58 }] },
      { id: 'blue-center', color: 'blue', x: 279, y: 856, width: 118, height: 66 },
      { id: 'white-right-l', color: 'white', x: 398, y: 856, width: 150, height: 106, segments: [{ x: 0, y: 0, width: 150, height: 66 }, { x: 84, y: 48, width: 66, height: 58 }] },
      { id: 'yellow-right-bottom', color: 'yellow', x: 480, y: 856, width: 66, height: 66 },
      { id: 'blue-left-bottom', color: 'blue', x: 179, y: 922, width: 58, height: 42 },
      { id: 'yellow-bottom', color: 'yellow', x: 238, y: 922, width: 158, height: 42 },
      { id: 'blue-right-bottom', color: 'blue', x: 399, y: 922, width: 148, height: 42 },
    ],
    paint(column, row) {
      const pixel = LEVEL_NINE_PIXELS[row]?.[column];
      if (!pixel || (pixel === 'B' && row >= 23)) return null;
      if (pixel === 'Y') {
        const targetBucketId = row < 6
          ? (column < 19 ? 'yellow-left-l' : column < 24 ? 'yellow-small-left' : 'yellow-small-right')
          : row < 14 ? 'yellow-right-bottom' : 'yellow-bottom';
        return { color: 'yellow', targetBucketId };
      }
      if (pixel === 'W') {
        const targetBucketId = column < 9
          ? (row < 19 ? 'white-left-l' : 'white-top-right')
          : (row < 19 ? 'white-right-l' : 'white-top-right');
        return { color: 'white', targetBucketId };
      }
      if (pixel === 'B') {
        const targetBucketId = column < 9
          ? (row < 7 ? 'blue-left-top' : 'blue-left-bottom')
          : (row < 7 ? 'blue-center' : 'blue-right-bottom');
        return { color: 'blue', targetBucketId };
      }
      return null;
    },
  },
  10: {
    layout: 'pipes',
    gridBackground: '#428dce',
    frame: { x: 27, y: 300, width: 541, height: 675 },
    wall: { x: 47, y: 310, width: 503, height: 228 },
    grid: { x: 61, y: 327, width: 474, height: 194, cols: 37, rows: 14 },
    pad: { x: 50, y: 540, cols: 7, rows: 5, cellWidth: 68, cellHeight: 61, gap: 3 },
    duration: 180,
    // Four columns of buckets are separated by three vertical tubes.
    pipeChannels: [121, 263, 405],
    pipeTrack: { y: 598, height: 378, width: 71, inset: 16, labelY: 984 },
    buckets: [
      { id: 'blue-1', color: 'blue', x: 50, y: 600, width: 70, height: 66 },
      { id: 'yellow-1', color: 'yellow', x: 50, y: 668, width: 70, height: 66 },
      { id: 'purple-1', color: 'purple', x: 50, y: 736, width: 70, height: 66 },
      { id: 'yellow-2', color: 'yellow', x: 50, y: 804, width: 70, height: 66 },
      { id: 'purple-2', color: 'purple', x: 50, y: 872, width: 70, height: 66 },
      { id: 'blue-2', color: 'blue', x: 192, y: 600, width: 70, height: 66 },
      { id: 'purple-3', color: 'purple', x: 192, y: 668, width: 70, height: 66 },
      { id: 'yellow-3', color: 'yellow', x: 192, y: 736, width: 70, height: 66 },
      { id: 'purple-4', color: 'purple', x: 192, y: 804, width: 70, height: 66 },
      { id: 'green-1', color: 'green', x: 192, y: 872, width: 70, height: 66 },
      { id: 'blue-3', color: 'blue', x: 334, y: 600, width: 70, height: 66 },
      { id: 'green-2', color: 'green', x: 334, y: 668, width: 70, height: 66 },
      { id: 'purple-5', color: 'purple', x: 334, y: 736, width: 70, height: 66 },
      { id: 'green-3', color: 'green', x: 334, y: 804, width: 70, height: 66 },
      { id: 'yellow-4', color: 'yellow', x: 334, y: 872, width: 70, height: 66 },
      { id: 'blue-4', color: 'blue', x: 477, y: 600, width: 70, height: 66 },
      { id: 'yellow-5', color: 'yellow', x: 477, y: 668, width: 70, height: 66 },
      { id: 'green-4', color: 'green', x: 477, y: 736, width: 70, height: 66 },
      { id: 'purple-6', color: 'purple', x: 477, y: 804, width: 70, height: 66 },
      { id: 'green-5', color: 'green', x: 477, y: 872, width: 70, height: 66 },
    ],
    paint(column, row) {
      const pixel = LEVEL_TEN_PIXELS[row]?.[column];
      if (!pixel) return null;
      if (pixel === 'Y') {
        const targetBucketId = row < 10 && column < 5
          ? (row < 5 ? 'yellow-1' : 'yellow-2')
          : row < 10 && column >= 32 ? 'yellow-5'
            : column < 18 ? 'yellow-3' : 'yellow-4';
        return { color: 'yellow', targetBucketId };
      }
      if (pixel === 'G') {
        const targetBucketId = column < 16
          ? (row < 2 ? 'green-1' : 'green-2')
          : row < 2 ? 'green-3' : column < 26 ? 'green-4' : 'green-5';
        return { color: 'green', targetBucketId };
      }
      if (pixel === 'P') {
        const targetBucketId = row < 4 ? 'purple-3'
          : column < 11 ? 'purple-1'
            : column < 16 ? 'purple-2'
              : column < 21 ? 'purple-4'
                : column < 26 ? 'purple-5' : 'purple-6';
        return { color: 'purple', targetBucketId };
      }
      const targetBucketId = column < 10
        ? (row < 12 ? 'blue-1' : 'blue-2')
        : (row < 12 ? 'blue-3' : 'blue-4');
      return { color: 'blue', targetBucketId };
    },
  },
  11: {
    layout: 'double',
    frame: { x: 27, y: 165, width: 541, height: 953 },
    panels: [
      { frame: { x: 27, y: 165, width: 541, height: 470 }, wall: { x: 47, y: 182, width: 503, height: 160 }, grid: { x: 64, y: 193, width: 462, height: 142, cols: 56, rows: 17 }, pad: { x: 52, y: 367, cols: 6, rows: 1, cellWidth: 81, cellHeight: 81, gap: 1 } },
      { frame: { x: 27, y: 652, width: 541, height: 470 }, wall: { x: 47, y: 669, width: 503, height: 160 }, grid: { x: 65, y: 682, width: 462, height: 145, cols: 56, rows: 17 }, pad: { x: 52, y: 850, cols: 6, rows: 1, cellWidth: 81, cellHeight: 81, gap: 1 } },
    ],
    duration: 180,
    buckets: [
      { id: 'yellow-left', color: 'yellow', x: 52, y: 429, width: 164, height: 163, segments: [{ x: 0, y: 0, width: 164, height: 81 }, { x: 82, y: 81, width: 82, height: 82 }] },
      { id: 'purple-left-bottom', color: 'purple', x: 52, y: 510, width: 82, height: 82 },
      { id: 'purple-upper-left', color: 'purple', x: 216, y: 429, width: 82, height: 82 },
      { id: 'purple-upper-right', color: 'purple', x: 298, y: 429, width: 82, height: 82 },
      { id: 'purple-lower-left', color: 'purple', x: 216, y: 510, width: 82, height: 82 },
      { id: 'purple-lower-right', color: 'purple', x: 298, y: 510, width: 82, height: 82 },
      { id: 'purple-right-bottom', color: 'purple', x: 464, y: 510, width: 82, height: 82 },
      { id: 'yellow-right', color: 'yellow', x: 382, y: 429, width: 164, height: 163, segments: [{ x: 0, y: 0, width: 164, height: 81 }, { x: 0, y: 81, width: 82, height: 82 }] },
      { id: 'red-left', color: 'red', x: 52, y: 912, width: 164, height: 164, segments: [{ x: 0, y: 0, width: 164, height: 82 }, { x: 82, y: 82, width: 82, height: 82 }] },
      { id: 'blue-left', color: 'blue', x: 52, y: 994, width: 82, height: 82 },
      { id: 'blue-center', color: 'blue', x: 216, y: 912, width: 164, height: 82 },
      { id: 'red-center', color: 'red', x: 216, y: 994, width: 164, height: 82 },
      { id: 'blue-right', color: 'blue', x: 464, y: 994, width: 82, height: 82 },
      { id: 'red-right', color: 'red', x: 382, y: 912, width: 164, height: 164, segments: [{ x: 0, y: 0, width: 164, height: 82 }, { x: 0, y: 82, width: 82, height: 82 }] },
    ],
    boards: [
      { id: 'upper', rect: { x: 64, y: 193, width: 462, height: 142, cols: 56, rows: 17 }, paint(column, row) {
        const pixel = LEVEL_ELEVEN_UPPER_PIXELS[row]?.[column];
        if (pixel === 'Y') return { color: 'yellow', targetBucketId: column < 28 ? 'yellow-left' : 'yellow-right' };
        if (pixel === 'P') {
          const buckets = ['purple-left-bottom', 'purple-upper-left', 'purple-upper-right', 'purple-lower-left', 'purple-lower-right', 'purple-right-bottom'];
          return { color: 'purple', targetBucketId: buckets[Math.min(5, Math.floor((column * buckets.length) / 56))] };
        }
        return null;
      } },
      { id: 'lower', rect: { x: 65, y: 682, width: 462, height: 145, cols: 56, rows: 17 }, paint(column, row) {
        const pixel = LEVEL_ELEVEN_LOWER_PIXELS[row]?.[column];
        if (pixel === 'B') return { color: 'blue', targetBucketId: column < 14 ? 'blue-left' : column < 42 ? 'blue-center' : 'blue-right' };
        if (pixel === 'R') return { color: 'red', targetBucketId: column < 21 ? 'red-left' : column < 35 ? 'red-center' : 'red-right' };
        return null;
      } },
    ],
  },
  12: {
    gridBackground: '#428dce',
    dragTopAllowance: 60,
    frame: { x: 27, y: 285, width: 541, height: 640 },
    wall: { x: 47, y: 300, width: 503, height: 350 },
    grid: { x: 58, y: 313, width: 482, height: 312, cols: 37, rows: 24 },
    pad: { x: 50, y: 565, cols: 6, rows: 4, cellWidth: 80, cellHeight: 80, gap: 2 },
    duration: 300,
    booster: 'double',
    buckets: [
      { id: 'purple-outer', color: 'purple', x: 119, y: 574, width: 346, height: 272, segments: [{ x: 84, y: 0, width: 178, height: 272 }, { x: 0, y: 85, width: 346, height: 91 }], requires: 'yellow-inner', showLocked: true },
      { id: 'yellow-inner', color: 'yellow', x: 129, y: 582, width: 328, height: 252, segments: [{ x: 82, y: 0, width: 162, height: 252 }, { x: 0, y: 84, width: 328, height: 84 }], hideWhenComplete: true, progressLabel: { x: 236, y: 34, align: 'right' } },
    ],
    paint(column, row) {
      const pixel = LEVEL_TWELVE_PIXELS[row]?.[column];
      if (pixel === 'B') return null;
      return pixel === 'Y'
        ? { color: 'yellow', targetBucketId: 'yellow-inner' }
        : { color: 'purple', targetBucketId: 'purple-outer' };
    },
  },
  13: {
    gridBackground: '#428dce',
    frame: { x: 27, y: 164, width: 541, height: 944 },
    wall: { x: 47, y: 180, width: 503, height: 405 },
    grid: { x: 61, y: 197, width: 474, height: 373, cols: 37, rows: 29 },
    pad: { x: 50, y: 586, cols: 5, rows: 5, cellWidth: 98, cellHeight: 98, gap: 3 },
    duration: 180,
    booster: 'ufo',
    buckets: [
      { id: 'white-l', color: 'white', x: 50, y: 680, width: 212, height: 190, segments: [{ x: 0, y: 0, width: 70, height: 190 }, { x: 0, y: 130, width: 212, height: 60 }] },
      { id: 'white-right', color: 'white', x: 355, y: 680, width: 192, height: 190, segments: [{ x: 122, y: 0, width: 70, height: 190 }, { x: 0, y: 130, width: 192, height: 60 }] },
      { id: 'brown-top', color: 'brown', x: 50, y: 956, width: 150, height: 70 },
      { id: 'brown-bottom', color: 'brown', x: 398, y: 956, width: 150, height: 70 },
      { id: 'pink-left', color: 'magenta', x: 258, y: 870, width: 95, height: 175 },
      { id: 'pink-right', color: 'magenta', x: 355, y: 870, width: 192, height: 82 },
      { id: 'orange-top', color: 'orange', x: 50, y: 1030, width: 150, height: 70 },
      { id: 'orange-right', color: 'orange', x: 355, y: 1030, width: 192, height: 70 },
      { id: 'yellow-left', color: 'yellow', x: 50, y: 870, width: 206, height: 82 },
      { id: 'yellow-right', color: 'yellow', x: 202, y: 1030, width: 150, height: 70 },
    ],
    paint(column, row) {
      const pixel = LEVEL_THIRTEEN_PIXELS[row]?.[column];
      if (!pixel) return null;
      if (pixel === 'Y') return { color: 'yellow', targetBucketId: row >= 19 && column >= 24 ? 'yellow-right' : 'yellow-left' };
      if (pixel === 'M') return { color: 'magenta', targetBucketId: column < 19 ? 'pink-left' : 'pink-right' };
      if (pixel === 'D') return { color: 'brown', targetBucketId: row < 10 ? 'brown-top' : 'brown-bottom' };
      if (pixel === 'W') return { color: 'white', targetBucketId: column < 19 ? 'white-l' : 'white-right' };
      if (pixel === 'O') return { color: 'orange', targetBucketId: row < 15 ? 'orange-top' : 'orange-right' };
      return null;
    },
  },
};

function getLevelConfig(level) {
  return levels[level] ?? levels[13];
}

function makeGrid(config) {
  const grid = [];
  const boards = config.boards ?? [{ id: 'main', rect: config.grid, paint: config.paint }];
  const grids = boards.map((board) => {
    const cellOffset = grid.length;
    const { cols, rows, x, y, width, height } = board.rect;
    for (let row = 0; row < rows; row += 1) {
      for (let column = 0; column < cols; column += 1) {
        const painter = board.paint ?? config.paint;
        const painted = painter.call(config, column, row);
        grid.push(painted ? {
          ...painted, boardId: board.id, row, column,
          x: x + ((column + 0.5) * width) / cols,
          y: y + ((row + 0.5) * height) / rows,
        } : null);
      }
    }
    return { id: board.id, rect: board.rect, cellOffset };
  });
  return { grid, grids };
}

function countColors(grid, buckets) {
  const totals = Object.fromEntries(COLORS.map((color) => [color, 0]));
  const bucketTotals = Object.fromEntries(buckets.map((bucket) => [bucket.id, 0]));
  for (const cell of grid) {
    if (!cell) continue;
    totals[cell.color] += 1;
    if (cell.targetBucketId in bucketTotals) bucketTotals[cell.targetBucketId] += 1;
  }
  return { totals, bucketTotals };
}

export function createGameState(level = 1) {
  const config = getLevelConfig(level);
  const buckets = config.buckets.map((bucket) => ({
    ...bucket,
    segments: bucket.segments?.map((segment) => ({ ...segment })) ?? null,
    visible: false,
    completeAt: null,
  }));
  const { grid, grids } = makeGrid(config);
  const { totals, bucketTotals } = countColors(grid, buckets);
  for (const bucket of buckets) bucket.visible = !bucket.requires && bucketTotals[bucket.id] > 0;
  return {
    level,
    config,
    gridRect: config.grid,
    grids,
    grid,
    totals,
    collected: Object.fromEntries(COLORS.map((color) => [color, 0])),
    bucketTotals,
    bucketCollected: Object.fromEntries(buckets.map((bucket) => [bucket.id, 0])),
    bucketDisplayedCollected: level === 2
      ? Object.fromEntries(buckets.map((bucket) => [bucket.id, 0]))
      : null,
    buckets,
    status: level === 1 ? 'tutorial' : 'playing',
    started: level !== 1,
    timeRemaining: config.duration ?? (level < 6 ? 300 : 180),
    freezeRemaining: 0,
    moves: 0,
    particles: [],
    activeBucketId: null,
    invalidAt: null,
    generation: 1,
  };
}

export function applyLevelEightSecondYellowSourceBoard(state) {
  if (state.level !== 8) return false;
  const { cols, rows, x, y, width, height } = state.config.grid;
  if (LEVEL_EIGHT_SECOND_YELLOW_PIXELS.length !== rows
      || LEVEL_EIGHT_SECOND_YELLOW_PIXELS.some((line) => line.length !== cols)) {
    throw new Error('Level 8 source board data must match the 60 x 39 grid.');
  }

  const grid = [];
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < cols; column += 1) {
      const marker = LEVEL_EIGHT_SECOND_YELLOW_PIXELS[row][column];
      const color = { O: 'orange', M: 'magenta', Y: 'yellow' }[marker];
      if (!color) {
        grid.push(null);
        continue;
      }

      // The two completed source trays leave the board. Remaining pixels are
      // assigned to visible same-colour trays by position; this is provisional
      // because the recording does not show the original touch target.
      const targetBucketId = color === 'orange'
        ? (column < 11 ? 'orange-small' : column < 32 ? 'orange-left' : 'orange-mid')
        : color === 'magenta'
          ? (row < 27 ? 'magenta-mid' : 'magenta-bottom')
          : (row >= 23 && column < 13 ? 'yellow-small' : 'yellow-left');
      grid.push({
        color,
        targetBucketId,
        boardId: 'main',
        row,
        column,
        x: x + ((column + 0.5) * width) / cols,
        y: y + ((row + 0.5) * height) / rows,
      });
    }
  }

  const { totals, bucketTotals } = countColors(grid, state.buckets);
  for (const color of COLORS) totals[color] += state.collected[color] ?? 0;
  for (const bucket of state.buckets) {
    bucketTotals[bucket.id] += state.bucketCollected[bucket.id] ?? 0;
    bucket.visible = bucketTotals[bucket.id] > (state.bucketCollected[bucket.id] ?? 0);
  }
  state.grid = grid;
  state.totals = totals;
  state.bucketTotals = bucketTotals;
  state.moves = Math.max(state.moves, 2);
  state.status = 'playing';
  state.activeBucketId = null;
  return true;
}

function getBucketSegments(bucket) {
  return bucket.segments?.length ? bucket.segments : [{ x: 0, y: 0, width: bucket.width, height: bucket.height }];
}

function bucketContains(bucket, x, y) {
  return getBucketSegments(bucket).some((segment) => (
    x >= bucket.x + segment.x && x <= bucket.x + segment.x + segment.width
    && y >= bucket.y + segment.y && y <= bucket.y + segment.y + segment.height
  ));
}

export function getProgress(state, reference) {
  const bucketId = typeof reference === 'string' && state.bucketTotals[reference] !== undefined
    ? reference
    : reference?.id;
  if (bucketId && state.bucketTotals[bucketId] !== undefined) {
    const displayOverride = state.bucketProgressDisplayOverride?.[bucketId];
    if (Number.isFinite(displayOverride)) return Math.max(0, Math.min(100, Math.round(displayOverride)));
    const total = state.bucketTotals[bucketId];
    const collected = Math.max(
      state.bucketDisplayedCollected?.[bucketId] ?? state.bucketCollected[bucketId],
      state.bucketBonusCollected?.[bucketId] ?? 0,
    );
    return total ? Math.min(100, Math.round((collected / total) * 100)) : 100;
  }
  const color = typeof reference === 'string' ? reference : reference?.color;
  const total = state.totals[color] ?? 0;
  return total ? Math.min(100, Math.round((state.collected[color] / total) * 100)) : 100;
}

export function getBucket(state, id) {
  return state.buckets.find((bucket) => bucket.id === id) ?? null;
}

export function getBucketAt(state, x, y) {
  return [...state.buckets].reverse().find((bucket) => bucket.visible && bucketContains(bucket, x, y)) ?? null;
}

export function collectAt(state, bucketId, x, y) {
  const bucket = getBucket(state, bucketId);
  if (!bucket || !bucket.visible) return [];

  const found = [];
  for (let index = 0; index < state.grid.length; index += 1) {
    const cell = state.grid[index];
    if (!cell || cell.color !== bucket.color || cell.targetBucketId !== bucket.id) continue;
    if (!bucketContains(bucket, cell.x, cell.y)) continue;
    state.grid[index] = null;
    state.collected[cell.color] += 1;
    state.bucketCollected[bucket.id] += 1;
    found.push({ ...cell });
  }

  if (bucketTotalsComplete(state, bucket.id)) {
    if (bucket.hideWhenComplete) bucket.visible = false;
    for (const next of state.buckets.filter((candidate) => candidate.requires === bucket.id && state.bucketTotals[candidate.id] > 0)) next.visible = true;
  }
  if (found.length) state.status = 'playing';
  updateWinStatus(state);
  return found;
}

export function fillBucket(state, bucketId, limit = Number.POSITIVE_INFINITY) {
  const bucket = getBucket(state, bucketId);
  if (!bucket || !bucket.visible) return [];
  const found = [];
  for (let index = 0; index < state.grid.length; index += 1) {
    if (found.length >= limit) break;
    const cell = state.grid[index];
    if (!cell || cell.targetBucketId !== bucket.id || cell.color !== bucket.color) continue;
    state.grid[index] = null;
    state.collected[cell.color] += 1;
    state.bucketCollected[bucket.id] += 1;
    found.push({ ...cell });
  }
  if (bucketTotalsComplete(state, bucket.id) && bucket.hideWhenComplete) bucket.visible = false;
  for (const next of state.buckets.filter((candidate) => candidate.requires === bucket.id && state.bucketTotals[candidate.id] > 0)) next.visible = true;
  if (state.bucketDisplayedCollected) state.bucketDisplayedCollected[bucket.id] = state.bucketCollected[bucket.id];
  updateWinStatus(state);
  return found;
}

export function splitCellAt(state, x, y) {
  const cell = state.grid
    .filter(Boolean)
    .map((candidate) => ({
      candidate,
      distance: Math.hypot(candidate.x - x, candidate.y - y),
      board: state.grids.find((grid) => grid.id === candidate.boardId),
    }))
    .filter(({ candidate, distance, board }) => {
      if (!board || candidate.split) return false;
      return distance <= Math.min(board.rect.width / board.rect.cols, board.rect.height / board.rect.rows) * 0.8;
    })
    .sort((a, b) => a.distance - b.distance)[0]?.candidate;
  if (!cell) return false;
  cell.split = true;
  return cell;
}

function bucketTotalsComplete(state, bucketId) {
  return state.bucketTotals[bucketId] > 0
    && state.bucketCollected[bucketId] >= state.bucketTotals[bucketId];
}

export function collectAlongPath(state, bucketId, from, to) {
  const distance = Math.hypot(to.x - from.x, to.y - from.y);
  const steps = Math.max(1, Math.ceil(distance / 6));
  const collected = [];
  const bucket = getBucket(state, bucketId);
  if (!bucket) return collected;

  for (let step = 1; step <= steps; step += 1) {
    const ratio = step / steps;
    bucket.x = from.x + (to.x - from.x) * ratio;
    bucket.y = from.y + (to.y - from.y) * ratio;
    collected.push(...collectAt(state, bucketId, bucket.x, bucket.y));
  }
  updateWinStatus(state);
  return collected;
}

function updateWinStatus(state) {
  if (!state.grid.every((cell) => cell === null)) return;
  if (state.bucketDisplayedCollected && state.buckets.some((bucket) => (
    state.bucketDisplayedCollected[bucket.id] < state.bucketTotals[bucket.id]
  ))) return;
  state.status = 'won';
}

export function updateClock(state, deltaSeconds) {
  if (!state.started || state.status !== 'playing') return;
  if (state.freezeRemaining > 0) {
    state.freezeRemaining = Math.max(0, state.freezeRemaining - deltaSeconds);
    return;
  }
  state.timeRemaining = Math.max(0, state.timeRemaining - deltaSeconds);
  if (state.timeRemaining <= 0) state.status = 'lost';
}

export function formatClock(timeRemaining) {
  const seconds = Math.max(0, Math.ceil(timeRemaining));
  const minutes = Math.floor(seconds / 60);
  return `${String(minutes).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}

export function startNextLevel(state) {
  return createGameState(state.level + 1);
}
