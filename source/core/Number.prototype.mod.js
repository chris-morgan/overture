/**
    Method: Number#mod

    Returns the number mod n.

    Parameters:
        n - {Number}

    Returns:
        {Number} The number mod n.
*/
Number.prototype.mod = function ( n ) {
    const m = this % n;
    return m < 0 ? m + n : m;
};
