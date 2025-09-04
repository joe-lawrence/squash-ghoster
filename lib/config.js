/**
 * Configuration classes for testing purposes
 * Minimal implementation to support test files
 */

export class PatternConfig {
  constructor(data = {}) {
    this.iterationType = data.iterationType || 'in-order';
    this.limits = data.limits || { type: 'all-shots', value: null };
    this.interval = data.interval || 5.0;
    this.intervalOffsetType = data.intervalOffsetType || 'fixed';
    this.intervalOffset = data.intervalOffset || { min: 0, max: 0 };
    this.autoVoiceSplitStep = data.autoVoiceSplitStep !== undefined ? data.autoVoiceSplitStep : true;
    this.shotAnnouncementLeadTime = data.shotAnnouncementLeadTime || 2.5;
    this.splitStepSpeed = data.splitStepSpeed || 'auto-scale';
    this.voice = data.voice || 'Default';
    this.speechRate = data.speechRate || 1.0;
  }
}

export class ShotConfig {
  constructor(data = {}) {
    this.repeatCount = data.repeatCount || { type: 'fixed', count: 1 };
    this.interval = data.interval || 5.0;
    this.intervalOffsetType = data.intervalOffsetType || 'fixed';
    this.intervalOffset = data.intervalOffset || { min: 0, max: 0 };
    this.autoVoiceSplitStep = data.autoVoiceSplitStep !== undefined ? data.autoVoiceSplitStep : true;
    this.shotAnnouncementLeadTime = data.shotAnnouncementLeadTime || 2.5;
    this.splitStepSpeed = data.splitStepSpeed || 'auto-scale';
    this.voice = data.voice || 'Default';
    this.speechRate = data.speechRate || 1.0;
  }
}

export class MessageConfig {
  constructor(data = {}) {
    this.message = data.message || '';
    this.interval = data.interval || '00:00';
    this.intervalType = data.intervalType || 'fixed';
    this.countdown = data.countdown !== undefined ? data.countdown : false;
    this.skipAtEndOfWorkout = data.skipAtEndOfWorkout !== undefined ? data.skipAtEndOfWorkout : true;
    this.voice = data.voice || 'Default';
    this.speechRate = data.speechRate || 1.0;
  }
}

export class WorkoutConfig {
  constructor(data = {}) {
    this.iterationType = data.iterationType || 'in-order';
    this.limits = data.limits || { type: 'all-shots', value: null };
    this.interval = data.interval || 5.0;
    this.intervalOffsetType = data.intervalOffsetType || 'fixed';
    this.intervalOffset = data.intervalOffset || { min: 0, max: 0 };
    this.autoVoiceSplitStep = data.autoVoiceSplitStep !== undefined ? data.autoVoiceSplitStep : true;
    this.shotAnnouncementLeadTime = data.shotAnnouncementLeadTime || 2.5;
    this.splitStepSpeed = data.splitStepSpeed || 'auto-scale';
    this.voice = data.voice || 'Default';
    this.speechRate = data.speechRate || 1.0;
  }
}

// Export constants
export const SplitStepSpeed = {
  AUTO_SCALE: 'auto-scale',
  SLOW: 'slow',
  MEDIUM: 'medium',
  FAST: 'fast',
  RANDOM: 'random'
};

export const IterationType = {
  IN_ORDER: 'in-order',
  SHUFFLE: 'shuffle'
};

export const IntervalOffsetType = {
  FIXED: 'fixed',
  RANDOM: 'random'
};

export const LimitsType = {
  ALL_SHOTS: 'all-shots',
  SHOT_LIMIT: 'shot-limit',
  TIME_LIMIT: 'time-limit'
};

export const IntervalType = {
  FIXED: 'fixed',
  ADDITIONAL: 'additional'
};