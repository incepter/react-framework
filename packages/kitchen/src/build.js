"use strict";
exports.__esModule = true;
exports.delint = void 0;
var fs_1 = require("fs");
var ts = require("typescript");
function delint(sourceFile) {
    checkNode(sourceFile);
    function checkNode(node) {
        switch (node.kind) {
            case ts.SyntaxKind.Decorator: {
                console.log("________________________decorator", node);
            }
        }
        ts.forEachChild(node, checkNode);
    }
}
exports.delint = delint;
var fileNames = ["./new/newIndex.tsx"];
fileNames.forEach(function (fileName) {
    // Parse a file
    var sourceFile = ts.createSourceFile(fileName, (0, fs_1.readFileSync)(fileName).toString(), ts.ScriptTarget.ES2015, 
    /*setParentNodes */ true);
    // delint it
    delint(sourceFile);
});
