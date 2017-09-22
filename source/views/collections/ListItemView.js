import { Class } from '../../core/Core';
import '../../foundation/Function.prototype.property';
import '../../foundation/Function.prototype.nextLoop';
import View from '../View';

const ListItemView = Class({

    Extends: View,

    content: null,

    index: 0,
    itemHeight: 32,

    selection: null,
    isSelected: false,

    animateIn: false,

    // eslint-disable-next-line object-shorthand
    init: function ( mixin ) {
        const selection = mixin.selection;
        const content = mixin.content;
        if ( selection && content ) {
            this.isSelected = selection.isStoreKeySelected(
                content.get( 'storeKey' )
            );
        }
        ListItemView.parent.constructor.call( this, mixin );
    },

    layerStyles: function () {
        const index = this.get( 'index' );
        const itemHeight = this.get( 'itemHeight' );
        const animateIn = this.get( 'animateIn' );
        const isNew = animateIn && !this.get( 'isInDocument' );
        const y = ( index - ( isNew ? 1 : 0 ) ) * itemHeight;
        return {
            position: 'absolute',
            top: y,
            opacity: animateIn ? isNew ? 0 : 1 : undefined,
        };
    }.property(),

    layerStylesWillChange: function () {
        this.computedPropertyDidChange( 'layerStyles' );
    }.nextLoop().observes( 'index', 'itemHeight' ),

    resetLayerStyles: function () {
        if ( this.get( 'animateIn' ) ) {
            this.computedPropertyDidChange( 'layerStyles' );
        }
    }.nextLoop().observes( 'isInDocument' ),
});

export default ListItemView;
