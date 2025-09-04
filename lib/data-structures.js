/**
 * Data structures for squash workout definitions.
 *
 * This module defines plain data structures using classes to represent
 * workout components, separating data from behavior.
 */

/**
 * Plain data structure for a shot in a workout pattern.
 */
export class ShotData {
  constructor({
    id = null,
    name = null,
    type = 'Shot',
    positionType = 'normal',
    config = {},
  } = {}) {
    this.id = id;
    this.name = name;
    this.type = type;
    this.positionType = positionType;
    this.config = config;
  }

  toDict() {
    return {
      id: this.id,
      name: this.name,
      type: this.type,
      positionType: this.positionType,
      config: this.config,
    };
  }

  static fromDict(data) {
    return new ShotData({
      id: data.id || null,
      name: data.name || null,
      type: data.type || 'Shot',
      positionType: data.positionType || 'normal',
      config: data.config || {},
    });
  }
}

/**
 * Plain data structure for a message in a workout pattern.
 */
export class MessageData {
  constructor({
    id = null,
    name = null,
    type = 'Message',
    positionType = 'normal',
    config = {},
  } = {}) {
    this.id = id;
    this.name = name;
    this.type = type;
    this.positionType = positionType;
    this.config = config;
  }

  toDict() {
    return {
      id: this.id,
      name: this.name,
      type: this.type,
      positionType: this.positionType,
      config: this.config,
    };
  }

  static fromDict(data) {
    return new MessageData({
      id: data.id || null,
      name: data.name || null,
      type: data.type || 'Message',
      positionType: data.positionType || 'normal',
      config: data.config || {},
    });
  }
}

/**
 * Plain data structure for a pattern containing shots and messages.
 */
export class PatternData {
  constructor({
    id = null,
    name = null,
    type = 'Pattern',
    positionType = 'normal',
    config = {},
    entries = [],
  } = {}) {
    this.id = id;
    this.name = name;
    this.type = type;
    this.positionType = positionType;
    this.config = config;
    this.entries = entries;
  }

  toDict() {
    return {
      id: this.id,
      name: this.name,
      type: this.type,
      positionType: this.positionType,
      config: this.config,
      entries: this.entries.map(entry => entry.toDict()),
    };
  }

  static fromDict(data) {
    return new PatternData({
      id: data.id || null,
      name: data.name || null,
      type: data.type || 'Pattern',
      positionType: data.positionType || 'normal',
      config: data.config || {},
      entries: (data.entries || []).map(entry => {
        if (entry.type === 'Message') {
          return MessageData.fromDict(entry);
        } else {
          return ShotData.fromDict(entry);
        }
      }),
    });
  }
}

/**
 * Plain data structure for a complete workout with multiple patterns.
 */
export class WorkoutData {
  constructor({ name = null, type = 'Workout', config = {}, patterns = [] } = {}) {
    this.name = name;
    this.type = type;
    this.config = config;
    this.patterns = patterns;
  }

  toDict() {
    return {
      name: this.name,
      type: this.type,
      config: this.config,
      patterns: this.patterns.map(pattern => pattern.toDict()),
    };
  }

  static fromDict(data) {
    return new WorkoutData({
      name: data.name || null,
      type: data.type || 'Workout',
      config: data.config || {},
      patterns: (data.patterns || []).map(pattern => PatternData.fromDict(pattern)),
    });
  }
}

/**
 * Plain data structure for a single event in the workout timeline.
 */
export class TimelineEventData {
  constructor({ name, type, id = null, startTime, endTime, duration, subEvents = {} }) {
    this.name = name;
    this.type = type;
    this.id = id;
    this.startTime = startTime;
    this.endTime = endTime;
    this.duration = duration;
    this.subEvents = subEvents;
  }

  toDict() {
    return {
      name: this.name,
      type: this.type,
      id: this.id,
      startTime: this.startTime,
      endTime: this.endTime,
      duration: this.duration,
      subEvents: this.subEvents,
    };
  }

  static fromDict(data) {
    return new TimelineEventData({
      name: data.name,
      type: data.type,
      id: data.id,
      startTime: data.startTime,
      endTime: data.endTime,
      duration: data.duration,
      subEvents: data.subEvents || {},
    });
  }
}

