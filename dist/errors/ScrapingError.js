export class ScrapingError extends Error {
    constructor(message, options) {
        super(message);
        this.name = 'ScrapingError';
        if (options?.cause) {
            this.cause = options.cause;
        }
    }
}
