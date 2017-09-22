import { extend } from './Core';

/**
    Method: Function#extend

    Adds a set of static methods/properties to the function.

    DEPRECATED. Use {Object.assign( this, methods )} instead.
    Caution: there is a difference in semantics: `Object.assign` essentially
    has `force` turned on. But frankly, this is what you need in most cases.

    Parameters:
        methods - {Object} The methods/properties to add.
        force   - {Boolean} Unless this is true, existing methods/properties
                  will not be overwritten.

    Returns:
        {Function} Returns self.
*/
Function.prototype.extend = function ( methods, force ) {
    if ( window.console && console.warn ) {
        console.warn( 'Function#extend is deprecated' );
    }
    extend( this, methods, !force );
    return this;
};
