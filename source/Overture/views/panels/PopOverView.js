import { Class, meta } from '../../core/Core.js';
import '../../foundation/EventTarget.js';  // For Function#on
import DOMEvent from '../../dom/DOMEvent.js';
import Element from '../../dom/Element.js';
import RootView from '../RootView.js';
import View from '../View.js';
import ViewEventsController from '../ViewEventsController.js';
import ScrollView from '../containers/ScrollView.js';

import ModalEventHandler from './ModalEventHandler.js';

const PopOverView = Class({

    Extends: View,

    className: 'v-PopOver',

    positioning: 'absolute',

    isVisible: false,
    parentPopOverView: null,

    ariaAttributes: {
        modal: 'true',
    },

    /*
        Options
        - view -> The view to append to the pop over
        - alignWithView -> the view to align to
        - atNode -> the node within the view to align to
        - positionToThe -> 'bottom'/'top'/'left'/'right'
        - alignEdge -> 'left'/'centre'/'right'/'top'/'middle'/'bottom'
        - inParent -> The view to insert the pop over in (optional)
        - showCallout -> true/false
        - offsetLeft
        - offsetTop
        - onHide: fn
    */
    show: function ( options ) {
        if ( options.alignWithView === this ) {
            return this.get( 'subPopOverView' ).show( options );
        }
        this.hide();

        this._options = options;

        // Set layout and insert in the right place
        const eventHandler = this.get( 'eventHandler' );
        const view = options.view;
        const alignWithView = options.alignWithView;
        const atNode = options.atNode || alignWithView.get( 'layer' );
        let atNodeWidth = atNode.offsetWidth;
        let atNodeHeight = atNode.offsetHeight;
        const positionToThe = options.positionToThe || 'bottom';
        const alignEdge = options.alignEdge || 'left';
        let parent = options.inParent;
        let deltaLeft = 0;
        let deltaTop = 0;
        const el = Element.create;
        let prop;

        // Want nearest parent scroll view (or root view if none).
        // Special case parent == parent pop-over view.
        if ( !parent ) {
            parent = options.atNode ?
                alignWithView : alignWithView.get( 'parentView' );
            while ( !( parent instanceof RootView ) &&
                    !( parent instanceof ScrollView ) &&
                    !( parent instanceof PopOverView ) ) {
                parent = parent.get( 'parentView' );
            }
        }

        // Now find out our offsets;
        const position = Element.getPosition( atNode, parent.get(
            parent instanceof ScrollView ? 'scrollLayer' : 'layer' ) );
        const layout = {
            top: position.top,
            left: position.left,
        };

        switch ( positionToThe ) {
        case 'right':
            layout.left += atNodeWidth;
            /* falls through */
        case 'left':
            switch ( alignEdge ) {
            // case 'top':
            //    break; // nothing to do
            case 'middle':
                atNodeHeight = atNodeHeight >> 1;
                /* falls through */
            case 'bottom':
                layout.top += atNodeHeight;
                break;
            }
            break;
        case 'bottom':
            layout.top += atNodeHeight;
            /* falls through */
        case 'top':
            switch ( alignEdge ) {
            // case 'left':
            //     break; // nothing to do
            case 'centre':
                atNodeWidth = atNodeWidth >> 1;
                /* falls through */
            case 'right':
                layout.left += atNodeWidth;
                break;
            }
            break;
        }

        layout.top += options.offsetTop || 0;
        layout.left += options.offsetLeft || 0;

        // Round values to prevent buggy callout rendering.
        for ( prop in layout ) {
            layout[ prop ] = Math.round( layout[prop] );
        }

        // Set layout
        this.set( 'layout', layout );

        // Insert view
        this.insertView( view );
        this.render();

        // Callout
        const layer = this.get( 'layer' );
        if ( options.showCallout ) {
            layer.appendChild(
                el( 'b', {
                    className: 'v-PopOver-callout' +
                        ' v-PopOver-callout--' + positionToThe.charAt( 0 ) +
                        ' v-PopOver-callout--' + alignEdge,
                }, [
                    this._callout = el( 'b', {
                        className: 'v-PopOver-triangle' +
                            ' v-PopOver-triangle--' + positionToThe.charAt( 0 ),
                    }),
                ])
            );
        }

        // Insert into parent.
        parent.insertView( this );

        // Adjust positioning
        switch ( positionToThe ) {
        case 'left':
            deltaLeft -= layer.offsetWidth;
            /* falls through */
        case 'right':
            switch ( alignEdge ) {
            // case 'top':
            //    break; // nothing to do
            case 'middle':
                deltaTop -= layer.offsetHeight >> 1;
                break;
            case 'bottom':
                deltaTop -= layer.offsetHeight;
                break;
            }
            break;
        case 'top':
            deltaTop -= layer.offsetHeight;
            /* falls through */
        case 'bottom':
            switch ( alignEdge ) {
            // case 'left':
            //     break; // nothing to do
            case 'centre':
                deltaLeft -= layer.offsetWidth >> 1;
                break;
            case 'right':
                deltaLeft -= layer.offsetWidth;
                break;
            }
            break;
        }

        this.adjustPosition( deltaLeft, deltaTop );

        if ( eventHandler ) {
            ViewEventsController.addEventTarget( eventHandler, 10 );
        }
        this.set( 'isVisible', true );

        return this;
    },

    adjustPosition: function ( deltaLeft, deltaTop ) {
        let parent = this.get( 'parentView' );
        const layer = this.get( 'layer' );
        const layout = this.get( 'layout' );
        const positionToThe = this._options.positionToThe || 'bottom';
        const callout = this._callout;
        const calloutIsAtTopOrBottom =
                ( positionToThe === 'top' || positionToThe === 'bottom' );

        if ( !deltaLeft ) { deltaLeft = 0; }
        if ( !deltaTop ) { deltaTop = 0; }

        // Check not run off screen.
        if ( parent instanceof PopOverView ) {
            parent = parent.getParent( ScrollView ) ||
                parent.getParent( RootView );
        }
        const position = Element.getPosition( layer, parent.get( 'layer' ) );
        let gap;
        let calloutDelta = 0;

        // Check right edge
        if ( !parent.get( 'showScrollbarX' ) ) {
            gap = parent.get( 'pxWidth' ) - position.left - deltaLeft -
                layer.offsetWidth;
            // If gap is negative, move the view.
            if ( gap < 0 ) {
                deltaLeft += gap;
                deltaLeft -= 10;
                if ( callout && calloutIsAtTopOrBottom ) {
                    calloutDelta += gap;
                    calloutDelta -= 10;
                }
            }
        }

        // Check left edge
        gap = position.left + deltaLeft;
        if ( gap < 0 ) {
            deltaLeft -= gap;
            deltaLeft += 10;
            if ( callout && calloutIsAtTopOrBottom ) {
                calloutDelta -= gap;
                calloutDelta += 10;
            }
        }

        // Check bottom edge
        if ( !parent.get( 'showScrollbarY' ) ) {
            gap = parent.get( 'pxHeight' ) - position.top - deltaTop -
                layer.offsetHeight;
            if ( gap < 0 ) {
                deltaTop += gap;
                deltaTop -= 10;
                if ( callout && !calloutIsAtTopOrBottom ) {
                    calloutDelta += gap;
                    calloutDelta -= 10;
                }
            }
        }

        // Check top edge
        gap = position.top + deltaTop;
        if ( gap < 0 ) {
            deltaTop -= gap;
            deltaTop += 10;
            if ( callout && !calloutIsAtTopOrBottom ) {
                calloutDelta -= gap;
                calloutDelta += 10;
            }
        }

        if ( deltaLeft || deltaTop ) {
            // Redraw immediately to prevent "flashing"
            this.set( 'layout', {
                top: layout.top + deltaTop,
                left: layout.left + deltaLeft,
            }).redraw();
        }
        if ( calloutDelta ) {
            Element.setStyle( callout,
                calloutIsAtTopOrBottom ? 'left' : 'top',
                -calloutDelta + 'px'
            );
        }
    },

    didLeaveDocument: function () {
        PopOverView.parent.didLeaveDocument.call( this );
        this.hide();
        return this;
    },

    hide: function () {
        if ( this.get( 'isVisible' ) ) {
            const subPopOverView = this.hasSubView() ?
                    this.get( 'subPopOverView' ) : null;
            const eventHandler = this.get( 'eventHandler' );
            const options = this._options;
            let onHide, layer;
            if ( subPopOverView ) {
                subPopOverView.hide();
            }
            this.set( 'isVisible', false );
            const view = this.get( 'childViews' )[0];
            this.detach();
            this.removeView( view );
            if ( options.showCallout ) {
                layer = this.get( 'layer' );
                layer.removeChild( layer.firstChild );
                this._callout = null;
            }
            if ( eventHandler ) {
                ViewEventsController.removeEventTarget( eventHandler );
                eventHandler._seenMouseDown = false;
            }
            this._options = null;
            if ( onHide = options.onHide ) {
                onHide( options, this );
            }
        }
        return this;
    },

    hasSubView: function () {
        return !!meta( this ).cache.subPopOverView &&
            this.get( 'subPopOverView' ).get( 'isVisible' );
    },

    subPopOverView: function () {
        return new PopOverView({ parentPopOverView: this });
    }.property(),

    eventHandler: function () {
        return this.get( 'parentPopOverView' ) ?
            null : new ModalEventHandler({ view: this });
    }.property(),

    clickedOutside: function () {
        this.hide();
    },

    keyOutside: function ( event ) {
        let view = this;
        while ( view.hasSubView() ) {
            view = view.get( 'subPopOverView' );
        }
        view.get( 'childViews' )[0].fire( event.type, event );
        if ( event.type === 'keydown' ) {
            view.closeOnEsc( event );
        }
    },

    closeOnEsc: function ( event ) {
        if ( DOMEvent.lookupKey( event ) === 'esc' ) {
            this.hide();
        }
    }.on( 'keydown' ),

    stopEvents: function ( event ) {
        event.stopPropagation();
    }.on( 'click', 'mousedown', 'mouseup',
        'keypress', 'keydown', 'keyup', 'tap' ),
});

export default PopOverView;
