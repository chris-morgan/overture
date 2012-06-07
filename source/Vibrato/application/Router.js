// -------------------------------------------------------------------------- \\
// File: Router.js                                                            \\
// Module: Application                                                        \\
// Requires: Core, Foundation                                                 \\
// Author: Neil Jenkins                                                       \\
// License: © 2010–2012 Opera Software ASA. All rights reserved.              \\
// -------------------------------------------------------------------------- \\

/*global O, document, window, history, location */

"use strict";

/**
    Module: Application
    
    The Application module contains classes for managing an HTML5 application.
*/

( function ( NS ) {

var getHash = function ( location ) {
    var href = location.href,
        i = href.indexOf( '#/' );
    return  i > -1 ? href.slice( i + 2 ) : '';
};
var getUrl = function ( location, base ) {
    return location.pathname.slice( base.length );
};
/**
    Class: O.Router
    
    Extends: O.Object
    
    This class adds the ability to manage the URL in the browser window,
    updating it when your application state changes and vice versa.
*/
var Router = NS.Class({
    
    Extends: NS.Object,
    
    /**
        Property: O.Router#title
        Type: String
        
        The last title for the page window.
    */
    title: document.title,

    /**
        Property: O.Router#currentPath
        Type: String
        
        The last URL set by the app.
    */
    currentPath: '',
    
    /**
        Property: O.Router#useHash
        Type: Boolean
        Default: True if supported
        
        If true, will use pushState to manipulate the real URL. If false, will
        just set the hash component instead. By default this is true if the
        browser supports pushState and false otherwise. If left as true,
        <O.Router#baseUrl> *must* be correctly configured.
    */
    useHash: !history.pushState || ( location.protocol === 'file:' ),
    
    /**
        Property: O.Router#baseUrl
        Type: String
        Default: "/"
        
        The path to the base of the URL space that maps to application state.
    */
    baseUrl: '/',
    
    /**
        Property: O.Router#encodedState
        Type: String
        
        The encoded version of your application's current state. Whenever this
        changes, the URL will automatically be updated to match, therefore it
        should not contain any characters which are illegal in URLS. It may be a
        computed property with dependencies or set manually when state changes.
    */
    encodedState: '',
    
    /**
        Property: O.Router#routes
        Type: Array
        
        A collection of regular expressions for matching against URLs and
        functions for decoding the state from the match. Entries will be tried
        in order. Each entry should be an object with two properties:
        
        url    - {RegExp} The regular expression to execute on the encoded
                 state.
        handle - {Function} The handler for decoding the state if the regular
                 expression matches. This will be given the full encoded state
                 as the first parameter, followed by any capturing groups in the
                 regular expression.
    */
    routes: [],
    
    init: function ( options, win ) {
        Router.parent.init.call( this, options );
        if ( !win ) { win = window; }
        var location = win.location,
            path = this.useHash ?
                getHash( location ) : getUrl( location, this.baseUrl );
        this.set( 'currentPath', path );
        this.restoreStateFromUrl( path );
        win.addEventListener(
            this.useHash ? 'hashchange' : 'popstate', this, false );
        this._win = win;
    },
    
    /**
        Method: O.Router#setTitle
        
        Sets the window title. Called automatically whenever the
        <O.Router#title> property changes.
    */
    setTitle: function () {
        document.title = this.get( 'title' );
    }.observes( 'title' ),
    
    /**
        Method: O.Router#handleEvent
        
        Called automatically whenever the URL changes. Will compare to the last
        set value and if different, invoke <O.Router#restoreStateFromUrl> with
        the new URL.
    */
    handleEvent: function () {
        var location = this._win.location,
            path = this.useHash ?
                getHash( location ) : getUrl( location, this.baseUrl );

        if ( path !== this.get( 'currentPath' ) ) {
            this.set( 'currentPath', path );
            this.restoreStateFromUrl( path );
        }
    }.invokeInRunLoop(),
    
    /**
        Method: O.Router#restoreStateFromUrl
        
        Iterates throught the <O.Router#routes> until it finds a match, then
        uses that to decode the state from the URL. Called automatically
        whenever the URL changes.
        
        Parameters:
            url - {String} The url to restore state from.
    */
    restoreStateFromUrl: function ( url ) {
        var routes = this.get( 'routes' ),
            i, l, route, match;
        
        for ( i = 0, l = routes.length; i < l; i += 1 ) {
            route = routes[i];
            if ( match = route.url.exec( url ) ) {
                this.beginPropertyChanges();
                route.handle.apply( this, match );
                this.endPropertyChanges();
                break;
            }
        }
    },
    
    /**
        Method: O.Router#encodeStateToUrl
        
        Sets the current URL to match the <O.Router#encodedState> property.
        This method is called automatically once, at the end of the run loop
        (after bindings have synced), whenever this property changes.
    */
    encodeStateToUrl: function () {
        var state = this.get( 'encodedState' ),
            win = this._win;
        if ( this.get( 'currentPath' ) !== state ) {
            this.set( 'currentPath', state );
            if ( this.useHash ) {
                win.location.hash = '#/' + state;
            } else {
                win.history.pushState(
                    null, this.get( 'title' ), this.get( 'baseUrl' ) + state );
            }
        }
    }.queue( 'after' ).observes( 'encodedState' )
});

NS.Router = Router;

}( O ) );