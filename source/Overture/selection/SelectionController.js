import { Class } from '../core/Core.js';
import Object from '../foundation/Object.js';
import '../foundation/ObservableProps.js';  // For Function#observes
import '../foundation/ComputedProps.js';  // For Function#property, #nocache

const SelectionController = Class({

    Extends: Object,

    content: null,

    init( mixin ) {
        this._selectionId = 0;
        this._lastSelectedIndex = 0;
        this._selectedStoreKeys = {};

        this.isLoadingSelection = false;
        this.length = 0;

        SelectionController.parent.init.call( this, mixin );

        const content = this.get( 'content' );
        if ( content ) {
            content.on( 'query:updated', this, 'contentWasUpdated' );
        }
    },

    contentDidChange: function ( _, __, oldContent, newContent ) {
        if ( oldContent ) {
            oldContent.off( 'query:updated', this, 'contentWasUpdated' );
        }
        if ( newContent ) {
            newContent.on( 'query:updated', this, 'contentWasUpdated' );
        }
        this.selectNone();
    }.observes( 'content' ),

    contentWasUpdated( event ) {
        // If an id has been removed, it may no
        // longer belong to the selection
        const _selectedStoreKeys = this._selectedStoreKeys;
        let length = this.get( 'length' );
        const removed = event.removed;
        const added = event.added.reduce( function ( set, storeKey ) {
            set[ storeKey ] = true;
            return set;
        }, {} );
        let l = removed.length;
        let storeKey;

        while ( l-- ) {
            storeKey = removed[l];
            if ( _selectedStoreKeys[ storeKey ] && !added[ storeKey ] ) {
                length -= 1;
                delete _selectedStoreKeys[ storeKey ];
            }
        }

        this.set( 'length', length )
            .propertyDidChange( 'selectedStoreKeys' );
    },

    // ---

    selectedStoreKeys: function () {
        return Object.keys( this._selectedStoreKeys );
    }.property().nocache(),

    isStoreKeySelected( storeKey ) {
        return !!this._selectedStoreKeys[ storeKey ];
    },

    // ---

    selectStoreKeys( storeKeys, isSelected, _selectionId ) {
        if ( _selectionId && _selectionId !== this._selectionId ) {
            return;
        }
        // Make sure we've got a boolean
        isSelected = !!isSelected;

        const _selectedStoreKeys = this._selectedStoreKeys;
        let howManyChanged = 0;
        let l = storeKeys.length;
        let storeKey, wasSelected;

        while ( l-- ) {
            storeKey = storeKeys[l];
            wasSelected = !!_selectedStoreKeys[ storeKey ];
            if ( isSelected !== wasSelected ) {
                if ( isSelected ) {
                    _selectedStoreKeys[ storeKey ] = true;
                }
                else {
                    delete _selectedStoreKeys[ storeKey ];
                }
                howManyChanged += 1;
            }
        }

        if ( howManyChanged ) {
            this.increment( 'length',
                    isSelected ? howManyChanged : -howManyChanged )
                .propertyDidChange( 'selectedStoreKeys' );
        }

        this.set( 'isLoadingSelection', false );
    },

    selectIndex( index, isSelected, includeRangeFromLastSelected ) {
        const lastSelectedIndex = this._lastSelectedIndex;
        const start = includeRangeFromLastSelected ?
                Math.min( index, lastSelectedIndex ) : index;
        const end = ( includeRangeFromLastSelected ?
                Math.max( index, lastSelectedIndex ) : index ) + 1;
        this._lastSelectedIndex = index;
        return this.selectRange( start, end, isSelected );
    },

    selectRange( start, end, isSelected ) {
        const content = this.get( 'content' );
        const selectionId = ( this._selectionId += 1 );
        const loading = content.getStoreKeysForObjectsInRange(
            start, end = Math.min( end, content.get( 'length' ) || 0 ),
            function ( storeKeys, start, end ) {
                this.selectStoreKeys( storeKeys,
                    isSelected, selectionId, start, end );
            }.bind( this )
        );

        if ( loading ) {
            this.set( 'isLoadingSelection', true );
        }

        return this;
    },

    selectAll() {
        const content = this.get( 'content' );
        const selectionId = ( this._selectionId += 1 );
        const loading = content.getStoreKeysForAllObjects(
            function ( storeKeys, start, end ) {
                this.selectStoreKeys( storeKeys,
                    true, selectionId, start, end );
            }.bind( this )
        );

        if ( loading ) {
            this.set( 'isLoadingSelection', true );
        }

        return this;
    },

    selectNone() {
        this._lastSelectedIndex = 0;
        this._selectedStoreKeys = {};
        this.set( 'length', 0 )
            .propertyDidChange( 'selectedStoreKeys' )
            .set( 'isLoadingSelection', false );

        return this;
    },
});

export default SelectionController;
