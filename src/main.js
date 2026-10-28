import {
  SCREEN,
  applyLevelEightSecondYellowSourceBoard,
  collectAlongPath,
  createGameState,
  fillBucket,
  formatClock,
  getBucket,
  getBucketAt,
  getProgress,
  startNextLevel,
  splitCellAt,
  updateClock,
} from './game.js';
import {
  LEVEL_TWO_COLLECTION_ANNOUNCEMENTS,
  LEVEL_TWO_YELLOW_ATLAS,
  levelTwoRecordedBucketPosition,
  levelTwoSourceArrivalAt,
  levelTwoSourceProgressAt,
  levelTwoYellowAtlasSource,
} from './level-two-collection-profile.js';
import { AudioEngine } from './audio.js';

const canvas = document.querySelector('#game-canvas');
const ctx = canvas.getContext('2d', { alpha: false });
const settingsButton = document.querySelector('#settings-button');
const dialogLayer = document.querySelector('#dialog-layer');
const liveStatus = document.querySelector('#live-status');
const boosterControls = document.querySelector('#booster-controls');
const audio = new AudioEngine();
const prefersReducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const query = new URLSearchParams(location.search);
const requestedPreviewLevel = Number(query.get('previewLevel'));
const hasPreviewLevel = Number.isInteger(requestedPreviewLevel) && requestedPreviewLevel >= 1 && requestedPreviewLevel <= 13;
const requestedPreviewReward = query.get('previewReward') === '1';
const requestedSplashPreview = query.get('previewSplash') === '1';
const loadingScreenDurationMs = 1783;
const previewLevelOneAssetGate = hasPreviewLevel && requestedPreviewLevel === 1 && !requestedSplashPreview;
const previewLevelThreeAssetGate = hasPreviewLevel && requestedPreviewLevel === 3 && !requestedSplashPreview;
const previewLevelFourAssetGate = hasPreviewLevel && requestedPreviewLevel === 4 && !requestedSplashPreview;
const previewLevelFiveAssetGate = hasPreviewLevel && requestedPreviewLevel === 5 && !requestedSplashPreview;
const levelTwoWinSettleDurationMs = 900;
const levelTwoTransitionDurationMs = 1200;
const LEVEL_THREE_SOURCE_DURATION_SECONDS = 23;
const LEVEL_FOUR_SOURCE_DURATION_SECONDS = 15;
const LEVEL_FOUR_SOURCE_START_SECONDS = 0.5;
const LEVEL_FIVE_SOURCE_DURATION_SECONDS = 14;
const initialLevel = hasPreviewLevel ? requestedPreviewLevel : 1;

const COLORS_3D = {
  green: { light: '#a9ff75', mid: '#43e531', dark: '#138b28', deep: '#064c1d' },
  yellow: { light: '#fff581', mid: '#f7f438', dark: '#d89905', deep: '#775000' },
  red: { light: '#ff7468', mid: '#d32222', dark: '#99151e', deep: '#530b18' },
  blue: { light: '#8ce7ff', mid: '#20b9ff', dark: '#0873be', deep: '#063b6b' },
  purple: { light: '#777aff', mid: '#302bd0', dark: '#1c20a8', deep: '#10155f' },
  magenta: { light: '#ffc0d0', mid: '#f078a7', dark: '#c54667', deep: '#7e2b43' },
  white: { light: '#ffffff', mid: '#f0f2f7', dark: '#aebbc2', deep: '#58656d' },
  brown: { light: '#d99065', mid: '#7d2c28', dark: '#5f281e', deep: '#321411' },
  orange: { light: '#ffb071', mid: '#ee673c', dark: '#b9431d', deep: '#5e1c12' },
};

const LEVEL_ONE_PILE_THEMES = {
  yellow: { light: '#fff000', mid: '#f2cf08', dark: '#a98706', deep: '#5b4200' },
};

const LEVEL_TWO_CAVITY_THEMES = {
  green: [[0, '#398c30'], [0.2, '#286d1c'], [0.55, '#15500d'], [1, '#082207']],
  yellow: [[0, '#9a7605'], [0.2, '#8a6709'], [0.55, '#5e4708'], [1, '#352906']],
  red: [[0, '#9b2330'], [0.2, '#7b111c'], [0.55, '#430710'], [1, '#20040a']],
};

const LEVEL_FOUR_BUCKET_THEMES = {
  blue: { light: '#7168ff', mid: '#4136f5', dark: '#2b1dce', deep: '#130b82' },
};

const LEVEL_FOUR_CAVITY_THEMES = {
  green: [[0, '#174d1c'], [0.2, '#123f17'], [0.55, '#0b2d11'], [1, '#07190b']],
  yellow: [[0, '#423c00'], [0.2, '#3b3500'], [0.55, '#272400'], [1, '#111000']],
  red: [[0, '#421010'], [0.2, '#3c0e0e'], [0.55, '#29090a'], [1, '#150607']],
  blue: [[0, '#001538'], [0.2, '#001332'], [0.55, '#000b24'], [1, '#000516']],
};

// Level 3 cell faces sampled from the supplied recording at 00:19.9, after
// scaling its 1206 x 2622 frame to the 597 x 1296 game viewport.
const LEVEL_PIXEL_THEMES = {
  3: {
    yellow: { light: '#fff63c', mid: '#fcee2e', dark: '#d9b719', deep: '#977500' },
    blue: { light: '#70d7ff', mid: '#4eb7fa', dark: '#176db4', deep: '#0756b4' },
    purple: { light: '#575eff', mid: '#3d44fb', dark: '#2327ad', deep: '#202399' },
  },
  // Level 8 hues calibrated from cell-center samples at source time 00:02:54.83.
  8: {
    orange: { light: '#ec6239', mid: '#e05a32', dark: '#b74620', deep: '#672314' },
    magenta: { light: '#e522ec', mid: '#dd1fe0', dark: '#ad17a7', deep: '#650e68' },
    yellow: { light: '#f9f53d', mid: '#ede935', dark: '#c2ac17', deep: '#655709' },
  },
};

const state = {
  game: createGameState(initialLevel),
  // Keep the first-level preview on its loading scene until the source opening
  // panel and hand clip are decoded. Otherwise the first paint shows the
  // procedural buckets, then swaps to the source frame and can look like a
  // yellow-slot flash during startup.
  loading: requestedSplashPreview || !hasPreviewLevel || previewLevelOneAssetGate || previewLevelThreeAssetGate || previewLevelFourAssetGate || previewLevelFiveAssetGate,
  loadingPreview: requestedSplashPreview,
  loadingStartedAt: performance.now(),
  lastFrameAt: performance.now(),
  dragging: false,
  lastPoint: null,
  dragOrigin: null,
  dragOffset: null,
  dragStartedAt: null,
  dragDistance: 0,
  moveCollected: 0,
  particleSerial: 0,
  lastStatus: initialLevel === 1 ? 'tutorial' : 'playing',
  settingsReturnStatus: initialLevel === 1 ? 'tutorial' : 'playing',
  endDialogShown: false,
  hammerMode: false,
  ufoMode: false,
  freezeCharges: 2,
  hammerCharges: 2,
  ufoCharges: 2,
  ufoFlight: null,
  introReturnStatus: 'playing',
  transitionTimer: null,
  levelOneSourceTimeline: null,
  levelTwoSourceTimeline: null,
  levelTwoInteractive: false,
  levelFourSourcePanelReleased: false,
  levelFourSourceTimeline: null,
  levelFiveSourceTimeline: null,
  levelFiveSourcePanelReleased: false,
  levelFiveSourceCandidate: false,
  levelFiveCandidatePath: [],
  levelThreeSourceTimeline: null,
  levelEightSourceTimeline: null,
  levelEightSourceCandidate: null,
  levelEightSourcePanelHeld: false,
  levelEightSourcePanelClip: 'first-magenta',
  levelEightSourceBucketId: null,
  levelEightSourceBoardImage: null,
  levelElevenSourceTimeline: null,
  levelElevenSourceCandidate: null,
  levelElevenSourcePanelHeld: false,
  levelElevenSourcePanelClip: 'first-purple',
  levelElevenSourceBucketId: null,
  levelElevenSourceBoardImage: null,
  levelOneWonPending: false,
};
// A direct level preview is a still opening frame until the player interacts.
// This keeps the preview timer aligned with the recorded 03:00 opening frame;
// the first accepted drag starts the normal game clock.
if (hasPreviewLevel) state.game.started = false;
const levelPixelTileCache = new Map();
const voxelSpriteCache = new Map();
const startupSplashBoxImage = new Image();
startupSplashBoxImage.src = '/assets/startup/splash-box.png';
const levelOneBoardImage = new Image();
levelOneBoardImage.src = '/assets/level1/level1-board.png';
const levelOneSettingsGearImage = new Image();
levelOneSettingsGearImage.src = '/assets/level1/level1-settings-gear.png';
const levelOneOpeningPanelImage = new Image();
levelOneOpeningPanelImage.src = '/assets/level1/level1-opening-panel.png';
const levelOneGreenBucketAtlasImage = new Image();
levelOneGreenBucketAtlasImage.src = '/assets/level1/level1-green-bucket-atlas.png';
const levelOneLiveFrameCanvas = document.createElement('canvas');
levelOneLiveFrameCanvas.width = 563;
levelOneLiveFrameCanvas.height = 744;
let levelOneLiveFrameReady = false;
const levelOneTutorialVideo = document.createElement('video');
levelOneTutorialVideo.id = 'level-one-tutorial-video';
levelOneTutorialVideo.src = '/assets/level1/level1-tutorial-hand.mp4';
levelOneTutorialVideo.preload = 'auto';
levelOneTutorialVideo.playsInline = true;
levelOneTutorialVideo.muted = true;
// The source recording shows one tutorial gesture before the player acts.
// Replaying the 57-frame clip every 0.95s makes the hand pop back onto the
// yellow progress badge and looks like the slot is flashing. Keep the final
// hand frame on screen after the one-shot gesture instead.
levelOneTutorialVideo.loop = false;
levelOneTutorialVideo.disablePictureInPicture = true;
levelOneTutorialVideo.setAttribute('aria-hidden', 'true');
levelOneTutorialVideo.style.cssText = 'position:absolute;left:0;top:0;width:1px;height:1px;opacity:0;pointer-events:none';
const levelOneTutorialFramesImage = new Image();
if (initialLevel === 1) levelOneTutorialFramesImage.src = '/assets/level1/level1-tutorial-frames.png';
const levelOneTutorialFrameCanvas = document.createElement('canvas');
levelOneTutorialFrameCanvas.width = 563;
levelOneTutorialFrameCanvas.height = 756;
const levelOneTutorialFrameContext = levelOneTutorialFrameCanvas.getContext('2d');
let cachedLevelOneTutorialFrame = -1;
const levelOneSourceVideo = document.createElement('video');
levelOneSourceVideo.id = 'level-one-source-video';
levelOneSourceVideo.src = '/assets/level1/level1-source-animation.mp4';
levelOneSourceVideo.preload = 'auto';
levelOneSourceVideo.playsInline = true;
levelOneSourceVideo.muted = true;
levelOneSourceVideo.disablePictureInPicture = true;
levelOneSourceVideo.setAttribute('aria-hidden', 'true');
levelOneSourceVideo.style.cssText = 'position:absolute;left:0;top:0;width:1px;height:1px;opacity:0;pointer-events:none';
if (initialLevel === 1) document.querySelector('.game-shell')?.append(levelOneTutorialVideo, levelOneSourceVideo);
const levelOneSourcePresentedFrameCanvas = document.createElement('canvas');
levelOneSourcePresentedFrameCanvas.width = 564;
levelOneSourcePresentedFrameCanvas.height = 756;
const levelOneSourcePresentedFrameContext = levelOneSourcePresentedFrameCanvas.getContext('2d', { willReadFrequently: true });
let levelOneSourcePresentedFrameTime = null;
window.__levelOneSourcePresentedFrameCanvas = levelOneSourcePresentedFrameCanvas;
window.__levelOneSourcePresentedFrameTime = levelOneSourcePresentedFrameTime;

function captureLevelOneSourcePresentedFrame(mediaTime = levelOneSourceVideo.currentTime) {
  if (levelOneSourceVideo.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) return false;
  levelOneSourcePresentedFrameContext.imageSmoothingEnabled = false;
  levelOneSourcePresentedFrameContext.drawImage(
    levelOneSourceVideo,
    0,
    0,
    levelOneSourcePresentedFrameCanvas.width,
    levelOneSourcePresentedFrameCanvas.height,
  );
  levelOneSourcePresentedFrameTime = mediaTime;
  window.__levelOneSourcePresentedFrameTime = mediaTime;
  return true;
}

levelOneSourceVideo.addEventListener('loadeddata', () => captureLevelOneSourcePresentedFrame());
levelOneSourceVideo.addEventListener('seeked', () => {
  captureLevelOneSourcePresentedFrame();
  if (state.levelOneSourceTimeline?.color === 'yellow') drawLevelOneSourceFrameToCanvas();
});
for (const eventName of ['pause', 'seeking', 'waiting', 'stalled']) {
  levelOneSourceVideo.addEventListener(eventName, () => {
    const timeline = state.levelOneSourceTimeline;
    if (timeline && !timeline.completed) timeline.awaitingSourceFrame = true;
  });
}

function initialPreviewAssetsReady() {
  if (initialLevel === 1) {
    if (!levelOneOpeningPanelImage.complete || levelOneOpeningPanelImage.naturalWidth === 0) return false;
    if (!levelOneGreenBucketAtlasImage.complete) return false;
    return prefersReducedMotion.matches
      || (levelOneTutorialVideo.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA
        && levelOneTutorialFramesImage.complete
        && levelOneTutorialFramesImage.naturalWidth > 0);
  }
  if (initialLevel === 3) {
    return levelThreeOpeningPanelImage.complete
      && levelThreeOpeningPanelImage.naturalWidth > 0
      && levelThreeSourceGameplayVideo.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA
      && levelThreeSourceAudio.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA;
  }
  if (initialLevel === 4) {
    return levelFourOpeningPanelImage.complete
      && levelFourOpeningPanelImage.naturalWidth > 0
      && levelFourFrameOverlayImage.complete
      && levelFourFrameOverlayImage.naturalWidth > 0
      && levelFourSourceGameplayVideo.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA
      && levelFourSourceAudio.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA;
  }
  if (initialLevel === 5) {
    return levelFiveOpeningPanelImage.complete
      && levelFiveOpeningPanelImage.naturalWidth > 0
      && levelFiveSourceGameplayVideo.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA
      && levelFiveSourceAudio.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA;
  }
  return true;
}

const levelOneSourceAudio = document.createElement('audio');
levelOneSourceAudio.id = 'level-one-source-audio';
levelOneSourceAudio.src = '/assets/level1/level1-source-audio.m4a';
levelOneSourceAudio.preload = 'auto';
levelOneSourceAudio.setAttribute('aria-hidden', 'true');
levelOneSourceAudio.style.cssText = 'position:absolute;left:0;top:0;width:1px;height:1px;opacity:0;pointer-events:none';
if (initialLevel === 1) document.querySelector('.game-shell')?.append(levelOneSourceAudio);
const levelTwoSourceAudio = document.createElement('audio');
levelTwoSourceAudio.id = 'level-two-source-audio';
levelTwoSourceAudio.src = '/assets/level2/level2-source-audio.m4a';
levelTwoSourceAudio.preload = 'auto';
levelTwoSourceAudio.muted = true;
levelTwoSourceAudio.setAttribute('aria-hidden', 'true');
levelTwoSourceAudio.style.cssText = 'position:absolute;left:0;top:0;width:1px;height:1px;opacity:0;pointer-events:none';
document.querySelector('.game-shell')?.append(levelTwoSourceAudio);
const LEVEL_ONE_OPENING_BLEND_START = 744;
const LEVEL_ONE_ACTION_BLEND_START = 744;
const levelOneSourceBlendCanvas = document.createElement('canvas');
levelOneSourceBlendCanvas.width = 564;
levelOneSourceBlendCanvas.height = 756 - LEVEL_ONE_OPENING_BLEND_START;
const levelOneSourceBlendContext = levelOneSourceBlendCanvas.getContext('2d');
const levelOneSourceFadeMask = document.createElement('canvas');
levelOneSourceFadeMask.width = 564;
levelOneSourceFadeMask.height = 756 - LEVEL_ONE_ACTION_BLEND_START;
const levelOneSourceFadeMaskContext = levelOneSourceFadeMask.getContext('2d');
const levelOneSourceFadeGradient = levelOneSourceFadeMaskContext.createLinearGradient(0, 0, 0, levelOneSourceFadeMask.height);
levelOneSourceFadeGradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
levelOneSourceFadeGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
levelOneSourceFadeMaskContext.fillStyle = levelOneSourceFadeGradient;
levelOneSourceFadeMaskContext.fillRect(0, 0, 564, levelOneSourceFadeMask.height);
const levelOneYellowPileImage = new Image();
levelOneYellowPileImage.src = '/assets/level1/level1-yellow-pile-100.png';
const levelTwoBoardImage = new Image();
levelTwoBoardImage.src = '/assets/level2/level2-board.png';
const levelTwoOpeningPanelImage = new Image();
levelTwoOpeningPanelImage.src = '/assets/level2/level2-opening-panel.png';
const levelTwoGameplayBackgroundImage = new Image();
levelTwoGameplayBackgroundImage.src = '/assets/level2/level2-gameplay-background.png';
const levelTwoYellowBucketAtlasImage = new Image();
levelTwoYellowBucketAtlasImage.src = '/assets/level2/level2-yellow-bucket-atlas.png';
const levelTwoGreenBucketAtlasImage = new Image();
levelTwoGreenBucketAtlasImage.src = '/assets/level2/level2-green-bucket-atlas.png';
const LEVEL_TWO_GREEN_BUCKET_MASK = new Path2D('M 2 16 Q 2 2 17 2 H 188 Q 205 2 205 19 V 79 Q 205 99 185 99 H 113 Q 99 99 99 113 V 182 Q 99 201 82 201 H 17 Q 1 201 1 183 Z');
const levelTwoRedBucketAtlasImage = new Image();
levelTwoRedBucketAtlasImage.src = '/assets/level2/level2-red-bucket-atlas.png';
const LEVEL_TWO_RED_BUCKET_MASK = new Path2D('M 2 16 Q 2 1 18 1 H 189 Q 205 1 205 17 V 188 Q 205 203 189 203 H 120 Q 103 203 103 188 V 128 Q 103 114 89 114 H 18 Q 2 114 2 98 Z');
const levelTwoSourceGameplayVideo = document.createElement('video');
levelTwoSourceGameplayVideo.id = 'level-two-source-gameplay-video';
levelTwoSourceGameplayVideo.src = '/assets/level2/level2-gameplay-source.mp4';
levelTwoSourceGameplayVideo.preload = 'auto';
levelTwoSourceGameplayVideo.playsInline = true;
levelTwoSourceGameplayVideo.muted = true;
levelTwoSourceGameplayVideo.disablePictureInPicture = true;
levelTwoSourceGameplayVideo.setAttribute('aria-hidden', 'true');
levelTwoSourceGameplayVideo.style.cssText = 'position:absolute;left:0;top:0;width:1px;height:1px;opacity:0;pointer-events:none';
document.querySelector('.game-shell')?.append(levelTwoSourceGameplayVideo);
const levelThreeOpeningPanelImage = new Image();
levelThreeOpeningPanelImage.src = '/assets/level3/level3-opening-panel.png';
const levelThreePanelCanvas = document.createElement('canvas');
levelThreePanelCanvas.width = 554;
levelThreePanelCanvas.height = 820;
const levelThreePanelContext = levelThreePanelCanvas.getContext('2d');
let levelThreePanelCacheKey = null;
const levelThreeSourceGameplayVideo = document.createElement('video');
levelThreeSourceGameplayVideo.id = 'level-three-source-gameplay-video';
levelThreeSourceGameplayVideo.src = '/assets/level3/level3-gameplay-source.mp4';
levelThreeSourceGameplayVideo.preload = initialLevel === 3 ? 'auto' : 'none';
levelThreeSourceGameplayVideo.playsInline = true;
levelThreeSourceGameplayVideo.muted = true;
levelThreeSourceGameplayVideo.disablePictureInPicture = true;
levelThreeSourceGameplayVideo.setAttribute('aria-hidden', 'true');
levelThreeSourceGameplayVideo.style.cssText = 'position:absolute;left:0;top:0;width:1px;height:1px;opacity:0;pointer-events:none';
document.querySelector('.game-shell')?.append(levelThreeSourceGameplayVideo);
const levelThreeSourceAudio = document.createElement('audio');
levelThreeSourceAudio.id = 'level-three-source-audio';
levelThreeSourceAudio.src = '/assets/level3/level3-source-audio.m4a';
levelThreeSourceAudio.preload = initialLevel === 3 ? 'auto' : 'none';
levelThreeSourceAudio.muted = true;
levelThreeSourceAudio.setAttribute('aria-hidden', 'true');
levelThreeSourceAudio.style.cssText = 'position:absolute;left:0;top:0;width:1px;height:1px;opacity:0;pointer-events:none';
document.querySelector('.game-shell')?.append(levelThreeSourceAudio);
const levelFourSourceGameplayVideo = document.createElement('video');
levelFourSourceGameplayVideo.id = 'level-four-source-gameplay-video';
levelFourSourceGameplayVideo.src = '/assets/level4/level4-gameplay-source.mp4';
levelFourSourceGameplayVideo.preload = initialLevel === 4 ? 'auto' : 'none';
levelFourSourceGameplayVideo.playsInline = true;
levelFourSourceGameplayVideo.muted = true;
levelFourSourceGameplayVideo.disablePictureInPicture = true;
levelFourSourceGameplayVideo.setAttribute('aria-hidden', 'true');
levelFourSourceGameplayVideo.style.cssText = 'position:absolute;left:0;top:0;width:1px;height:1px;opacity:0;pointer-events:none';
document.querySelector('.game-shell')?.append(levelFourSourceGameplayVideo);
const levelFourSourceAudio = document.createElement('audio');
levelFourSourceAudio.id = 'level-four-source-audio';
levelFourSourceAudio.src = '/assets/level4/level4-source-audio.m4a';
levelFourSourceAudio.preload = initialLevel === 4 ? 'auto' : 'none';
levelFourSourceAudio.muted = true;
levelFourSourceAudio.setAttribute('aria-hidden', 'true');
levelFourSourceAudio.style.cssText = 'position:absolute;left:0;top:0;width:1px;height:1px;opacity:0;pointer-events:none';
document.querySelector('.game-shell')?.append(levelFourSourceAudio);
const levelFiveOpeningPanelImage = new Image();
levelFiveOpeningPanelImage.src = '/assets/level5/level5-opening-panel.png';
const levelFiveSourceGameplayVideo = document.createElement('video');
levelFiveSourceGameplayVideo.id = 'level-five-source-gameplay-video';
levelFiveSourceGameplayVideo.src = '/assets/level5/level5-gameplay-source.mp4';
levelFiveSourceGameplayVideo.preload = initialLevel === 5 ? 'auto' : 'none';
levelFiveSourceGameplayVideo.playsInline = true;
levelFiveSourceGameplayVideo.muted = true;
levelFiveSourceGameplayVideo.disablePictureInPicture = true;
levelFiveSourceGameplayVideo.setAttribute('aria-hidden', 'true');
levelFiveSourceGameplayVideo.style.cssText = 'position:absolute;left:0;top:0;width:1px;height:1px;opacity:0;pointer-events:none';
document.querySelector('.game-shell')?.append(levelFiveSourceGameplayVideo);
const levelFiveSourceAudio = document.createElement('audio');
levelFiveSourceAudio.id = 'level-five-source-audio';
levelFiveSourceAudio.src = '/assets/level5/level5-source-audio.m4a';
levelFiveSourceAudio.preload = initialLevel === 5 ? 'auto' : 'none';
levelFiveSourceAudio.muted = true;
levelFiveSourceAudio.setAttribute('aria-hidden', 'true');
levelFiveSourceAudio.style.cssText = 'position:absolute;left:0;top:0;width:1px;height:1px;opacity:0;pointer-events:none';
document.querySelector('.game-shell')?.append(levelFiveSourceAudio);
const levelEightSourceGameplayVideo = document.createElement('video');
levelEightSourceGameplayVideo.id = 'level-eight-source-gameplay-video';
levelEightSourceGameplayVideo.src = '/assets/level8/level8-first-magenta.webm';
levelEightSourceGameplayVideo.preload = initialLevel === 8 ? 'auto' : 'none';
levelEightSourceGameplayVideo.playsInline = true;
levelEightSourceGameplayVideo.muted = true;
levelEightSourceGameplayVideo.disablePictureInPicture = true;
levelEightSourceGameplayVideo.setAttribute('aria-hidden', 'true');
levelEightSourceGameplayVideo.style.cssText = 'position:absolute;left:0;top:0;width:1px;height:1px;opacity:0;pointer-events:none';
document.querySelector('.game-shell')?.append(levelEightSourceGameplayVideo);
const levelEightSourceAudio = document.createElement('audio');
levelEightSourceAudio.id = 'level-eight-source-audio';
levelEightSourceAudio.src = '/assets/level8/level8-first-magenta-audio.m4a';
levelEightSourceAudio.preload = initialLevel === 8 ? 'auto' : 'none';
levelEightSourceAudio.muted = true;
levelEightSourceAudio.setAttribute('aria-hidden', 'true');
levelEightSourceAudio.style.cssText = 'position:absolute;left:0;top:0;width:1px;height:1px;opacity:0;pointer-events:none';
document.querySelector('.game-shell')?.append(levelEightSourceAudio);
const levelEightSecondYellowVideo = document.createElement('video');
levelEightSecondYellowVideo.id = 'level-eight-second-yellow-video';
levelEightSecondYellowVideo.src = '/assets/level8/level8-second-yellow.webm';
levelEightSecondYellowVideo.preload = initialLevel === 8 ? 'auto' : 'none';
levelEightSecondYellowVideo.playsInline = true;
levelEightSecondYellowVideo.muted = true;
levelEightSecondYellowVideo.disablePictureInPicture = true;
levelEightSecondYellowVideo.setAttribute('aria-hidden', 'true');
levelEightSecondYellowVideo.style.cssText = 'position:absolute;left:0;top:0;width:1px;height:1px;opacity:0;pointer-events:none';
document.querySelector('.game-shell')?.append(levelEightSecondYellowVideo);
const levelEightSecondYellowAudio = document.createElement('audio');
levelEightSecondYellowAudio.id = 'level-eight-second-yellow-audio';
levelEightSecondYellowAudio.src = '/assets/level8/level8-second-yellow-audio.m4a';
levelEightSecondYellowAudio.preload = initialLevel === 8 ? 'auto' : 'none';
levelEightSecondYellowAudio.muted = true;
levelEightSecondYellowAudio.setAttribute('aria-hidden', 'true');
levelEightSecondYellowAudio.style.cssText = 'position:absolute;left:0;top:0;width:1px;height:1px;opacity:0;pointer-events:none';
document.querySelector('.game-shell')?.append(levelEightSecondYellowAudio);
const LEVEL_EIGHT_SOURCE_CLIPS = {
  'first-magenta': {
    video: levelEightSourceGameplayVideo,
    audio: levelEightSourceAudio,
    frames: 143,
    duration: 2.384,
    bucketId: 'magenta-top',
    status: '正在收集洋红色像素',
  },
  'second-yellow': {
    video: levelEightSecondYellowVideo,
    audio: levelEightSecondYellowAudio,
    frames: 95,
    duration: 1.6,
    bucketId: 'yellow-mid',
    status: '正在收集黄色像素',
  },
};
const levelElevenFirstPurpleVideo = document.createElement('video');
levelElevenFirstPurpleVideo.id = 'level-eleven-first-purple-video';
levelElevenFirstPurpleVideo.src = '/assets/level11/level11-first-purple.webm';
levelElevenFirstPurpleVideo.preload = initialLevel === 11 ? 'auto' : 'none';
levelElevenFirstPurpleVideo.playsInline = true;
levelElevenFirstPurpleVideo.muted = true;
levelElevenFirstPurpleVideo.disablePictureInPicture = true;
levelElevenFirstPurpleVideo.setAttribute('aria-hidden', 'true');
levelElevenFirstPurpleVideo.style.cssText = 'position:absolute;left:0;top:0;width:1px;height:1px;opacity:0;pointer-events:none';
document.querySelector('.game-shell')?.append(levelElevenFirstPurpleVideo);
const levelElevenFirstPurpleAudio = document.createElement('audio');
levelElevenFirstPurpleAudio.id = 'level-eleven-first-purple-audio';
levelElevenFirstPurpleAudio.src = '/assets/level11/level11-first-purple-audio.m4a';
levelElevenFirstPurpleAudio.preload = initialLevel === 11 ? 'auto' : 'none';
levelElevenFirstPurpleAudio.muted = true;
levelElevenFirstPurpleAudio.setAttribute('aria-hidden', 'true');
levelElevenFirstPurpleAudio.style.cssText = 'position:absolute;left:0;top:0;width:1px;height:1px;opacity:0;pointer-events:none';
document.querySelector('.game-shell')?.append(levelElevenFirstPurpleAudio);
const levelElevenSecondPurpleVideo = document.createElement('video');
levelElevenSecondPurpleVideo.id = 'level-eleven-second-purple-video';
levelElevenSecondPurpleVideo.src = '/assets/level11/level11-second-purple.webm';
levelElevenSecondPurpleVideo.preload = initialLevel === 11 ? 'auto' : 'none';
levelElevenSecondPurpleVideo.playsInline = true;
levelElevenSecondPurpleVideo.muted = true;
levelElevenSecondPurpleVideo.disablePictureInPicture = true;
levelElevenSecondPurpleVideo.setAttribute('aria-hidden', 'true');
levelElevenSecondPurpleVideo.style.cssText = 'position:absolute;left:0;top:0;width:1px;height:1px;opacity:0;pointer-events:none';
document.querySelector('.game-shell')?.append(levelElevenSecondPurpleVideo);
const levelElevenSecondPurpleAudio = document.createElement('audio');
levelElevenSecondPurpleAudio.id = 'level-eleven-second-purple-audio';
levelElevenSecondPurpleAudio.src = '/assets/level11/level11-second-purple-audio.m4a';
levelElevenSecondPurpleAudio.preload = initialLevel === 11 ? 'auto' : 'none';
levelElevenSecondPurpleAudio.muted = true;
levelElevenSecondPurpleAudio.setAttribute('aria-hidden', 'true');
levelElevenSecondPurpleAudio.style.cssText = 'position:absolute;left:0;top:0;width:1px;height:1px;opacity:0;pointer-events:none';
document.querySelector('.game-shell')?.append(levelElevenSecondPurpleAudio);
const LEVEL_ELEVEN_SOURCE_CLIPS = {
  'first-purple': {
    video: levelElevenFirstPurpleVideo,
    audio: levelElevenFirstPurpleAudio,
    frames: 84,
    duration: 1.4,
    bucketId: 'purple-upper-right',
    status: '正在收集紫色像素',
  },
  'second-purple': {
    video: levelElevenSecondPurpleVideo,
    audio: levelElevenSecondPurpleAudio,
    frames: 72,
    duration: 1.2,
    bucketId: 'purple-upper-left',
    status: '正在收集紫色像素',
  },
};
const levelThirteenUfoReferenceVideo = document.createElement('video');
levelThirteenUfoReferenceVideo.id = 'level-thirteen-ufo-reference-video';
levelThirteenUfoReferenceVideo.src = '/assets/level13/ufo-fill-reference.webm';
levelThirteenUfoReferenceVideo.preload = initialLevel === 13 ? 'auto' : 'none';
levelThirteenUfoReferenceVideo.playsInline = true;
levelThirteenUfoReferenceVideo.muted = true;
levelThirteenUfoReferenceVideo.disablePictureInPicture = true;
levelThirteenUfoReferenceVideo.setAttribute('aria-hidden', 'true');
levelThirteenUfoReferenceVideo.style.cssText = 'position:absolute;left:0;top:0;width:1px;height:1px;opacity:0;pointer-events:none';
document.querySelector('.game-shell')?.append(levelThirteenUfoReferenceVideo);
// Zero-based source-frame indices mapped to the manually reviewed yellow-slot labels.
// Labels are reviewed across adjacent source frames; frame 167 visibly resets to 30% before 82%.
const LEVEL_THIRTEEN_UFO_SOURCE_PROGRESS = [
  [0, 0],
  [124, 9],
  [127, 12],
  [129, 16],
  [131, 19],
  [132, 25],
  [137, 29],
  [140, 36],
  [142, 39],
  [145, 42],
  [147, 46],
  [149, 50],
  [151, 52],
  [153, 56],
  [155, 59],
  [157, 63],
  [161, 69],
  [163, 72],
  [165, 76],
  [167, 30],
  [169, 82],
  [171, 86],
  [173, 89],
  [175, 92],
  [177, 97],
  [179, 99],
  [181, 100],
];
const levelThreeBoardImage = new Image();
levelThreeBoardImage.src = '/assets/level3/level3-board.png';
const levelFourBoardCellsImage = new Image();
levelFourBoardCellsImage.src = '/assets/level4/level4-board-cells.png';
const levelFourOpeningPanelImage = new Image();
levelFourOpeningPanelImage.src = '/assets/level4/level4-opening-panel.png';
const levelFourFrameOverlayImage = new Image();
levelFourFrameOverlayImage.src = '/assets/level4/level4-frame-overlay.png';
const levelFiveBoardImage = new Image();
levelFiveBoardImage.src = '/assets/level5/level5-board.png';
const levelSixBoardImage = new Image();
levelSixBoardImage.src = '/assets/level6/level6-board.png';
const levelSevenBoardImage = new Image();
levelSevenBoardImage.src = '/assets/level7/level7-board.png';
const levelNineBoardImage = new Image();
levelNineBoardImage.src = '/assets/level9/level9-board.png';
const levelTwelveBoardImage = new Image();
levelTwelveBoardImage.src = '/assets/level12/level12-board.png';
const levelThirteenBoardImage = new Image();
levelThirteenBoardImage.src = '/assets/level13/level13-board.png';
const levelOnePadCellImages = Array.from({ length: 4 }, (_, index) => {
  const image = new Image();
  image.src = `/assets/level1/level1-pad-cell-${index + 1}.png`;
  return image;
});
const levelEightBoardImage = new Image();
levelEightBoardImage.src = '/assets/level8/level8-board.png';
const levelTenBoardImage = new Image();
levelTenBoardImage.src = '/assets/level10/level10-board.png';
const levelTenEmptyTileImage = new Image();
levelTenEmptyTileImage.src = '/assets/level10/level10-empty-tile.png';
const levelTenPadImage = new Image();
levelTenPadImage.src = '/assets/level10/level10-pad-row.png';
const levelTenPipeImages = Array.from({ length: 3 }, (_, index) => {
  const image = new Image();
  image.src = `/assets/level10/level10-pipe-${index + 1}-top.png`;
  return image;
});
const levelTenBucketConfigs = createGameState(10).config.buckets;
const levelTenBucketOrigins = new Map(levelTenBucketConfigs.map((bucket) => [
  bucket.id,
  { x: bucket.x, y: bucket.y },
]));
const levelTenBucketImages = new Map(levelTenBucketConfigs
  .filter(({ y, height }) => y + height <= 900)
  .map(({ id: bucketId }) => {
  const image = new Image();
  image.src = `/assets/level10/level10-bucket-${bucketId}.png`;
  return [bucketId, image];
  }));
