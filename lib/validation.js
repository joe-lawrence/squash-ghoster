// Build ID: 2025-09-04-17-46-VALIDATION-001
console.log('Squash Ghoster Validation loaded - Build ID: 2025-09-04-17-46-VALIDATION-001', new Date().toISOString());

/**
 * Validation module for squash workout definitions.
 *
 * This module provides comprehensive validation for:
 * - Workout structure and configuration
 * - Pattern validation
 * - Shot and message validation
 * - Configuration inheritance validation
 * - Timeline validation
 */

// Config types defined inline to avoid circular dependencies
const SplitStepSpeed = {
  AUTO_SCALE: 'auto-scale',
  SLOW: 'slow',
  MEDIUM: 'medium',
  FAST: 'fast',
  RANDOM: 'random'
};

const IterationType = {
  IN_ORDER: 'in-order',
  SHUFFLE: 'shuffle'
};

const IntervalOffsetType = {
  FIXED: 'fixed',
  RANDOM: 'random'
};

const LimitsType = {
  ALL_SHOTS: 'all-shots',
  SHOT_LIMIT: 'shot-limit',
  TIME_LIMIT: 'time-limit'
};

const IntervalType = {
  FIXED: 'fixed',
  ADDITIONAL: 'additional'
};
import { validateTimingConsistency } from './timing.js';

/**
 * Represents a validation error.
 */
export class ValidationError {
  constructor({ field = null, message, value = null, suggestions = [] }) {
    this.field = field;
    this.message = message;
    this.value = value;
    this.suggestions = suggestions;
  }

  toDict() {
    return {
      field: this.field,
      message: this.message,
      value: this.value,
      suggestions: this.suggestions,
    };
  }
}

/**
 * Represents a validation result.
 */
export class ValidationResult {
  constructor({ isValid = true, errors = [] } = {}) {
    this.isValid = isValid;
    this.errors = errors;
  }

  addError(error) {
    this.errors.push(error);
    this.isValid = false;
  }

  merge(otherResult) {
    this.errors.push(...otherResult.errors);
    this.isValid = this.isValid && otherResult.isValid;
  }

  toDict() {
    return {
      isValid: this.isValid,
      errors: this.errors.map(error => error.toDict()),
    };
  }
}

/**
 * Validates a complete workout definition.
 */
export function validateWorkout(data) {
  const result = new ValidationResult();

  // Basic structure validation
  if (!data || typeof data !== 'object') {
    result.addError(
      new ValidationError({
        message: 'Workout data must be an object',
      }),
    );
    return result;
  }

  if (data.type !== 'Workout') {
    result.addError(
      new ValidationError({
        field: 'type',
        message: "Workout type must be 'Workout'",
        value: data.type,
      }),
    );
  }

  // Apply backward compatibility conversions BEFORE validation
  // Check for required workout-level properties
  if (!data.config) {
    data.config = {};
  }
  
  // Provide default limits if missing
  if (!data.config.limits) {
    data.config.limits = { type: 'all-shots', value: null };
  }

  // Convert workout-level time limit from time string to number
  if (data.config.limits && data.config.limits.type === 'time-limit' && typeof data.config.limits.value === 'string') {
    const timeStr = data.config.limits.value;
    if (timeStr.includes(':')) {
      const parts = timeStr.split(':');
      if (parts.length === 2) {
        const minutes = parseInt(parts[0], 10);
        const seconds = parseInt(parts[1], 10);
        data.config.limits.value = minutes * 60 + seconds;
      }
    }
  }

  // Convert iteration to iterationType for backward compatibility
  if (data.config.iteration && !data.config.iterationType) {
    data.config.iterationType = data.config.iteration;
    delete data.config.iteration;
  }

  // Convert pattern configs for backward compatibility
  if (data.patterns) {
    for (const pattern of data.patterns) {
      if (pattern.config) {
        // Convert pattern iteration to iterationType
        if (pattern.config.iteration && !pattern.config.iterationType) {
          pattern.config.iterationType = pattern.config.iteration;
          delete pattern.config.iteration;
        }
        
        // Convert pattern limits from all-entries to all-shots
        if (pattern.config.limits && pattern.config.limits.type === 'all-entries') {
          pattern.config.limits.type = 'all-shots';
        }
      }
      
      // Convert entry configs for backward compatibility
      if (pattern.entries) {
        for (const entry of pattern.entries) {
          if (entry.config) {
            // Convert message interval from time string to number
            if (entry.type === 'Message' && typeof entry.config.interval === 'string') {
              const timeStr = entry.config.interval;
              if (timeStr.includes(':')) {
                const parts = timeStr.split(':');
                if (parts.length === 2) {
                  const minutes = parseInt(parts[0], 10);
                  const seconds = parseInt(parts[1], 10);
                  entry.config.interval = minutes * 60 + seconds;
                }
              }
            }
            
            // Add missing intervalType for messages
            if (entry.type === 'Message' && entry.config.interval > 0 && !entry.config.intervalType) {
              entry.config.intervalType = 'fixed';
            }
          }
        }
      }
    }
  }

  // Now validate the converted data
  // Validate workout configuration
  if (data.config) {
    const configErrors = validateWorkoutConfig(data.config);
    result.errors.push(...configErrors);
  }

  // Validate patterns
  if (!Array.isArray(data.patterns)) {
    result.addError(
      new ValidationError({
        field: 'patterns',
        message: 'Patterns must be an array',
        value: data.patterns,
      }),
    );
  } else {
    for (let i = 0; i < data.patterns.length; i++) {
      const pattern = data.patterns[i];
      const patternErrors = validatePattern(pattern, i);
      result.errors.push(...patternErrors);
    }
  }

  result.isValid = result.errors.length === 0;
  return result;
}

