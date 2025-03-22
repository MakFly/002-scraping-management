/**
 * Extracteur de base avec implémentations partagées
 */
export class BaseExtractor {
    /**
     * Construit l'URL de recherche
     * Implémentation par défaut qui peut être surchargée par les sous-classes
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
        // Format générique pour les domaines
        const baseUrl = `https://${domain}`;
        const url = `${baseUrl}/search?q=${encodeURIComponent(query)}`;
        return page > 1 ? `${url}&page=${page}` : url;
    }
    /**
     * Gestion par défaut de la pagination
     * Retourne false pour indiquer que la logique par défaut doit être appliquée
     */
    handlePagination(currentPage, pageCount, job) {
        return false; // Pas de traitement spécial, utiliser la logique par défaut
    }
    /**
     * Utilitaire pour nettoyer et convertir un texte de prix en nombre
     */
    cleanPrice(priceText) {
        if (!priceText)
            return '';
        // Nettoyage du prix
        const cleaned = priceText.replace(/[^\d.,]/g, '').trim();
        const normalized = cleaned.replace(',', '.');
        // Tentative de conversion en nombre
        const number = parseFloat(normalized);
        return isNaN(number) ? priceText : number;
    }
}
