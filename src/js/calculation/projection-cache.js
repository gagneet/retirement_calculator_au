export class ProjectionCache {
    constructor() {
        this.cache = new Map();
    }

    get(inputHash) {
        return this.cache.get(inputHash);
    }

    set(inputHash, projection) {
        this.cache.set(inputHash, projection);
        return projection;
    }

    clear() {
        this.cache.clear();
    }
}
