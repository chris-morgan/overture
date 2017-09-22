import Obj from './Object';

const objPrototype = Obj.prototype;

/**
    Mixin: O.EventTarget

    The EventTarget mixin allows you to add custom event support to any other
    class complete with support for bubbling. Simply add a `Mixin:
    O.EventTarget` property to your class. Then you can fire an event at any
    time by calling `this.fire('eventName')`. If you add a target to support
    bubbling, it is recommended you add a prefix to the name of your events, to
    distinguish them from those of other classes, e.g. the IO class fires
    `io:eventName` events.

    DEPRECATED. Craft classes that extend <O.Object> instead.
    (This only lingers because the Overture loader is using it.)
*/
export default {
    on: objPrototype.on,
    once: objPrototype.once,
    fire: objPrototype.fire,
    off: objPrototype.off,
    nextEventTarget: objPrototype.nextEventTarget,
};
