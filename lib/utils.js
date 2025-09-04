/**
 * Utility functions for the new workout parser.
 */

/**
 * Shuffles an array using the Fisher-Yates algorithm.
 */
export function shuffleArray(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Shuffles an array using a seeded random number generator for deterministic results.
 */
export function shuffleArrayWithSeed(array, seed) {
  const shuffled = [...array];
  
  // Create a simple seeded random number generator
  let randomSeed = seed;
  const seededRandom = () => {
    randomSeed = (randomSeed * 9301 + 49297) % 233280;
    return randomSeed / 233280;
  };
  
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(seededRandom() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Shuffles an array while respecting linked elements and position locks.
 */
export function shuffleArrayRespectingLinks(array, seed = null) {
  if (!array || array.length === 0) return [];

  // Group elements where linked elements stay with their immediate predecessor
  const groups = [];
  let currentGroup = [];
  
  for (let i = 0; i < array.length; i++) {
    const item = array[i];

    if (item.positionType === 'linked' && currentGroup.length > 0) {
      // Linked element joins the current group
      currentGroup.push(item);
    } else {
      // Start a new group
      if (currentGroup.length > 0) {
        groups.push(currentGroup);
      }
      currentGroup = [item];
    }
  }

  // Add the final group
  if (currentGroup.length > 0) {
    groups.push(currentGroup);
  }

  // Create result array
  const result = new Array(array.length).fill(null);
  const usedPositions = new Set();
  
  // First pass: handle explicit position locks
  groups.forEach(group => {
    const firstElement = group[0];
    if (/^\d+$/.test(firstElement.positionType)) {
      const position = parseInt(firstElement.positionType) - 1;
      group.forEach((element, index) => {
        const pos = position + index;
        if (pos < result.length) {
          result[pos] = element;
          usedPositions.add(pos);
        }
      });
    }
  });

  // Second pass: handle 'last' position
  groups.forEach(group => {
    const firstElement = group[0];
    if (firstElement.positionType === 'last') {
      const endPos = result.length - 1;
      const startPos = Math.max(0, endPos - group.length + 1);
      group.forEach((element, index) => {
        const pos = startPos + index;
        if (pos <= endPos && !usedPositions.has(pos)) {
          result[pos] = element;
          usedPositions.add(pos);
        }
      });
    }
  });

  // Filter remaining groups and separate linked groups from normal groups
  const remainingGroups = groups.filter(group => {
    const firstElement = group[0];
    return firstElement.positionType === 'normal' || firstElement.positionType === 'linked';
  });

  // Separate linked groups (must stay together) from normal groups
  // A group is considered a linked group if it contains any linked elements
  const linkedGroups = [];
  const normalGroups = [];
  
  remainingGroups.forEach(group => {
    if (group.some(element => element.positionType === 'linked')) {
      // This group contains linked elements, so it's a linked group
      linkedGroups.push(group);
    } else {
      // This group contains only normal elements
      normalGroups.push(group);
    }
  });

  // Combine all groups for shuffling - linked groups should be shuffled along with normal groups
  // but their internal order should be preserved
  const allGroups = [...linkedGroups, ...normalGroups];
  
  // Shuffle all groups together (both linked and normal groups)
  if (seed !== null) {
    // Use seeded random for deterministic shuffling
    let randomSeed = seed;
    const seededRandom = () => {
      randomSeed = (randomSeed * 9301 + 49297) % 233280;
      return randomSeed / 233280;
    };
    
    for (let i = allGroups.length - 1; i > 0; i--) {
      const j = Math.floor(seededRandom() * (i + 1));
      [allGroups[i], allGroups[j]] = [allGroups[j], allGroups[i]];
    }
  } else {
    // Use regular random for non-deterministic shuffling
    for (let i = allGroups.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [allGroups[i], allGroups[j]] = [allGroups[j], allGroups[i]];
    }
  }
  
  const orderedGroups = allGroups;

  // Place remaining groups in available positions (linked groups first)
  orderedGroups.forEach(group => {
    // Find a starting position where the entire group can fit consecutively
    let placed = false;
    for (let startPos = 0; startPos <= result.length - group.length; startPos++) {
      // Check if we can place the entire group starting at startPos
      let canFit = true;
      for (let i = 0; i < group.length; i++) {
        if (usedPositions.has(startPos + i)) {
          canFit = false;
          break;
        }
      }
      
      if (canFit) {
        // Place the group
        group.forEach((element, index) => {
          result[startPos + index] = element;
          usedPositions.add(startPos + index);
        });
        placed = true;
        break;
      }
    }
    
    // Fallback: if we couldn't place the group as a unit, we must still place all elements
    if (!placed) {
      // Always place all elements, even if it means breaking linked groups
      group.forEach(element => {
        for (let pos = 0; pos < result.length; pos++) {
          if (!usedPositions.has(pos)) {
            result[pos] = element;
            usedPositions.add(pos);
            break;
          }
        }
      });
    }
  });

  // Remove any remaining null values and ensure array is properly sized
  return result.filter(element => element !== null);
}

/**
 * Creates shuffled pattern order for workout-level shuffle
 */
export function createShuffledPatternOrder(patterns, seed = null) {
  const patternIndices = Array.from({ length: patterns.length }, (_, i) => i);
  
  if (seed !== null) {
    return shuffleArrayWithSeed(patternIndices, seed);
  }
  return shuffleArray(patternIndices);
}

/**
 * Gets the next pattern index from shuffled order
 */
export function getNextPatternIndex(generatorState, workout) {
  if (generatorState.workoutIterationType === 'shuffle') {
    if (generatorState.patternOrder && generatorState.patternOrderIndex < generatorState.patternOrder.length) {
      return generatorState.patternOrder[generatorState.patternOrderIndex];
    }
    // Fallback to patternIndex if patternOrder is null or invalid
    return generatorState.patternIndex;
  }
  return generatorState.patternIndex;
}