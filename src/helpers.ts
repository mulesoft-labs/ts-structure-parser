import model=require("ts-structure-model");
import helperMethodExtractor = require("./helperMethodExtractor");

var ns:{[key:string]:boolean} = {'RamlWrapper':true};

export class HelperMethod{

    constructor(
        public originalName:string,
        public wrapperMethodName:string,
        public returnType:model.TypeModel,
        public args:Arg[],
        public meta:Meta) {

    }
    targetWrappers():string[]{

        var isValid = true;
        var result:string[] = [];
        this.args.forEach(x=>{

            var arr = flatten(x.type,ns);
            if(arr.length==0){
                return;
            }
            if(!isValid || result.length!=0){
                result = [];
                isValid = false;
                return;
            }
            result = result.concat(arr);
        });
        return result;
    }

    callArgs():Arg[]{
        return this.args.map(x=>{
            if(flatten(x.type,ns).length==0){
                return x;
            }
            return {
                name: "this",
                type: null,
                optional: false,
                defaultValue: undefined
            }
        });
    }
}

export interface Arg{

    name:string;

    type:model.TypeModel;
    
    defaultValue: any;
    
    optional: boolean;
}

export interface Meta{

    name?:string

    comment?:string

    override?:boolean

    primary?:boolean

    deprecated?: boolean
}

export function flatten(t:model.TypeModel, namespaces?:{[key:string]:boolean}):string[]{

    if(t.typeKind==model.TypeKind.ARRAY){
        if(namespaces) {
            return [];
        }
        else{
            return [ flatten((<model.ArrayType>t).base)[0]+'[]' ];
        }
    }
    else if(t.typeKind==model.TypeKind.BASIC){
        var bt = (<model.BasicType>t);

        var str = bt.basicName;
        var nameSpace = bt.nameSpace && bt.nameSpace.trim();
        if(nameSpace!=null && nameSpace.length>0 && nameSpace!="RamlWrapper"){
            str = nameSpace + "." + str;
        }
        if(bt.typeArguments && bt.typeArguments.length!=0){
            str += `<${bt.typeArguments.map(x=>flatten(x)).join(', ')}>`
        }
        if(namespaces) {
            if (bt.nameSpace) {
                return namespaces[bt.nameSpace] ? [ str ] : [];
            }
            else{
                return [];
            }
        }
        return [ str ];
    }
    else if (t.typeKind==model.TypeKind.UNION){
        var ut = <model.UnionType>t;
        var result:string[] = [];
        ut.options.forEach(x=>result=result.concat(flatten(x,namespaces)));
        return result;
    }
    return [];
}

export function getHelperMethods(srcPath:string):HelperMethod[]{
    return helperMethodExtractor.getHelperMethods(srcPath);
}