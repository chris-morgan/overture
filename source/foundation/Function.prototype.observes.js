const setupObserver = function ( metadata, method ) {
    const observes = this.observedProperties;
    let l = observes.length;
    let pathObservers;

    while ( l-- ) {
        const key = observes[l];
        if ( key.indexOf( '.' ) === -1 ) {
            metadata.addObserver( key, { object: null, method } );
        } else {
            if ( !pathObservers ) {
                pathObservers = metadata.pathObservers;
                if ( !metadata.hasOwnProperty( 'pathObservers' ) ) {
                    pathObservers =
                        metadata.pathObservers = Object.create( pathObservers );
                }
                // There can't be any existing path observers for this method,
                // as we're only just adding it (and if we're overriding a
                // previous method, we should have removed all of their path
                // observers first anyway).
                pathObservers = pathObservers[ method ] = [];
                metadata.inits.Observers =
                    ( metadata.inits.Observers || 0 ) + 1;
            }
            pathObservers.push( key );
        }
    }
};

const teardownObserver = function ( metadata, method ) {
    const observes = this.observedProperties;
    let l = observes.length;
    let pathObservers;

    while ( l-- ) {
        const key = observes[l];
        if ( key.indexOf( '.' ) === -1 ) {
            metadata.removeObserver( key, { object: null, method } );
        } else if ( !pathObservers ) {
            pathObservers = metadata.pathObservers;
            if ( !metadata.hasOwnProperty( 'pathObservers' ) ) {
                pathObservers =
                    metadata.pathObservers = Object.create( pathObservers );
            }
            // We want to remove all path observers. Can't just delete
            // though, as it may defined on the prototype object.
            pathObservers[ method ] = null;
            metadata.inits.Observers -= 1;
        }
    }
};

/**
    Method: Function#observes

    Defines the list of properties (on the same object) or paths (relative
    to this object) that this method is interested in. Whenever one of these
    properties changes, the method will automatically be called.

    Parameters:
        var_args - {...String} All arguments are treated as the names of
                   properties this method should observe.

    Returns:
        {Function} Returns self.
 */
Function.prototype.observes = function () {
    const properties = ( this.observedProperties ||
        ( this.observedProperties = [] ) );
    let l = arguments.length;
    while ( l-- ) {
        properties.push( arguments[l] );
    }
    this.__setupProperty__ = setupObserver;
    this.__teardownProperty__ = teardownObserver;
    return this;
};
