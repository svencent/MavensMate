function PackageXmlDoesNotExist(message) {
    this.message = message;
    this.name = "PackageXmlDoesNotExist";
    Error.captureStackTrace(this, PackageXmlDoesNotExist);
}
PackageXmlDoesNotExist.prototype = Object.create(Error.prototype);
PackageXmlDoesNotExist.prototype.constructor = PackageXmlDoesNotExist;

function PackageXmlInvalidFormat(message) {
    this.message = message;
    this.name = "PackageXmlInvalidFormat";
    Error.captureStackTrace(this, PackageXmlInvalidFormat);
}
PackageXmlInvalidFormat.prototype = Object.create(Error.prototype);
PackageXmlInvalidFormat.prototype.constructor = PackageXmlInvalidFormat;


module.exports.PackageXmlDoesNotExist = PackageXmlDoesNotExist;
module.exports.PackageXmlInvalidFormat = PackageXmlInvalidFormat;
