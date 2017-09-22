import RunLoop from './RunLoop';

/**
    Method: Function#nextLoop

    Returns:
        {Function} Returns wrapper that passes calls to
        <O.RunLoop.invokeInNextEventLoop>.
*/
Function.prototype.nextLoop = function () {
    const fn = this;
    return function () {
        RunLoop.invokeInNextEventLoop( fn, this );
        return this;
    };
};
