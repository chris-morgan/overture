/**
    Method: String#contains

    Tests whether the string contains the value supplied. If a seperator is
    given, the value must have at either end one of: the beginning of the
    string, the end of the string or the separator.

    Parameters:
        string - {String} The value to search for.
        separator - {String} (optional) The separator string.

    Returns:
        {Boolean} Does this string contain the given string?
*/
String.prototype.contains = function ( string, separator ) {
    return ( separator ?
        ( separator + this + separator ).indexOf(
            separator + string + separator ) :
        this.indexOf( string ) ) > -1;
};
