const map = Array.prototype.map;
const eventPrefix = '__event__';

/**
    Method: Function#on

    Defines the list of events this method is interested in. Whenever one of
    these events is triggered on the object to which this method belongs,
    the method will automatically be called.

    Parameters:
        var_args - {...String} All arguments are treated as the names of
                   events this method should be triggered by.

    Returns:
        {Function} Returns self.
 */
Function.prototype.on = function () {
    return this.observes.apply( this,
        map.call( arguments, type => eventPrefix + type )
    );
};
