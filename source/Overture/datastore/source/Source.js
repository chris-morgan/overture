// -------------------------------------------------------------------------- \\
// File: Source.js                                                            \\
// Module: DataStore                                                          \\
// Requires: Core, Foundation                                                 \\
// Author: Neil Jenkins                                                       \\
// License: © 2010-2015 FastMail Pty Ltd. MIT Licensed.                       \\
// -------------------------------------------------------------------------- \\

import { Class } from '../../core/Core.js';
import Object from '../../foundation/Object.js';

/**
    Class: O.Source

    Extends: O.Object

    A source provides persistent storage for a set of records. Data is fetched
    and commited back to here by an instance of <O.Store>.
*/
var Source = Class({

    Extends: Object,

    // ---

    /**
        Method: O.Source#fetchRecord

        Fetches a particular record from the source

        Parameters:
            Type     - {O.Class} The record type.
            id       - {String} The record id.
            callback - {Function} (optional) A callback to make after the record
                       fetch completes (successfully or unsuccessfully).

        Returns:
            {Boolean} Returns true if the source handled the fetch.
    */
    fetchRecord: function (/* Type, id, callback */) {
        return false;
    },

    /**
        Method: O.Source#fetchAllRecords

        Fetches all records of a particular type from the source. If a state
        token is supplied, the server may, if it is able to, only return the
        changes since that state.

        Parameters:
            Type     - {O.Class} The record type.
            state    - {(String|undefined)} The current state in the store.
            callback - {Function} (optional) A callback to make after the record
                       fetch completes (successfully or unsuccessfully).

        Returns:
            {Boolean} Returns true if the source handled the fetch.
    */
    fetchAllRecords: function (/* Type, state, callback */) {
        return false;
    },

    /**
        Method: O.Source#refreshRecord

        Fetches any new data for a previously fetched record. If not overridden,
        this method just calls <O.Source#fetchRecord>.

        Parameters:
            Type     - {O.Class} The record type.
            id       - {String} The record id.
            callback - {Function} (optional) A callback to make after the record
                       refresh completes (successfully or unsuccessfully).

        Returns:
            {Boolean} Returns true if the source handled the refresh.
    */
    refreshRecord: function ( Type, id, callback ) {
        return this.fetchRecord( Type, id, callback );
    },

    /**
        Method: O.Source#fetchQuery

        Fetches the data for a remote query from the source.

        Parameters:
            query - {O.RemoteQuery} The query to fetch.

        Returns:
            {Boolean} Returns true if the source handled the fetch.
    */
    fetchQuery: function (/* query, callback */) {
        return false;
    },

    /**
        Method: O.Source#commitChanges

        Commits a set of creates/updates/destroys to the source. These are
        specified in a single object, which has record type names as keys and an
        object with create/update/destroy properties as values.

        A changedMap, is a map of attribute names to a boolean value indicating
        whether that value has actually changed. Any properties in the data
        which are not in the changed map are presumed unchanged.

        An example call might look like:

            source.commitChanges({
                MyType: {
                    primaryKey: "id",
                    create: {
                        storeKeys: [ "sk1", "sk2" ],
                        records: [{ attr: val, attr2: val2 ...}, {...}]
                    },
                    update: {
                        storeKeys: [ "sk3", "sk4", ... ],
                        records: [{ id: "id3", attr: val ... }, {...}],
                        changes: [{ attr: true }, ... ]
                    },
                    destroy: {
                        storeKeys: [ "sk5", "sk6" ],
                        ids: [ "id5", "id6" ]
                    },
                    state: "i425m515233"
                },
                MyOtherType: {
                    ...
                }
            });

        Any types that are handled by the source are removed from the changes
        object (`delete changes[ typeName ]`); any unhandled types are left
        behind, so the object may be passed to several sources, with each
        handling their own types.

        Parameters:
            changes  - {Object} The creates/updates/destroys to commit.
            callback - {Function} (optional) A callback to make after the
                       changes have been committed.

        Returns:
            {Boolean} Returns true if any of the types were handled. The
            callback will only be called if the source is handling at least one
            of the types being committed.
    */
    commitChanges: function (/* changes, callback */) {
        return false;
    }
});

export default Source;