const levelElevenBoardImages = Object.fromEntries(['upper', 'lower'].map((boardId) => {
  const image = new Image();
  image.src = `/assets/level11/level11-${boardId}-board.png`;
  return [boardId, image];
}));
const levelEightTileImages = Object.fromEntries(['orange', 'magenta', 'yellow'].map((color) => {
  const image = new Image();
  image.src = `/assets/level8/level8-${color}.png`;
  return [color, image];
}));

function roundedRect(x, y, width, height, radius) {
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, radius);
}

function fillRounded(x, y, width, height, radius, fill) {
  roundedRect(x, y, width, height, radius);
  ctx.fillStyle = fill;
  ctx.fill();
}

function gradient(x1, y1, x2, y2, stops) {
  const value = ctx.createLinearGradient(x1, y1, x2, y2);
  for (const [position, color] of stops) value.addColorStop(position, color);
  return value;
}

function drawBackground() {
  ctx.fillStyle = gradient(0, 0, 0, SCREEN.height, [
    [0, '#7cccf1'], [0.3, '#92d9f4'], [0.7, '#86d1ef'], [1, '#71c3e9'],
  ]);
  ctx.fillRect(0, 0, SCREEN.width, SCREEN.height);

  const glow = ctx.createRadialGradient(300, 585, 40, 300, 585, 790);
  glow.addColorStop(0, '#e1f9ff66');
  glow.addColorStop(1, '#79c8ef00');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, SCREEN.width, SCREEN.height);
}

function loadingVoxel(cx, cy, size, color, rotation = 0, shadow = true, paletteOverride = null) {
  const pixelSize = Math.max(3, Math.round(size));
  const palette = paletteOverride ?? COLORS_3D[color] ?? COLORS_3D.yellow;
  const paletteKey = `${palette.light}:${palette.mid}:${palette.dark}:${palette.deep}`;
  const cacheKey = `${color}:${pixelSize}:${shadow ? 'shadow' : 'flat'}:${paletteKey}`;
  let sprite = voxelSpriteCache.get(cacheKey);
  if (!sprite) {
    const half = pixelSize / 2;
    const depth = pixelSize * 0.28;
    const padding = shadow ? Math.ceil(pixelSize * 0.5) : 1;
    const surface = document.createElement('canvas');
    surface.width = Math.ceil(pixelSize + padding * 2);
    surface.height = Math.ceil(pixelSize * 1.08 + padding * 2);
    const surfaceContext = surface.getContext('2d');
    surfaceContext.translate(padding + half, padding + depth);
    if (shadow) {
      surfaceContext.shadowColor = '#062c6688';
      surfaceContext.shadowBlur = pixelSize * 0.16;
      surfaceContext.shadowOffsetY = pixelSize * 0.13;
    }

    surfaceContext.beginPath();
    surfaceContext.moveTo(-half, 0);
    surfaceContext.lineTo(0, -depth);
    surfaceContext.lineTo(half, 0);
    surfaceContext.lineTo(0, depth);
    surfaceContext.closePath();
    const top = surfaceContext.createLinearGradient(0, -depth, 0, depth);
    top.addColorStop(0, palette.light);
    top.addColorStop(0.55, palette.mid);
    top.addColorStop(1, palette.dark);
    surfaceContext.fillStyle = top;
    surfaceContext.fill();

    surfaceContext.beginPath();
    surfaceContext.moveTo(-half, 0);
    surfaceContext.lineTo(0, depth);
    surfaceContext.lineTo(0, depth + pixelSize * 0.52);
    surfaceContext.lineTo(-half, pixelSize * 0.52);
    surfaceContext.closePath();
    const left = surfaceContext.createLinearGradient(-half, 0, 0, 0);
    left.addColorStop(0, palette.mid);
    left.addColorStop(1, palette.dark);
    surfaceContext.fillStyle = left;
    surfaceContext.fill();

    surfaceContext.beginPath();
    surfaceContext.moveTo(0, depth);
    surfaceContext.lineTo(half, 0);
    surfaceContext.lineTo(half, pixelSize * 0.52);
    surfaceContext.lineTo(0, depth + pixelSize * 0.52);
    surfaceContext.closePath();
    const right = surfaceContext.createLinearGradient(0, depth, half, depth);
    right.addColorStop(0, palette.mid);
    right.addColorStop(1, palette.deep);
    surfaceContext.fillStyle = right;
    surfaceContext.fill();

    sprite = {
      surface,
      x: -half - padding,
      y: -depth - padding,
    };
    voxelSpriteCache.set(cacheKey, sprite);
  }

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(rotation);
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;
  ctx.drawImage(sprite.surface, sprite.x, sprite.y);
  ctx.restore();
}

function drawLoadingLogo() {
  const cx = SCREEN.width / 2;
  const cy = 333;
  const outerRx = 128.5;
  const outerRy = 129.5;
  const innerRx = 113;
  const innerRy = 114;
  ctx.save();
  ctx.shadowColor = '#082d5570';
  ctx.shadowBlur = 15;
  ctx.shadowOffsetY = 5;
  ctx.beginPath();
  ctx.ellipse(cx, cy, outerRx, outerRy, 0, 0, Math.PI * 2);
  ctx.ellipse(cx, cy, innerRx, innerRy, 0, 0, Math.PI * 2);
  ctx.fillStyle = gradient(cx, cy - outerRy, cx, cy + outerRy, [
    [0, '#e0e5e8'], [0.12, '#8f9ba4'], [0.3, '#c5cdd2'],
    [0.56, '#68747e'], [0.82, '#bbc4ca'], [1, '#707c86'],
  ]);
  ctx.fill('evenodd');
  ctx.restore();

  ctx.beginPath();
  ctx.ellipse(cx, cy, outerRx - 1, outerRy - 1, 0, 0, Math.PI * 2);
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = '#d7dfe3';
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(cx, cy, innerRx + 1, innerRy + 1, 0, 0, Math.PI * 2);
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = '#50616d';
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(cx, cy, outerRx - 5, outerRy - 5, 0, Math.PI * 1.08, Math.PI * 1.92);
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#ffffff80';
  ctx.stroke();

  const logoText = (text, y, size, fill, outline, width = 8, scaleX = 1, offsetX = 0) => {
    ctx.save();
    ctx.translate(cx + offsetX, y);
    ctx.scale(scaleX, 1);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `1000 ${size}px "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif`;
    ctx.lineJoin = 'round';
    ctx.lineWidth = width;
    ctx.strokeStyle = '#321d2a';
    ctx.shadowColor = '#071b36';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetY = 8;
    ctx.strokeText(text, 0, 5);
    ctx.shadowColor = 'transparent';
    ctx.strokeStyle = outline;
    ctx.strokeText(text, 0, 0);
    if (Array.isArray(fill)) {
      const face = ctx.createLinearGradient(0, -size * 0.55, 0, size * 0.55);
      fill.forEach(([stop, color]) => face.addColorStop(stop, color));
      ctx.fillStyle = face;
    } else {
      ctx.fillStyle = fill;
    }
    ctx.fillText(text, 0, 0);
    ctx.restore();
  };
  logoText('像素', 251, 59, [[0, '#aaff48'], [0.22, '#72f421'], [0.7, '#44d622'], [1, '#209c2b']], '#155b31', 9, 1.88, 4);
  logoText('方块', 314, 67, [[0, '#ff796b'], [0.24, '#ff4537'], [0.72, '#e92b22'], [1, '#b81418']], '#7f241d', 9, 1.63, 7);
  logoText('大闯关', 390, 89, [[0, '#fffef5'], [0.42, '#fff5df'], [0.78, '#ffdfa5'], [1, '#ffc76a']], '#a64016', 8, 0.86, -2);
  loadingVoxel(198, 216, 46, 'magenta', -0.16);
  loadingVoxel(429, 307, 51, 'green', 0.1);
  loadingVoxel(167, 345, 52, 'blue', -0.12);
}

function drawLoadingBox() {
  if (startupSplashBoxImage.complete && startupSplashBoxImage.naturalWidth > 0) {
    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(startupSplashBoxImage, 140, 660, 310, 295);
    ctx.restore();
    return;
  }

  const left = 201;
  const right = 391;
  const center = 298;
  const backY = 710;
  const rimY = 750;
  const frontY = 802;
  const bottomY = 902;

  ctx.save();
  ctx.shadowColor = '#084f7b65';
  ctx.shadowBlur = 23;
  ctx.shadowOffsetY = 10;
  ctx.beginPath();
  ctx.ellipse(center, 884, 118, 25, 0, 0, Math.PI * 2);
  ctx.fillStyle = '#0751816b';
  ctx.fill();
  ctx.restore();

  ctx.beginPath();
  ctx.moveTo(left + 1, rimY);
  ctx.bezierCurveTo(left + 3, 785, left + 7, 822, left + 14, 845);
  ctx.bezierCurveTo(235, 866, 262, 889, center - 9, bottomY - 2);
  ctx.quadraticCurveTo(center - 2, bottomY + 3, center + 1, bottomY - 3);
  ctx.lineTo(center + 1, frontY);
  ctx.closePath();
  ctx.fillStyle = gradient(left, 0, center, 0, [
    [0, '#ffd619'], [0.42, '#ffc20a'], [0.78, '#f2a600'], [1, '#d88400'],
  ]);
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(center, frontY);
  ctx.lineTo(right - 1, rimY);
  ctx.bezierCurveTo(right - 3, 787, right - 7, 825, right - 15, 846);
  ctx.bezierCurveTo(354, 868, 327, 889, center + 8, bottomY - 2);
  ctx.quadraticCurveTo(center + 2, bottomY + 2, center, bottomY - 3);
  ctx.closePath();
  ctx.fillStyle = gradient(center, 0, right, 0, [
    [0, '#ffc20b'], [0.52, '#f5a800'], [1, '#d98500'],
  ]);
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(left + 1, rimY);
  ctx.quadraticCurveTo(left - 3, rimY - 2, left + 6, rimY - 7);
  ctx.lineTo(center - 7, backY + 2);
  ctx.quadraticCurveTo(center, backY - 1, center + 8, backY + 2);
  ctx.lineTo(right - 4, rimY - 6);
  ctx.quadraticCurveTo(right + 4, rimY - 2, right - 1, rimY + 3);
  ctx.lineTo(center + 4, frontY + 7);
  ctx.quadraticCurveTo(center, frontY + 10, center - 5, frontY + 6);
  ctx.closePath();
  ctx.fillStyle = gradient(0, backY, 0, frontY + 7, [
    [0, '#fff05a'], [0.35, '#ffdb19'], [0.72, '#ffc30a'], [1, '#ec9c00'],
  ]);
  ctx.fill();

  const colors = ['blue', 'orange', 'red', 'green', 'magenta', 'purple', 'yellow'];
  const pile = [
    [265, 714, 21], [294, 704, 22], [324, 711, 21], [348, 723, 20],
    [275, 710, 18], [337, 718, 18],
    [242, 730, 21], [270, 735, 21], [299, 728, 21], [328, 734, 21], [355, 739, 20],
    [238, 741, 18], [296, 739, 18],
    [225, 749, 20], [253, 756, 21], [281, 747, 21], [310, 753, 21], [338, 755, 21], [367, 759, 19],
    [228, 774, 20], [256, 780, 21], [284, 772, 20], [312, 779, 21], [340, 779, 20], [363, 784, 19],
    [378, 767, 18], [298, 766, 18],
    [243, 797, 20], [271, 801, 20], [299, 793, 21], [326, 798, 20], [350, 796, 19], [299, 809, 18],
  ];
  pile.forEach(([x, y, size], index) => loadingVoxel(x, y, size, colors[index % colors.length], ((index % 3) - 1) * 0.07));

  ctx.beginPath();
  ctx.moveTo(left + 4, rimY - 1);
  ctx.quadraticCurveTo(247, 775, center, frontY + 5);
  ctx.quadraticCurveTo(346, 776, right - 3, rimY - 1);
  ctx.strokeStyle = '#fff45a';
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  ctx.stroke();

  const loose = [
    [190, 821, 23, 'green'], [197, 847, 22, 'blue'], [218, 865, 22, 'red'], [237, 887, 22, 'orange'],
    [398, 835, 22, 'magenta'], [372, 858, 23, 'blue'], [403, 875, 22, 'green'],
    [322, 912, 22, 'magenta'], [345, 885, 22, 'purple'],
  ];
  loose.forEach(([x, y, size, color], index) => loadingVoxel(x, y, size, color, ((index % 3) - 1) * 0.08));
}

function drawLoadingScreen(now) {
  ctx.fillStyle = gradient(0, 0, 0, SCREEN.height, [
    [0, '#155fc5'], [0.33, '#1a70c5'], [0.68, '#2089bd'], [1, '#155889'],
  ]);
  ctx.fillRect(0, 0, SCREEN.width, SCREEN.height);
  const glow = ctx.createRadialGradient(298, 775, 18, 298, 775, 520);
  glow.addColorStop(0, '#5bdfffbd');
  glow.addColorStop(0.42, '#40a9d46e');
  glow.addColorStop(1, '#0b4f9c00');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, SCREEN.width, SCREEN.height);
  drawLoadingLogo();
  drawLoadingBox();

  const progress = state.loadingPreview ? 0.82 : Math.min(0.94, 0.18 + (now - state.loadingStartedAt) / loadingScreenDurationMs * 0.72);
  ctx.save();
  ctx.shadowColor = '#062d5f88';
  ctx.shadowBlur = 9;
  ctx.shadowOffsetY = 4;
  roundedRect(126, 1064, 370, 44, 22);
  ctx.fillStyle = gradient(0, 1064, 0, 1108, [[0, '#fff4a2'], [0.48, '#f8c329'], [1, '#c67d08']]);
  ctx.fill();
  ctx.restore();
  roundedRect(133, 1070, 356, 32, 16);
  ctx.fillStyle = '#815111';
  ctx.fill();
  roundedRect(138, 1074, 347 * progress, 24, 12);
  ctx.fillStyle = gradient(0, 1074, 0, 1098, [[0, '#fff67a'], [1, '#ffb91d']]);
  ctx.fill();

  ctx.save();
  ctx.shadowColor = '#70430077';
  ctx.shadowBlur = 5;
  ctx.shadowOffsetY = 3;
  roundedRect(441, 1054, 55, 57, 19);
  ctx.fillStyle = gradient(441, 1054, 496, 1111, [[0, '#ffe653'], [0.5, '#ffca20'], [1, '#e99a04']]);
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#b66a09';
  ctx.stroke();
  ctx.restore();
  ctx.fillStyle = '#392516';
  ctx.beginPath();
  ctx.ellipse(458, 1075, 2.2, 3.3, 0, 0, Math.PI * 2);
  ctx.ellipse(478, 1075, 2.2, 3.3, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(468, 1081, 8, 0.18, Math.PI - 0.18);
  ctx.strokeStyle = '#6a3c08';
  ctx.lineWidth = 2;
  ctx.stroke();

  drawText('加载中…', 298, 1037, { size: 24, stroke: '#17243a', lineWidth: 4, shadow: '#071a37', shadowY: 2 });
}

function drawText(text, x, y, options = {}) {
  const {
    size = 32,
    weight = 900,
    fill = '#fff',
    stroke = '#25245a',
    lineWidth = 5,
    align = 'left',
    shadow = '#182850',
    shadowBlur = 2,
    shadowY = 3,
    centerY,
  } = options;
  ctx.save();
  ctx.textAlign = align;
  ctx.font = `${weight} ${size}px "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif`;
  ctx.textBaseline = 'alphabetic';
  ctx.lineJoin = 'round';
  ctx.lineWidth = lineWidth;
  ctx.strokeStyle = stroke;
  ctx.shadowColor = shadow;
  ctx.shadowBlur = shadowBlur;
  ctx.shadowOffsetY = shadowY;
  const metrics = centerY === undefined ? null : ctx.measureText(text);
  const baseline = centerY === undefined
    ? y
    : centerY + (metrics.actualBoundingBoxAscent - metrics.actualBoundingBoxDescent) / 2;
  ctx.strokeText(text, x, baseline);
  ctx.fillStyle = fill;
  ctx.fillText(text, x, baseline);
  ctx.restore();
}

function drawGear(cx, cy) {
  ctx.save();
  ctx.shadowColor = '#214f7f88';
  ctx.shadowBlur = 4;
  ctx.shadowOffsetY = 4;
  const outer = ctx.createRadialGradient(cx - 8, cy - 12, 3, cx, cy, 34);
  outer.addColorStop(0, '#7189ad');
  outer.addColorStop(0.5, '#40577f');
  outer.addColorStop(1, '#28365f');
  ctx.beginPath();
  ctx.arc(cx, cy, 32, 0, Math.PI * 2);
  ctx.fillStyle = outer;
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.strokeStyle = '#8fa8c7';
  ctx.stroke();
  ctx.shadowColor = 'transparent';

  for (let i = 0; i < 8; i += 1) {
    const angle = (Math.PI * 2 * i) / 8;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angle);
    fillRounded(-4.5, -22, 9, 15, 2, '#d8dce0');
    ctx.restore();
  }
  ctx.beginPath();
  ctx.arc(cx, cy, 15, 0, Math.PI * 2);
  ctx.fillStyle = '#d8dce0';
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#566780';
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx, cy, 6.5, 0, Math.PI * 2);
  ctx.fillStyle = '#536783';
  ctx.fill();
  ctx.restore();
}

function drawHeader() {
  drawText(`第${state.game.level}关`, 43, 98, {
    size: state.game.level === 1 ? 28 : 34, fill: '#fff', stroke: '#262452', lineWidth: 6, shadow: '#34305c', shadowY: 2,
  });

  ctx.save();
  ctx.shadowColor = '#1c385e88';
  ctx.shadowBlur = 6;
  ctx.shadowOffsetY = 6;
  roundedRect(206, 48, 184, 70, 34);
  ctx.fillStyle = gradient(0, 48, 0, 118, [[0, '#324779'], [0.25, '#536b9e'], [1, '#384d7b']]);
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.strokeStyle = '#b9e5f1';
  ctx.stroke();
  ctx.restore();
  drawText(formatClock(state.game.timeRemaining), 298, 83, {
    size: 42, align: 'center', centerY: 83, fill: '#fff', stroke: '#2c2942', lineWidth: 7, shadow: '#241f34', shadowY: 3,
  });
  if (state.game.level === 1 && levelOneSettingsGearImage.complete && levelOneSettingsGearImage.naturalWidth > 0) {
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(levelOneSettingsGearImage, 490, 56);
    ctx.restore();
  } else {
    drawGear(523, 86);
  }
}

function drawFramePanel(frame, wall) {
  const { x, y, width, height } = frame;
  const wallBottom = wall.y + wall.height;
  ctx.save();
  ctx.shadowColor = '#2d617e66';
  ctx.shadowBlur = 16;
  ctx.shadowOffsetY = 13;
  roundedRect(x, y, width, height, 60);
  ctx.fillStyle = gradient(0, y, 0, y + height, [
    [0, '#ecfdff'], [0.2, '#a4ddf0'], [0.55, '#76bfe0'], [1, '#4f91b8'],
  ]);
  ctx.fill();
  ctx.restore();

  roundedRect(x + 8, y + 7, width - 17, height - 20, 54);
  ctx.lineWidth = 5;
  ctx.strokeStyle = '#f5ffff';
  ctx.stroke();
  ctx.fillStyle = gradient(0, y + 14, 0, y + height - 14, [
    [0, '#cdefff'], [0.36, '#a7d8ef'], [0.69, '#74b6da'], [1, '#90d1ea'],
  ]);
  ctx.fill();

  roundedRect(wall.x, wall.y, wall.width, wall.height, 43);
  ctx.fillStyle = gradient(0, wall.y, 0, wallBottom, [[0, '#9ed5ee'], [0.66, '#8bc9e5'], [1, '#56a3ce']]);
  ctx.fill();
  ctx.lineWidth = 5;
  ctx.strokeStyle = '#eafaff';
  ctx.stroke();

  roundedRect(x + 25, wallBottom + 1, width - 50, Math.max(30, y + height - wallBottom - 26), 31);
  ctx.fillStyle = gradient(0, wallBottom + 1, 0, y + height - 25, [[0, '#4f9bc7'], [0.18, '#84c3e0'], [1, '#4992be']]);
  ctx.fill();

  ctx.save();
  ctx.globalAlpha = 0.5;
  roundedRect(x + 14, y + 9, width - 28, height - 34, 45);
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#ffffff';
  ctx.stroke();
  ctx.restore();
}

function drawGameFrame() {
  const config = state.game.config;
  if (config.panels) {
    for (const panel of config.panels) drawFramePanel(panel.frame, panel.wall);
    return;
  }
  drawFramePanel(config.frame, config.wall);
  if (state.game.level === 1 && levelOneOpeningPanelImage.complete && levelOneOpeningPanelImage.naturalWidth > 0) {
    // Keep the source frame around the interactive board without copying its
    // recorded trays, tutorial hand, or the device's volume overlay.
    if (!levelOneLiveFrameReady) {
      const frameContext = levelOneLiveFrameCanvas.getContext('2d');
      frameContext.drawImage(levelOneOpeningPanelImage, 0, 0, 563, 300, 0, 0, 563, 300);
      frameContext.drawImage(levelOneOpeningPanelImage, 0, 300, 26, 444, 0, 300, 26, 444);
      frameContext.drawImage(levelOneOpeningPanelImage, 537, 300, 26, 444, 537, 300, 26, 444);
      const fade = frameContext.createLinearGradient(0, 732, 0, 744);
      fade.addColorStop(0, 'rgba(0,0,0,1)');
      fade.addColorStop(1, 'rgba(0,0,0,0)');
      frameContext.globalCompositeOperation = 'destination-in';
      frameContext.fillStyle = fade;
      frameContext.fillRect(0, 0, 563, 744);
      frameContext.globalCompositeOperation = 'source-over';
      levelOneLiveFrameReady = true;
    }
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(levelOneLiveFrameCanvas, 17, 226);
    ctx.restore();
  }
}

function pixelTheme(color) {
  return LEVEL_PIXEL_THEMES[state.game.level]?.[color] ?? COLORS_3D[color];
}

function pixelPalette(color, x, y, height) {
  const theme = pixelTheme(color);
  return gradient(x, y, x, y + height, [[0, theme.light], [0.22, theme.mid], [0.8, theme.mid], [1, theme.dark]]);
}

function getLevelThreePixelTile(color) {
  const cacheKey = `${state.game.level}:${color}`;
  if (levelPixelTileCache.has(cacheKey)) return levelPixelTileCache.get(cacheKey);
  const theme = pixelTheme(color);
  const tile = document.createElement('canvas');
  tile.width = 40;
  tile.height = 40;
  const tileContext = tile.getContext('2d');
  tileContext.fillStyle = theme.deep;
  tileContext.fillRect(0, 0, tile.width, tile.height);
  const inset = 4;
  const face = tileContext.createLinearGradient(inset, 0, tile.width - inset, 0);
  face.addColorStop(0, theme.mid);
  face.addColorStop(0.42, theme.mid);
  face.addColorStop(0.86, theme.light);
  face.addColorStop(1, theme.dark);
  tileContext.fillStyle = face;
  tileContext.fillRect(inset, inset, tile.width - inset * 2, tile.height - inset * 2);

  const top = tileContext.createLinearGradient(inset, 0, tile.width - inset, 0);
  top.addColorStop(0, theme.mid);
  top.addColorStop(0.5, theme.light);
  top.addColorStop(1, theme.light);
  tileContext.fillStyle = top;
  tileContext.fillRect(inset, inset, tile.width - inset * 2, 2);
  tileContext.fillStyle = `${theme.dark}aa`;
  tileContext.fillRect(inset, tile.height - inset - 2, tile.width - inset * 2, 2);
  tileContext.fillStyle = `${theme.light}55`;
  tileContext.fillRect(inset, inset, 1, tile.height - inset * 2);
  levelPixelTileCache.set(cacheKey, tile);
  return tile;
}

function drawPixelCell(x, y, width, height, color, serial) {
  const theme = pixelTheme(color);
  if (state.game.level === 8) {
    const sourceTile = levelEightTileImages[color];
    if (sourceTile?.complete && sourceTile.naturalWidth > 0) {
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(sourceTile, x, y, width, height);
      ctx.restore();
      return;
    }
  }
  if (state.game.level === 3) {
    // Cache each source-like beveled tile and level palette once; the board
    // redraws every animation frame and contains over a thousand cells.
    ctx.drawImage(getLevelThreePixelTile(color), x, y, width, height);
    return;
  }

  const inset = 0.65;
  ctx.fillStyle = theme.deep;
  ctx.fillRect(x, y, width, height);
  ctx.fillStyle = pixelPalette(color, x, y, height);
  ctx.fillRect(x + inset, y + inset, width - inset * 1.5, height - inset * 1.5);

  ctx.beginPath();
  ctx.moveTo(x + 1, y + height - 1);
  ctx.lineTo(x + 1, y + 1);
  ctx.lineTo(x + width - 1, y + 1);
  ctx.strokeStyle = serial % 4 === 0 ? '#ffffff78' : '#ffffff45';
  ctx.lineWidth = 0.8;
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(x + 1, y + height - 1);
  ctx.lineTo(x + width - 1, y + height - 1);
  ctx.lineTo(x + width - 1, y + 1);
  ctx.strokeStyle = `${theme.dark}aa`;
  ctx.lineWidth = 0.9;
  ctx.stroke();
}

function boardMatchesSourceLayout(board) {
  const paint = state.game.config.paint;
  if (typeof paint !== 'function') return false;
  const { cols, rows } = board.rect;
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < cols; column += 1) {
      const sourceCell = paint(column, row);
      const currentCell = state.game.grid[board.cellOffset + row * cols + column];
      if (Boolean(sourceCell) !== Boolean(currentCell)) return false;
      if (sourceCell && (currentCell.color !== sourceCell.color
        || currentCell.targetBucketId !== sourceCell.targetBucketId
        || currentCell.split)) return false;
    }
  }
  return true;
}

function drawPixelWall() {
  for (const board of state.game.grids) {
    const { x, y, width, height, cols, rows } = board.rect;
    if (state.game.level === 1 && levelOneBoardImage.complete && levelOneBoardImage.naturalWidth > 0) {
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(levelOneBoardImage, x, y, width, height);
      ctx.restore();

      for (let row = 0; row < rows; row += 1) {
        const py = y + Math.round(row * height / rows);
        const cellBottom = y + Math.round((row + 1) * height / rows);
        let emptyCellGradient = null;
        for (let column = 0; column < cols; column += 1) {
          const cell = state.game.grid[board.cellOffset + row * cols + column];
          if (cell && !cell.split) continue;
          const px = x + Math.round(column * width / cols);
          const cellRight = x + Math.round((column + 1) * width / cols);
          const cellWidth = cellRight - px;
          const cellHeight = cellBottom - py;
          emptyCellGradient ??= gradient(0, py, 0, cellBottom, [[0, '#438ed6'], [1, '#3784cc']]);
          ctx.fillStyle = emptyCellGradient;
          ctx.fillRect(px, py, cellWidth, cellHeight);
          if (!cell) continue;
          drawPixelCell(px + 0.4, py + 0.4, cellWidth * 0.48, cellHeight * 0.48, cell.color, row * cols + column);
          drawPixelCell(px + cellWidth * 0.52, py + 0.4, cellWidth * 0.48, cellHeight * 0.48, cell.color, row * cols + column + 1);
          drawPixelCell(px + 0.4, py + cellHeight * 0.52, cellWidth * 0.48, cellHeight * 0.48, cell.color, row * cols + column + 2);
          drawPixelCell(px + cellWidth * 0.52, py + cellHeight * 0.52, cellWidth * 0.48, cellHeight * 0.48, cell.color, row * cols + column + 3);
        }
      }
      continue;
    }
    if (state.game.level === 2 && state.levelTwoSourceTimeline
      && levelTwoSourceGameplayVideo.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(levelTwoSourceGameplayVideo, 43, 34, width, height, x, y, width, height);
      ctx.restore();
      continue;
    }
    if (state.game.level === 2 && levelTwoBoardImage.complete && levelTwoBoardImage.naturalWidth > 0) {
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(levelTwoBoardImage, x, y, width, height);
      ctx.restore();

      for (let row = 0; row < rows; row += 1) {
        for (let column = 0; column < cols; column += 1) {
          const cell = state.game.grid[board.cellOffset + row * cols + column];
          if (cell && !cell.split) continue;
          const px = x + Math.round(column * width / cols);
          const py = y + Math.round(row * height / rows);
          const cellRight = x + Math.round((column + 1) * width / cols);
          const cellBottom = y + Math.round((row + 1) * height / rows);
          const cellWidth = cellRight - px;
          const cellHeight = cellBottom - py;
          if (levelTwoGameplayBackgroundImage.complete && levelTwoGameplayBackgroundImage.naturalWidth > 0) {
            ctx.drawImage(levelTwoGameplayBackgroundImage, px - 17, py - 310, cellWidth, cellHeight,
              px, py, cellWidth, cellHeight);
          } else {
            ctx.fillStyle = '#347fc3';
            ctx.fillRect(px, py, cellWidth, cellHeight);
          }
          if (cell) drawPixelCell(px + 0.35, py + 0.35, cellWidth - 0.7, cellHeight - 0.7, cell.color, row * cols + column);
        }
      }
      continue;
    }
    if (state.game.level === 3 && levelThreeBoardImage.complete && levelThreeBoardImage.naturalWidth > 0) {
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(levelThreeBoardImage, x, y, width, height);
      ctx.restore();

      for (let row = 0; row < rows; row += 1) {
        for (let column = 0; column < cols; column += 1) {
          const cell = state.game.grid[board.cellOffset + row * cols + column];
          if (cell && !cell.split) continue;
          const px = x + Math.round(column * width / cols);
          const py = y + Math.round(row * height / rows);
          const cellRight = x + Math.round((column + 1) * width / cols);
          const cellBottom = y + Math.round((row + 1) * height / rows);
          const cellWidth = cellRight - px;
          const cellHeight = cellBottom - py;
          ctx.fillStyle = state.game.config.gridBackground ?? '#1765a5';
          ctx.fillRect(px, py, cellWidth, cellHeight);
          if (!cell) continue;
          drawPixelCell(px + 0.4, py + 0.4, cellWidth * 0.48, cellHeight * 0.48, cell.color, row * cols + column);
          drawPixelCell(px + cellWidth * 0.52, py + 0.4, cellWidth * 0.48, cellHeight * 0.48, cell.color, row * cols + column + 1);
          drawPixelCell(px + 0.4, py + cellHeight * 0.52, cellWidth * 0.48, cellHeight * 0.48, cell.color, row * cols + column + 2);
          drawPixelCell(px + cellWidth * 0.52, py + cellHeight * 0.52, cellWidth * 0.48, cellHeight * 0.48, cell.color, row * cols + column + 3);
        }
      }
      continue;
    }
    if (state.game.level === 4 && state.game.moves === 0
      && levelFourBoardCellsImage.complete && levelFourBoardCellsImage.naturalWidth > 0) {
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(levelFourBoardCellsImage, x, y, width, height);
      ctx.restore();

      for (let column = 12; column < 25; column += 1) {
        const cell = state.game.grid[11 * cols + column];
        if (!cell) continue;
        const px = x + Math.round(column * width / cols);
        const py = y + Math.round(11 * height / rows);
        const cellWidth = x + Math.round((column + 1) * width / cols) - px;
        const cellHeight = y + Math.round(12 * height / rows) - py;
        drawPixelCell(px + 0.4, py + 0.4, cellWidth * 0.48, cellHeight * 0.48, cell.color, 11 * cols + column);
        drawPixelCell(px + cellWidth * 0.52, py + 0.4, cellWidth * 0.48, cellHeight * 0.48, cell.color, 11 * cols + column + 1);
        drawPixelCell(px + 0.4, py + cellHeight * 0.52, cellWidth * 0.48, cellHeight * 0.48, cell.color, 11 * cols + column + 2);
        drawPixelCell(px + cellWidth * 0.52, py + cellHeight * 0.52, cellWidth * 0.48, cellHeight * 0.48, cell.color, 11 * cols + column + 3);
      }
      continue;
    }
    if (state.game.level === 5 && levelFiveBoardImage.complete && levelFiveBoardImage.naturalWidth > 0) {
      roundedRect(x - 4, y - 3, width + 8, height + 7, 19);
      ctx.fillStyle = state.game.config.gridBackground ?? '#17436a';
      ctx.fill();
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(levelFiveBoardImage, x, y, width, height);
      ctx.restore();

      for (let row = 0; row < rows; row += 1) {
        for (let column = 0; column < cols; column += 1) {
          const cell = state.game.grid[board.cellOffset + row * cols + column];
          if (cell && !cell.split) continue;
          const px = x + Math.round(column * width / cols);
          const py = y + Math.round(row * height / rows);
          const cellWidth = x + Math.round((column + 1) * width / cols) - px;
          const cellHeight = y + Math.round((row + 1) * height / rows) - py;
          ctx.fillStyle = state.game.config.gridBackground ?? '#17436a';
          ctx.fillRect(px, py, cellWidth, cellHeight);
          if (!cell) continue;
          drawPixelCell(px + 0.4, py + 0.4, cellWidth * 0.48, cellHeight * 0.48, cell.color, row * cols + column);
          drawPixelCell(px + cellWidth * 0.52, py + 0.4, cellWidth * 0.48, cellHeight * 0.48, cell.color, row * cols + column + 1);
          drawPixelCell(px + 0.4, py + cellHeight * 0.52, cellWidth * 0.48, cellHeight * 0.48, cell.color, row * cols + column + 2);
          drawPixelCell(px + cellWidth * 0.52, py + cellHeight * 0.52, cellWidth * 0.48, cellHeight * 0.48, cell.color, row * cols + column + 3);
        }
      }
      continue;
    }
    if (state.game.level === 6 && state.game.moves === 0
      && levelSixBoardImage.complete && levelSixBoardImage.naturalWidth > 0) {
      const startsAtSourcePositions = state.game.buckets.every((bucket) => {
        const source = state.game.config.buckets.find((candidate) => candidate.id === bucket.id);
        return source && bucket.x === source.x && bucket.y === source.y;
      });
      if (startsAtSourcePositions) {
        roundedRect(x - 4, y - 3, width + 8, height + 7, 19);
        ctx.fillStyle = state.game.config.gridBackground ?? '#428dce';
        ctx.fill();
        ctx.save();
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(levelSixBoardImage, x, y, width, height);
        ctx.restore();
        continue;
      }
    }
    if (state.game.level === 7 && state.game.moves === 0
      && levelSevenBoardImage.complete && levelSevenBoardImage.naturalWidth > 0) {
      const startsAtSourcePositions = state.game.buckets.every((bucket) => {
        const source = state.game.config.buckets.find((candidate) => candidate.id === bucket.id);
        return source && bucket.x === source.x && bucket.y === source.y;
      });
      if (startsAtSourcePositions) {
        roundedRect(x - 4, y - 3, width + 8, height + 7, 19);
        ctx.fillStyle = state.game.config.gridBackground ?? '#17436a';
        ctx.fill();
        ctx.save();
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(levelSevenBoardImage, x, y, width, height);
        ctx.restore();
        continue;
      }
    }
    if (state.game.level === 9 && state.game.moves === 0
      && levelNineBoardImage.complete && levelNineBoardImage.naturalWidth > 0) {
      const startsAtSourcePositions = state.game.buckets.every((bucket) => {
        const source = state.game.config.buckets.find((candidate) => candidate.id === bucket.id);
        return source && bucket.x === source.x && bucket.y === source.y;
      });
      if (startsAtSourcePositions) {
        roundedRect(x - 4, y - 3, width + 8, height + 7, 19);
        ctx.fillStyle = state.game.config.gridBackground ?? '#428dce';
        ctx.fill();
        ctx.save();
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(levelNineBoardImage, x, y, width, height);
        ctx.restore();
        continue;
      }
    }
    if (state.game.level === 12 && state.game.moves === 0
      && levelTwelveBoardImage.complete && levelTwelveBoardImage.naturalWidth > 0
      && boardMatchesSourceLayout(board)) {
      const startsAtSourcePositions = state.game.buckets.every((bucket) => {
        const source = state.game.config.buckets.find((candidate) => candidate.id === bucket.id);
        return source && bucket.x === source.x && bucket.y === source.y;
      });
      if (startsAtSourcePositions) {
        roundedRect(x - 4, y - 3, width + 8, height + 7, 19);
        ctx.fillStyle = state.game.config.gridBackground ?? '#428dce';
        ctx.fill();
        ctx.save();
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(levelTwelveBoardImage, x, y, width, height);
        ctx.restore();
        continue;
      }
    }
    if (state.game.level === 13 && state.game.moves === 0
      && levelThirteenBoardImage.complete && levelThirteenBoardImage.naturalWidth > 0) {
      const startsAtSourcePositions = state.game.buckets.every((bucket) => {
        const source = state.game.config.buckets.find((candidate) => candidate.id === bucket.id);
        return source && bucket.x === source.x && bucket.y === source.y;
      });
      if (startsAtSourcePositions && boardMatchesSourceLayout(board)) {
        roundedRect(x - 4, y - 3, width + 8, height + 7, 19);
        ctx.fillStyle = state.game.config.gridBackground ?? '#428dce';
        ctx.fill();
        ctx.save();
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(levelThirteenBoardImage, x, y, width, height);
        ctx.restore();
        continue;
      }
    }
    if (state.game.level === 11) {
      const image = board.id === 'upper' && state.levelElevenSourceBoardImage
        ? state.levelElevenSourceBoardImage
        : levelElevenBoardImages[board.id];
      if (image?.complete && image.naturalWidth > 0) {
        ctx.save();
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(image, x, y, width, height);
        ctx.restore();

        // Preserve the sampled source pixels for every untouched cell. Once a
        // cell is collected, only paint its flat blue backing; redrawing the
        // other ~1,900 cells here created a fresh CanvasGradient per pixel on
        // every animation frame and made the two-board level stutter.
        const clearedCellColor = '#3a8ad7';
        for (let row = 0; row < rows; row += 1) {
          const py = y + Math.round(row * height / rows);
          const cellBottom = y + Math.round((row + 1) * height / rows);
          for (let column = 0; column < cols; column += 1) {
            const cell = state.game.grid[board.cellOffset + row * cols + column];
            if (cell && !cell.split) continue;
            const px = x + Math.round(column * width / cols);
            const cellRight = x + Math.round((column + 1) * width / cols);
            ctx.fillStyle = clearedCellColor;
            ctx.fillRect(px, py, cellRight - px, cellBottom - py);
            if (!cell) continue;

            const cellWidth = cellRight - px;
            const cellHeight = cellBottom - py;
            drawPixelCell(px + 0.4, py + 0.4, cellWidth * 0.48, cellHeight * 0.48, cell.color, row * cols + column);
            drawPixelCell(px + cellWidth * 0.52, py + 0.4, cellWidth * 0.48, cellHeight * 0.48, cell.color, row * cols + column + 1);
            drawPixelCell(px + 0.4, py + cellHeight * 0.52, cellWidth * 0.48, cellHeight * 0.48, cell.color, row * cols + column + 2);
            drawPixelCell(px + cellWidth * 0.52, py + cellHeight * 0.52, cellWidth * 0.48, cellHeight * 0.48, cell.color, row * cols + column + 3);
          }
        }
        continue;
      }
    }
    if (state.game.level === 8 && (state.levelEightSourceBoardImage
      || (levelEightBoardImage.complete && levelEightBoardImage.naturalWidth > 0))) {
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(state.levelEightSourceBoardImage ?? levelEightBoardImage, x, y, width, height);
      ctx.restore();

      const cw = width / cols;
      const ch = height / rows;
      for (let row = 0; row < rows; row += 1) {
        for (let column = 0; column < cols; column += 1) {
          const cell = state.game.grid[board.cellOffset + row * cols + column];
          if (cell && !cell.split) continue;
          const px = x + Math.round(column * width / cols);
          const py = y + Math.round(row * height / rows);
          const cellWidth = x + Math.round((column + 1) * width / cols) - px;
          const cellHeight = y + Math.round((row + 1) * height / rows) - py;
          ctx.fillStyle = state.game.config.gridBackground ?? '#17436a';
          ctx.fillRect(px, py, cellWidth, cellHeight);
          if (!cell) continue;
          drawPixelCell(px + 0.4, py + 0.4, cellWidth * 0.48, cellHeight * 0.48, cell.color, row * cols + column);
          drawPixelCell(px + cellWidth * 0.52, py + 0.4, cellWidth * 0.48, cellHeight * 0.48, cell.color, row * cols + column + 1);
          drawPixelCell(px + 0.4, py + cellHeight * 0.52, cellWidth * 0.48, cellHeight * 0.48, cell.color, row * cols + column + 2);
          drawPixelCell(px + cellWidth * 0.52, py + cellHeight * 0.52, cellWidth * 0.48, cellHeight * 0.48, cell.color, row * cols + column + 3);
        }
      }
      continue;
    }
    if (state.game.level === 10 && levelTenBoardImage.complete && levelTenBoardImage.naturalWidth > 0) {
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(levelTenBoardImage, x, y, width, height);
      for (let row = 0; row < rows; row += 1) {
        for (let column = 0; column < cols; column += 1) {
          const initialCell = state.game.config.paint(column, row);
          if (!initialCell) continue;
          const cell = state.game.grid[board.cellOffset + row * cols + column];
          if (cell && !cell.split && cell.color === initialCell.color) continue;
          const px = x + Math.round(column * width / cols);
          const py = y + Math.round(row * height / rows);
          const cellRight = x + Math.round((column + 1) * width / cols);
          const cellBottom = y + Math.round((row + 1) * height / rows);
          const cellWidth = cellRight - px;
          const cellHeight = cellBottom - py;
          if (levelTenEmptyTileImage.complete && levelTenEmptyTileImage.naturalWidth > 0) {
            ctx.drawImage(levelTenEmptyTileImage, px, py, cellWidth, cellHeight);
          } else {
            ctx.fillStyle = state.game.config.gridBackground ?? '#428dce';
            ctx.fillRect(px, py, cellWidth, cellHeight);
          }
          if (cell) drawPixelCell(px, py, cellWidth, cellHeight, cell.color, row * cols + column);
        }
      }
      ctx.restore();
      continue;
    }

    roundedRect(x - 4, y - 3, width + 8, height + 7, 19);
    ctx.fillStyle = state.game.config.gridBackground ?? '#17436a';
    ctx.fill();
    const cw = width / cols;
    const ch = height / rows;
    for (let row = 0; row < rows; row += 1) {
      for (let column = 0; column < cols; column += 1) {
        const cell = state.game.grid[board.cellOffset + row * cols + column];
        if (!cell) continue;
        const px = x + column * cw;
        const py = y + row * ch;
        if (cell.split) {
          drawPixelCell(px + 0.4, py + 0.4, cw * 0.48, ch * 0.48, cell.color, row * cols + column);
          drawPixelCell(px + cw * 0.52, py + 0.4, cw * 0.48, ch * 0.48, cell.color, row * cols + column + 1);
          drawPixelCell(px + 0.4, py + ch * 0.52, cw * 0.48, ch * 0.48, cell.color, row * cols + column + 2);
          drawPixelCell(px + cw * 0.52, py + ch * 0.52, cw * 0.48, ch * 0.48, cell.color, row * cols + column + 3);
        } else {
          const sourceSizedCell = state.game.level === 8;
          drawPixelCell(px, py, sourceSizedCell ? cw : cw - 0.5, sourceSizedCell ? ch : ch - 0.45, cell.color, row * cols + column);
        }
      }
    }
  }
}

