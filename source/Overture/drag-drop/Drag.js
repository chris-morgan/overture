// -------------------------------------------------------------------------- \\
// File: Drag.js                                                              \\
// Module: DragDrop                                                           \\
// Requires: Core, Foundation, DOM, View, DragController.js, DragEffect.js    \\
// Author: Neil Jenkins                                                       \\
// License: © 2010-2015 FastMail Pty Ltd. MIT Licensed.                       \\
// -------------------------------------------------------------------------- \\

/*global document */

import { Class } from '../core/Core.js';
import '../core/Array.js';  // For Array#include
import '../core/String.js';  // For String#contains
import Object from '../foundation/Object.js';
import RunLoop from '../foundation/RunLoop.js';  // Also Function#queue
import '../foundation/ComputedProps.js';  // For Function#property
import Element from '../dom/Element.js';
import Stylesheet from '../dom/Stylesheet.js';
import ScrollView from '../views/containers/ScrollView.js';
import ViewEventsController from '../views/ViewEventsController.js';

import DragController from './DragController.js';  // Circular but it's OK
import DragEffect from './DragEffect.js';

/* Issues with native drag and drop.

This system hooks into the native HTML5 drag and drop event system to allow data
to be dragged not just within the window but also between windows and other
applications/the OS itself. However, by default, all drags initiated within the
application will bypass this system and use a custom implementation, as the
native implementation (and indeed the spec) is extremely buggy. Problems (as of
13.05.11) include:

1. If an element is draggable, you cannot select text in any text input area
   underneath it.
2. Webkit sometimes repeatedly fires dragstart events rather than dragover
   events after the first dragstart. This has something to do with setDragImage,
   which also fails in some circumstances.
3. Webkit doesn't like a <canvas> element set as the drag image.
3. In webkit, drags initiated from image elements ignore setDragImage calls
   (http://www.alertdebugging.com/drag-and-drop-bugs/)
4. The spec is still changing from day to day, meaning the browser
   implementations are likely to change as well.
5. In Firefox, setDragImage only works with visible elements.

If you want to initiate a drag with data for an external app (e.g. a file download), you can still do this, by setting a draggable="true" attribute on the HTML element to be dragged and handling the dragstart event.

Native support is turned on for drop targets though, as there are no
show-stopping bugs here, so this is handled as normal.

*/

// Inlined from O.DragEffect
var NONE = 0,
    COPY = 1,
    MOVE = 2,
    LINK = 4,
    ALL = COPY|MOVE|LINK,
    DEFAULT = 8,
    effectToString = DragEffect.effectToString;

