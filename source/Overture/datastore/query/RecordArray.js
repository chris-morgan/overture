import { Class } from '../../core/Core.js';
import Object from '../../foundation/Object.js';
import Enumerable from '../../foundation/Enumerable.js';
import '../../foundation/ComputedProps.js';  // For Function#property

/**
    Class: O.RecordArray

    Extends: O.Object

    Includes: O.Enumerable

    An immutable enumerable object representing a list of records.
 */
var RecordArray = Class({

    Extends: Object,

    Mixin: Enumerable,

    init: function ( store, Type, storeKeys ) {
        this.store = store;
        this.Type = Type;
        this.storeKeys = storeKeys;

        RecordArray.parent.init.call( this );
    },

    /**
        Property: O.RecordArray#length
        Type: Number

        The number of records in the array.
    */
    length: function () {
        return this.get( 'storeKeys' ).length;
    }.property( 'storeKeys' ),

    /**
        Method: O.RecordArray#getObjectAt

        Returns the record at the index given in the array.

        Parameters:
            index - {Number} The index of the record to return.

        Returns:
            {O.Record} The record at index i in this array.
    */
    getObjectAt: function ( index ) {
        var storeKey = this.get( 'storeKeys' )[ index ],
            record;
        if ( storeKey ) {
            record = this.get( 'store' )
                         .materialiseRecord( storeKey, this.get( 'Type' ) );
        }
        return record;
    },
});

export default RecordArray;
