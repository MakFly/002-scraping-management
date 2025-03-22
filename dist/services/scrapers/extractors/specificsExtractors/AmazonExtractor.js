import { BaseExtractor } from '../BaseExtractor';
/**
 * Extracteur spécifique pour Amazon
 */
export class AmazonExtractor extends BaseExtractor {
    /**
     * Vérifie si la source est Amazon
     */
    canHandle(source) {
        return source.includes('amazon');
    }
    /**
     * Construit l'URL de recherche spécifique à Amazon
     */
    buildUrl(domain, query = '', page = 1, job) {
        // Construire l'URL de base
        const baseUrl = `https://${domain}`;
        // Format spécifique pour Amazon
        const url = `${baseUrl}/s?k=${encodeURIComponent(query)}`;
        return page > 1 ? `${url}&page=${page}` : url;
    }
    /**
     * Extrait les éléments spécifiques à Amazon
     */
    async extractItems(page, selectors) {
        return page.evaluate((selectors) => {
            const items = [];
            // Trouver tous les conteneurs de produits
            const containers = document.querySelectorAll(selectors.container);
            containers.forEach((container) => {
                const item = {};
                // Extraction du titre
                if (selectors.title) {
                    const titleElement = container.querySelector(selectors.title);
                    if (titleElement) {
                        item.title = titleElement.textContent?.trim();
                    }
                }
                // Extraction du prix
                if (selectors.price) {
                    const priceElement = container.querySelector(selectors.price);
                    if (priceElement) {
                        const priceText = priceElement.textContent?.trim();
                        if (priceText) {
                            // Nettoyage du prix
                            const cleaned = priceText.replace(/[^\d.,]/g, '').trim();
                            const normalized = cleaned.replace(',', '.');
                            // Tentative de conversion en nombre
                            const number = parseFloat(normalized);
                            item.price = isNaN(number) ? priceText : number;
                        }
                    }
                }
                // Extraction de l'URL
                if (selectors.url) {
                    const urlElement = container.querySelector(selectors.url);
                    if (urlElement && urlElement instanceof HTMLAnchorElement) {
                        item.url = urlElement.href;
                    }
                }
                // Extraction de l'image
                if (selectors.image) {
                    const imgElement = container.querySelector(selectors.image);
                    if (imgElement && imgElement instanceof HTMLImageElement) {
                        item.image = imgElement.src || imgElement.dataset.src;
                        // Amazon utilise souvent data-image-latency
                        if (!item.image && imgElement.getAttribute('data-image-latency')) {
                            item.image = imgElement.getAttribute('data-image-latency') || '';
                        }
                    }
                }
                // Extraction de la description
                if (selectors.description) {
                    const descElement = container.querySelector(selectors.description);
                    if (descElement) {
                        item.description = descElement.textContent?.trim();
                    }
                }
                // Extraction des avis
                if (selectors.rating) {
                    const ratingElement = container.querySelector(selectors.rating);
                    if (ratingElement) {
                        // Récupération du texte ou de l'attribut aria-label qui contient souvent la note
                        const ratingText = ratingElement.getAttribute('aria-label') || ratingElement.textContent?.trim();
                        if (ratingText) {
                            // Extraction du nombre avec regex
                            const ratingMatch = ratingText.match(/(\d+[.,]?\d*)/);
                            if (ratingMatch) {
                                item.rating = parseFloat(ratingMatch[1].replace(',', '.'));
                            }
                            else {
                                item.rating = ratingText;
                            }
                        }
                    }
                }
                // Ne garder que les éléments qui ont au moins l'URL ou le titre
                if (item.url || item.title) {
                    items.push(item);
                }
            });
            return items;
        }, selectors);
    }
}
