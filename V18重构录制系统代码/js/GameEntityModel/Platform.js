import { BasePlatform } from "./BasePlatform.js";

export class Platform extends BasePlatform {
    constructor(x, y, w, h, options = {}) {
        super(x, y, w, h, options);
    }
}
