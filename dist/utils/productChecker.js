import puppeteer from 'puppeteer';
import { logger } from '../config/logger';
import { domainRegistry } from '../services/scrapers/DomainRegistry';
/**
 * Classe utilitaire pour vérifier les détails d'un produit
 */
export class ProductChecker {
    constructor() {
        this.browser = null;
    }
    /**
     * Vérifie si un produit spécifique est disponible et les boutons présents sur la page
     */
    async checkProduct(url) {
        logger.info(`Vérification du produit à l'URL: ${url}`);
        let page = null;
        try {
            // Extraire le domaine de l'URL
            const domain = new URL(url).hostname.replace('www.', '');
            // Récupérer la configuration du domaine
            const domainConfig = domainRegistry.getConfig(domain);
            if (!domainConfig) {
                return {
                    url,
                    error: `Aucune configuration trouvée pour le domaine: ${domain}`,
                    message: 'Domaine non supporté'
                };
            }
            // Lancer le navigateur
            if (!this.browser || !this.browser.isConnected()) {
                this.browser = await puppeteer.launch({
                    headless: true,
                    args: [
                        '--no-sandbox',
                        '--disable-setuid-sandbox',
                        '--disable-dev-shm-usage',
                        '--disable-accelerated-2d-canvas',
                        '--disable-gpu',
                        '--window-size=1920,1080',
                    ]
                });
            }
            // Créer une nouvelle page
            page = await this.browser.newPage();
            // Configuration de l'user agent
            await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36');
            // Configurer les en-têtes HTTP
            await page.setExtraHTTPHeaders({
                'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7',
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache',
            });
            // Naviguer vers l'URL
            await page.goto(url, {
                waitUntil: 'networkidle2',
                timeout: 30000
            });
            // Attendre que le contenu principal soit chargé
            await page.waitForSelector('body', { timeout: 5000 });
            // Résultat par défaut
            const result = { url };
            // Extraire les informations du produit
            if (domain.includes('amazon')) {
                // Vérifier le titre du produit
                const titleSelector = domainConfig.selectors.productTitle || domainConfig.selectors.title;
                if (titleSelector) {
                    const titleElement = await page.$(titleSelector);
                    if (titleElement) {
                        result.title = await page.evaluate(el => el.textContent?.trim(), titleElement);
                    }
                }
                // Vérifier le prix
                const priceSelector = domainConfig.selectors.productPrice || domainConfig.selectors.price;
                if (priceSelector) {
                    const priceElement = await page.$(priceSelector);
                    if (priceElement) {
                        result.price = await page.evaluate(el => el.textContent?.trim(), priceElement);
                    }
                }
                // Vérifier si le produit est en stock
                const outOfStockSelector = domainConfig.selectors.outOfStock;
                if (outOfStockSelector) {
                    const outOfStockElement = await page.$(outOfStockSelector);
                    if (outOfStockElement) {
                        const outOfStockText = await page.evaluate(el => el.textContent?.trim(), outOfStockElement);
                        result.inStock = !(outOfStockText && (outOfStockText.toLowerCase().includes('indisponible') ||
                            outOfStockText.toLowerCase().includes('en rupture') ||
                            outOfStockText.toLowerCase().includes('out of stock')));
                    }
                    else {
                        result.inStock = true; // Si l'élément "rupture de stock" n'est pas trouvé, on considère que le produit est en stock
                    }
                }
                // Vérifier le bouton "Ajouter au panier"
                const addToCartSelector = domainConfig.selectors.addToCartButton;
                if (addToCartSelector) {
                    result.canAddToCart = await page.evaluate((selector) => {
                        const button = document.querySelector(selector);
                        return !!button && !button.hasAttribute('disabled');
                    }, addToCartSelector);
                }
                // Vérifier le bouton "Acheter maintenant"
                const buyNowSelector = domainConfig.selectors.buyNowButton;
                if (buyNowSelector) {
                    result.hasBuyNowButton = await page.evaluate((selector) => {
                        const button = document.querySelector(selector);
                        return !!button && !button.hasAttribute('disabled');
                    }, buyNowSelector);
                }
                // Déterminer si le produit est disponible
                result.isAvailable = result.inStock && (result.canAddToCart || result.hasBuyNowButton);
                // Message global
                if (result.isAvailable) {
                    result.message = 'Produit disponible';
                }
                else if (!result.inStock) {
                    result.message = 'Produit en rupture de stock';
                }
                else if (!result.canAddToCart && !result.hasBuyNowButton) {
                    result.message = 'Produit non disponible à l\'achat';
                }
                else {
                    result.message = 'Statut du produit indéterminé';
                }
            }
            return result;
        }
        catch (error) {
            logger.error(`Erreur lors de la vérification du produit: ${error instanceof Error ? error.message : String(error)}`);
            return {
                url,
                error: error instanceof Error ? error.message : String(error),
                message: 'Erreur lors de la vérification du produit'
            };
        }
        finally {
            // Fermer la page
            if (page) {
                await page.close().catch(e => logger.warn(`Erreur lors de la fermeture de la page: ${e}`));
            }
        }
    }
    /**
     * Ferme le navigateur et libère les ressources
     */
    async cleanup() {
        if (this.browser && this.browser.isConnected()) {
            await this.browser.close();
            this.browser = null;
        }
    }
}
// Exporter une instance par défaut
export const productChecker = new ProductChecker();