function drawPadTiles(pad) {
  if (state.game.level === 10 && levelTenPadImage.complete && levelTenPadImage.naturalWidth > 0) {
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(levelTenPadImage, 50, 541);
    ctx.restore();
    return;
  }
  const { x, y, cols, rows, cellWidth, cellHeight, gap } = pad;
  const levelThreePad = state.game.level === 3;
  const levelOneSourcePad = state.game.level === 1
    && levelOnePadCellImages.every((image) => image.complete && image.naturalWidth > 0);
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < cols; column += 1) {
      const rowRange = pad.rowRanges?.[row];
      if (rowRange && (column < rowRange[0] || column >= rowRange[1])) continue;
      const px = x + column * (cellWidth + gap);
      const py = y + row * (cellHeight + gap);
      ctx.save();
      ctx.shadowColor = '#2d6284a1';
      ctx.shadowBlur = 6;
      ctx.shadowOffsetY = 4;
      roundedRect(px, py, cellWidth, cellHeight, Math.min(cellWidth, cellHeight) * 0.22);
      ctx.fillStyle = levelThreePad
        ? gradient(px, py, px + cellWidth, py + cellHeight, [
          [0, '#9fc6e1'], [0.18, '#d6efff'], [0.72, '#c3e2f5'], [1, '#8fb7d8'],
        ])
        : gradient(px, py, px, py + cellHeight, [
          [0, (row + column) % 2 ? '#d1edfa' : '#c3e1f1'], [0.5, '#c4e1f2'], [1, '#a9cce3'],
        ]);
      ctx.fill();
      ctx.restore();
      roundedRect(px + 2, py + 2, cellWidth - 4, cellHeight - 4, Math.min(cellWidth, cellHeight) * 0.2);
      ctx.lineWidth = levelThreePad ? 1.25 : 2;
      ctx.strokeStyle = levelThreePad ? '#e9f8ff88' : '#eafaffaa';
      ctx.stroke();
      if (levelThreePad) {
        roundedRect(px + 3.5, py + 3.5, cellWidth - 7, cellHeight - 7, Math.min(cellWidth, cellHeight) * 0.18);
        ctx.lineWidth = 1.1;
        ctx.strokeStyle = '#75a7cb55';
        ctx.stroke();
      }
    }
  }
  if (levelOneSourcePad) {
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    for (let row = 0; row < rows; row += 1) {
      for (let column = 0; column < Math.min(cols, levelOnePadCellImages.length); column += 1) {
        ctx.drawImage(
          levelOnePadCellImages[column],
          x + column * (cellWidth + gap),
          y + row * (cellHeight + gap),
          cellWidth,
          cellHeight,
        );
      }
    }
    ctx.restore();
  }
}

function drawPad() {
  const config = state.game.config;
  if (config.panels) {
    for (const panel of config.panels) drawPadTiles(panel.pad);
    return;
  }
  const levelOneExpandedPad = state.game.level === 1 && state.game.started
    ? { ...config.pad, rows: 4 }
    : config.pad;
  drawPadTiles(levelOneExpandedPad);
  if (config.layout === 'pipes') drawPipeTracks();
}

function syncLevelTwoSourceBucketHitboxes(sourceTime) {
  for (const bucket of state.game.buckets) {
    if (state.dragging && state.game.activeBucketId === bucket.id) continue;
    const sourcePosition = levelTwoRecordedBucketPosition(bucket.color, sourceTime);
    if (!sourcePosition) continue;
    bucket.x = sourcePosition.x;
    bucket.y = sourcePosition.y;
    if (sourcePosition.height) setLevelTwoGreenBucketHeight(bucket, sourcePosition.height);
  }
}

function setLevelTwoGreenBucketHeight(bucket, height) {
  if (bucket.color !== 'green') return;
  const lift = Math.max(0, Math.min(1, (height - 198) / 40));
  bucket.height = height;
  const upper = bucket.segments?.find((segment) => segment.y === 0);
  if (upper) upper.height = Math.max(86, ((height + 4) * 99) / 206);
  const leg = bucket.segments?.find((segment) => segment.y > 0);
  if (leg) leg.height = 153 + (40 * lift);
}

function drawLevelTwoSourceBucket(bucket) {
  const video = levelTwoSourceGameplayVideo;
  if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA || video.seeking) return false;
  const sourcePosition = levelTwoRecordedBucketPosition(bucket.color, video.currentTime);
  if (!sourcePosition) return false;
  const sourceX = sourcePosition.x - 17;
  const sourceY = sourcePosition.y - 310;
  const sourceHeight = sourcePosition.height ?? bucket.height;
  if (sourceX < 0 || sourceY < 0
    || sourceX + bucket.width > video.videoWidth
    || sourceY + sourceHeight > video.videoHeight) return false;

  const shape = new Path2D();
  const segments = bucket.segments?.length
    ? bucket.segments
    : [{ x: 0, y: 0, width: bucket.width, height: bucket.height }];
  for (const segment of segments) {
    const radius = Math.min(27, segment.width * 0.22, segment.height * 0.22);
    shape.roundRect(segment.x, segment.y, segment.width, segment.height, radius);
  }
  ctx.save();
  ctx.translate(bucket.x, bucket.y);
  ctx.clip(shape);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(
    video,
    sourceX,
    sourceY,
    bucket.width,
    sourceHeight,
    0,
    0,
    bucket.width,
    bucket.height,
  );
  ctx.restore();
  return true;
}

function drawLevelTwoSourcePad() {
  const video = levelTwoSourceGameplayVideo;
  const background = levelTwoGameplayBackgroundImage;
  const pad = state.game.config.pad;
  if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA || video.seeking
    || !background.complete || background.naturalWidth === 0) return;
  const width = pad.cols * pad.cellWidth + (pad.cols - 1) * pad.gap;
  const height = pad.rows * pad.cellHeight + (pad.rows - 1) * pad.gap;
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(video, pad.x - 17, pad.y - 310, width, height, pad.x, pad.y, width, height);
  ctx.restore();

  for (const bucket of state.game.buckets) {
    const sourcePosition = levelTwoRecordedBucketPosition(bucket.color, video.currentTime);
    if (!sourcePosition || state.game.activeBucketId !== bucket.id
      || Math.hypot(bucket.x - sourcePosition.x, bucket.y - sourcePosition.y) < 4) continue;
    const shape = new Path2D();
    const segments = bucket.segments?.length
      ? bucket.segments
      : [{ x: 0, y: 0, width: bucket.width, height: bucket.height }];
    for (const segment of segments) {
      const radius = Math.min(27, segment.width * 0.22, segment.height * 0.22);
      shape.roundRect(segment.x, segment.y, segment.width, segment.height, radius);
    }
    ctx.save();
    ctx.translate(sourcePosition.x, sourcePosition.y);
    ctx.clip(shape);
    ctx.drawImage(
      background,
      sourcePosition.x - 17,
      sourcePosition.y - 310,
      bucket.width,
      sourcePosition.height ?? bucket.height,
      0,
      0,
      bucket.width,
      bucket.height,
    );
    ctx.restore();
  }
}

function drawPipeTracks() {
  const channels = state.game.config.pipeChannels;
  const track = state.game.config.pipeTrack ?? { y: 603, height: 485, width: 78, inset: 18 };
  const { y, height, width, inset } = track;
  for (const x of channels) {
    ctx.save();
    ctx.shadowColor = '#27618c77';
    ctx.shadowBlur = 7;
    ctx.shadowOffsetY = 4;
    roundedRect(x, y, width, height, Math.min(36, width / 2));
    ctx.fillStyle = gradient(x, y, x + width, y, [[0, '#87c8e9'], [0.25, '#f7ffff'], [0.6, '#8abde0'], [1, '#4f85bb']]);
    ctx.fill();
    ctx.restore();
    roundedRect(x + inset, y + inset, width - inset * 2, height - inset * 2, Math.max(8, width / 4));
    ctx.fillStyle = gradient(x + inset, 0, x + width - inset, 0, [[0, '#21659b'], [0.5, '#123f75'], [1, '#21659b']]);
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#e7fbff';
    ctx.stroke();
  }
}

function drawBucket(bucket, lockedPreview = false) {
  const { color, x, y, width, height } = bucket;
  const theme = state.game.level === 8
    ? LEVEL_PIXEL_THEMES[8][color] ?? COLORS_3D[color]
    : state.game.level === 4
      ? LEVEL_FOUR_BUCKET_THEMES[color] ?? COLORS_3D[color]
    : COLORS_3D[color];
  const progress = getProgress(state.game, bucket);
  const useLevelOneGreenAtlas = state.game.level === 1 && color === 'green' && !lockedPreview
    && levelOneGreenBucketAtlasImage.complete && levelOneGreenBucketAtlasImage.naturalWidth > 0;
  const segments = bucket.segments?.length
    ? bucket.segments
    : [{ x: 0, y: 0, width, height }];
  const composite = Boolean(bucket.segments?.length);
  const levelTwoBucketAtlas = color === 'green' ? levelTwoGreenBucketAtlasImage : levelTwoRedBucketAtlasImage;
  if (state.game.level === 2 && (color === 'green' || color === 'red') && !lockedPreview
    && !state.levelTwoSourceTimeline
    && levelTwoBucketAtlas.complete
    && levelTwoBucketAtlas.naturalWidth > 0) {
    const frame = Math.max(0, Math.min(100, Math.round(progress)));
    const atlasHeight = color === 'green' ? 206 : 205;
    const mask = color === 'green' ? LEVEL_TWO_GREEN_BUCKET_MASK : LEVEL_TWO_RED_BUCKET_MASK;
    ctx.save();
    // The interaction boundary is the lower edge of the pixel grid.
    ctx.beginPath();
    ctx.rect(0, LEVEL_TWO_DRAG_TOP[color], SCREEN.width, SCREEN.height - LEVEL_TWO_DRAG_TOP[color]);
    ctx.clip();
    ctx.translate(x - (color === 'green' ? 2 : 0), y - 2);
    ctx.scale((width + 7) / 208, (height + 4) / atlasHeight);
    if (state.dragging && state.game.activeBucketId === bucket.id) {
      ctx.lineWidth = 5;
      ctx.strokeStyle = '#fff';
      ctx.lineJoin = 'round';
      ctx.stroke(mask);
    }
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(levelTwoBucketAtlas, (frame % 10) * 208, Math.floor(frame / 10) * atlasHeight,
      208, atlasHeight, 0, 0, 208, atlasHeight);
    // The sampled source frames sometimes have falling cubes over their
    // percentage. Keep the label tied to the player's actual collected count.
    ctx.beginPath();
    ctx.moveTo(132, 0);
    ctx.lineTo(205, 0);
    ctx.lineTo(205, 30);
    ctx.lineTo(142, 30);
    ctx.quadraticCurveTo(132, 30, 132, 20);
    ctx.closePath();
    ctx.fillStyle = color === 'green'
      ? gradient(0, 0, 0, 30, [[0, '#4beb41'], [1, '#39d137']])
      : gradient(0, 0, 0, 30, [[0, '#ff5951'], [1, '#e92f35']]);
    ctx.fill();
    drawText(`${progress}%`, 198, 25, {
      size: 24, align: 'right', fill: '#fff', stroke: '#1a1b24', lineWidth: 5, shadow: '#10131b', shadowY: 1,
    });
    ctx.restore();
    return;
  }
  if (state.game.level === 2 && color === 'yellow' && !lockedPreview
    && !state.levelTwoSourceTimeline
    && levelTwoYellowBucketAtlasImage.complete
    && levelTwoYellowBucketAtlasImage.naturalWidth > 0) {
    const frame = levelTwoYellowAtlasSource(progress);
    const { columns, tile } = LEVEL_TWO_YELLOW_ATLAS;
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(
      levelTwoYellowBucketAtlasImage,
      (frame.progress % columns) * tile.width,
      Math.floor(frame.progress / columns) * tile.height,
      tile.width,
      tile.height,
      x,
      y,
      width,
      height,
    );
    ctx.restore();
    return;
  }
  ctx.save();
  if (state.game.level === 1 && bucket.levelOneExitProgress > 0) {
    const centerX = x + width / 2;
    const centerY = y + height / 2;
    ctx.translate(centerX, centerY + (bucket.levelOneExitDrop ?? 0));
    ctx.scale(bucket.levelOneExitScale ?? 1, bucket.levelOneExitScale ?? 1);
    ctx.translate(-centerX, -centerY);
  }
  ctx.translate(0, y);
  ctx.scale(1, 1);
  ctx.translate(0, -y);

  for (const segment of segments) {
    const sx = x + segment.x;
    const sy = y + segment.y;
    const sw = segment.width;
    const sh = segment.height;
    const radius = Math.min(29, sw * 0.22, sh * 0.22);
    ctx.save();
    ctx.shadowColor = '#28506f77';
    ctx.shadowBlur = 9;
    ctx.shadowOffsetY = 6;
    roundedRect(sx, sy, sw, sh, radius);
    ctx.fillStyle = gradient(x, sy, x + width, sy, [
      [0, theme.dark], [0.16, theme.light], [0.48, theme.mid], [0.84, theme.dark], [1, theme.deep],
    ]);
    ctx.fill();
    if (state.game.level === 1) {
      roundedRect(sx + 3, sy + sh - 31, sw - 6, 30, Math.max(7, radius * 0.55));
      ctx.fillStyle = gradient(0, sy + sh - 31, 0, sy + sh, [[0, theme.dark], [0.35, theme.dark], [1, theme.deep]]);
      ctx.fill();
    }
    ctx.lineWidth = state.game.level === 3 ? 2 : 4;
    ctx.strokeStyle = state.game.level === 3
      ? theme.dark
      : gradient(x, y, x + width, y, [
        [0, theme.dark], [0.16, theme.light], [0.48, theme.mid], [0.84, theme.dark], [1, theme.deep],
      ]);
    ctx.stroke();
    ctx.restore();
  }

  const interiors = segments.map((segment) => {
    const sx = x + segment.x;
    const sy = y + segment.y;
    const sw = segment.width;
    const sh = segment.height;
    const insetX = state.game.level === 1 ? 18 : composite ? 9 : Math.min(15, sw * 0.11);
    const insetTop = state.game.level === 1 ? Math.min(20, sh * 0.09) : composite ? 9 : Math.min(35, sh * 0.15);
    const insetBottom = state.game.level === 1 ? 26 : composite ? 9 : Math.min(17, sh * 0.08);
    return {
      segment: { sx, sy, sw, sh },
      x: sx + insetX,
      y: sy + insetTop,
      width: sw - insetX * 2,
      height: sh - insetTop - insetBottom,
    };
  });

  for (const { segment } of interiors) {
    const { sx, sy, sw, sh } = segment;
    const radius = Math.min(23, sw * 0.2, sh * 0.2);
    roundedRect(sx + 8, sy + 9, sw - 16, sh - 18, Math.max(6, radius - 6));
    ctx.fillStyle = gradient(sx, y + 5, sx, y + height, [
      [0, theme.light], [0.18, theme.mid], [0.55, theme.dark], [1, theme.mid],
    ]);
    ctx.fill();
  }

  const cavities = interiors.filter((cavity) => cavity.width > 4 && cavity.height > 4);

  for (const cavity of cavities) {
    const { x: insetX, y: insetY, width: insetW, height: insetH } = cavity;
    roundedRect(insetX, insetY, insetW, insetH, Math.min(16, insetW * 0.12, insetH * 0.12));
    const levelThreeCavity = state.game.level === 3 ? {
      yellow: ['#423600', '#302900', '#17180a'],
      purple: ['#11134f', '#101641', '#080d29'],
      blue: ['#08354d', '#082a40', '#061d31'],
    }[color] : null;
    const levelFourCavity = state.game.level === 4 ? LEVEL_FOUR_CAVITY_THEMES[color] : null;
    const levelTwoCavity = state.game.level === 2 ? LEVEL_TWO_CAVITY_THEMES[color] : null;
    ctx.fillStyle = gradient(0, insetY, 0, insetY + insetH, levelThreeCavity
      ? [[0, levelThreeCavity[0]], [0.2, levelThreeCavity[0]], [0.52, levelThreeCavity[1]], [1, levelThreeCavity[2]]]
      : levelFourCavity
        ? levelFourCavity
        : levelTwoCavity
          ? levelTwoCavity
          : [[0, theme.deep], [0.2, theme.deep], [0.52, '#38271f'], [1, '#17191e']]);
    ctx.fill();
  }

  const slots = cavities.map((cavity) => {
    const columns = Math.max(3, Math.floor((cavity.width - 12) / 13));
    const rows = Math.max(3, Math.floor((cavity.height - 8) / 13));
    return { cavity, columns, rows, capacity: columns * rows };
  }).sort((a, b) => b.cavity.y - a.cavity.y);
  let remaining = lockedPreview ? 0 : Math.round(slots.reduce((sum, slot) => sum + slot.capacity, 0) * (progress / 100));
  let serial = 0;
  let sourcePileUsed = false;
  {
    let seed = 0;
    seed = state.game.level * 7919;
    for (const character of bucket.id) seed = (seed * 31 + character.charCodeAt(0)) >>> 0;
    const noise = (index, salt) => {
      let value = Math.sin((seed + index * 17 + salt * 113) * 12.9898) * 43758.5453;
      return value - Math.floor(value);
    };

    for (const slot of slots) {
      const { cavity } = slot;
      const count = Math.min(slot.capacity, remaining);
      remaining -= count;
      if (useLevelOneGreenAtlas) continue;
      if (state.game.level === 1 && color === 'yellow' && progress === 100 && !lockedPreview
        && levelOneYellowPileImage.complete && levelOneYellowPileImage.naturalWidth > 0) {
        ctx.save();
        roundedRect(cavity.x, cavity.y, cavity.width, cavity.height, Math.min(16, cavity.width * 0.12, cavity.height * 0.12));
        ctx.clip();
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(levelOneYellowPileImage, cavity.x, cavity.y + 2, cavity.width, levelOneYellowPileImage.naturalHeight);
        ctx.restore();
        sourcePileUsed = true;
        continue;
      }
      const levelTwoPacked = state.game.level === 2;
      const fragmentCount = state.game.level === 1
        ? Math.round(count * 1.45)
        : Math.round(count * (levelTwoPacked ? 1.65 : 3.2));
      const fillHeight = cavity.height * Math.pow(progress / 100, state.game.level === 1 ? 0.16 : 0.22);
      const levelOneRowStep = cavity.height / Math.max(slot.rows, Math.ceil(fragmentCount / slot.columns));
      const pileColumns = levelTwoPacked ? Math.max(8, Math.floor(cavity.width / 14)) : 0;
      const pileRows = levelTwoPacked ? Math.max(5, Math.ceil(fragmentCount / pileColumns)) : 0;
      const pileRowStep = levelTwoPacked ? cavity.height / pileRows : 0;
      const pieces = Array.from({ length: fragmentCount }, (_, index) => {
        const levelOnePacked = state.game.level === 1;
        const levelTwoRow = levelTwoPacked ? Math.floor(index / pileColumns) : 0;
        const levelTwoColumn = levelTwoPacked
          ? (((index % pileColumns) * 7) + (levelTwoRow * 3)) % pileColumns
          : 0;
        const row = Math.floor(index / slot.columns);
        const column = (index * 7 + row * 3) % slot.columns;
        const columnStep = cavity.width / (levelTwoPacked ? pileColumns : slot.columns);
        const rowStep = cavity.height / slot.rows;
        const size = levelOnePacked
          ? Math.min(17, columnStep, rowStep) * (0.94 + noise(index, 1) * 0.25)
          : levelTwoPacked ? 11 + noise(index, 1) * 5 : 7 + noise(index, 1) * 6;
        const heightOffset = noise(index, 3) ** 0.82 * fillHeight;
        const levelTwoMound = levelTwoPacked
          && levelTwoRow >= pileRows - 2
          ? (1 - Math.abs(((levelTwoColumn + 0.5) / pileColumns) * 2 - 1)) * 3
          : 0;
        const x = levelOnePacked
          ? cavity.x + (column + 0.5) * columnStep + (noise(index, 2) - 0.5) * columnStep * 0.4
          : levelTwoPacked
            ? cavity.x + (levelTwoColumn + 0.5) * columnStep
              + (levelTwoRow % 2) * columnStep * 0.46
              + (noise(index, 2) - 0.5) * columnStep * 0.8
            : cavity.x + 4 + noise(index, 2) * (cavity.width - 8);
        const y = levelOnePacked
          ? cavity.y + (row + 0.5) * levelOneRowStep + (noise(index, 3) - 0.5) * levelOneRowStep * 0.4
          : levelTwoPacked
            ? cavity.y + cavity.height - 4 - (levelTwoRow * pileRowStep) - levelTwoMound + (noise(index, 3) - 0.5) * 8
            : cavity.y + cavity.height - 4 - heightOffset;
        return {
          x,
          y,
          size,
          angle: (noise(index, 4) - 0.5) * Math.PI * (levelOnePacked ? 0.55 : levelTwoPacked ? 0.8 : 0.9),
          alpha: (levelOnePacked ? 0.9 : levelTwoPacked ? 0.88 : 0.82)
            + noise(index, 5) * (levelOnePacked ? 0.1 : levelTwoPacked ? 0.12 : 0.18),
          serial: serial++,
        };
      }).sort((a, b) => a.y - b.y);

      ctx.save();
      roundedRect(cavity.x, cavity.y, cavity.width, cavity.height, Math.min(16, cavity.width * 0.12, cavity.height * 0.12));
      ctx.clip();
      for (const piece of pieces) {
        ctx.save();
        ctx.globalAlpha = piece.alpha;
        ctx.shadowColor = `${theme.deep}aa`;
        ctx.shadowBlur = 2;
        if (state.game.level === 8) {
          ctx.translate(piece.x, piece.y);
          ctx.rotate(piece.angle);
          drawPixelCell(-piece.size / 2, -piece.size / 2, piece.size, piece.size, color, piece.serial);
        } else {
          loadingVoxel(piece.x, piece.y, piece.size, color, piece.angle, false, state.game.level === 1 ? LEVEL_ONE_PILE_THEMES[color] : null);
        }
        ctx.restore();
      }
      ctx.restore();
    }
  }

  if (state.game.level === 1 && color === 'yellow' && progress > 0 && progress <= 10 && !lockedPreview && cavities[0]) {
    const cavity = cavities[0];
    ctx.save();
    roundedRect(cavity.x, cavity.y, cavity.width, cavity.height, Math.min(16, cavity.width * 0.12, cavity.height * 0.12));
    ctx.clip();
    loadingVoxel(cavity.x + cavity.width * 0.51, cavity.y + cavity.height * 0.66, 18, color, -0.12, false, LEVEL_ONE_PILE_THEMES[color]);
    ctx.restore();
  }

  if (!lockedPreview && !sourcePileUsed && state.game.level === 4) {
    const labelWidth = Math.max(48, Math.min(68, width * 0.38));
    const labelHeight = 29;
    const labelX = x + width - labelWidth - 2;
    const labelY = y + 3;
    roundedRect(labelX, labelY, labelWidth, labelHeight, Math.min(10, labelHeight * 0.35));
    ctx.fillStyle = gradient(labelX, labelY, labelX, labelY + labelHeight, [
      [0, theme.light], [0.52, theme.mid], [1, theme.dark],
    ]);
    ctx.fill();
    drawText(`${progress}%`, x + width - 8, y + 26, {
      size: Math.max(18, Math.min(26, Math.min(width, height) * 0.16)),
      align: 'right', fill: '#fff', stroke: '#1a1b24', lineWidth: 6, shadow: '#10131b', shadowY: 1,
    });
  } else if (!lockedPreview && !sourcePileUsed) {
    const firstLevelYellowProgress = state.game.level === 1 && color === 'yellow' && progress > 0 && progress < 100;
    const label = firstLevelYellowProgress ? {
      x: width - 24,
      y: 34,
      align: 'right',
    } : bucket.progressLabel ?? {
      x: width - 10,
      y: Math.max(19, Math.min(31, height * 0.44)),
      align: 'right',
    };
    const labelY = label.y;
    drawText(`${progress}%`, x + label.x, y + labelY, {
      size: label.size ?? Math.max(16, Math.min(27, Math.min(width, height) * 0.36)),
      align: label.align, fill: '#fff', stroke: '#1a1b24', lineWidth: 6, shadow: '#10131b', shadowY: 1,
    });
  }
  if (useLevelOneGreenAtlas) {
    const sprite = Math.max(0, Math.min(100, Math.round(progress)));
    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(levelOneGreenBucketAtlasImage, (sprite % 10) * 125, Math.floor(sprite / 10) * 247,
      125, 247, x, y, width, height);
    // Occluding source particles sometimes cover the recorded number; paint
    // the player's actual count over the sampled texture instead.
    drawText(`${progress}%`, x + width - 4, y + 35, {
      size: 27, align: 'right', fill: '#fff', stroke: '#1a1b24', lineWidth: 5, shadow: '#10131b', shadowY: 1,
    });
    ctx.restore();
  }
  ctx.restore();
}

function drawBuckets() {
  const buckets = state.game.level === 2
    ? [...state.game.buckets].sort((left, right) => (
      { green: 0, yellow: 1, red: 2 }[left.color] - { green: 0, yellow: 1, red: 2 }[right.color]
    ))
    : state.game.buckets;
  for (const bucket of buckets) {
    if (!bucket.visible && !bucket.showLocked && state.game.activeBucketId !== bucket.id) continue;
    if (state.game.level === 2 && state.levelTwoSourceTimeline && drawLevelTwoSourceBucket(bucket)) continue;
    if (state.game.level === 10) {
      const image = levelTenBucketImages.get(bucket.id);
      const origin = levelTenBucketOrigins.get(bucket.id);
      const untouched = image?.complete && image.naturalWidth > 0
        && origin && bucket.x === origin.x && bucket.y === origin.y
        && getProgress(state.game, bucket) === 0 && !bucket.showLocked;
      if (untouched) {
        ctx.save();
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(image, bucket.x, bucket.y);
        ctx.restore();
        continue;
      }
    }
    drawBucket(bucket, !bucket.visible);
  }
  const levelTenUntouched = state.game.level === 10 && state.game.buckets.every((bucket) => {
    const origin = levelTenBucketOrigins.get(bucket.id);
    return origin && bucket.x === origin.x && bucket.y === origin.y && getProgress(state.game, bucket) === 0;
  });
  if (levelTenUntouched && levelTenPipeImages.every((image) => image.complete && image.naturalWidth > 0)) {
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    levelTenPipeImages.forEach((image, index) => {
      ctx.drawImage(image, state.game.config.pipeChannels[index], state.game.config.pipeTrack.y);
    });
    ctx.restore();
  }
}

