import __meta__ from '../core/Core';
import Obj from './Object';
import ObservableRange from './ObservableRange';
import MutableEnumerable from './MutableEnumerable';

const splice = Array.prototype.splice;
const slice = Array.prototype.slice;

/**
    Class: O.ObservableArray

    Extends: O.Object

    Includes: O.ObservableRange, O.MutableEnumerable

    Implements: O.Enumerable

    The ObservableArray class provides an object with the same interface as the
    standard array but with the difference that properties or even ranges can be
    observed. Note, all access must be via getObjectAt/setObjectAt, not direct
    array[i].
*/
export default class ObservableArray extends Obj {
    /**
        Constructor: O.ObservableArray

        Parameters:
            array   - {Array} (optional) The initial contents of the array.
            ...mixins - {Object} (optional)
    */
    constructor ( array, ...mixins ) {
        super( ...mixins );

        // BREAKING CHANGE: the [] property was defined before calling super
        // before, but now it’s set up after. This is going to be catastrophic
        // to any bindings defined on the ObservableArray that depend on [].
        // TODO assess the impact of this (I have no idea whether it’s a big
        // deal or not).
        this._array = array || [];
        this._length = this._array.length;
    }

    /**
        Property: O.ObservableArray#[]
        Type: Array

        The standard array underlying the object. Observers of this property
        will be notified any time any content changes in the array. Setting this
        property changes the entire contents of the array at once. The contents
        of the new array is checked for equality with that of the old array to
        ensure accurate notification of the changed range.
    */
    get '[]' () {
        const cache = this[ __meta__ ].cache;
        return cache[ '[]' ] || ( cache[ '[]' ] = this._array.slice() );
    }

    set '[]' ( array ) {
        const oldArray = this._array;
        const oldLength = this._length;
        const newLength = array.length;
        let start = 0;
        let end = newLength;

        this._array = array;
        this._length = newLength;

        while ( ( start < newLength ) &&
                ( array[ start ] === oldArray[ start ] ) ) {
            start += 1;
        }
        if ( newLength === oldLength ) {
            let last = end - 1;
            while ( ( end > start ) &&
                    ( array[ last ] === oldArray[ last ] ) ) {
                end = last;
                last -= 1;
            }
        } else {
            end = Math.max( oldLength, newLength );
            this.propertyDidChange( 'length', oldLength, newLength );
        }

        if ( start !== end ) {
            this.rangeDidChange( start, end );
        }

        // DIFFERENCE IN BEHAVIOUR: `x.set( '[]', foo )` would return a slice of
        // foo rather than foo. With `x[ '[]' ] = foo`, the value of the
        // expression is `foo`, and that’s unavoidable. I don’t think this is an
        // issue, because mutating the underlying array directly was unsupported
        // anyway. Still, it is worthwhile considering the alternative of having
        // the ObservableArray.[] setter take ownership of the object passed to
        // it, storing it directly rather than slicing it. If that were done,
        // the whole cache dance could disappear as well.
        const cache = this[ __meta__ ].cache;
        const oldValue = cache[ '[]' ];
        cache[ '[]' ] = array = array.slice();
        this.propertyDidChange( '[]', oldValue, array );
    }

    /**
        Method: O.ObservableArray#getObjectAt

        Returns the value at the index given in the array.

        Parameters:
            index - {Number} The index of the value to return.

        Returns:
            {*} The value at index i in this array.
    */
    getObjectAt ( index ) {
        return this._array[ index ];
    }

    /**
        Property: O.ObservableArray#length
        Type: Number

        The length of the array.
    */
    get length () {
        return this._length;
    }

    set length ( value ) {
        const oldLength = this._length;
        if ( typeof value === 'number' && value !== oldLength ) {
            this._array.oldLength = value;
            this._length = value;
            if ( value < oldLength ) {
                this.rangeDidChange( value, oldLength );
            }
            this.propertyDidChange( 'length', oldLength, value );
        }
    }

    /**
        Method: O.ObservableArray#setObjectAt

        Sets the value at a given index in the array.

        Parameters:
            index - {Number} The index at which to set the value.
            value - {*} The value to set it to.

        Returns:
            {O.ObservableArray} Returns self.
    */
    setObjectAt ( index, value ) {
        this._array[ index ] = value;
        const length = this._length;
        if ( length <= index ) {
            this._length = index + 1;
            this.propertyDidChange( 'length', length, index + 1 );
        }
        this.rangeDidChange( index );
        return this;
    }

