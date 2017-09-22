/**
    Method: String#camelCase

    Returns this string with any sequence of a hyphen followed by a
    lower-case letter replaced by the capitalised letter.

    Returns:
        {String} The camel-cased string.
*/
String.prototype.camelCase = function () {
    return this.replace( /-([a-z])/g, function ( _, letter ) {
        return letter.toUpperCase();
    });
};