/**
 * Validates workout configuration.
 */
export function validateWorkoutConfig(config) {
  const errors = [];

  if (!config) {
    return errors;
  }

  // Validate iteration type
  if (config.iterationType && !Object.values(IterationType).includes(config.iterationType)) {
    errors.push(
      new ValidationError({
        field: 'iterationType',
        message: `Invalid iteration type: ${config.iterationType}`,
        value: config.iterationType,
        suggestions: Object.values(IterationType),
      }),
    );
  }

  // Validate limits
  if (config.limits) {
    const limitErrors = validateLimitsConfig(config.limits);
    errors.push(...limitErrors);
  }

  // Validate base configuration
  const baseErrors = validateBaseConfig(config);
  errors.push(...baseErrors);

  return errors;
}

/**
 * Validates pattern configuration.
 */
export function validatePatternConfig(config) {
  const errors = [];
  
  if (!config) {
    return errors;
  }

  // Validate iteration type if present
  if (config.iterationType && !Object.values(IterationType).includes(config.iterationType)) {
    errors.push(
      new ValidationError({
        field: 'iterationType',
        message: `Invalid iteration type: ${config.iterationType}`,
        value: config.iterationType,
        suggestions: Object.values(IterationType),
      }),
    );
  }

  // Validate limits if present
  if (config.limits) {
    const limitErrors = validateLimitsConfig(config.limits);
    errors.push(...limitErrors);
  }
  
  if (config.repeatCount !== undefined && config.repeatCount !== null) {
    if (typeof config.repeatCount === 'object') {
      // Validate repeat count object with type field
      if (config.repeatCount.type === 'random') {
        // Random repeat validation
        if (!Number.isInteger(config.repeatCount.min) || config.repeatCount.min < 0) {
          errors.push(
            new ValidationError({
              field: 'repeatCount.min',
              message: 'Repeat count min must be a non-negative integer',
              value: config.repeatCount.min,
            }),
          );
        }
        
        if (!Number.isInteger(config.repeatCount.max) || config.repeatCount.max < 1) {
          errors.push(
            new ValidationError({
              field: 'repeatCount.max',
              message: 'Repeat count max must be a positive integer',
              value: config.repeatCount.max,
            }),
          );
        }
        
        if (Number.isInteger(config.repeatCount.min) && Number.isInteger(config.repeatCount.max) && 
            config.repeatCount.max < config.repeatCount.min) {
          errors.push(
            new ValidationError({
              field: 'repeatCount',
              message: 'Repeat count max must be greater than or equal to min',
              value: config.repeatCount,
            }),
          );
        }
      } else if (config.repeatCount.type === 'fixed') {
        // Fixed repeat validation
        if (!Number.isInteger(config.repeatCount.count) || config.repeatCount.count < 1) {
          errors.push(
            new ValidationError({
              field: 'repeatCount.count',
              message: 'Fixed repeat count must be a positive integer',
              value: config.repeatCount.count,
            }),
          );
        }
      } else {
        // Legacy support: if it's an object but no type, assume it's random
        if (!Number.isInteger(config.repeatCount.min) || config.repeatCount.min < 0) {
          errors.push(
            new ValidationError({
              field: 'repeatCount.min',
              message: 'Repeat count min must be a non-negative integer',
              value: config.repeatCount.min,
            }),
          );
        }
        
        if (!Number.isInteger(config.repeatCount.max) || config.repeatCount.max < 1) {
          errors.push(
            new ValidationError({
              field: 'repeatCount.max',
              message: 'Repeat count max must be a positive integer',
              value: config.repeatCount.max,
            }),
          );
        }
        
        if (Number.isInteger(config.repeatCount.min) && Number.isInteger(config.repeatCount.max) && 
            config.repeatCount.max < config.repeatCount.min) {
          errors.push(
            new ValidationError({
              field: 'repeatCount',
              message: 'Repeat count max must be greater than or equal to min',
              value: config.repeatCount,
            }),
          );
        }
      }
    } else {
      // Legacy support: if it's a number, treat as fixed
      if (!Number.isInteger(config.repeatCount) || config.repeatCount < 1) {
        errors.push(
          new ValidationError({
            field: 'repeatCount',
            message: 'Repeat count must be a positive integer',
            value: config.repeatCount,
          }),
        );
      }
    }
  }

  // Validate base configuration
  const baseErrors = validateBaseConfig(config);
  errors.push(...baseErrors);

  return errors;
}

