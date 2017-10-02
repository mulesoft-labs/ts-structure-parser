import ts = require("typescript");
import tsm = require("./tsASTMatchers");
import * as path from "path";
import * as fs from "fs";

import index = require("../index");
import tsStructureParser = require("./tsStructureParser");
import {HelperMethod} from "./helpers";
import {Meta} from "./helpers";
import {Arg} from "./helpers";

export function getHelperMethods(srcPath: string): HelperMethod[] {

    var result: HelperMethod[] = [];
    var content = fs.readFileSync(path.resolve(srcPath)).toString();

    var mod = ts.createSourceFile("sample.ts", content, ts.ScriptTarget.ES3, true);

    tsm.Matching.visit(mod, x => {

        var node = <any>x;
        if (node.kind === ts.SyntaxKind.FunctionDeclaration) {

            var meta = getMeta(node, content);
            if (!meta) {
                return;
            }
            var originalName = node.name.text;
            var wrapperMethodName = originalName;
            if (meta.name) {
                wrapperMethodName = meta.name;
            } else {
                meta.name = originalName;
            }
            wrapperMethodName = meta.name ? meta.name : originalName;
            var args = node.parameters ? node.parameters.map(a => readArg(a, srcPath)) : [];
            var override = meta.override ? meta.override : false;
            var returnType = tsStructureParser.buildType(node.type, srcPath);
            result.push( new HelperMethod(originalName, wrapperMethodName, returnType, args, meta) );
        }
    });
    return result;
}

var refineComment = function (comment: any) {
    return comment.replace(/^\s*\/\*+/g, "").replace(/\*+\/\s*$/g, "").split("\n")
        .map(x => x.replace(/^\s*\/\//g, "").replace(/^\s*\* {0,1}/g, "")).join("\n").trim();
};

function getMeta(node: any, content: string): Meta {

    var cRange: any = ts.getLeadingCommentRanges(content, node.pos);
    if (!cRange) {
        return null;
    }

    var comment = cRange.map(x => content.substring(x.pos, x.end)).join("\n");

    var ind = comment.indexOf("__$helperMethod__");
    if ( ind < 0) {
        return null;
    }
    ind += "__$helperMethod__".length;

    var indMeta = comment.indexOf("__$meta__");
    if (indMeta < 0) {
        return { comment: refineComment(comment.substring(ind)) };
    }

    var commentStr = refineComment(comment.substring(ind, indMeta));

    var indMetaObj = comment.indexOf("{", indMeta);
    if (indMetaObj < 0) {
        return { comment: commentStr};
    }

    try {
        var meta = JSON.parse(refineComment(comment.substring(indMetaObj)));
        meta.comment = commentStr.trim().length > 0 ? commentStr : null;
        meta.override = meta.override || false;
        meta.primary = meta.primary || false;
        meta.deprecated = meta.deprecated || false;
        return meta;
    } catch (e) {
        console.log(e);
    }

    return {};
}

function readArg(node: any, srcPath: string): Arg {

    var name = node.name.text;

    var type = tsStructureParser.buildType(node.type, srcPath);

    var defaultValue;
    var optional = node.questionToken != null;
    if (node.initializer != null) {
        defaultValue = tsStructureParser.parseArg(node.initializer);
        optional = true;
    }
    return {
        name: name,
        type: type,
        defaultValue: defaultValue,
        optional: optional
    };
}