/**
    Class: O.Drag

    Extends: O.Object

    Represents a drag operation being performed by a user.
*/
var Drag = Class({

    Extends: Object,

    /**
        Constructor: O.Drag

        Parameters:
            mixin - {Object} Overrides any properties on the object. Must
                    include an `event` property containing the event object that
                    triggered the drag.
    */
    init: function ( mixin ) {
        var event = mixin.event;

        this._dragCursor = null;
        this._stylesheet = null;
        this._scrollBounds = null;
        this._scrollView = null;
        this._scrollBy = null;
        this._scrollInterval = null;
        this._lastTargetView = null;

        this.isNative = false;
        this.dragSource = null;
        this.allowedEffects = ALL;
        this.dataSource = null;
        this.dropTarget = null;
        this.dropEffect = DEFAULT;
        this.cursorPosition = this.startPosition = {
            x: event.clientX,
            y: event.clientY,
        };
        this.defaultCursor = 'default';
        this.dragImage = null;

        Drag.parent.init.call( this, mixin );

        this._setCursor( true );
        this.startDrag();
    },

    /**
        Property: O.Drag#isNative
        Type: Boolean

        Is this drag triggered by native drag/drop events rather than mouse
        up/down events?
    */

    /**
        Property: O.Drag#dragSource
        Type: O.View|null

        The view on which the drag was initiated, if initiated in the current
        window. Otherwise null.
    */

    /**
        Property: O.Drag#allowedEffects
        Type: O.DragEffect
        Default: O.DragEffect.ALL

        Which effects (move/copy/link) will the drag source allow the drop
        target to perform with the data represented by this drag.
    */

    /**
        Property: O.Drag#dataSource
        Type: O.DragDataSource|null

        An object providing access to the data represented by the drag. If null,
        the <O.Drag#dragSource> object will be used as the data source if it is
        present and contains the <O.DragDataSource> mixin. Otherwise, the drag
        is presumed not to represent any data.
    */

    /**
        Property: O.Drag#dropTarget
        Type: O.DropTarget|null

        The nearest <O.DropTarget> implementing view (going up the view tree)
        under the mouse cursor at the moment, or null if none of them are drop
        targets.
    */

    /**
        Property: O.Drag#dropEffect
        Type: O.DragEffect
        Default: O.DragEffect.DEFAULT

        The effect of the action that will be performed on the data should a
        drop be performed. This should be set by the current drop target.
    */

    /**
        Property: O.Drag#cursorPosition
        Type: Object

        Contains `x` and `y` values indicating the current cursor position
        relative to the browser window.
    */

    /**
        Property: O.Drag#startPosition
        Type: Object

        Contains `x` and `y` values indicating the cursor position when the drag
        was initiated, relative to the browser window.
    */

    /**
        Property: O.Drag#defaultCursor
        Type: String
        Default: 'default'

        The CSS cursor property value for the cursor to use when no drop effect
        has been set.
    */

    /**
        Property: O.Drag#dragImage
        Type: Element|null

        A DOM element to display next to the cursor whilst the drag is active.
        This could be a simple <img> or <canvas> tag, or a more complicated DOM
        tree.
    */

    /**
        Property: O.Drag#dragImageOffset
        Type: Object
        Default: { x: 5, y: 5 }

        x - {Number} The number of pixels to the right of the cursor at which
            the drag image should begin.
        y - {Number} The number of pixels to the bottom of the cursor at which
            the drag image should begin.
    */
    dragImageOffset: { x: 5, y: 5 },

    /**
        Method (private): O.Drag#_dragImageDidChange

        Observes the <O.Drag#dragImage> property and updates the image being
        dragged if it changes.

        Parameters:
            _        - {*} Ignored.
            __       - {*} Ignored.
            oldImage - {Element|null} The current drag image.
            image    - {Element|null} The new drag image to set.
    */
    _dragImageDidChange: function ( _, __, oldImage, image ) {
        if ( this.isNative ) {
            var offset = this.get( 'dragImageOffset' );
            this.event.dataTransfer.setDragImage( image, offset.x, offset.y );
        } else {
            var dragCursor = this._dragCursor;
            if ( dragCursor ) {
                if ( oldImage ) {
                    dragCursor.removeChild( oldImage );
                }
            } else {
                dragCursor = this._dragCursor = Element.create( 'div', {
                    style: 'position: fixed; z-index: 9999;',
                });
                this._updateDragImagePosition();
                document.body.appendChild( dragCursor );
            }
            dragCursor.appendChild( image );
        }
    }.observes( 'dragImage' ),

    /**
        Method (private): O.Drag#_updateDragImagePosition

        Observes the <O.Drag#cursorPosition> and <O.Drag#dragImageOffset>
        properties and repositions the drag image as appropriate (if it's not a
        native drag, where the browser will automatically update the drag image.
    */
    _updateDragImagePosition: function () {
        var dragImage = this._dragCursor,
            cursor, offset;
        if ( dragImage ) {
            cursor = this.get( 'cursorPosition' );
            offset = this.get( 'dragImageOffset' );
            dragImage.style.left = ( cursor.x + Math.max( offset.x, 5 ) ) + 'px';
            dragImage.style.top = ( cursor.y + Math.max( offset.y, 5 ) ) + 'px';
        }
    }.queue( 'render' ).observes( 'cursorPosition', 'dragImageOffset' ),

    /**
        Method (private): O.Drag#_setCursor

        Sets the on-screen cursor image based on the current dropEffect,
        overriding the normal cursor image.

        Parameters:
            set - {Boolean} If true, the cursor image will be overriden to match
                  the drop effect. If false, it will be set back to the default
                  (e.g. hand when over a link, pointer otherwise).
    */
    _setCursor: function ( set ) {
        var stylesheet = this._stylesheet,
            cursor = this.get( 'defaultCursor' );
        if ( stylesheet ) {
            stylesheet.parentNode.removeChild( stylesheet );
            stylesheet = null;
        }
        if ( set ) {
            switch ( this.get( 'dropEffect' ) ) {
                case NONE:
                    cursor = 'no-drop';
                    break;
                case COPY:
                    cursor = 'copy';
                    break;
                case LINK:
                    cursor = 'alias';
                    break;
            }

            stylesheet = Stylesheet.create( 'o-drag-cursor',
                '*{cursor:default !important;cursor:' + cursor + ' !important;}'
            );
        }
        this._stylesheet = stylesheet;
    }.observes( 'defaultCursor', 'dropEffect' ),

    /**
        Property: O.Drag#dataTypes
        Type: String[]

        An array of the data types available to drop targets of this drag. The
        data type will be the MIME type of the data if a native drag, or a
        custom string if non-native. Native drags representing at least one
        file, will also contain a `'Files'` data type.
    */
    dataTypes: function () {
        var dataSource = this.get( 'dataSource' ) || this.get( 'dragSource' );
        if ( dataSource && dataSource.get( 'isDragDataSource' ) ) {
            return dataSource.get( 'dragDataTypes' );
        }
        if ( this.isNative ) {
            var dataTransfer = this.event.dataTransfer;
            // Current HTML5 DnD interface
            var items = dataTransfer.items,
                types = [],
                hasFiles = false,
                l, item, itemType;
            if ( items ) {
                l = items.length;
                while ( l-- ) {
                    item = items[l];
                    itemType = item.type;
                    if ( !hasFiles ) {
                        hasFiles = ( item.kind === 'file' );
                    }
                    if ( itemType ) {
                        types.include( itemType );
                    }
                }
                if ( hasFiles ) {
                    types.push( 'Files' );
                }
                return types;
            }
            // Deprecated HTML5 DnD interface
            if ( dataTransfer.types ) {
                return Array.prototype.slice.call( dataTransfer.types );
            }
        }
        return [];
    }.property(),

    /**
        Method: O.Drag#hasDataType

        Parameters
            type - {String} The type to test for.

        Returns:
            {Boolean} Does the drag contain data of this type?
    */
    hasDataType: function ( type ) {
        return this.get( 'dataTypes' ).indexOf( type ) !== -1;
    },

    /**
        Method: O.Drag#getFiles

        Parameters
            typeRegExp - {RegExp} (optional) A regular expression to match
                         against the file's MIME type.

        Returns:
            {File[]} An array of all files represented by the drag, or if a
            regular expression is given, an array of all files with a matching
            MIME type.
    */
    getFiles: function ( typeRegExp ) {
        var files = [],
            dataTransfer = this.event.dataTransfer,
            items, i, l, item, itemType;
        if ( dataTransfer ) {
            // Current HTML5 DnD interface
            if ( ( items = dataTransfer.items ) ) {
                for ( i = 0, l = items.length; i < l; i += 1 ) {
                    item = items[i];
                    itemType = item.type;
                    if ( item.kind === 'file' ) {
                        // Ignore folders
                        if ( !itemType ) {
                            if ( item.getAsEntry &&
                                    !item.getAsEntry().isFile ) {
                                continue;
                            }
                            else if ( item.webkitGetAsEntry &&
                                    !item.webkitGetAsEntry().isFile ) {
                                continue;
                            }
                        }
                        // Add to files if type matches.
                        if ( !typeRegExp || typeRegExp.test( itemType ) ) {
                            files.push( item.getAsFile() );
                        }
                    }
                }
            }
            // Deprecated HTML5 DnD interface (FF etc.)
            else if ( ( items = dataTransfer.files ) ) {
                for ( i = 0, l = items.length; i < l; i += 1 ) {
                    item = items[i];
                    itemType = item.type;
                    // Check it's not a folder (size > 0) and it matches any
                    // type requirements
                    if ( item.size &&
                            ( !typeRegExp || typeRegExp.test( itemType ) ) ) {
                        files.push( item );
                    }
                }
            }
        }
        return files;
    },

    /**
        Method: O.Drag#getDataOfType

        Fetches data of a particular type represented by the drag.

        Parameters
            type     - {String} The type of data to retrieve.
            callback - {Function} A callback to be called with the data as its
                       single argument, or null as the argument if no data
                       available of the requested type. Note, the callback may
                       be made synchronously or asynchronously.

        Returns:
            {O.Drag} Returns self.
    */
    getDataOfType: function ( type, callback ) {
        var dataSource = this.get( 'dataSource' ) || this.get( 'dragSource' ),
            dataFound = false;
        if ( dataSource && dataSource.get( 'isDragDataSource' ) ) {
            callback( dataSource.getDragDataOfType( type, this ) );
            dataFound = true;
        }
        else if ( this.isNative ) {
            var dataTransfer = this.event.dataTransfer,
                items = dataTransfer.items,
                i, l, item;
            // Current HTML5 DnD interface
            if ( items ) {
                for ( i = 0, l = items.length; i < l; i += 1 ) {
                    item = items[i];
                    if ( item.type === type ) {
                        item.getAsString( callback );
                        dataFound = true;
                        break;
                    }
                }
            }
            // Deprecated HTML5 DnD interface
            else if ( dataTransfer.getData ) {
                callback( dataTransfer.getData( type ) );
                dataFound = true;
            }
        }
        if ( !dataFound ) {
            callback( null );
        }
        return this;
    },

    /**
        Method: O.Drag#startDrag

        Called automatically by the init method of the drag to register it with
        the drag controller and set any data on the dataTransfer event property
        if a native drag. It is unlikely you will ever need to call this method
        explicitly.

        Returns:
            {O.Drag} Returns self.
    */
    startDrag: function () {
        DragController.register( this );
        this.fire( 'dragStarted' );
        var dragSource = this.get( 'dragSource' ),
            allowedEffects, dataTransfer, dataSource, dataIsSet, data;
        // No drag source if drag started in another window/app.
        if ( dragSource ) {
            dragSource.set( 'isDragging', true ).dragStarted( this );

            allowedEffects = dragSource.get( 'allowedDragEffects' );
            this.set( 'allowedEffects', allowedEffects );

            // Native DnD support.
            if ( this.isNative ) {
                dataTransfer = this.event.dataTransfer;
                dataSource = this.get( 'dataSource' ) || dragSource;
                dataIsSet = false;

                dataTransfer.effectAllowed =
                    effectToString[ this.get( 'allowedEffects' ) ];

                if ( dataSource.get( 'isDragDataSource' ) ) {
                    dataSource.get( 'dragDataTypes' )
                              .forEach( function ( type ) {
                        if ( type.contains( '/' ) ) {
                            data = dataSource.getDragDataOfType( type, this );
                            // Current HTML5 DnD interface
                            if ( dataTransfer.items ) {
                                dataTransfer.items.add( data, type );
                            }
                            // Deprecated HTML5 DnD interface
                            else if ( dataTransfer.setData ) {
                                dataTransfer.setData( type, data );
                            }
                            dataIsSet = true;
                        }
                    });
                }

                // Need something to keep the drag alive
                if ( !dataIsSet ) {
                    dataTransfer.setData( 'x-private', '' );
                }
            }
        }
        return this;
    },

    /**
        Method: O.Drag#endDrag

        If the drag is in progress, you can call this to cancel the drag
        operation. Otherwise it will be called automatically when the drag is
        finished (i.e. when the user releases the mouse or moves it out of the
        browser window).

        The method will clean up after a drag, resetting the cursor back to
        normal, informing the current drop target and drag source that the drag
        is finished and deregistering with the drag controller.

        Returns:
            {O.Drag} Returns self.
    */
    endDrag: function () {
        var dropTarget = this.get( 'dropTarget' ),
            dragSource = this.get( 'dragSource' );
        if ( dropTarget ) {
            dropTarget.dropExited( this );
        }
        if ( dragSource ) {
            dragSource.set( 'isDragging', false ).dragEnded( this );
        }

        if ( this._dragCursor ) {
            document.body.removeChild( this._dragCursor );
            this._dragCursor = null;
        }
        if ( this._scrollInterval ) {
            RunLoop.cancel( this._scrollInterval );
            this._scrollInterval = null;
        }
        this._setCursor( false );

        this.fire( 'dragEnded' );
        DragController.deregister( this );

        return this;
    },

    /**
        Method: O.Drag#move

        Called automatically by the drag controller whenever the mouse moves
        whilst the drag is in progress. Gets the updated cursor position,
        recalculates the drop target and scrolls scroll views if hovering near
        the edge.

        Parameters:
            event - {Event} The dragover or mousemove event.

        Returns:
            {O.Drag} Returns self.
    */
    move: function ( event ) {
        this.event = event;

        // Find which view is currently under the cursor. If none, presume we've
        // moved the cursor over the drag image, so we're probably still over
        // the current drop.
        var view = event.targetView,
            x, y;
        if ( !view ) {
            view = this.get( 'dropTarget' );
        }

        // Update cursor location
        this.set( 'cursorPosition', {
            x: x = event.clientX,
            y: y = event.clientY,
        });

        // Check if we're over any hotspots that should trigger a scroll.
        this._check( view, x, y );

        // Recalculate drop target and update.
        this._update( view );

        return this;
    },

    /**
        Property (private): O.Drag#_scrollBounds
        Type: Object|null

        An object caching the position of the scroll view on the screen.
    */

    /**
        Property (private): O.Drag#_scrollView
        Type: O.ScrollView|null

        The scroll view under the cursor, if any.
    */

    /**
        Property (private): O.Drag#_scrollBy
        Type: Object|null

        An object with `x` and `y` properties containing the number of pixels
        the scroll view should be scrolled in the next frame (negative values to
        scroll up, positive values to scroll down).
    */

    /**
        Property (private): O.Drag#_scrollInterval
        Type: InvocationToken|null

        The InvocationToken returned by a call to <O.RunLoop.cancel>.
    */

    /**
        Property (private): O.Drag#_lastTargetView
        Type: O.View|null

        The view the mouse was over last time <O.Drag#_check> was called.
    */

    /**
        Method (private): O.Drag#_check

        Checks if the mouse is currently near the edge of a scroll view, and if
        so, sets that to scroll automatically.

        Parameters
            view - {O.View} The view the mouse is currently over.
            x    - The current x-coordinate of the mouse.
            y    - The current y-coordinate of the mouse.
    */
    _check: function ( view, x, y ) {
        var scroll = this._scrollBounds,
            scrollView = this._scrollView,
            outsideTriggerRegionWidth = 15,
            bounds, deltaX, deltaY;

        // If we don't have any containing scroll container bounds, recalculate.
        if ( !scroll ||
                x < scroll.l || x > scroll.r || y < scroll.t || y > scroll.b ) {
            scroll = null;
            // Optimise by only reclaculating scrollView bounds when we mouse
            // over a new view.
            if ( view && this._lastTargetView !== view ) {
                this._lastTargetView = scrollView = view;

                if ( !( scrollView instanceof ScrollView ) ) {
                    scrollView = scrollView.getParent( ScrollView );
                }
                if ( scrollView ) {
                    bounds = scrollView.get( 'layer' ).getBoundingClientRect();
                    scroll = {
                        l: bounds.left - outsideTriggerRegionWidth,
                        r: bounds.right + outsideTriggerRegionWidth,
                        t: bounds.top - outsideTriggerRegionWidth,
                        b: bounds.bottom + outsideTriggerRegionWidth,
                    };
                    deltaX = Math.min( 75, bounds.width >> 2 );
                    deltaY = Math.min( 75, bounds.height >> 2 );
                    scroll.hl = scroll.l + deltaX;
                    scroll.hr = scroll.r - deltaX;
                    scroll.ht = scroll.t + deltaY;
                    scroll.hb = scroll.b - deltaY;
                }
                this._scrollView = scrollView;
                this._scrollBounds = scroll;
            }
        }
        // Clear the timer if we used to be in a hotspot.
        if ( this._scrollInterval ) {
            RunLoop.cancel( this._scrollInterval );
            this._scrollInterval = null;
        }
        // And set a new timer if we are currently in a hotspot.
        if ( scroll ) {
            deltaX = x < scroll.hl ? -10 : x > scroll.hr ? 10 : 0;
            deltaY = y < scroll.ht ? -10 : y > scroll.hb ? 10 : 0;
            if ( deltaX || deltaY ) {
                this._scrollBy = { x: deltaX, y: deltaY };
                this._scrollInterval =
                    RunLoop.invokePeriodically( this._scroll, 100, this );
            }
        }
    },

    /**
        Method (private): O.Drag#_scroll

        Moves the scroll position of the scroll view currently being hovered
        over.
    */
    _scroll: function () {
        var scrollView = this._scrollView,
            scrollBy = this._scrollBy;

        if ( scrollView.scrollBy( scrollBy.x, scrollBy.y ) ) {
            var cursor = this.get( 'cursorPosition' ),
                target = document.elementFromPoint( cursor.x, cursor.y );
            if ( target ) {
                this._update( ViewEventsController.getViewFromNode( target ) );
            }
        }
    },

    /**
        Method (private): O.Drag#_update

        Finds the current drop target and invokes the appropriate callbacks on
        the drag source and old/new drop targets.

        Parameters:
            view - {O.View} The view the mouse is currently over.
    */
    _update: function ( view ) {
        var currentDrop = this.get( 'dropTarget' ),
            dragSource = this.get( 'dragSource' );

        // Find the current drop Target
        while ( view ) {
            if ( view === currentDrop || (
                    view.get( 'isDropTarget' ) &&
                    view.willAcceptDrag( this ) ) ) {
                break;
            }
            view = view.get( 'parentView' ) || null;
        }

        // Update targets on status
        if ( view !== currentDrop ) {
            if ( currentDrop ) {
                currentDrop.dropExited( this );
            }
            if ( view ) {
                view.dropEntered( this );
            }
            currentDrop = view;
            this.set( 'dropTarget', view );
        }
        if ( currentDrop ) {
            currentDrop.dropMoved( this );
        }

        // Update source on status
        if ( dragSource ) {
            dragSource.dragMoved( this );
        }
    },

    /**
        Method: O.Drag#drop

        Called automatically by the drag controller when a drop event occurs. If
        over a drop target, and the drop effect is not NONE, calls the
        <O.DropTarget#drop> method on the target.

        Parameters:
            event - {Event} The drop or mouseup event.

        Returns:
            {O.Drag} Returns self.
    */
    drop: function ( event ) {
        this.event = event;
        var dropEffect = this.dropEffect;
        if ( this.dropTarget &&
                dropEffect !== NONE && dropEffect !== DEFAULT ) {
            this.dropTarget.drop( this );
        }
        return this;
    },
});

export default Drag;
