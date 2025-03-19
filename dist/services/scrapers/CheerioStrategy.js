import * as cheerio from 'cheerio';
import { ScraperType } from '../../types/Scraper';
import { logger } from '../../config/logger';
import { domainRegistry } from './DomainRegistry';
/**
 * Stratégie de scraping utilisant Cheerio pour le HTML statique
 * Optimisée pour les sites sans JavaScript complexe
 */
export class CheerioStrategy {
    constructor(options = {}) {
        this.options = {
            timeout: 10000,
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
            retries: 2,
            ...options
        };
    }
    getType() {
        return ScraperType.CHEERIO;
    }
    /**
     * Effectue le scraping avec Cheerio
     */
    async scrape(job) {
        const startTime = Date.now();
        logger.info(`Début du scraping avec Cheerio pour ${job.source}`);
        try {
            // Récupérer la configuration du domaine
            const domainConfig = domainRegistry.getConfig(job.source);
            if (!domainConfig) {
                throw new Error(`Aucune configuration trouvée pour le domaine: ${job.source}`);
            }
            // Déterminer le nombre de pages à scraper
            const pageCount = job.pageCount || 1;
            let allItems = [];
            let pageTitle = '';
            // Itérer sur les pages
            for (let currentPage = 1; currentPage <= pageCount; currentPage++) {
                // Construire l'URL avec paramètre de page si nécessaire
                const url = this.buildUrl(job.source, job.query || '', currentPage, job);
                logger.info(`Scraping de la page ${currentPage}/${pageCount} pour ${job.source}: ${url}`);
                // Récupérer le HTML
                const response = await fetch(url, {
                    headers: {
                        'User-Agent': this.options.userAgent || '',
                        'Accept': 'text/html,application/xhtml+xml,application/xml',
                        'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7',
                        'Cache-Control': 'no-cache',
                        'Pragma': 'no-cache',
                    },
                    timeout: this.options.timeout,
                });
                if (!response.ok) {
                    throw new Error(`Échec de la requête: ${response.status} ${response.statusText}`);
                }
                const html = await response.text();
                // Charger le HTML avec Cheerio
                const $ = cheerio.load(html);
                // Capture le titre de la page seulement sur la première page
                if (currentPage === 1) {
                    pageTitle = $('title').text().trim();
                }
                // Traitement spécial pour eBay
                if (job.source.includes('ebay')) {
                    const items = this.extractEbayItems($, domainConfig.selectors);
                    allItems = [...allItems, ...items];
                }
                else {
                    // Extraction standard pour les autres sites
                    const items = this.extractItems($, domainConfig.selectors);
                    allItems = [...allItems, ...items];
                }
                // Si c'est la dernière page, on sort de la boucle
                if (currentPage === pageCount) {
                    break;
                }
                // Gestion spéciale pour AutoScout24 - on ne cherche pas de bouton suivant, on modifie directement l'URL
                if (job.source.includes('autoscout24')) {
                    // On passe à la page suivante en modifiant l'URL directement
                    logger.info(`AutoScout24: pagination par URL pour la page ${currentPage + 1}`);
                    // Ajouter un petit délai entre les requêtes pour éviter de surcharger le serveur
                    if (currentPage < pageCount) {
                        await new Promise(resolve => setTimeout(resolve, 1500 + Math.random() * 1000));
                    }
                    continue;
                }
                // Pour les autres sites, on cherche un bouton "suivant"
                if (currentPage === pageCount || !domainConfig.selectors.nextPage || !$(domainConfig.selectors.nextPage).length) {
                    break;
                }
                // Ajouter un petit délai entre les requêtes pour éviter de surcharger le serveur
                if (currentPage < pageCount) {
                    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 500));
                }
            }
            // Vérifier si le résultat est exploitable
            if (allItems.length === 0 || this.looksLikeJavaScriptRequired($, html)) {
                logger.warn(`Scraping Cheerio pour ${job.source} n'a pas obtenu de résultats satisfaisants, JavaScript pourrait être requis`);
                return {
                    title: pageTitle,
                    items: allItems,
                    metadata: {
                        source: job.source,
                        query: job.query,
                        timestamp: new Date().toISOString(),
                        scraperUsed: this.getType(),
                        executionTimeMs: Date.now() - startTime,
                        pagesScraped: pageCount
                    }
                };
            }
            logger.info(`Scraping Cheerio terminé pour ${job.source}, ${allItems.length} items trouvés sur ${pageCount} page(s)`);
            return {
                title: pageTitle,
                items: allItems,
                metadata: {
                    source: job.source,
                    query: job.query,
                    timestamp: new Date().toISOString(),
                    scraperUsed: this.getType(),
                    executionTimeMs: Date.now() - startTime,
                    pagesScraped: pageCount
                }
            };
        }
        catch (error) {
            logger.error(`Erreur lors du scraping Cheerio pour ${job.source}: ${error instanceof Error ? error.message : String(error)}`);
            throw error;
        }
    }
    /**
     * Construit l'URL de recherche à partir du domaine et de la requête
     */
    buildUrl(domain, query = '', page = 1, job) {
        // Si le domaine contient déjà http:// ou https://, on l'utilise tel quel
        if (domain.startsWith('http')) {
            // Ajouter le paramètre de recherche si nécessaire
            if (query) {
                const url = new URL(domain);
                url.searchParams.set('q', query);
                if (page > 1) {
                    url.searchParams.set('page', page.toString());
                }
                return url.toString();
            }
            return domain;
        }
        // Pour eBay, s'assurer que le domaine est complet
        if (domain === 'ebay') {
            domain = 'ebay.fr'; // Par défaut on utilise ebay.fr si seulement "ebay" est spécifié
        }
        // Récupérer la configuration du domaine
        const domainConfig = domainRegistry.getConfig(domain);
        // URL spécifique pour AutoScout24 (traitement prioritaire)
        if (domain.includes('autoscout24')) {
            // Pour AutoScout24, la query est optionnelle, on utilise l'URL par défaut si aucune query
            if (!query && domainConfig?.options?.defaultSearchUrl) {
                let defaultUrl = String(domainConfig.options.defaultSearchUrl);
                // Ajouter le code postal et le rayon si fournis
                if (job?.zip) {
                    if (defaultUrl.includes('?')) {
                        defaultUrl += `&zip=${job.zip}`;
                    }
                    else {
                        defaultUrl += `?zip=${job.zip}`;
                    }
                    // Ajouter le rayon de recherche si fourni
                    if (job?.zipr) {
                        defaultUrl += `&zipr=${job.zipr}`;
                    }
                }
                // Si on doit paginer, remplacer le paramètre de page
                if (page > 1) {
                    return defaultUrl.replace(/([&?])page=\d+/, `$1page=${page}`);
                }
                logger.info(`Utilisation de l'URL par défaut pour AutoScout24: ${defaultUrl}`);
                return defaultUrl;
            }
            // Si une query est fournie, l'ajouter à l'URL
            const baseUrl = `https://${domain}`;
            if (query) {
                let url = `${baseUrl}/lst?q=${encodeURIComponent(query)}`;
                // Ajouter les paramètres de localisation si fournis
                if (job?.zip) {
                    url += `&zip=${job.zip}`;
                    if (job?.zipr) {
                        url += `&zipr=${job.zipr}`;
                    }
                }
                // Ajouter le numéro de page
                if (page > 1) {
                    url += `&page=${page}`;
                }
                logger.info(`URL de recherche construite pour AutoScout24: ${url}`);
                return url;
            }
            // Si on arrive ici, c'est qu'il n'y a ni query ni defaultSearchUrl
            // On utilise alors la baseUrl depuis la configuration
            if (domainConfig?.options?.baseUrl) {
                logger.info(`Utilisation de baseUrl pour AutoScout24: ${domainConfig.options.baseUrl}`);
                return String(domainConfig.options.baseUrl);
            }
            // Dernier recours: retourner le domaine avec https://
            const fullUrl = `https://www.${domain}/lst`;
            logger.info(`Utilisation de l'URL générée pour AutoScout24: ${fullUrl}`);
            return fullUrl;
        }
        // Sinon, on construit l'URL avec https://
        const baseUrl = `https://${domain}`;
        if (!query) {
            return baseUrl;
        }
        // Pattern pour les URLs de recherche selon le domaine avec pagination
        if (domain.includes('amazon')) {
            const url = `${baseUrl}/s?k=${encodeURIComponent(query)}`;
            return page > 1 ? `${url}&page=${page}` : url;
        }
        else if (domain.includes('ebay')) {
            const url = `${baseUrl}/sch/i.html?_nkw=${encodeURIComponent(query)}`;
            return page > 1 ? `${url}&_pgn=${page}` : url;
        }
        else if (domain.includes('google')) {
            const url = `${baseUrl}/search?q=${encodeURIComponent(query)}`;
            return page > 1 ? `${url}&start=${(page - 1) * 10}` : url;
        }
        // Format générique pour les autres domaines
        const url = `${baseUrl}/search?q=${encodeURIComponent(query)}`;
        return page > 1 ? `${url}&page=${page}` : url;
    }
    /**
     * Extrait les items à partir du HTML en utilisant les sélecteurs du domaine
     */
    extractItems($, selectors) {
        const items = [];
        // Trouver tous les conteneurs d'items
        $(selectors.container).each((i, el) => {
            const item = {};
            // Extraire les différentes données pour chaque item
            if (selectors.title) {
                item.title = $(el).find(selectors.title).first().text().trim();
            }
            if (selectors.description) {
                item.description = $(el).find(selectors.description).first().text().trim();
            }
            if (selectors.price) {
                const priceText = $(el).find(selectors.price).first().text().trim();
                item.price = this.cleanPrice(priceText);
            }
            if (selectors.url) {
                const urlEl = $(el).find(selectors.url).first();
                item.url = urlEl.attr('href');
                // Si l'URL est relative, la rendre absolue
                if (item.url && !item.url.startsWith('http')) {
                    item.url = new URL(item.url, $('base').attr('href') || 'https://' + selectors.domain).toString();
                }
            }
            if (selectors.image) {
                const imgEl = $(el).find(selectors.image).first();
                item.image = imgEl.attr('src') || imgEl.attr('data-src');
            }
            // Vérifier que l'item a au moins un champ non vide
            if (Object.values(item).some(value => value)) {
                items.push(item);
            }
        });
        return items;
    }
    /**
     * Nettoie et normalise une chaîne de prix
     */
    cleanPrice(priceText) {
        // Supprimer les espaces, les caractères de devise et autres caractères non numériques
        const cleaned = priceText.replace(/[^\d.,]/g, '').trim();
        // Remplacer les virgules par des points
        const normalized = cleaned.replace(',', '.');
        // Tenter de convertir en nombre si possible
        const number = parseFloat(normalized);
        return isNaN(number) ? priceText.trim() : number;
    }
    /**
     * Tente de déterminer si la page nécessite JavaScript en fonction de son contenu
     */
    looksLikeJavaScriptRequired($, html) {
        // Vérifier les indicateurs de contenu généré par JavaScript
        const hasReactOrVue = html.includes('__NEXT_DATA__') ||
            html.includes('__NUXT__') ||
            html.includes('window.__INITIAL_STATE__') ||
            html.includes('id="app"') && $('[id="app"]').children().length === 0;
        // Rechercher des textes qui indiquent que JavaScript est nécessaire
        const jsRequiredText = html.includes('enable JavaScript') ||
            html.includes('JavaScript is required') ||
            html.includes('Please enable JavaScript');
        // Vérifier si la page semble vide ou n'a que des éléments de base
        const pageIsEmpty = $('body').children().length < 5 ||
            ($('body').text().trim().length < 100 && $('script').length > 5);
        return hasReactOrVue || jsRequiredText || pageIsEmpty;
    }
    /**
     * Extraction spéciale pour eBay avec des sélecteurs optimisés
     */
    extractEbayItems($, selectors) {
        const items = [];
        // Pour eBay, nous devons chercher les éléments parents
        const containers = $('.s-item');
        containers.each((i, el) => {
            const item = {};
            // Titre
            if (selectors.title) {
                item.title = $(el).find(selectors.title).first().text().trim();
            }
            // Prix avec nettoyage pour eBay
            if (selectors.price) {
                const priceText = $(el).find(selectors.price).first().text().trim();
                item.price = this.cleanPrice(priceText);
            }
            // URL (lien direct vers le produit)
            if (selectors.url) {
                const urlEl = $(el).find(selectors.url).first();
                item.url = urlEl.attr('href');
            }
            // Image
            if (selectors.image) {
                const imgEl = $(el).find(selectors.image).first();
                // eBay charge souvent les images via srcset ou data-src
                item.image = imgEl.attr('src') || imgEl.attr('data-src') || imgEl.attr('srcset')?.split(' ')[0];
            }
            // Ne garder que les éléments qui ont au moins l'URL ou le titre
            if (item.url || item.title) {
                items.push(item);
            }
        });
        return items;
    }
}
// Exporter une instance par défaut
export const cheerioStrategy = new CheerioStrategy();
