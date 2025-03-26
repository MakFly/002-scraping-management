export interface UnifiedVehicleAd {
  // Identifiants et liens
  id: string;                    // ID unique de l'annonce
  platform: string;              // 'leboncoin' | 'autoscout24' | 'lacentrale'
  url: string;                   // URL de l'annonce
  externalId: string;            // ID original de la plateforme

  // Informations de base
  title: string;                 // Titre de l'annonce
  description: string;           // Description complète
  price: number;                 // Prix en euros

  // Localisation
  location: {
    city: string;
    postalCode: string;
    region: string;
    department: string;
    coordinates?: {
      lat: number;
      lng: number;
    };
  };

  // Informations du véhicule
  vehicle: {
    brand: string;               // Marque
    model: string;               // Modèle
    version: string;             // Version/finition
    year: number;                // Année de mise en circulation
    mileage: number;             // Kilométrage
    fuel: string;                // Type de carburant
    transmission: string;        // Type de transmission
    power: {
      fiscal: number;           // Puissance fiscale
      din: number;              // Puissance DIN
    };
    color: string;              // Couleur
    doors: number;              // Nombre de portes
    seats: number;              // Nombre de places
    technicalInspection: {      // Contrôle technique
      validUntil: string;
    };
    features: string[];         // Liste des équipements
    condition: string;          // État du véhicule
  };

  // Images
  images: {
    urls: string[];             // URLs des images
    thumbnail?: string;         // URL de la miniature principale
  };

  // Informations du vendeur
  seller: {
    name: string;
    type: 'private' | 'professional';
    phone?: boolean;            // Si le vendeur a un numéro de téléphone
  };

  // Métadonnées
  metadata: {
    publishedAt: string;        // Date de publication
    expiresAt: string;          // Date d'expiration
    status: string;             // Statut de l'annonce
    category: string;           // Catégorie du véhicule
    lastUpdated: string;        // Dernière mise à jour
  };
}

// Types pour les différentes plateformes
export type Platform = 'leboncoin' | 'autoscout24' | 'lacentrale';

// Interface pour les résultats de scraping
export interface ScrapedData {
  items: UnifiedVehicleAd[];
  metadata: {
    source: string;
    query?: string;
    timestamp: string;
    scraperUsed: string;
    executionTimeMs: number;
    pagesScraped: number;
  };
} 