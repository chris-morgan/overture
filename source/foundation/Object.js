import getFromPath from './getFromPath';
import Binding from './Binding';
import Event from './Event';
import RunLoop from './RunLoop';

import { meta, guid } from '../core/Core';
import '../core/Array';  // For Array#erase
import '../core/Object';  // For Object.keyOf

const bindingKey = '__binding__';

/**
    Module: Foundation

    The Foundation module provides the basic objects and mixins for key-value
    coding and observation as well as bindings and a run loop.
*/

// --- Computed properties

/**
    Function (private): O.Object-computeDependentKeys

    Finds all keys which have a dependency on the given key (note
    this is not just direct dependencies, but could be via intermediate
    properties).

    Parameters:
        cache   - {Object} An object mapping property names to the keys that are
                  directly dependent on them.
        key     - {String} The name of the property for which we are finding the
                  dependent keys.
        results - {String[]} This array will be populated with the
                  dependent keys. Non-recursive calls to this function should
                  supply an empty array here.

    Returns:
        {String[]} The results array.
*/
const computeDependentKeys = function ( cache, key, results ) {
    const dependents = cache[ key ];
    if ( dependents ) {
        let l = dependents.length;
        while ( l-- ) {
            const dependentKey = dependents[l];
            // May be multiple ways to get to this dependency.
            if ( results.indexOf( dependentKey ) === -1 ) {
                results.push( dependentKey );
                computeDependentKeys( cache, dependentKey, results );
            }
        }
    }
    return results;
};

// --- Observable properties

/**
    Method (private): O.Object-_setupTeardownPaths

    Adds or removes path observers for methods on an object.

    Parameters:
        object - {Object} The object to setup/teardown path observers for.
        method - {String} Either 'addObserverForPath' or 'removeObserverForPath'
*/
const _setupTeardownPaths = function ( object, method ) {
    const pathObservers = meta( object ).pathObservers;
    for ( const key in pathObservers ) {
        const paths = pathObservers[ key ];
        if ( paths ) {
            let l = paths.length;
            while ( l-- ) {
                object[ method ]( paths[l], object, key );
            }
        }
    }
};

/**
    Method (private): O.Object-_notifyObserversOfKey

    Notifies any observers of a particular key and also removes old path
    observers and adds them to the new object.

    Parameters:
        that     - {O.Object} The object on which the property has changed.
        metadata - {Object} The metadata for this object.
        key      - {String} The name of the property whose observers need to
                   be notified.
        oldValue - {*} The old value for the property.
        newValue - {*} The new value for the property.
*/
const _notifyObserversOfKey =
        function ( that, metadata, key, oldValue, newValue ) {
    const isInitialised = metadata.isInitialised;
    const observers = metadata.observers[ key ];
    const l = observers ? observers.length : 0;
    let haveCheckedForNew = false;
    for ( let i = 0; i < l; i += 1 ) {
        const observer = observers[i];
        const object = observer.object || that;
        const method = observer.method;
        const path = observer.path;
        // During initialisation, this method is only called when a
        // binding syncs. We want to give the illusion of the bound
        // properties being present on the object from the beginning, so
        // they can be used interchangably with non-bound properties, so
        // suppress notification of observers. However, if there is
        // another binding that is bound to this one, we need to notify
        // that to ensure it syncs the correct initial value.
        // We also need to set up any path observers correctly.
        if ( isInitialised ) {
            if ( path ) {
                // If it's a computed property we don't really want to call
                // it unless it's needed; could be expensive.
                if ( newValue === undefined && !haveCheckedForNew ) {
                    newValue = /^\d+$/.test( key ) ?
                        that.getObjectAt( parseInt( key, 10 ) ) :
                        that.get( key );
                    haveCheckedForNew = true;
                }
                // Either value could be null
                if ( oldValue ) {
                    oldValue.removeObserverForPath( path, object, method );
                }
                if ( newValue ) {
                    newValue.addObserverForPath( path, object, method );
                }
                object[ method ]( that, key,
                    oldValue && oldValue.getFromPath( path ),
                    newValue && newValue.getFromPath( path ) );
            } else {
                object[ method ]( that, key, oldValue, newValue );
            }
        } else {
            // Setup path observers on initial value.
            if ( newValue && path ) {
                newValue.addObserverForPath( path, object, method );
            }
            // Sync binding immediately
            if ( object instanceof Binding ) {
                object[ method ]();
                object.sync();
            }
        }
    }
};