function drawTutorialCard(now) {
  const x = 47;
  const y = 1068;
  const width = 503;
  const height = 136;
  ctx.save();
  ctx.shadowColor = '#564b9c77';
  ctx.shadowBlur = 8;
  ctx.shadowOffsetY = 7;
  roundedRect(x, y, width, height, 25);
  ctx.fillStyle = gradient(0, y, 0, y + height, [[0, '#8477c8'], [0.45, '#6456a5'], [1, '#463c86']]);
  ctx.fill();
  ctx.restore();
  roundedRect(x + 10, y + 9, width - 20, height - 19, 18);
  ctx.fillStyle = gradient(0, y + 10, 0, y + height - 10, [[0, '#fbf5dd'], [0.55, '#f5eee0'], [1, '#ddd7c4']]);
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#fff9e8';
  ctx.stroke();

  const hint = '拖动收集槽来收集像素块';
  const glow = !state.game.started && !prefersReducedMotion.matches ? Math.sin(now / 480) * 1.5 : 0;
  drawText(hint, 298, 1143 + glow, {
    size: 30, align: 'center', fill: '#8b2d19', stroke: '#522013', lineWidth: 5, shadow: '#e8ad56', shadowY: 2,
  });
}

function drawHand(now) {
  if (state.game.started || state.game.status !== 'tutorial') return;
  const bob = prefersReducedMotion.matches ? 0 : Math.sin(now / 300) * 5;
  ctx.save();
  ctx.translate(0, bob + 64);
  ctx.translate(302, 8);
  ctx.scale(0.82, 1);
  ctx.translate(-302, 0);
  ctx.shadowColor = '#28618e70';
  ctx.shadowBlur = 8;
  ctx.shadowOffsetY = 8;
  ctx.save();
  ctx.translate(0, 561);
  ctx.scale(1, 0.9);
  ctx.translate(0, -561);

  ctx.beginPath();
  ctx.moveTo(384, 643);
  ctx.lineTo(350, 626);
  ctx.quadraticCurveTo(343, 623, 339, 616);
  ctx.lineTo(308, 572);
  ctx.quadraticCurveTo(302, 562, 311, 555);
  ctx.quadraticCurveTo(320, 550, 328, 559);
  ctx.lineTo(356, 592);
  ctx.lineTo(349, 579);
  ctx.quadraticCurveTo(344, 568, 353, 564);
  ctx.quadraticCurveTo(362, 560, 369, 571);
  ctx.lineTo(381, 589);
  ctx.lineTo(376, 580);
  ctx.quadraticCurveTo(372, 569, 382, 565);
  ctx.quadraticCurveTo(391, 562, 397, 574);
  ctx.lineTo(409, 593);
  ctx.lineTo(406, 587);
  ctx.quadraticCurveTo(402, 576, 412, 573);
  ctx.quadraticCurveTo(421, 571, 427, 583);
  ctx.lineTo(452, 624);
  ctx.quadraticCurveTo(464, 644, 451, 663);
  ctx.lineTo(437, 682);
  ctx.quadraticCurveTo(428, 694, 409, 687);
  ctx.lineTo(383, 676);
  ctx.quadraticCurveTo(365, 669, 361, 653);
  ctx.closePath();
  ctx.fillStyle = gradient(310, 550, 425, 686, [[0, '#ffffff'], [0.38, '#e7f5ff'], [0.76, '#b1d5f4'], [1, '#76ade2']]);
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.strokeStyle = '#f8ffff';
  ctx.stroke();
  ctx.shadowColor = 'transparent';

  ctx.beginPath();
  ctx.moveTo(355, 604);
  ctx.lineTo(375, 628);
  ctx.moveTo(382, 601);
  ctx.lineTo(400, 627);
  ctx.moveTo(410, 605);
  ctx.lineTo(423, 627);
  ctx.strokeStyle = '#8ebae2';
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.stroke();
  ctx.restore();

  ctx.save();
  ctx.translate(410, 656);
  ctx.rotate(0.38);
  roundedRect(-6, -3, 55, 28, 13);
  ctx.fillStyle = gradient(0, -3, 0, 28, [[0, '#83d8ff'], [0.38, '#198be1'], [1, '#17529b']]);
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#d9f6ff';
  ctx.stroke();
  ctx.restore();
  ctx.restore();
}

function drawParticles(now) {
  const particles = state.game.particles;
  const remaining = [];
  for (const particle of particles) {
    const t = Math.min(1, (now - particle.bornAt) / particle.duration);
    if (t >= 1) continue;
    remaining.push(particle);
    const eased = 1 - (1 - t) ** 3;
    const x = particle.x + (particle.targetX - particle.x) * eased + Math.sin(t * Math.PI * 2 + particle.phase) * 12;
    const y = particle.y + (particle.targetY - particle.y) * eased + Math.sin(t * Math.PI * 4 + particle.phase) * (1 - t) * 7;
    const size = Math.max(3, particle.size * (1 - t * 0.42));
    ctx.save();
    ctx.globalAlpha = 1 - t * 0.42;
    if (state.game.level === 8) {
      ctx.translate(x, y);
      ctx.rotate(particle.phase + t * Math.PI * 2);
      drawPixelCell(-size / 2, -size / 2, size, size, particle.color, particle.serial);
    } else {
      loadingVoxel(x, y, size, particle.color, particle.phase + t * Math.PI * 2, true);
    }
    ctx.restore();
  }
  state.game.particles = remaining;
}

function drawFlyingSaucer(now) {
  if (state.game.level !== 13 || !state.ufoFlight) return;
  const flight = state.ufoFlight;
  const referenceVideoReady = levelThirteenUfoReferenceVideo.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA;
  const elapsed = flight.useRecordedVisual && referenceVideoReady
    ? levelThirteenUfoReferenceVideo.currentTime * 1_000
    : Math.max(0, now - flight.startedAt);
  canvas.dataset.ufoVisualSource = 'procedural';
  if (flight.useRecordedVisual && elapsed >= flight.entryDuration
    && levelThirteenUfoReferenceVideo.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA
    && !levelThirteenUfoReferenceVideo.seeking) {
    // The source recording is cropped to the game viewport (x=0..597,
    // y=165..870). Its first 620 ms contains the recorder's dimmed overlay;
    // start compositing only once that overlay is gone.
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(levelThirteenUfoReferenceVideo, 0, 0, 597, 705, 0, 165, 597, 705);
    ctx.restore();
    canvas.dataset.ufoVisualSource = 'recorded';
    canvas.dataset.ufoVisualTime = levelThirteenUfoReferenceVideo.currentTime.toFixed(4);
    return;
  }
  const entryProgress = Math.min(1, elapsed / flight.entryDuration);
  const travelProgress = Math.max(0, Math.min(1, (elapsed - flight.travelStart) / flight.travelDuration));
  const entryEase = 1 - (1 - entryProgress) ** 3;
  const travelEase = travelProgress * travelProgress * (3 - 2 * travelProgress);
  let cx = flight.hover.x;
  let cy = flight.hover.y;
  let angle = 0;
  let scale = 1.08;
  if (elapsed < flight.entryDuration) {
    cx = flight.entryFrom.x + (flight.hover.x - flight.entryFrom.x) * entryEase;
    cy = flight.entryFrom.y + (flight.hover.y - flight.entryFrom.y) * entryEase;
    scale = 0.96 + entryEase * 0.12;
  } else if (elapsed >= flight.travelStart && elapsed < flight.travelStart + flight.travelDuration) {
    cx = flight.hover.x + (flight.to.x - flight.hover.x) * travelEase;
    cy = flight.hover.y + (flight.to.y - flight.hover.y) * travelEase;
    angle = Math.sin(travelProgress * Math.PI) * 0.2;
  } else if (elapsed >= flight.travelStart + flight.travelDuration) {
    cx = flight.to.x;
    cy = flight.to.y;
  }

  const bob = elapsed >= flight.entryDuration && elapsed < flight.travelStart
    ? Math.sin(now / 285) * 2
    : 0;
  cy += bob;
  const bucket = getBucket(state.game, flight.bucketId);

  if (elapsed >= flight.suctionStart && elapsed < flight.travelStart) {
    const pulse = 0.12 + (Math.sin(now / 105) + 1) * 0.04;
    ctx.save();
    ctx.globalAlpha = pulse;
    ctx.beginPath();
    ctx.moveTo(cx - 50, cy + 24);
    ctx.lineTo(cx - 148, flight.suctionBottom);
    ctx.lineTo(cx + 148, flight.suctionBottom);
    ctx.lineTo(cx + 50, cy + 24);
    ctx.closePath();
    ctx.fillStyle = gradient(0, cy, 0, flight.suctionBottom, [
      [0, '#bda8ff88'], [0.48, '#dce6ff55'], [1, '#fff0a400'],
    ]);
    ctx.fill();

    for (let i = 0; i < flight.suctionTargets.length; i += 1) {
      const target = flight.suctionTargets[i];
      const sway = Math.sin(now / 115 + i * 1.7);
      ctx.globalAlpha = 0.34 + ((sway + 1) / 2) * 0.28;
      ctx.strokeStyle = i % 3 === 0 ? '#fff6c6' : (i % 2 ? '#9272ff' : '#d9e8ff');
      ctx.lineWidth = i % 3 === 0 ? 3 : 2;
      ctx.beginPath();
      ctx.moveTo(cx + (i % 5 - 2) * 19, cy + 32);
      ctx.lineTo(target.x, target.y);
      ctx.stroke();

      const phase = ((elapsed - flight.suctionStart) / 520 + i / flight.suctionTargets.length) % 1;
      const particleX = target.x + (cx - target.x) * phase + Math.sin(now / 70 + i) * 4;
      const particleY = target.y + (cy + 39 - target.y) * phase;
      const size = 5 + (i % 3) * 2;
      ctx.globalAlpha = 0.82;
      ctx.fillStyle = i % 4 === 0 ? '#fff7a6' : '#ffd62c';
      ctx.fillRect(particleX - size / 2, particleY - size / 2, size, size);
      ctx.fillStyle = '#fff8cb';
      ctx.fillRect(particleX - size / 2, particleY - size / 2, Math.max(2, size / 2), 2);
    }
    ctx.restore();
  }

  const fillProgress = Math.max(0, Math.min(1, (elapsed - flight.fillStart) / flight.fillDuration));
  if (bucket && fillProgress > 0) {
    const beamStartY = cy + 55;
    const targetY = bucket.y + 8;
    const targetX = bucket.x + bucket.width / 2;
    ctx.save();
    ctx.globalAlpha = 0.22 + Math.sin(now / 85) * 0.045;
    ctx.beginPath();
    ctx.moveTo(cx - 46, beamStartY);
    ctx.lineTo(targetX - Math.min(75, bucket.width * 0.36), targetY);
    ctx.lineTo(targetX + Math.min(75, bucket.width * 0.36), targetY);
    ctx.lineTo(cx + 46, beamStartY);
    ctx.closePath();
    ctx.fillStyle = gradient(0, beamStartY, 0, targetY, [
      [0, '#ece7ff66'], [0.36, '#fff39a77'], [1, '#fff8a222'],
    ]);
    ctx.fill();

    for (let i = 0; i < 9; i += 1) {
      const phase = ((elapsed - flight.fillStart) / 430 + i / 9) % 1;
      const x = cx + (targetX - cx) * phase + Math.sin(now / 85 + i * 1.9) * (8 + phase * 7);
      const y = beamStartY + (targetY - beamStartY) * phase;
      const size = 5 + (i % 3) * 2;
      ctx.globalAlpha = 0.78 * (1 - phase * 0.15);
      ctx.fillStyle = i % 3 === 0 ? '#fff7a6' : '#ffd52b';
      ctx.fillRect(x - size / 2, y - size / 2, size, size);
      ctx.fillStyle = '#fffbd1';
      ctx.fillRect(x - size / 2, y - size / 2, Math.max(2, size / 2), 2);
    }
    ctx.restore();
  }

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(angle);
  ctx.scale(scale, scale);
  ctx.shadowColor = '#15345288';
  ctx.shadowBlur = 20;
  ctx.shadowOffsetY = 16;
  ctx.beginPath();
  ctx.ellipse(0, 37, 144, 18, 0, 0, Math.PI * 2);
  ctx.fillStyle = '#1d2d4b';
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;

  ctx.beginPath();
  ctx.ellipse(0, 8, 150, 43, 0, 0, Math.PI * 2);
  ctx.fillStyle = gradient(0, -32, 0, 50, [[0, '#ff6f58'], [0.42, '#ef2e28'], [0.78, '#c81427'], [1, '#851129']]);
  ctx.fill();
  ctx.lineWidth = 5;
  ctx.strokeStyle = '#ff9e89';
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(0, 28, 137, 18, 0, 0.08, Math.PI - 0.08);
  ctx.strokeStyle = '#ffc6a9';
  ctx.lineWidth = 4;
  ctx.stroke();

  ctx.beginPath();
  ctx.ellipse(0, -13, 87, 59, 0, Math.PI, Math.PI * 2);
  ctx.lineTo(87, -12);
  ctx.ellipse(0, -12, 87, 20, 0, 0, Math.PI);
  ctx.closePath();
  ctx.fillStyle = gradient(-50, -70, 58, 5, [[0, '#d7f4ffcc'], [0.3, '#72beeddd'], [0.72, '#334f9eee'], [1, '#172f6e']]);
  ctx.fill();
  ctx.lineWidth = 7;
  ctx.strokeStyle = '#455a92';
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(0, 0, 81, 18, 0, 0, Math.PI);
  ctx.strokeStyle = '#b5edff';
  ctx.lineWidth = 3;
  ctx.stroke();

  for (const x of [-102, 0, 102]) {
    ctx.beginPath();
    ctx.ellipse(x, 1, 18, 12, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#198ed4';
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(x, -1, 12, 8, 0, 0, Math.PI * 2);
    ctx.fillStyle = gradient(x, -8, x, 8, [[0, '#fffca1'], [0.55, '#ffda24'], [1, '#f39713']]);
    ctx.fill();
  }
  ctx.beginPath();
  ctx.moveTo(0, -68);
  ctx.lineTo(0, -91);
  ctx.strokeStyle = '#283b69';
  ctx.lineWidth = 7;
  ctx.lineCap = 'round';
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, -97, 13, 0, Math.PI * 2);
  ctx.fillStyle = gradient(-8, -106, 8, -87, [[0, '#fff36d'], [0.5, '#ffca1c'], [1, '#f28a16']]);
  ctx.fill();
  ctx.restore();
}

function addCollectedEffects(cells, now, bucket, { announce = true, playSound = true, createParticles = true } = {}) {
  if (!bucket) return;
  const isLevelTwo = state.game.level === 2;
  const sampleStride = Math.max(1, Math.ceil(cells.length / 200));
  const sampledCells = Math.ceil(cells.length / sampleStride);
  const fragmentsPerCell = Math.min(4, Math.max(1, Math.ceil(240 / Math.max(1, sampledCells))));
  const collectedBeforeBatch = isLevelTwo ? state.game.bucketCollected[bucket.id] - cells.length : 0;
  const bucketTotal = isLevelTwo ? state.game.bucketTotals[bucket.id] : 0;
  if (createParticles) {
    for (let cellIndex = 0; cellIndex < cells.length; cellIndex += sampleStride) {
      const cell = cells[cellIndex];
      const arrivalAt = isLevelTwo && bucketTotal > 0
        ? levelTwoSourceArrivalAt(bucket.color, ((collectedBeforeBatch + cellIndex + 1) / bucketTotal) * 100, bucket.sourceProgressStartedAt)
        : null;
      for (let fragment = 0; fragment < fragmentsPerCell; fragment += 1) {
        const serial = state.particleSerial++;
        const random = (salt) => {
          const value = Math.sin((serial * 17 + salt * 113) * 12.9898) * 43758.5453;
          return value - Math.floor(value);
        };
        state.game.particles.push({
          x: cell.x + (random(1) - 0.5) * 12,
          y: cell.y + (random(2) - 0.5) * 12,
          targetX: bucket.x + bucket.width * (0.12 + random(3) * 0.76),
          targetY: bucket.y + bucket.height * (0.12 + random(4) * 0.2),
          color: state.game.config.acceptMixedColorCells ? bucket.color : cell.color,
          bornAt: now,
          duration: arrivalAt === null
            ? 650 + random(5) * 600
            : Math.max(180, arrivalAt - now),
          phase: random(6) * Math.PI * 2,
          size: 8 + random(7) * 9,
          serial,
        });
      }
    }
  }
  if (cells.length) {
    state.moveCollected += cells.length;
    if (playSound) audio.cue('collect');
    if (announce) {
      const summary = state.game.config.acceptMixedColorCells
        ? `已收集 ${cells.length} 个像素块到${colorName(bucket.color)}收集槽`
        : `已收集 ${cells.length} 个${colorName(bucket.color)}像素块`;
      liveStatus.textContent = `${summary}，进度 ${getProgress(state.game, bucket)}%`;
    }
  }
}

function syncLevelTwoSourceAudio(targetTime, shouldPlay) {
  if (!shouldPlay) {
    levelTwoSourceAudio.pause();
    levelTwoSourceAudio.muted = true;
    return;
  }
  levelTwoSourceAudio.muted = !audio.isUsingSourceMix();
  if (levelTwoSourceAudio.readyState < HTMLMediaElement.HAVE_METADATA || levelTwoSourceAudio.seeking) return;
  const duration = Number.isFinite(levelTwoSourceAudio.duration) ? levelTwoSourceAudio.duration : 9.8;
  const safeTargetTime = Math.max(0, Math.min(duration - 0.01, targetTime));
  if (Math.abs(safeTargetTime - levelTwoSourceAudio.currentTime) > 0.08) {
    levelTwoSourceAudio.pause();
    levelTwoSourceAudio.currentTime = safeTargetTime;
    return;
  }
  if (safeTargetTime < duration - 0.02 && levelTwoSourceAudio.paused) {
    void levelTwoSourceAudio.play().catch(() => {});
  }
}

function resetLevelTwoSourceAudio() {
  levelTwoSourceAudio.pause();
  levelTwoSourceAudio.muted = true;
  if (levelTwoSourceAudio.readyState >= HTMLMediaElement.HAVE_METADATA) {
    levelTwoSourceAudio.currentTime = 0;
  }
}

function syncLevelThreeSourceAudio(targetTime, shouldPlay) {
  if (!shouldPlay || !audio.isUsingSourceMix()) {
    levelThreeSourceAudio.pause();
    levelThreeSourceAudio.muted = true;
    return;
  }
  levelThreeSourceAudio.muted = false;
  if (levelThreeSourceAudio.readyState < HTMLMediaElement.HAVE_METADATA || levelThreeSourceAudio.seeking) return;
  const duration = Number.isFinite(levelThreeSourceAudio.duration)
    ? levelThreeSourceAudio.duration
    : LEVEL_THREE_SOURCE_DURATION_SECONDS;
  const safeTargetTime = Math.max(0, Math.min(duration - 0.01, targetTime));
  if (Math.abs(safeTargetTime - levelThreeSourceAudio.currentTime) > 0.08) {
    levelThreeSourceAudio.pause();
    levelThreeSourceAudio.currentTime = safeTargetTime;
    return;
  }
  if (safeTargetTime < duration - 0.02 && levelThreeSourceAudio.paused) {
    void levelThreeSourceAudio.play().catch(() => {});
  }
}

const LEVEL_THREE_SOURCE_BUCKET_POSITION_TRACKS = {
  purple: [
    [0, 447, 773], [0.25, 436, 621], [0.5, 450, 480], [4.6, 450, 480],
    [4.75, 450, 624], [5.25, 150, 655], [5.5, 150, 680], [7.75, 150, 680],
    [8, 234, 654], [8.25, 367, 462], [8.5, 350, 480], [11.5, 350, 480],
    [11.75, 156, 462], [12, 151, 480], [13.75, 151, 480], [14, 73, 462],
    [14.25, 51, 480], [17.5, 51, 480], [17.75, 361, 462], [18, 350, 480],
    [LEVEL_THREE_SOURCE_DURATION_SECONDS, 350, 480],
  ],
  blue: [
    [0, 149, 872], [1.4, 149, 872], [1.5, 158, 812], [1.75, 118, 505],
    [2, 51, 480], [11, 51, 480], [11.25, 66, 716], [11.5, 67, 774],
    [13, 75, 774], [13.25, 272, 757], [13.5, 255, 774], [14.5, 255, 774],
    [14.75, 244, 609], [15, 255, 480], [16, 255, 480], [16.5, 222, 798],
    [16.75, 155, 872], [18.25, 155, 872], [18.5, 44, 462], [19, 55, 480],
    [20.75, 55, 480], [21, 266, 470], [21.25, 255, 480],
    [LEVEL_THREE_SOURCE_DURATION_SECONDS, 255, 480],
  ],
  yellow: [
    [0, 49, 773], [3.1, 49, 773], [3.25, 234, 708], [3.5, 351, 480],
    [5.9, 351, 480], [6, 449, 480], [12.25, 449, 480], [12.5, 239, 470],
    [12.75, 251, 480], [14.25, 251, 480], [14.5, 151, 480], [16.5, 151, 480],
    [16.75, 345, 462], [17, 345, 462], [17.25, 450, 480], [20, 450, 480],
    [20.25, 339, 585], [20.5, 162, 683], [20.75, 151, 675], [21.25, 151, 675],
    [21.5, 73, 462], [21.75, 51, 480],
    [LEVEL_THREE_SOURCE_DURATION_SECONDS, 51, 480],
  ],
};

const LEVEL_THREE_SOURCE_PROGRESS_TRACKS = {
  purple: [
    [0, 0], [0.9, 0], [1, 1], [1.25, 2], [1.5, 36], [1.75, 45], [2, 48],
    [8, 48], [8.25, 48], [8.5, 48], [8.75, 54], [9, 64], [9.25, 68],
    [11.75, 68], [12.25, 78], [12.5, 89], [12.75, 90], [13, 91], [13.25, 92],
    [18, 92], [18.25, 97], [18.5, 100], [LEVEL_THREE_SOURCE_DURATION_SECONDS, 100],
  ],
  blue: [
    [0, 0], [2.25, 0], [2.5, 4], [2.75, 8], [3, 12], [3.25, 18], [3.5, 22],
    [4, 25], [4.25, 27], [4.5, 28], [4.75, 30], [5, 31], [5.25, 32],
    [5.5, 34], [5.75, 35], [6, 36], [6.25, 38], [6.5, 39], [6.75, 40],
    [7, 41], [7.25, 43], [7.5, 44], [8, 47], [8.25, 48], [8.5, 49],
    [8.75, 51], [9, 52], [9.25, 53], [9.5, 54], [9.75, 55], [10, 56],
    [10.25, 57], [10.5, 58], [12.25, 58], [15, 58], [15.25, 61],
    [15.5, 77], [15.75, 79], [18.5, 79], [19, 87], [19.25, 99],
    [21.25, 99], [21.5, 100], [LEVEL_THREE_SOURCE_DURATION_SECONDS, 100],
  ],
  yellow: [
    [0, 0], [4.1, 0], [4.25, 1], [6.25, 1], [6.5, 9], [12.25, 9],
    [12.5, 9], [12.75, 9], [13, 20], [13.25, 35], [13.5, 50], [13.75, 53],
    [14, 55], [14.25, 56], [14.5, 57], [14.75, 58], [15, 72], [15.25, 73],
    [15.5, 73], [15.75, 74], [16.5, 74], [16.75, 77], [17, 80],
    [17.25, 81], [17.5, 83], [17.75, 90], [20.5, 90], [20.75, 91],
    [21.5, 91], [22, 97], [22.25, 100], [LEVEL_THREE_SOURCE_DURATION_SECONDS, 100],
  ],
};

function sampleLevelThreeSourceTrack(points, sourceTime) {
  if (sourceTime <= points[0][0]) return points[0].slice(1);
  for (let index = 1; index < points.length; index += 1) {
    const [rightTime, ...rightValue] = points[index];
    if (sourceTime > rightTime) continue;
    const [leftTime, ...leftValue] = points[index - 1];
    const amount = (sourceTime - leftTime) / Math.max(0.001, rightTime - leftTime);
    return leftValue.map((value, component) => value + (rightValue[component] - value) * amount);
  }
  return points.at(-1).slice(1);
}

function updateLevelThreeSourceGameState(sourceTime, now) {
  if (!state.levelThreeSourceTimeline?.accepted) return;
  const videoDuration = Number.isFinite(levelThreeSourceGameplayVideo.duration)
    ? levelThreeSourceGameplayVideo.duration
    : LEVEL_THREE_SOURCE_DURATION_SECONDS;
  for (const bucket of state.game.buckets) {
    const [x, y] = sampleLevelThreeSourceTrack(LEVEL_THREE_SOURCE_BUCKET_POSITION_TRACKS[bucket.id], sourceTime);
    if (!state.dragging) {
      bucket.x = x;
      bucket.y = y;
    }

    const [sourceProgress] = sampleLevelThreeSourceTrack(LEVEL_THREE_SOURCE_PROGRESS_TRACKS[bucket.id], sourceTime);
    const total = state.game.bucketTotals[bucket.id];
    let targetCollected = Math.round(total * sourceProgress / 100);
    // The source keeps its final yellow 100% tray and celebratory particles on
    // screen for a short beat before the next transition. Hold one model cell
    // until the source clip ends so the web game does not transition early.
    if (bucket.id === 'yellow' && targetCollected >= total && sourceTime < videoDuration) {
      targetCollected = Math.min(targetCollected, Math.max(0, total - 1));
    }
    const remaining = targetCollected - state.game.bucketCollected[bucket.id];
    if (remaining > 0) {
      const cells = fillBucket(state.game, bucket.id, remaining);
      addCollectedEffects(cells, now, bucket, { announce: false, playSound: false, createParticles: false });
    }
  }
  const summary = state.game.buckets.map((bucket) => `${colorName(bucket.color)} ${getProgress(state.game, bucket)}%`).join('，');
  if (state.levelThreeSourceTimeline.lastSummary !== summary) {
    state.levelThreeSourceTimeline.lastSummary = summary;
    liveStatus.textContent = `收集进度：${summary}`;
  }
  if (typeof window.__levelThreeSourceStateObserver === 'function') {
    window.__levelThreeSourceStateObserver({
      sourceTime,
      videoDuration,
      status: state.game.status,
      remainingCells: state.game.grid.filter(Boolean).length,
      bucketCollected: { ...state.game.bucketCollected },
      bucketTotals: { ...state.game.bucketTotals },
    });
  }
}

function drawLevelThreeSourcePanelFrame() {
  const video = levelThreeSourceGameplayVideo;
  if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA || video.seeking) return;
  drawLevelThreePanelLayer(video, video.videoWidth, video.videoHeight);
}

function drawLevelThreePanelLayer(source, sourceWidth, sourceHeight, cacheKey = null) {
  if (cacheKey === null || cacheKey !== levelThreePanelCacheKey) {
    levelThreePanelContext.save();
    levelThreePanelContext.globalCompositeOperation = 'source-over';
    levelThreePanelContext.globalAlpha = 1;
    levelThreePanelContext.clearRect(0, 0, 554, 820);
    levelThreePanelContext.imageSmoothingEnabled = false;
    levelThreePanelContext.drawImage(source, 0, 0, sourceWidth, sourceHeight, 0, 0, 554, 820);
    levelThreePanelContext.globalCompositeOperation = 'destination-in';
    const lowerEdgeFade = levelThreePanelContext.createLinearGradient(0, 724, 0, 820);
    lowerEdgeFade.addColorStop(0, 'rgba(0, 0, 0, 1)');
    lowerEdgeFade.addColorStop(1, 'rgba(0, 0, 0, 0)');
    levelThreePanelContext.fillStyle = lowerEdgeFade;
    levelThreePanelContext.fillRect(0, 0, 554, 820);
    levelThreePanelContext.restore();
    levelThreePanelCacheKey = cacheKey;
  }
  drawLevelThreePanelComposite();
}

function drawLevelThreePanelComposite() {
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(levelThreePanelCanvas, 22, 162);
  ctx.restore();
}

function scheduleLevelThreeSourceFrameDraw(timeline) {
  const video = levelThreeSourceGameplayVideo;
  if (typeof video.requestVideoFrameCallback !== 'function'
      || timeline.frameCallbackPending
      || state.levelThreeSourceTimeline !== timeline
      || timeline.completed) return;
  timeline.frameCallbackPending = true;
  video.requestVideoFrameCallback((_now, metadata) => {
    timeline.frameCallbackPending = false;
    if (state.levelThreeSourceTimeline !== timeline || timeline.completed) return;
    if (!video.paused && !video.seeking && state.game.status !== 'paused' && !document.hidden) {
      drawLevelThreeSourcePanelFrame();
      if (typeof window.__levelThreeSourceFrameObserver === 'function') {
        window.__levelThreeSourceFrameObserver(metadata);
      }
    }
    scheduleLevelThreeSourceFrameDraw(timeline);
  });
}

function beginLevelThreeSourcePlayback(now) {
  const video = levelThreeSourceGameplayVideo;
  if (state.game.level !== 3 || state.game.moves !== 0) return;
  if (video.readyState >= HTMLMediaElement.HAVE_METADATA && video.currentTime > 0) {
    video.pause();
    video.currentTime = 0;
  }
  const timeline = { startedAt: now, pausedAt: null, seeking: false, accepted: false, completed: false };
  state.levelThreeSourceTimeline = timeline;
  audio.setSourceMixMode(true);
  syncLevelThreeSourceAudio(0, true);
  if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && !video.seeking && video.currentTime < 1 / 120) {
    drawLevelThreeSourcePanelFrame();
    if (typeof window.__levelThreeSourceFrameObserver === 'function') {
      window.__levelThreeSourceFrameObserver({
        mediaTime: video.currentTime,
        presentedFrames: 0,
        initial: true,
      });
    }
  }
  void video.play().catch(() => {});
  scheduleLevelThreeSourceFrameDraw(timeline);
}

function cancelLevelThreeSourcePlayback() {
  state.levelThreeSourceTimeline = null;
  levelThreeSourceGameplayVideo.pause();
  levelThreeSourceAudio.pause();
  levelThreeSourceAudio.muted = true;
  if (levelThreeSourceAudio.readyState >= HTMLMediaElement.HAVE_METADATA) {
    levelThreeSourceAudio.currentTime = 0;
  }
  audio.setSourceMixMode(false);
  if (levelThreeSourceGameplayVideo.readyState >= HTMLMediaElement.HAVE_METADATA) {
    levelThreeSourceGameplayVideo.currentTime = 0;
  }
}

function finishLevelThreeSourcePlayback() {
  const timeline = state.levelThreeSourceTimeline;
  if (!timeline?.completed) return;
  updateLevelThreeSourceGameState(
    levelThreeSourceGameplayVideo.duration || LEVEL_THREE_SOURCE_DURATION_SECONDS,
    performance.now(),
  );
  state.levelThreeSourceTimeline = null;
  levelThreeSourceGameplayVideo.pause();
  levelThreeSourceAudio.pause();
  levelThreeSourceAudio.muted = true;
  if (levelThreeSourceAudio.readyState >= HTMLMediaElement.HAVE_METADATA) {
    levelThreeSourceAudio.currentTime = 0;
  }
  audio.setSourceMixMode(false);
  if (levelThreeSourceGameplayVideo.readyState >= HTMLMediaElement.HAVE_METADATA) {
    levelThreeSourceGameplayVideo.currentTime = 0;
  }
}

const LEVEL_FOUR_SOURCE_PROGRESS_TRACKS = {
  'blue-left': [
    [0.5, 0], [0.75, 0], [1, 87], [1.25, 100], [LEVEL_FOUR_SOURCE_DURATION_SECONDS, 100],
  ],
  'red-top': [
    [0.5, 0], [0.75, 0], [1, 5], [1.25, 9], [1.5, 16], [1.75, 20],
    [2, 23], [2.25, 24], [2.5, 27], [2.75, 29], [3, 30], [3.25, 32],
    [4.75, 32], [5, 34], [5.25, 38], [5.5, 44], [5.75, 48], [6, 50],
    [6.25, 52], [6.5, 55], [6.75, 57], [7, 60], [7.25, 61], [7.5, 63],
    [8, 63], [10.75, 63], [11, 68], [12, 82], [13, 92], [14, 99],
    [14.5, 100], [LEVEL_FOUR_SOURCE_DURATION_SECONDS, 100],
  ],
  'yellow-bottom': [
    [0.5, 0], [4.25, 0], [4.5, 16], [4.75, 38], [5, 62], [5.25, 86],
    [5.5, 100], [LEVEL_FOUR_SOURCE_DURATION_SECONDS, 100],
  ],
  'green-bottom': [
    [0.5, 0], [8.25, 0], [8.5, 2], [8.75, 28], [9, 58], [9.25, 82],
    [9.5, 98], [9.75, 100], [LEVEL_FOUR_SOURCE_DURATION_SECONDS, 100],
  ],
  'blue-right': [
    [0.5, 0], [9.5, 0], [9.75, 0], [10, 34], [10.25, 70], [10.5, 100],
    [LEVEL_FOUR_SOURCE_DURATION_SECONDS, 100],
  ],
  'red-right': [
    [0.5, 0], [10.75, 0], [11, 31], [11.5, 38], [12, 44], [12.5, 47],
    [13, 92], [14, 99], [14.5, 100], [LEVEL_FOUR_SOURCE_DURATION_SECONDS, 100],
  ],
};

const LEVEL_FOUR_SOURCE_BUCKET_POSITION_TRACKS = {
  'red-top': [[0.5, 216, 465], [6.75, 216, 465], [7, 50, 637], [15, 50, 637]],
  'blue-left': [[0.5, 381, 637], [15, 381, 637]],
  'red-right': [[0.5, 381, 801], [10.75, 381, 801], [11, 216, 801], [15, 216, 801]],
  'green-bottom': [[0.5, 50, 637], [8.25, 50, 637], [8.5, 216, 637], [15, 216, 637]],
  'yellow-bottom': [[0.5, 50, 801], [4.25, 50, 801], [4.5, 50, 637], [15, 50, 637]],
  'blue-right': [[0.5, 216, 801], [9.5, 216, 801], [9.75, 381, 637], [15, 381, 637]],
};

function syncLevelFourSourceAudio(targetTime, shouldPlay) {
  if (!shouldPlay || !audio.isUsingSourceMix()) {
    levelFourSourceAudio.pause();
    levelFourSourceAudio.muted = true;
    return;
  }
  levelFourSourceAudio.muted = false;
  if (levelFourSourceAudio.readyState < HTMLMediaElement.HAVE_METADATA || levelFourSourceAudio.seeking) return;
  const duration = Number.isFinite(levelFourSourceAudio.duration)
    ? levelFourSourceAudio.duration
    : LEVEL_FOUR_SOURCE_DURATION_SECONDS;
  const safeTargetTime = Math.max(0, Math.min(duration - 0.01, targetTime));
  if (Math.abs(safeTargetTime - levelFourSourceAudio.currentTime) > 0.08) {
    levelFourSourceAudio.pause();
    levelFourSourceAudio.currentTime = safeTargetTime;
    return;
  }
  if (safeTargetTime < duration - 0.02 && levelFourSourceAudio.paused) {
    void levelFourSourceAudio.play().catch(() => {});
  }
}