    /**
        Method: O.ObservableArray#replaceObjectsAt

        Removes a given number of objects from the array, starting at the index
        given, and inserts a number of objects in their place.

        Parameters:
            index         - {Number} The index at which to remove/add objects.
            numberRemoved - {Number} The number of objects to remove.
            newItems      - {Array} (optional) The objects to insert.

        Returns:
            {Array} Returns an array of the removed objects.
    */
    replaceObjectsAt ( index, numberRemoved, newItems ) {
        const oldLength = this._length;
        const array = this._array;
        let removed;

        newItems = newItems ? slice.call( newItems ) : [];

        if ( oldLength <= index ) {
            const l = newItems.length;
            for ( let i = 0; i < l; i += 1 ) {
                array[ index + i ] = newItems[i];
            }
        } else {
            newItems.unshift( index, numberRemoved );
            removed = splice.apply( array, newItems );
        }
        const newLength = array.length;
        if ( oldLength !== newLength ) {
            this._length = newLength;
            this.propertyDidChange( 'length', oldLength, newLength );
            this.rangeDidChange( index, Math.max( oldLength, newLength ) );
        } else {
            this.rangeDidChange( index, index + numberRemoved );
        }
        return removed || [];
    }

    // --- Enumerable (more efficient implementations)

    first () {
        return this._array.first();
    }

    last () {
        return this._array.last();
    }

    indexOf ( item, from ) {
        return this._array.indexOf( item, from );
    }

    lastIndexOf ( item, from ) {
        return this._array.lastIndexOf( item, from );
    }

    binarySearch ( value, comparator ) {
        return this._array.binarySearch( value, comparator );
    }

    contains ( value, comparator ) {
        return this._array.contains( value, comparator );
    }

    find ( fn, bind ) {
        return this._array.find( fn, bind );
    }

    forEach ( fn, bind ) {
        return this._array.forEach( fn, bind );
    }

    filter ( fn, bind ) {
        return this._array.filter( fn, bind );
    }

    reduce ( fn, initial ) {
        return this._array.reduce( fn, initial );
    }

    every ( fn, bind ) {
        return this._array.every( fn, bind );
    }

    some ( fn, bind ) {
        return this._array.some( fn, bind );
    }

    // :: Mutation methods =====================================================

    /**
        Method: O.ObservableArray#sort

        ECMAScript Array#sort.

        Parameters:
            comparefn - {Function} (optional) The function to use to compare two
                        items in the array.

        Returns:
            {O.ObservableArray} Returns self.
    */
    sort ( comparefn ) {
        this._array.sort( comparefn );
        this.rangeDidChange( 0, this._length );
        return this;
    }

    /**
        Method: O.ObservableArray#reverse

        ECMAScript Array#reverse.

        Returns:
            {O.ObservableArray} Returns self.
    */
    reverse () {
        this._array.reverse();
        this.rangeDidChange( 0, this._length );
        return this;
    }

    // :: Accessor methods =====================================================

    /**
        Method: O.ObservableArray#concat

        ECMAScript Array#concat.

        Parameters:
            var_args - {...Array} The arrays to concatenate with this array.

        Returns:
            {Array} Returns new concatenated array.
    */
    concat () {
        const args = [];
        const l = arguments.length;
        for ( let i = 0; i < l; i += 1 ) {
            const item = arguments[i];
            args[i] = item instanceof ObservableArray ? item._array : item;
        }
        return Array.prototype.concat.apply( this._array, args );
    }

    /**
        Method: O.ObservableArray#join

        ECMAScript Array#join.

        Parameters:
            separator - {String} (optional) The string to insert between each
                        item (defaults to ',').

        Returns:
            {String} Concatenated string of all items joined by separator
            string.
    */
    join ( separator ) {
        return this._array.join( separator );
    }

    /**
        Method: O.ObservableArray#slice

        ECMAScript Array#slice.

        Parameters:
            start - {Number} (optional) The index of the first item to include.
            end   - {Number} (optional) One past the index of the last item to
                    include.

        Returns:
            {Array} Shallow copy of the underlying array between the given
            indexes.
    */
    slice ( start, end ) {
        return this._array.slice( start, end );
    }
}

Object.assign( ObservableArray.prototype, ObservableRange, MutableEnumerable );

// (Needed for compatibility with subclasses that use `O.Class`.)
ObservableArray.prototype.init = ObservableArray;