/**
    Method (private): O.Object-_notifyGenericObservers

    Notifies any observers interested (registered as observing key '*') that
    at least one property has changed on this object.

    Parameters:
        that     - {O.Object} The object on which the property has changed.
        metadata - {Object} The metadata for this object.
        changed  - {Object} A map of property names to another object. This
                   object has an oldValue and possibly a newValue property.
*/
const _notifyGenericObservers = function ( that, metadata, changed ) {
    const observers = metadata.observers[ '*' ];
    for ( let i = 0, l = observers ? observers.length : 0; i < l; i += 1 ) {
        const observer = observers[i];
        ( observer.object || that )[ observer.method ]( that, changed );
    }
};

// --- Event target

const eventPrefix = '__event__';

// --- Object

/**
    Class: O.Object

    This is the root class for almost every object in the rest of the library.
    It adds support for computed properties, bound properties, observable
    properties and subscribing/firing events.

    **Computed properties:** it provides a generic get/set method for accessing
    and modifying properties. Support is also provided for getter/setter
    methods: if the property being accessed is a function marked by a call to
    <Function#property>, the function will be called and the result returned
    rather than just the function itself being returned. If the set function is
    called the value will be provided as the sole argument to the function; this
    will be undefined otherwise. Any changes made to public properties not using
    the set method must call the propertyDidChange method after the change to
    keep the cache consistent and possibly notify observers in overriden
    versions of this method.

    **Bound properties:** it provides support for initialising bound properties
    inherited from the prototype, and for suspending/resuming bindings on the
    object.

    **Observable properties:** it provides support for key-value observing to
    another class. Public properties should only be accessed and modified via
    the get/set methods.

    **Event target:** it provides custom event support, complete with bubbling.
    You can fire an event at any time by calling `this.fire('eventName')`.
    If you add a target to support bubbling, it is recommended you add a prefix
    to the name of your events, to distinguish them from those of other classes,
    e.g. the IO class fires `io:eventName` events.
*/
export default class Obj {
    /**
        Constructor: O.Object

        Parameters:
            ...mixins - {Object} (optional) Each argument passed will be treated
                        as an object, with any properties in that object added
                        to the new O.Object instance before initialisation (so
                        you can pass it getter/setter functions or observing
                        methods).
    */
    constructor ( ...mixins ) {
        this.isDestroyed = false;

        for ( let i = 0, l = mixins.length; i < l; i += 1 ) {
            Object.assign( this, mixins[i] );
        }

        const metadata = meta( this );
        const inits = metadata.inits;
        for ( const method in inits ) {
            if ( inits[ method ] ) {
                this[ 'init' + method ]();
            }
        }
        metadata.isInitialised = true;
    }

    /**
        Method: O.Object#destroy

        Removes any connections to other objects (e.g. path observers and
        bindings) so the object will be available for garbage collection.
    */
    destroy () {
        const destructors = meta( this ).inits;
        for ( const method in destructors ) {
            if ( destructors[ method ] ) {
                this[ 'destroy' + method ]();
            }
        }

        this.isDestroyed = true;
    }

    // --- Computed properties

    /**
        Method: O.Object#propertiesDependentOnKey

        Returns an array of the name of all computed properties
        which depend on the given key.

        Parameters:
            key - {String} The name of the key to fetch the dependents of.

        Returns:
            {Array} Returns the list of dependents (may be empty).
    */
    propertiesDependentOnKey ( key ) {
        const metadata = meta( this );
        return metadata.allDependents[ key ] ||
            ( metadata.allDependents[ key ] =
                computeDependentKeys( metadata.dependents, key, [] ) );
    }

