/**
    Method: String#capitalise

    Returns this string with the first letter converted to a capital.

    Returns:
        {String} The capitalised string.
*/
String.prototype.capitalise = function () {
    return this.charAt( 0 ).toUpperCase() + this.slice( 1 );
};
