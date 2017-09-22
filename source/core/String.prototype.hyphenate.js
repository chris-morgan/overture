/**
    Method: String#hyphenate

    Returns this string with any captials converted to lower case and
    preceded by a hyphen.

    Returns:
        {String} The hyphenated string.
*/
String.prototype.hyphenate = function () {
    return this.replace( /[A-Z]/g, function ( letter ) {
        return ( '-' + letter.toLowerCase() );
    });
};