/**
 * Validates shot configuration.
 */
export function validateShotConfig(config) {
  const errors = [];
  
  if (!config) {
    return errors;
  }

  // Validate repeat count (fixed or random)
  if (config.repeatCount !== undefined && config.repeatCount !== null) {
    if (typeof config.repeatCount === 'object') {
      // Validate repeat count object with type field
      if (config.repeatCount.type === 'random') {
        // Random repeat validation
        if (!Number.isInteger(config.repeatCount.min) || config.repeatCount.min < 0) {
          errors.push(
            new ValidationError({
              field: 'repeatCount.min',
              message: 'Repeat count min must be a non-negative integer',
              value: config.repeatCount.min,
            }),
          );
        }
        
        if (!Number.isInteger(config.repeatCount.max) || config.repeatCount.max < 1) {
          errors.push(
            new ValidationError({
              field: 'repeatCount.max',
              message: 'Repeat count max must be a positive integer',
              value: config.repeatCount.max,
            }),
          );
        }
        
        if (Number.isInteger(config.repeatCount.min) && Number.isInteger(config.repeatCount.max) && 
            config.repeatCount.max < config.repeatCount.min) {
          errors.push(
            new ValidationError({
              field: 'repeatCount',
              message: 'Repeat count max must be greater than or equal to min',
              value: config.repeatCount,
            }),
          );
        }
      } else if (config.repeatCount.type === 'fixed') {
        // Fixed repeat validation
        if (!Number.isInteger(config.repeatCount.count) || config.repeatCount.count < 1) {
          errors.push(
            new ValidationError({
              field: 'repeatCount.count',
              message: 'Fixed repeat count must be a positive integer',
              value: config.repeatCount.count,
            }),
          );
        }
      } else {
        // Legacy support: if it's an object but no type, assume it's random
        if (!Number.isInteger(config.repeatCount.min) || config.repeatCount.min < 0) {
          errors.push(
            new ValidationError({
              field: 'repeatCount.min',
              message: 'Repeat count min must be a non-negative integer',
              value: config.repeatCount.min,
            }),
          );
        }
        
        if (!Number.isInteger(config.repeatCount.max) || config.repeatCount.max < 1) {
          errors.push(
            new ValidationError({
              field: 'repeatCount.max',
              message: 'Repeat count max must be a positive integer',
              value: config.repeatCount.max,
            }),
          );
        }
        
        if (Number.isInteger(config.repeatCount.min) && Number.isInteger(config.repeatCount.max) && 
            config.repeatCount.max < config.repeatCount.min) {
          errors.push(
            new ValidationError({
              field: 'repeatCount',
              message: 'Repeat count max must be greater than or equal to min',
              value: config.repeatCount,
            }),
          );
        }
      }
    } else {
      // Legacy support: if it's a number, treat as fixed
      if (!Number.isInteger(config.repeatCount) || config.repeatCount < 1) {
        errors.push(
          new ValidationError({
            field: 'repeatCount',
            message: 'Repeat count must be a positive integer',
            value: config.repeatCount,
          }),
        );
      }
    }
  }

  // Validate base configuration
  const baseErrors = validateBaseConfig(config);
  errors.push(...baseErrors);

  return errors;
}

