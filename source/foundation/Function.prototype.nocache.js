/**
    Method: Function#nocache

    Marks a getter method such that its value is not cached.

    Returns:
        {Function} Returns self.
*/
Function.prototype.nocache = function () {
    this.isVolatile = true;
    return this;
};
