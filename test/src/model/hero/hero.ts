import {ClassDecorator, ClassDecoratorWithParam}  from "../decorator/decorator";
import {FieldDecorator, FieldDecoratorWithParam, FieldDecoratorWith2Params} from "../decorator/decorator";

@ClassDecorator()
@ClassDecoratorWithParam("HeroDetailClass")
export class HeroDetail {

    public id?: number;

    @FieldDecorator()
    public detail: string;
}

@ClassDecorator()
@ClassDecoratorWithParam("HeroClass")
export class Hero {

    @FieldDecoratorWithParam("int, primary key")
    @FieldDecorator()
    public id: number;

    @FieldDecoratorWith2Params("string", { "required": true, "max-length": 128, "min-length": 5})
    public name: string;


    @FieldDecoratorWithParam("external reference")
    @FieldDecorator()
    public detail: HeroDetail;

    @FieldDecoratorWithParam("array of objects from external reference")
    @FieldDecorator()
    public details: HeroDetail[];

    @FieldDecorator()
    public simpleArray: number[];
}