    // propertyDidChange is a part of computed properties, but observable
    // properties extend it, so that hunk of code lives lower in the file.

    /**
        Method: O.Object#computedPropertyDidChange

        Invalidates the cached value for a property then calls
        propertyDidChange.

        Parameters:
            key - {String} The name of the computed property which has changed.
            newValue - {*} (optional) The new value for the property

        Returns:
            {O.Object} Returns self.
    */
    computedPropertyDidChange ( key, newValue ) {
        const cache = meta( this ).cache;
        const oldValue = cache[ key ];
        delete cache[ key ];
        if ( newValue !== undefined ) {
            cache[ key ] = newValue;
        }
        return this.propertyDidChange( key, oldValue, newValue );
    }

    /**
        Method: O.Object#set

        Sets the value of the named property on this object to the value given.
        If that property is actually a computed property, the new value is
        passed as an argument to that method. This will automatically call
        `propertyDidChange()` to invalidate cached values that depend on this
        property (and notify observers about the change in the case of
        <O.Object> objects).

        Parameters:
            key   - {String} The name of the property to set.
            value - {*} The new value of the property.

        Returns:
            {O.Object} Returns self.
    */
    set ( key, value ) {
        let oldValue = this[ key ],
            silent, cache;
        if ( oldValue && oldValue.isProperty ) {
            silent = !!oldValue.isSilent;
            value = oldValue.call( this, value, key );
            if ( !oldValue.isVolatile ) {
                cache = meta( this ).cache;
                oldValue = cache[ key ];
                cache[ key ] = value;
            } else {
                oldValue = undefined;
            }
        } else {
            // No point in notifying of a change if it hasn't really happened.
            silent = ( oldValue === value );
            this[ key ] = value;
        }
        return silent ? this : this.propertyDidChange( key, oldValue, value );
    }

    /**
        Method: O.Object#get

        Gets the value of the named property on this object. If there is an
        accessor function for this property it will call that rather than just
        returning the function. Values will be cached for efficient subsequent
        retrieval unless the accessor function is marked volatile.

        Parameters:
            key - {String} The name of the property to fetch.

        Returns:
            {*} The value of the property.
    */
    get ( key ) {
        const value = this[ key ];
        if ( value && value.isProperty ) {
            if ( value.isVolatile ) {
                return value.call( this, undefined, key );
            }
            const cache = meta( this ).cache;
            return ( key in cache ) ? cache[ key ] :
                ( cache[ key ] = value.call( this, undefined, key ) );
        }
        return value;
    }

    /**
        Method: O.Object#getFromPath

        Gets the value at the given path string relative to the object on which
        the method was called.

        Parameters:
            path - {String} The path (e.g. 'widget.view.height');

        Returns:
            {*} The value at that path relative to this object.
    */
    getFromPath ( path ) {
        return getFromPath( this, path );
    }

    /**
        Method: O.Object#increment

        Adds the value of the delta argument to the value stored in the property
        with the given key.

        Parameters:
            key   - {String} The name of the numerical property.
            delta - {Number} The amount to add to the current value.

        Returns:
            {O.Object} Returns self.
    */
    increment ( key, delta ) {
        return this.set( key, this.get( key ) + delta );
    }

    /**
        Method: O.Object#toggle

        Sets the value of the given key to the boolean negation of its previous
        value.

        Parameters:
            key - {String} The name of the property to toggle.

        Returns:
            {O.Object} Returns self.
    */
    toggle ( key ) {
        return this.set( key, !this.get( key ) );
    }

    // --- Bound properties

