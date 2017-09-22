/**
    Method: String#runeAt

    Like charAt, but if the index points to an octet that is part of a
    surrogate pair, the whole pair is returned (as a string).

    Parameters:
        index - {Number} The index (in bytes) into the string

    Returns:
        {String} The rune at this index.
*/
String.prototype.runeAt = function ( index ) {
    let code = this.charCodeAt( index );

    // Outside bounds
    if ( Number.isNaN( code ) ) {
        return ''; // Position not found
    }

    // Normal char
    if ( code < 0xD800 || code > 0xDFFF ) {
        return this.charAt( index );
    }

    // High surrogate (could change last hex to 0xDB7F to treat high
    // private surrogates as single characters)
    if ( 0xD800 <= code && code <= 0xDBFF ) {
        if ( this.length <= ( index + 1 ) ) {
            // High surrogate without following low surrogate
            return '';
        }
    // Low surrogate (0xDC00 <= code && code <= 0xDFFF)
    } else {
        if ( index === 0 ) {
            // Low surrogate without preceding high surrogate
            return '';
        }
        index -= 1;
    }

    code = this.charCodeAt( index + 1 );
    if ( 0xDC00 > code || code > 0xDFFF ) {
        // Not a valid surrogate pair
        return '';
    }

    return this.charAt( index ) + this.charAt( index + 1 );
};
