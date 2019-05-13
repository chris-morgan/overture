import { Class } from '../../core/Core';
import Obj from '../../foundation/Object';
import Enumerable from '../../foundation/Enumerable';
import '../../foundation/Function.prototype.property';

/**
    Class: O.RecordArray

    Extends: O.Object

    Includes: O.Enumerable

    An immutable enumerable object representing a list of records.
 */
const RecordArray = Class({

    Extends: Obj,

    Mixin: Enumerable,

    // eslint-disable-next-line object-shorthand
    init: function ( store, Type, storeKeys ) {
        this.store = store;
        this.Type = Type;
        this.storeKeys = storeKeys;

        RecordArray.parent.constructor.call( this );
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
    getObjectAt ( index ) {
        const storeKey = this.get( 'storeKeys' )[ index ];
        if ( storeKey ) {
            return this.get( 'store' ).materialiseRecord( storeKey );
        }
    },
});

export default RecordArray;
