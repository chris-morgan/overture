// -------------------------------------------------------------------------- \\
// File: SelectView.js                                                        \\
// Module: ControlViews                                                       \\
// Requires: Core, Foundation, DOM, AbstractControlView.js                    \\
// Author: Neil Jenkins                                                       \\
// License: © 2010-2015 FastMail Pty Ltd. MIT Licensed.                       \\
// -------------------------------------------------------------------------- \\

import { Class, isEqual } from '../../core/Core.js';
import '../../foundation/ComputedProps.js';  // For Function#property
import '../../foundation/EventTarget.js';  // For Function#on
import '../../foundation/ObservableProps.js';  // For Function#observes
import Element from '../../dom/Element.js';
import AbstractControlView from './AbstractControlView.js';

/**
    Class: O.SelectView

    Extends: O.AbstractControlView

    A view representing an HTML `<select>` menu. The `value` property is two-way
    bindable, representing the selected option.
*/
var SelectView = Class({

    Extends: AbstractControlView,

    /**
        Property: O.SelectView#options
        Type: Array

        The array of options to present in the select menu. Each item in the
        array should be an object, with the following properties:

        text       - {String} The text to display for the item
        value      - {*} The value for the <O.SelectView#value> property to take
                     when this item is selected.
        isDisabled - {Boolean} (optional) If true, the option will be disabled
                     (unselectable). Defaults to false if not present.
    */
    options: [],

    // --- Render ---

    type: '',

    /**
        Property: O.SelectView#className
        Type: String
        Default: 'v-Select'

        Overrides default in <O.View#className>.
    */
    className: function () {
        var type = this.get( 'type' );
        return 'v-Select' +
            ( this.get( 'isFocussed' ) ? ' is-focussed' : '' ) +
            ( this.get( 'isDisabled' ) ? ' is-disabled' : '' ) +
            ( type ? ' ' + type : '' );
    }.property( 'type', 'isFocussed', 'isDisabled' ),

    /**
        Method: O.SelectView#draw

        Overridden to draw select menu in layer. See <O.View#draw>.
    */
    draw: function ( layer, Element, el ) {
        var control = this._domControl =
            this._drawSelect( this.get( 'options' ) );
        return [
            SelectView.parent.draw.call( this, layer, Element, el ),
            control,
        ];
    },

    /**
        Method (private): O.SelectView#_drawSelect

        Creates the DOM elements for the `<select>` and all `<option>` children.

        Parameters:
            options - {Array} Array of option objects.

        Returns:
            {Element} The `<select>`.
    */
    _drawSelect: function ( options ) {
        var selected = this.get( 'value' ),
            el = Element.create,
            select = el( 'select', {
                className: 'v-Select-input',
                disabled: this.get( 'isDisabled' ),
            },
                options.map( function ( option, i ) {
                    return el( 'option', {
                        text: option.text,
                        value: i,
                        selected: isEqual( option.value, selected ),
                        disabled: !!option.isDisabled,
                    });
                })
            );
        return select;
    },

    // --- Keep render in sync with state ---

    /**
        Method: O.SelectView#selectNeedsRedraw

        Calls <O.View#propertyNeedsRedraw> for extra properties requiring
        redraw.
    */
    selectNeedsRedraw: function ( self, property, oldValue ) {
       return this.propertyNeedsRedraw( self, property, oldValue );
    }.observes( 'options', 'value' ),

    /**
        Method: O.SelectView#redrawOptions

        Updates the DOM representation when the <O.SelectView#options> property
        changes.
    */
    redrawOptions: function ( layer, oldOptions ) {
        var options = this.get( 'options' );
        var select, isFocussed;
        if ( !isEqual( options, oldOptions ) ) {
            // Must blur before removing from DOM in iOS, otherwise
            // the slot-machine selector will not hide
            isFocussed = this.get( 'isFocussed' );
            select = this._drawSelect( options );
            if ( isFocussed ) {
                this.blur();
            }
            layer.replaceChild( select, this._domControl );
            this._domControl = select;
            if ( isFocussed ) {
                this.focus();
            }
        }
    },

    /**
        Method: O.SelectView#redrawValue

        Selects the corresponding option in the select when the
        <O.SelectView#value> property changes.
    */
    redrawValue: function () {
        var value = this.get( 'value' ),
            options = this.get( 'options' ),
            l = options.length;

        while ( l-- ) {
            if ( isEqual( options[l].value, value ) ) {
                this._domControl.value = l + '';
                return;
            }
        }
        // Work around Chrome on Android bug where it doesn't redraw the
        // select control until the element blurs.
        if ( this.get( 'isFocussed' ) ) {
            this.blur().focus();
        }
    },

    // --- Keep state in sync with render ---

    /**
        Method: O.SelectView#syncBackValue

        Observes the `change` event to update the view's `value` property when
        the user selects a different option.
    */
    syncBackValue: function () {
        var i = this._domControl.selectedIndex;
        this.set( 'value', this.get( 'options' ).getObjectAt( i ).value );
    }.on( 'change' ),
});

export default SelectView;
