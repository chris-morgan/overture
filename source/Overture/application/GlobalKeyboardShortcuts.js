import { Class } from '../core/Core.js';
import Object from '../foundation/Object.js';
import '../foundation/EventTarget.js';  // For Function#on
import UA from '../ua/UA.js';
import DOMEvent from '../dom/DOMEvent.js';
import RichTextView from '../views/controls/RichTextView.js';
import ViewEventsController from '../views/ViewEventsController.js';

const isMac = UA.isMac;
const allowedInputs = {
    checkbox: 1,
    radio: 1,
    file: 1,
    submit: 1,
};

const DEFAULT_IN_INPUT = 0;
const ACTIVE_IN_INPUT = 1;
const DISABLE_IN_INPUT = 2;

const handleOnDown = {};

/**
    Class: O.GlobalKeyboardShortcuts

    Extends: O.Object

    This class facilitates adding keyboard shortcuts to your application.
*/
const GlobalKeyboardShortcuts = Class({

    Extends: Object,

    /**
        Property: O.GlobalKeyboardShortcuts#isEnabled
        Type: Boolean
        Default: true

        Callbacks will only fire if this property is true when the instance
        handles the event.
    */

    /**
        Property (private): O.GlobalKeyboardShortcuts#_shortcuts
        Type: Object

        The map of shortcut key to an array of `[object, method]` tuples.
    */

    /**
        Constructor: O.GlobalKeyboardShortcuts
    */
    init: function ( mixin ) {
        this.isEnabled = true;
        this._shortcuts = {};

        GlobalKeyboardShortcuts.parent.init.call( this, mixin );

        ViewEventsController.kbShortcuts = this;
        ViewEventsController.addEventTarget( this, -10 );
    },

    /**
        Method: O.GlobalKeyboardShortcuts#destroy

        Destructor.
    */
    destroy: function () {
        if ( ViewEventsController.kbShortcuts === this ) {
            delete ViewEventsController.kbShortcuts;
        }
        ViewEventsController.removeEventTarget( this );
        GlobalKeyboardShortcuts.parent.destroy.call( this );
    },

    /**
        Method: O.GlobalKeyboardShortcuts#register

        Add a global keyboard shortcut. If a shortcut has already been
        registered for this key, it will be replaced, but will be restored when
        the new handler is removed.

        Parameters:
            key     - {String} The key to trigger the callback on. Modifier keys
                      (alt, ctrl, meta, shift) should be prefixed in
                      alphabetical order and with a hypen after each one.
                      Letters should be lower case. e.g. `ctrl-f`.

                      The special modifier "cmd-" may be used, which will map
                      to "meta-" on a Mac (the command key) and "Ctrl-"
                      elsewhere.
            object  - {Object} The object to trigger the callback on.
            method  - {String} The name of the method to trigger.
            ifInput - {Number} Determines whether the shortcut is active when
                      focused inside an <input> or equivalent. Defaults to
                      active if and only if meta or ctrl are part of the
                      shortcut. The value must be one of:

                      * DEFAULT_IN_INPUT (Use the default)
                      * ACTIVE_IN_INPUT (Active when input is focused)
                      * DISABLE_IN_INPUT (Not active when input is focused)

        Returns:
            {O.GlobalKeyboardShortcuts} Returns self.
    */
    register: function ( key, object, method, ifInput ) {
        key = key.replace( 'cmd-', isMac ? 'meta-' : 'ctrl-' );
        const shortcuts = this._shortcuts;
        ( shortcuts[ key ] || ( shortcuts[ key ] = [] ) )
            .push([ object, method, ifInput || DEFAULT_IN_INPUT ]);
        return this;
    },

    /**
        Method: O.GlobalKeyboardShortcuts#deregister

        Remove a global keyboard shortcut. Must use identical arguments to those
        which were used in the call to <O.GlobalKeyboardShortcuts#register>.

        Parameters:
            key    - {String} The key on which the callback was triggered.
            object - {Object} The object on which the callback was triggered.
            method - {String} The name of the method that was being triggered.

        Returns:
            {O.GlobalKeyboardShortcuts} Returns self.
   */
    deregister: function ( key, object, method ) {
        key = key.replace( 'cmd-', isMac ? 'meta-' : 'ctrl-' );
        const current = this._shortcuts[ key ];
        const length = current ? current.length : 0;
        let l = length;
        while ( l-- ) {
            const item = current[l];
            if ( item[0] === object && item[1] === method ) {
                if ( length === 1 ) {
                    delete this._shortcuts[ key ];
                } else {
                    current.splice( l, 1 );
                }
            }
        }
        return this;
    },

    /**
        Method: O.GlobalKeyboardShortcuts#getHandlerForKey

        Get the keyboard shortcut to be triggered by a key combo, represented as
        a string, as output by <O.DOMEvent#lookupKey>.

        Parameters:
            key - {String} The key combo to get the handler for.

        Returns:
            {Array|null} Returns the [ object, method ] tuple to be triggered by
            the event, or null if nothing is registered for this key press.
   */
    getHandlerForKey: function ( key ) {
        const shortcuts = this._shortcuts[ key ];
        if ( shortcuts && this.get( 'isEnabled' ) ) {
            return shortcuts[ shortcuts.length - 1 ];
        }
        return null;
    },

    /**
        Method: O.GlobalKeyboardShortcuts#trigger

        Keypress event handler. Triggers any registered callback.

        Parameters:
            event - {DOMEvent} The keydown/keypress event.
   */
    trigger: function ( event ) {
        const target = event.target;
        const nodeName = target.nodeName;
        const isSpecialKey = event.ctrlKey || event.metaKey;
        const inputIsFocused = (
            nodeName === 'TEXTAREA' ||
            nodeName === 'SELECT' ||
            ( nodeName === 'INPUT' && !allowedInputs[ target.type ] ) ||
            ( event.targetView instanceof RichTextView )
        );
        const key = DOMEvent.lookupKey( event );
        if ( event.type === 'keydown' ) {
            handleOnDown[ key ] = true;
        } else if ( handleOnDown[ key ] ) {
            return;
        }
        const handler = this.getHandlerForKey( key );
        if ( handler ) {
            const ifInput = handler[2];
            if ( inputIsFocused && ifInput !== ACTIVE_IN_INPUT &&
                    ( !isSpecialKey || ifInput === DISABLE_IN_INPUT ) ) {
                return;
            }
            handler[0][ handler[1] ]( event );
            if ( !event.doDefault ) {
                event.preventDefault();
            }
        }
    }.on( 'keydown', 'keypress' ),
});

GlobalKeyboardShortcuts.DEFAULT_IN_INPUT = DEFAULT_IN_INPUT;
GlobalKeyboardShortcuts.ACTIVE_IN_INPUT = ACTIVE_IN_INPUT;
GlobalKeyboardShortcuts.DISABLE_IN_INPUT = DISABLE_IN_INPUT;

export default GlobalKeyboardShortcuts;
