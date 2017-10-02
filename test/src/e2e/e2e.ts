"use strict";

import * as fs from "fs";
import {} from "mocha";

import {Module} from "../../../index" ;
import {parseStruct} from "../../../src/tsStructureParser";
import {expect} from "chai";


describe("E2E Tests", () => {

      it("Hero", (done) => {
        let filePath: string = "./test/src/model/hero/hero.ts";
        let structPath: string = "./test/src/model/hero/hero.json";

        let decls = fs.readFileSync(filePath).toString();
        let parsedStructure: Module = parseStruct(decls, {}, filePath);
        let expectedStruct: any = JSON.parse(fs.readFileSync(structPath, "utf8"));

          //console.log(JSON.stringify(parsedStructure));

          expect(parsedStructure).be.deep.equal(expectedStruct);

          done();
      });

});