function updateLevelFourSourceGameState(sourceTime, now, finishing = false) {
  for (const bucket of state.game.buckets) {
    const positionTrack = LEVEL_FOUR_SOURCE_BUCKET_POSITION_TRACKS[bucket.id];
    const [x, y] = sampleLevelThreeSourceTrack(positionTrack, sourceTime);
    if (!state.dragging) {
      bucket.x = x;
      bucket.y = y;
    }

    const [sourceProgress] = sampleLevelThreeSourceTrack(
      LEVEL_FOUR_SOURCE_PROGRESS_TRACKS[bucket.id],
      sourceTime,
    );
    const total = state.game.bucketTotals[bucket.id];
    let targetCollected = Math.round(total * sourceProgress / 100);
    if (!finishing && bucket.id === 'red-right' && targetCollected >= total) {
      targetCollected = Math.max(0, total - 1);
    }
    const remaining = targetCollected - state.game.bucketCollected[bucket.id];
    if (remaining > 0) {
      const cells = fillBucket(state.game, bucket.id, remaining);
      addCollectedEffects(cells, now, bucket, { announce: false, playSound: false, createParticles: false });
    }
  }

}

function beginLevelFourSourcePlayback(now) {
  const video = levelFourSourceGameplayVideo;
  if (state.game.level !== 4 || state.game.moves !== 0
      || video.readyState < HTMLMediaElement.HAVE_METADATA) return false;
  if (!video.paused) video.pause();
  const timeline = { startedAt: now, pausedAt: null, accepted: true };
  state.levelFourSourceTimeline = timeline;
  video.currentTime = LEVEL_FOUR_SOURCE_START_SECONDS;
  audio.setSourceMixMode(true);
  syncLevelFourSourceAudio(LEVEL_FOUR_SOURCE_START_SECONDS, true);
  return true;
}

function cancelLevelFourSourcePlayback() {
  state.levelFourSourceTimeline = null;
  levelFourSourceGameplayVideo.pause();
  levelFourSourceAudio.pause();
  levelFourSourceAudio.muted = true;
  if (levelFourSourceAudio.readyState >= HTMLMediaElement.HAVE_METADATA) levelFourSourceAudio.currentTime = 0;
  if (levelFourSourceGameplayVideo.readyState >= HTMLMediaElement.HAVE_METADATA) levelFourSourceGameplayVideo.currentTime = 0;
  audio.setSourceMixMode(false);
}

function finishLevelFourSourcePlayback() {
  const timeline = state.levelFourSourceTimeline;
  if (!timeline) return;
  updateLevelFourSourceGameState(LEVEL_FOUR_SOURCE_DURATION_SECONDS, performance.now(), true);
  for (const bucket of state.game.buckets) {
    const remaining = state.game.bucketTotals[bucket.id] - state.game.bucketCollected[bucket.id];
    if (remaining > 0) fillBucket(state.game, bucket.id, remaining);
  }
  state.game.status = 'won';
  state.levelFourSourceTimeline = null;
  levelFourSourceGameplayVideo.pause();
  levelFourSourceAudio.pause();
  levelFourSourceAudio.muted = true;
  if (levelFourSourceAudio.readyState >= HTMLMediaElement.HAVE_METADATA) levelFourSourceAudio.currentTime = 0;
  if (levelFourSourceGameplayVideo.readyState >= HTMLMediaElement.HAVE_METADATA) levelFourSourceGameplayVideo.currentTime = 0;
  audio.setSourceMixMode(false);
}

function advanceLevelFourSourcePlayback(now) {
  const timeline = state.levelFourSourceTimeline;
  const video = levelFourSourceGameplayVideo;
  if (!timeline || state.game.level !== 4) {
    if (!video.paused) video.pause();
    levelFourSourceAudio.pause();
    levelFourSourceAudio.muted = true;
    return;
  }
  if (state.game.status === 'paused' || document.hidden) {
    timeline.pausedAt ??= now;
    if (!video.paused) video.pause();
    syncLevelFourSourceAudio(0, false);
    return;
  }
  if (Number.isFinite(timeline.pausedAt)) timeline.pausedAt = null;
  if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA || video.seeking) return;

  syncLevelFourSourceAudio(video.currentTime, true);
  updateLevelFourSourceGameState(video.currentTime, now);
  if (video.ended || video.currentTime >= LEVEL_FOUR_SOURCE_DURATION_SECONDS - 1 / 60) {
    finishLevelFourSourcePlayback();
  } else if (video.paused) {
    void video.play().catch(() => {});
  }
}

function drawLevelFourSourcePanelFrame() {
  const video = levelFourSourceGameplayVideo;
  if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA || video.seeking) return;
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(video, 0, 0, 563, 706, 17, 285, 563, 706);
  ctx.restore();
}

const LEVEL_FIVE_SOURCE_PROGRESS_TRACKS = {
  blue: [[0, 0], [0.25, 8], [0.5, 27], [0.75, 64], [1, 93], [1.5, 100], [LEVEL_FIVE_SOURCE_DURATION_SECONDS, 100]],
  white: [[0, 0], [0.75, 0], [1, 0], [1.25, 28], [1.5, 76], [1.75, 100], [LEVEL_FIVE_SOURCE_DURATION_SECONDS, 100]],
  magenta: [[0, 0], [2, 0], [2.5, 24], [3, 70], [3.5, 95], [3.75, 99], [5, 99], [5.25, 100], [LEVEL_FIVE_SOURCE_DURATION_SECONDS, 100]],
  green: [[0, 0], [5.5, 0], [6, 0], [6.25, 28], [6.5, 76], [7.25, 100], [LEVEL_FIVE_SOURCE_DURATION_SECONDS, 100]],
  yellow: [[0, 0], [6.5, 0], [6.75, 0], [8.25, 95], [9, 98], [11.5, 98], [11.75, 100], [LEVEL_FIVE_SOURCE_DURATION_SECONDS, 100]],
  red: [[0, 0], [7.25, 0], [8.25, 36], [9.25, 77], [10.25, 99], [13.25, 99], [13.5, 100], [LEVEL_FIVE_SOURCE_DURATION_SECONDS, 100]],
  brown: [[0, 0], [8, 0], [8.25, 0], [9.25, 69], [10.25, 99], [13.5, 99], [13.75, 100], [LEVEL_FIVE_SOURCE_DURATION_SECONDS, 100]],
};

const LEVEL_FIVE_SOURCE_BUCKET_POSITION_TRACKS = {
  blue: [[0, 323, 597], [1.5, 323, 597], [LEVEL_FIVE_SOURCE_DURATION_SECONDS, 323, 597]],
  white: [[0, 482, 747], [0.75, 482, 747], [1.25, 400, 575], [2.5, 400, 575], [3, 482, 747], [LEVEL_FIVE_SOURCE_DURATION_SECONDS, 482, 747]],
  magenta: [[0, 122, 747], [2, 122, 747], [2.5, 247, 598], [4.5, 247, 598], [5.25, 475, 598], [LEVEL_FIVE_SOURCE_DURATION_SECONDS, 475, 598]],
  green: [[0, 338, 747], [4.25, 338, 747], [4.75, 347, 707], [5.75, 50, 607], [7.25, 50, 607], [LEVEL_FIVE_SOURCE_DURATION_SECONDS, 50, 607]],
  yellow: [[0, 194, 747], [6.5, 194, 747], [7.25, 120, 599], [10.5, 120, 599], [11.25, 120, 590], [LEVEL_FIVE_SOURCE_DURATION_SECONDS, 120, 590]],
  red: [[0, 50, 747], [7.25, 50, 747], [8.25, 194, 599], [10, 300, 599], [11.25, 405, 590], [LEVEL_FIVE_SOURCE_DURATION_SECONDS, 405, 590]],
  brown: [[0, 266, 747], [8, 266, 747], [8.25, 452, 580], [10.5, 452, 580], [11.25, 478, 590], [LEVEL_FIVE_SOURCE_DURATION_SECONDS, 478, 590]],
};

function syncLevelFiveSourceAudio(targetTime, shouldPlay) {
  if (!shouldPlay || !audio.isUsingSourceMix()) {
    levelFiveSourceAudio.pause();
    levelFiveSourceAudio.muted = true;
    return;
  }
  levelFiveSourceAudio.muted = false;
  if (levelFiveSourceAudio.readyState < HTMLMediaElement.HAVE_METADATA || levelFiveSourceAudio.seeking) return;
  const duration = Number.isFinite(levelFiveSourceAudio.duration)
    ? levelFiveSourceAudio.duration
    : LEVEL_FIVE_SOURCE_DURATION_SECONDS;
  const safeTargetTime = Math.max(0, Math.min(duration - 0.01, targetTime));
  if (Math.abs(safeTargetTime - levelFiveSourceAudio.currentTime) > 0.08) {
    levelFiveSourceAudio.pause();
    levelFiveSourceAudio.currentTime = safeTargetTime;
    return;
  }
  if (safeTargetTime < duration - 0.02 && levelFiveSourceAudio.paused) {
    void levelFiveSourceAudio.play().catch(() => {});
  }
}

function updateLevelFiveSourceGameState(sourceTime, now, finishing = false) {
  for (const bucket of state.game.buckets) {
    const [x, y] = sampleLevelThreeSourceTrack(LEVEL_FIVE_SOURCE_BUCKET_POSITION_TRACKS[bucket.id], sourceTime);
    if (!state.dragging) {
      bucket.x = x;
      bucket.y = y;
    }
    const [sourceProgress] = sampleLevelThreeSourceTrack(LEVEL_FIVE_SOURCE_PROGRESS_TRACKS[bucket.id], sourceTime);
    const total = state.game.bucketTotals[bucket.id];
    let targetCollected = Math.round(total * sourceProgress / 100);
    if (!finishing && targetCollected >= total && bucket.id === 'brown') targetCollected = Math.max(0, total - 1);
    const remaining = targetCollected - state.game.bucketCollected[bucket.id];
    if (remaining > 0) {
      const cells = fillBucket(state.game, bucket.id, remaining);
      addCollectedEffects(cells, now, bucket, { announce: false, playSound: false, createParticles: false });
    }
  }
}

function beginLevelFiveSourcePlayback() {
  const video = levelFiveSourceGameplayVideo;
  if (state.game.level !== 5 || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) return false;
  video.pause();
  if (video.currentTime > 0) video.currentTime = 0;
  const timeline = { pausedAt: null };
  state.levelFiveSourceTimeline = timeline;
  state.levelFiveSourcePanelReleased = true;
  state.game.started = true;
  audio.setSourceMixMode(true);
  syncLevelFiveSourceAudio(0, true);
  updateLevelFiveSourceGameState(0, performance.now());
  liveStatus.textContent = '正在按原片路线收集七色像素';
  void video.play().catch(() => {});
  return true;
}

function cancelLevelFiveSourcePlayback() {
  state.levelFiveSourceTimeline = null;
  levelFiveSourceGameplayVideo.pause();
  levelFiveSourceAudio.pause();
  levelFiveSourceAudio.muted = true;
  if (levelFiveSourceAudio.readyState >= HTMLMediaElement.HAVE_METADATA) levelFiveSourceAudio.currentTime = 0;
  if (levelFiveSourceGameplayVideo.readyState >= HTMLMediaElement.HAVE_METADATA) levelFiveSourceGameplayVideo.currentTime = 0;
  audio.setSourceMixMode(false);
}

function finishLevelFiveSourcePlayback() {
  if (!state.levelFiveSourceTimeline) return;
  updateLevelFiveSourceGameState(LEVEL_FIVE_SOURCE_DURATION_SECONDS, performance.now(), true);
  for (const bucket of state.game.buckets) {
    const remaining = state.game.bucketTotals[bucket.id] - state.game.bucketCollected[bucket.id];
    if (remaining > 0) fillBucket(state.game, bucket.id, remaining);
  }
  state.game.status = 'won';
  cancelLevelFiveSourcePlayback();
  liveStatus.textContent = '第 5 关完成';
}

function advanceLevelFiveSourcePlayback(now) {
  const timeline = state.levelFiveSourceTimeline;
  const video = levelFiveSourceGameplayVideo;
  if (!timeline || state.game.level !== 5) {
    if (!video.paused) video.pause();
    levelFiveSourceAudio.pause();
    levelFiveSourceAudio.muted = true;
    return;
  }
  if (state.game.status === 'paused' || document.hidden) {
    timeline.pausedAt ??= now;
    if (!video.paused) video.pause();
    syncLevelFiveSourceAudio(0, false);
    return;
  }
  if (Number.isFinite(timeline.pausedAt)) timeline.pausedAt = null;
  if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA || video.seeking) return;
  syncLevelFiveSourceAudio(video.currentTime, true);
  updateLevelFiveSourceGameState(video.currentTime, now);
  if (video.ended || video.currentTime >= LEVEL_FIVE_SOURCE_DURATION_SECONDS - 1 / 30) {
    finishLevelFiveSourcePlayback();
  } else if (video.paused) {
    void video.play().catch(() => {});
  }
}

function drawLevelFiveSourcePanelFrame() {
  const video = levelFiveSourceGameplayVideo;
  if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA || video.seeking) return;
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(video, 0, 0, 539, 551, 29, 375, 539, 551);
  ctx.restore();
}

function getLevelEightSourceClip(clipId) {
  return LEVEL_EIGHT_SOURCE_CLIPS[clipId] ?? null;
}

function getLevelElevenSourceClip(clipId) {
  return LEVEL_ELEVEN_SOURCE_CLIPS[clipId] ?? null;
}

function getLevelElevenPanelVideo() {
  const clipId = state.levelElevenSourceTimeline?.clipId ?? state.levelElevenSourcePanelClip;
  return getLevelElevenSourceClip(clipId)?.video ?? null;
}

function drawLevelElevenSourcePanelFrame(video = getLevelElevenPanelVideo()) {
  if (!video || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA || video.seeking) return;
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(video, 0, 0, video.videoWidth, video.videoHeight, 27, 165, 541, 470);
  ctx.restore();
  const clipId = state.levelElevenSourceTimeline?.clipId ?? state.levelElevenSourcePanelClip;
  const clip = getLevelElevenSourceClip(clipId);
  canvas.dataset.levelElevenSourceClip = clipId;
  canvas.dataset.levelElevenSourceFrame = String(Math.max(0, Math.min((clip?.frames ?? 1) - 1, Math.round(video.currentTime * 60) - 1)));
}

function scheduleLevelElevenSourceFrameDraw(timeline) {
  const video = timeline.video;
  if (typeof video.requestVideoFrameCallback !== 'function'
      || timeline.frameCallbackPending
      || state.levelElevenSourceTimeline !== timeline
      || timeline.completed) return;
  timeline.frameCallbackPending = true;
  video.requestVideoFrameCallback((_now, metadata) => {
    timeline.frameCallbackPending = false;
    if (state.levelElevenSourceTimeline !== timeline || timeline.completed) return;
    if (!video.paused && !video.seeking && state.game.status !== 'paused' && !document.hidden) {
      drawLevelElevenSourcePanelFrame(video);
      if (typeof window.__levelElevenSourceFrameObserver === 'function') {
        window.__levelElevenSourceFrameObserver({ ...metadata, clipId: timeline.clipId });
      }
    }
    scheduleLevelElevenSourceFrameDraw(timeline);
  });
}

function syncLevelElevenSourceAudio(targetTime, shouldPlay, sourceAudio, fallbackDuration) {
  if (!shouldPlay || !audio.isUsingSourceMix()) {
    if (!sourceAudio.paused) sourceAudio.pause();
    if (!sourceAudio.muted) sourceAudio.muted = true;
    return;
  }
  sourceAudio.muted = false;
  if (sourceAudio.readyState < HTMLMediaElement.HAVE_METADATA || sourceAudio.seeking) return;
  const duration = Number.isFinite(sourceAudio.duration) ? sourceAudio.duration : fallbackDuration;
  const target = Math.max(0, Math.min(duration - 0.01, targetTime));
  if (Math.abs(target - sourceAudio.currentTime) > 0.08) {
    sourceAudio.pause();
    sourceAudio.currentTime = target;
    return;
  }
  if (target < duration - 0.02 && sourceAudio.paused) void sourceAudio.play().catch(() => {});
}

function beginLevelElevenSourcePlayback(clipId) {
  const clip = getLevelElevenSourceClip(clipId);
  const bucket = clip && getBucket(state.game, clip.bucketId);
  const expectedMoves = clipId === 'first-purple' ? 0 : 1;
  if (!clip || !bucket || state.game.level !== 11 || state.game.moves !== expectedMoves
      || state.game.activeBucketId !== clip.bucketId
      || clip.video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) return false;

  clip.video.pause();
  clip.audio.pause();
  clip.audio.muted = true;
  clip.video.currentTime = 0;
  if (clip.audio.readyState >= HTMLMediaElement.HAVE_METADATA) clip.audio.currentTime = 0;
  const timeline = {
    clipId,
    video: clip.video,
    audio: clip.audio,
    frames: clip.frames,
    duration: clip.duration,
    bucketId: clip.bucketId,
    pausedAt: null,
    completed: false,
    finishingAtEnd: false,
    frameCallbackPending: false,
  };
  state.levelElevenSourceTimeline = timeline;
  state.levelElevenSourcePanelClip = clipId;
  state.levelElevenSourceBucketId = clip.bucketId;
  state.levelElevenSourcePanelHeld = false;
  state.game.started = true;
  audio.setSourceMixMode(true);
  syncLevelElevenSourceAudio(0, true, clip.audio, clip.duration);
  drawLevelElevenSourcePanelFrame(clip.video);
  if (typeof window.__levelElevenSourceFrameObserver === 'function') {
    window.__levelElevenSourceFrameObserver({ mediaTime: clip.video.currentTime, presentedFrames: 0, initial: true, clipId });
  }
  void clip.video.play().catch(() => {});
  scheduleLevelElevenSourceFrameDraw(timeline);
  liveStatus.textContent = clip.status;
  canvas.dataset.levelElevenSourceHeld = 'false';
  return true;
}

function cancelLevelElevenSourcePlayback() {
  state.levelElevenSourceTimeline = null;
  state.levelElevenSourceCandidate = null;
  state.levelElevenSourcePanelHeld = false;
  state.levelElevenSourcePanelClip = 'first-purple';
  state.levelElevenSourceBucketId = null;
  state.levelElevenSourceBoardImage = null;
  for (const clip of Object.values(LEVEL_ELEVEN_SOURCE_CLIPS)) {
    clip.video.pause();
    clip.audio.pause();
    clip.audio.muted = true;
    if (clip.video.readyState >= HTMLMediaElement.HAVE_METADATA) clip.video.currentTime = 0;
    if (clip.audio.readyState >= HTMLMediaElement.HAVE_METADATA) clip.audio.currentTime = 0;
  }
  audio.setSourceMixMode(false);
}

function finishLevelElevenSourcePlayback() {
  const timeline = state.levelElevenSourceTimeline;
  if (!timeline?.completed) return;
  const bucket = getBucket(state.game, timeline.bucketId);
  if (bucket) {
    fillBucket(state.game, bucket.id);
    bucket.visible = false;
  }
  const sourceBoard = document.createElement('canvas');
  sourceBoard.width = 462;
  sourceBoard.height = 142;
  const boardContext = sourceBoard.getContext('2d', { willReadFrequently: true });
  boardContext.imageSmoothingEnabled = false;
  boardContext.drawImage(timeline.video, 37, 28, 462, 142, 0, 0, 462, 142);
  state.levelElevenSourceBoardImage = sourceBoard;
  state.game.moves = Math.max(state.game.moves, timeline.clipId === 'first-purple' ? 1 : 2);
  canvas.dataset[`progress${timeline.bucketId.replace(/(^|-)(.)/g, (_match, _dash, letter) => letter.toUpperCase())}`]
    = String(bucket ? getProgress(state.game, bucket.id) : 0);
  canvas.dataset.levelElevenRemainingCells = String(state.game.grid.filter(Boolean).length);
  liveStatus.textContent = '已收集紫色像素，进度 100%';
  state.levelElevenSourceTimeline = null;
  state.levelElevenSourcePanelHeld = true;
  state.levelElevenSourcePanelClip = timeline.clipId;
  timeline.video.pause();
  syncLevelElevenSourceAudio(timeline.duration, false, timeline.audio, timeline.duration);
  audio.setSourceMixMode(false);
  canvas.dataset.levelElevenSourceHeld = 'true';
  canvas.dataset.levelElevenSourceClip = timeline.clipId;
}

function finishLevelElevenSourcePlaybackAtLastFrame(timeline) {
  if (timeline.finishingAtEnd || state.levelElevenSourceTimeline !== timeline) return;
  timeline.finishingAtEnd = true;
  const { video, audio: sourceAudio, duration } = timeline;
  const videoDuration = Number.isFinite(video.duration) ? video.duration : duration;
  const lastFrameTime = Math.max(0, Math.min((timeline.frames - 1) / 60, videoDuration - 0.001));
  video.pause();
  syncLevelElevenSourceAudio(duration, false, sourceAudio, duration);
  const finishAtDecodedFrame = () => {
    if (state.levelElevenSourceTimeline !== timeline) return;
    drawLevelElevenSourcePanelFrame(video);
    timeline.completed = true;
    finishLevelElevenSourcePlayback();
  };
  if (!video.seeking && Math.abs(video.currentTime - lastFrameTime) <= (1 / 240)) {
    finishAtDecodedFrame();
    return;
  }
  video.addEventListener('seeked', finishAtDecodedFrame, { once: true });
  video.currentTime = lastFrameTime;
}

function advanceLevelElevenSourcePlayback(now) {
  const timeline = state.levelElevenSourceTimeline;
  if (!timeline) return;
  const { video, audio: sourceAudio, duration } = timeline;
  if (state.game.level !== 11) {
    cancelLevelElevenSourcePlayback();
    return;
  }
  if (state.game.status === 'paused' || document.hidden) {
    timeline.pausedAt ??= now;
    if (!video.paused) video.pause();
    syncLevelElevenSourceAudio(0, false, sourceAudio, duration);
    return;
  }
  timeline.pausedAt = null;
  if (timeline.finishingAtEnd) return;
  if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA || video.seeking) return;
  syncLevelElevenSourceAudio(video.currentTime, !timeline.completed, sourceAudio, duration);
  const videoDuration = Number.isFinite(video.duration) ? video.duration : duration;
  const lastFrameTime = Math.max(0, Math.min(timeline.frames / 60, videoDuration - 0.001));
  if (!timeline.completed && (video.ended || video.currentTime >= lastFrameTime)) {
    finishLevelElevenSourcePlaybackAtLastFrame(timeline);
  } else if (!timeline.completed && video.paused) {
    void video.play().catch(() => {});
  }
  scheduleLevelElevenSourceFrameDraw(timeline);
}

function getLevelEightPanelVideo() {
  const clipId = state.levelEightSourceTimeline?.clipId ?? state.levelEightSourcePanelClip;
  return getLevelEightSourceClip(clipId)?.video ?? null;
}

function drawLevelEightSourcePanelFrame(video = getLevelEightPanelVideo()) {
  if (!video) return;
  if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA || video.seeking) return;
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(video, 0, 0, video.videoWidth, video.videoHeight, 27, 280, 541, 695);
  ctx.restore();
  const clipId = state.levelEightSourceTimeline?.clipId ?? state.levelEightSourcePanelClip;
  const clip = getLevelEightSourceClip(clipId);
  canvas.dataset.levelEightSourceClip = clipId;
  canvas.dataset.levelEightSourceFrame = String(Math.max(0, Math.min((clip?.frames ?? 1) - 1, Math.round(video.currentTime * 60) - 1)));
}

function scheduleLevelEightSourceFrameDraw(timeline) {
  const video = timeline.video;
  if (typeof video.requestVideoFrameCallback !== 'function'
      || timeline.frameCallbackPending
      || state.levelEightSourceTimeline !== timeline
      || timeline.completed) return;
  timeline.frameCallbackPending = true;
  video.requestVideoFrameCallback((_now, metadata) => {
    timeline.frameCallbackPending = false;
    if (state.levelEightSourceTimeline !== timeline || timeline.completed) return;
    if (!video.paused && !video.seeking && state.game.status !== 'paused' && !document.hidden) {
      drawLevelEightSourcePanelFrame(video);
      if (typeof window.__levelEightSourceFrameObserver === 'function') {
        window.__levelEightSourceFrameObserver({ ...metadata, clipId: timeline.clipId });
      }
    }
    scheduleLevelEightSourceFrameDraw(timeline);
  });
}

function syncLevelEightSourceAudio(targetTime, shouldPlay, sourceAudio = levelEightSourceAudio, fallbackDuration = 2.384) {
  if (!shouldPlay || !audio.isUsingSourceMix()) {
    if (!sourceAudio.paused) sourceAudio.pause();
    if (!sourceAudio.muted) sourceAudio.muted = true;
    return;
  }
  sourceAudio.muted = false;
  if (sourceAudio.readyState < HTMLMediaElement.HAVE_METADATA || sourceAudio.seeking) return;
  const duration = Number.isFinite(sourceAudio.duration) ? sourceAudio.duration : fallbackDuration;
  const safeTargetTime = Math.max(0, Math.min(duration - 0.01, targetTime));
  if (Math.abs(safeTargetTime - sourceAudio.currentTime) > 0.08) {
    sourceAudio.pause();
    sourceAudio.currentTime = safeTargetTime;
    return;
  }
  if (safeTargetTime < duration - 0.02 && sourceAudio.paused) {
    void sourceAudio.play().catch(() => {});
  }
}

function beginLevelEightSourcePlayback(clipId, now) {
  const clip = getLevelEightSourceClip(clipId);
  const bucket = clip && getBucket(state.game, clip.bucketId);
  const expectedMoves = clipId === 'first-magenta' ? 0 : 1;
  if (!clip || !bucket || state.game.level !== 8 || state.game.moves !== expectedMoves
      || state.game.activeBucketId !== clip.bucketId
      || clip.video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) return false;

  clip.video.pause();
  clip.audio.pause();
  clip.audio.muted = true;
  clip.video.currentTime = 0;
  if (clip.audio.readyState >= HTMLMediaElement.HAVE_METADATA) clip.audio.currentTime = 0;
  const timeline = { clipId, video: clip.video, audio: clip.audio, frames: clip.frames, duration: clip.duration,
    bucketId: clip.bucketId, pausedAt: null, seeking: false, completed: false };
  state.levelEightSourceTimeline = timeline;
  state.levelEightSourcePanelClip = clipId;
  state.levelEightSourceBucketId = clip.bucketId;
  state.levelEightSourcePanelHeld = false;
  state.game.started = true;
  audio.setSourceMixMode(true);
  syncLevelEightSourceAudio(0, true, clip.audio, clip.duration);
  drawLevelEightSourcePanelFrame(clip.video);
  if (typeof window.__levelEightSourceFrameObserver === 'function') {
    window.__levelEightSourceFrameObserver({ mediaTime: clip.video.currentTime, presentedFrames: 0, initial: true, clipId });
  }
  void clip.video.play().catch(() => {});
  scheduleLevelEightSourceFrameDraw(timeline);
  return true;
}

function cancelLevelEightSourcePlayback() {
  state.levelEightSourceTimeline = null;
  state.levelEightSourceCandidate = null;
  state.levelEightSourcePanelHeld = false;
  state.levelEightSourcePanelClip = 'first-magenta';
  state.levelEightSourceBucketId = null;
  state.levelEightSourceBoardImage = null;
  for (const clip of Object.values(LEVEL_EIGHT_SOURCE_CLIPS)) {
    clip.video.pause();
    clip.audio.pause();
    clip.audio.muted = true;
    if (clip.video.readyState >= HTMLMediaElement.HAVE_METADATA) clip.video.currentTime = 0;
    if (clip.audio.readyState >= HTMLMediaElement.HAVE_METADATA) clip.audio.currentTime = 0;
  }
  audio.setSourceMixMode(false);
}

function finishLevelEightSourcePlayback() {
  const timeline = state.levelEightSourceTimeline;
  if (!timeline?.completed) return;
  const bucket = getBucket(state.game, timeline.bucketId);
  if (timeline.clipId === 'first-magenta') {
    if (bucket) {
      fillBucket(state.game, bucket.id);
      bucket.x = 382;
      bucket.y = 602;
    }
    state.game.moves = Math.max(1, state.game.moves);
    canvas.dataset.progressMagentaTop = String(bucket ? getProgress(state.game, bucket) : 0);
    liveStatus.textContent = '已收集洋红色像素，进度 100%';
  } else {
    if (bucket) fillBucket(state.game, bucket.id);
    const boardImage = document.createElement('canvas');
    boardImage.width = 485;
    boardImage.height = 312;
    const boardContext = boardImage.getContext('2d', { willReadFrequently: true });
    boardContext.imageSmoothingEnabled = false;
    boardContext.drawImage(timeline.video, 31, 29, 485, 312, 0, 0, 485, 312);
    state.levelEightSourceBoardImage = boardImage;
    const magentaTop = getBucket(state.game, 'magenta-top');
    if (magentaTop) magentaTop.visible = false;
    applyLevelEightSecondYellowSourceBoard(state.game);
    state.game.moves = Math.max(2, state.game.moves);
    canvas.dataset.progressMagentaTop = String(getProgress(state.game, 'magenta-top'));
    canvas.dataset.progressYellowMid = String(bucket ? getProgress(state.game, bucket) : 0);
    canvas.dataset.levelEightRemainingCells = String(state.game.grid.filter(Boolean).length);
    liveStatus.textContent = '已收集黄色像素，进度 100%';
  }
  state.levelEightSourceTimeline = null;
  state.levelEightSourcePanelHeld = true;
  state.levelEightSourcePanelClip = timeline.clipId;
  timeline.video.pause();
  syncLevelEightSourceAudio(timeline.duration, false, timeline.audio, timeline.duration);
  audio.setSourceMixMode(false);
  canvas.dataset.levelEightSourceHeld = 'true';
  canvas.dataset.levelEightSourceClip = timeline.clipId;
}

function finishLevelEightSourcePlaybackAtLastFrame(timeline) {
  if (timeline.finishingAtEnd || state.levelEightSourceTimeline !== timeline) return;
  timeline.finishingAtEnd = true;
  const { video, audio: sourceAudio, duration } = timeline;
  const videoDuration = Number.isFinite(video.duration) ? video.duration : duration;
  const lastFrameTime = Math.max(0, Math.min(timeline.frames / 60, videoDuration - 0.001));
  video.pause();
  syncLevelEightSourceAudio(duration, false, sourceAudio, duration);

  const finishAtDecodedFrame = () => {
    if (state.levelEightSourceTimeline !== timeline) return;
    drawLevelEightSourcePanelFrame(video);
    timeline.completed = true;
    finishLevelEightSourcePlayback();
  };

  if (!video.seeking && Math.abs(video.currentTime - lastFrameTime) <= (1 / 240)) {
    finishAtDecodedFrame();
    return;
  }
  video.addEventListener('seeked', finishAtDecodedFrame, { once: true });
  video.currentTime = lastFrameTime;
}

function advanceLevelEightSourcePlayback(now) {
  const timeline = state.levelEightSourceTimeline;
  if (!timeline) return;
  const { video, audio: sourceAudio, duration } = timeline;
  if (state.game.level !== 8) {
    cancelLevelEightSourcePlayback();
    return;
  }
  if (state.game.status === 'paused' || document.hidden) {
    if (!Number.isFinite(timeline.pausedAt)) {
      timeline.pausedAt = now;
      if (!video.paused) video.pause();
      syncLevelEightSourceAudio(0, false, sourceAudio, duration);
    }
    return;
  }
  if (Number.isFinite(timeline.pausedAt)) {
    timeline.pausedAt = null;
  }
  if (timeline.finishingAtEnd) return;
  if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA || video.seeking) return;

  syncLevelEightSourceAudio(video.currentTime, !timeline.completed, sourceAudio, duration);
  const videoDuration = Number.isFinite(video.duration) ? video.duration : duration;
  const lastFrameTime = Math.max(0, Math.min(timeline.frames / 60, videoDuration - 0.001));
  if (!timeline.completed && (video.ended || video.currentTime >= lastFrameTime)) {
    finishLevelEightSourcePlaybackAtLastFrame(timeline);
  } else if (!timeline.completed && video.paused) {
    void video.play().catch(() => {});
  }
  scheduleLevelEightSourceFrameDraw(timeline);
}

function advanceLevelThreeSourcePlayback(now) {
  const timeline = state.levelThreeSourceTimeline;
  const video = levelThreeSourceGameplayVideo;
  if (!timeline || state.game.level !== 3) {
    if (!video.paused) video.pause();
    levelThreeSourceAudio.pause();
    levelThreeSourceAudio.muted = true;
    return;
  }
  if (state.game.status === 'paused' || document.hidden) {
    timeline.pausedAt ??= now;
    if (!video.paused) video.pause();
    syncLevelThreeSourceAudio(0, false);
    return;
  }
  if (Number.isFinite(timeline.pausedAt)) {
    timeline.startedAt += now - timeline.pausedAt;
    timeline.pausedAt = null;
  }
  if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA || video.seeking) return;

  const duration = Number.isFinite(video.duration)
    ? video.duration
    : LEVEL_THREE_SOURCE_DURATION_SECONDS;
  const elapsed = Math.max(0, (now - timeline.startedAt) / 1_000);
  const targetTime = Math.min(duration - (1 / 60), elapsed);
  const drift = targetTime - video.currentTime;
  if (Math.abs(drift) > 0.12 && !timeline.completed) {
    video.pause();
    levelThreeSourceAudio.pause();
    timeline.seeking = true;
    video.addEventListener('seeked', () => {
      if (state.levelThreeSourceTimeline !== timeline) return;
      timeline.seeking = false;
      if (state.game.status !== 'paused' && !document.hidden) void video.play().catch(() => {});
    }, { once: true });
    video.currentTime = targetTime;
    return;
  }
  if (timeline.accepted) {
    syncLevelThreeSourceAudio(video.currentTime, !timeline.completed);
    updateLevelThreeSourceGameState(video.currentTime, now);
  }
  if (!timeline.completed && elapsed >= duration && video.ended) {
    timeline.completed = true;
    updateLevelThreeSourceGameState(duration, now);
    video.pause();
    syncLevelThreeSourceAudio(duration, false);
    audio.setSourceMixMode(false);
  } else if (!timeline.completed && video.paused) {
    void video.play().catch(() => {});
  }
  scheduleLevelThreeSourceFrameDraw(timeline);
}

