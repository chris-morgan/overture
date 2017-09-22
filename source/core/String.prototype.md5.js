const r = [
    7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22,
    5,  9, 14, 20, 5,  9, 14, 20, 5,  9, 14, 20, 5,  9, 14, 20,
    4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23,
    6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21,
];

const k = [
    0xd76aa478, 0xe8c7b756, 0x242070db, 0xc1bdceee,
    0xf57c0faf, 0x4787c62a, 0xa8304613, 0xfd469501,
    0x698098d8, 0x8b44f7af, 0xffff5bb1, 0x895cd7be,
    0x6b901122, 0xfd987193, 0xa679438e, 0x49b40821,
    0xf61e2562, 0xc040b340, 0x265e5a51, 0xe9b6c7aa,
    0xd62f105d, 0x02441453, 0xd8a1e681, 0xe7d3fbc8,
    0x21e1cde6, 0xc33707d6, 0xf4d50d87, 0x455a14ed,
    0xa9e3e905, 0xfcefa3f8, 0x676f02d9, 0x8d2a4c8a,
    0xfffa3942, 0x8771f681, 0x6d9d6122, 0xfde5380c,
    0xa4beea44, 0x4bdecfa9, 0xf6bb4b60, 0xbebfbc70,
    0x289b7ec6, 0xeaa127fa, 0xd4ef3085, 0x04881d05,
    0xd9d4d039, 0xe6db99e5, 0x1fa27cf8, 0xc4ac5665,
    0xf4292244, 0x432aff97, 0xab9423a7, 0xfc93a039,
    0x655b59c3, 0x8f0ccc92, 0xffeff47d, 0x85845dd1,
    0x6fa87e4f, 0xfe2ce6e0, 0xa3014314, 0x4e0811a1,
    0xf7537e82, 0xbd3af235, 0x2ad7d2bb, 0xeb86d391,
];

const utf16To8 = function ( string ) {
    let utf8 = '';
    for ( let i = 0, l = string.length; i < l; i += 1 ) {
        const c = string.charCodeAt( i );
        if ( c < 128 ) {
            utf8 += string.charAt( i );
        } else if ( c < 2048 ) {
            utf8 += String.fromCharCode( ( c >> 6 ) | 192 );
            utf8 += String.fromCharCode( ( c & 63 ) | 128 );
        } else {
            utf8 += String.fromCharCode( ( c >> 12 ) | 224 );
            utf8 += String.fromCharCode( ( ( c >> 6 ) & 63 ) | 128 );
            utf8 += String.fromCharCode( ( c & 63 ) | 128 );
        }
    }
    return utf8;
};

const stringToWords = function ( string ) {
    // Each character is 8 bits. Pack into an array of 32 bit numbers
    // then pad the end as specified by the MD5 standard: a single one
    // bit followed by as many zeros as need to make the length in bits
    // === 448 mod 512, then finally the length of the input, in bits,
    // as a 64 bit little-endian long int.
    const length = string.length;
    const blocks = [ 0 ];
    let i, j, k;
    for ( i = 0, j = 0, k = 0; j < length; j += 1 ) {
        blocks[i] |= string.charCodeAt( j ) << k;
        k += 8;
        if ( k === 32 ) {
            k = 0;
            blocks[ i += 1 ] = 0;
        }
    }
    blocks[i] |= 0x80 << k;
    i += 1;

    const padding = i + 16 - ( ( ( i + 2 ) % 16 ) || 16 );
    for ( ; i < padding; i += 1 ) {
        blocks[i] = 0;
    }

    // Each char is 8 bits.
    blocks[i] = length << 3;
    blocks[ i + 1 ] = length >>> 29;

    return blocks;
};

// Add unsigned 32 bit ints with overflow.
const add = function ( a, b ) {
    const lsw = ( a & 0xffff ) + ( b & 0xffff );
    const msw = ( a >> 16 ) + ( b >> 16 ) + ( lsw >> 16 );
    return ( msw << 16 ) | ( lsw & 0xffff );
};

const leftRotate = function ( a, b ) {
    return ( a << b ) | ( a >>> ( 32 - b ) );
};

const hexCharacters = '0123456789abcdef';
const hex = function ( number ) {
    let string = '';
    for ( let i = 0; i < 32; i += 8 ) {
        string += hexCharacters[ ( number >> i + 4 ) & 0xf ];
        string += hexCharacters[ ( number >> i ) & 0xf ];
    }
    return string;
};

/**
    Method: String#md5

    Calculates the MD5 hash of the string.
    See <http://en.wikipedia.org/wiki/MD5>.

    Returns:
        {String} The 128 bit hash in the form of a hexadecimal string.
*/
String.prototype.md5 = function () {
    const words = stringToWords( utf16To8( this ) );
    let h0 = 0x67452301;
    let h1 = 0xEFCDAB89;
    let h2 = 0x98BADCFE;
    let h3 = 0x10325476;

    for ( let j = 0, l = words.length; j < l; j += 16 ) {
        let a = h0;
        let b = h1;
        let c = h2;
        let d = h3;
        let f, g, temp;

        for ( let i = 0; i < 64; i += 1 ) {
            if ( i < 16 ) {
                f = ( b & c ) | ( (~b) & d );
                g = i;
            } else if ( i < 32 ) {
                f = ( d & b ) | ( (~d) & c );
                g = ( ( 5 * i ) + 1 ) % 16;
            } else if ( i < 48 ) {
                f = b ^ c ^ d;
                g = ( ( 3 * i ) + 5 ) % 16;
            } else {
                f = c ^ ( b | (~d) );
                g = ( 7 * i ) % 16;
            }
            temp = d;
            d = c;
            c = b;
            b = add( b,
                    leftRotate(
                        add( a,
                            add( f,
                                add( k[i], words[ j + g ] )
                            )
                        ),
                        r[i]
                    )
                );
            a = temp;
        }

        h0 = add( h0, a );
        h1 = add( h1, b );
        h2 = add( h2, c );
        h3 = add( h3, d );
    }

    return hex( h0 ) + hex( h1 ) + hex( h2 ) + hex( h3 );
};
