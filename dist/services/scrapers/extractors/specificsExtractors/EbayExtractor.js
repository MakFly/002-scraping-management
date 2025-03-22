import { BaseExtractor } from '../BaseExtractor';
/**
 * Extracteur spécifique pour eBay
 */
export class EbayExtractor extends BaseExtractor {
    /**
     * Vérifie si la source est eBay
     */
    canHandle(source) {
        return source.includes('ebay');
    }
    /**
     * Construit l'URL de recherche spécifique à eBay
     */
    buildUrl(domain, query = '', page = 1, job) {
        // S'assurer que le domaine est complet
        if (domain === 'ebay') {
            domain = 'ebay.fr'; // Par défaut on utilise ebay.fr si seulement "ebay" est spécifié
        }
        // Construire l'URL de base
        const baseUrl = `https://${domain}`;
        // Format spécifique pour eBay
        const url = `${baseUrl}/sch/i.html?_nkw=${encodeURIComponent(query)}`;
        return page > 1 ? `${url}&_pgn=${page}` : url;
    }
    /**
     * Extrait les éléments spécifiques à eBay
     */
    async extractItems(page, selectors) {
        return page.evaluate((selectors) => {
            const items = [];
            // Pour eBay, nous devons chercher les éléments parents
            const containers = document.querySelectorAll('.s-item');
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
                        // eBay utilise souvent srcset ou data-src
                        item.image = imgElement.src || imgElement.dataset.src;
                        // Si srcset est présent, prendre la première URL
                        if (!item.image && imgElement.srcset) {
                            const firstSrc = imgElement.srcset.split(',')[0];
                            if (firstSrc) {
                                item.image = firstSrc.trim().split(' ')[0];
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
