(function () {
  'use strict';

  const root = document.querySelector('[data-taxi-rush]');
  if (!root) return;

  const canvas = root.querySelector('[data-taxi-rush-canvas]');
  const context = canvas.getContext('2d', { alpha: false });
  const reduceDecorativeMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const startPanel = root.querySelector('[data-taxi-rush-start]');
  const resultPanel = root.querySelector('[data-taxi-rush-result]');
  const pausePanel = root.querySelector('[data-taxi-rush-pause]');
  const countdownPanel = root.querySelector('[data-taxi-rush-countdown]');
  const countdownValueNode = root.querySelector('[data-taxi-rush-countdown-value]');
  const focusBar = root.querySelector('.gw-rush-focus-bar');
  const startButton = root.querySelector('[data-taxi-rush-start-button]');
  const restartButton = root.querySelector('[data-taxi-rush-restart]');
  const exitButtons = Array.from(root.querySelectorAll('[data-taxi-rush-exit]'));
  const scoreNode = root.querySelector('[data-taxi-rush-score]');
  const finalScoreNode = root.querySelector('[data-taxi-rush-final-score]');
  const bestNode = root.querySelector('[data-taxi-rush-best]');
  const recordNode = root.querySelector('[data-taxi-rush-record]');
  const recordGapNode = root.querySelector('[data-taxi-rush-record-gap]');
  const goalNode = root.querySelector('[data-taxi-rush-goal]');
  const passengerNode = root.querySelector('[data-taxi-rush-passenger]');
  const speedNode = root.querySelector('[data-taxi-rush-speed]');
  const tripNode = root.querySelector('[data-taxi-rush-trip]');
  const verdictNode = root.querySelector('[data-taxi-rush-verdict]');
  const finalTripsNode = root.querySelector('[data-taxi-rush-final-trips]');
  const finalTimeNode = root.querySelector('[data-taxi-rush-final-time]');
  const finalSpeedNode = root.querySelector('[data-taxi-rush-final-speed]');
  const eventNode = root.querySelector('[data-taxi-rush-event]');
  const liveNode = root.querySelector('[data-taxi-rush-live]');
  const exitConfirmPanel = root.querySelector('[data-taxi-rush-exit-confirm]');
  const resumeButton = root.querySelector('[data-taxi-rush-resume]');
  const confirmedExitButton = root.querySelector('[data-taxi-rush-exit-confirmed]');
  const directionButtons = Array.from(root.querySelectorAll('[data-taxi-rush-direction]'));

  const baseWorldSpeed = 190;
  const maxSpeedMultiplier = 4;
  const elapsedSpeedCurve = [
    { phase: 'relaxed', at: 0, speed: 1 },
    { phase: 'ride', at: 20, speed: 1.18 },
    { phase: 'fast', at: 45, speed: 1.5 },
    { phase: 'intense', at: 90, speed: 2.15 },
    { phase: 'master', at: 150, speed: 2.75 },
    { phase: 'master', at: 240, speed: 3.4 },
    { phase: 'master', at: 360, speed: 3.8 },
    { phase: 'master', at: 480, speed: 4 }
  ];
  const tripSpeedCurve = [
    { at: 0, speed: 1 },
    { at: 3, speed: 1.3 },
    { at: 6, speed: 1.6 },
    { at: 10, speed: 2 },
    { at: 15, speed: 2.4 },
    { at: 20, speed: 2.8 },
    { at: 30, speed: 3.3 },
    { at: 40, speed: 3.7 },
    { at: 55, speed: 4 }
  ];
  const crashFeedbackDuration = 90;
  const bestScoreKey = 'tg_taxi_rush_best_score';
  const trafficSpecs = {
    compact: { width: 52, height: 76, nose: 0.3, shoulder: 0.45 },
    hatchback: { width: 52, height: 76, nose: 0.34, shoulder: 0.47 },
    sedan: { width: 56, height: 92, nose: 0.27, shoulder: 0.43 },
    van: { width: 60, height: 104, nose: 0.36, shoulder: 0.47 },
    suv: { width: 59, height: 98, nose: 0.32, shoulder: 0.49 }
  };
  const trafficVisualSpecs = {
    compact: { width: 52, height: 76, nose: 0.34, shoulder: 0.48 },
    hatchback: { width: 52, height: 76, nose: 0.37, shoulder: 0.49 },
    sedan: { width: 56, height: 92, nose: 0.25, shoulder: 0.41 },
    van: { width: 60, height: 104, nose: 0.42, shoulder: 0.49 },
    suv: { width: 59, height: 98, nose: 0.34, shoulder: 0.5 }
  };
  const trafficTypes = ['hatchback', 'sedan', 'van', 'suv'];
  const trafficPalettes = [
    { bodyTop: '#555b5d', bodyBottom: '#171b1d', edge: '#828889' },
    { bodyTop: '#85898a', bodyBottom: '#303537', edge: '#afb3b2' },
    { bodyTop: '#25282a', bodyBottom: '#080a0b', edge: '#555b5d' },
    { bodyTop: '#cbc9c2', bodyBottom: '#5f6362', edge: '#e5e1d7' },
    { bodyTop: '#20303a', bodyBottom: '#091117', edge: '#49606c' }
  ];
  const environmentSets = [
    { kind: 'urban', skylineDensity: 1, skylineScale: 1, roadsideDensity: 1, midgroundDensity: 0.92, lampEvery: 2, treeScale: 0.82, industrial: 0, horizonGlow: 0.11, lightDensity: 0.9 },
    { kind: 'outskirts', skylineDensity: 0.28, skylineScale: 0.76, roadsideDensity: 0.78, midgroundDensity: 0.76, lampEvery: 3, treeScale: 1.12, industrial: 0, horizonGlow: 0.07, lightDensity: 0.42 },
    { kind: 'industrial', skylineDensity: 0.5, skylineScale: 0.62, roadsideDensity: 0.82, midgroundDensity: 0.86, lampEvery: 3, treeScale: 0.68, industrial: 1, horizonGlow: 0.09, lightDensity: 0.72 },
    { kind: 'open', skylineDensity: 0.08, skylineScale: 0.5, roadsideDensity: 0.46, midgroundDensity: 0.36, lampEvery: 4, treeScale: 0.88, industrial: 0, horizonGlow: 0.15, lightDensity: 0.2 }
  ];
  const skylineBlocks = Array.from({ length: 28 }, function (_item, index) {
    return {
      x: index / 27,
      width: 0.018 + ((index * 7) % 5) * 0.006,
      height: 0.16 + ((index * 11) % 8) * 0.038,
      light: index % 3 !== 1
    };
  });
  const industrialBlocks = Array.from({ length: 9 }, function (_item, index) {
    return {
      x: index / 8,
      width: 0.07 + ((index * 5) % 4) * 0.018,
      height: 0.1 + ((index * 7) % 5) * 0.022,
      lights: 2 + (index % 4)
    };
  });
  const asphaltSpecks = Array.from({ length: 72 }, function (_item, index) {
    return {
      phase: ((index * 37) % 71) / 71,
      across: 0.07 + (((index * 19) % 86) / 100),
      shade: index % 4
    };
  });
  const atmosphereStreaks = Array.from({ length: 18 }, function (_item, index) {
    return {
      x: ((index * 43) % 97) / 97,
      phase: ((index * 31) % 89) / 89,
      length: 0.6 + ((index * 7) % 6) * 0.09,
      depth: 0.55 + ((index * 11) % 7) * 0.06
    };
  });
  const midgroundObjects = Array.from({ length: 18 }, function (_item, index) {
    return {
      phase: ((index * 23) % 71) / 71,
      visibility: ((index * 41) % 97) / 97,
      width: 0.72 + ((index * 7) % 6) * 0.1,
      height: 0.74 + ((index * 13) % 7) * 0.09,
      lateral: ((index * 17) % 11) - 5,
      sideOffset: ((index * 19) % 13) / 31
    };
  });
  const distantLights = Array.from({ length: 34 }, function (_item, index) {
    return {
      x: ((index * 29) % 101) / 101,
      y: 0.7 + ((index * 17) % 23) / 100,
      visibility: ((index * 43) % 103) / 103,
      warmth: index % 4 !== 1
    };
  });
  const vehicleBodyPaths = new Map();
  const state = {
    mode: 'idle',
    width: 0,
    height: 0,
    pixelRatio: 1,
    elapsed: 0,
    score: 0,
    displayedScore: -1,
    displayedSpeed: '',
    bestScore: loadBestScore(),
    trips: 0,
    speedMultiplier: 1,
    maxSpeedMultiplier: 1,
    taxiLane: 1,
    taxiX: 0,
    steeringInput: 0,
    steeringTilt: 0,
    steeringReleaseTimer: 0,
    roadOffset: 0,
    worldDistance: 0,
    visualTime: 0,
    ambientLastTime: 0,
    obstacles: [],
    obstacleTimer: 0.9,
    safeLane: 1,
    target: null,
    targetReadyAt: 1.2,
    passengerOnBoard: false,
    successPulseUntil: 0,
    crashed: false,
    eventTimer: 0,
    feedbackTimer: 0,
    crashTimer: 0,
    countdownTimer: 0,
    focusActive: false,
    focusScrollX: 0,
    focusScrollY: 0,
    previousBodyTop: '',
    lastTime: 0,
    frameRequest: 0
  };

  function loadBestScore() {
    try {
      const value = Number(window.localStorage.getItem(bestScoreKey));
      return Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
    } catch (_error) {
      return 0;
    }
  }

  function saveBestScore(value) {
    try {
      window.localStorage.setItem(bestScoreKey, String(value));
    } catch (_error) {
      // The game remains fully usable when browser storage is unavailable.
    }
  }

  function formatScore(value) {
    const score = Math.max(0, Math.floor(value));
    return score < 10000 ? String(score).padStart(4, '0') : score.toLocaleString('de-DE');
  }

  function formatLargeScore(value) {
    return Math.max(0, Math.floor(value)).toLocaleString('de-DE');
  }

  function formatTime(value) {
    const seconds = Math.max(0, Math.floor(value));
    return String(Math.floor(seconds / 60)).padStart(2, '0') + ':' + String(seconds % 60).padStart(2, '0');
  }

  function announce(message) {
    liveNode.textContent = '';
    window.setTimeout(function () {
      liveNode.textContent = message;
    }, 20);
  }

  function showEvent(message, duration) {
    window.clearTimeout(state.eventTimer);
    eventNode.textContent = message;
    eventNode.hidden = false;
    state.eventTimer = window.setTimeout(function () {
      eventNode.hidden = true;
    }, duration || 1000);
  }

  function setMode(mode) {
    state.mode = mode;
    root.dataset.taxiRushState = mode;
  }

  function setControlsDisabled(disabled) {
    directionButtons.forEach(function (button) {
      button.disabled = disabled;
    });
    canvas.setAttribute('aria-disabled', String(disabled));
  }

  function enterFocusMode() {
    if (state.focusActive) return;
    state.focusActive = true;
    state.focusScrollX = window.scrollX;
    state.focusScrollY = window.scrollY;
    state.previousBodyTop = document.body.style.top;
    document.documentElement.classList.add('taxi-rush-focus-active');
    document.body.classList.add('taxi-rush-focus-active');
    document.body.style.top = -state.focusScrollY + 'px';
    root.classList.add('is-focus-active');
    focusBar.setAttribute('aria-hidden', 'false');
    window.requestAnimationFrame(function () {
      resizeCanvas();
      window.requestAnimationFrame(resizeCanvas);
    });
  }

  function leaveFocusMode() {
    if (!state.focusActive) return;
    const scrollX = state.focusScrollX;
    const scrollY = state.focusScrollY;
    state.focusActive = false;
    document.documentElement.classList.remove('taxi-rush-focus-active');
    document.body.classList.remove('taxi-rush-focus-active');
    document.body.style.top = state.previousBodyTop;
    root.classList.remove('is-focus-active');
    focusBar.setAttribute('aria-hidden', 'true');
    window.scrollTo({ left: scrollX, top: scrollY, behavior: 'instant' });
    window.requestAnimationFrame(resizeCanvas);
  }

  function interpolateSpeedCurve(curve, progress) {
    for (let index = 1; index < curve.length; index += 1) {
      const nextPoint = curve[index];
      if (progress <= nextPoint.at) {
        const previousPoint = curve[index - 1];
        const segmentProgress = (progress - previousPoint.at) / (nextPoint.at - previousPoint.at);
        return previousPoint.speed + (nextPoint.speed - previousPoint.speed) * segmentProgress;
      }
    }
    return curve[curve.length - 1].speed;
  }

  function calculateSpeedMultiplier() {
    const elapsedSpeed = interpolateSpeedCurve(elapsedSpeedCurve, state.elapsed);
    const completedTripSpeed = interpolateSpeedCurve(tripSpeedCurve, state.trips);
    return Math.min(maxSpeedMultiplier, Math.max(elapsedSpeed, completedTripSpeed));
  }

  function getDifficultyPhase() {
    let phase = elapsedSpeedCurve[0].phase;
    elapsedSpeedCurve.forEach(function (point) {
      if (state.elapsed >= point.at) phase = point.phase;
    });
    return phase;
  }

  function calculateTrafficPressure() {
    const speedPressure = clamp((state.speedMultiplier - 1) / (maxSpeedMultiplier - 1), 0, 1);
    const timePressure = clamp(state.elapsed / 300, 0, 1);
    const tripPressure = clamp(state.trips / 45, 0, 1);
    return clamp(speedPressure * 0.52 + timePressure * 0.18 + tripPressure * 0.3, 0, 1);
  }

  function updateHud(force) {
    const score = Math.max(0, Math.floor(state.score));
    if (force || Math.abs(score - state.displayedScore) >= 5) {
      scoreNode.textContent = formatScore(score);
      state.displayedScore = score;
    }
    const speedLabel = state.speedMultiplier.toFixed(1) + '×';
    if (force || speedLabel !== state.displayedSpeed) {
      speedNode.textContent = speedLabel;
      state.displayedSpeed = speedLabel;
    }
    tripNode.textContent = String(state.trips + 1);
    goalNode.textContent = state.passengerOnBoard ? 'Ziel erreichen' : 'Abholung';
    passengerNode.hidden = !state.passengerOnBoard;
  }

  function roadEdgesAt(y) {
    const progress = Math.max(0, Math.min(1, y / state.height));
    const perspective = Math.pow(progress, 0.92);
    const halfWidth = state.width * (0.085 + perspective * 0.395);
    return { left: state.width / 2 - halfWidth, right: state.width / 2 + halfWidth };
  }

  function laneCenter(lane, y) {
    const edges = roadEdgesAt(y);
    return edges.left + (edges.right - edges.left) * ((lane + 0.5) / 3);
  }

  function clamp(value, minimum, maximum) {
    return Math.max(minimum, Math.min(maximum, value));
  }

  function getSpeedVisualIntensity() {
    return clamp((state.speedMultiplier - 1) / (maxSpeedMultiplier - 1), 0, 1);
  }

  function getLayerTravel(speedFactor) {
    return ((state.worldDistance / Math.max(1, state.height + 110)) * speedFactor) % 1;
  }

  function getEnvironmentBlend() {
    if (reduceDecorativeMotion) {
      return { current: environmentSets[0], next: environmentSets[0], mix: 0 };
    }
    const position = state.elapsed / 48;
    const whole = Math.floor(position);
    const progress = position - whole;
    const blendProgress = clamp((progress - 0.58) / 0.42, 0, 1);
    const mix = blendProgress * blendProgress * (3 - 2 * blendProgress);
    return {
      current: environmentSets[whole % environmentSets.length],
      next: environmentSets[(whole + 1) % environmentSets.length],
      mix: mix
    };
  }

  function roundedRect(x, y, width, height, radius) {
    const safeRadius = Math.min(radius, width / 2, height / 2);
    context.beginPath();
    context.moveTo(x + safeRadius, y);
    context.lineTo(x + width - safeRadius, y);
    context.quadraticCurveTo(x + width, y, x + width, y + safeRadius);
    context.lineTo(x + width, y + height - safeRadius);
    context.quadraticCurveTo(x + width, y + height, x + width - safeRadius, y + height);
    context.lineTo(x + safeRadius, y + height);
    context.quadraticCurveTo(x, y + height, x, y + height - safeRadius);
    context.lineTo(x, y + safeRadius);
    context.quadraticCurveTo(x, y, x + safeRadius, y);
    context.closePath();
  }

  function roadHorizon() {
    return state.height * 0.13;
  }

  function traceRoad(horizon) {
    const topEdges = roadEdgesAt(horizon);
    const bottomEdges = roadEdgesAt(state.height);
    context.beginPath();
    context.moveTo(topEdges.left, horizon);
    context.lineTo(topEdges.right, horizon);
    context.lineTo(bottomEdges.right, state.height);
    context.lineTo(bottomEdges.left, state.height);
    context.closePath();
  }

  function drawDistantEnvironment(width, horizon, environment, alpha) {
    context.save();
    context.globalAlpha = alpha;
    const skylineGlow = context.createLinearGradient(0, horizon * 0.2, 0, horizon * 1.35);
    skylineGlow.addColorStop(0, 'rgba(91, 112, 119, 0)');
    skylineGlow.addColorStop(0.72, 'rgba(86, 105, 111, ' + environment.horizonGlow + ')');
    skylineGlow.addColorStop(1, 'rgba(213, 180, 95, ' + (environment.horizonGlow * 0.3) + ')');
    context.fillStyle = skylineGlow;
    context.fillRect(0, 0, width, horizon * 1.45);

    skylineBlocks.forEach(function (block, index) {
      const visibility = ((index * 37) % 101) / 100;
      if (visibility > environment.skylineDensity) return;
      const blockWidth = width * block.width;
      const blockHeight = horizon * block.height * environment.skylineScale;
      const x = block.x * width - blockWidth / 2;
      const y = horizon - blockHeight;
      context.fillStyle = index % 4 === 0 ? '#101416' : '#0b0e10';
      context.fillRect(x, y, blockWidth, blockHeight + 5);
      if (!block.light) return;
      context.fillStyle = index % 5 === 0 ? 'rgba(240, 217, 149, 0.52)' : 'rgba(174, 196, 199, 0.23)';
      context.fillRect(x + blockWidth * 0.26, y + blockHeight * 0.32, Math.max(1, blockWidth * 0.1), Math.max(1, blockHeight * 0.08));
    });

    distantLights.forEach(function (light, index) {
      if (light.visibility > environment.lightDensity) return;
      const drift = Math.sin(state.visualTime * 0.18 + index) * width * 0.0015;
      const x = light.x * width + drift;
      const y = horizon * light.y;
      const flicker = reduceDecorativeMotion ? 1 : 0.74 + Math.sin(state.visualTime * 0.7 + index * 1.9) * 0.12;
      context.fillStyle = light.warmth
        ? 'rgba(240, 217, 149, ' + (0.22 * flicker) + ')'
        : 'rgba(160, 190, 197, ' + (0.16 * flicker) + ')';
      context.fillRect(x, y, index % 5 === 0 ? 2 : 1, 1);
    });

    if (environment.industrial) {
      industrialBlocks.forEach(function (block, index) {
        const blockWidth = width * block.width;
        const blockHeight = horizon * block.height;
        const x = block.x * width - blockWidth / 2;
        const y = horizon - blockHeight;
        context.fillStyle = index % 2 === 0 ? '#101619' : '#151b1e';
        context.fillRect(x, y, blockWidth, blockHeight + 4);
        context.fillStyle = 'rgba(171, 205, 209, 0.28)';
        for (let light = 0; light < block.lights; light += 1) {
          context.fillRect(x + blockWidth * (0.14 + light * 0.18), y + blockHeight * 0.45, Math.max(1, blockWidth * 0.06), Math.max(1, blockHeight * 0.04));
        }
        if (index % 3 === 0) {
          context.fillStyle = '#0b1012';
          context.fillRect(x + blockWidth * 0.64, y - blockHeight * 0.62, Math.max(2, blockWidth * 0.1), blockHeight * 0.62);
          context.fillStyle = 'rgba(196, 67, 48, 0.48)';
          context.fillRect(x + blockWidth * 0.64, y - blockHeight * 0.66, Math.max(2, blockWidth * 0.1), 1.5);
        }
      });
    }

    context.fillStyle = 'rgba(211, 220, 213, ' + (environment.horizonGlow * 0.38) + ')';
    context.fillRect(0, horizon - 1, width, 1);
    const haze = context.createLinearGradient(0, horizon * 0.48, 0, horizon * 1.34);
    haze.addColorStop(0, 'rgba(135, 157, 160, 0)');
    haze.addColorStop(0.72, 'rgba(135, 157, 160, ' + (environment.horizonGlow * 0.12) + ')');
    haze.addColorStop(1, 'rgba(135, 157, 160, 0)');
    context.fillStyle = haze;
    context.fillRect(0, horizon * 0.45, width, horizon);
    context.restore();
  }

  function drawDistantEnvironmentTransition(width, horizon) {
    const environment = getEnvironmentBlend();
    drawDistantEnvironment(width, horizon, environment.current, 1 - environment.mix);
    if (environment.mix > 0.001) {
      drawDistantEnvironment(width, horizon, environment.next, environment.mix);
    }
  }

  function drawAsphaltTexture(horizon) {
    const travel = state.roadOffset / (state.height + 110);
    const speedIntensity = getSpeedVisualIntensity();
    context.save();
    traceRoad(horizon);
    context.clip();

    const coolReflection = context.createLinearGradient(0, horizon, 0, state.height);
    coolReflection.addColorStop(0, 'rgba(126, 160, 167, 0.025)');
    coolReflection.addColorStop(0.64, 'rgba(109, 145, 151, 0.07)');
    coolReflection.addColorStop(1, 'rgba(213, 180, 95, 0.028)');
    context.fillStyle = coolReflection;
    context.fillRect(0, horizon, state.width, state.height - horizon);

    asphaltSpecks.forEach(function (speck, index) {
      if (state.width < 520 && index % 2 !== 0) return;
      const phase = (speck.phase + travel * (0.72 + speck.shade * 0.08)) % 1;
      const depth = phase * phase;
      const y = horizon + depth * (state.height - horizon);
      const edges = roadEdgesAt(y);
      const x = edges.left + (edges.right - edges.left) * speck.across;
      const speedLength = 1 + Math.max(0, state.speedMultiplier - 1) * 2.7;
      context.fillStyle = speck.shade === 0
        ? 'rgba(213, 180, 95, ' + (0.025 + phase * 0.055) + ')'
        : 'rgba(203, 214, 213, ' + (0.018 + phase * 0.04) + ')';
      context.fillRect(x, y, Math.max(0.7, phase * 1.8), Math.max(1, phase * 4.5 * speedLength));
    });

    for (let reflection = 0; reflection < 5; reflection += 1) {
      const phase = ((reflection / 5) + travel * 0.82) % 1;
      const depth = phase * phase;
      const y = horizon + depth * (state.height - horizon);
      const edges = roadEdgesAt(y);
      const roadWidth = edges.right - edges.left;
      const x = edges.left + roadWidth * (0.16 + (reflection % 3) * 0.34);
      const length = (12 + phase * 52) * (0.72 + state.speedMultiplier * 0.29);
      const gradient = context.createLinearGradient(x, y - length, x, y + length * 0.2);
      gradient.addColorStop(0, 'rgba(240, 217, 149, 0)');
      gradient.addColorStop(0.72, 'rgba(240, 217, 149, ' + (0.018 + phase * 0.035) + ')');
      gradient.addColorStop(1, 'rgba(240, 217, 149, 0)');
      context.strokeStyle = gradient;
      context.lineWidth = Math.max(1, roadWidth * 0.015);
      context.beginPath();
      context.moveTo(x, y - length);
      context.lineTo(x, y + length * 0.2);
      context.stroke();
    }

    const movingSheen = context.createLinearGradient(0, horizon, state.width, state.height);
    movingSheen.addColorStop(0, 'rgba(203, 217, 217, 0)');
    movingSheen.addColorStop(0.48, 'rgba(203, 217, 217, ' + (0.012 + speedIntensity * 0.018) + ')');
    movingSheen.addColorStop(0.56, 'rgba(213, 180, 95, ' + (0.008 + speedIntensity * 0.012) + ')');
    movingSheen.addColorStop(1, 'rgba(203, 217, 217, 0)');
    context.fillStyle = movingSheen;
    context.fillRect(0, horizon, state.width, state.height - horizon);
    context.restore();
  }

  function drawRoadsideEnvironment(horizon, environment, alpha) {
    const travel = getLayerTravel(1.02 + getSpeedVisualIntensity() * 0.1);
    const slotCount = state.width < 520 ? 7 : 10;
    context.save();
    context.globalAlpha = alpha;
    for (let slot = 0; slot < slotCount; slot += 1) {
      const visibility = ((slot * 29 + 7) % 101) / 100;
      if (visibility > environment.roadsideDensity) continue;
      [-1, 1].forEach(function (side) {
        const sideIndex = side < 0 ? 0 : 1;
        const phaseJitter = (((slot * 17 + sideIndex * 11) % 13) - 6) / (slotCount * 28);
        const phase = ((slot / slotCount) + travel + phaseJitter + sideIndex * 0.037) % 1;
        const depth = phase * phase;
        const y = horizon + depth * (state.height - horizon);
        const edges = roadEdgesAt(y);
        const scale = 0.18 + phase * 1.02;
        const edge = side < 0 ? edges.left : edges.right;
        const lateralVariation = ((((slot * 13 + sideIndex * 7) % 9) - 4) * 1.7) * scale;
        const poleX = edge + side * (9 + 38 * phase + lateralVariation);
        const heightVariation = 0.86 + ((slot * 19 + sideIndex * 5) % 9) * 0.035;
        const poleHeight = (20 + 90 * scale) * heightVariation;

        if ((slot + sideIndex * 2) % environment.lampEvery === 0) {
          const poolX = side < 0
            ? edges.left + (edges.right - edges.left) * 0.18
            : edges.right - (edges.right - edges.left) * 0.18;
          context.save();
          context.translate(poolX, y + 4 * scale);
          context.scale(1, 0.18);
          const pool = context.createRadialGradient(0, 0, 0, 0, 0, 68 * scale);
          pool.addColorStop(0, 'rgba(240, 217, 149, ' + (0.045 + phase * 0.07) + ')');
          pool.addColorStop(1, 'rgba(240, 217, 149, 0)');
          context.fillStyle = pool;
          context.beginPath();
          context.arc(0, 0, 68 * scale, 0, Math.PI * 2);
          context.fill();
          context.restore();

          context.strokeStyle = 'rgba(92, 99, 101, ' + (0.35 + phase * 0.32) + ')';
          context.lineWidth = Math.max(0.7, 1.4 * scale);
          context.beginPath();
          context.moveTo(poleX, y);
          context.lineTo(poleX, y - poleHeight);
          context.lineTo(poleX - side * 9 * scale, y - poleHeight);
          context.stroke();

          const lampX = poleX - side * 10 * scale;
          const lampY = y - poleHeight;
          const lampGlow = context.createRadialGradient(lampX, lampY, 0, lampX, lampY, 17 * scale);
          lampGlow.addColorStop(0, 'rgba(255, 232, 169, 0.72)');
          lampGlow.addColorStop(0.24, 'rgba(240, 198, 109, 0.28)');
          lampGlow.addColorStop(1, 'rgba(240, 198, 109, 0)');
          context.fillStyle = lampGlow;
          context.beginPath();
          context.arc(lampX, lampY, 17 * scale, 0, Math.PI * 2);
          context.fill();
          context.fillStyle = '#f0d995';
          context.fillRect(lampX - 2 * scale, lampY - scale, 4 * scale, 2 * scale);
        } else {
          context.fillStyle = 'rgba(3, 6, 7, ' + (0.58 + phase * 0.25) + ')';
          context.beginPath();
          context.ellipse(poleX, y - 13 * scale * environment.treeScale, 12 * scale * environment.treeScale, 21 * scale * environment.treeScale, 0, 0, Math.PI * 2);
          context.fill();
          context.fillRect(poleX - 1.5 * scale, y - 8 * scale, 3 * scale, 15 * scale);
        }

        context.fillStyle = 'rgba(225, 220, 196, ' + (0.2 + phase * 0.42) + ')';
        context.fillRect(edge + side * 5 * scale, y - 8 * scale, side * 2.2 * scale, 9 * scale);
      });
    }
    context.restore();
  }

  function drawMidgroundEnvironment(horizon, environment, alpha) {
    const travel = getLayerTravel(0.43 + getSpeedVisualIntensity() * 0.06);
    context.save();
    context.globalAlpha = alpha;
    midgroundObjects.forEach(function (object, index) {
      if (object.visibility > environment.midgroundDensity) return;
      [-1, 1].forEach(function (side) {
        const phase = (object.phase + travel + (side > 0 ? object.sideOffset : 0)) % 1;
        const depth = phase * phase;
        const y = horizon + depth * (state.height - horizon) * 0.87;
        const edges = roadEdgesAt(y);
        const scale = 0.16 + phase * 0.72;
        const edge = side < 0 ? edges.left : edges.right;
        const x = edge + side * (38 + phase * 112 + object.lateral * scale);

        if (environment.kind === 'urban') {
          const buildingWidth = 38 * scale * object.width;
          const buildingHeight = 86 * scale * object.height;
          context.fillStyle = index % 3 === 0 ? 'rgba(20, 27, 29, 0.98)' : 'rgba(12, 18, 20, 0.99)';
          context.fillRect(x - buildingWidth / 2, y - buildingHeight, buildingWidth, buildingHeight);
          context.strokeStyle = 'rgba(148, 171, 173, ' + (0.08 + phase * 0.1) + ')';
          context.lineWidth = Math.max(0.5, scale * 0.7);
          context.strokeRect(x - buildingWidth / 2, y - buildingHeight, buildingWidth, buildingHeight);
          context.fillStyle = 'rgba(240, 217, 149, ' + (0.19 + phase * 0.14) + ')';
          for (let windowIndex = 0; windowIndex < 6; windowIndex += 1) {
            if ((index + windowIndex) % 4 === 1) continue;
            const column = windowIndex % 3;
            const row = Math.floor(windowIndex / 3);
            context.fillRect(x - buildingWidth * 0.3 + column * buildingWidth * 0.29, y - buildingHeight * (0.74 - row * 0.23), Math.max(1, buildingWidth * 0.075), Math.max(1, buildingHeight * 0.045));
          }
        } else if (environment.kind === 'industrial') {
          const blockWidth = 62 * scale * object.width;
          const blockHeight = 52 * scale * object.height;
          context.fillStyle = 'rgba(13, 20, 23, 0.99)';
          context.fillRect(x - blockWidth / 2, y - blockHeight, blockWidth, blockHeight);
          context.strokeStyle = 'rgba(146, 180, 184, ' + (0.18 + phase * 0.14) + ')';
          context.lineWidth = Math.max(0.6, scale);
          context.beginPath();
          context.moveTo(x - blockWidth * 0.7, y - blockHeight * 0.12);
          context.lineTo(x + side * blockWidth * 0.9, y - blockHeight * 0.12);
          context.stroke();
          context.fillStyle = 'rgba(175, 207, 211, ' + (0.2 + phase * 0.17) + ')';
          context.fillRect(x - blockWidth * 0.38, y - blockHeight * 0.62, blockWidth * 0.76, Math.max(1, blockHeight * 0.06));
          context.strokeStyle = 'rgba(105, 122, 124, ' + (0.14 + phase * 0.16) + ')';
          context.beginPath();
          for (let post = -2; post <= 2; post += 1) {
            context.moveTo(x + post * blockWidth * 0.24, y);
            context.lineTo(x + post * blockWidth * 0.24, y - blockHeight * 0.34);
          }
          context.stroke();
        } else {
          const treeHeight = 52 * scale * object.height * environment.treeScale;
          const treeWidth = 28 * scale * object.width * environment.treeScale;
          context.fillStyle = environment.kind === 'open' ? 'rgba(3, 6, 7, 0.92)' : 'rgba(4, 8, 8, 0.98)';
          context.beginPath();
          context.ellipse(x, y - treeHeight * 0.58, treeWidth, treeHeight * 0.58, side * 0.08, 0, Math.PI * 2);
          if (environment.kind === 'outskirts') {
            context.ellipse(x + side * treeWidth * 0.54, y - treeHeight * 0.48, treeWidth * 0.68, treeHeight * 0.46, -side * 0.12, 0, Math.PI * 2);
          }
          context.fill();
          context.fillRect(x - Math.max(1, scale * 1.6), y - treeHeight * 0.34, Math.max(2, scale * 3.2), treeHeight * 0.38);
        }
      });
    });
    context.restore();
  }

  function drawMidgroundEnvironmentTransition(horizon) {
    const environment = getEnvironmentBlend();
    drawMidgroundEnvironment(horizon, environment.current, 1 - environment.mix);
    if (environment.mix > 0.001) {
      drawMidgroundEnvironment(horizon, environment.next, environment.mix);
    }
  }

  function drawRoadsideEnvironmentTransition(horizon) {
    const environment = getEnvironmentBlend();
    drawRoadsideEnvironment(horizon, environment.current, 1 - environment.mix);
    if (environment.mix > 0.001) {
      drawRoadsideEnvironment(horizon, environment.next, environment.mix);
    }
  }

  function drawSpeedStreaks(horizon) {
    const intensity = getSpeedVisualIntensity();
    if (reduceDecorativeMotion || intensity < 0.04) return;
    const travel = getLayerTravel(1.32 + intensity * 0.3);
    const streakCount = state.width < 520 ? 9 : 18;
    context.save();
    context.lineCap = 'round';
    for (let streak = 0; streak < streakCount; streak += 1) {
      const phase = ((streak / streakCount) + travel * 1.55) % 1;
      const depth = phase * phase;
      const y = horizon + depth * (state.height - horizon);
      const edges = roadEdgesAt(y);
      const side = streak % 2 === 0 ? -1 : 1;
      const x = (side < 0 ? edges.left : edges.right) + side * (18 + phase * 70);
      const length = (16 + phase * 92) * Math.pow(intensity, 1.08);
      context.strokeStyle = streak % 3 === 0
        ? 'rgba(240, 217, 149, ' + (0.08 + intensity * 0.24) + ')'
        : 'rgba(149, 177, 181, ' + (0.055 + intensity * 0.18) + ')';
      context.lineWidth = 0.8 + phase * 1.7;
      context.beginPath();
      context.moveTo(x, y - length);
      context.lineTo(x + side * phase * 7, y + length * 0.16);
      context.stroke();
    }
    context.restore();
  }

  function drawRoadFlow(horizon) {
    const intensity = getSpeedVisualIntensity();
    if (reduceDecorativeMotion || intensity < 0.16) return;
    const travel = getLayerTravel(1.62 + intensity * 0.34);
    const count = state.width < 520 ? 10 : 18;
    context.save();
    traceRoad(horizon);
    context.clip();
    context.globalCompositeOperation = 'screen';
    context.lineCap = 'round';
    for (let index = 0; index < count; index += 1) {
      const seed = asphaltSpecks[(index * 4) % asphaltSpecks.length];
      const phase = (seed.phase + travel) % 1;
      const depth = phase * phase;
      const y = horizon + depth * (state.height - horizon);
      const edges = roadEdgesAt(y);
      const roadWidth = edges.right - edges.left;
      const across = index % 2 === 0
        ? 0.08 + seed.across * 0.3
        : 0.92 - seed.across * 0.3;
      const x = edges.left + roadWidth * across;
      const length = (18 + phase * 132) * Math.pow(intensity, 1.12);
      context.strokeStyle = index % 4 === 0
        ? 'rgba(240, 217, 149, ' + ((0.025 + phase * 0.13) * intensity) + ')'
        : 'rgba(187, 205, 207, ' + ((0.02 + phase * 0.11) * intensity) + ')';
      context.lineWidth = 0.55 + phase * 1.2;
      context.beginPath();
      context.moveTo(x, y - length);
      context.lineTo(x, y + length * 0.14);
      context.stroke();
    }
    context.restore();
  }

  function drawAtmosphere(horizon) {
    if (reduceDecorativeMotion) return;
    const intensity = getSpeedVisualIntensity();
    const travel = getLayerTravel(0.68 + intensity * 0.14);
    const count = state.width < 520 ? 9 : atmosphereStreaks.length;
    context.save();
    context.lineCap = 'round';
    for (let index = 0; index < count; index += 1) {
      const streak = atmosphereStreaks[index];
      const phase = (streak.phase + travel * streak.depth) % 1;
      const y = horizon * 0.42 + phase * (state.height - horizon * 0.28);
      const x = streak.x * state.width;
      const length = (8 + 18 * phase) * streak.length * (0.72 + intensity * 0.45);
      context.strokeStyle = 'rgba(188, 205, 207, ' + (0.018 + phase * 0.022 + intensity * 0.012) + ')';
      context.lineWidth = 0.55 + phase * 0.35;
      context.beginPath();
      context.moveTo(x, y - length);
      context.lineTo(x - length * 0.06, y);
      context.stroke();
    }
    context.restore();
  }

  function drawRoad() {
    const width = state.width;
    const height = state.height;
    const horizon = roadHorizon();
    const topEdges = roadEdgesAt(horizon);
    const bottomEdges = roadEdgesAt(height);

    const sky = context.createLinearGradient(0, 0, 0, horizon * 1.4);
    sky.addColorStop(0, '#06090b');
    sky.addColorStop(0.64, '#0b1013');
    sky.addColorStop(1, '#101315');
    context.fillStyle = sky;
    context.fillRect(0, 0, width, height);

    drawDistantEnvironmentTransition(width, horizon);

    const sideGlow = context.createLinearGradient(0, 0, width, height);
    sideGlow.addColorStop(0, 'rgba(213, 180, 95, 0.055)');
    sideGlow.addColorStop(0.5, 'rgba(5, 5, 5, 0)');
    sideGlow.addColorStop(1, 'rgba(117, 156, 146, 0.065)');
    context.fillStyle = sideGlow;
    context.fillRect(0, horizon, width, height - horizon);

    traceRoad(horizon);
    const roadGradient = context.createLinearGradient(0, 0, 0, height);
    roadGradient.addColorStop(0, '#171b1e');
    roadGradient.addColorStop(0.48, '#111518');
    roadGradient.addColorStop(1, '#090c0e');
    context.fillStyle = roadGradient;
    context.fill();

    drawAsphaltTexture(horizon);

    context.strokeStyle = 'rgba(213, 180, 95, 0.42)';
    context.lineWidth = 1.2;
    context.shadowColor = 'rgba(213, 180, 95, 0.14)';
    context.shadowBlur = 5;
    context.beginPath();
    context.moveTo(topEdges.left, horizon);
    context.lineTo(bottomEdges.left, height);
    context.moveTo(topEdges.right, horizon);
    context.lineTo(bottomEdges.right, height);
    context.stroke();
    context.shadowBlur = 0;

    for (let divider = 1; divider < 3; divider += 1) {
      for (let dash = 0; dash < 12; dash += 1) {
        const phase = ((dash / 12) + state.roadOffset / (height + 110)) % 1;
        const startDepth = phase * phase;
        const endPhase = Math.min(1, phase + 0.038 + phase * 0.038 + getSpeedVisualIntensity() * 0.048);
        const startY = horizon + startDepth * (height - horizon);
        const endY = horizon + endPhase * endPhase * (height - horizon);
        const startEdges = roadEdgesAt(startY);
        const endEdges = roadEdgesAt(endY);
        const startX = startEdges.left + (startEdges.right - startEdges.left) * (divider / 3);
        const endX = endEdges.left + (endEdges.right - endEdges.left) * (divider / 3);
        context.strokeStyle = 'rgba(0, 0, 0, 0.46)';
        context.lineWidth = 2.4 + phase * 3.2;
        context.beginPath();
        context.moveTo(startX, startY + 1.4);
        context.lineTo(endX, endY + 1.4);
        context.stroke();
        context.strokeStyle = 'rgba(238, 237, 226, ' + (0.3 + phase * 0.28) + ')';
        context.lineWidth = 0.7 + phase * 2.1;
        context.beginPath();
        context.moveTo(startX, startY);
        context.lineTo(endX, endY);
        context.stroke();
      }
    }

    const speedIntensity = getSpeedVisualIntensity();
    if (speedIntensity > 0.12) {
      context.strokeStyle = 'rgba(213, 180, 95, ' + (speedIntensity * 0.12) + ')';
      context.lineWidth = 1 + speedIntensity * 1.2;
      context.beginPath();
      context.moveTo(topEdges.left, horizon);
      context.lineTo(bottomEdges.left - state.width * 0.025 * speedIntensity, height);
      context.moveTo(topEdges.right, horizon);
      context.lineTo(bottomEdges.right + state.width * 0.025 * speedIntensity, height);
      context.stroke();
    }

    drawRoadFlow(horizon);
    drawMidgroundEnvironmentTransition(horizon);
    drawRoadsideEnvironmentTransition(horizon);
    drawSpeedStreaks(horizon);
    drawAtmosphere(horizon);
  }

  function vehicleBodyPath(width, height, spec, type) {
    const pathWidth = Math.max(2, Math.round(width / 2) * 2);
    const pathHeight = Math.max(2, Math.round(height / 2) * 2);
    const key = (type || 'sedan') + ':' + pathWidth + ':' + pathHeight;
    if (vehicleBodyPaths.has(key)) return vehicleBodyPaths.get(key);
    const path = new Path2D();
    const halfWidth = pathWidth / 2;
    path.moveTo(-pathWidth * spec.nose, 0);
    path.quadraticCurveTo(-halfWidth * 0.94, pathHeight * 0.08, -pathWidth * spec.shoulder, pathHeight * 0.24);
    path.lineTo(-halfWidth, pathHeight * 0.42);
    path.lineTo(-halfWidth * 0.92, pathHeight * 0.82);
    path.quadraticCurveTo(-halfWidth * 0.82, pathHeight * 0.96, -pathWidth * 0.28, pathHeight);
    path.lineTo(pathWidth * 0.28, pathHeight);
    path.quadraticCurveTo(halfWidth * 0.82, pathHeight * 0.96, halfWidth * 0.92, pathHeight * 0.82);
    path.lineTo(halfWidth, pathHeight * 0.42);
    path.lineTo(pathWidth * spec.shoulder, pathHeight * 0.24);
    path.quadraticCurveTo(halfWidth * 0.94, pathHeight * 0.08, pathWidth * spec.nose, 0);
    path.closePath();
    vehicleBodyPaths.set(key, path);
    return path;
  }

  function streetLightIntensityAt(y) {
    const wave = (Math.cos((y - state.roadOffset * 1.12) / 94) + 1) / 2;
    return 0.04 + wave * 0.16;
  }

  function drawVignette() {
    const radius = Math.max(state.width, state.height) * 0.72;
    const vignette = context.createRadialGradient(state.width / 2, state.height * 0.52, radius * 0.12, state.width / 2, state.height * 0.52, radius);
    vignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
    vignette.addColorStop(0.68, 'rgba(0, 0, 0, 0.04)');
    vignette.addColorStop(1, 'rgba(0, 0, 0, 0.58)');
    context.fillStyle = vignette;
    context.fillRect(0, 0, state.width, state.height);
  }

  function drawHeadlightCone() {
    const metrics = getPlayerVisualMetrics();
    const intensity = clamp((state.speedMultiplier - 1) / (maxSpeedMultiplier - 1), 0, 1);
    const nearY = metrics.y + metrics.height * 0.1;
    const farY = Math.max(roadHorizon(), nearY - metrics.height * (1.75 + intensity * 0.65));
    const centerX = metrics.x + metrics.width / 2;
    const farCenterX = centerX + state.steeringTilt * metrics.width * 0.72;
    const cone = context.createLinearGradient(0, farY, 0, nearY);
    cone.addColorStop(0, 'rgba(240, 217, 149, 0)');
    cone.addColorStop(0.7, 'rgba(240, 217, 149, ' + (0.025 + intensity * 0.018) + ')');
    cone.addColorStop(1, 'rgba(255, 239, 194, ' + (0.11 + intensity * 0.05) + ')');
    context.save();
    context.globalCompositeOperation = 'screen';
    context.fillStyle = cone;
    context.beginPath();
    context.moveTo(centerX - metrics.width * 0.22, nearY);
    context.lineTo(farCenterX - metrics.width * (0.92 + intensity * 0.18), farY);
    context.lineTo(farCenterX + metrics.width * (0.92 + intensity * 0.18), farY);
    context.lineTo(centerX + metrics.width * 0.22, nearY);
    context.closePath();
    context.fill();
    context.restore();
  }

  function drawWheel(x, y, width, height) {
    roundedRect(x, y, width, height, width * 0.45);
    context.fillStyle = '#050606';
    context.fill();
    context.strokeStyle = 'rgba(202, 207, 207, 0.24)';
    context.lineWidth = 0.7;
    context.stroke();
  }

  function drawVehicle(metrics, options) {
    const width = metrics.width;
    const height = metrics.height;
    const spec = options.spec;
    const palette = options.palette;
    const isCompact = options.type === 'compact' || options.type === 'hatchback';
    const isVan = options.type === 'van';
    const isSuv = options.type === 'suv';
    const bodyPath = vehicleBodyPath(width, height, spec, options.type);
    context.save();
    context.translate(metrics.x + width / 2, metrics.y);

    context.fillStyle = 'rgba(0, 0, 0, 0.58)';
    context.beginPath();
    context.ellipse(0, height * 0.56, width * 0.58, height * 0.53, 0, 0, Math.PI * 2);
    context.fill();

    const reflection = context.createLinearGradient(0, height * 0.52, 0, height * 1.22);
    reflection.addColorStop(0, options.player ? 'rgba(240, 217, 149, 0.08)' : 'rgba(192, 204, 204, 0.045)');
    reflection.addColorStop(1, 'rgba(5, 7, 8, 0)');
    context.fillStyle = reflection;
    context.beginPath();
    context.ellipse(0, height * 0.92, width * 0.46, height * 0.34, 0, 0, Math.PI * 2);
    context.fill();

    const wheelWidth = Math.max(3.5, width * 0.105);
    const wheelHeight = height * 0.18;
    drawWheel(-width * 0.54, height * 0.2, wheelWidth, wheelHeight);
    drawWheel(width * 0.54 - wheelWidth, height * 0.2, wheelWidth, wheelHeight);
    drawWheel(-width * 0.54, height * 0.68, wheelWidth, wheelHeight);
    drawWheel(width * 0.54 - wheelWidth, height * 0.68, wheelWidth, wheelHeight);

    const bodyGradient = context.createLinearGradient(-width / 2, 0, width / 2, height);
    bodyGradient.addColorStop(0, palette.bodyTop);
    bodyGradient.addColorStop(0.46, options.player ? '#080a0b' : palette.bodyBottom);
    bodyGradient.addColorStop(1, palette.bodyBottom);
    context.shadowColor = options.player ? 'rgba(240, 217, 149, 0.34)' : 'rgba(0, 0, 0, 0.45)';
    context.shadowBlur = options.player ? 16 : 8;
    context.fillStyle = bodyGradient;
    context.fill(bodyPath);
    context.shadowBlur = 0;
    context.strokeStyle = options.player ? '#d5b45f' : palette.edge;
    context.lineWidth = options.player ? 1.55 : 0.95;
    context.stroke(bodyPath);

    context.strokeStyle = options.player ? 'rgba(240, 217, 149, 0.34)' : 'rgba(229, 233, 229, 0.16)';
    context.lineWidth = Math.max(0.7, width * 0.014);
    context.beginPath();
    context.moveTo(-width * 0.28, height * 0.035);
    context.quadraticCurveTo(0, height * 0.008, width * 0.28, height * 0.035);
    context.moveTo(-width * 0.34, height * 0.955);
    context.quadraticCurveTo(0, height * 0.985, width * 0.34, height * 0.955);
    context.stroke();

    context.save();
    context.clip(bodyPath);
    const passingLight = context.createLinearGradient(-width / 2, 0, width / 2, height);
    passingLight.addColorStop(0, 'rgba(240, 217, 149, ' + streetLightIntensityAt(options.lightY || metrics.y + height / 2) + ')');
    passingLight.addColorStop(0.42, 'rgba(240, 217, 149, 0)');
    passingLight.addColorStop(1, 'rgba(138, 169, 174, 0.045)');
    context.fillStyle = passingLight;
    context.fillRect(-width / 2, 0, width, height);

    const lacquerHighlight = context.createLinearGradient(-width * 0.48, height * 0.08, width * 0.42, height * 0.86);
    lacquerHighlight.addColorStop(0, 'rgba(255, 255, 255, 0)');
    lacquerHighlight.addColorStop(0.35, options.player ? 'rgba(240, 217, 149, 0.13)' : 'rgba(224, 231, 230, 0.08)');
    lacquerHighlight.addColorStop(0.48, 'rgba(255, 255, 255, 0)');
    context.fillStyle = lacquerHighlight;
    context.fillRect(-width / 2, 0, width, height);
    context.restore();

    context.fillStyle = '#080b0d';
    context.beginPath();
    context.moveTo(-width * (isVan ? 0.36 : 0.29), height * (isVan ? 0.16 : isCompact ? 0.22 : 0.2));
    context.lineTo(width * (isVan ? 0.36 : 0.29), height * (isVan ? 0.16 : isCompact ? 0.22 : 0.2));
    context.lineTo(width * (isVan ? 0.38 : 0.34), height * (isVan ? 0.4 : isCompact ? 0.39 : 0.42));
    context.lineTo(-width * (isVan ? 0.38 : 0.34), height * (isVan ? 0.4 : isCompact ? 0.39 : 0.42));
    context.closePath();
    context.fill();

    const roofGradient = context.createLinearGradient(-width * 0.3, height * 0.39, width * 0.3, height * 0.54);
    roofGradient.addColorStop(0, options.player ? '#1d2020' : palette.bodyTop);
    roofGradient.addColorStop(0.52, options.player ? '#090b0c' : palette.bodyBottom);
    roofGradient.addColorStop(1, options.player ? '#171919' : palette.bodyTop);
    context.fillStyle = roofGradient;
    roundedRect(-width * (isVan ? 0.37 : isSuv ? 0.34 : 0.3), height * 0.38, width * (isVan ? 0.74 : isSuv ? 0.68 : 0.6), height * (isVan ? 0.18 : 0.16), width * 0.055);
    context.fill();
    context.strokeStyle = 'rgba(234, 238, 234, 0.1)';
    context.lineWidth = 0.7;
    context.stroke();

    const glassGradient = context.createLinearGradient(0, height * 0.2, 0, height * 0.78);
    glassGradient.addColorStop(0, 'rgba(158, 183, 188, 0.5)');
    glassGradient.addColorStop(0.34, 'rgba(24, 34, 37, 0.9)');
    glassGradient.addColorStop(1, 'rgba(5, 8, 10, 0.96)');
    context.fillStyle = glassGradient;
    context.beginPath();
    context.moveTo(-width * (isVan ? 0.37 : 0.31), height * (isVan ? 0.45 : isCompact ? 0.46 : 0.47));
    context.lineTo(width * (isVan ? 0.37 : 0.31), height * (isVan ? 0.45 : isCompact ? 0.46 : 0.47));
    context.lineTo(width * (isVan ? 0.35 : 0.27), height * (isVan ? 0.74 : isCompact ? 0.65 : 0.68));
    context.lineTo(-width * (isVan ? 0.35 : 0.27), height * (isVan ? 0.74 : isCompact ? 0.65 : 0.68));
    context.closePath();
    context.fill();
    context.strokeStyle = 'rgba(225, 231, 229, 0.18)';
    context.beginPath();
    context.moveTo(-width * 0.23, height * 0.22);
    context.lineTo(width * 0.17, height * 0.39);
    context.moveTo(-width * 0.23, height * 0.5);
    context.lineTo(width * 0.17, height * (isVan ? 0.7 : 0.65));
    context.stroke();

    context.strokeStyle = options.player ? 'rgba(240, 217, 149, 0.34)' : 'rgba(226, 232, 230, 0.12)';
    context.lineWidth = Math.max(0.65, width * 0.012);
    context.beginPath();
    context.moveTo(-width * 0.38, height * 0.48);
    context.lineTo(-width * 0.4, height * 0.82);
    context.moveTo(width * 0.38, height * 0.48);
    context.lineTo(width * 0.4, height * 0.82);
    if (isVan) {
      context.moveTo(-width * 0.28, height * 0.8);
      context.lineTo(width * 0.28, height * 0.8);
    } else if (!isCompact) {
      context.moveTo(-width * 0.3, height * 0.77);
      context.lineTo(width * 0.3, height * 0.77);
    }
    context.stroke();

    context.fillStyle = options.player ? 'rgba(255, 245, 213, 0.96)' : 'rgba(219, 224, 216, 0.34)';
    context.shadowColor = options.player ? 'rgba(243, 226, 176, 0.72)' : 'transparent';
    context.shadowBlur = options.player ? 8 : 0;
    roundedRect(-width * 0.29, height * 0.055, width * 0.2, height * 0.045, 1.5);
    context.fill();
    roundedRect(width * 0.09, height * 0.055, width * 0.2, height * 0.045, 1.5);
    context.fill();
    context.shadowBlur = 0;

    context.fillStyle = options.player ? 'rgba(174, 42, 31, 0.92)' : 'rgba(183, 49, 38, 0.96)';
    context.shadowColor = 'rgba(216, 50, 38, 0.72)';
    context.shadowBlur = options.player ? 4 : options.braking ? 13 : 5;
    if (options.braking) context.fillStyle = 'rgba(238, 68, 48, 1)';
    roundedRect(-width * 0.31, height * 0.9, width * 0.18, height * 0.05, 1.5);
    context.fill();
    roundedRect(width * 0.13, height * 0.9, width * 0.18, height * 0.05, 1.5);
    context.fill();
    context.shadowBlur = 0;

    if (isVan || isSuv) {
      context.strokeStyle = isSuv ? 'rgba(220, 225, 221, 0.22)' : 'rgba(220, 225, 221, 0.12)';
      context.lineWidth = Math.max(0.7, width * 0.014);
      context.beginPath();
      context.moveTo(-width * 0.31, height * 0.2);
      context.lineTo(-width * 0.31, height * 0.78);
      context.moveTo(width * 0.31, height * 0.2);
      context.lineTo(width * 0.31, height * 0.78);
      context.stroke();
    }

    if (isCompact) {
      context.strokeStyle = 'rgba(225, 231, 227, 0.18)';
      context.lineWidth = 0.8;
      context.beginPath();
      context.moveTo(-width * 0.29, height * 0.79);
      context.quadraticCurveTo(0, height * 0.84, width * 0.29, height * 0.79);
      context.stroke();
    }

    context.strokeStyle = options.player ? 'rgba(213, 180, 95, 0.52)' : 'rgba(221, 226, 222, 0.14)';
    context.lineWidth = Math.max(0.6, width * 0.012);
    context.beginPath();
    context.moveTo(-width * 0.3, height * 0.16);
    context.lineTo(-width * 0.35, height * 0.39);
    context.moveTo(width * 0.3, height * 0.16);
    context.lineTo(width * 0.35, height * 0.39);
    context.moveTo(-width * 0.36, height * 0.73);
    context.lineTo(width * 0.36, height * 0.73);
    context.stroke();

    context.fillStyle = options.player ? '#d5b45f' : palette.edge;
    context.beginPath();
    context.ellipse(-width * 0.52, height * 0.4, width * 0.08, height * 0.045, 0, 0, Math.PI * 2);
    context.ellipse(width * 0.52, height * 0.4, width * 0.08, height * 0.045, 0, 0, Math.PI * 2);
    context.fill();

    if (options.player) {
      context.strokeStyle = 'rgba(213, 180, 95, 0.82)';
      context.lineWidth = Math.max(1, width * 0.028);
      context.beginPath();
      context.moveTo(-width * 0.4, height * 0.54);
      context.lineTo(-width * 0.37, height * 0.84);
      context.moveTo(width * 0.4, height * 0.54);
      context.lineTo(width * 0.37, height * 0.84);
      context.stroke();
      roundedRect(-width * 0.19, height * 0.425, width * 0.38, height * 0.098, 2.5);
      context.fillStyle = '#17130b';
      context.fill();
      roundedRect(-width * 0.17, height * 0.435, width * 0.34, height * 0.078, 2);
      context.fillStyle = '#f0d995';
      context.shadowColor = 'rgba(240, 217, 149, 0.8)';
      context.shadowBlur = 10;
      context.fill();
      context.shadowBlur = 0;
      context.fillStyle = '#15120a';
      context.font = '800 ' + Math.max(5.5, width * 0.095) + 'px sans-serif';
      context.textAlign = 'center';
      context.fillText('TAXI', 0, height * 0.494);
    }
    context.restore();
  }

  function getPlayerMetrics() {
    const width = clamp(state.width * 0.16, 54, 76);
    const height = width * 1.62;
    const centerY = state.height * 0.79 + (state.crashed ? 7 : 0);
    return { x: state.taxiX - width / 2, y: centerY - height / 2, width: width, height: height };
  }

  function scaleVehicleMetrics(metrics, scale) {
    const width = metrics.width * scale;
    const height = metrics.height * scale;
    return {
      x: metrics.x + (metrics.width - width) / 2,
      y: metrics.y + (metrics.height - height) / 2,
      width: width,
      height: height
    };
  }

  function getPlayerVisualMetrics() {
    return scaleVehicleMetrics(getPlayerMetrics(), state.width < 520 ? 1.08 : 1.13);
  }

  function getTrafficMetrics(obstacle, yPosition) {
    const y = typeof yPosition === 'number' ? yPosition : obstacle.y;
    const spec = trafficSpecs[obstacle.type] || trafficSpecs.sedan;
    const progress = clamp(y / state.height, 0, 1);
    const scale = 0.28 + progress * 0.86;
    const width = spec.width * scale;
    const height = spec.height * scale;
    return { x: laneCenter(obstacle.lane, y) - width / 2, y: y - height / 2, width: width, height: height };
  }

  function getTrafficVisualMetrics(obstacle, yPosition) {
    const typeScale = obstacle.type === 'van' ? 1.11 : obstacle.type === 'suv' ? 1.105 : (obstacle.type === 'compact' || obstacle.type === 'hatchback') ? 1.08 : 1.1;
    const mobileScale = state.width < 520 ? 0.97 : 1;
    return scaleVehicleMetrics(getTrafficMetrics(obstacle, yPosition), typeScale * mobileScale);
  }

  function getVehicleHitbox(metrics) {
    return {
      left: metrics.x + metrics.width * 0.2,
      right: metrics.x + metrics.width * 0.8,
      top: metrics.y + metrics.height * 0.09,
      bottom: metrics.y + metrics.height * 0.91
    };
  }

  function hitboxesOverlap(first, second) {
    return first.left < second.right && first.right > second.left && first.top < second.bottom && first.bottom > second.top;
  }

  function horizontalHitboxGap(first, second) {
    if (first.right <= second.left) return second.left - first.right;
    if (second.right <= first.left) return first.left - second.right;
    return 0;
  }

  function drawObstacle(obstacle) {
    const spec = trafficVisualSpecs[obstacle.type] || trafficVisualSpecs.sedan;
    const spawnAlpha = clamp((obstacle.y + 65) / (state.height * 0.13 + 65), 0, 1);
    context.save();
    context.globalAlpha = spawnAlpha;
    drawVehicle(getTrafficVisualMetrics(obstacle), {
      spec: spec,
      palette: trafficPalettes[obstacle.palette % trafficPalettes.length],
      player: false,
      type: obstacle.type,
      braking: !reduceDecorativeMotion && (state.elapsed + (obstacle.brakePhase || 0)) % 5.8 < 0.42
    });
    context.restore();
  }

  function drawTarget() {
    if (!state.target) return;
    const target = state.target;
    const x = laneCenter(target.lane, target.y);
    const scale = 0.65 + Math.max(0, target.y / state.height) * 0.45;
    const reveal = clamp((target.y + 65) / (state.height * 0.13 + 65), 0, 1);
    context.save();
    context.globalAlpha = reveal;

    if (target.type === 'pickup') {
      const approach = clamp(target.y / Math.max(1, state.height * 0.78), 0, 1);
      const pulse = reduceDecorativeMotion ? 0.5 : (Math.sin(state.visualTime * (4.4 + approach * 2.2)) + 1) / 2;
      const pulseStrength = 0.52 + pulse * (0.18 + approach * 0.22);
      const beam = context.createLinearGradient(0, target.y - 92 * scale, 0, target.y + 18 * scale);
      beam.addColorStop(0, 'rgba(240, 217, 149, 0)');
      beam.addColorStop(0.68, 'rgba(240, 217, 149, ' + (0.06 + pulseStrength * 0.1) + ')');
      beam.addColorStop(1, 'rgba(240, 217, 149, 0)');
      context.fillStyle = beam;
      context.fillRect(x - 5 * scale, target.y - 92 * scale, 10 * scale, 110 * scale);

      context.save();
      context.translate(x, target.y + 5 * scale);
      context.scale(1, 0.28);
      const groundGlow = context.createRadialGradient(0, 0, 0, 0, 0, 34 * scale);
      groundGlow.addColorStop(0, 'rgba(240, 217, 149, ' + (0.15 + pulseStrength * 0.09) + ')');
      groundGlow.addColorStop(0.55, 'rgba(240, 217, 149, 0.055)');
      groundGlow.addColorStop(1, 'rgba(240, 217, 149, 0)');
      context.fillStyle = groundGlow;
      context.beginPath();
      context.arc(0, 0, 34 * scale, 0, Math.PI * 2);
      context.fill();
      context.restore();

      context.shadowColor = 'rgba(240, 217, 149, 0.62)';
      context.shadowBlur = (9 + approach * 7) * scale;
      context.strokeStyle = 'rgba(240, 217, 149, ' + (0.56 + pulseStrength * 0.28) + ')';
      context.lineWidth = 1.8 * scale;
      context.beginPath();
      context.moveTo(x, target.y - 44 * scale);
      context.lineTo(x, target.y + 7 * scale);
      context.stroke();
      context.fillStyle = '#f0d995';
      context.beginPath();
      context.moveTo(x, target.y - 18 * scale);
      context.lineTo(x + 8 * scale, target.y - 8 * scale);
      context.lineTo(x, target.y + 2 * scale);
      context.lineTo(x - 8 * scale, target.y - 8 * scale);
      context.closePath();
      context.fill();
      context.font = Math.max(9, 11 * scale) + 'px sans-serif';
      context.textAlign = 'center';
      context.shadowColor = 'rgba(0, 0, 0, 0.9)';
      context.shadowBlur = 6;
      context.fillText('ABHOLUNG', x, target.y - 54 * scale);
      context.restore();
      return;
    }

    const gateWidth = 54 * scale;
    context.save();
    context.translate(x, target.y + 20 * scale);
    context.scale(1, 0.28);
    const destinationGlow = context.createRadialGradient(0, 0, 0, 0, 0, 34 * scale);
    destinationGlow.addColorStop(0, 'rgba(240, 217, 149, 0.2)');
    destinationGlow.addColorStop(0.58, 'rgba(240, 217, 149, 0.06)');
    destinationGlow.addColorStop(1, 'rgba(240, 217, 149, 0)');
    context.fillStyle = destinationGlow;
    context.beginPath();
    context.arc(0, 0, 34 * scale, 0, Math.PI * 2);
    context.fill();
    context.restore();
    context.shadowColor = 'rgba(240, 217, 149, 0.48)';
    context.shadowBlur = 11 * scale;
    context.strokeStyle = '#f0d995';
    context.lineWidth = 2.2 * scale;
    context.beginPath();
    context.moveTo(x - gateWidth / 2, target.y + 21 * scale);
    context.lineTo(x - gateWidth / 2, target.y - 25 * scale);
    context.lineTo(x + gateWidth / 2, target.y - 25 * scale);
    context.lineTo(x + gateWidth / 2, target.y + 21 * scale);
    context.stroke();
    context.fillStyle = '#f0d995';
    context.beginPath();
    context.moveTo(x - gateWidth * 0.18, target.y - 25 * scale);
    context.lineTo(x + gateWidth * 0.18, target.y - 25 * scale);
    context.lineTo(x, target.y - 13 * scale);
    context.closePath();
    context.fill();
    context.fillStyle = '#f0d995';
    context.font = Math.max(10, 12 * scale) + 'px sans-serif';
    context.textAlign = 'center';
    context.shadowColor = 'rgba(0, 0, 0, 0.9)';
    context.shadowBlur = 6;
    context.fillText('ZIEL', x, target.y + 39 * scale);
    context.restore();
  }

  function drawTaxi() {
    const metrics = getPlayerVisualMetrics();
    const centerX = metrics.x + metrics.width / 2;
    const centerY = metrics.y + metrics.height / 2;
    context.save();
    context.translate(centerX + state.steeringTilt * 1.8, centerY + Math.abs(state.steeringTilt) * 0.8);
    context.rotate(state.steeringTilt * 0.055);
    context.transform(1, state.steeringTilt * 0.012, -state.steeringTilt * 0.018, 1, 0, 0);
    drawVehicle({ x: -metrics.width / 2, y: -metrics.height / 2, width: metrics.width, height: metrics.height }, {
      spec: trafficSpecs.sedan,
      palette: { bodyTop: '#292a29', bodyBottom: '#050606', edge: '#d5b45f' },
      player: true,
      type: 'player',
      lightY: centerY
    });
    context.restore();
  }

  function drawSuccessPulse() {
    if (state.successPulseUntil <= state.elapsed) return;
    const duration = 0.42;
    const progress = clamp(1 - (state.successPulseUntil - state.elapsed) / duration, 0, 1);
    const metrics = getPlayerVisualMetrics();
    const x = metrics.x + metrics.width / 2;
    const y = metrics.y + metrics.height / 2;
    const radius = metrics.width * (0.62 + progress * 0.7);
    context.save();
    context.strokeStyle = 'rgba(240, 217, 149, ' + (0.8 * (1 - progress)) + ')';
    context.lineWidth = 3 * (1 - progress * 0.55);
    context.shadowColor = 'rgba(240, 217, 149, 0.72)';
    context.shadowBlur = 18;
    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.stroke();
    context.restore();
  }

  function render() {
    if (!state.width || !state.height) return;
    drawRoad();
    drawHeadlightCone();
    drawTarget();
    state.obstacles.forEach(drawObstacle);
    drawTaxi();
    drawSuccessPulse();

    if (state.crashed) {
      context.fillStyle = 'rgba(240, 217, 149, 0.12)';
      context.fillRect(0, 0, state.width, state.height);
    }
    drawVignette();
  }

  function resizeCanvas() {
    const bounds = canvas.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return;
    state.pixelRatio = Math.min(2, window.devicePixelRatio || 1);
    state.width = bounds.width;
    state.height = bounds.height;
    canvas.width = Math.round(bounds.width * state.pixelRatio);
    canvas.height = Math.round(bounds.height * state.pixelRatio);
    context.setTransform(state.pixelRatio, 0, 0, state.pixelRatio, 0, 0);
    state.taxiX = laneCenter(state.taxiLane, state.height * 0.79);
    render();
  }

  function nextSafeLane(protectedLane, pressure) {
    if (protectedLane >= 0) return protectedLane;
    const candidates = [state.safeLane - 1, state.safeLane + 1].filter(function (lane) {
      return lane >= 0 && lane <= 2;
    });
    if (!candidates.length || Math.random() >= 0.16 + pressure * 0.58) return state.safeLane;
    return candidates[Math.floor(Math.random() * candidates.length)];
  }

  function nextTrafficDelay() {
    const pressure = calculateTrafficPressure();
    return 1.38 - pressure * 0.46 + Math.random() * (0.38 - pressure * 0.16);
  }

  function spawnObstacle() {
    const pressure = calculateTrafficPressure();
    const speedIntensity = clamp((state.speedMultiplier - 1) / (maxSpeedMultiplier - 1), 0, 1);
    const spawnY = -90 - state.height * 0.28 * speedIntensity;
    const fastestTrafficFactor = 0.94 - pressure * 0.1;
    const reactionTime = 1.12 - pressure * 0.16;
    const minimumRowGap = Math.max(
      state.height * 0.18,
      spawnY + baseWorldSpeed * state.speedMultiplier * fastestTrafficFactor * reactionTime
    );
    if (state.obstacles.some(function (obstacle) { return obstacle.y < minimumRowGap; })) {
      state.obstacleTimer = 0.18;
      return;
    }

    const protectedLane = state.target && state.target.y < state.height * 0.58 ? state.target.lane : -1;
    state.safeLane = nextSafeLane(protectedLane, pressure);
    const blockedLanes = [0, 1, 2].filter(function (lane) { return lane !== state.safeLane; });
    const pairedWave = getDifficultyPhase() !== 'relaxed' && Math.random() < 0.04 + pressure * 0.32;
    const lanes = pairedWave ? blockedLanes : [blockedLanes[Math.floor(Math.random() * blockedLanes.length)]];
    const minimumSpeedFactor = 0.8 - pressure * 0.22;
    const maximumSpeedFactor = 0.94 - pressure * 0.1;
    lanes.forEach(function (lane) {
      state.obstacles.push({
        lane: lane,
        y: spawnY,
        speedFactor: minimumSpeedFactor + Math.random() * (maximumSpeedFactor - minimumSpeedFactor),
        type: trafficTypes[Math.floor(Math.random() * trafficTypes.length)],
        palette: Math.floor(Math.random() * trafficPalettes.length),
        brakePhase: Math.random() * 5.8,
        resolved: false
      });
    });
    state.obstacleTimer = nextTrafficDelay();
  }

  function spawnTarget(type) {
    const speedIntensity = clamp((state.speedMultiplier - 1) / (maxSpeedMultiplier - 1), 0, 1);
    const blockedLanes = state.obstacles
      .filter(function (obstacle) { return obstacle.y < state.height * 0.3; })
      .map(function (obstacle) { return obstacle.lane; });
    const availableLanes = [0, 1, 2].filter(function (lane) { return !blockedLanes.includes(lane); });
    const lane = availableLanes.length
      ? availableLanes[Math.floor(Math.random() * availableLanes.length)]
      : state.safeLane;
    state.safeLane = lane;
    state.target = {
      type: type,
      lane: lane,
      y: -60 - state.height * 0.24 * speedIntensity,
      speedFactor: 0.86 - speedIntensity * 0.1,
      resolved: false
    };
  }

  function updateObstacles(deltaTime, speed) {
    state.obstacleTimer -= deltaTime;
    if (state.obstacleTimer <= 0) spawnObstacle();

    const playerHitbox = getVehicleHitbox(getPlayerMetrics());
    for (let index = 0; index < state.obstacles.length; index += 1) {
      const obstacle = state.obstacles[index];
      const previousY = obstacle.y;
      obstacle.y += speed * obstacle.speedFactor * deltaTime;
      const previousHitbox = getVehicleHitbox(getTrafficMetrics(obstacle, previousY));
      const currentHitbox = getVehicleHitbox(getTrafficMetrics(obstacle));
      const sweptHitbox = {
        left: Math.min(previousHitbox.left, currentHitbox.left),
        right: Math.max(previousHitbox.right, currentHitbox.right),
        top: Math.min(previousHitbox.top, currentHitbox.top),
        bottom: Math.max(previousHitbox.bottom, currentHitbox.bottom)
      };
      if (hitboxesOverlap(playerHitbox, sweptHitbox)) {
        triggerCrash();
        return true;
      }
      if (!obstacle.resolved && currentHitbox.top > playerHitbox.bottom) {
        obstacle.resolved = true;
        const nearMissGap = horizontalHitboxGap(playerHitbox, currentHitbox);
        const nearMissThreshold = clamp(state.width * 0.018, 9, 24);
        if (nearMissGap > 0 && nearMissGap <= nearMissThreshold) {
          state.score += 75;
          showEvent('Knapp vorbei · +75', 760);
          announce('Knapp vorbei. 75 Spielscore-Bonuspunkte.');
        }
        state.score += 35;
      }
    }
    state.obstacles = state.obstacles.filter(function (obstacle) { return obstacle.y < state.height + 110; });
    return false;
  }

  function update(deltaTime) {
    state.elapsed += deltaTime;
    state.speedMultiplier = calculateSpeedMultiplier();
    state.maxSpeedMultiplier = Math.max(state.maxSpeedMultiplier, state.speedMultiplier);
    const speed = baseWorldSpeed * state.speedMultiplier;
    state.visualTime += deltaTime;
    state.worldDistance += speed * deltaTime;
    state.roadOffset = (state.roadOffset + speed * deltaTime) % (state.height + 110);
    state.score += deltaTime * 16 * state.speedMultiplier;

    const targetX = laneCenter(state.taxiLane, state.height * 0.79);
    const previousTaxiX = state.taxiX;
    state.taxiX += (targetX - state.taxiX) * Math.min(1, deltaTime * 11);
    const horizontalMotion = (state.taxiX - previousTaxiX) / Math.max(1, state.width * 0.045);
    const desiredTilt = clamp(horizontalMotion * 0.82 + state.steeringInput * 0.24, -1, 1);
    const steeringResponse = Math.abs(desiredTilt) > Math.abs(state.steeringTilt) ? 12 : 7;
    state.steeringTilt += (desiredTilt - state.steeringTilt) * Math.min(1, deltaTime * steeringResponse);

    if (!state.target && state.elapsed >= state.targetReadyAt) {
      spawnTarget(state.passengerOnBoard ? 'destination' : 'pickup');
    }

    const taxiY = state.height * 0.79;
    if (state.target) {
      state.target.y += speed * state.target.speedFactor * deltaTime;
      const target = state.target;
      if (!target.resolved && target.y >= taxiY - 20) {
        target.resolved = true;
        const reached = Math.abs(laneCenter(target.lane, target.y) - state.taxiX) < state.width * 0.13;
        if (reached && target.type === 'pickup') {
          state.passengerOnBoard = true;
          state.score += 200;
          state.target = null;
          state.targetReadyAt = state.elapsed + 0.9;
          state.successPulseUntil = state.elapsed + 0.42;
          showEvent('Fahrgast an Bord', 900);
          announce('Fahrgast an Bord. Fahre jetzt sicher zum Ziel.');
        } else if (reached && target.type === 'destination') {
          const previousSpeed = state.speedMultiplier;
          state.score += 500;
          state.trips += 1;
          state.passengerOnBoard = false;
          state.target = null;
          state.targetReadyAt = state.elapsed + 1.1;
          state.speedMultiplier = calculateSpeedMultiplier();
          state.successPulseUntil = state.elapsed + 0.42;
          showEvent('Fahrt abgeschlossen · +500', 1000);
          if (state.speedMultiplier > previousSpeed + 0.04) {
            window.clearTimeout(state.feedbackTimer);
            state.feedbackTimer = window.setTimeout(function () {
              if (state.mode === 'running') showEvent('Tempo ' + state.speedMultiplier.toFixed(1) + '×', 850);
            }, 760);
          }
          announce('Fahrt abgeschlossen. 500 Spielscore-Bonuspunkte. Die nächste Abholung folgt.');
        }
      }
      if (state.target && state.target.y > state.height + 80) {
        state.target = null;
        state.targetReadyAt = state.elapsed + 1.1;
      }
    }

    if (updateObstacles(deltaTime, speed)) return;
    updateHud(false);
  }

  function frame(timestamp) {
    if (state.mode !== 'running') return;
    const deltaTime = Math.min(0.04, Math.max(0, (timestamp - state.lastTime) / 1000));
    state.lastTime = timestamp;
    update(deltaTime);
    render();
    if (state.mode === 'running') state.frameRequest = window.requestAnimationFrame(frame);
  }

  function resetRound() {
    window.cancelAnimationFrame(state.frameRequest);
    window.clearTimeout(state.crashTimer);
    window.clearTimeout(state.countdownTimer);
    state.elapsed = 0;
    state.score = 0;
    state.displayedScore = -1;
    state.displayedSpeed = '';
    state.trips = 0;
    state.speedMultiplier = 1;
    state.maxSpeedMultiplier = 1;
    state.taxiLane = 1;
    state.taxiX = laneCenter(1, state.height * 0.79);
    state.steeringInput = 0;
    state.steeringTilt = 0;
    window.clearTimeout(state.steeringReleaseTimer);
    state.roadOffset = 0;
    state.worldDistance = 0;
    state.visualTime = 0;
    state.ambientLastTime = 0;
    state.obstacles = [];
    state.obstacleTimer = 1.4;
    state.safeLane = 1;
    state.target = null;
    state.targetReadyAt = 1.2;
    state.passengerOnBoard = false;
    state.successPulseUntil = 0;
    state.crashed = false;
    window.clearTimeout(state.eventTimer);
    window.clearTimeout(state.feedbackTimer);
    eventNode.hidden = true;
    countdownPanel.hidden = true;
    countdownPanel.setAttribute('aria-hidden', 'true');
    recordNode.hidden = true;
    recordGapNode.hidden = true;
    exitConfirmPanel.hidden = true;
    root.classList.remove('is-crashing');
    setControlsDisabled(false);
    updateHud(true);
  }

  function beginRunningRound() {
    if (state.mode !== 'countdown') return;
    countdownPanel.hidden = true;
    countdownPanel.setAttribute('aria-hidden', 'true');
    setControlsDisabled(false);
    setMode('running');
    state.lastTime = performance.now();
    canvas.focus({ preventScroll: true });
    announce('Taxi Rush gestartet. Steuere mit den Pfeiltasten oder A und D.');
    state.frameRequest = window.requestAnimationFrame(frame);
  }

  function showCountdownStep(index) {
    const steps = ['3', '2', '1', 'LOS'];
    if (state.mode !== 'countdown') return;
    if (index >= steps.length) {
      beginRunningRound();
      return;
    }
    countdownValueNode.textContent = steps[index];
    countdownValueNode.classList.remove('is-active');
    void countdownValueNode.offsetWidth;
    countdownValueNode.classList.add('is-active');
    state.countdownTimer = window.setTimeout(function () {
      showCountdownStep(index + 1);
    }, 400);
  }

  function startRound() {
    enterFocusMode();
    resetRound();
    startPanel.hidden = true;
    resultPanel.hidden = true;
    pausePanel.hidden = true;
    countdownPanel.hidden = false;
    countdownPanel.setAttribute('aria-hidden', 'false');
    setControlsDisabled(true);
    setMode('countdown');
    resizeCanvas();
    showCountdownStep(0);
    announce('Taxi Rush startet. Countdown 3, 2, 1.');
  }

  function exitGame() {
    window.cancelAnimationFrame(state.frameRequest);
    window.clearTimeout(state.countdownTimer);
    resetRound();
    setMode('idle');
    startPanel.hidden = false;
    resultPanel.hidden = true;
    pausePanel.hidden = true;
    leaveFocusMode();
    startButton.focus({ preventScroll: true });
    announce('Taxi Rush beendet.');
    startAmbientScene();
  }

  function requestExit() {
    if (state.mode !== 'running') {
      exitGame();
      return;
    }
    window.cancelAnimationFrame(state.frameRequest);
    setMode('exit-confirm');
    setControlsDisabled(true);
    exitConfirmPanel.hidden = false;
    resumeButton.focus({ preventScroll: true });
    announce('Taxi Rush pausiert. Runde verlassen?');
  }

  function resumeGame() {
    if (state.mode !== 'exit-confirm') return;
    exitConfirmPanel.hidden = true;
    setControlsDisabled(false);
    setMode('running');
    state.lastTime = performance.now();
    canvas.focus({ preventScroll: true });
    state.frameRequest = window.requestAnimationFrame(frame);
    announce('Taxi Rush fortgesetzt.');
  }

  function ambientFrame(timestamp) {
    if (state.mode !== 'idle') return;
    const deltaTime = state.ambientLastTime
      ? Math.min(0.04, Math.max(0, (timestamp - state.ambientLastTime) / 1000))
      : 0;
    state.ambientLastTime = timestamp;
    state.visualTime += deltaTime;
    state.worldDistance += baseWorldSpeed * 0.1 * deltaTime;
    state.roadOffset = (state.roadOffset + baseWorldSpeed * 0.1 * deltaTime) % (state.height + 110);
    render();
    state.frameRequest = window.requestAnimationFrame(ambientFrame);
  }

  function startAmbientScene() {
    window.cancelAnimationFrame(state.frameRequest);
    state.ambientLastTime = 0;
    if (state.mode === 'idle' && !reduceDecorativeMotion) {
      state.frameRequest = window.requestAnimationFrame(ambientFrame);
    } else {
      render();
    }
  }

  function triggerCrash() {
    if (state.mode !== 'running') return;
    window.cancelAnimationFrame(state.frameRequest);
    setMode('ended');
    setControlsDisabled(true);
    state.crashed = true;
    root.classList.add('is-crashing');
    showEvent('Kollision', crashFeedbackDuration);
    const finalScore = Math.max(0, Math.floor(state.score));
    const isNewRecord = finalScore > state.bestScore;
    if (isNewRecord) {
      state.bestScore = finalScore;
      saveBestScore(finalScore);
    }
    verdictNode.textContent = 'Kollision';
    finalScoreNode.textContent = formatLargeScore(finalScore);
    bestNode.textContent = formatLargeScore(state.bestScore);
    recordNode.hidden = !isNewRecord;
    const scoreToRecord = state.bestScore - finalScore;
    recordGapNode.hidden = isNewRecord || scoreToRecord <= 0;
    recordGapNode.textContent = scoreToRecord > 0 ? formatLargeScore(scoreToRecord) + ' bis zum Rekord' : '';
    finalTripsNode.textContent = String(state.trips);
    finalTimeNode.textContent = formatTime(state.elapsed);
    finalSpeedNode.textContent = state.maxSpeedMultiplier.toFixed(1) + '×';
    render();
    state.crashTimer = window.setTimeout(function () {
      root.classList.remove('is-crashing');
      state.crashed = false;
      render();
      const scrollLeft = window.scrollX;
      const scrollTop = window.scrollY;
      resultPanel.hidden = false;
      restartButton.focus({ preventScroll: true });
      window.scrollTo({ left: scrollLeft, top: scrollTop, behavior: 'instant' });
      announce('Kollision. Runde beendet. Dein Spielscore ist ' + finalScore + '.');
    }, crashFeedbackDuration);
  }

  function steer(direction) {
    if (state.mode !== 'running') return;
    state.steeringInput = direction;
    window.clearTimeout(state.steeringReleaseTimer);
    state.steeringReleaseTimer = window.setTimeout(function () {
      state.steeringInput = 0;
    }, 180);
    state.taxiLane = Math.max(0, Math.min(2, state.taxiLane + direction));
  }

  function handleKeydown(event) {
    if (event.key === 'Escape' && state.focusActive) {
      event.preventDefault();
      if (state.mode === 'exit-confirm') resumeGame();
      else requestExit();
      return;
    }
    if (state.mode !== 'running') return;
    const key = event.key.toLowerCase();
    if (key === 'arrowleft' || key === 'a') {
      event.preventDefault();
      steer(-1);
    } else if (key === 'arrowright' || key === 'd') {
      event.preventDefault();
      steer(1);
    }
  }

  function handleKeyup(event) {
    const key = event.key.toLowerCase();
    if (key === 'arrowleft' || key === 'a' || key === 'arrowright' || key === 'd') {
      state.steeringInput = 0;
    }
  }

  function handleVisibilityChange() {
    if (document.hidden && state.mode === 'running') {
      window.cancelAnimationFrame(state.frameRequest);
      setMode('paused');
      pausePanel.hidden = false;
      return;
    }
    if (!document.hidden && state.mode === 'paused') {
      pausePanel.hidden = true;
      setMode('running');
      state.lastTime = performance.now();
      state.frameRequest = window.requestAnimationFrame(frame);
    }
  }

  startButton.addEventListener('click', startRound);
  restartButton.addEventListener('click', startRound);
  exitButtons.forEach(function (button) {
    button.addEventListener('click', requestExit);
  });
  resumeButton.addEventListener('click', resumeGame);
  confirmedExitButton.addEventListener('click', exitGame);
  document.addEventListener('keydown', handleKeydown);
  document.addEventListener('keyup', handleKeyup);
  document.addEventListener('visibilitychange', handleVisibilityChange);

  directionButtons.forEach(function (button) {
    button.addEventListener('pointerdown', function (event) {
      event.preventDefault();
      steer(button.dataset.taxiRushDirection === 'left' ? -1 : 1);
      canvas.focus({ preventScroll: true });
    });
    button.addEventListener('click', function (event) {
      if (event.detail !== 0) return;
      steer(button.dataset.taxiRushDirection === 'left' ? -1 : 1);
    });
    button.addEventListener('pointerup', function () {
      state.steeringInput = 0;
    });
    button.addEventListener('pointercancel', function () {
      state.steeringInput = 0;
    });
  });

  if ('ResizeObserver' in window) {
    new ResizeObserver(resizeCanvas).observe(canvas);
  } else {
    window.addEventListener('resize', resizeCanvas);
  }

  bestNode.textContent = formatLargeScore(state.bestScore);
  updateHud(true);
  resizeCanvas();
  startAmbientScene();
})();