    /**
        Method: O.Object#initBindings

        Initialises bound properties. Creates a new Binding object if the
        binding is inherited, then connects it to the appropriate key and does
        an initial sync. You should never call this directly, but rather iterate
        through the keys of `O.meta( this ).inits`, calling
        `this[ 'init' + key ]()` for all keys which map to a truthy value.

        Returns:
            {O.Object} Returns self.
    */
    initBindings () {
        const bindings = meta( this ).bindings;
        for ( const key in bindings ) {
            // Guard in case a previously bound property has been overridden in
            // a subclass by a non-bound value.
            let binding;
            if ( binding = bindings[ key ] ) {
                if ( !bindings.hasOwnProperty( key ) ) {
                    binding = bindings[ key ] = Object.create( binding );
                }
                // Set it to undefined. If the initial value to be synced
                // is undefined, nothing will be synced, but we don't want to
                // leave the Binding object itself as the value; instead we want
                // the value to be undefined.
                this[ key ] = undefined;
                binding.to( key, this ).connect();
            }
        }
        return this;
    }

    /**
        Method: O.Object#destroyBindings

        Disconnect and destroy all bindings connected to this object. You should
        never call this directly, but rather iterate through the keys of
        `O.meta( this ).inits`, calling `this[ 'destroy' + key ]()` for all keys
        which map to a truthy value.

        Returns:
            {O.Object} Returns self.
    */
    destroyBindings () {
        const bindings = meta( this ).bindings;
        for ( const key in bindings ) {
            // Guard in case a previously bound property has been overridden in
            // a subclass by a non-bound value.
            const binding = bindings[ key ];
            if ( binding ) {
                binding.destroy();
            }
        }
        return this;
    }

    /**
        Method: O.Object#registerBinding

        Call this whenever you add a binding to an object after initialisation,
        otherwise suspend/remove/destroy will not work correctly.

        Returns:
            {O.Object} Returns self.
    */
    registerBinding ( binding ) {
        const metadata = meta( this );
        metadata.bindings[ bindingKey + guid( binding ) ] = binding;
        metadata.inits.Bindings = ( metadata.inits.Bindings || 0 ) + 1;
        return this;
    }

    /**
        Method: O.Object#deregisterBinding

        Call this if you destroy a binding to this object before the object
        itself is destroyed.

        Returns:
            {O.Object} Returns self.
    */
    deregisterBinding ( binding ) {
        const metadata = meta( this );
        const bindings = metadata.bindings;
        const key = Object.keyOf( bindings, binding );
        if ( key ) {
            bindings[ key ] = null;
            metadata.inits.Bindings -= 1;
        }
        return this;
    }

    /**
        Method: O.Object#suspendBindings

        Suspend all bindings to the object. This means that any bindings to the
        object will still note if there is a change, but will not sync that
        change until the binding is resumed.

        Returns:
            {O.Object} Returns self.
    */
    suspendBindings () {
        const bindings = meta( this ).bindings;
        for ( const key in bindings ) {
            const binding = bindings[ key ];
            if ( binding ) {
                binding.suspend();
            }
        }
        return this;
    }

    /**
        Method: O.Object#resumeBindings

        Resume (and sync if necessary) all bindings to the object.

        Returns:
            {O.Object} Returns self.
    */
    resumeBindings () {
        const bindings = meta( this ).bindings;
        for ( const key in bindings ) {
            const binding = bindings[ key ];
            if ( binding ) {
                binding.resume();
            }
        }
        return this;
    }

    // --- Observable properties

    /**
        Method: O.Object#initObservers

        Initialises any observed paths on the object (observed keys do not
        require initialisation. You should never call this directly, but rather
        iterate through the keys of `O.meta( this ).inits`, calling
        `this[ 'init' + key ]()` for all keys which map to truthy values.
    */
    initObservers () {
        _setupTeardownPaths( this, 'addObserverForPath' );
    }