/**
 * Validates message configuration.
 */
export function validateMessageConfig(config) {
  const errors = [];

  if (!config) {
    return errors;
  }

  // Validate message content
  if (config.message !== undefined && typeof config.message !== 'string') {
    errors.push(
      new ValidationError({
        field: 'message',
        message: 'Message must be a string',
        value: config.message,
      }),
    );
  }

  // Validate interval type
  if (config.intervalType && !Object.values(IntervalType).includes(config.intervalType)) {
    errors.push(
      new ValidationError({
        field: 'intervalType',
        message: `Invalid interval type: ${config.intervalType}`,
        value: config.intervalType,
        suggestions: Object.values(IntervalType),
      }),
    );
  }

  // Validate that interval type is required when interval > 0
  if (config.interval && config.interval !== '0s' && !config.intervalType) {
    errors.push(
      new ValidationError({
        field: 'intervalType',
        message: 'Message with interval > 0 must specify intervalType',
        value: config.interval,
        suggestions: ["Add intervalType: 'fixed' or 'additional'"],
      }),
    );
  }

  // Validate skip at end of workout
  if (config.skipAtEndOfWorkout !== undefined && typeof config.skipAtEndOfWorkout !== 'boolean') {
    errors.push(
      new ValidationError({
        field: 'skipAtEndOfWorkout',
        message: 'skipAtEndOfWorkout must be a boolean',
        value: config.skipAtEndOfWorkout,
      }),
    );
  }

  // Validate base configuration
  const baseErrors = validateBaseConfig(config);
  errors.push(...baseErrors);

  return errors;
}

/**
 * Validates base configuration properties.
 */