/**
 * Plain data structure for pattern state during workout generation.
 */
export class PatternStateData {
  constructor({
    patternInstance,
    patternShotsPlayed = 0,
    patternTimeElapsed = 0.0,
    patternRunsCompleted = 0,
    availableEntries = [],
    lastPlayedEntry = null,
  }) {
    this.patternInstance = patternInstance;
    this.patternShotsPlayed = patternShotsPlayed;
    this.patternTimeElapsed = patternTimeElapsed;
    this.patternRunsCompleted = patternRunsCompleted;
    this.availableEntries = availableEntries;
    this.lastPlayedEntry = lastPlayedEntry;
  }

  toDict() {
    return {
      patternInstance: this.patternInstance.toDict(),
      patternShotsPlayed: this.patternShotsPlayed,
      patternTimeElapsed: this.patternTimeElapsed,
      patternRunsCompleted: this.patternRunsCompleted,
      availableEntries: this.availableEntries.map(entry => entry.toDict()),
      lastPlayedEntry: this.lastPlayedEntry ? this.lastPlayedEntry.toDict() : null,
    };
  }
}

/**
 * Plain data structure for workout generator state.
 */
export class WorkoutGeneratorState {
  constructor({
    currentSuperset = 1,
    patternIndex = 0,
    patternOrder = null,
    patternOrderIndex = 0,
    workoutIterationType = 'in-order',
    currentTime = 0.0,
    workoutTotalShots = 0,
    workoutTotalTime = 0.0,
    totalEventsGenerated = 0,
    maxEvents = 1000,
    pendingEvents = [],
    workoutSeed = null,
  } = {}) {
    this.currentSuperset = currentSuperset;
    this.patternIndex = patternIndex;
    this.patternOrder = patternOrder;
    this.patternOrderIndex = patternOrderIndex;
    this.workoutIterationType = workoutIterationType;
    this.currentTime = currentTime;
    this.workoutTotalShots = workoutTotalShots;
    this.workoutTotalTime = workoutTotalTime;
    this.totalEventsGenerated = totalEventsGenerated;
    this.maxEvents = maxEvents;
    this.pendingEvents = pendingEvents;
    this.workoutSeed = workoutSeed;
  }

  toDict() {
    return {
      currentSuperset: this.currentSuperset,
      patternIndex: this.patternIndex,
      patternOrder: this.patternOrder,
      patternOrderIndex: this.patternOrderIndex,
      workoutIterationType: this.workoutIterationType,
      currentTime: this.currentTime,
      workoutTotalShots: this.workoutTotalShots,
      workoutTotalTime: this.workoutTotalTime,
      totalEventsGenerated: this.totalEventsGenerated,
      maxEvents: this.maxEvents,
      pendingEvents: this.pendingEvents.map(event => event.toDict()),
      workoutSeed: this.workoutSeed,
    };
  }
}

/**
 * Current state of workout execution for preview and presentation modes.
 */
export class WorkoutState {
  constructor({
    currentPattern = 0,
    currentShot = 0,
    currentMessage = 0,
    elapsedTime = 0.0,
    shotsPlayed = 0,
    messagesPlayed = 0,
    patternsCompleted = 0,
    isPaused = false,
    isCompleted = false,
    isPreviewMode = false,
    currentEvent = null,
    nextEvent = null,
    totalWorkoutTime = 0.0,
    remainingTime = 0.0,
  } = {}) {
    this.currentPattern = currentPattern;
    this.currentShot = currentShot;
    this.currentMessage = currentMessage;
    this.elapsedTime = elapsedTime;
    this.shotsPlayed = shotsPlayed;
    this.messagesPlayed = messagesPlayed;
    this.patternsCompleted = patternsCompleted;
    this.isPaused = isPaused;
    this.isCompleted = isCompleted;
    this.isPreviewMode = isPreviewMode;
    this.currentEvent = currentEvent;
    this.nextEvent = nextEvent;
    this.totalWorkoutTime = totalWorkoutTime;
    this.remainingTime = remainingTime;
  }