    /**
        Method: O.Object#destroyObservers

        Removes any observed paths from the object (observed keys do not require
        destruction. You should never call this directly, but rather iterate
        through the keys of `O.meta( this ).inits`, calling
        `this[ 'destroy' + key ]()` for all keys which map to a truthy value.
    */
    destroyObservers () {
        _setupTeardownPaths( this, 'removeObserverForPath' );
    }

    /**
        Method: O.Object#hasObservers

        Returns true if any property on the object is currently being observed
        by another object.

        Returns:
            {Boolean} Does the object have any observers?
    */
    hasObservers () {
        const observers = meta( this ).observers;
        for ( const key in observers ) {
            const keyObservers = observers[ key ];
            let l = keyObservers ? keyObservers.length : 0;
            while ( l-- ) {
                const object = keyObservers[l].object;
                if ( object && object !== this &&
                        // Ignore bindings that belong to the object.
                        !( ( object instanceof Binding ) &&
                             object.toObject === this ) ) {
                    return true;
                }
            }
        }
        return false;
    }

    /**
        Method: O.Object#beginPropertyChanges

        Call this before changing a set of properties (and then call
        <endPropertyChanges> afterwards) to ensure that if a dependent property
        changes more than once, observers of that property will only be notified
        once of the change. No observer will be called until
        the matching <endPropertyChanges> call is made.

        Returns:
            {O.Object} Returns self.
    */
    beginPropertyChanges () {
        meta( this ).depth += 1;
        return this;
    }

    /**
        Method: O.Object#endPropertyChanges

        Call this after changing a set of properties (having called
        <beginPropertyChanges> before) to ensure that if a dependent property
        changes more than once, observers of that property will only be notified
        once of the change.

        Returns:
            {O.Object} Returns self.
    */
    endPropertyChanges () {
        const metadata = meta( this );
        if ( metadata.depth === 1 ) {
            // Notify observers.
            let changed;
            while ( changed = metadata.changed ) {
                metadata.changed = null;
                for ( const key in changed ) {
                    _notifyObserversOfKey( this, metadata,
                        key, changed[ key ].oldValue, changed[ key ].newValue );
                }
                // Notify observers interested in any property change
                if ( metadata.observers[ '*' ] ) {
                    _notifyGenericObservers( this, metadata, changed );
                }
            }
        }
        // Only decrement here so that any further property changes that happen
        // whilst we are notifying of the previous ones are queued up and then
        // distributed in the next loop.
        metadata.depth -= 1;
        return this;
    }

    /**
        Method: O.Object#propertyDidChange

        Invalidates any cached values depending on the property and notifies any
        observers about the change. Will also notify any observers of dependent
        values about the change.

        Parameters:
            key      - {String} The name of the property which has changed.
            oldValue - {*} The old value for the property.
            newValue - {*} (optional) The new value for the property. Only there
                       if it's not a computed property.

        Returns:
            {O.Object} Returns self.
    */
    propertyDidChange ( key, oldValue, newValue ) {
        const metadata = meta( this );
        const isInitialised = metadata.isInitialised;
        const dependents = isInitialised ?
                this.propertiesDependentOnKey( key ) : [];
        let l = dependents.length;
        const depth = metadata.depth;
        const hasGenericObservers = !!metadata.observers[ '*' ];
        const fastPath = !l && !depth && !hasGenericObservers;
        const changed = fastPath ? null : metadata.changed || {};
        const cache = metadata.cache;

        if ( fastPath ) {
            _notifyObserversOfKey( this, metadata, key, oldValue, newValue );
        } else {
            while ( l-- ) {
                const prop = dependents[l];
                if ( !changed[ prop ] ) {
                    changed[ prop ] = {
                        oldValue: cache[ prop ],
                    };
                }
                delete cache[ prop ];
            }

            changed[ key ] = {
                oldValue: changed[ key ] ? changed[ key ].oldValue : oldValue,
                newValue,
            };

            if ( metadata.depth ) {
                metadata.changed = changed;
            } else {
                // Notify observers of dependent keys.
                for ( const prop in changed ) {
                    _notifyObserversOfKey( this, metadata, prop,
                        changed[ prop ].oldValue, changed[ prop ].newValue );
                }

                // Notify observers interested in any property change
                if ( isInitialised && hasGenericObservers ) {
                    _notifyGenericObservers( this, metadata, changed );
                }
            }
        }

        return this;
    }

