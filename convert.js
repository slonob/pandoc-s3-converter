/*global require, module, console */
var path = require("path"),
  fs = require("fs"),
  os = require("os"),
  uuid = require("uuid"),
  pandocBinaryPath = "/opt/bin/pandoc",
  cpPromise = require("./child-process-promise"),
  s3 = require("./s3-util");

module.exports = function convert(bucket, fileKey) {
  "use strict";
  var targetPath, sourcePath, refPath;
  console.log("converting", bucket, fileKey);
  return s3.downloadRaw(bucket, "reference.docx").then(function (referencePath) {
    return s3.download(bucket, fileKey)
      .then(function (downloadedPath) {
        sourcePath = downloadedPath;
        console.log("referencePath:", referencePath);
				targetPath = path.join(os.tmpdir(), uuid.v4() + ".docx");
				var refArg = "--reference-doc=" + referencePath;
        console.log("refArg:", refArg);
        console.log("sourcePath/downloadedPath:", sourcePath);
        console.log("targetPath:", targetPath);
        return cpPromise.spawn(pandocBinaryPath, [
					"--toc",
					refArg,
          sourcePath,
          "-o",
          targetPath
        ]);
      })
      .then(function () {
        var uploadKey = fileKey
          .replace(/^in/, "out")
          .replace(/\.[A-z0-9]+$/, ".docx");
        return s3.upload(bucket, uploadKey, targetPath);
      })
      .then(function () {
        console.log("deleting", targetPath, sourcePath);
        fs.unlinkSync(targetPath);
        fs.unlinkSync(sourcePath);
      });
  });
};
