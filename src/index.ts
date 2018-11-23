export import helpers = require("./helpers");
import tsStructureParser = require("./tsStructureParser");
import model = require("ts-structure-model")

export function parseStruct(content:string,modules:{[path:string]:model.Module},mpth:string):model.Module{
    return tsStructureParser.parseStruct(content,modules,mpth);
}