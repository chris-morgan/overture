import RunLoop from './RunLoop';

/**
    Method: Function#nextFrame

    Returns:
        {Function} Returns wrapper that passes calls to
        <O.RunLoop.invokeInNextFrame>.
*/
Function.prototype.nextFrame = function () {
    const fn = this;
    return function () {
        RunLoop.invokeInNextFrame( fn, this );
        return this;
    };
};
