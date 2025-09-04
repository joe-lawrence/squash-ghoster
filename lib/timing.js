/**
 * Timing module for squash workout definitions.
 *
 * This module provides pure functions for:
 * - Calculating workout timing
 * - Managing intervals and offsets
 * - Converting time formats
 * - Timeline event timing
 */

/**
 * Converts seconds to a human-readable time string.
 */
export function secondsToTimeStr(seconds, precise = false, highPrecision = false) {
  if (typeof seconds !== 'number' || seconds < 0) {
    return precise ? '00:00.00' : '00:00';
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  if (precise) {
    const milliseconds = Math.floor((remainingSeconds % 1) * 100);
    return `${minutes.toString().padStart(2, '0')}:${Math.floor(remainingSeconds).toString().padStart(2, '0')}.${milliseconds.toString().padStart(2, '0')}`;
  }

  if (highPrecision) {
    const milliseconds = Math.floor((remainingSeconds % 1) * 1000);
    return `${minutes.toString().padStart(2, '0')}:${Math.floor(remainingSeconds).toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;
  }

  return `${minutes.toString().padStart(2, '0')}:${Math.floor(remainingSeconds).toString().padStart(2, '0')}`;
}

/**
 * Converts a time string to seconds.
 */
export function timeStrToSeconds(timeStr) {
  if (typeof timeStr === 'number') {
    return timeStr;
  }
  
  if (typeof timeStr !== 'string') {
    return 0;
  }

  // Handle MM:SS.MS format (e.g., "01:30.50")
  const matchWithMs = timeStr.match(/^(\d+):(\d+)\.(\d+)$/);
  if (matchWithMs) {
    const minutes = parseInt(matchWithMs[1], 10);
    const seconds = parseInt(matchWithMs[2], 10);
    const milliseconds = parseInt(matchWithMs[3], 10);
    return minutes * 60 + seconds + milliseconds / 100;
  }

  // Handle MM:SS format (e.g., "01:30")
  const matchWithoutMs = timeStr.match(/^(\d+):(\d+)$/);
  if (matchWithoutMs) {
    const minutes = parseInt(matchWithoutMs[1], 10);
    const seconds = parseInt(matchWithoutMs[2], 10);
    return minutes * 60 + seconds;
  }

  return 0;
}

/**
 * Parses a duration string (e.g., "5s", "2.5s") to seconds.
 */
export function parseDuration(durationStr) {
  if (typeof durationStr !== 'string') {
    return 0;
  }

  const match = durationStr.match(/^(\d+(?:\.\d+)?)s$/);
  if (!match) {
    return 0;
  }

  return parseFloat(match[1]);
}

/**
 * Calculates the effective interval for a shot or message.
 */
export function calculateEffectiveInterval(baseInterval, offsetConfig, offsetType) {
  if (typeof baseInterval !== 'number' || baseInterval < 0) {
    return 0;
  }

  if (!offsetConfig) {
    return baseInterval;
  }

  if (offsetType === 'fixed') {
    const fixedOffset = offsetConfig.min || 0;
    return baseInterval + fixedOffset;
  }

  if (offsetType === 'random') {
    const min = offsetConfig.min || 0;
    const max = offsetConfig.max || 0;
    const range = max - min;
    const randomOffset = Math.random() * range + min;
    return baseInterval + randomOffset;
  }

  return baseInterval;
}

/**
 * Calculates message timing including TTS duration.
 */
export function calculateMessageTiming(message, config, startTime) {
  const baseInterval = config.interval || 5.0;
  const speechRate = config.speechRate || 1.0;

  // Estimate TTS duration (rough approximation: 150 words per minute)
  const wordCount = message.split(/\s+/).length;
  const ttsDuration = ((wordCount / 150) * 60) / speechRate;

  const effectiveInterval = calculateEffectiveInterval(
    baseInterval,
    config.intervalOffset,
    config.intervalOffsetType,
  );

  const messageStartTime = startTime;
  const ttsEndTime = messageStartTime + ttsDuration;
  
  // Calculate message end time based on intervalType
  const intervalType = config.intervalType || 'fixed'; // Default to "fixed" for backward compatibility
  let messageEndTime;
  
  if (intervalType === 'fixed') {
    // Fixed: total duration is max(TTS duration, interval value)
    messageEndTime = messageStartTime + Math.max(ttsDuration, effectiveInterval);
  } else {
    // Additional: total duration is TTS duration + interval value
    messageEndTime = ttsEndTime + effectiveInterval;
  }

  return {
    messageStartTime,
    ttsEndTime,
    messageEndTime,
    ttsDuration,
    effectiveInterval,
  };
}

/**
 * Calculates shot timing with announcement lead time.
 */
export function calculateShotTiming(shotName, config, startTime) {
  const baseInterval = config.interval || 5.0;
  const leadTime = config.shotAnnouncementLeadTime || 2.5;

  const effectiveInterval = calculateEffectiveInterval(
    baseInterval,
    config.intervalOffset,
    config.intervalOffsetType,
  );

  const announcementStartTime = startTime;
  const shotStartTime = announcementStartTime + leadTime;
  const shotEndTime = shotStartTime + effectiveInterval;

  return {
    announcementStartTime,
    shotStartTime,
    shotEndTime,
    leadTime,
    effectiveInterval,
  };
}

/**
 * Calculates pattern timing based on iteration type and limits.
 */
export function calculatePatternTiming(pattern, config, startTime) {
  const limits = config.limits || { type: 'all-shots' };

  let totalDuration = 0;
  let totalShots = 0;
  const entryTimings = [];

  // Calculate timing for each entry
  for (const entry of pattern.entries) {
    const entryConfig = entry.config || {};
    let entryDuration = 0;
    let entryShots = 1;

    if (entry.type === 'Shot') {
      const shotTiming = calculateShotTiming(entry.name, entryConfig, startTime + totalDuration);
      entryDuration = shotTiming.shotEndTime - shotTiming.announcementStartTime;
      entryShots = entryConfig.repeatCount || 1;
    } else if (entry.type === 'Message') {
      const messageText = entry.config?.message || entry.name || 'Message';
      const messageTiming = calculateMessageTiming(
        messageText,
        entryConfig,
        startTime + totalDuration,
      );
      entryDuration = messageTiming.messageEndTime - messageTiming.messageStartTime;
      entryShots = 0; // Messages don't count as shots
    }

    entryTimings.push({
      entry,
      startTime: startTime + totalDuration,
      endTime: startTime + totalDuration + entryDuration,
      duration: entryDuration,
      shots: entryShots,
    });

    totalDuration += entryDuration;
    totalShots += entryShots;
  }

  // Apply limits
  let actualDuration = totalDuration;
  let actualShots = totalShots;

  if (limits.type === 'shot-limit' && limits.value) {
    if (totalShots > limits.value) {
      // Calculate how much of the pattern to include
      const ratio = limits.value / totalShots;
      actualDuration = totalDuration * ratio;
      actualShots = limits.value;
    }
  } else if (limits.type === 'time-limit' && limits.value) {
    if (totalDuration > limits.value) {
      actualDuration = limits.value;
      // Recalculate shots based on time limit
      actualShots = Math.floor((limits.value / totalDuration) * totalShots);
    }
  }

  return {
    patternStartTime: startTime,
    patternEndTime: startTime + actualDuration,
    totalDuration: actualDuration,
    totalShots: actualShots,
    entryTimings: entryTimings.filter(timing => timing.startTime < startTime + actualDuration),
  };
}

/**
 * Calculates workout timing including all patterns.
 */
export function calculateWorkoutTiming(workout) {
  const config = workout.config || {};
  const limits = config.limits || { type: 'all-shots' };

  let currentTime = 0;
  let totalShots = 0;
  let totalDuration = 0;
  const patternTimings = [];

  for (const pattern of workout.patterns) {
    const patternConfig = pattern.config || {};
    const patternTiming = calculatePatternTiming(pattern, patternConfig, currentTime);

    patternTimings.push({
      pattern,
      ...patternTiming,
    });

    currentTime = patternTiming.patternEndTime;
    totalShots += patternTiming.totalShots;
    totalDuration = patternTiming.patternEndTime;
  }

  // Apply workout-level limits
  let actualDuration = totalDuration;
  let actualShots = totalShots;

  if (limits.type === 'shot-limit' && limits.value) {
    if (totalShots > limits.value) {
      // Find where to cut off based on shot limit
      let accumulatedShots = 0;
      let cutOffTime = 0;

      for (const patternTiming of patternTimings) {
        if (accumulatedShots + patternTiming.totalShots <= limits.value) {
          accumulatedShots += patternTiming.totalShots;
          cutOffTime = patternTiming.patternEndTime;
        } else {
          const remainingShots = limits.value - accumulatedShots;
          const ratio = remainingShots / patternTiming.totalShots;
          cutOffTime = patternTiming.patternStartTime + patternTiming.totalDuration * ratio;
          break;
        }
      }

      actualDuration = cutOffTime;
      actualShots = limits.value;
    }
  } else if (limits.type === 'time-limit' && limits.value) {
    if (totalDuration > limits.value) {
      actualDuration = limits.value;
      // Recalculate shots based on time limit
      let accumulatedShots = 0;

      for (const patternTiming of patternTimings) {
        if (patternTiming.patternEndTime <= limits.value) {
          accumulatedShots += patternTiming.totalShots;
        } else {
          const ratio =
            (limits.value - patternTiming.patternStartTime) / patternTiming.totalDuration;
          accumulatedShots += Math.floor(patternTiming.totalShots * ratio);
          break;
        }
      }

      actualShots = accumulatedShots;
    }
  }

  return {
    workoutStartTime: 0,
    workoutEndTime: actualDuration,
    totalDuration: actualDuration,
    totalShots: actualShots,
    patternTimings: patternTimings.filter(timing => timing.patternStartTime < actualDuration),
  };
}

/**
 * Calculates sub-events timing for a timeline event.
 */
export function calculateSubEvents(event, config) {
  const subEvents = {};

  if (event.type === 'Shot') {
    const shotTiming = calculateShotTiming(event.name, config, event.startTime);
    subEvents.announcement_start = shotTiming.announcementStartTime;
    subEvents.shot_start = shotTiming.shotStartTime;
    subEvents.shot_end = shotTiming.shotEndTime;
  } else if (event.type === 'Message') {
    const messageTiming = calculateMessageTiming(event.config.message, config, event.startTime);
    subEvents.message_start = messageTiming.messageStartTime;
    subEvents.tts_end = messageTiming.ttsEndTime;
    subEvents.message_end = messageTiming.messageEndTime;
  }

  return subEvents;
}

/**
 * Validates timing consistency across events.
 */
export function validateTimingConsistency(timeline) {
  const errors = [];

  for (let i = 0; i < timeline.length - 1; i++) {
    const currentEvent = timeline[i];
    const nextEvent = timeline[i + 1];

    if (currentEvent.endTime > nextEvent.startTime) {
      errors.push({
        eventIndex: i,
        message: `Event ${i} ends after event ${i + 1} starts`,
        currentEnd: currentEvent.endTime,
        nextStart: nextEvent.startTime,
      });
    }
  }

  return errors;
}

/**
 * Calculates workout statistics.
 */
export function calculateWorkoutStats(timeline) {
  const stats = {
    totalEvents: timeline.length,
    totalDuration: 0,
    totalShots: 0,
    totalMessages: 0,
    eventTypes: {},
  };

  for (const event of timeline) {
    stats.totalDuration = Math.max(stats.totalDuration, event.endTime);

    if (event.type === 'Shot') {
      stats.totalShots++;
    } else if (event.type === 'Message') {
      stats.totalMessages++;
    }

    stats.eventTypes[event.type] = (stats.eventTypes[event.type] || 0) + 1;
  }

  return stats;
}



// Additional functions for webapp compatibility
export function parseTimeLimit(timeLimit) {
  if (typeof timeLimit === 'string') {
    // Handle MM:SS format
    const match = timeLimit.match(/^(\d+):(\d+)$/);
    if (match) {
      const minutes = parseInt(match[1], 10);
      const seconds = parseInt(match[2], 10);
      return minutes * 60 + seconds;
    }
    // Handle duration format (e.g., "5s")
    const durationResult = parseDuration(timeLimit);
    if (durationResult > 0) {
      return durationResult;
    }
    // Handle plain number format (e.g., "30" for 30 seconds)
    const plainNumber = parseFloat(timeLimit);
    if (!isNaN(plainNumber)) {
      return plainNumber;
    }
  }
  return timeLimit;
}

export function formatTime(seconds) {
  return secondsToTimeStr(seconds);
}

export function formatTimePrecise(seconds) {
  return secondsToTimeStr(seconds, true);
}

export function formatTimeHighPrecision(seconds) {
  return secondsToTimeStr(seconds, true);
}

export function formatRemainingTime(seconds) {
  if (seconds >= 60) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')} min`;
  } else {
    return `${seconds.toFixed(1)}s`;
  }
}
