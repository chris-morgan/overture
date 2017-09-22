import { mixin } from './Core';

/**
    Method: Function#implement

    Adds a set of methods or other properties to the prototype of a function, so
    all instances will have access to them.

    DEPRECATED. Use {Object.assign( this.prototype, methods )} instead.
    Caution: there is a difference in semantics: `Object.assign` essentially
    has `force` turned on. But frankly, this is what you need in most cases.
    Also, if you were using this method to add anything but functions,
    (a) why were you doing that? and
    (b) you’ll need to use {mixin( this.prototype, methods, !force )} instead.
        But that method is also deprecated, because (a).

    Parameters:
        methods - {Object} The methods or properties to add to the prototype.
        force   - {Boolean} Unless this is true, existing methods/properties
                  will not be overwritten.

    Returns:
        {Function} Returns self.
*/
Function.prototype.implement = function ( methods, force ) {
    if ( window.console && console.warn ) {
        console.warn( 'Function#implement is deprecated' );
    }
    mixin( this.prototype, methods, !force );
    return this;
};
