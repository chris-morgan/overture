import RunLoop from './RunLoop';

/**
    Method: Function#invokeInRunLoop

    Wraps any calls to this function inside a call to <O.RunLoop.invoke>.

    Returns:
        {Function} Returns wrapped function.
*/
Function.prototype.invokeInRunLoop = function () {
    const fn = this;
    return function () {
        return RunLoop.invoke( fn, this, arguments );
    };
};
