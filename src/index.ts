import ts=require("typescript");
export import helpers = require("./helpers");
import tsStructureParser = require("./tsStructureParser");
import { TextRange } from "typescript";

export interface Module{
    classes:ClassModel[]
    imports:{ [name:string]:Module}
    aliases:AliasNode[]
    enumDeclarations:EnumDeclaration[]
    name:string
}
export interface AliasNode{
    name:string;
    type:TypeModel
}
export class EnumDeclaration{
    name:string
    members:string[]
}
export enum TypeKind{
    BASIC,
    ARRAY,
    UNION
}
export interface TypeModel{
    typeKind:TypeKind

}
export interface BasicType extends TypeModel{
    //typeName:string
    nameSpace:string
    basicName:string
    typeName:string
    typeArguments:TypeModel[]
    modulePath:string;
}

export interface ArrayType extends TypeModel{
    base:TypeModel
}

export type Arg=string|number|boolean;

export interface UnionType extends TypeModel{
    options:TypeModel[]
}
export interface Annotation{
    name:string
    arguments:(Arg|Arg[])[];
}


export interface FieldModel extends TextRange{
    name:string
    type:TypeModel
    annotations:Annotation[];
    valueConstraint:Constraint;
    optional:boolean
}
export interface MethodModel extends TextRange{
    name:string
    text:string
    returnType:TypeModel
    arguments:ParameterModel[]
}

export interface ParameterModel extends TextRange{
    name:string
    text:string
    type:TypeModel
}

export interface Constraint{
    isCallConstraint:boolean
    value?:any
}
export interface CallConstraint extends Constraint{
    value:Annotation
}
export interface ValueConstraint extends Constraint{
    value:string|number|boolean
}

export interface ClassModel extends TextRange{

    name:string

    annotations:Annotation[];
    moduleName:string;
    extends:TypeModel[]
    implements:TypeModel[]

    fields:FieldModel[]

    methods:MethodModel[]

    typeParameters:string[]
    typeParameterConstraint:string[]
    isInterface:boolean
    annotationOverridings:{[key:string]:Annotation[]}
}

export function classDecl(clazz:ts.ClassDeclaration,isInteface:boolean, content:string):ClassModel{
    const text = content.substring(clazz.pos, clazz.end);
    let startPos = text.indexOf(' ' + clazz.name.text) + 1;
    
    return {
        name:clazz.name.text,
        methods:[],
        typeParameters:[],
        typeParameterConstraint:[],
        implements:[],
        fields:[],
        isInterface:isInteface,
        annotations:[],
        extends:[],
        moduleName:null,
        annotationOverridings:{},
        pos: clazz.pos + startPos,
        end: clazz.pos + startPos + clazz.name.text.length,
    }
}

export function parseStruct(content:string,modules:{[path:string]:Module},mpth:string):Module{
    return tsStructureParser.parseStruct(content,modules,mpth);
}