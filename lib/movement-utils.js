/**
 * Movement Utilities Library
 * Core movement operations for patterns, shots, and messages
 */

/**
 * Gets all siblings for an element in the same container.
 * @param {HTMLElement} element The element to get siblings for.
 * @param {HTMLElement} mainContainer The main container element.
 * @returns {Array<HTMLElement>} Array of sibling elements.
 */
export function getSiblings(element, mainContainer) {
  if (element.classList.contains("pattern-instance")) {
    return Array.from(mainContainer.querySelectorAll(".pattern-instance"));
  } else if (element.classList.contains("shot-msg-instance")) {
    const parent = element.closest(".pattern-instance");
    return Array.from(parent.querySelectorAll(".shot-msg-instance"));
  }
  return [];
}

/**
 * Finds the linked group that contains a specific element.
 * @param {HTMLElement} element The element to find the group for.
 * @param {HTMLElement} mainContainer The main container element.
 * @returns {Array<HTMLElement>} Array of elements in the linked group (including the element itself).
 */
export function getLinkedGroup(element, mainContainer) {
  const siblings = getSiblings(element, mainContainer);
  const elementIndex = siblings.indexOf(element);
  const group = [element];

  // Find linked elements before this one
  for (let i = elementIndex - 1; i >= 0; i--) {
    if (siblings[i + 1].dataset.linkedWithPrevious === "true") {
      group.unshift(siblings[i]);
    } else {
      break;
    }
  }

  // Find linked elements after this one
  for (let i = elementIndex + 1; i < siblings.length; i++) {
    if (siblings[i].dataset.linkedWithPrevious === "true") {
      group.push(siblings[i]);
    } else {
      break;
    }
  }

  return group;
}

/**
 * Checks if any element in a group is position-locked.
 * @param {Array<HTMLElement>} group Array of elements in the group.
 * @returns {boolean} True if any element in the group is locked.
 */
export function isGroupLocked(group) {
  return group.some((element) => element.dataset.positionLocked === "true");
}

/**
 * Gets the lock type of a group (position or last) if any member is locked.
 * @param {Array<HTMLElement>} group Array of elements in the group.
 * @returns {string|null} Lock type ('position' or 'last') or null if not locked.
 */
export function getGroupLockType(group) {
  const lockedElement = group.find((element) => element.dataset.positionLocked === "true");
  return lockedElement ? (lockedElement.dataset.positionLockType || "position") : null;
}

/**
 * Updates the visual styling for all elements in a linked group based on lock state.
 * @param {HTMLElement} element Any element from the group to update.
 * @param {HTMLElement} mainContainer The main container element.
 */
export function updateGroupLockStyling(element, mainContainer) {
  const group = getLinkedGroup(element, mainContainer);
  const isLocked = isGroupLocked(group);
  const lockType = getGroupLockType(group);

  group.forEach((groupElement) => {
    // Update visual indicators based on lock state
    groupElement.classList.toggle('position-locked', isLocked && lockType === 'position');
    groupElement.classList.toggle('position-locked-last', isLocked && lockType === 'last');
  });
}

/**
 * Checks if an element can be moved (considering group constraints).
 * @param {HTMLElement} element The element to check.
 * @param {HTMLElement} mainContainer The main container element.
 * @returns {boolean} True if the element can be moved.
 */
export function canElementMoveInGroup(element, mainContainer) {
  const group = getLinkedGroup(element, mainContainer);

  // If any element in the group is position-locked, the entire group cannot move
  if (isGroupLocked(group)) {
    const lockType = getGroupLockType(group);
    if (lockType === 'position') {
      return false;
    }
    // Last-locked groups can potentially move if they remain last
    return lockType === 'last';
  }

  return true;
}

/**
 * Checks if an element can be moved (not locked or only locked to last position in a moveable way).
 * @param {HTMLElement} element The element to check.
 * @returns {boolean} True if the element can participate in swaps.
 */
export function canElementMove(element) {
  if (element.dataset.positionLocked !== "true") {
    return true; // Not locked, can move
  }

  const lockType = element.dataset.positionLockType || "position";
  if (lockType === "position") {
    // Position-locked elements can participate in swaps if it helps them reach their target position
    // The isSwapValid function will determine if the specific swap is allowed
    return true;
  } else if (lockType === "last") {
    // Last-locked elements can only move if they remain last
    // For now, we'll allow them to participate in swaps and let isSwapValid determine validity
    return true;
  }

  return false;
}

