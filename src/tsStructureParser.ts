/**
 * Created by kor on 08/05/15.
 */

import ts = require("typescript");
export import tsm = require("./tsASTMatchers");
export import helperMethodExtractor = require("./helperMethodExtractor");
import fsUtil = require("./fsUtils");
import {TypeModel} from "../index";
import {TypeKind} from "../index";
import {ArrayType} from "../index";
import {Annotation} from "../index";
import {Decorator} from "../index";
import {Constraint} from "../index";
import {FieldModel} from "../index";
import {Module, FunctionDeclaration} from "../index";
import {MethodModel} from "../index";
import {ParameterModel} from "../index";
import {UnionType} from "../index";
import {BasicType} from "../index";
import {classDecl} from "../index";
import { JSONTransformer } from "./jsonTransformer";

function parse(content: string) {
    return ts.createSourceFile("sample.ts", content, ts.ScriptTarget.ES3, true);
}
var fld = tsm.Matching.field();

export function parseStruct(content: string, modules: {[path: string]: Module}, mpth: string): Module {
    var mod = parse(content);
    var module: Module = {functions: [], classes: [], aliases: [], enumDeclarations: [], imports: {}, _imports: [], name: mpth};
    modules[mpth] = module;
    var currentModule: string = null;
    tsm.Matching.visit(mod, x => {
        if ( x.kind === ts.SyntaxKind.ImportDeclaration ) {
            var impDec = <ts.ImportDeclaration>x;
            var localMod = parse(x.getText());
            var localImport = { clauses: [] , absPathNode: [], isNodeModule: false};
            var localNamedImports: string[];
            var localAbsPath: string[];
            var localNodeModule: boolean = false;
            var pth = require("path");
            tsm.Matching.visit(localMod, y => {
                var _import = {};
                if (y.kind === ts.SyntaxKind.NamedImports ) {
                    var lit = impDec.importClause.getText();
                    localNamedImports = lit.substring( 1, lit.length - 1).split(",");
                    localImport.clauses = localNamedImports.map( im => {
                        return im.trim();
                    } );
                }
                if (y.kind === ts.SyntaxKind.StringLiteral) {
                    var localPath = y.getText().substring( 1, y.getText().length - 1);
                    if ( localPath[0] === "." ) {
                        var localP = fsUtil.resolve( fsUtil.dirname( mpth) + "/", localPath).split( process.cwd()).join(".");
                        localAbsPath = localP.split(pth.sep);
                    } else {
                        localAbsPath = localPath.split(pth.sep);
                        localNodeModule = true;
                    }
                    localImport.absPathNode = localAbsPath;
                    localImport.isNodeModule = localNodeModule;
                }
            });
            module._imports.push(localImport);
        }
        if (x.kind === ts.SyntaxKind.FunctionDeclaration || x.kind ===  ts.SyntaxKind.ArrowFunction) {
            const isArrow = x.kind === ts.SyntaxKind.ArrowFunction;

            const functionDeclaration = isArrow ? x as ts.ArrowFunction : x as ts.FunctionDeclaration;
            const parentVariable = functionDeclaration.parent as ts.VariableDeclaration;
            const name = isArrow
                ?  parentVariable.name && parentVariable.name.getText()
                :  functionDeclaration.name.text;

            let isAsync = false;
            let isExport = false;
            let params: {name: string, type: string, mandatory: boolean}[] = [];
            if (name) {
                const modifierContainer = isArrow
                    ? (functionDeclaration.parent as ts.VariableDeclaration).initializer
                    : functionDeclaration;
                if (modifierContainer && modifierContainer.modifiers) {
                    modifierContainer.modifiers.forEach(modi => {
                        if (modi.kind === ts.SyntaxKind.AsyncKeyword) {
                            isAsync = true;
                        }
                        if (modi.kind === ts.SyntaxKind.ExportKeyword && !isArrow) {
                            isExport = true;
                        }
                    });
                }

                functionDeclaration.parameters.forEach(param => {
                    params.push({
                        name: param.name.getText(),
                        type: (param.type && param.type.getText()) || "any",
                        mandatory: !param.questionToken
                    });

                });
                module.functions.push({
                    isArrow,
                    isExport,
                    isAsync,
                    name,
                    params,
                });
            }
        }


        if (x.kind === ts.SyntaxKind.ModuleDeclaration) {
            var cmod = <ts.ModuleDeclaration>x;
            currentModule = cmod.name.text;
        }
        if ( x.kind === ts.SyntaxKind.ImportEqualsDeclaration) {
            var imp = <ts.ImportEqualsDeclaration>x;
            var namespace = imp.name.text;
            if (namespace === "RamlWrapper") {
                return;
            }

            var path = <ts.ExternalModuleReference>imp.moduleReference;

            var literal = <ts.StringLiteral>path.expression;
            var importPath = literal.text;
            var absPath = fsUtil.resolve(fsUtil.dirname(mpth) + "/", importPath) + ".ts";
            if (!fsUtil.existsSync(absPath)) {
                throw new Error("Path " + importPath + " resolve to " + absPath + "do not exists");
            }
            if (!modules[absPath]) {
                var cnt = fsUtil.readFileSync(absPath);
                var mod = parseStruct(cnt, modules, absPath);
            }
            module.imports[namespace] = modules[absPath];
        }
        if (x.kind === ts.SyntaxKind.TypeAliasDeclaration) {
            var u = <ts.TypeAliasDeclaration>x;
            if (u.name) {
                var aliasName = u.name.text;
                var type = buildType(u.type, mpth);
                module.aliases.push({name: aliasName, type: type});
            }

            //return;
        }

        if (x.kind === ts.SyntaxKind.EnumDeclaration) {
            var e = <ts.EnumDeclaration>x;
            var members: string[] = [];
            if (e.members) {
                e.members.forEach(y => {
                    members.push(y["name"]["text"]);
                });
            }
            if (e.name) {
                module.enumDeclarations.push({name: e.name.text, members: members});
            }
        }

        var isInterface = x.kind === ts.SyntaxKind.InterfaceDeclaration;
        var isClass = x.kind === ts.SyntaxKind.ClassDeclaration;
        if (!isInterface && !isClass) {
            return;
        }
        var c: ts.ClassDeclaration = <ts.ClassDeclaration>x;
        if (c) {
            var fields: {[n: string]: FieldModel} = {};
            var clazz = classDecl(c.name.text, isInterface);

            if (c.decorators && c.decorators.length) {
                clazz.decorators = c.decorators.map( (el: ts.Decorator) => buildDecorator(el.expression) );
            }

            clazz.moduleName = currentModule;
            module.classes.push(clazz);
            c.members.forEach(x => {
                if (x.kind === ts.SyntaxKind.MethodDeclaration) {
                    var md = <ts.MethodDeclaration>x;
                    var method = buildMethod(md, content, mpth);
                    clazz.methods.push(method);
                    //return;
                }
                var field: ts.PropertyDeclaration = fld.doMatch(x);
                if (field) {
                    var f = buildField(field, mpth);
                    if (f.name === "$") {
                        clazz.annotations = f.annotations;
                    } else {
                        if (f.name.charAt(0) !== "$" || f.name === "$ref") {
                            fields[f.name] = f;
                            clazz.fields.push(f);
                        } else {
                            var targetField = f.name.substr(1);
                            var of = fields[targetField];
                            if (!of) {
                                if (f.name !== "$$") {
                                    //console.log('Overriding annotations for field:'+targetField);
                                    var overridings = clazz.annotationOverridings[targetField];
                                    if (!overridings) {
                                        overridings = [];
                                    }
                                    clazz.annotationOverridings[targetField] = overridings.concat(f.annotations);
                                }
                            } else {
                                of.annotations = f.annotations;
                            }
                        }
                    }
                }
            });
            if (c.typeParameters) {
                c.typeParameters.forEach(x => {
                    clazz.typeParameters.push(x.name["text"]);
                    if (!x.constraint) {
                        clazz.typeParameterConstraint.push(null);
                    } else {
                        clazz.typeParameterConstraint.push(x.constraint["typeName"]["text"]);
                    }
                });
            }
            if (c.heritageClauses) {
                c.heritageClauses.forEach(x => {
                    x.types.forEach(y => {
                        if (x.token === ts.SyntaxKind.ExtendsKeyword) {
                            clazz.extends.push(buildType(y, mpth));
                        } else {
                            if (x.token === ts.SyntaxKind.ImplementsKeyword) {
                                clazz.implements.push(buildType(y, mpth));
                            } else {
                                throw new Error("Unknown token class heritage");
                            }
                        }
                    });
                });
            }
            return tsm.Matching.SKIP;
        }
    });
    return module;
}
function buildField(f: ts.PropertyDeclaration, path: string): FieldModel {
    return {
        name: f.name["text"],
        type: buildType(f.type, path),
        annotations: f.name["text"].charAt(0) === "$" ? buildInitializer(f.initializer) : [],
        valueConstraint: f.name["text"].charAt(0) !== "$" ? buildConstraint(f.initializer) : null,
        optional: f.questionToken != null,
        decorators: (f.decorators && f.decorators.length) ? f.decorators.map((el: ts.Decorator) => buildDecorator(el.expression)) : [],
    };
}