export function validateBaseConfig(config) {
  const errors = [];

  // Validate voice
  if (config.voice !== undefined && typeof config.voice !== 'string') {
    errors.push(
      new ValidationError({
        field: 'voice',
        message: 'Voice must be a string',
        value: config.voice,
      }),
    );
  }

  // Validate speech rate
  if (config.speechRate !== undefined) {
    if (typeof config.speechRate !== 'number' || config.speechRate < 0.5 || config.speechRate > 1.5) {
      errors.push(
        new ValidationError({
          field: 'speechRate',
          message: 'Speech rate must be between 0.5 and 1.5',
          value: config.speechRate,
        }),
      );
    }
  }

  // Validate interval
  if (config.interval !== undefined) {
    if (typeof config.interval !== 'number' || config.interval < 0) {
      errors.push(
        new ValidationError({
          field: 'interval',
          message: 'Interval must be a positive number',
          value: config.interval,
        }),
      );
    }
  }

  // Validate split step speed
  if (config.splitStepSpeed && !Object.values(SplitStepSpeed).includes(config.splitStepSpeed)) {
    errors.push(
      new ValidationError({
        field: 'splitStepSpeed',
        message: `Invalid split step speed: ${config.splitStepSpeed}`,
        value: config.splitStepSpeed,
        suggestions: Object.values(SplitStepSpeed),
      }),
    );
  }

  // Validate shot announcement lead time
  if (config.shotAnnouncementLeadTime !== undefined) {
    if (
      typeof config.shotAnnouncementLeadTime !== 'number' ||
      config.shotAnnouncementLeadTime < 1.0
    ) {
      errors.push(
        new ValidationError({
          field: 'shotAnnouncementLeadTime',
          message: 'Shot announcement lead time must be at least 1.0 seconds',
          value: config.shotAnnouncementLeadTime,
        }),
      );
    }
  }

  // Validate interval offset type
  if (
    config.intervalOffsetType &&
    !Object.values(IntervalOffsetType).includes(config.intervalOffsetType)
  ) {
    errors.push(
      new ValidationError({
        field: 'intervalOffsetType',
        message: `Invalid interval offset type: ${config.intervalOffsetType}`,
        value: config.intervalOffsetType,
        suggestions: Object.values(IntervalOffsetType),
      }),
    );
  }

  // Validate interval offset
  if (config.intervalOffset) {
    const offsetErrors = validateIntervalOffsetConfig(config.intervalOffset);
    errors.push(...offsetErrors);
  }

  // Validate auto voice split step
  if (config.autoVoiceSplitStep !== undefined && typeof config.autoVoiceSplitStep !== 'boolean') {
    errors.push(
      new ValidationError({
        field: 'autoVoiceSplitStep',
        message: 'autoVoiceSplitStep must be a boolean',
        value: config.autoVoiceSplitStep,
      }),
    );
  }

  return errors;
}

/**
 * Validates interval offset configuration.
 */
export function validateIntervalOffsetConfig(config) {
  const errors = [];

  if (!config) {
    return errors;
  }

  // Validate min value
  if (config.min !== undefined) {
    if (typeof config.min !== 'number' || config.min < -2.0 || config.min > 2.0) {
      errors.push(
        new ValidationError({
          field: 'intervalOffset.min',
          message: 'Interval offset min must be between -2.0 and 2.0',
          value: config.min,
        }),
      );
    }
  }

  // Validate max value
  if (config.max !== undefined) {
    if (typeof config.max !== 'number' || config.max < -2.0 || config.max > 2.0) {
      errors.push(
        new ValidationError({
          field: 'intervalOffset.max',
          message: 'Interval offset max must be between -2.0 and 2.0',
          value: config.max,
        }),
      );
    }
  }

  // Validate min <= max
  if (config.min !== undefined && config.max !== undefined && config.min > config.max) {
    errors.push(
      new ValidationError({
        field: 'intervalOffset',
        message: 'Interval offset min must be less than or equal to max',
        value: { min: config.min, max: config.max },
      }),
    );
  }

  return errors;
}

/**
 * Validates limits configuration.
 */
export function validateLimitsConfig(config) {
  const errors = [];

  if (!config) {
    return errors;
  }

  // Validate type
  if (!Object.values(LimitsType).includes(config.type)) {
    errors.push(
      new ValidationError({
        field: 'limits.type',
        message: `Invalid limits type: ${config.type}`,
        value: config.type,
        suggestions: Object.values(LimitsType),
      }),
    );
  }

  // Validate value based on type
  if (config.type === LimitsType.SHOT_LIMIT) {
    if (!Number.isInteger(config.value) || config.value < 1) {
      errors.push(
        new ValidationError({
          field: 'limits.value',
          message: 'Shot limit must be a positive integer',
          value: config.value,
        }),
      );
    }
  } else if (config.type === LimitsType.TIME_LIMIT) {
    if (typeof config.value !== 'string' && (typeof config.value !== 'number' || config.value <= 0)) {
      errors.push(
        new ValidationError({
          field: 'limits.value',
          message: 'Time limit must be a positive number or time string (e.g., "00:00")',
          value: config.value,
        }),
      );
    }
  }

  return errors;
}

