import { GenericExtractor } from './GenericExtractor';
import { AutoScout24Extractor } from './specificsExtractors/AutoScout24Extractor';
import { EbayExtractor } from './specificsExtractors/EbayExtractor';
import { AmazonExtractor } from './specificsExtractors/AmazonExtractor';
// Liste de tous les extracteurs disponibles
// L'ordre est important: les plus spécifiques d'abord
const extractors = [
    new AutoScout24Extractor(),
    new EbayExtractor(),
    new AmazonExtractor(),
    // Toujours mettre l'extracteur générique en dernier
    new GenericExtractor(),
];
/**
 * Trouve l'extracteur approprié pour la source donnée
 * @param source Nom de la source/domaine
 * @returns Extracteur capable de gérer la source
 */
export function getExtractor(source) {
    // Trouver le premier extracteur qui peut gérer cette source
    const extractor = extractors.find(ext => ext.canHandle(source));
    // Si aucun extracteur n'est trouvé, utiliser l'extracteur générique (ne devrait jamais arriver)
    if (!extractor) {
        return new GenericExtractor();
    }
    return extractor;
}
// Exporter aussi les extracteurs individuels
export { GenericExtractor, AutoScout24Extractor, EbayExtractor, AmazonExtractor, };