function buildMethod(md: ts.MethodDeclaration, content: any, path: string): MethodModel {
    var aliasName = (<ts.Identifier>md.name).text;
    var text = content.substring(md.pos, md.end);
    var params: ParameterModel[] = [];
    md.parameters.forEach(x => {
        params.push(buildParameter(x, content, path));
    });
    var method = {
        returnType: buildType(md.type, path),
        name: aliasName,
        start: md.pos,
        end: md.end,
        text: text,
        arguments: params
    };
    return method;
}

function buildParameter(f: ts.ParameterDeclaration, content: any, path: string): ParameterModel {

    var text = content.substring(f.pos, f.end);
    return {
        name: f.name["text"],
        start: f.pos,
        end: f.end,
        text: text,
        type: buildType(<ts.TypeNode>f.type, path)
    };
}

function buildConstraint(e: ts.Expression): Constraint {
    if (!e) {
        return null;
    }
    if (e.kind === ts.SyntaxKind.CallExpression) {
        return {
            isCallConstraint: true,
            value: buildAnnotation(e)
        };
    } else {
        return {
            isCallConstraint: false,
            value: parseArg(e)
        };
    }

}
function buildInitializer(i: ts.Expression): Annotation[] {
    if (!i) {
        return [];
    }
    if (i.kind === ts.SyntaxKind.ArrayLiteralExpression) {
        var arr = <ts.ArrayLiteralExpression>i;
        var annotations = [];
        arr.elements.forEach(x => {
            annotations.push(buildAnnotation(x));
        });
        return annotations;
    } else {
        throw new Error("Only Array Literals supported now");
    }
}
function buildAnnotation(e: ts.Expression): Annotation {
    if (e.kind === ts.SyntaxKind.CallExpression) {
        var call: ts.CallExpression = <ts.CallExpression>e;
        var name = parseName(call.expression);
        var a = {
            name: name,
            arguments: []
        };
        call.arguments.forEach(x => {
            a.arguments.push(parseArg(x));
        });
        return a;
    } else {
         throw new Error("Only call expressions may be annotations");
    }
}

