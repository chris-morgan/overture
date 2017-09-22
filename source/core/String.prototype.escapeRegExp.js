/**
    Method: String#escapeRegExp

    Escape any characters with special meaning when passed to the RegExp
    constructor.

    Returns:
        {String} The escaped string.
*/
String.prototype.escapeRegExp = function () {
    return this.replace( /([-.*+?^${}()|[\]/\\])/g, '\\$1' );
};
