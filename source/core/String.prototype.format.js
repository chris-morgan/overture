const splitter =
    /%(\+)?(?:'(.))?(-)?(\d+)?(?:\.(\d+))?(?:\$(\d+))?([%sn@])/g;

/**
    Method: String#format

    Format a string by substituting in arguments. The method can also add
    padding to make the insertion a fixed width and restrict the number of
    decimal places in a number.

    A placeholder is denoted by a `%` sign, which followed by:

    1. (optional) *Sign*: `+` means always show sign.
    2. (optional) *Padding*: `'c` where `c` is any character. Default is
        space.
    3. (optional) *Alignment*: `-` means make left-aligned (default
        right-align).
    4. (optional) *Width*: Integer specifying number of characters in
        output.
    5. (optional) *Precision*: `.` + Number of digits after decimal point.
    6. (optional) *Argument*: `$` + Number of argument (indexed from 1) to
        use.
    7. *Type*: %, n, s, @.

    If no specific argument is used, the index of a placeholder is used to
    determine which argument to use. The possible argument types are String,
    Number or Object; these must match the placeholder types of 's', 'n' and
    '@' respectively. A literal % is inserted by %%. Objects are converted
    to strings via their toString() method.

    e.g. If the string is `"%+'*-16.3$2n"` and argument 2 is `123.456789`,
    then the output is: `"+123.457********"`.

    Parameters:
        var_args - {...(String|Number|Object)} The arguments to interpolate.

    Returns:
        {String} The formatted string.
*/
String.prototype.format = function () {
    // Reset RegExp.
    splitter.lastIndex = 0;

    let output = '';
    let i = 0;
    let argIndex = 1;
    let part, toInsert;

    while ( ( part = splitter.exec( this ) ) ) {
        // Add everything between last placeholder and this placeholder
        output += this.slice( i, part.index );
        // And set i to point to the next character after the placeholder
        i = part.index + part[0].length;

        // Find argument to subsitute in; either the one specified in
        // (6) or the index of this placeholder.
        const data = arguments[
            ( parseInt( part[6], 10 ) || argIndex ) - 1 ];

        // Generate the string form of the data from the type specified
        // in (7).
        switch ( part[7] ) {
            case '%':
                // Special case: just output the character and continue;
                output += '%';
                continue;
            case 's':
                toInsert = data;
                break;
            case 'n':
                // (1) Ensure sign will be shown
                toInsert = ( ( part[1] && data >= 0 ) ? '+' : '' );
                // (5) Restrict number of decimal places
                toInsert += ( part[5] !== undefined ) ?
                    data.toFixed( part[5] ) : ( data + '' );
                break;
            case '@':
                toInsert = data.toString();
                break;
        }

        // (4) Check minimum width
        let padLength = ( part[4] || 0 ) - toInsert.length;
        if ( padLength > 0 ) {
            // Padding character is (2) or a space
            const padChar = part[2] || ' ';
            let padding = padChar;
            while ( ( padLength -= 1 ) ) {
                padding += padChar;
            }
            // Insert padding before unless (3) is set.
            if ( part[3] ) {
                toInsert += padding;
            } else {
                toInsert = padding + toInsert;
            }
        }

        // And add the string to the output
        output += toInsert;

        // Keep track of the arg index to use.
        argIndex += 1;
    }
    // Add any remaining string
    output += this.slice( i );

    return output;
};
