export import helpers = require("./helpers");
import tsStructureParser = require("./tsStructureParser");

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


export interface FieldModel{
    name:string
    type:TypeModel
    annotations:Annotation[];
    valueConstraint:Constraint;
    optional:boolean
}
export interface MethodModel{
    start:number
    end:number
    name:string
    text:string
    returnType:TypeModel
    arguments:ParameterModel[]
}

export interface ParameterModel{
    start:number
    end:number
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

export interface ClassModel{

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

export function classDecl(name:string,isInteface:boolean):ClassModel{
    return {
        name:name,
        methods:[],
        typeParameters:[],
        typeParameterConstraint:[],
        implements:[],
        fields:[],
        isInterface:isInteface,
        annotations:[],
        extends:[],
        moduleName:null,
        annotationOverridings:{}
    }
}

export function parseStruct(content:string,modules:{[path:string]:Module},mpth:string):Module{
    return tsStructureParser.parseStruct(content,modules,mpth);
}