/**
    Method: Number#limit

    Limits the number to be within the given range.

    Parameters:
        min - {Number} The minimum allowed value.
        max - {Number} The maximum allowed value.

    Returns:
        {Number} The nearest number to the current value within the allowed
        range.
*/
Number.prototype.limit = function ( min, max ) {
    // +0 is required to unbox 'this' back into a primitive number in IE.
    // Otherwise you get a boxed value, which amongst other things makes 0 a
    // truthy value, leading to all sorts of interesting behaviour...
    return this < min ? min : this > max ? max : this + 0;
};