    /**
        Method: O.Object#addObserverForKey

        Registers an object and a method to be called on that object whenever a
        particular key changes in value. The method will be called with the
        following parameters: object, key, oldValue, newValue. If it is a
        computed property the oldValue and newValue arguments may not be
        present. You can also observe '*' to be notified of any changes to the
        object; in this case the observer will only be supplied with the first
        argument: this object.

        Parameters:
            key    - {String} The property to observer.
            object - {Object} The object on which to call the callback method.
            method - {String} The name of the callback method.

        Returns:
            {O.Object} Returns self.
    */
    addObserverForKey ( key, object, method ) {
        meta( this ).addObserver( key, { object, method } );
        return this;
    }

    /**
        Method: O.Object#removeObserverForKey

        Removes an object/method pair from the list of those to be called when
        the property changes. Must use identical arguments to a previous call to
        <addObserverForKey>.

        Parameters:
            key    - {String} The property which is being observed.
            object - {Object} The object which is observing it.
            method - {String} The name of the callback method on the observer
                     object.

        Returns:
            {O.Object} Returns self.
    */
    removeObserverForKey ( key, object, method ) {
        meta( this ).removeObserver( key, { object, method } );
        return this;
    }

    /**
        Method: O.Object#addObserverForPath

        Registers an object and a method to be called on that object whenever
        any property in a given path string changes. Note, this path is live, in
        that if you observe `foo.bar.x` and `bar` changes, you will receive a
        callback, and the observer will be deregistered from the old `bar`, and
        registered on the new one.

        Parameters:
            path   - {String} The path to observe.
            object - {Object} The object on which to call the callback method.
            method - {String} The name of the callback method.

        Returns:
            {O.Object} Returns self.
    */
    addObserverForPath ( path, object, method ) {
        const nextDot = path.indexOf( '.' );
        if ( nextDot === -1 ) {
            this.addObserverForKey( path, object, method );
        } else {
            const key = path.slice( 0, nextDot );
            const value = this.get( key );
            const restOfPath = path.slice( nextDot + 1 );

            meta( this ).addObserver( key, {
                path: restOfPath,
                object,
                method,
            });

            if ( value && !( value instanceof Binding ) ) {
                value.addObserverForPath( restOfPath, object, method );
            }
        }
        return this;
    }

    /**
        Method: O.Object#removeObserverForPath

        Removes an observer for a path added with <addObserverForPath>.

        Parameters:
            path   - {String} The path which is being observed.
            object - {Object} The object which is observing it.
            method - {String} The name of the callback method on the observer
                     object.

        Returns:
            {O.Object} Returns self.
    */
    removeObserverForPath ( path, object, method ) {
        const nextDot = path.indexOf( '.' );
        if ( nextDot === -1 ) {
            this.removeObserverForKey( path, object, method );
        } else {
            const key = path.slice( 0, nextDot );
            const value = this.get( key );
            const restOfPath = path.slice( nextDot + 1 );

            meta( this ).removeObserver( key, {
                path: restOfPath,
                object,
                method,
            });

            if ( value ) {
                value.removeObserverForPath( restOfPath, object, method );
            }
        }
        return this;
    }

    // --- Event target

    /**
        Method: O.Object#on

        Add a function to be called whenever an event of a particular type is
        fired.

        Parameters:
            type   - {String} The name of the event to subscribe to.
            object - {(Function|Object)} The function to be called when the
                     event fires, or alternatively supply an object and in the
                     third parameter give the name of the method to be called on
                     it.
            method - {String} (optional) The name of the callback method to be
                     called on object. Ignored if a function is passed for the
                     2nd parameter.

        Returns:
            {O.Object} Returns self.
    */
    on ( type, object, method ) {
        if ( typeof object !== 'function' ) {
            object = { object, method };
        }
        meta( this ).addObserver( eventPrefix + type, object );
        return this;
    }