function buildDecorator(e: ts.Expression): Decorator {
    if (e.kind === ts.SyntaxKind.CallExpression) {
        var call: ts.CallExpression = <ts.CallExpression>e;
        var name = parseName(call.expression);
        var a = {
            name: name,
            arguments: []
        };
        call.arguments.forEach(x => {
            a.arguments.push(parseArg(x));
        });
        return a;
    } else if (e.kind === ts.SyntaxKind.Identifier) {
      return {
        name: e.escapedText,
        arguments: []
      };
    } else {
         throw new Error("Only call expressions may be annotations");
    }
}
export function parseArg(n: ts.Expression): any {
    if (n.kind === ts.SyntaxKind.StringLiteral) {
        var l: ts.StringLiteral = <ts.StringLiteral>n;

        return l.text;
    }
    if (n.kind === ts.SyntaxKind.NoSubstitutionTemplateLiteral) {
        var ls: ts.LiteralExpression = <ts.LiteralExpression>n;

        return ls.text;
    }
    if (n.kind === ts.SyntaxKind.ArrayLiteralExpression) {
        var arr = <ts.ArrayLiteralExpression>n;
        var annotations = [];
        arr.elements.forEach(x => {
            annotations.push(parseArg(x));
        });
        return annotations;
    }
    if (n.kind === ts.SyntaxKind.TrueKeyword) {
        return true;
    }
    if (n.kind === ts.SyntaxKind.PropertyAccessExpression) {
        var pa = <ts.PropertyAccessExpression>n;
        return parseArg(pa.expression) + "." + parseArg(pa.name);
    }
    if (n.kind === ts.SyntaxKind.Identifier) {
        var ident = <ts.Identifier>n;
        return ident.text;
    }
    if (n.kind === ts.SyntaxKind.FalseKeyword) {
        return false;
    }
    if (n.kind === ts.SyntaxKind.NumericLiteral) {
        var nl: ts.LiteralExpression = <ts.LiteralExpression>n;


        return Number(nl.text);
    }
    if (n.kind === ts.SyntaxKind.BinaryExpression) {
        var bin: ts.BinaryExpression = <ts.BinaryExpression>n;
        if (bin.operatorToken.kind = ts.SyntaxKind.PlusToken) {
            return parseArg(bin.left) + parseArg(bin.right);
        }
    }

    if (n.kind === ts.SyntaxKind.ObjectLiteralExpression) {
        const obj: ts.ObjectLiteralExpression = <ts.ObjectLiteralExpression>n;
        let res: any = null;
        try {
            let jsonString = JSONTransformer.toValidateView(obj);
            return JSON.parse(jsonString);
        } catch (e) {
            throw new Error(`Can't parse string "${obj.getFullText()}" to json`);
        }
    }
    if (n.kind === ts.SyntaxKind.ArrowFunction) {
        //mock for arrow function
        return (<ts.ArrowFunction>n).getText();
    }

    if (n.kind === ts.SyntaxKind.NullKeyword) {
        return n.getText();
    }
    return n.getText();
    //throw new Error("Unknown value in annotation");
}