function advanceLevelTwoSourcePlayback(now) {
  const timeline = state.levelTwoSourceTimeline;
  const video = levelTwoSourceGameplayVideo;
  if (!timeline || state.game.level !== 2) {
    if (!video.paused) video.pause();
    if (!(state.game.level === 2 && state.dragging)) levelTwoSourceAudio.pause();
    return;
  }

  if (state.game.status === 'paused' || document.hidden) {
    timeline.pausedAt ??= now;
    if (!video.paused) video.pause();
    syncLevelTwoSourceAudio(0, false);
    return;
  }
  if (Number.isFinite(timeline.pausedAt)) {
    const pausedDuration = now - timeline.pausedAt;
    timeline.startedAt += pausedDuration;
    for (const bucket of state.game.buckets) {
      if (bucket.sourceCollectionActive && Number.isFinite(bucket.sourceProgressStartedAt)) {
        bucket.sourceProgressStartedAt += pausedDuration;
      }
    }
    timeline.pausedAt = null;
  }
  const duration = Number.isFinite(video.duration) ? video.duration : 8.617;
  const sourceTime = Math.max(0, 0.2 + ((now - timeline.startedAt) / 1_000));
  const pointerMoveGraceMs = 500;
  const hasActiveGesture = (id) => state.dragging
    && state.game.activeBucketId === id
    && (state.dragDistance >= 4 || now - state.dragStartedAt < pointerMoveGraceMs);
  const green = getBucket(state.game, 'green');
  const yellow = getBucket(state.game, 'yellow');
  // The recording contains later player gestures. Stop presenting it before
  // an unrequested gesture would move a tray or erase its pixels on screen.
  if ((sourceTime >= 2.6 && !green.sourceCollectionActive && !hasActiveGesture('green'))
      || (sourceTime >= 4.5 && !yellow.sourceCollectionActive && !hasActiveGesture('yellow'))
      || (sourceTime >= 6.5 && !timeline.yellowRepositionConfirmed && !hasActiveGesture('yellow'))) {
    leaveLevelTwoSourceSequence();
    return;
  }
  const targetTime = Math.min(duration - (1 / 60), sourceTime);
  syncLevelTwoSourceAudio(sourceTime, state.game.status !== 'lost');
  if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA || video.seeking) return;

  const drift = targetTime - video.currentTime;
  if (Math.abs(drift) > 0.08) {
    video.pause();
    timeline.seeking = true;
    const resumeAfterSeek = () => {
      if (state.levelTwoSourceTimeline !== timeline) return;
      timeline.seeking = false;
      if (state.game.level === 2 && state.game.status !== 'paused' && !document.hidden) {
        void video.play().catch(() => {});
      }
    };
    video.addEventListener('seeked', resumeAfterSeek, { once: true });
    video.currentTime = targetTime;
    return;
  }
  if (timeline.seeking) return;
  // The source panel shows buckets moving during the recorded sequence. Keep
  // their hitboxes in the same positions so a real pointer can grab the slot
  // where it is visibly drawn, rather than its stale opening position.
  syncLevelTwoSourceBucketHitboxes(video.currentTime);
  if (video.paused) void video.play().catch(() => {});
}

function advanceLevelTwoCollectionProgress(now) {
  if (state.game.level !== 2 || !state.game.bucketDisplayedCollected
    || state.game.status === 'paused' || document.hidden) return;
  const bucketNames = { red: '红色', green: '绿色', yellow: '黄色' };
  for (const bucket of state.game.buckets) {
    if (!bucket.sourceCollectionActive || !Number.isFinite(bucket.sourceProgressStartedAt)) continue;
    const before = getProgress(state.game, bucket);
    const total = state.game.bucketTotals[bucket.id];
    const displayedBefore = state.game.bucketDisplayedCollected[bucket.id];
    const elapsedMs = Math.max(0, now - bucket.sourceProgressStartedAt);
    if (state.levelTwoSourceTimeline && bucket.color === 'green' && state.game.activeBucketId !== bucket.id) {
      const sourcePosition = levelTwoRecordedBucketPosition('green', levelTwoSourceGameplayVideo.currentTime);
      bucket.x = sourcePosition.x;
      bucket.y = sourcePosition.y;
      setLevelTwoGreenBucketHeight(bucket, sourcePosition.height ?? 198);
    }
    if (state.levelTwoSourceTimeline && bucket.color === 'yellow' && state.game.activeBucketId !== bucket.id) {
      const reposition = Math.max(0, Math.min(1, (elapsedMs - 400) / 600));
      bucket.y = 520 + 10 * reposition;
    }
    let remaining;
    let acceptsCell = () => true;
    if (state.levelTwoSourceTimeline) {
      const sourceProgress = levelTwoSourceProgressAt(bucket.color, elapsedMs);
      const targetCollected = Math.min(total, Math.round(total * sourceProgress / 100));
      remaining = targetCollected - state.game.bucketCollected[bucket.id];
    } else {
      // In the recording the tray rests at the bottom of the wall and only
      // pixels above its opening fall into it. The free route uses that same
      // boundary; the unobserved rate is an approximation of the source.
      const delta = Math.min(50, Math.max(0, now - (bucket.freeCollectionAt ?? now)));
      bucket.freeCollectionAt = now;
      const atWallEdge = bucket.y <= LEVEL_TWO_DOCK_ZONE_BOTTOM;
      acceptsCell = (cell) => cell.x >= bucket.x - 5 && cell.x <= bucket.x + bucket.width + 5;
      const hasPixelsAbove = atWallEdge && state.game.grid.some((cell) => cell
        && cell.targetBucketId === bucket.id && acceptsCell(cell));
      const duration = { green: 1200, red: 5700, yellow: 3100 }[bucket.color];
      bucket.freeCollectionCredit = hasPixelsAbove
        ? (bucket.freeCollectionCredit ?? 0) + total * delta / duration
        : 0;
      remaining = Math.floor(bucket.freeCollectionCredit);
    }
    if (remaining > 0) {
      const cells = fillBucket(state.game, bucket.id, remaining, acceptsCell, { bottomUp: !state.levelTwoSourceTimeline });
      if (!state.levelTwoSourceTimeline) bucket.freeCollectionCredit -= cells.length;
      state.moveCollected += cells.length;
      addCollectedEffects(cells, now, bucket, { createParticles: !state.levelTwoSourceTimeline });
    }
    const selected = state.game.bucketCollected[bucket.id];
    const anchor = bucket.freeProgressAnchor;
    const remainingAtTakeover = anchor ? total - anchor.collected : 0;
    const displayCandidate = anchor && remainingAtTakeover > 0
      ? anchor.displayed + ((selected - anchor.collected) / remainingAtTakeover) * (total - anchor.displayed)
      : selected;
    // fillBucket updates the logical cell count too. Keep the visible label
    // continuous when a source frame and our cell model differ in density.
    state.game.bucketDisplayedCollected[bucket.id] = Math.min(total, Math.max(displayedBefore, displayCandidate));
    const progress = getProgress(state.game, bucket);
    const milestone = LEVEL_TWO_COLLECTION_ANNOUNCEMENTS[bucket.color]?.find((value) => (
      before < value && progress >= value && value !== bucket.lastAnnouncedSourceProgress
    ));
    if (milestone !== undefined) {
      bucket.lastAnnouncedSourceProgress = milestone;
      const summary = state.game.buckets.map((candidate) => (
        `${bucketNames[candidate.color] ?? candidate.color} ${getProgress(state.game, candidate)}%`
      )).join('，');
      liveStatus.textContent = `收集进度：${summary}`;
    }
    if (progress >= 100 && selected >= total && !bucket.completeAt) bucket.completeAt = now;
  }

  const allCellsGone = state.game.grid.every((cell) => cell === null);
  const everyBucketArrived = state.game.buckets.every((bucket) => (
    state.game.bucketDisplayedCollected[bucket.id] >= state.game.bucketTotals[bucket.id]
  ));
  if (allCellsGone && everyBucketArrived) state.game.status = 'won';
}

const LEVEL_ONE_SOURCE_SEGMENTS = {
  yellow: { start: 0, end: 2.0 },
  green: { start: 2.5, end: 4.0 },
  // Red reaches the wall after its tray has risen while green is clearing.
  // At this source frame green is nearly full and red is still at 0%; about
  // 217 ms later both match the source's green 100% / red 34% frame.
  red: { start: 3.783, end: 5.95 },
};

// The source recording reaches the wall about half a second after the yellow
// and green sweep segments begin. The red segment starts on its first visible
// progress frame, so it has no lead-in.
const LEVEL_ONE_SOURCE_DRAG_LEADS_MS = { yellow: 500, green: 500, red: 0 };

const LEVEL_ONE_PROGRESS_STOPS = {
  yellow: [[0.06, 1_000], [0.36, 1_200], [0.63, 1_400], [0.99, 1_700], [1, 2_000]],
  green: [[0.25, 750], [0.48, 900], [0.71, 1_050], [0.85, 1_200], [0.99, 1_350], [1, 1_500]],
  red: [[0.34, 217], [0.64, 417], [0.77, 517], [0.92, 717], [1, 917]],
};

// Yellow rows clear from top to bottom in the source recording. These times
// are relative to its 00:02.3 opening frame, where the source animation starts.
const LEVEL_ONE_YELLOW_ROW_LAUNCH_MS = [
  567, 600, 650, 683, 717, 767, 783, 850, 900, 983, 1_033, 1_033, 1_050, 1_317, 1_417, 1_467, 1_517,
];

function levelOneSourceSegment(color) {
  return LEVEL_ONE_SOURCE_SEGMENTS[color] ?? null;
}

function scheduleLevelOneSourceFrameDraw(timeline) {
  if (timeline.sourceFrameDrawPending
      || state.levelOneSourceTimeline !== timeline
      || timeline.completed) return;
  timeline.sourceFrameDrawPending = true;
  const onFrame = (_now, metadata = {}) => {
    timeline.sourceFrameDrawPending = false;
    if (state.levelOneSourceTimeline !== timeline || timeline.completed) return;
    const presentedAndPlayable = !levelOneSourceVideo.paused && !levelOneSourceVideo.seeking
      && state.game.status !== 'paused' && !document.hidden;
    if (!presentedAndPlayable) {
      timeline.awaitingSourceFrame = true;
      scheduleLevelOneSourceFrameDraw(timeline);
      return;
    }
    // Queue the next source callback before the canvas work and any test probe
    // reads, so a slow frame comparison cannot halve the media callback rate.
    scheduleLevelOneSourceFrameDraw(timeline);
    requestAnimationFrame(() => {
      if (state.levelOneSourceTimeline === timeline && !timeline.completed
          && !levelOneSourceVideo.paused && !levelOneSourceVideo.seeking
          && state.game.status !== 'paused' && !document.hidden
          && captureLevelOneSourcePresentedFrame(levelOneSourceVideo.currentTime)) {
        // Capture one decoded frame and use that same bitmap for both the
        // visible canvas and source-alignment probes. Reading the video twice
        // around its compositor refresh can otherwise pair adjacent frames.
        if (!timeline.sourceFramePresented) {
          const sourceElapsedMs = Math.max(0, (levelOneSourcePresentedFrameTime - timeline.start) * 1_000);
          timeline.sweep.startedAt = performance.now() - sourceElapsedMs;
          timeline.sourceFramePresented = true;
          timeline.mediaPauseStartedAt = null;
        }
        timeline.lastPresentedAt = performance.now();
        drawLevelOneSourceFrameToCanvas();
        timeline.awaitingSourceFrame = false;
        if (typeof window.__levelOneSourceFrameObserver === 'function') {
          window.__levelOneSourceFrameObserver({
            ...metadata,
            mediaTime: levelOneSourcePresentedFrameTime,
          });
        }
      }
    });
  };
  if (typeof levelOneSourceVideo.requestVideoFrameCallback === 'function') {
    levelOneSourceVideo.requestVideoFrameCallback(onFrame);
  } else {
    // Some embedded browsers do not expose video-frame callbacks. Sample the
    // playing video on the ordinary render clock instead of waiting forever.
    requestAnimationFrame(now => onFrame(now, { mediaTime: levelOneSourceVideo.currentTime }));
  }
}

function fallbackLevelOneSourceTimeline(timeline, now) {
  if (state.levelOneSourceTimeline !== timeline || timeline.completed) return;
  if (timeline.mediaPauseStartedAt !== null) {
    timeline.sweep.startedAt += now - timeline.mediaPauseStartedAt;
    timeline.mediaPauseStartedAt = null;
  } else if (!timeline.sourceFramePresented) {
    timeline.sweep.startedAt += now - timeline.watchdogStartedAt;
  }
  timeline.fallback = true;
  timeline.completed = true;
  timeline.videoPlayPending = false;
  levelOneSourceVideo.pause();
  levelOneSourceAudio.pause();
  audio.setSourceMixMode(false);
  if (state.levelOneWonPending) {
    state.game.status = 'won';
    state.levelOneWonPending = false;
  }
}

function completeLevelOneSourceTimeline(timeline) {
  if (state.levelOneSourceTimeline !== timeline || timeline.completed) return;
  if (!levelOneSourceVideo.seeking
      && captureLevelOneSourcePresentedFrame(levelOneSourceVideo.currentTime)) {
    drawLevelOneSourceFrameToCanvas();
  }
  timeline.completed = true;
  timeline.videoPlayPending = false;
  levelOneSourceVideo.pause();
  levelOneSourceAudio.pause();
  if (state.levelOneWonPending) {
    state.game.status = 'won';
    state.levelOneWonPending = false;
  }
}

function requestLevelOneSourceVideoPlayback(timeline) {
  if (state.levelOneSourceTimeline !== timeline || timeline.completed
      || state.game.status === 'paused' || document.hidden
      || levelOneSourceVideo.seeking || !levelOneSourceVideo.paused
      || timeline.videoPlayPending) return;
  timeline.videoPlayPending = true;
  void levelOneSourceVideo.play().then(() => {
    timeline.videoPlayPending = false;
    if (state.levelOneSourceTimeline !== timeline || timeline.completed) return;
    scheduleLevelOneSourceFrameDraw(timeline);
  }).catch((error) => {
    timeline.videoPlayPending = false;
    if (error?.name === 'NotAllowedError' || error?.name === 'NotSupportedError') {
      fallbackLevelOneSourceTimeline(timeline, performance.now());
    }
  });
}

function prepareLevelOneSourceSegment(color) {
  const segment = levelOneSourceSegment(color);
  if (!segment || levelOneSourceVideo.readyState < HTMLMediaElement.HAVE_METADATA) return;
  // A new tray can be lifted while another color's source animation is still
  // playing. Keep that timeline intact until the new tray actually reaches
  // the wall; seeking on pointer-down would skip the in-between source frames.
  if (state.levelOneSourceTimeline && !state.levelOneSourceTimeline.completed) return;
  const leadMs = LEVEL_ONE_SOURCE_DRAG_LEADS_MS[color] ?? 0;
  const targetTime = Math.min(segment.end, segment.start + leadMs / 1_000);
  if (Math.abs(levelOneSourceVideo.currentTime - targetTime) < 0.005) return;
  levelOneSourceVideo.pause();
  levelOneSourceVideo.currentTime = targetTime;
}

function startLevelOneSourceAnimation(color, sweep) {
  const segment = levelOneSourceSegment(color);
  if (!segment) return;
  const timeline = {
    color,
    ...segment,
    sweep,
    completed: false,
    videoPlayPending: false,
    sourceFramePresented: false,
    awaitingSourceFrame: true,
    mediaPauseStartedAt: null,
    watchdogStartedAt: performance.now(),
    lastPresentedAt: null,
    watchdogPausedAt: null,
    useFullPanel: color === 'yellow' && state.game.buckets.every((candidate) => (
      candidate.id === 'yellow' || (!candidate.sweep && state.game.bucketCollected[candidate.id] === 0)
    )),
  };
  state.levelOneSourceTimeline = timeline;
  levelOneSourceVideo.pause();

  const seekAndPlay = () => {
    if (state.levelOneSourceTimeline !== timeline) return;
    const elapsed = Math.max(0, (performance.now() - sweep.startedAt) / 1_000);
    const targetTime = Math.min(segment.end, segment.start + elapsed);
    if (targetTime >= segment.end) {
      const finish = () => completeLevelOneSourceTimeline(timeline);
      if (Math.abs(levelOneSourceVideo.currentTime - targetTime) < 0.005) finish();
      else {
        levelOneSourceVideo.addEventListener('seeked', finish, { once: true });
        levelOneSourceVideo.currentTime = targetTime;
      }
      return;
    }
    const play = () => requestLevelOneSourceVideoPlayback(timeline);
    if (Math.abs(levelOneSourceVideo.currentTime - targetTime) < 0.005) {
      play();
      return;
    }
    levelOneSourceVideo.addEventListener('seeked', play, { once: true });
    levelOneSourceVideo.currentTime = targetTime;
  };

  if (levelOneSourceVideo.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) seekAndPlay();
  else levelOneSourceVideo.addEventListener('loadeddata', seekAndPlay, { once: true });
}

function updateLevelOneSourcePlayback() {
  const timeline = state.levelOneSourceTimeline;
  if (!timeline) return;
  const shouldPause = state.game.status === 'paused' || document.hidden;
  if (shouldPause) {
    timeline.watchdogPausedAt ??= performance.now();
    if (!levelOneSourceVideo.paused || !levelOneSourceAudio.paused) {
      levelOneSourceVideo.pause();
      levelOneSourceAudio.pause();
    }
    return;
  }
  const now = performance.now();
  if (timeline.watchdogPausedAt !== null) {
    const pausedDuration = now - timeline.watchdogPausedAt;
    timeline.watchdogStartedAt += pausedDuration;
    if (timeline.lastPresentedAt !== null) timeline.lastPresentedAt += pausedDuration;
    timeline.watchdogPausedAt = null;
  }
  if (!timeline.completed && now - (timeline.lastPresentedAt ?? timeline.watchdogStartedAt) > 1_000) {
    // A denied/stalled video must never freeze game rules or block another tray.
    fallbackLevelOneSourceTimeline(timeline, now);
    return;
  }
  const mediaClockNow = timeline.mediaPauseStartedAt ?? performance.now();
  const elapsed = Math.max(0, (mediaClockNow - timeline.sweep.startedAt) / 1_000);
  const sourceTime = Math.min(timeline.end, timeline.start + elapsed);
  if (sourceTime < timeline.end && levelOneSourceVideo.paused && !levelOneSourceVideo.seeking) {
    requestLevelOneSourceVideoPlayback(timeline);
  }
  const sourceFrameReady = timeline.sourceFramePresented
    && !timeline.awaitingSourceFrame
    && !levelOneSourceVideo.paused
    && !levelOneSourceVideo.seeking;
  if (!audio.isUsingSourceMix() || (!timeline.completed && !sourceFrameReady)) {
    levelOneSourceAudio.pause();
  } else if (!timeline.completed && levelOneSourceAudio.readyState >= HTMLMediaElement.HAVE_METADATA) {
    if (Math.abs(levelOneSourceAudio.currentTime - sourceTime) > 0.08) {
      levelOneSourceAudio.currentTime = sourceTime;
    }
    if (sourceTime < timeline.end && levelOneSourceAudio.paused) {
      void levelOneSourceAudio.play().catch(() => {});
    }
  }
  if (!timeline.completed && (
    (sourceFrameReady && levelOneSourceVideo.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA
      && sourceTime >= timeline.end)
    || levelOneSourceVideo.ended
  )) {
    if (!levelOneSourceVideo.ended && !levelOneSourceVideo.seeking && levelOneSourceVideo.currentTime < timeline.end) {
      levelOneSourceVideo.currentTime = timeline.end;
    }
    completeLevelOneSourceTimeline(timeline);
  }
}

function updateLevelOneTutorialPlayback() {
  const shouldPlay = state.game.level === 1
    && state.game.status === 'tutorial'
    && !state.game.started
    && dialogLayer.hidden
    && !document.hidden
    && !prefersReducedMotion.matches
    && levelOneTutorialVideo.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA;
  if (shouldPlay && levelOneTutorialVideo.paused && !levelOneTutorialVideo.ended) {
    void levelOneTutorialVideo.play().catch(() => {});
  } else if (!shouldPlay && !levelOneTutorialVideo.paused) {
    levelOneTutorialVideo.pause();
  }
}

function levelOneSweepSchedule(cell, bucket, rank, total) {
  const stops = LEVEL_ONE_PROGRESS_STOPS[bucket.color] ?? [[1, 1_000]];
  const count = rank + 1;
  const stopIndex = stops.findIndex(([progress]) => count <= Math.round(progress * total));
  const resolvedStopIndex = stopIndex < 0 ? stops.length - 1 : stopIndex;
  const [stopProgress, arrivalMs] = stops[resolvedStopIndex];
  const previousCount = resolvedStopIndex === 0 ? 0 : Math.round(stops[resolvedStopIndex - 1][0] * total);
  const previousArrivalMs = resolvedStopIndex === 0 ? 0 : stops[resolvedStopIndex - 1][1];
  const batchCount = Math.max(1, Math.round(stopProgress * total) - previousCount);
  const positionInBatch = Math.max(0, count - previousCount - 1);
  const launchWindowStartMs = Math.max(previousArrivalMs, arrivalMs - 180);
  const launchWindowMs = Math.max(0, arrivalMs - launchWindowStartMs);
  const launchMs = state.game.level === 1 && bucket.color === 'yellow'
    ? LEVEL_ONE_YELLOW_ROW_LAUNCH_MS[cell.row] ?? 567
    : Math.round(launchWindowStartMs + (positionInBatch / Math.max(1, batchCount - 1)) * launchWindowMs);
  return { launchMs, arrivalMs };
}

function startLevelOneSweep(bucket, now) {
  const targets = state.game.grid.flatMap((cell, index) => (
    cell?.targetBucketId === bucket.id ? [{ cell, index }] : []
  )).sort((a, b) => (bucket.color === 'yellow'
    ? a.cell.row - b.cell.row || a.cell.column - b.cell.column
    : b.cell.row - a.cell.row || a.cell.column - b.cell.column));
  const entries = targets.map(({ cell, index }, rank) => ({
    cell,
    index,
    ...levelOneSweepSchedule(cell, bucket, rank, targets.length),
    launched: false,
    arrived: false,
  }));
  const sourceLead = LEVEL_ONE_SOURCE_DRAG_LEADS_MS[bucket.color] ?? 0;
  bucket.sweep = {
    startedAt: now - sourceLead,
    entries,
    lastAnnouncedProgress: 0,
    soundPlayed: false,
  };
  startLevelOneSourceAnimation(bucket.color, bucket.sweep);
  state.moveCollected = Math.max(1, state.moveCollected);
  liveStatus.textContent = `${bucket.color === 'yellow' ? '黄色' : bucket.color === 'green' ? '绿色' : '红色'}像素开始飞向收集槽`;
}

function addLevelOneSweepParticle(cell, bornAt, arrivalAt, bucket) {
  const serial = state.particleSerial++;
  const random = (salt) => {
    const value = Math.sin((serial * 17 + salt * 113) * 12.9898) * 43758.5453;
    return value - Math.floor(value);
  };
  const wallBottom = state.game.gridRect.y + state.game.gridRect.height;
  state.game.particles.push({
    x: cell.x + (random(1) - 0.5) * 8,
    y: cell.y + (wallBottom - cell.y) * 0.55 - 30 + (random(2) - 0.5) * 10,
    targetX: bucket.x + bucket.width * (0.02 + random(3) * 0.96),
    targetY: bucket.y + bucket.height * (0.16 + random(4) * 0.18),
    color: cell.color,
    bornAt,
    duration: Math.max(160, arrivalAt - bornAt),
    phase: random(5) * Math.PI * 2,
    size: 9 + random(6) * 9,
    serial,
  });
}

function advanceLevelOneSweep(now) {
  const timeline = state.levelOneSourceTimeline;
  if (timeline && !timeline.completed) {
    const sweep = timeline.sweep;
    if (state.game.status === 'paused') {
      if (timeline.mediaPauseStartedAt !== null) {
        sweep.startedAt += now - timeline.mediaPauseStartedAt;
        timeline.mediaPauseStartedAt = null;
      }
      sweep.pausedAt ??= now;
    } else {
      if (sweep.pausedAt) {
        sweep.startedAt += now - sweep.pausedAt;
        sweep.pausedAt = null;
      }
      if (!timeline.sourceFramePresented) return;
      if (timeline.awaitingSourceFrame || levelOneSourceVideo.paused || levelOneSourceVideo.seeking || document.hidden) {
        timeline.mediaPauseStartedAt ??= now;
        return;
      }
      if (timeline.mediaPauseStartedAt !== null) {
        sweep.startedAt += now - timeline.mediaPauseStartedAt;
        timeline.mediaPauseStartedAt = null;
      }
    }
  }

  for (const bucket of state.game.buckets.filter((candidate) => candidate.sweep && !candidate.sweep.completed)) {
    const sweep = bucket.sweep;
    if (state.game.status === 'paused') {
      sweep.pausedAt ??= now;
      continue;
    }
    if (sweep.pausedAt) {
      sweep.startedAt += now - sweep.pausedAt;
      sweep.pausedAt = null;
    }

    const elapsed = now - sweep.startedAt;
    for (const entry of sweep.entries) {
      if (!entry.launched && elapsed >= entry.launchMs) {
        entry.launched = true;
        state.game.grid[entry.index] = null;
        const launchedAt = sweep.startedAt + entry.launchMs;
        const arrivalAt = sweep.startedAt + entry.arrivalMs;
        addLevelOneSweepParticle(entry.cell, launchedAt, arrivalAt, bucket);
        if (!sweep.soundPlayed) {
          audio.cue('collect');
          sweep.soundPlayed = true;
        }
      }
      if (entry.launched && !entry.arrived && elapsed >= entry.arrivalMs) {
        entry.arrived = true;
        state.game.collected[entry.cell.color] += 1;
        state.game.bucketCollected[bucket.id] += 1;
      }
    }

    const progress = getProgress(state.game, bucket);
    const milestones = bucket.color === 'yellow'
      ? [6, 36, 63, 99, 100]
      : bucket.color === 'green' ? [25, 48, 71, 85, 99, 100]
        : bucket.color === 'red' ? [34, 64, 77, 92, 100] : null;
    const sourceProgress = milestones?.includes(progress)
      ? progress
      : milestones?.find((milestone) => Math.abs(milestone - progress) <= 1);
    const reportedProgress = sourceProgress ?? progress;
    const shouldAnnounce = milestones
      ? sourceProgress !== undefined && reportedProgress !== sweep.lastAnnouncedProgress
      : progress !== sweep.lastAnnouncedProgress;
    if (shouldAnnounce) {
      sweep.lastAnnouncedProgress = reportedProgress;
      const colorName = bucket.color === 'yellow' ? '黄色' : bucket.color === 'green' ? '绿色' : '红色';
      liveStatus.textContent = `已收集 ${state.game.bucketCollected[bucket.id]} 个${colorName} 像素块，进度 ${reportedProgress}%`;
    }
    if (state.game.bucketCollected[bucket.id] >= state.game.bucketTotals[bucket.id]) {
      sweep.completed = true;
      bucket.completeAt = now;
      if (state.game.grid.every((cell) => cell === null)
          && state.game.buckets.every((candidate) => (
            state.game.bucketCollected[candidate.id] >= state.game.bucketTotals[candidate.id]
          ))) {
        if (state.levelOneSourceTimeline?.color === 'red' && !state.levelOneSourceTimeline.completed) {
          state.levelOneWonPending = true;
        } else {
          state.game.status = 'won';
        }
      }
    }
  }
}

function updateBoosterControls() {
  const activeBooster = ['freeze', 'hammer', 'ufo'].includes(state.game.config.booster)
    ? state.game.config.booster
    : null;
  boosterControls.hidden = state.loading || state.game.level === 1;
  boosterControls.dataset.kind = activeBooster ?? '';
  for (const button of boosterControls.querySelectorAll('[data-booster]')) {
    const kind = button.dataset.booster;
    const unlockAt = { freeze: 7, hammer: 9, ufo: 13 }[kind];
    if (!unlockAt) {
      button.classList.add('is-locked');
      continue;
    }
    const charges = kind === 'freeze' ? state.freezeCharges : kind === 'hammer' ? state.hammerCharges : state.ufoCharges;
    const locked = state.game.level < unlockAt;
    button.disabled = locked || charges <= 0;
    button.classList.toggle('is-locked', locked);
    button.querySelector('.booster-count').textContent = String(charges);
    button.querySelector('.booster-count').hidden = locked;
    button.querySelector('.booster-lock').hidden = !locked;
    button.classList.toggle('is-active', (kind === 'hammer' && state.hammerMode) || (kind === 'ufo' && state.ufoMode));
  }
}

function activateBooster(kind) {
  if (state.loading || dialogLayer.hidden === false || state.game.status === 'won' || state.game.status === 'lost') return;
  void audio.startFromGesture();
  audio.cue('button');
  if (kind === 'freeze' && state.freezeCharges > 0) {
    state.freezeCharges -= 1;
    state.game.freezeRemaining = 20;
    liveStatus.textContent = '时间已冻结 20 秒';
  } else if (kind === 'hammer' && state.hammerCharges > 0) {
    state.hammerMode = !state.hammerMode;
    state.ufoMode = false;
    liveStatus.textContent = state.hammerMode ? '已选中拆分锤，点击一块像素' : '已取消拆分锤';
  } else if (kind === 'ufo' && state.ufoCharges > 0) {
    state.ufoMode = !state.ufoMode;
    state.hammerMode = false;
    liveStatus.textContent = state.ufoMode ? '已选中飞碟，点击要填充的收集槽' : '已取消飞碟';
  }
  updateBoosterControls();
}

function activateSelectedBucket(bucket, now) {
  if (!bucket) return false;
  const availableCells = state.game.grid.filter((cell) => cell
    && cell.targetBucketId === bucket.id
    && (state.game.config.acceptMixedColorCells || cell.color === bucket.color));
  if (!availableCells.length) {
    liveStatus.textContent = `这个${colorName(bucket.color)}收集槽没有可填充的像素`;
    return true;
  }
  state.game.bucketBonusCollected ??= {};
  const startCollected = Math.max(
    state.game.bucketCollected[bucket.id] ?? 0,
    state.game.bucketDisplayedCollected?.[bucket.id] ?? 0,
    state.game.bucketBonusCollected[bucket.id] ?? 0,
  );
  const suctionTargetCount = Math.min(14, availableCells.length);
  const suctionTargets = Array.from({ length: suctionTargetCount }, (_, index) => {
    const cellIndex = suctionTargetCount > 1
      ? Math.round(index * (availableCells.length - 1) / (suctionTargetCount - 1))
      : 0;
    const cell = availableCells[cellIndex];
    return { x: cell.x, y: cell.y };
  });
  state.ufoFlight = {
    startedAt: now,
    duration: 3200,
    entryDuration: 620,
    suctionStart: 620,
    travelStart: 1480,
    travelDuration: 220,
    fillStart: 1900,
    fillDuration: 1300,
    bucketId: bucket.id,
    useRecordedVisual: bucket.id === 'yellow-left',
    total: availableCells.length,
    collected: 0,
    startCollected,
    soundPlayed: false,
    entryFrom: { x: 406, y: 180 },
    hover: { x: 294, y: 274 },
    suctionTargets,
    suctionBottom: state.game.gridRect.y + state.game.gridRect.height - 8,
    to: { x: bucket.x + bucket.width / 2, y: Math.max(560, bucket.y - 260) },
  };
  const flight = state.ufoFlight;
  if (flight.useRecordedVisual) {
    levelThirteenUfoReferenceVideo.pause();
    levelThirteenUfoReferenceVideo.currentTime = 0;
    void levelThirteenUfoReferenceVideo.play().catch(() => {});
  }
  state.ufoCharges -= 1;
  state.ufoMode = false;
  liveStatus.textContent = `飞碟正在填充${colorName(bucket.color)}收集槽，进度 ${getProgress(state.game, bucket.id)}%`;
  updateBoosterControls();
  return true;
}

function advanceUfoFlight(now) {
  const flight = state.ufoFlight;
  if (!flight) return;
  const bucket = getBucket(state.game, flight.bucketId);
  if (!bucket) {
    state.ufoFlight = null;
    levelThirteenUfoReferenceVideo.pause();
    return;
  }
  const elapsed = flight.useRecordedVisual
    ? levelThirteenUfoReferenceVideo.currentTime * 1_000
    : Math.max(0, now - flight.startedAt);
  const progress = Math.min(1, elapsed / flight.duration);
  const fillProgress = Math.min(1, Math.max(0, (elapsed - flight.fillStart) / flight.fillDuration));
  const sourceFrame = Math.max(0, Math.round(elapsed * 60 / 1_000));
  let progressPercent = LEVEL_THIRTEEN_UFO_SOURCE_PROGRESS[0][1];
  for (const [frame, percent] of LEVEL_THIRTEEN_UFO_SOURCE_PROGRESS) {
    if (frame > sourceFrame) break;
    progressPercent = percent;
  }
  // The recording briefly shows a lower label at frame 167; keep that visual value separate
  // from the monotonic count of collected pixels.
  state.game.bucketProgressDisplayOverride ??= {};
  state.game.bucketProgressDisplayOverride[flight.bucketId] = progressPercent;
  const targetCount = Math.floor(flight.total * progressPercent / 100);
  const addedCount = targetCount - flight.collected;
  if (addedCount > 0) {
    flight.collected = targetCount;
    state.game.bucketBonusCollected[flight.bucketId] = Math.min(
      state.game.bucketTotals[flight.bucketId],
      flight.startCollected + targetCount,
    );
    if (!flight.soundPlayed) {
      audio.cue('collect');
      flight.soundPlayed = true;
    }
  }
  const displayedProgress = getProgress(state.game, bucket.id);
  if (displayedProgress >= 100 && !bucket.completeAt) bucket.completeAt = now;
  if (flight.lastDisplayedProgress !== progressPercent) {
    liveStatus.textContent = `飞碟正在填充${colorName(bucket.color)}收集槽，进度 ${displayedProgress}%`;
    flight.lastDisplayedProgress = progressPercent;
  }
  if (progress >= 1) {
    state.ufoFlight = null;
    levelThirteenUfoReferenceVideo.pause();
    canvas.dataset.ufoVisualSource = 'none';
    liveStatus.textContent = `飞碟已填充${colorName(bucket.color)}收集槽，进度 ${getProgress(state.game, bucket.id)}%`;
  }
}

function maybeSplitPixel(point) {
  const cell = splitCellAt(state.game, point.x, point.y);
  if (!cell) return false;
  state.hammerCharges -= 1;
  state.hammerMode = false;
  audio.cue('collect');
  liveStatus.textContent = `已拆分${colorName(cell.color)}像素块`;
  updateBoosterControls();
  return true;
}

function showBoosterIntro(level) {
  const intros = {
    7: { icon: '⏱️', title: '解锁新道具', name: '时间冻结', description: '冻结时间 20 秒', button: '领取并继续' },
    9: { icon: '🔨', title: '解锁新道具', name: '拆分锤', description: '把像素块拆成更小的方块', button: '领取并继续' },
    12: { icon: '🟪', title: '解锁新功能', name: '双层方块', description: '先填满内层方块，解锁下方外层', button: '开始挑战' },
    13: { icon: '🛸', title: '解锁新道具', name: '飞碟', description: '点击选择一个收集槽并填满它', button: '领取并继续' },
  };
  const intro = intros[level];
  if (!intro) return;
  state.introReturnStatus = state.game.status;
  state.game.status = 'paused';
  audio.setPaused(true);
  dialogLayer.innerHTML = `
    <section class="dialog-card booster-card" role="dialog" aria-modal="true" aria-labelledby="dialog-title">
      <h1 id="dialog-title">${intro.title}</h1>
      <div class="booster-art" aria-hidden="true">${intro.icon}</div>
      <h2>${intro.name}</h2>
      <p>${intro.description}</p>
      <div class="dialog-actions"><button class="primary" type="button" data-action="begin">${intro.button}</button></div>
    </section>`;
  dialogLayer.hidden = false;
  dialogLayer.querySelector('button')?.focus();
  dialogLayer.addEventListener('click', onDialogClick);
}

function colorName(color) {
  return ({
    green: '绿色 ', yellow: '黄色 ', red: '红色 ', blue: '蓝色 ',
    purple: '紫色 ', magenta: '洋红色 ', white: '白色 ', brown: '棕色 ', orange: '橙色 ',
  })[color] ?? '';
}