/**
 * Validates that a potential element arrangement satisfies all movement constraints.
 * @param {Array<HTMLElement>} elements The proposed arrangement of elements.
 * @param {Array<HTMLElement>} originalElements The original arrangement before any changes.
 * @returns {boolean} True if the arrangement is valid.
 */
export function validateElementArrangement(elements, originalElements) {
  // Check position locks - elements with position locks must stay in their original positions
  for (let i = 0; i < originalElements.length; i++) {
    const originalElement = originalElements[i];
    if (originalElement.dataset.positionLocked === "true") {
      const lockType = originalElement.dataset.positionLockType || "position";

      if (lockType === "position") {
        // Position-locked elements must stay in their exact 1-based position
        const currentIndex = elements.indexOf(originalElement);
        if (currentIndex !== i) {
          return false; // Element moved from its locked position
        }
      } else if (lockType === "last") {
        // Last-locked elements must be at the end of the list
        const currentIndex = elements.indexOf(originalElement);
        if (currentIndex !== elements.length - 1) {
          return false; // Element is not at the end
        }
      }
    }
  }

  // Check linkage constraints - linked elements must immediately follow the element they're linked to
  for (let i = 0; i < elements.length; i++) {
    const element = elements[i];
    if (element.dataset.linkedWithPrevious === "true") {
      if (i === 0) {
        return false; // Linked element cannot be first
      }

      // Find what this element was originally linked to in the original arrangement
      const originalIndex = originalElements.indexOf(element);
      if (originalIndex > 0) {
        const originalLinkedTo = originalElements[originalIndex - 1];
        const currentPrevious = elements[i - 1];

        // The element should still be immediately following the same element it was originally linked to
        if (originalLinkedTo !== currentPrevious) {
          return false; // Linked element is no longer following its original linked-to element
        }
      }
    }
  }

  return true; // All constraints satisfied
}

/**
 * Checks if a swap between two elements would result in a valid arrangement.
 * @param {HTMLElement} element1 The first element to swap.
 * @param {HTMLElement} element2 The second element to swap.
 * @param {Array<HTMLElement>} siblings Array of all siblings.
 * @returns {boolean} True if the swap is valid.
 */
export function isSwapValid(element1, element2, siblings) {
  // Create a simulated arrangement after the swap
  const simulatedArrangement = [...siblings];
  const index1 = simulatedArrangement.indexOf(element1);
  const index2 = simulatedArrangement.indexOf(element2);

  // Perform the swap in the simulation
  simulatedArrangement[index1] = element2;
  simulatedArrangement[index2] = element1;

  // Validate the arrangement against all constraints
  return validateElementArrangement(simulatedArrangement, siblings);
}

/**
 * Finds a suitable swap target for moving in a given direction.
 * @param {HTMLElement} element The element to move.
 * @param {string} direction 'up' or 'down'.
 * @param {HTMLElement} mainContainer The main container element.
 * @returns {HTMLElement|null} The element to swap with, or null if no valid swap.
 */
export function findSwapTarget(element, direction, mainContainer) {
  const siblings = getSiblings(element, mainContainer);
  const currentIndex = siblings.indexOf(element);

  // If there are only 2 items total, they can only swap with each other
  if (siblings.length <= 2) {
    const otherElement = siblings.find((s) => s !== element);
    if (otherElement && canElementMove(otherElement)) {
      return isSwapValid(element, otherElement, siblings)
        ? otherElement
        : null;
    }
    return null;
  }

  if (direction === "up") {
    // Look for the first valid swap target going up
    for (let i = currentIndex - 1; i >= 0; i--) {
      const candidate = siblings[i];
      if (canElementMove(candidate) && isSwapValid(element, candidate, siblings)) {
        return candidate;
      }
    }
  } else if (direction === "down") {
    // Look for the first valid swap target going down
    for (let i = currentIndex + 1; i < siblings.length; i++) {
      const candidate = siblings[i];
      if (canElementMove(candidate) && isSwapValid(element, candidate, siblings)) {
        return candidate;
      }
    }
  }

  return null; // No valid swap target found
}

