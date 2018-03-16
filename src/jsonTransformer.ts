export class JSONTransformer {
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
            m.forEach(match => {
                let innerReg = /[a-zA-Z]\w+(\.\w+)?/;
                let innerMatch = innerReg.exec(match)[0];
                let re = new RegExp(innerMatch + "[ ,}]", "");
                if (!(innerMatch === "true" || innerMatch === "false")) {
                    jsonString = jsonString.replace(re, `"${innerMatch}"`);
                    let spaceReg = /" ?(\r?\n?\s+?)?"/g;
                    jsonString = jsonString.replace(spaceReg, `","`);
                    if (jsonString[jsonString.length - 1 ] !== "}") {
                        jsonString = jsonString + "}";
                    }
                }
            });
        }
        return jsonString;
    }
}