function drawLevelOneFadedPanel(source, sourceWidth, height, destinationWidth = sourceWidth, blendStart = LEVEL_ONE_OPENING_BLEND_START) {
  const bottomHeight = height - blendStart;
  if (levelOneSourceBlendCanvas.width !== destinationWidth || levelOneSourceBlendCanvas.height !== bottomHeight) {
    levelOneSourceBlendCanvas.width = destinationWidth;
    levelOneSourceBlendCanvas.height = bottomHeight;
  }
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
  ctx.drawImage(source, 0, 0, sourceWidth, blendStart,
    17, 226, destinationWidth, blendStart);
  levelOneSourceBlendContext.imageSmoothingEnabled = false;
  levelOneSourceBlendContext.globalCompositeOperation = 'source-over';
  levelOneSourceBlendContext.drawImage(source, 0, blendStart, sourceWidth, bottomHeight,
    0, 0, destinationWidth, bottomHeight);
  levelOneSourceBlendContext.globalCompositeOperation = 'destination-in';
  levelOneSourceBlendContext.drawImage(levelOneSourceFadeMask, 0, 0, destinationWidth, bottomHeight);
  levelOneSourceBlendContext.globalCompositeOperation = 'source-over';
  ctx.drawImage(levelOneSourceBlendCanvas, 17, 226 + LEVEL_ONE_OPENING_BLEND_START);
  ctx.restore();
}

function drawLevelOneSourcePanel(source) {
  if (source === levelOneTutorialVideo
      && levelOneTutorialFramesImage.complete
      && levelOneTutorialFramesImage.naturalWidth > 0) {
    const frameIndex = Math.min(56, Math.floor(Math.max(0, levelOneTutorialVideo.currentTime) * 60));
    if (frameIndex !== cachedLevelOneTutorialFrame) {
      levelOneTutorialFrameContext.clearRect(0, 0, 563, 756);
      levelOneTutorialFrameContext.imageSmoothingEnabled = false;
      levelOneTutorialFrameContext.drawImage(
        levelOneTutorialFramesImage,
        (frameIndex % 5) * 563,
        Math.floor(frameIndex / 5) * 756,
        563,
        756,
        0,
        0,
        563,
        756,
      );
      cachedLevelOneTutorialFrame = frameIndex;
    }
    source = levelOneTutorialFrameCanvas;
  }
  const sourceWidth = source.videoWidth || source.naturalWidth || 563;
  const sourceHeight = source.videoHeight || source.naturalHeight || 756;
  drawLevelOneFadedPanel(source, sourceWidth, sourceHeight, 563);
}

function drawLevelOneSourceActionPanel() {
  if (levelOneSourcePresentedFrameTime === null
      && levelOneSourceVideo.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) return;
  const source = levelOneSourcePresentedFrameTime === null
    ? levelOneSourceVideo
    : levelOneSourcePresentedFrameCanvas;
  const width = source.videoWidth || source.width || 564;
  const height = source.videoHeight || source.height || 756;
  drawLevelOneFadedPanel(source, width, height, width, LEVEL_ONE_ACTION_BLEND_START);
}

function drawLevelOneLiveWallExcept(activeColor) {
  const board = state.game.gridRect;
  const columns = state.game.config.grid.cols ?? board.cols;
  const paint = state.game.config.paint;
  if (!board || !columns || typeof paint !== 'function') return;

  const inactiveRanges = [];
  let rangeStart = null;
  for (let column = 0; column <= columns; column += 1) {
    const targetBucketId = column < columns ? paint.call(state.game.config, column, 0)?.targetBucketId : null;
    const inactive = column < columns && targetBucketId !== activeColor;
    if (inactive && rangeStart === null) rangeStart = column;
    if (!inactive && rangeStart !== null) {
      inactiveRanges.push([rangeStart, column]);
      rangeStart = null;
    }
  }
  if (inactiveRanges.length === 0) return;

  // The source recording contains more than one color moving at a time. Keep
  // its authentic animation only for the dragged color; restore every other
  // column from the live grid so unrelated pixels cannot fall or disappear.
  ctx.save();
  ctx.beginPath();
  for (const [startColumn, endColumn] of inactiveRanges) {
    const left = board.x + Math.round(startColumn * board.width / columns);
    const right = board.x + Math.round(endColumn * board.width / columns);
    ctx.rect(left, board.y, right - left, board.height);
  }
  ctx.clip();
  drawPixelWall();
  ctx.restore();
}

function drawLevelOneSourceBoardFrame(activeColor = state.levelOneSourceTimeline?.color) {
  if (levelOneSourcePresentedFrameTime === null
      && levelOneSourceVideo.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) return;
  const source = levelOneSourcePresentedFrameTime === null
    ? levelOneSourceVideo
    : levelOneSourcePresentedFrameCanvas;
  const board = state.game.gridRect;
  const sourceTime = levelOneSourcePresentedFrameTime ?? levelOneSourceVideo.currentTime;
  const excludeRecordingVolumeHud = sourceTime >= 2.65 && sourceTime < 3.85;
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
  if (excludeRecordingVolumeHud) {
    // Keep the source board frame but reveal clean live game pixels under the
    // phone's system-volume overlay at the far-left edge.
    ctx.beginPath();
    ctx.rect(board.x, board.y, board.width, 100);
    ctx.rect(board.x + 22, board.y + 100, board.width - 22, board.height - 100);
    ctx.clip();
  }
  ctx.drawImage(source, 44, 43, 474, 219, board.x, board.y, board.width, board.height);
  ctx.restore();
  if (activeColor) drawLevelOneLiveWallExcept(activeColor);
}

function drawLevelOneSourceFrameToCanvas() {
  const timeline = state.levelOneSourceTimeline;
  if (!timeline || levelOneSourceVideo.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) return;
  if (timeline.color === 'yellow' && timeline.useFullPanel) {
    drawLevelOneBucketsUnderSourcePanel(LEVEL_ONE_ACTION_BLEND_START);
    drawLevelOneSourceActionPanel();
  } else if (!(timeline.color === 'red' && levelOneSourceVideo.currentTime >= 5.5)) {
    drawLevelOneSourceBoardFrame();
  }
}

function drawLevelOneBucketsUnderSourcePanel(blendStart = LEVEL_ONE_OPENING_BLEND_START) {
  const { frame } = state.game.config;
  const panelBlendStart = 226 + blendStart;
  ctx.save();
  ctx.beginPath();
  ctx.rect(frame.x, panelBlendStart, frame.width, frame.y + frame.height - panelBlendStart);
  ctx.clip();
  drawFramePanel(frame, state.game.config.wall);
  ctx.restore();

  ctx.save();
  ctx.beginPath();
  ctx.rect(17, panelBlendStart, 563, frame.y + frame.height - panelBlendStart);
  ctx.clip();
  drawBuckets();
  ctx.restore();
}

function drawLevelOneBrandBackground() {
  ctx.fillStyle = gradient(0, 0, 0, SCREEN.height, [
    [0, '#176cbb'], [0.4, '#1768ad'], [0.72, '#155793'], [1, '#092d53'],
  ]);
  ctx.fillRect(0, 0, SCREEN.width, SCREEN.height);
  const glow = ctx.createRadialGradient(298, 790, 12, 298, 790, 660);
  glow.addColorStop(0, '#55c3e8');
  glow.addColorStop(0.32, '#39a0d5d1');
  glow.addColorStop(1, '#0b4d8d00');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, SCREEN.width, SCREEN.height);
}

