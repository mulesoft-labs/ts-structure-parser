export class JSONTransformer {
    public static unique(arr: string[]): string[] {
        let obj = {};
        for (var i = 0; i < arr.length; i++) {
          var str = arr[i];
          obj[str] = true;
        }
        return Object.keys(obj);
    }

    public static toValidateView( obj: any ): string {
        let  jsonString = obj.getFullText().split("\'").join("\"");
        let matches = jsonString.match(/ [\w]+.[\w]+\(\)/);
        if (matches && matches.length) {
            matches.forEach(match => {
                jsonString = jsonString.replace(match, `"${match}"`);
            });
        }
        let regExp = /: ?[a-zA-Z]\w+(\.\w+)?/g;
        let m = jsonString.match(regExp);
        if ( m ) {
            m = m.map(item => {
                return (<string>item).substring(1).trim();
            });
            m = JSONTransformer.unique(m);
            m.forEach(match => {
                let re = new RegExp(match + "[ ,}]?", "g");
                if (!(match === "true" || match === "false")) {
                    jsonString = jsonString.replace(re, `"${match}"`);
                    let spaceReg = /" ?(\r?\n?\s+?)?"/g;
                    jsonString = jsonString.replace(spaceReg, `","`);
                    if (jsonString[jsonString.length - 1] !== "}") {
                        jsonString = jsonString + "}";
                    }
                }
            });
        }
        return jsonString;
    }
}