/**
 * Validates a pattern.
 */
export function validatePattern(pattern, index) {
  const errors = [];

  if (!pattern || typeof pattern !== 'object') {
    errors.push(
      new ValidationError({
        field: `patterns[${index}]`,
        message: 'Pattern must be an object',
        value: pattern,
      }),
    );
    return errors;
  }

  if (pattern.type !== 'Pattern') {
    errors.push(
      new ValidationError({
        field: `patterns[${index}].type`,
        message: "Pattern type must be 'Pattern'",
        value: pattern.type,
      }),
    );
  }

  // Validate pattern configuration
  if (pattern.config) {
    const configErrors = validatePatternConfig(pattern.config);
    errors.push(
      ...configErrors.map(error => ({
        ...error,
        field: `patterns[${index}].${error.field}`,
      })),
    );
  }

  // Validate entries
  if (!Array.isArray(pattern.entries)) {
    errors.push(
      new ValidationError({
        field: `patterns[${index}].entries`,
        message: 'Pattern entries must be an array',
        value: pattern.entries,
      }),
    );
  } else {
    for (let i = 0; i < pattern.entries.length; i++) {
      const entry = pattern.entries[i];
      const entryErrors = validateEntry(entry, index, i);
      errors.push(...entryErrors);
    }
  }

  return errors;
}

/**
 * Validates an entry (shot or message).
 */
export function validateEntry(entry, patternIndex, entryIndex) {
  const errors = [];

  if (!entry || typeof entry !== 'object') {
    errors.push(
      new ValidationError({
        field: `patterns[${patternIndex}].entries[${entryIndex}]`,
        message: 'Entry must be an object',
        value: entry,
      }),
    );
    return errors;
  }

  if (entry.type === 'Shot') {
    const shotErrors = validateShot(entry, patternIndex, entryIndex);
    errors.push(...shotErrors);
  } else if (entry.type === 'Message') {
    const messageErrors = validateMessage(entry, patternIndex, entryIndex);
    errors.push(...messageErrors);
  } else {
    errors.push(
      new ValidationError({
        field: `patterns[${patternIndex}].entries[${entryIndex}].type`,
        message: "Entry type must be 'Shot' or 'Message'",
        value: entry.type,
      }),
    );
  }

  return errors;
}

/**
 * Validates a shot.
 */
export function validateShot(shot, patternIndex, entryIndex) {
  const errors = [];

  // Validate shot configuration
  if (shot.config) {
    const configErrors = validateShotConfig(shot.config);
    errors.push(
      ...configErrors.map(error => ({
        ...error,
        field: `patterns[${patternIndex}].entries[${entryIndex}].${error.field}`,
      })),
    );
  }

  // Validate position type
  if (shot.positionType) {
    const validSpecialTypes = ['normal', 'locked', 'linked', 'last'];
    const positionNum = parseInt(shot.positionType);
    const isValidPosition = !isNaN(positionNum) && positionNum > 0;
    
    if (!validSpecialTypes.includes(shot.positionType) && !isValidPosition) {
      errors.push(
        new ValidationError({
          field: `patterns[${patternIndex}].entries[${entryIndex}].positionType`,
          message: `Invalid position type: ${shot.positionType}`,
          value: shot.positionType,
          suggestions: ['normal', 'locked', 'linked', 'last', '1', '2', '3', '...'],
        }),
      );
    }
  }

  return errors;
}

/**
 * Validates a message.
 */
export function validateMessage(message, patternIndex, entryIndex) {
  const errors = [];

  // Validate message configuration
  if (message.config) {
    const configErrors = validateMessageConfig(message.config);
    errors.push(
      ...configErrors.map(error => ({
        ...error,
        field: `patterns[${patternIndex}].entries[${entryIndex}].${error.field}`,
      })),
    );
  }

  // Validate position type
  if (message.positionType) {
    const validSpecialTypes = ['normal', 'locked', 'linked', 'last'];
    const positionNum = parseInt(message.positionType);
    const isValidPosition = !isNaN(positionNum) && positionNum > 0;
    
    if (!validSpecialTypes.includes(message.positionType) && !isValidPosition) {
      errors.push(
        new ValidationError({
          field: `patterns[${patternIndex}].entries[${entryIndex}].positionType`,
          message: `Invalid position type: ${message.positionType}`,
          value: message.positionType,
          suggestions: ['normal', 'locked', 'linked', 'last', '1', '2', '3', '...'],
        }),
      );
    }
  }

  return errors;
}

