/**
    Method: String#hash

    Hashes the string to return a number which should (in theory at least)
    be statistically randomly distributed over any set of inputs, and each
    change in a bit of input should result in a change in roughly 50% of the
    bits in the output. Algorithm from:
    <http://www.azillionmonkeys.com/qed/hash.html>

    Returns:
        {Number} The hash. This is a *signed* 32-bit int.
*/
String.prototype.hash = function () {
    let hash = this.length;
    const remainder = hash & 1;
    const l = hash - remainder;

    for ( let i = 0; i < l; i += 2 ) {
        hash += this.charCodeAt( i );
        hash = ( hash << 16 ) ^
            ( ( this.charCodeAt( i + 1 ) << 11 ) ^ hash );
        hash += hash >> 11;
    }

    if ( remainder ) {
        hash += this.charCodeAt( l );
        hash ^= hash << 11;
        hash += hash >> 17;
    }

    // Force "avalanching" of final 127 bits
    hash ^= hash << 3;
    hash += hash >> 5;
    hash ^= hash << 4;
    hash += hash >> 17;
    hash ^= hash << 25;
    hash += hash >> 6;

    return hash;
};
