// Copyright 2023 The Lynx Authors. All rights reserved.
// Licensed under the Apache License Version 2.0 that can be found in the
// LICENSE file in the root directory of this source tree.
import { OperationType } from '../types/ElementOperation.js';
import {
  _attributes,
  _children,
  ancestorDocument,
  OffscreenElement,
} from './OffscreenElement.js';
import {
  eventPhase,
  OffscreenEvent,
  propagationStopped,
} from './OffscreenEvent.js';

export const operations = Symbol('operations');
export const enableEvent = Symbol('enableEvent');
export const getElementByUniqueId = Symbol('getElementByUniqueId');
export const _onEvent = Symbol('_onEvent');
const _uniqueIdInc = Symbol('uniqueIdInc');
const _uniqueIdToElement = Symbol('_uniqueIdToElement');
export class OffscreenDocument extends OffscreenElement {
  /**
   * @private
   */
  [_uniqueIdInc] = 1;

  /**
   * @private
   */
  [_uniqueIdToElement]: WeakRef<OffscreenElement>[] = [];

  /**
   * @private
   */
  [operations]: (string | number)[] = [];

  /**
   * @private
   * @param uniqueId
   * @returns
   */
  [getElementByUniqueId](uniqueId: number): OffscreenElement | undefined {
    return this[_uniqueIdToElement][uniqueId]?.deref();
  }

  [enableEvent]: (eventType: string, uid: number) => void;
  constructor(
    private _callbacks: {
      onCommit: (operations: (string | number)[]) => void;
    },
  ) {
    const enableEventImpl: (nm: string, uid: number) => void = (
      eventType,
      uid,
    ) => {
      this[operations].push(
        OperationType.EnableEvent,
        uid,
        eventType,
      );
    };
    super('', 0);
    this[ancestorDocument] = this;
    this[enableEvent] = enableEventImpl;
  }

  commit(): void {
    const currentOperations = this[operations];
    this[operations] = [];
    this._callbacks.onCommit(currentOperations);
  }

  createElement(tagName: string): OffscreenElement {
    const uniqueId = this[_uniqueIdInc]++;
    const element = new OffscreenElement(tagName, uniqueId);
    element[ancestorDocument] = this;
    this[_uniqueIdToElement][uniqueId] = new WeakRef(element);
    this[operations].push(
      OperationType.CreateElement,
      uniqueId,
      tagName,
    );
    return element;
  }

  [_onEvent] = (
    eventType: string,
    targetUniqueId: number,
    bubbles: boolean,
    otherProperties: Parameters<typeof structuredClone>[0],
  ) => {
    const target = this[getElementByUniqueId](targetUniqueId);
    if (target) {
      const bubblePath: OffscreenElement[] = [];
      let tempTarget: OffscreenElement = target;
      while (tempTarget.parentElement) {
        bubblePath.push(tempTarget.parentElement);
        tempTarget = tempTarget.parentElement;
      }
      const event = new OffscreenEvent(eventType, target);
      Object.assign(event, otherProperties);
      // capture phase
      event[eventPhase] = Event.CAPTURING_PHASE;
      for (let ii = bubblePath.length - 1; ii >= 0; ii--) {
        const currentPhaseTarget = bubblePath[ii]!;
        currentPhaseTarget.dispatchEvent(event);
        if (event[propagationStopped]) {
          return;
        }
      }
      // target phase
      event[eventPhase] = Event.AT_TARGET;
      target.dispatchEvent(event);
      // bubble phase
      if (bubbles) {
        event[eventPhase] = Event.BUBBLING_PHASE;
        for (const currentPhaseTarget of bubblePath) {
          currentPhaseTarget.dispatchEvent(event);
          if (event[propagationStopped]) {
            return;
          }
        }
      }
    }
  };
}