/**
 * Validates timeline events.
 */
export function validateTimeline(timeline) {
  const result = new ValidationResult();

  if (!Array.isArray(timeline)) {
    result.addError(
      new ValidationError({
        field: 'timeline',
        message: 'Timeline must be an array',
        value: timeline,
      }),
    );
    return result;
  }

  for (let i = 0; i < timeline.length; i++) {
    const event = timeline[i];
    const eventErrors = validateTimelineEvent(event, i);
    result.errors.push(...eventErrors);
  }

  // Check for timing consistency (overlapping events)
  const timingErrors = validateTimingConsistency(timeline);
  for (const timingError of timingErrors) {
    result.addError(
      new ValidationError({
        field: `timeline[${timingError.eventIndex}]`,
        message: timingError.message,
        value: { currentEnd: timingError.currentEnd, nextStart: timingError.nextStart },
      }),
    );
  }

  result.isValid = result.errors.length === 0;
  return result;
}

/**
 * Validates a timeline event.
 */
export function validateTimelineEvent(event, index) {
  const errors = [];

  if (!event || typeof event !== 'object') {
    errors.push(
      new ValidationError({
        field: `timeline[${index}]`,
        message: 'Timeline event must be an object',
        value: event,
      }),
    );
    return errors;
  }

  // Validate required fields
  if (!event.name || typeof event.name !== 'string') {
    errors.push(
      new ValidationError({
        field: `timeline[${index}].name`,
        message: 'Event name must be a string',
        value: event.name,
      }),
    );
  }

  if (!event.type || typeof event.type !== 'string') {
    errors.push(
      new ValidationError({
        field: `timeline[${index}].type`,
        message: 'Event type must be a string',
        value: event.type,
      }),
    );
  }

  if (typeof event.startTime !== 'number' || event.startTime < 0) {
    errors.push(
      new ValidationError({
        field: `timeline[${index}].startTime`,
        message: 'Start time must be a non-negative number',
        value: event.startTime,
      }),
    );
  }

  if (typeof event.endTime !== 'number' || event.endTime < 0) {
    errors.push(
      new ValidationError({
        field: `timeline[${index}].endTime`,
        message: 'End time must be a non-negative number',
        value: event.endTime,
      }),
    );
  }

  if (typeof event.duration !== 'number' || event.duration < 0) {
    errors.push(
      new ValidationError({
        field: `timeline[${index}].duration`,
        message: 'Duration must be a non-negative number',
        value: event.duration,
      }),
    );
  }

  // Validate timing consistency
  if (event.startTime >= event.endTime) {
    errors.push(
      new ValidationError({
        field: `timeline[${index}]`,
        message: 'Start time must be less than end time',
        value: { startTime: event.startTime, endTime: event.endTime },
      }),
    );
  }

  if (Math.abs(event.duration - (event.endTime - event.startTime)) > 0.001) {
    errors.push(
      new ValidationError({
        field: `timeline[${index}]`,
        message: 'Duration must equal end time minus start time',
        value: { duration: event.duration, calculated: event.endTime - event.startTime },
      }),
    );
  }

  // Validate sub events
  if (event.subEvents && typeof event.subEvents === 'object') {
    for (const [key, value] of Object.entries(event.subEvents)) {
      if (value !== null && (typeof value !== 'number' || value < 0)) {
        errors.push(
          new ValidationError({
            field: `timeline[${index}].subEvents.${key}`,
            message: 'Sub event time must be null or a non-negative number',
            value,
          }),
        );
      }
    }
  }

  return errors;
}