function parseName(n: ts.Expression): string {
    if (n.kind === ts.SyntaxKind.Identifier) {
        return n["text"];
    }
    if (n.kind === ts.SyntaxKind.PropertyAccessExpression) {
        var m: ts.PropertyAccessExpression = <ts.PropertyAccessExpression>n;
        return parseName(m.expression) + "." + parseName(m.name);
    }
    throw new Error("Only simple identifiers are supported now");
}


function basicType(n: string, path: string): BasicType {
    var namespaceIndex = n.indexOf(".");
    var namespace = namespaceIndex !== -1 ? n.substring(0, namespaceIndex) : "";
    var basicName = namespaceIndex !== -1 ? n.substring(namespaceIndex + 1) : n;

    return {typeName: n, nameSpace: namespace, basicName: basicName, typeKind: TypeKind.BASIC, typeArguments: [], modulePath: path };
}
function arrayType(b: TypeModel): ArrayType {
    return {base: b, typeKind: TypeKind.ARRAY };
}
function unionType(b: TypeModel[]): UnionType {
    return {options: b, typeKind: TypeKind.UNION};
}
export function buildType(t: ts.TypeNode, path: string): TypeModel {
    if (!t) {
        return null;
    }
    if (t.kind === ts.SyntaxKind.StringKeyword) {
        return basicType("string", null);
    }
    if (t.kind === ts.SyntaxKind.NumberKeyword) {
        return basicType("number", null);
    }
    if (t.kind === ts.SyntaxKind.BooleanKeyword) {
        return basicType("boolean", null);
    }
    if (t.kind === ts.SyntaxKind.AnyKeyword) {
        return basicType("any", null);
    }
    if (t.kind === ts.SyntaxKind.VoidKeyword) {
        return basicType("void", null);
    }

    if (t.kind === ts.SyntaxKind.TypeReference) {
        var tr: ts.TypeReferenceNode = <ts.TypeReferenceNode>t;
        var res = basicType(parseQualified(tr.typeName), path);
        if (tr.typeArguments) {
            tr.typeArguments.forEach(x => {
                res.typeArguments.push(buildType(x, path));
            });
        }
        return res;
    }
    if (t.kind === ts.SyntaxKind.ArrayType) {
        var q: ts.ArrayTypeNode = <ts.ArrayTypeNode>t;
        return arrayType(buildType(q.elementType, path));
    }
    if (t.kind === ts.SyntaxKind.UnionType) {
        var ut: ts.UnionTypeNode = <ts.UnionTypeNode>t;
        return unionType(ut.types.map(x => buildType(x, path)));
    }
    if (t.kind === ts.SyntaxKind.ExpressionWithTypeArguments) {
        var tra = <ts.ExpressionWithTypeArguments>t;
        res = basicType(parseQualified2(tra.expression), path);
        if (tra.typeArguments) {
            tra.typeArguments.forEach(x => {
                res.typeArguments.push(buildType(x, path));
            });
        }
        return res;
    } else {
        return basicType("mock", null);
    }
    //throw new Error("Case not supported: " + t.kind);
}
function parseQualified2(n: any): string {
    if (!n.name) {
        return n.text;
    }
   return n.name.text;
}
function parseQualified(n: ts.EntityName): string {
    if (n.kind === ts.SyntaxKind.Identifier) {
        return n["text"];
    } else {
        var q = <ts.QualifiedName>n;
        return parseQualified(q.left) + "." + parseQualified(q.right);
    }
}
