/**
    Method: String#escapeHTML

    Returns the string with the characters <,>,& replaced by HTML entities.

    Returns:
        {String} The escaped string.
*/
String.prototype.escapeHTML = function () {
    return this.split( '&' ).join( '&amp;' )
               .split( '<' ).join( '&lt;'  )
               .split( '>' ).join( '&gt;'  );
};
