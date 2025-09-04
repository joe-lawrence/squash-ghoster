/**
 * Finds the correct insertion position for a cloned element, considering linked groups and position locks.
 *
 * @param {any} sourceElement - The element being cloned.
 * @param {Array<any>} siblings - Array of elements (DOM or plain objects).
 * @param {Object} [options] - Optional config: { getLinkedGroup, getElementPosition, isLocked, getLockType, getTargetPosition }
 * @returns {any|null} The element to insert before, or null to append at end.
 */
export function findCloneInsertionPositionShared(
  sourceElement,
  siblings,
  options = {}
) {
  const getLinkedGroup = options.getLinkedGroup || (el => [el]);
  const getElementPosition = options.getElementPosition || ((el, sibs) => sibs.indexOf(el) + 1);
  const isLocked = options.isLocked || (el => el.positionLocked === true || (el.dataset && el.dataset.positionLocked === 'true'));
  const getLockType = options.getLockType || (el => el.positionLockType || (el.dataset && el.dataset.positionLockType));
  const getTargetPosition = options.getTargetPosition || ((el, sibs) => el.targetPosition || (el.dataset && parseInt(el.dataset.positionCycleState) + 1) || getElementPosition(el, sibs));

  const sourceIndex = siblings.indexOf(sourceElement);
  if (sourceIndex === -1) return null;

  // Get the linked group of the source element
  const sourceGroup = getLinkedGroup(sourceElement, siblings);
  const lastGroupElement = sourceGroup[sourceGroup.length - 1];
  const lastGroupIndex = siblings.indexOf(lastGroupElement);

  // The clone should be inserted immediately after the source group
  const insertAfterIndex = lastGroupIndex;

  // Find the next element after the source group
  const nextElementIndex = insertAfterIndex + 1;

  if (nextElementIndex >= siblings.length) {
    // No elements after the source group, append at the end
    return null;
  }

  // Check if the next element is position-locked to a specific position
  const nextElement = siblings[nextElementIndex];
  if (isLocked(nextElement)) {
    const lockType = getLockType(nextElement);
    if (lockType === 'last') {
      // "Last" position is relative, so we can insert before it
      return nextElement;
    } else {
      // Fixed position lock - check if inserting after the source would shift the locked element
      const lockedTargetPos = getTargetPosition(nextElement, siblings);
      if (nextElementIndex + 1 !== lockedTargetPos) {
        // Inserting after the source would shift the locked element, so insert before it
        return nextElement;
      } else {
        // The locked element is at its correct position, so we can insert after the source
        // Scan forward for the next non-locked or last-locked element
        let scanIndex = nextElementIndex + 1;
        while (scanIndex < siblings.length && isLocked(siblings[scanIndex]) && getLockType(siblings[scanIndex]) !== 'last') {
          const lockedTarget = getTargetPosition(siblings[scanIndex], siblings);
          if (scanIndex + 1 !== lockedTarget) {
            return siblings[scanIndex];
          }
          scanIndex++;
        }
        if (scanIndex < siblings.length) {
          return siblings[scanIndex];
        } else {
          // All remaining elements are locked, so append at the end
          return null;
        }
      }
    }
  }
  // If the source element is locked, allow the clone to be inserted immediately after the source
  if (isLocked(sourceElement) && getLockType(sourceElement) !== 'last') {
    if (insertAfterIndex + 1 < siblings.length) {
      return siblings[insertAfterIndex + 1];
    } else {
      return null;
    }
  }
  // After the source group, scan forward for the first locked element at its locked position
  for (let scanIndex = insertAfterIndex + 1; scanIndex < siblings.length; scanIndex++) {
    const el = siblings[scanIndex];
    if (isLocked(el) && getLockType(el) !== 'last') {
      const lockedTargetPos = getTargetPosition(el, siblings);
      if (lockedTargetPos === scanIndex + 1) {
        // Insert before this locked element
        return el;
      }
    }
  }
  // No such locked element found, append at the end
  return null;
}

/**
 * Finds the correct insertion position for a new pattern, considering linked groups and position locks.
 * This follows the same logic as shot/message insertion: when adding new (no source), only look for last-locked.
 *
 * @param {Array<any>} existingPatterns - Array of existing pattern elements.
 * @param {Object} [options] - Optional config: { isLocked, getLockType }
 * @returns {any|null} The element to insert before, or null to append at end.
 */
export function findPatternInsertionPositionShared(
  existingPatterns,
  options = {}
) {
  const isLocked = options.isLocked || (el =>
    (el.positionLocked === true || (el.dataset && el.dataset.positionLocked === 'true'))
  );
  const getLockType = options.getLockType || (el =>
    el.positionLockType || (el.dataset && el.dataset.positionLockType)
  );

  // When adding a new pattern (no source element), only look for last-locked elements
  // This matches the shot/message logic: if (!sourceElement) { look for last-locked }
  for (let i = 0; i < existingPatterns.length; i++) {
    if (isLocked(existingPatterns[i]) && getLockType(existingPatterns[i]) === 'last') {
      return existingPatterns[i];
    }
  }

  // Otherwise, append at the end
  return null;
}
