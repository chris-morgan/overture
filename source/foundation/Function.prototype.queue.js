import RunLoop from './RunLoop';

/**
    Method: Function#queue

    Parameters:
        queue - {String} The name of the queue to add calls to this function to.

    Returns:
        {Function} Returns wrapper that passes calls to
        <O.RunLoop.queueFn>.
*/
Function.prototype.queue = function ( queue ) {
    const fn = this;
    return function () {
        RunLoop.queueFn( queue, fn, this );
        return this;
    };
};
