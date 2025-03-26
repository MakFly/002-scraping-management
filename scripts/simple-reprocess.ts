import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  log: ['error']
});

async function parseDate(dateStr?: string, daysOffset = 0): Promise<Date> {
  if (!dateStr) {
    const date = new Date();
    if (daysOffset > 0) {
      date.setDate(date.getDate() + daysOffset);
    }
    return date;
  }
  
  try {
    return new Date(dateStr);
  } catch (e) {
    return new Date();
  }
}

async function reprocessJob() {
  try {
    // Récupérer l'historique le plus récent avec le job associé
    const history = await prisma.scrapeJobHistory.findFirst({
      where: { status: 'completed' },
      orderBy: { id: 'desc' },
      include: { job: true }  // Inclure le job pour avoir accès à la source
    });

    if (!history) {
      console.log('Aucun historique de job trouvé');
      return;
    }

    const source = history.job?.source || 'unknown';
    console.log(`Retraitement du job history ${history.id} (source: ${source}) avec ${history.itemsScraped} éléments déclarés`);

    if (!history.results) {
      console.log('Aucun résultat trouvé');
      return;
    }

    // Récupérer les données
    const results = history.results as any;
    
    if (!results.items || !Array.isArray(results.items)) {
      console.log('Pas d\'items trouvés dans les résultats');
      return;
    }

    // Nettoyer les doublons existants avant de traiter les nouvelles données
    console.log('Nettoyage des doublons existants...');
    
    // 1. Récupérer toutes les annonces avec leurs URLs
    const allAds = await prisma.vehicleAd.findMany({
      where: {
        platform: source
      },
      select: {
        id: true,
        url: true,
        externalId: true,
        lastUpdated: true
      },
      orderBy: {
        lastUpdated: 'desc'
      }
    });

    // 2. Identifier les doublons par URL
    const urlMap = new Map<string, string[]>();
    allAds.forEach(ad => {
      if (ad.url) {
        const ids = urlMap.get(ad.url) || [];
        ids.push(ad.id);
        urlMap.set(ad.url, ids);
      }
    });

    // 3. Identifier les doublons par externalId
    const externalIdMap = new Map<string, string[]>();
    allAds.forEach(ad => {
      if (ad.externalId) {
        const ids = externalIdMap.get(ad.externalId) || [];
        ids.push(ad.id);
        externalIdMap.set(ad.externalId, ids);
      }
    });

    // 4. Collecter les IDs à supprimer (garder seulement l'entrée la plus récente)
    const idsToDelete = new Set<string>();
    
    urlMap.forEach((ids, url) => {
      if (ids.length > 1) {
        // Garder le premier ID (le plus récent) et marquer les autres pour suppression
        ids.slice(1).forEach(id => idsToDelete.add(id));
      }
    });

    externalIdMap.forEach((ids, externalId) => {
      if (ids.length > 1) {
        // Garder le premier ID (le plus récent) et marquer les autres pour suppression
        ids.slice(1).forEach(id => idsToDelete.add(id));
      }
    });

    // 5. Supprimer les doublons
    if (idsToDelete.size > 0) {
      const deleteResult = await prisma.vehicleAd.deleteMany({
        where: {
          id: {
            in: Array.from(idsToDelete)
          }
        }
      });
      console.log(`${deleteResult.count} doublons supprimés`);
    } else {
      console.log('Aucun doublon trouvé');
    }
    
    console.log(`Traitement de ${results.items.length} éléments...`);
    
    let successCount = 0;
    let updateCount = 0;
    let errorCount = 0;

    // Récupérer toutes les annonces existantes pour ce job history (après nettoyage des doublons)
    const existingAds = await prisma.vehicleAd.findMany({
      where: {
        platform: source
      }
    });

    // Créer un Map pour un accès rapide aux annonces existantes
    const existingAdsMap = new Map(
      existingAds.map(ad => [ad.url, ad])
    );
    
    for (const item of results.items) {
      try {
        const url = item.url || '';
        const existingAd = existingAdsMap.get(url);

        // Générer un ID cohérent
        const testId = `vehicle_${history.id}_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
        
        // Extraire les informations de localisation selon la source
        const locationData = (() => {
          // Structure pour Leboncoin
          if (item.metadata?.location) {
            return {
              city: item.metadata.location.city || '',
              postalCode: item.metadata.location.zipcode || '',
              region: item.metadata.location.region_name || '',
              department: item.metadata.location.department_name || '',
              latitude: item.metadata.location.lat || null,
              longitude: item.metadata.location.lng || null
            };
          }
          
          // Structure directe (AutoScout24 et autres)
          if (item.location) {
            return {
              city: item.location.city || '',
              postalCode: item.location.postalCode || '',
              region: item.location.region || '',
              department: item.location.department || '',
              latitude: item.location.latitude || item.location.lat || null,
              longitude: item.location.longitude || item.location.lng || null
            };
          }
          
          // Structure par défaut si aucune donnée de localisation
          return {
            city: '',
            postalCode: '',
            region: '',
            department: '',
            latitude: null,
            longitude: null
          };
        })();
        
        // Préparer l'objet avec tous les champs requis
        const vehicleData = {
          id: existingAd ? existingAd.id : testId,
          scrapeJobHistoryId: history.id,
          platform: item.platform || source,
          url: item.url || '',
          externalId: item.metadata?.list_id?.toString() || item.id?.toString() || testId,
          title: item.metadata?.subject || item.title || '',
          description: item.metadata?.body || item.description || '',
          price: Array.isArray(item.metadata?.price) ? item.metadata.price[0] || 0 : 
                 typeof item.price === 'number' ? item.price : 
                 typeof item.metadata?.price_cents === 'number' ? Math.floor(item.metadata.price_cents / 100) : 0,
          
          // Location
          ...locationData,
          
          // Vehicle
          brand: item.metadata?.attributes?.find((attr: any) => attr.key === 'brand')?.value || 
                 item.metadata?.attributes?.find((attr: any) => attr.key === 'u_car_brand')?.value || 
                 item.vehicle?.brand || item.brand || '',
          model: item.metadata?.attributes?.find((attr: any) => attr.key === 'model')?.value || 
                 item.metadata?.attributes?.find((attr: any) => attr.key === 'u_car_model')?.value?.split('_')[1] || 
                 item.vehicle?.model || item.model || '',
          version: item.metadata?.attributes?.find((attr: any) => attr.key === 'u_car_version')?.value || 
                   item.vehicle?.version || item.version || '',
          year: parseInt(item.metadata?.attributes?.find((attr: any) => attr.key === 'regdate')?.value) || 
                item.vehicle?.year || item.year || 0,
          mileage: parseInt(item.metadata?.attributes?.find((attr: any) => attr.key === 'mileage')?.value) || 
                   item.vehicle?.mileage || item.mileage || 0,
          fuel: (() => {
            // Si on a des attributs Leboncoin
            if (item.metadata?.attributes) {
              const fuelValue = item.metadata.attributes.find((attr: any) => attr.key === 'fuel')?.value;
              const fuelMap: { [key: string]: string } = {
                '1': 'Essence',
                '2': 'Diesel',
                '3': 'GPL',
                '4': 'Électrique',
                '5': 'Hybride',
                '6': 'Autre'
              };
              if (fuelValue && fuelMap[fuelValue]) {
                return fuelMap[fuelValue];
              }
            }
            
            // Sinon, utiliser les valeurs directes
            return item.vehicle?.fuel || item.fuel || '';
          })(),
          transmission: (() => {
            // Si on a des attributs Leboncoin
            if (item.metadata?.attributes) {
              const gearboxValue = item.metadata.attributes.find((attr: any) => attr.key === 'gearbox')?.value;
              const gearboxMap: { [key: string]: string } = {
                '1': 'Manuelle',
                '2': 'Automatique'
              };
              if (gearboxValue && gearboxMap[gearboxValue]) {
                return gearboxMap[gearboxValue];
              }
            }
            
            // Sinon, utiliser les valeurs directes
            return item.vehicle?.transmission || item.transmission || '';
          })(),
          fiscalPower: parseInt(item.metadata?.attributes?.find((attr: any) => attr.key === 'horsepower')?.value) || 
                      item.vehicle?.power?.fiscal || item.fiscalPower || 0,
          dinPower: parseInt(item.metadata?.attributes?.find((attr: any) => attr.key === 'horse_power_din')?.value) || 
                    item.vehicle?.power?.din || item.dinPower || 0,
          color: item.metadata?.attributes?.find((attr: any) => attr.key === 'vehicule_color')?.value_label || 
                 item.vehicle?.color || item.color || '',
          doors: parseInt(item.metadata?.attributes?.find((attr: any) => attr.key === 'doors')?.value) || 
                 item.vehicle?.doors || item.doors || 0,
          seats: parseInt(item.metadata?.attributes?.find((attr: any) => attr.key === 'seats')?.value) || 
                 item.vehicle?.seats || item.seats || 0,
          inspectionValidUntil: item.metadata?.attributes?.find((attr: any) => 
            attr.key === 'vehicle_technical_inspection_a')?.value || 
            item.vehicle?.technicalInspection?.validUntil || '',
          features: (() => {
            // Si on a des attributs Leboncoin
            if (item.metadata?.attributes) {
              const specs = item.metadata.attributes.find((attr: any) => 
                attr.key === 'vehicle_interior_specs')?.values || [];
              if (specs.length > 0) return specs;
            }
            
            // Sinon, utiliser les valeurs directes
            return item.vehicle?.features || item.features || [];
          })(),
          condition: (() => {
            // Si on a des attributs Leboncoin
            if (item.metadata?.attributes) {
              const damage = item.metadata.attributes.find((attr: any) => 
                attr.key === 'vehicle_damage')?.value;
              if (damage === 'undamaged') return 'excellent';
            }
            
            // Sinon, utiliser les valeurs directes
            return item.vehicle?.condition || item.condition || 'unknown';
          })(),
          
          // Images
          imageUrls: item.metadata?.images?.urls || 
                    item.images?.urls || 
                    (Array.isArray(item.images) ? item.images : []) || [],
          thumbnail: item.metadata?.images?.small_url || 
                    item.metadata?.images?.thumb_url || 
                    item.images?.thumbnail || 
                    item.thumbnail || null,
          
          // Seller
          sellerName: item.metadata?.owner?.name || item.seller?.name || item.sellerName || '',
          sellerType: item.metadata?.owner?.type || item.seller?.type || item.sellerType || 'unknown',
          hasPhone: Boolean(item.metadata?.has_phone || item.seller?.phone || item.hasPhone || false),
          
          // Metadata
          publishedAt: await parseDate(item.metadata?.first_publication_date || item.metadata?.publishedAt || item.publishedAt),
          expiresAt: await parseDate(item.metadata?.expiration_date || item.metadata?.expiresAt || item.expiresAt, 30),
          status: item.metadata?.status || item.status || 'active',
          category: 'car',
          lastUpdated: await parseDate(item.metadata?.index_date || item.metadata?.lastUpdated || item.lastUpdated)
        };

        if (existingAd) {
          // Mettre à jour l'annonce existante
          await prisma.vehicleAd.update({
            where: { id: existingAd.id },
            data: vehicleData
          });
          updateCount++;
        } else {
          // Créer une nouvelle annonce
          await prisma.vehicleAd.create({
            data: vehicleData
          });
          successCount++;
        }

        if ((successCount + updateCount) % 10 === 0 || (successCount + updateCount) === results.items.length) {
          console.log(`Progression : ${successCount + updateCount}/${results.items.length} annonces traitées`);
        }
      } catch (error) {
        errorCount++;
        console.error(`Erreur lors du traitement de l'item: ${error}`);
      }
    }

    console.log('\n📊 Résultats du traitement:');
    console.log(`- Total traité: ${results.items.length}`);
    console.log(`- Nouvelles annonces: ${successCount}`);
    console.log(`- Mises à jour: ${updateCount}`);
    console.log(`- Erreurs: ${errorCount}`);
    
    // Vérifier le résultat final
    const finalCount = await prisma.vehicleAd.count({
      where: { scrapeJobHistoryId: history.id }
    });
    
    console.log(`Nombre final d'annonces en base: ${finalCount}`);
    
  } catch (error) {
    console.error('Erreur générale:', error);
  } finally {
    await prisma.$disconnect();
  }
}

reprocessJob(); 