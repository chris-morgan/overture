import { clone } from '../core/Core';
import '../core/Array';  // For Array#erase

const slice = Array.prototype.slice;

const makeComputedDidChange = function ( key ) {
    return function () {
        this.computedPropertyDidChange( key );
    };
};

const setupComputed = function ( metadata, key, object ) {
    const dependencies = this.dependencies;
    let dependents = metadata.dependents;
    let method, pathObservers, methodObservers;

    if ( !metadata.hasOwnProperty( 'dependents' ) ) {
        dependents = metadata.dependents = clone( dependents );
        metadata.allDependents = {};
    }
    let l = dependencies.length;
    while ( l-- ) {
        const valueThisKeyDependsOn = dependencies[l];
        if ( valueThisKeyDependsOn.indexOf( '.' ) === -1 ) {
            ( dependents[ valueThisKeyDependsOn ] ||
                ( dependents[ valueThisKeyDependsOn ] = [] ) ).push( key );
        } else {
            if ( !method ) {
                method = '__' + key + 'DidChange__';
                metadata.inits.Observers =
                    ( metadata.inits.Observers || 0 ) + 1;
            }
            if ( !object[ method ] ) {
                object[ method ] = makeComputedDidChange( key );
            }
            if ( !pathObservers ) {
                pathObservers = metadata.pathObservers;
                if ( !metadata.hasOwnProperty( 'pathObservers' ) ) {
                    pathObservers =
                        metadata.pathObservers = Object.create( pathObservers );
                }
                methodObservers = pathObservers[ method ];
                if ( !methodObservers ) {
                    methodObservers = pathObservers[ method ] = [];
                } else if ( !pathObservers.hasOwnProperty( method ) ) {
                    methodObservers =
                        pathObservers[ method ] = methodObservers.slice();
                }
            }
            methodObservers.push( valueThisKeyDependsOn );
        }
    }
};

const teardownComputed = function ( metadata, key ) {
    const dependencies = this.dependencies;
    let dependents = metadata.dependents;
    let method, pathObservers, methodObservers;

    if ( !metadata.hasOwnProperty( 'dependents' ) ) {
        dependents = metadata.dependents = clone( dependents );
        metadata.allDependents = {};
    }
    let l = dependencies.length;
    while ( l-- ) {
        const valueThisKeyDependsOn = dependencies[l];
        if ( valueThisKeyDependsOn.indexOf( '.' ) === -1 ) {
            dependents[ valueThisKeyDependsOn ].erase( key );
        } else {
            if ( !method ) {
                method = '__' + key + 'DidChange__';
                metadata.inits.Observers -= 1;
            }
            if ( !pathObservers ) {
                pathObservers = metadata.pathObservers;
                if ( !metadata.hasOwnProperty( 'pathObservers' ) ) {
                    pathObservers =
                        metadata.pathObservers = Object.create( pathObservers );
                }
                methodObservers = pathObservers[ method ];
                if ( !pathObservers.hasOwnProperty( method ) ) {
                    methodObservers =
                        pathObservers[ method ] = methodObservers.slice();
                }
            }
            methodObservers.erase( valueThisKeyDependsOn );
        }
    }
};

/**
    Method: Function#property

    Marks a function as a property getter/setter. If a call to
    <O.Object#get> or <O.Object#set> is made and the
    current value of the property is this method, the method will be called
    rather than just returned/overwritten itself.

    Normally, properties will only be dependent on other properties on the
    same object. You may also specify paths though, e.g. 'object.obj2.prop',
    and this will also work.

    Parameters:
        var_args - {...String} All arguments are treated as the names of
                   properties this value depends on; if any of these are
                   changed, the cached value for this property will be
                   invalidated.

    Returns:
        {Function} Returns self.
*/
Function.prototype.property = function () {
    this.isProperty = true;
    if ( arguments.length ) {
        this.dependencies = slice.call( arguments );
        this.__setupProperty__ = setupComputed;
        this.__teardownProperty__ = teardownComputed;
    }
    return this;
};
