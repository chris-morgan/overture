/**
    Method: Function#doNotNotify

    Marks a computed property so that when it is set,
    <O.Object#propertyDidChange> is not automatically called.

    Returns:
        {Function} Returns self.
*/
Function.prototype.doNotNotify = function () {
    this.isSilent = true;
    return this;
};