    /**
        Method: O.Object#once

        Add a function to be called the next time an event of a particular type
        is fired, but not for subsequent firings.

        Parameters:
            type - {String} The name of the event to subscribe to.
            fn   - {Function} The function to be called when the event fires.

        Returns:
            {O.Object} Returns self.
    */
    once ( type, fn ) {
        const once = function ( event ) {
            fn.call( this, event );
            this.off( type, once );
        };
        this.on( type, once );
        return this;
    }

    /**
        Method: O.Object#fire

        Fires an event, causing all subscribed functions to be called with an
        event object as the single parameter and the scope bound to the object
        on which they subscribed to the event. In the case of subscribed
        object/method name pairs, the scope will remain the object on which the
        method is called.

        The event object contains the properties supplied in the details
        parameter and also a type attribute, with the type of the event, a
        target attribute, referencing the object on which the event was actually
        fired, a preventDefault function, which stops the default function
        firing if supplied, and a stopPropagation function, which prevents the
        event bubbling any further.

        Both parameters are optional, but at least one must be specified. If the
        `type` parameter is omitted, the `event` parameter must be an `Event` or
        `O.Event` instance, and its `type` property will be used.

        Parameters:
            type  - {String} (optional) The name of the event being fired.
            event - {Event|O.Event|Object} (optional) An event object or object
                    of values to be added to the event object.

        Returns:
            {O.Object} Returns self.
    */
    fire ( type, event ) {
        let target = this;
        if ( typeof type !== 'string' && !event ) {
            event = type;
            type = event.type;
        }
        const typeKey = eventPrefix + type;

        if ( !event || !( event instanceof Event ) ) {
            if ( event && /Event\]$/.test( event.toString() ) ) {
                event.stopPropagation = function () {
                    this.propagationStopped = true;
                    return this;
                };
            } else {
                event = new Event( type, target, event );
            }
        }
        event.propagationStopped = false;

        while ( target ) {
            const handlers = meta( target ).observers[ typeKey ];
            const l = handlers ? handlers.length : 0;
            for ( let i = 0; i < l; i += 1 ) {
                try {
                    const handler = handlers[i];
                    if ( typeof handler === 'function' ) {
                        handler.call( target, event );
                    } else {
                        ( handler.object || target )[ handler.method ]( event );
                    }
                } catch ( error ) {
                    RunLoop.didError( error );
                }
            }
            // Move up the hierarchy, unless stopPropagation was called
            target =
                event.propagationStopped ?
                    null :
                target.get ?
                    target.get( 'nextEventTarget' ) :
                    target.nextEventTarget;
        }

        return this;
    }

    /**
        Method: O.Object#off

        Detaches a particular event handler. This method has no effect if the
        function supplied is not subscribed to the event type given.

        Parameters:
            type   - {String} The name of the event to detach handlers from.
            object - {(Function|Object)} The function to detach or the object
                     whose method will be detached.
            method - {String} (optional) The name of the callback method to be
                     detached. Ignored if a function is passed for the 2nd
                     parameter.

        Returns:
            {O.Object} Returns self.
    */
    off ( type, object, method ) {
        if ( typeof object !== 'function' ) {
            object = { object, method };
        }
        meta( this ).removeObserver( eventPrefix + type, object );
        return this;
    }
}

// (Needed for compatibility with subclasses that use `O.Class`.)
Obj.prototype.init = Obj;

/**
    Property: O.Object#nextEventTarget
    Type: (O.Object|null)

    Pointer to the next object in the event bubbling chain.
*/
Obj.prototype.nextEventTarget = null;