function drawLevelOneBrandLine(text, y, size, colors, horizontalScale = 1.62, horizontalOffset = 0, extrusionDepth = 8) {
  ctx.save();
  ctx.translate(horizontalOffset, 0);
  ctx.translate(0, y);
  ctx.scale(horizontalScale, 1);
  ctx.translate(0, -y);
  ctx.font = `1000 ${size}px "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  for (let depth = extrusionDepth; depth > 0; depth -= 1) {
    ctx.lineWidth = 10;
    ctx.strokeStyle = colors.deep;
    ctx.strokeText(text, 0, y + depth);
  }
  ctx.lineWidth = 7;
  ctx.strokeStyle = colors.outline;
  ctx.strokeText(text, 0, y);
  const face = ctx.createLinearGradient(0, y - size / 2, 0, y + size / 2);
  face.addColorStop(0, colors.light);
  face.addColorStop(0.48, colors.face);
  face.addColorStop(1, colors.shadow);
  ctx.fillStyle = face;
  ctx.fillText(text, 0, y);
  ctx.restore();
}

function drawLevelOneLocalizedBrandMark(sourceTime) {
  const progress = Math.max(0, Math.min(1, (sourceTime - 5.5) / 0.2));
  const eased = progress < 0.5
    ? 4 * (progress ** 3)
    : 1 - ((-2 * progress + 2) ** 3) / 2;
  const scale = 0.34 + eased * 0.66;
  drawLevelOneBrandBackground();

  if (sourceTime < 5.533 && levelTwoOpeningPanelImage.complete && levelTwoOpeningPanelImage.naturalWidth > 0) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(298, 650, 174, 0, Math.PI * 2);
    ctx.clip();
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(levelTwoOpeningPanelImage, 17, 310, 563, 666);
    ctx.restore();
  }

  ctx.save();
  ctx.translate(298, 650);
  ctx.scale(scale, scale);
  ctx.shadowColor = '#061a36aa';
  ctx.shadowBlur = 22;
  ctx.shadowOffsetY = 9;
  ctx.beginPath();
  ctx.arc(0, 0, 132, 0, Math.PI * 2);
  ctx.fillStyle = gradient(-132, -132, 132, 132, [[0, '#dbe7f2'], [0.38, '#94a7bd'], [0.72, '#e0e6ed'], [1, '#677c98']]);
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.strokeStyle = '#f1f8ff';
  ctx.stroke();
  ctx.shadowColor = 'transparent';
  ctx.beginPath();
  ctx.arc(0, 0, 114, 0, Math.PI * 2);
  const badge = ctx.createRadialGradient(-32, -48, 8, 0, 0, 116);
  badge.addColorStop(0, '#294663');
  badge.addColorStop(0.56, '#10273e');
  badge.addColorStop(1, '#071827');
  ctx.fillStyle = badge;
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#6a7f94';
  ctx.stroke();

  ctx.save();
  ctx.translate(-91.5, -115);
  ctx.scale(0.88, 1);
  loadingVoxel(0, 0, 55, 'purple', -0.18, true, {
    light: '#f276ff', mid: '#d51de8', dark: '#8310bb', deep: '#470b7d',
  });
  ctx.restore();

  drawLevelOneBrandLine('像素', -82, 66, {
    light: '#a4ff53', face: '#76e92d', shadow: '#4cac20', outline: '#326b1d', deep: '#1e5018',
  }, 1.523, 7.5, 13);
  ctx.save();
  ctx.translate(130, -29);
  ctx.scale(0.91, 1);
  loadingVoxel(0, 0, 50, 'green', 0.13);
  ctx.restore();
  drawLevelOneBrandLine('方块', -23, 63, {
    light: '#ff8376', face: '#f34b40', shadow: '#cb2e27', outline: '#a32621', deep: '#712019',
  }, 1.655, 7);
  drawLevelOneBrandLine('大闯关', 51, 84, {
    light: '#fff7d2', face: '#ffe8a4', shadow: '#f5bd42', outline: '#bd521b', deep: '#87300e',
  }, 0.867, -13);
  loadingVoxel(-115, 11, 35, 'blue', -0.1);
  ctx.restore();
}

function drawScene(now) {
  if (state.loading) {
    drawLoadingScreen(now);
    return;
  }
  advanceLevelThreeSourcePlayback(now);
  advanceLevelFourSourcePlayback(now);
  advanceLevelFiveSourcePlayback(now);
  if (state.game.level === 8 || state.levelEightSourceTimeline) advanceLevelEightSourcePlayback(now);
  if (state.game.level === 11 || state.levelElevenSourceTimeline) advanceLevelElevenSourcePlayback(now);
  advanceLevelTwoSourcePlayback(now);
  advanceLevelTwoCollectionProgress(now);
  advanceLevelOneSweep(now);
  updateLevelOneSourcePlayback();
  updateLevelOneTutorialPlayback();
  if (canvas.dataset.gameStatus !== state.game.status) canvas.dataset.gameStatus = state.game.status;
  if (state.game.level === 1) {
    const remainingCells = String(state.game.grid.filter(Boolean).length);
    const winPending = String(state.levelOneWonPending);
    const sourceComplete = String(Boolean(state.levelOneSourceTimeline?.completed));
    if (canvas.dataset.levelOneRemainingCells !== remainingCells) canvas.dataset.levelOneRemainingCells = remainingCells;
    if (canvas.dataset.levelOneWinPending !== winPending) canvas.dataset.levelOneWinPending = winPending;
    if (canvas.dataset.levelOneSourceComplete !== sourceComplete) canvas.dataset.levelOneSourceComplete = sourceComplete;
    canvas.dataset.levelOneBuckets = JSON.stringify(state.game.buckets.map(({ id, x, y, visible }) => ({
      id, x, y, visible, collected: state.game.bucketCollected[id], total: state.game.bucketTotals[id],
    })));
  }
  advanceUfoFlight(now);
  const showLevelTwoLivePanel = state.game.level === 2
    && Boolean(state.levelTwoSourceTimeline)
    && levelTwoGameplayBackgroundImage.complete
    && levelTwoGameplayBackgroundImage.naturalWidth > 0;
  const showLevelTwoFreeBackground = state.game.level === 2
    && state.levelTwoInteractive && !showLevelTwoLivePanel
    && levelTwoGameplayBackgroundImage.complete && levelTwoGameplayBackgroundImage.naturalWidth > 0
    && levelTwoOpeningPanelImage.complete && levelTwoOpeningPanelImage.naturalWidth > 0;
  const levelEightPanelVideo = getLevelEightPanelVideo();
  if (state.game.level === 2) {
    canvas.dataset.progressRed = String(getProgress(state.game, 'red'));
    canvas.dataset.progressGreen = String(getProgress(state.game, 'green'));
    canvas.dataset.progressYellow = String(getProgress(state.game, 'yellow'));
    canvas.dataset.levelTwoBuckets = JSON.stringify(state.game.buckets.map(({ id, x, y, width, height }) => ({ id, x, y, width, height })));
  }
  if (state.game.level === 3) {
    canvas.dataset.progressPurple = String(getProgress(state.game, 'purple'));
    canvas.dataset.progressBlue = String(getProgress(state.game, 'blue'));
    canvas.dataset.progressYellow = String(getProgress(state.game, 'yellow'));
  }
  if (state.game.level === 4) {
    canvas.dataset.levelFourSourceActive = String(Boolean(state.levelFourSourceTimeline));
    canvas.dataset.levelFourSourceTime = state.levelFourSourceTimeline
      ? levelFourSourceGameplayVideo.currentTime.toFixed(3)
      : '';
    canvas.dataset.levelFourBuckets = JSON.stringify(state.game.buckets.map(({ id, x, y }) => ({
      id,
      x,
      y,
      progress: getProgress(state.game, id),
    })));
    canvas.dataset.levelFourRemainingCells = String(state.game.grid.filter(Boolean).length);
  }
  if (state.game.level === 5) {
    canvas.dataset.levelFiveSourceActive = String(Boolean(state.levelFiveSourceTimeline));
    canvas.dataset.levelFiveSourceTime = state.levelFiveSourceTimeline
      ? levelFiveSourceGameplayVideo.currentTime.toFixed(3)
      : '';
    canvas.dataset.levelFiveBuckets = JSON.stringify(state.game.buckets.map(({ id, x, y }) => ({
      id,
      x,
      y,
      progress: getProgress(state.game, id),
    })));
    canvas.dataset.levelFiveRemainingCells = String(state.game.grid.filter(Boolean).length);
  }
  if (state.game.level === 8) {
    canvas.dataset.progressMagentaTop = String(getProgress(state.game, 'magenta-top'));
    canvas.dataset.progressYellowMid = String(getProgress(state.game, 'yellow-mid'));
    canvas.dataset.levelEightSourceHeld = String(state.levelEightSourcePanelHeld);
  }
  if (state.game.level === 11) {
    canvas.dataset.levelElevenSourceHeld = String(state.levelElevenSourcePanelHeld);
    canvas.dataset.levelElevenRemainingCells = String(state.game.grid.filter(Boolean).length);
    canvas.dataset.progressPurpleUpperRight = String(getProgress(state.game, 'purple-upper-right'));
    canvas.dataset.progressPurpleUpperLeft = String(getProgress(state.game, 'purple-upper-left'));
  }
  drawBackground();
  drawHeader();
  const showLevelFourOpeningPanel = state.game.level === 4
    && !state.levelFourSourcePanelReleased
    && levelFourOpeningPanelImage.complete
    && levelFourOpeningPanelImage.naturalWidth > 0;
  const showLevelFourSourceFrame = state.game.level === 4
    && state.levelFourSourcePanelReleased
    && levelFourFrameOverlayImage.complete
    && levelFourFrameOverlayImage.naturalWidth > 0;
  const showLevelFourSourcePanel = state.game.level === 4
    && Boolean(state.levelFourSourceTimeline)
    && levelFourSourceGameplayVideo.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA
    && !levelFourSourceGameplayVideo.seeking;
  const showLevelFiveOpeningPanel = state.game.level === 5
    && !state.dragging
    && state.game.moves === 0
    && !state.levelFiveSourcePanelReleased
    && levelFiveOpeningPanelImage.complete
    && levelFiveOpeningPanelImage.naturalWidth > 0;
  const showLevelFiveSourcePanel = state.game.level === 5
    && Boolean(state.levelFiveSourceTimeline)
    && levelFiveSourceGameplayVideo.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA
    && !levelFiveSourceGameplayVideo.seeking;
  if (!showLevelTwoLivePanel && !showLevelTwoFreeBackground && !showLevelFourOpeningPanel && !showLevelFourSourceFrame
      && !showLevelFourSourcePanel && !showLevelFiveOpeningPanel && !showLevelFiveSourcePanel) drawGameFrame();
  if (showLevelTwoFreeBackground) {
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(levelTwoGameplayBackgroundImage, 17, 310);
    // The extracted gameplay background contains patched first-row tiles.
    // Replace that row with the unobstructed tiles from the opening frame.
    ctx.drawImage(levelTwoOpeningPanelImage, 32, 225, 508, 112, 49, 535, 508, 112);
    ctx.restore();
  }
  if (showLevelFourSourceFrame) {
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(levelFourFrameOverlayImage, 17, 285);
    ctx.restore();
  }
  const showSourceOpeningPanel = state.game.level === 1
    && !state.game.started
    && levelOneOpeningPanelImage.complete
    && levelOneOpeningPanelImage.naturalWidth > 0;
  const showLevelTwoOpeningPanel = state.game.level === 2
    && !state.dragging
    && state.game.moves === 0
    && levelTwoOpeningPanelImage.complete
    && levelTwoOpeningPanelImage.naturalWidth > 0;
  const showLevelThreeSourcePanel = state.game.level === 3
    && Boolean(state.levelThreeSourceTimeline)
    && levelThreeSourceGameplayVideo.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA;
  const showLevelEightSourcePanel = state.game.level === 8
    && (Boolean(state.levelEightSourceTimeline) || state.levelEightSourcePanelHeld)
    && levelEightPanelVideo?.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA;
  const levelElevenPanelVideo = getLevelElevenPanelVideo();
  const showLevelElevenSourcePanel = state.game.level === 11
    && (Boolean(state.levelElevenSourceTimeline) || state.levelElevenSourcePanelHeld)
    && levelElevenPanelVideo?.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA;
  const showLevelThreeOpeningPanel = state.game.level === 3
    && !state.dragging
    && state.game.moves === 0
    && levelThreeOpeningPanelImage.complete
    && levelThreeOpeningPanelImage.naturalWidth > 0;
  const showSourceActionPanel = state.game.level === 1
    && Boolean(state.levelOneSourceTimeline)
    && !state.levelOneSourceTimeline.completed;
  const showLevelOneCompletedSourceFrame = state.game.level === 1
    && Boolean(state.levelOneSourceTimeline?.completed)
    && !state.levelOneSourceTimeline?.fallback
    && levelOneSourcePresentedFrameTime !== null;
  const showLevelOneBrandPrelude = showSourceActionPanel
    && state.levelOneSourceTimeline.color === 'red'
    && levelOneSourceVideo.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA
    && state.game.buckets.every((bucket) => bucket.id === 'red'
      || state.game.bucketCollected[bucket.id] >= state.game.bucketTotals[bucket.id])
    && levelOneSourceVideo.currentTime >= 5.5;
  if (showLevelTwoLivePanel) {
    if (levelTwoSourceGameplayVideo.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA
      && !levelTwoSourceGameplayVideo.seeking) {
      // The source clip is already cropped to the game panel. Drawing it as one
      // aligned layer avoids reusing moving tray pixels as the pad background,
      // which left a ghost behind the rising green tray and clipped its badge.
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(
        levelTwoSourceGameplayVideo,
        0,
        0,
        levelTwoSourceGameplayVideo.videoWidth,
        levelTwoSourceGameplayVideo.videoHeight,
        17,
        310,
        levelTwoSourceGameplayVideo.videoWidth,
        levelTwoSourceGameplayVideo.videoHeight,
      );
      ctx.restore();
      cacheLevelTwoSourceWall();
    } else {
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(levelTwoGameplayBackgroundImage, 17, 310, 563, 666);
      ctx.restore();
      drawLevelTwoSourcePad();
      drawPixelWall();
      drawBuckets();
    }
  } else if (showLevelOneBrandPrelude) {
    drawLevelOneLocalizedBrandMark(levelOneSourceVideo.currentTime);
  } else if (showSourceActionPanel) {
    if (state.levelOneSourceTimeline.color === 'yellow' && state.levelOneSourceTimeline.useFullPanel) {
      drawLevelOneBucketsUnderSourcePanel(LEVEL_ONE_ACTION_BLEND_START);
      drawLevelOneSourceActionPanel();
    } else {
      // Reuse only the source wall. Its green/red segment also contains future
      // tray lifts, so keep all collection slots driven by live game state.
      drawPixelWall();
      drawPad();
      drawBuckets();
      drawParticles(now);
      drawLevelOneSourceBoardFrame();
    }
  } else if (showLevelOneCompletedSourceFrame) {
    if (state.levelOneSourceTimeline.color === 'yellow' && state.levelOneSourceTimeline.useFullPanel) {
      // The yellow action clip ends on a full tray. Hold that exact source
      // panel until the player starts the next color; otherwise the live
      // bucket exit animation changes the frame while the source clock is
      // paused at its final image.
      drawLevelOneSourceActionPanel();
    } else {
      // Keep the last displayed source board visible while the next color's
      // source video seeks. The seek temporarily drops readyState, but the
      // offscreen canvas still holds the last frame the player actually saw.
      drawPixelWall();
      drawPad();
      drawBuckets();
      drawParticles(now);
      drawLevelOneSourceBoardFrame();
    }
  } else if (showSourceOpeningPanel) {
    const tutorialPanelSource = !prefersReducedMotion.matches
      && levelOneTutorialVideo.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA
      ? levelOneTutorialVideo
      : levelOneOpeningPanelImage;
    drawLevelOneBucketsUnderSourcePanel();
    drawLevelOneSourcePanel(tutorialPanelSource);
  } else if (showLevelTwoOpeningPanel) {
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(levelTwoOpeningPanelImage, 17, 310);
    ctx.restore();
  } else if (showLevelFourOpeningPanel) {
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(levelFourOpeningPanelImage, 17, 285);
    ctx.restore();
  } else if (showLevelFiveOpeningPanel) {
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(levelFiveOpeningPanelImage, 29, 375);
    ctx.restore();
  } else if (showLevelFourSourcePanel) {
    // The source panel is composited at the end of the scene pass.
  } else if (showLevelFiveSourcePanel) {
    // The source panel is composited at the end of the scene pass.
  } else if (showLevelThreeSourcePanel) {
    // The source clip covers this wall. Skip rebuilding its 1,344 cells on
    // every animation frame; keep the lower tray visible outside the crop.
    drawPad();
    drawBuckets();
  } else if (showLevelEightSourcePanel) {
    drawLevelEightSourcePanelFrame();
  } else if (showLevelElevenSourcePanel) {
    drawPixelWall();
    drawPad();
    drawBuckets();
    drawLevelElevenSourcePanelFrame(levelElevenPanelVideo);
  } else {
    drawPixelWall();
    if (!showLevelTwoFreeBackground) drawPad();
    drawBuckets();
  }
  if (!showLevelThreeSourcePanel && showLevelThreeOpeningPanel) {
    drawLevelThreePanelLayer(levelThreeOpeningPanelImage, 554, 820, 'level-three-opening');
  }
  if (!showLevelTwoLivePanel) drawFlyingSaucer(now);
  if (state.game.config.layout === 'pipes' && state.game.level !== 10) drawTubeLabels();
  if (state.game.status === 'tutorial') drawTutorialCard(now);
  if (!showLevelTwoLivePanel && !showLevelThreeSourcePanel && !showLevelFourSourcePanel && !showLevelFiveSourcePanel
      && !showLevelEightSourcePanel && !showLevelElevenSourcePanel
      && !showSourceOpeningPanel && !showSourceActionPanel) drawHand(now);
  const showRecordedUfoFrame = canvas.dataset.ufoVisualSource === 'recorded';
  if (!showLevelTwoLivePanel && !showLevelThreeSourcePanel && !showLevelEightSourcePanel && !showLevelElevenSourcePanel
      && !showLevelFourSourcePanel && !showLevelFiveSourcePanel && !showSourceActionPanel && !showRecordedUfoFrame) drawParticles(now);

  if (!showLevelThreeSourcePanel && !showLevelFourSourcePanel && !showLevelFiveSourcePanel
      && !showLevelEightSourcePanel && !showLevelElevenSourcePanel
      && state.game.invalidAt && now - state.game.invalidAt.at < 520) {
    const life = 1 - (now - state.game.invalidAt.at) / 520;
    ctx.save();
    ctx.globalAlpha = life;
    ctx.strokeStyle = '#ff4558';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.arc(state.game.invalidAt.x, state.game.invalidAt.y, 20 + (1 - life) * 24, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
  if (showLevelThreeSourcePanel) {
    if (typeof levelThreeSourceGameplayVideo.requestVideoFrameCallback === 'function') {
      drawLevelThreePanelComposite();
    } else {
      drawLevelThreeSourcePanelFrame();
    }
  }
  if (showLevelFourSourcePanel) drawLevelFourSourcePanelFrame();
  if (showLevelFiveSourcePanel) drawLevelFiveSourcePanelFrame();
}

function drawTubeLabels() {
  const { labelY = 1081, width = 78 } = state.game.config.pipeTrack ?? {};
  for (const x of state.game.config.pipeChannels) {
    ctx.save();
    ctx.globalAlpha = 0.7;
    roundedRect(x + (width - 34) / 2, labelY, 34, 15, 7);
    ctx.fillStyle = '#163f70';
    ctx.fill();
    ctx.restore();
  }
}

function mapPointer(event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((event.clientX - rect.left) / rect.width) * SCREEN.width,
    y: ((event.clientY - rect.top) / rect.height) * SCREEN.height,
  };
}

function clampBucketPosition(bucket, x, y) {
  const frame = state.game.config.frame;
  const inset = 8;
  const topAllowance = state.game.config.dragTopAllowance ?? 0;
  return {
    x: Math.max(frame.x + inset, Math.min(frame.x + frame.width - inset - bucket.width, x)),
    y: Math.max(state.game.level === 2
      ? LEVEL_TWO_DRAG_TOP[bucket.color]
      : state.game.level === 4
        ? LEVEL_FOUR_DRAG_TOP[bucket.id]
        : frame.y + inset - topAllowance,
      Math.min(frame.y + frame.height - inset - bucket.height, y)),
  };
}

// Level 4 slots stay in the lower tray area. The source's centered red slot is
// the sole exception: it starts at y=465 and is later dragged down to the tray.
const LEVEL_FOUR_DRAG_TOP = {
  'red-top': 465,
  'blue-left': 637,
  'red-right': 637,
  'green-bottom': 637,
  'yellow-bottom': 637,
  'blue-right': 637,
};

// Keep interactive trays below the pixel grid. Collection starts when the
// opening reaches the gap immediately below the grid, without requiring the
// player to drag the pointer into the wall.
const LEVEL_TWO_DRAG_TOP = { green: 520, red: 520, yellow: 520 };
const LEVEL_TWO_DOCK_ZONE_BOTTOM = 555;

const LEVEL_TWO_DOCKS = {
  green: { x: 50, y: 493 },
  red: { x: 350, y: 533 },
  yellow: { x: 50, y: 520 },
};

const levelTwoTakeoverCanvas = document.createElement('canvas');
levelTwoTakeoverCanvas.width = 478;
levelTwoTakeoverCanvas.height = 176;
const levelTwoTakeoverContext = levelTwoTakeoverCanvas.getContext('2d', { willReadFrequently: true });
let levelTwoTakeoverFrameValid = false;
let levelTwoTakeoverFrameTime = 0;

function cacheLevelTwoSourceWall() {
  const video = levelTwoSourceGameplayVideo;
  if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA || video.seeking) return;
  // Cache the frame actually drawn on screen, including during a later seek.
  levelTwoTakeoverContext.drawImage(video, 43, 34, 478, 176, 0, 0, 478, 176);
  levelTwoTakeoverFrameTime = video.currentTime;
  levelTwoTakeoverFrameValid = true;
}

function syncLevelTwoRedWallBeforeTakeover() {
  const red = getBucket(state.game, 'red');
  if (!red?.sourceCollectionActive || !levelTwoTakeoverFrameValid) return;
  const { data, width, height } = levelTwoTakeoverContext.getImageData(0, 0, 478, 176);
  const openingGrid = createGameState(2).grid;
  let remaining = 0;
  for (let index = 0; index < openingGrid.length; index += 1) {
    const cell = openingGrid[index];
    if (cell?.targetBucketId !== 'red') continue;
    const x = Math.round(cell.x - 60), y = Math.round(cell.y - 344);
    if (x < 0 || x >= width || y < 0 || y >= height) continue;
    const offset = (y * width + x) * 4;
    const [r, g, b] = data.subarray(offset, offset + 3);
    const visible = r > g * 1.35 && r > b * 1.25;
    state.game.grid[index] = visible ? cell : null;
    if (visible) remaining += 1;
  }
  const collected = state.game.bucketTotals.red - remaining;
  const total = state.game.bucketTotals.red;
  const sourceProgress = levelTwoSourceProgressAt('red', Math.max(0, (levelTwoTakeoverFrameTime - 0.2) * 1_000));
  const displayed = remaining > 0 ? Math.min(total - 1, total * sourceProgress / 100) : total;
  state.game.bucketCollected.red = collected;
  state.game.bucketDisplayedCollected.red = displayed;
  state.game.collected.red = collected;
  red.freeProgressAnchor = { collected, displayed };
}

function leaveLevelTwoSourceSequence() {
  if (!state.levelTwoSourceTimeline) return;
  // Preserve the visible source wall at the instant the player takes control.
  // The source clears red in a diagonal pattern, while the generic fill order
  // removes rows from the top; switching without this sync changes the picture.
  syncLevelTwoRedWallBeforeTakeover();
  state.levelTwoSourceTimeline = null;
  state.levelTwoInteractive = true;
  levelTwoSourceGameplayVideo.pause();
  resetLevelTwoSourceAudio();
  audio.setSourceMixMode(false);
  for (const bucket of state.game.buckets) bucket.freeCollectionAt = performance.now();
  liveStatus.textContent = '自由操作：把颜色槽移到同色像素下方';
}

function dockLevelTwoBucket(bucket, startedAt) {
  const dock = LEVEL_TWO_DOCKS[bucket.color];
  const atSourceDock = dock && Math.hypot(bucket.x - dock.x, bucket.y - dock.y) <= 30;
  const atYellowRepositionDock = bucket.color === 'yellow'
    && bucket.sourceCollectionActive
    && Math.hypot(bucket.x - 250, bucket.y - 530) <= 30;
  const atWallEdge = bucket.y <= LEVEL_TWO_DOCK_ZONE_BOTTOM;
  const hasPixelsAbove = state.game.grid.some((cell) => cell && cell.targetBucketId === bucket.id
    && cell.x >= bucket.x - 5 && cell.x <= bucket.x + bucket.width + 5);
  const atPlayableDock = atWallEdge && hasPixelsAbove;
  if (!atSourceDock && !atYellowRepositionDock && !atPlayableDock) return false;
  if (state.levelTwoSourceTimeline && !atSourceDock && !atYellowRepositionDock) leaveLevelTwoSourceSequence();
  if (state.levelTwoSourceTimeline && atYellowRepositionDock) state.levelTwoSourceTimeline.yellowRepositionConfirmed = true;
  if (!bucket.sourceCollectionActive) {
    const firstBucketMove = state.game.moves === 0;
    state.game.moves += 1;
    if (firstBucketMove && bucket.color === 'red' && atSourceDock && !state.levelTwoInteractive) {
      levelTwoTakeoverFrameValid = false;
      state.levelTwoSourceTimeline = { startedAt, pausedAt: null, seeking: false };
      audio.setSourceMixMode(true);
    } else if (firstBucketMove) {
      state.levelTwoInteractive = true;
    }
  }
  bucket.sourceCollectionActive = true;
  bucket.sourceProgressStartedAt ??= startedAt;
  bucket.freeCollectionAt = performance.now();
  return true;
}

function onPointerDown(event) {
  if (state.loading || dialogLayer.hidden === false || state.game.status === 'won' || state.game.status === 'lost' || state.game.status === 'paused') return;
  if (state.levelEightSourceTimeline || state.levelElevenSourceTimeline) return;
  const point = mapPointer(event);
  if (state.game.level === 5 && state.levelFiveSourceTimeline) {
    updateLevelFiveSourceGameState(levelFiveSourceGameplayVideo.currentTime, performance.now());
    if (!getBucketAt(state.game, point.x, point.y)) return;
    cancelLevelFiveSourcePlayback();
    state.levelFiveSourcePanelReleased = true;
    liveStatus.textContent = '自由操作：拖动收集槽收集剩余像素';
  }
  if (state.game.level === 4 && state.levelFourSourceTimeline) {
    updateLevelFourSourceGameState(levelFourSourceGameplayVideo.currentTime, performance.now());
    if (!getBucketAt(state.game, point.x, point.y)) return;
    cancelLevelFourSourcePlayback();
    liveStatus.textContent = '自由操作：拖动收集槽收集掉落的像素';
  }
  if (state.game.level === 3 && state.levelThreeSourceTimeline) {
    if (state.levelThreeSourceTimeline.completed) finishLevelThreeSourcePlayback();
    else {
      // The recorded source clip is a visual guide, but a real drag must be
      // able to take over from the tray position shown in that exact frame.
      updateLevelThreeSourceGameState(levelThreeSourceGameplayVideo.currentTime, performance.now());
      if (!getBucketAt(state.game, point.x, point.y)) return;
      cancelLevelThreeSourcePlayback();
      liveStatus.textContent = '自由操作：拖动颜色槽收集剩余像素';
    }
  }
  if (state.ufoMode) {
    const selected = getBucketAt(state.game, point.x, point.y);
    if (activateSelectedBucket(selected, performance.now())) {
      event.preventDefault();
      if (state.game.status === 'won') showEndDialog();
      return;
    }
  }
  if (state.hammerMode) {
    if (maybeSplitPixel(point)) {
      event.preventDefault();
      return;
    }
  }
  const bucket = getBucketAt(state.game, point.x, point.y);
  if (!bucket) return;
  if (state.game.level === 1 && state.levelOneSourceTimeline?.color === 'yellow'
      && bucket.color !== 'yellow') {
    // A player can grab another tray even while the recorded yellow segment
    // is running or held at its final frame.
    state.levelOneSourceTimeline.useFullPanel = false;
  }
  if (state.game.level === 2 && state.levelTwoSourceTimeline && bucket.color !== 'red') {
    // The recorded panel contains its own later tray movements. Once another
    // tray is touched, expose the live tray immediately so the player's drag
    // cannot be hidden behind the recording.
    leaveLevelTwoSourceSequence();
  }
  if (state.game.level === 2 && !state.levelTwoSourceTimeline
      && !state.levelTwoInteractive && bucket.color !== 'red') {
    state.levelTwoInteractive = true;
    liveStatus.textContent = '自由操作：把颜色槽移到同色像素下方';
  }
  event.preventDefault();
  canvas.setPointerCapture(event.pointerId);
  if (state.game.level === 1) audio.setSourceMixMode(true);
  if (state.game.level === 3 && bucket.id === 'purple' && state.game.moves === 0) {
    audio.setSourceMixMode(true);
  }
  if (state.game.level === 2 && !state.levelTwoSourceTimeline && !state.levelTwoInteractive) {
    // A muted play request inside this trusted pointer gesture unlocks the
    // original mixed track before the first valid red dock starts its timeline.
    levelTwoSourceAudio.muted = true;
    void levelTwoSourceAudio.play().catch(() => {});
  }
  void audio.startFromGesture();
  state.dragging = true;
  state.dragStartedAt = performance.now();
  state.lastPoint = point;
  state.dragOrigin = { x: bucket.x, y: bucket.y };
  state.dragOffset = { x: point.x - bucket.x, y: point.y - bucket.y };
  state.dragDistance = 0;
  state.moveCollected = 0;
  state.game.activeBucketId = bucket.id;
  state.game.invalidAt = null;
  state.levelEightSourceBucketId = null;
  state.levelEightSourceCandidate = null;
  state.levelElevenSourceBucketId = null;
  state.levelElevenSourceCandidate = null;
  state.levelFiveSourceCandidate = state.game.level === 5
    && state.game.moves === 0
    && bucket.id === 'blue'
    && Math.abs(bucket.x - 410) <= 4
    && Math.abs(bucket.y - 605) <= 4
    && levelFiveSourceGameplayVideo.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA;
  state.levelFiveCandidatePath = state.levelFiveSourceCandidate
    ? [{ x: bucket.x, y: bucket.y }]
    : [];
  if (state.game.level === 5) state.levelFiveSourcePanelReleased = true;
  if (state.game.level === 8) {
    const candidateClipId = state.game.moves === 0 && bucket.id === 'magenta-top'
      ? 'first-magenta'
      : state.game.moves === 1 && bucket.id === 'yellow-mid'
        ? 'second-yellow'
        : null;
    const candidateClip = getLevelEightSourceClip(candidateClipId);
    if (candidateClip?.video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
      state.levelEightSourceCandidate = candidateClipId;
    }
  }
  if (state.game.level === 11) {
    const candidateClipId = state.game.moves === 0 && bucket.id === 'purple-upper-right'
      ? 'first-purple'
      : state.game.moves === 1 && bucket.id === 'purple-upper-left'
        ? 'second-purple'
        : null;
    const candidateClip = getLevelElevenSourceClip(candidateClipId);
    if (candidateClip?.video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
      state.levelElevenSourceCandidate = candidateClipId;
    }
  }
  if (state.game.level === 1) prepareLevelOneSourceSegment(bucket.color);
}

function onPointerMove(event) {
  if (!state.dragging) return;
  event.preventDefault();
  const point = mapPointer(event);
  const delta = Math.hypot(point.x - state.lastPoint.x, point.y - state.lastPoint.y);
  state.dragDistance += delta;
  const bucket = getBucket(state.game, state.game.activeBucketId);
  if (!bucket) return;

  if (state.levelEightSourceTimeline) {
    state.lastPoint = point;
    return;
  }
  if (state.levelElevenSourceTimeline) {
    state.lastPoint = point;
    return;
  }
  if (state.game.level === 8 && state.levelEightSourceBucketId === bucket.id) {
    state.lastPoint = point;
    return;
  }
  if (state.game.level === 11 && state.levelElevenSourceBucketId === bucket.id) {
    state.lastPoint = point;
    return;
  }
  if (state.levelFiveSourceCandidate) {
    if (state.dragDistance >= 2) {
      const next = clampBucketPosition(bucket, point.x - state.dragOffset.x, point.y - state.dragOffset.y);
      bucket.x = next.x;
      bucket.y = next.y;
      state.levelFiveCandidatePath.push({ x: next.x, y: next.y });
    }
    state.lastPoint = point;
    return;
  }
  if (state.levelEightSourceCandidate) {
    if (state.dragDistance < 4) {
      state.lastPoint = point;
      return;
    }
    const candidateClipId = state.levelEightSourceCandidate;
    state.levelEightSourceCandidate = null;
    if (point.y < state.lastPoint.y && beginLevelEightSourcePlayback(candidateClipId, performance.now())) {
      liveStatus.textContent = getLevelEightSourceClip(candidateClipId).status;
      state.lastPoint = point;
      return;
    }
    state.levelEightSourcePanelHeld = false;
  }
  if (state.game.level === 8 && state.levelEightSourcePanelHeld && state.dragDistance >= 4) {
    // The source clip is held only as the last verified frame. Once the player
    // begins another ordinary move, return to the live post-clip board.
    state.levelEightSourcePanelHeld = false;
  }
  if (state.levelElevenSourceCandidate) {
    if (state.dragDistance < 4) {
      state.lastPoint = point;
      return;
    }
    const candidateClipId = state.levelElevenSourceCandidate;
    state.levelElevenSourceCandidate = null;
    if (point.y < state.lastPoint.y && beginLevelElevenSourcePlayback(candidateClipId)) {
      state.lastPoint = point;
      return;
    }
    state.levelElevenSourcePanelHeld = false;
  } else if (state.game.level === 11 && state.levelElevenSourcePanelHeld && state.dragDistance >= 4) {
    // Keep the last source frame until the player begins a different real move.
    state.levelElevenSourcePanelHeld = false;
  }

  if (state.dragDistance >= 4 && !state.game.started) {
    state.game.started = true;
    if (state.game.status === 'tutorial') state.game.status = 'playing';
    audio.cue('drag');
  }
  if (state.dragDistance >= 2) {
    if (state.game.level === 4) state.levelFourSourcePanelReleased = true;
    const next = clampBucketPosition(bucket, point.x - state.dragOffset.x, point.y - state.dragOffset.y);
    if (state.game.level === 1) {
      const wallBottom = state.game.gridRect.y + state.game.gridRect.height;
      bucket.x = next.x;
      // Apply the boundary on the first pointer move as well; a fast swipe
      // may jump directly from the starting slot to above the entire wall.
      bucket.y = Math.max(next.y, wallBottom + 9);
      if (!bucket.sweep && bucket.y <= wallBottom + 64) startLevelOneSweep(bucket, performance.now());
    } else if (state.game.level === 2) {
      bucket.x = next.x;
      bucket.y = next.y;
      if (bucket.color === 'green') {
        const lift = Math.max(0, Math.min(1, (733 - bucket.y) / 240));
        setLevelTwoGreenBucketHeight(bucket, 198 + (20 * lift));
      }
      // In free play, begin receiving pixels as soon as the held tray reaches
      // the wall edge; waiting for pointerup makes a held drag appear frozen.
      if (state.levelTwoInteractive && !state.levelTwoSourceTimeline && !bucket.sourceCollectionActive) {
        dockLevelTwoBucket(bucket, performance.now());
      }
    } else if (state.game.level === 4) {
      bucket.x = next.x;
      bucket.y = next.y;
    } else {
      const cells = collectAlongPath(state.game, bucket.id, { x: bucket.x, y: bucket.y }, next);
      addCollectedEffects(cells, performance.now(), bucket);
    }
  }
  state.lastPoint = point;
}

function closeDialog() {
  dialogLayer.hidden = true;
  dialogLayer.classList.remove('reward-overlay', 'transition-overlay', 'transition-level-two');
  delete dialogLayer.dataset.transitionStartedAt;
  delete dialogLayer.dataset.transitionPendingStartedAt;
  delete dialogLayer.dataset.transitionProfile;
  dialogLayer.style.removeProperty('--transition-duration');
  dialogLayer.replaceChildren();
}

function restartCurrentLevel() {
  if (state.transitionTimer) globalThis.clearTimeout(state.transitionTimer);
  state.transitionTimer = null;
  levelOneSourceVideo.pause();
  levelOneSourceAudio.pause();
  levelTwoSourceGameplayVideo.pause();
  levelTwoSourceGameplayVideo.currentTime = 0;
  cancelLevelThreeSourcePlayback();
  cancelLevelFourSourcePlayback();
  cancelLevelFiveSourcePlayback();
  cancelLevelEightSourcePlayback();
  cancelLevelElevenSourcePlayback();
  levelThirteenUfoReferenceVideo.pause();
  levelThirteenUfoReferenceVideo.currentTime = 0;
  resetLevelTwoSourceAudio();
  audio.setSourceMixMode(false);
  state.levelOneSourceTimeline = null;
  state.levelTwoSourceTimeline = null;
  state.levelTwoInteractive = false;
  state.levelFourSourcePanelReleased = false;
  state.levelFourSourceTimeline = null;
  state.levelFiveSourceTimeline = null;
  state.levelFiveSourcePanelReleased = false;
  state.levelFiveSourceCandidate = false;
  state.levelFiveCandidatePath = [];
  state.levelOneWonPending = false;
  state.game = createGameState(state.game.level);
  state.endDialogShown = false;
  state.dragging = false;
  state.dragStartedAt = null;
  state.lastPoint = null;
  state.dragOrigin = null;
  state.dragOffset = null;
  state.dragDistance = 0;
  closeDialog();
  audio.cue('button');
  liveStatus.textContent = `第 ${state.game.level} 关已重新开始`;
}

function advanceToNextLevel() {
  if (state.transitionTimer) globalThis.clearTimeout(state.transitionTimer);
  state.transitionTimer = null;
  levelOneSourceVideo.pause();
  levelOneSourceAudio.pause();
  levelTwoSourceGameplayVideo.pause();
  levelTwoSourceGameplayVideo.currentTime = 0;
  cancelLevelThreeSourcePlayback();
  cancelLevelFourSourcePlayback();
  cancelLevelFiveSourcePlayback();
  cancelLevelEightSourcePlayback();
  cancelLevelElevenSourcePlayback();
  levelThirteenUfoReferenceVideo.pause();
  levelThirteenUfoReferenceVideo.currentTime = 0;
  resetLevelTwoSourceAudio();
  audio.setSourceMixMode(false);
  state.levelOneSourceTimeline = null;
  state.levelTwoSourceTimeline = null;
  state.levelTwoInteractive = false;
  state.levelFourSourcePanelReleased = false;
  state.levelFourSourceTimeline = null;
  state.levelFiveSourceTimeline = null;
  state.levelFiveSourcePanelReleased = false;
  state.levelFiveSourceCandidate = false;
  state.levelFiveCandidatePath = [];
  state.levelOneWonPending = false;
  state.game = startNextLevel(state.game);
  state.endDialogShown = false;
  state.lastStatus = state.game.status;
  if (state.game.level === 13) {
    levelThirteenUfoReferenceVideo.preload = 'auto';
    levelThirteenUfoReferenceVideo.load();
  }
  if (state.game.level === 8) {
    levelEightSourceGameplayVideo.preload = 'auto';
    levelEightSourceAudio.preload = 'auto';
    levelEightSecondYellowVideo.preload = 'auto';
    levelEightSecondYellowAudio.preload = 'auto';
    levelEightSourceGameplayVideo.load();
    levelEightSourceAudio.load();
    levelEightSecondYellowVideo.load();
    levelEightSecondYellowAudio.load();
  }
  if (state.game.level === 11) {
    for (const clip of Object.values(LEVEL_ELEVEN_SOURCE_CLIPS)) {
      clip.video.preload = 'auto';
      clip.audio.preload = 'auto';
      clip.video.load();
      clip.audio.load();
    }
  }
  if (state.game.level === 7) state.freezeCharges = 2;
  if (state.game.level === 9) state.hammerCharges = 2;
  if (state.game.level === 13) state.ufoCharges = 2;
  if (state.game.level === 3) {
    levelThreeSourceGameplayVideo.preload = 'auto';
    levelThreeSourceGameplayVideo.load();
    levelThreeSourceAudio.preload = 'auto';
    levelThreeSourceAudio.load();
  }
  if (state.game.level === 4) {
    levelFourSourceGameplayVideo.preload = 'auto';
    levelFourSourceGameplayVideo.load();
    levelFourSourceAudio.preload = 'auto';
    levelFourSourceAudio.load();
  }
  if (state.game.level === 5) {
    levelFiveSourceGameplayVideo.preload = 'auto';
    levelFiveSourceGameplayVideo.load();
    levelFiveSourceAudio.preload = 'auto';
    levelFiveSourceAudio.load();
  }
  state.hammerMode = false;
  state.ufoMode = false;
  closeDialog();
  audio.setPaused(false);
  liveStatus.textContent = `第 ${state.game.level} 关开始`;
  updateBoosterControls();
  showBoosterIntro(state.game.level);
}

function showSettings() {
  if (!dialogLayer.hidden) return;
  state.settingsReturnStatus = state.game.status;
  if (state.game.status === 'playing') state.game.status = 'paused';
  state.game.activeBucketId = null;
  state.dragging = false;
  audio.setPaused(true);
  updateLevelOneSourcePlayback();

  dialogLayer.innerHTML = `
    <section class="dialog-card" role="dialog" aria-modal="true" aria-labelledby="dialog-title">
      <h1 id="dialog-title">游戏设置</h1>
      <div class="setting-row"><span>背景音乐</span><button type="button" data-toggle="music" aria-pressed="${audio.musicEnabled}">${audio.musicEnabled ? '开启' : '关闭'}</button></div>
      <div class="setting-row"><span>游戏音效</span><button type="button" data-toggle="effects" aria-pressed="${audio.effectsEnabled}">${audio.effectsEnabled ? '开启' : '关闭'}</button></div>
      <div class="dialog-actions">
        <button class="primary" type="button" data-action="continue">继续游戏</button>
        <button class="secondary" type="button" data-action="restart">重新开始</button>
      </div>
    </section>`;
  dialogLayer.hidden = false;
  dialogLayer.querySelector('[data-action="continue"]').focus();
  dialogLayer.addEventListener('click', onDialogClick, { once: false });
}

function showEndDialog() {
  if (state.endDialogShown) return;
  state.endDialogShown = true;
  const won = state.game.status === 'won';
  const useRecordedLevelOneWin = won && state.game.level === 1 && audio.isUsingSourceMix();
  if (!useRecordedLevelOneWin) audio.cue(won ? 'win' : 'lose');
  audio.setPaused(true);
  if (won) {
    if (useRecordedLevelOneWin) {
      levelOneSourceAudio.pause();
      levelOneSourceAudio.currentTime = LEVEL_ONE_SOURCE_SEGMENTS.red.end;
      void levelOneSourceAudio.play().catch(() => {});
    }
    if (state.game.level === 9) showFeatureReward();
    else if (state.game.level === 11) showLevelElevenProgressReward();
    else showLevelTransition();
    return;
  }
  dialogLayer.classList.remove('reward-overlay', 'transition-overlay');
  dialogLayer.innerHTML = `
    <section class="dialog-card" role="dialog" aria-modal="true" aria-labelledby="dialog-title">
      <h1 id="dialog-title">时间到啦</h1>
      <p>再试一次，把像素全部收集起来。</p>
      <div class="dialog-actions">
        <button class="secondary" type="button" data-action="restart">重新开始</button>
      </div>
    </section>`;
  dialogLayer.hidden = false;
  dialogLayer.querySelector('button')?.focus();
  dialogLayer.addEventListener('click', onDialogClick, { once: false });
}

function showLevelTransition() {
  const sourceLevel = state.game.level;
  if (sourceLevel === 2) {
    dialogLayer.dataset.transitionPendingStartedAt = String(performance.now());
    state.transitionTimer = globalThis.setTimeout(() => presentLevelTransition(sourceLevel), levelTwoWinSettleDurationMs);
    return;
  }
  presentLevelTransition(sourceLevel);
}

function presentLevelTransition(sourceLevel) {
  if (state.game.level !== sourceLevel || state.game.status !== 'won') return;
  const nextLevel = sourceLevel + 1;
  const transitionDurationMs = sourceLevel === 2 ? levelTwoTransitionDurationMs : 650;
  const previewPath = nextLevel === 2
    ? '/assets/level2/level2-opening-panel.png'
    : nextLevel >= 3 && nextLevel <= 13
      ? `/assets/transitions/level-${nextLevel}-opening.png`
      : null;
  const previewMarkup = previewPath
    ? `<img class="${nextLevel === 2 ? 'transition-preview-panel' : 'transition-preview-screen'}" src="${previewPath}" alt="">`
    : '';
  dialogLayer.classList.toggle('transition-level-two', sourceLevel === 2);
  dialogLayer.classList.add('transition-overlay');
  dialogLayer.dataset.transitionProfile = sourceLevel === 2 ? 'level2-source' : 'standard';
  dialogLayer.style.setProperty('--transition-duration', `${transitionDurationMs}ms`);
  if (sourceLevel !== 2) dialogLayer.dataset.transitionStartedAt = String(performance.now());
  dialogLayer.innerHTML = `
    <section class="level-transition" role="status" aria-live="polite" aria-label="正在进入第 ${nextLevel} 关">
      <div class="transition-next-preview" aria-hidden="true">${previewMarkup}</div>
      <div class="transition-brand" aria-hidden="true">
        <div class="transition-ring"></div>
        <i class="transition-cube cube-purple"></i>
        <i class="transition-cube cube-blue"></i>
        <i class="transition-cube cube-green"></i>
        <h1 class="transition-logo"><span>像素</span><span>方块</span><span>大闯关</span></h1>
      </div>
    </section>`;
  dialogLayer.hidden = false;
  if (sourceLevel === 2) {
    const startLevelTwoTimeline = () => {
      const brand = dialogLayer.querySelector('.transition-brand');
      if (!brand || state.game.level !== sourceLevel || state.game.status !== 'won') return;
      const animation = brand.getAnimations().find(({ animationName }) => animationName === 'transition-level-two-brand');
      const animationStartAt = animation?.startTime;
      if (animation && !Number.isFinite(animationStartAt)) {
        requestAnimationFrame(startLevelTwoTimeline);
        return;
      }
      const startedAt = Number.isFinite(animationStartAt)
        ? animationStartAt
        : performance.now();
      dialogLayer.dataset.transitionStartedAt = String(startedAt);
      const elapsedMs = performance.now() - startedAt;
      state.transitionTimer = globalThis.setTimeout(advanceToNextLevel, Math.max(0, transitionDurationMs - elapsedMs));
    };
    requestAnimationFrame(startLevelTwoTimeline);
    return;
  }
  state.transitionTimer = globalThis.setTimeout(advanceToNextLevel, transitionDurationMs);
}

function showFeatureReward() {
  showFeatureProgressReward({
    initialPercent: 78,
    targetPercent: 83,
    unlockText: '到达第 12 关！',
    action: 'next',
    durationMs: 600,
  });
}

function showLevelElevenProgressReward() {
  showFeatureProgressReward({
    initialPercent: 96,
    targetPercent: 100,
    unlockText: '到达第 12 关！',
    action: 'feature-unlock',
    durationMs: 500,
  });
}

function createRewardConfetti() {
  const colors = ['#ffeb3b', '#62f324', '#20d4ff', '#ff3ca6', '#ff7f1f', '#a876ff'];
  return Array.from({ length: 42 }, (_, index) => {
    const left = (index * 47 + 9) % 100;
    const delay = ((index * 29) % 38) / 10;
    const duration = 2.8 + ((index * 17) % 24) / 10;
    const drift = ((index * 31) % 150) - 75;
    const width = 5 + ((index * 13) % 8);
    const height = 11 + ((index * 19) % 15);
    const color = colors[index % colors.length];
    return `<i class="reward-confetti-piece" aria-hidden="true" style="--x:${left}%;--delay:${delay}s;--duration:${duration}s;--drift:${drift}px;--width:${width}px;--height:${height}px;--color:${color}"></i>`;
  }).join('');
}

function showFeatureProgressReward({ initialPercent, targetPercent, unlockText, action, durationMs }) {
  const confetti = createRewardConfetti();
  dialogLayer.classList.add('reward-overlay');
  dialogLayer.innerHTML = `
    <section class="reward-screen ${action === 'feature-unlock' ? 'level-eleven-progress' : ''}" role="dialog" aria-modal="true" aria-labelledby="dialog-title">
      <div class="reward-confetti" aria-hidden="true">${confetti}</div>
      <h1 class="reward-title" id="dialog-title">做得好！</h1>
      <p class="reward-feature-label">下一项功能</p>
      <div class="reward-meter" role="progressbar" aria-label="功能解锁进度 ${initialPercent}%" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${initialPercent}">
        <div class="reward-meter-rim"><div class="reward-meter-fill"></div></div>
        <div class="reward-meter-base"><strong>${initialPercent}%</strong></div>
      </div>
      <p class="reward-unlock-text">${unlockText}</p>
      <button class="reward-claim" type="button" data-action="${action}">
        <span class="reward-coin" aria-hidden="true">★</span><strong>20</strong><span class="reward-claim-label">领取并继续</span>
      </button>
    </section>`;
  dialogLayer.hidden = false;
  dialogLayer.querySelector('button')?.focus();
  dialogLayer.addEventListener('click', onDialogClick, { once: false });
  const meter = dialogLayer.querySelector('.reward-meter');
  const fill = dialogLayer.querySelector('.reward-meter-fill');
  const label = dialogLayer.querySelector('.reward-meter-base strong');
  const startAt = performance.now();
  const duration = prefersReducedMotion.matches ? 0 : durationMs;
  const animateProgress = (now) => {
    if (!dialogLayer.classList.contains('reward-overlay')) return;
    const fraction = duration === 0 ? 1 : Math.min(1, (now - startAt) / duration);
    const eased = 1 - ((1 - fraction) ** 2);
    const value = Math.round(initialPercent + (targetPercent - initialPercent) * eased);
    fill.style.transform = `scaleX(${value / 100})`;
    label.textContent = `${value}%`;
    meter.setAttribute('aria-valuenow', String(value));
    meter.setAttribute('aria-label', `功能解锁进度 ${value}%`);
    if (fraction < 1) requestAnimationFrame(animateProgress);
  };
  requestAnimationFrame(animateProgress);
}

function showLevelElevenFeatureUnlock() {
  const confetti = createRewardConfetti();
  dialogLayer.classList.add('reward-overlay');
  dialogLayer.innerHTML = `
    <section class="reward-screen level-eleven-unlock" role="dialog" aria-modal="true" aria-labelledby="dialog-title">
      <div class="reward-confetti" aria-hidden="true">${confetti}</div>
      <h1 class="reward-title" id="dialog-title">做得好！</h1>
      <p class="reward-feature-label">下一项功能</p>
      <div class="double-block-reward-art" aria-hidden="true">
        <div class="double-block-reward-outer"></div>
        <div class="double-block-reward-inner"></div>
      </div>
      <h2 class="reward-double-block-name">双层方块</h2>
      <p class="reward-double-block-description">先填满内层方块，解锁下方外层</p>
      <button class="reward-claim" type="button" data-action="next">
        <span class="reward-coin" aria-hidden="true">★</span><strong>20</strong><span class="reward-claim-label">领取并继续</span>
      </button>
    </section>`;
  dialogLayer.hidden = false;
  dialogLayer.querySelector('button')?.focus();
  dialogLayer.addEventListener('click', onDialogClick);
}

function onDialogClick(event) {
  const toggle = event.target.closest('[data-toggle]');
  if (toggle) {
    const enabled = toggle.getAttribute('aria-pressed') !== 'true';
    const setting = toggle.dataset.toggle;
    if (setting === 'music') audio.setMusic(enabled);
    else audio.setEffects(enabled);
    toggle.setAttribute('aria-pressed', String(enabled));
    toggle.textContent = enabled ? '开启' : '关闭';
    audio.cue('button');
    return;
  }

  const action = event.target.closest('[data-action]')?.dataset.action;
  if (!action) return;
  audio.cue('button');
  if (action === 'continue') {
    state.game.status = state.settingsReturnStatus === 'paused'
      ? (state.game.started ? 'playing' : 'tutorial')
      : state.settingsReturnStatus;
    closeDialog();
    audio.setPaused(false);
  } else if (action === 'begin') {
    state.game.status = state.introReturnStatus === 'paused' ? 'playing' : state.introReturnStatus;
    closeDialog();
    audio.setPaused(false);
  } else if (action === 'restart') {
    restartCurrentLevel();
    audio.setPaused(false);
  } else if (action === 'feature-unlock') {
    showLevelElevenFeatureUnlock();
  } else if (action === 'next') {
    advanceToNextLevel();
  }
}

function onPointerUp(event) {
  if (!state.dragging) return;
  event.preventDefault();
  const point = mapPointer(event);
  const bucket = getBucket(state.game, state.game.activeBucketId);
  const levelFiveSourceDocked = state.game.level === 5
    && state.levelFiveSourceCandidate
    && bucket?.id === 'blue'
    && state.dragDistance > 5
    && Math.abs(bucket.x - 323) <= 18
    && Math.abs(bucket.y - 597) <= 18;
  let acceptedLevelFiveSource = levelFiveSourceDocked && beginLevelFiveSourcePlayback();
  if (acceptedLevelFiveSource && bucket) {
    state.moveCollected = Math.max(1, state.moveCollected);
    bucket.x = 323;
    bucket.y = 597;
  } else if (state.levelFiveSourceCandidate && bucket) {
    let from = state.levelFiveCandidatePath[0] ?? { x: state.dragOrigin.x, y: state.dragOrigin.y };
    for (const to of state.levelFiveCandidatePath.slice(1)) {
      const cells = collectAlongPath(state.game, bucket.id, from, to);
      state.moveCollected += cells.length;
      addCollectedEffects(cells, performance.now(), bucket);
      from = to;
    }
  }
  const acceptedLevelEightSource = state.game.level === 8
    && bucket?.id === state.levelEightSourceBucketId
    && (state.levelEightSourceTimeline?.bucketId === bucket.id || state.levelEightSourcePanelHeld);
  const acceptedLevelElevenSource = state.game.level === 11
    && bucket?.id === state.levelElevenSourceBucketId
    && (state.levelElevenSourceTimeline?.bucketId === bucket.id || state.levelElevenSourcePanelHeld);
  const acceptedLevelFourReposition = state.game.level === 4
    && bucket
    && state.moveCollected === 0
    && bucket.y >= LEVEL_FOUR_DRAG_TOP[bucket.id];
  const acceptedLevelFourSource = state.game.level === 4
    && state.game.moves === 0
    && bucket?.id === 'blue-left'
    && state.dragOrigin
    && Math.abs(state.dragOrigin.x - 216) <= 24
    && Math.abs(state.dragOrigin.y - 637) <= 18
    && Math.abs(bucket.x - 381) <= 24
    && Math.abs(bucket.y - 637) <= 18;
  let acceptedLevelThreeSource = false;
  const reservedLevelThreeSourceMix = bucket && state.game.level === 3
    && bucket.id === 'purple' && state.game.moves === 0;
  if (bucket && state.game.level === 3 && !state.levelThreeSourceTimeline
      && bucket.id === 'purple' && state.game.moves === 0) {
    const dockedAtSourcePosition = Math.abs(bucket.x - 447) <= 18 && Math.abs(bucket.y - 480) <= 18;
    if (dockedAtSourcePosition && state.dragDistance > 5) {
      beginLevelThreeSourcePlayback(performance.now());
      if (state.levelThreeSourceTimeline) {
        state.levelThreeSourceTimeline.accepted = true;
        bucket.x = 447;
        bucket.y = 480;
        state.moveCollected = Math.max(1, state.moveCollected);
        state.game.moves += 1;
        state.game.started = true;
        state.game.status = 'playing';
        acceptedLevelThreeSource = true;
        liveStatus.textContent = '正在收集紫色像素，进度 0%';
      }
    }
  }
  if (reservedLevelThreeSourceMix && !acceptedLevelThreeSource) audio.setSourceMixMode(false);
  if (bucket && state.dragDistance > 5 && !acceptedLevelEightSource && !acceptedLevelElevenSource) {
    const levelTwoDocked = state.game.level === 2 && dockLevelTwoBucket(bucket, state.dragStartedAt);
    if (state.game.level === 2 && !levelTwoDocked && state.levelTwoSourceTimeline) {
      leaveLevelTwoSourceSequence();
    }
    if (acceptedLevelThreeSource) {
      // The recorded source track continues the exact, observed first move.
    } else if (levelTwoDocked) {
      liveStatus.textContent = state.game.config.acceptMixedColorCells
        ? `正在填充${colorName(bucket.color)}收集槽，进度 ${getProgress(state.game, bucket.id)}%`
        : `正在收集${colorName(bucket.color)}像素块，进度 ${getProgress(state.game, bucket.id)}%`;
    } else if (state.game.level === 2) {
      state.levelTwoInteractive = true;
      liveStatus.textContent = `已移动${colorName(bucket.color)}收集槽`;
    } else if (acceptedLevelFourSource) {
      if (beginLevelFourSourcePlayback(performance.now())) {
        state.moveCollected = Math.max(1, state.moveCollected);
        bucket.x = 381;
        bucket.y = 637;
        liveStatus.textContent = '正在收集蓝色像素，其他槽位按原片路线依次接住掉落方块';
      } else {
        liveStatus.textContent = `已调整${colorName(bucket.color)}收集槽位置`;
      }
    } else if (acceptedLevelFiveSource) {
      liveStatus.textContent = '正在按原片路线收集七色像素';
    } else if (state.moveCollected === 0 && state.game.status !== 'won' && !acceptedLevelFourReposition) {
      bucket.x = state.dragOrigin.x;
      bucket.y = state.dragOrigin.y;
      state.game.invalidAt = { ...point, at: performance.now() };
      audio.cue('invalid');
      liveStatus.textContent = state.game.config.acceptMixedColorCells
        ? '没有收集到像素块，试着扫过对应图案区域'
        : `没有收集到${colorName(bucket.color)}像素块，试着拖过同色区域`;
    } else if (acceptedLevelFourReposition) {
      liveStatus.textContent = `已调整${colorName(bucket.color)}收集槽位置`;
    } else if (getProgress(state.game, bucket.id) >= 100) {
      bucket.completeAt = performance.now();
    }
  }
  state.dragging = false;
  state.lastPoint = null;
  state.dragOrigin = null;
  state.dragOffset = null;
  state.dragDistance = 0;
  state.levelEightSourceCandidate = null;
  state.levelElevenSourceCandidate = null;
  state.levelFiveSourceCandidate = false;
  state.levelFiveCandidatePath = [];
  state.game.activeBucketId = null;
  if (state.game.level !== 2) state.game.moves += state.moveCollected > 0 ? 1 : 0;
  if (state.game.level === 2 && !state.levelTwoSourceTimeline) {
    resetLevelTwoSourceAudio();
    audio.setSourceMixMode(false);
  }
  if (state.game.status === 'won') showEndDialog();
}

canvas.addEventListener('pointerdown', onPointerDown);
canvas.addEventListener('pointermove', onPointerMove);
canvas.addEventListener('pointerup', onPointerUp);
canvas.addEventListener('pointercancel', onPointerUp);
boosterControls.addEventListener('click', (event) => {
  const button = event.target.closest('[data-booster]');
  if (button) activateBooster(button.dataset.booster);
});
settingsButton.addEventListener('click', () => {
  if (state.loading) return;
  void audio.startFromGesture();
  audio.cue('button');
  showSettings();
});

document.addEventListener('visibilitychange', () => {
  state.lastFrameAt = performance.now();
  audio.setPaused(document.hidden || state.game.status === 'paused');
  updateLevelOneSourcePlayback();
  updateLevelOneTutorialPlayback();
});

function setCanvasDensity() {
  const ratio = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
  canvas.width = Math.round(SCREEN.width * ratio);
  canvas.height = Math.round(SCREEN.height * ratio);
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
}

function frame(now) {
  const delta = Math.min(0.05, Math.max(0, (now - state.lastFrameAt) / 1000));
  state.lastFrameAt = now;
  const minimumLoadingMs = previewLevelOneAssetGate || previewLevelFourAssetGate || previewLevelFiveAssetGate ? 0 : loadingScreenDurationMs;
  if (state.loading && !state.loadingPreview
      && now - state.loadingStartedAt >= minimumLoadingMs
      && initialPreviewAssetsReady()) {
    state.loading = false;
    liveStatus.textContent = `第 ${initialLevel} 关开始`;
    canvas.setAttribute('aria-label', '拖动收集槽收集彩色像素方块');
    settingsButton.hidden = false;
    state.lastFrameAt = now;
  }
  if (!document.hidden && !state.loading) updateClock(state.game, delta);
  for (const bucket of state.game.buckets) {
    const completionHoldMs = state.game.level === 2 && bucket.color === 'red' ? 700 : 480;
    if (state.game.level === 1 && bucket.color === 'yellow' && bucket.completeAt
        && state.game.activeBucketId !== bucket.id) {
      // The source holds the full yellow tray briefly, then drops and shrinks
      // it off screen before the green tray begins rising.
      if (!bucket.levelOneExitStartedAt) bucket.levelOneExitStartedAt = now;
      const holdMs = 140;
      const exitDurationMs = 60;
      const progress = Math.max(0, Math.min(1, (now - bucket.levelOneExitStartedAt - holdMs) / exitDurationMs));
      const eased = progress * progress * (3 - 2 * progress);
      bucket.levelOneExitProgress = progress;
      bucket.levelOneExitDrop = 260 * eased;
      bucket.levelOneExitScale = 1 - (0.45 * eased);
      if (progress >= 1) bucket.visible = false;
      canvas.dataset.levelOneYellowExitProgress = String(progress);
    } else if (bucket.completeAt && state.game.activeBucketId !== bucket.id
        && now - bucket.completeAt > completionHoldMs) {
      bucket.visible = false;
    }
  }
  drawScene(now);
  updateBoosterControls();

  if (state.game.status !== state.lastStatus) {
    if (state.game.status === 'won' || state.game.status === 'lost') showEndDialog();
    state.lastStatus = state.game.status;
  }
  requestAnimationFrame(frame);
}

setCanvasDensity();
window.addEventListener('resize', setCanvasDensity);
if (state.loading) {
  liveStatus.textContent = '正在加载游戏';
  canvas.setAttribute('aria-label', '正在加载游戏');
  settingsButton.hidden = true;
} else {
  canvas.setAttribute('aria-label', '拖动收集槽收集彩色像素方块');
  if (initialLevel !== 1) liveStatus.textContent = `第 ${initialLevel} 关开始`;
}
updateBoosterControls();
if (requestedPreviewReward && [9, 11].includes(initialLevel)) {
  state.game.grid = state.game.grid.map(() => null);
  state.game.timeRemaining = 138;
  for (const bucket of state.game.buckets) bucket.visible = false;
  state.game.status = 'won';
  state.lastStatus = 'won';
  showEndDialog();
}
drawScene(performance.now());
requestAnimationFrame(frame);