  toDict() {
    return {
      currentPattern: this.currentPattern,
      currentShot: this.currentShot,
      currentMessage: this.currentMessage,
      elapsedTime: this.elapsedTime,
      shotsPlayed: this.shotsPlayed,
      messagesPlayed: this.messagesPlayed,
      patternsCompleted: this.patternsCompleted,
      isPaused: this.isPaused,
      isCompleted: this.isCompleted,
      isPreviewMode: this.isPreviewMode,
      currentEvent: this.currentEvent ? this.currentEvent.toDict() : null,
      nextEvent: this.nextEvent ? this.nextEvent.toDict() : null,
      totalWorkoutTime: this.totalWorkoutTime,
      remainingTime: this.remainingTime,
    };
  }

  static fromDict(data) {
    return new WorkoutState({
      currentPattern: data.currentPattern || 0,
      currentShot: data.currentShot || 0,
      currentMessage: data.currentMessage || 0,
      elapsedTime: data.elapsedTime || 0.0,
      shotsPlayed: data.shotsPlayed || 0,
      messagesPlayed: data.messagesPlayed || 0,
      patternsCompleted: data.patternsCompleted || 0,
      isPaused: data.isPaused || false,
      isCompleted: data.isCompleted || false,
      isPreviewMode: data.isPreviewMode || false,
      currentEvent: data.currentEvent ? TimelineEventData.fromDict(data.currentEvent) : null,
      nextEvent: data.nextEvent ? TimelineEventData.fromDict(data.nextEvent) : null,
      totalWorkoutTime: data.totalWorkoutTime || 0.0,
      remainingTime: data.remainingTime || 0.0,
    });
  }
}

/**
 * Data structures for auto-complete functionality in the webapp.
 */
export class AutoCompleteData {
  constructor({
    shotNames = [
      'Front Left',
      'Front Right',
      'Mid Left',
      'Mid Right',
      'Back Left',
      'Back Right',
      '1L',
      '1R',
      '2L',
      '2R',
      '3L',
      '3R',
      '4L',
      '4R',
      '5L',
      '5R',
    ],
    positionTypes = ['normal', 'locked', 'linked'],
    voiceOptions = ['Default', 'Male', 'Female', 'Fast', 'Slow'],
    splitStepSpeeds = ['none', 'slow', 'medium', 'fast', 'random', 'auto-scale'],
    iterationTypes = ['in-order', 'shuffle'],
    intervalTypes = ['fixed', 'additional'],
    limitTypes = ['all-shots', 'shot-limit', 'time-limit'],
  } = {}) {
    this.shotNames = shotNames;
    this.positionTypes = positionTypes;
    this.voiceOptions = voiceOptions;
    this.splitStepSpeeds = splitStepSpeeds;
    this.iterationTypes = iterationTypes;
    this.intervalTypes = intervalTypes;
    this.limitTypes = limitTypes;
  }

  toDict() {
    return {
      shotNames: this.shotNames,
      positionTypes: this.positionTypes,
      voiceOptions: this.voiceOptions,
      splitStepSpeeds: this.splitStepSpeeds,
      iterationTypes: this.iterationTypes,
      intervalTypes: this.intervalTypes,
      limitTypes: this.limitTypes,
    };
  }

  static fromDict(data) {
    return new AutoCompleteData({
      shotNames: data.shotNames || [],
      positionTypes: data.positionTypes || [],
      voiceOptions: data.voiceOptions || [],
      splitStepSpeeds: data.splitStepSpeeds || [],
      iterationTypes: data.iterationTypes || [],
      intervalTypes: data.intervalTypes || [],
      limitTypes: data.limitTypes || [],
    });
  }
}

/**
 * Template for predefined workout configurations.
 */
export class WorkoutTemplate {
  constructor({ name, description, category, config, patterns }) {
    this.name = name;
    this.description = description;
    this.category = category;
    this.config = config;
    this.patterns = patterns;
  }

  toDict() {
    return {
      name: this.name,
      description: this.description,
      category: this.category,
      config: this.config,
      patterns: this.patterns,
    };
  }

  static fromDict(data) {
    return new WorkoutTemplate({
      name: data.name,
      description: data.description,
      category: data.category,
      config: data.config,
      patterns: data.patterns,
    });
  }
}