/**
 * Checks if a position move is valid by finding a swap target.
 * @param {HTMLElement} element The element to move.
 * @param {string} direction 'up' or 'down'.
 * @param {HTMLElement} mainContainer The main container element.
 * @returns {boolean} True if the move is valid.
 */
export function canMoveToPosition(element, direction, mainContainer) {
  return findSwapTarget(element, direction, mainContainer) !== null;
}

/**
 * Performs a swap between two elements in the DOM.
 * @param {HTMLElement} element1 First element to swap.
 * @param {HTMLElement} element2 Second element to swap.
 */
export function swapElements(element1, element2) {
  // Get the parent containers
  const parent1 = element1.parentNode;
  const parent2 = element2.parentNode;

  // Handle case where elements have same parent (most common case)
  if (parent1 === parent2) {
    const parent = parent1;



    // Check if elements are adjacent
    if (element1.nextSibling === element2) {
      // element1 is immediately before element2
      parent.insertBefore(element2, element1);
    } else if (element2.nextSibling === element1) {
      // element2 is immediately before element1
      parent.insertBefore(element1, element2);
    } else {
      // Elements are not adjacent, use next sibling approach
      const next1 = element1.nextSibling;
      const next2 = element2.nextSibling;

      // Remove both elements first
      parent.removeChild(element1);
      parent.removeChild(element2);

      // Insert element1 where element2 was
      if (next2) {
        parent.insertBefore(element1, next2);
      } else {
        parent.appendChild(element1);
      }

             // Insert element2 where element1 was
       if (next1) {
         parent.insertBefore(element2, next1);
       } else {
         parent.appendChild(element2);
       }
     }
  } else {
    // Handle case where elements have different parents
    const next1 = element1.nextSibling;
    const next2 = element2.nextSibling;

    // Swap the elements
    if (next1) {
      parent1.insertBefore(element2, next1);
    } else {
      parent1.appendChild(element2);
    }

    if (next2) {
      parent2.insertBefore(element1, next2);
    } else {
      parent2.appendChild(element1);
    }
  }
}

/**
 * Moves a group of linked elements to a new position.
 * @param {Array<HTMLElement>} group Array of elements in the linked group.
 * @param {HTMLElement} targetElement The element to move the group before/after.
 * @param {string} direction 'up' or 'down'.
 */
export function moveGroup(group, targetElement, direction) {
  const targetParent = targetElement.parentNode;

  if (direction === "up") {
    // Insert group before target element
    group.forEach((element) => {
      targetParent.insertBefore(element, targetElement);
    });
  } else {
    // Insert group after target element
    group.reverse().forEach((element) => {
      const nextSibling = targetElement.nextSibling;
      if (nextSibling) {
        targetParent.insertBefore(element, nextSibling);
      } else {
        targetParent.appendChild(element);
      }
    });
  }
}

/**
 * Finds the next available position up for movement.
 * @param {HTMLElement} element The element to find position for.
 * @param {HTMLElement} mainContainer The main container element.
 * @returns {boolean} True if the element can move up, false otherwise.
 */
export function findNextAvailablePositionUp(element, mainContainer) {
  return findSwapTarget(element, 'up', mainContainer) !== null;
}

/**
 * Finds the next available position down for movement.
 * @param {HTMLElement} element The element to find position for.
 * @param {HTMLElement} mainContainer The main container element.
 * @returns {boolean} True if the element can move down, false otherwise.
 */
export function findNextAvailablePositionDown(element, mainContainer) {
  return findSwapTarget(element, 'down', mainContainer) !== null;
}

/**
 * Checks if an element is the last element in its sibling group.
 * @param {HTMLElement} element The element to check.
 * @param {HTMLElement} mainContainer The main container element.
 * @returns {boolean} True if the element is last.
 */
export function isLastElement(element, mainContainer) {
  const siblings = getSiblings(element, mainContainer);
  return siblings.indexOf(element) === siblings.length - 1;
}

// CommonJS exports for Node.js/Jest compatibility
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    getSiblings,
    getLinkedGroup,
    isGroupLocked,
    getGroupLockType,
    updateGroupLockStyling,
    canElementMoveInGroup,
    isSwapValid,
    findSwapTarget,
    canElementMove,
    canMoveToPosition,
    swapElements,
    moveGroup,
    findNextAvailablePositionUp,
    findNextAvailablePositionDown,
    isLastElement
  };
}
