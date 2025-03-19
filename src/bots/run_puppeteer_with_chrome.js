const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const COOKIES_PATH = path.join(__dirname, 'amazon_cookies.json');
const PRODUCT_URL = 'https://www.amazon.fr/stores/page/E358DF15-12CA-4A1A-82D8-0A3D61D3E0A9?ingress=2&visitId=dfc8fb36-4c80-4593-b7e7-f4396243aeee&store_ref=bl_ast_dp_brandLogo_sto&ref_=ast_bln';

// Fonction pour attendre un délai donné (remplacement de waitForTimeout)
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Fonction pour scraper les URLs des produits
async function scrapeProductURLs(page) {
  console.log('Scraping des URLs de produits sur:', PRODUCT_URL);
  await page.goto(PRODUCT_URL, { waitUntil: 'networkidle2' });
  
  // Accepter les cookies si nécessaire
  try {
    const acceptCookiesButton = await page.$('#sp-cc-accept');
    if (acceptCookiesButton) {
      await acceptCookiesButton.click();
      await delay(1000);
    }
  } catch (error) {
    console.log('Pas de bouton de cookies détecté ou erreur:', error.message);
  }
  
  // Extraire tous les liens de produits (sans filtre initial)
  const productURLs = await page.evaluate(() => {
    const results = [];
    
    // Récupérer tous les liens /dp/ sans filtrage préalable
    const links = Array.from(document.querySelectorAll('a[href*="/dp/"]'));
    console.log(`${links.length} liens avec /dp/ trouvés`);
    
    for (const link of links) {
      const url = link.href;
      const dpMatch = url.match(/\/dp\/([A-Z0-9]{10})/);
      
      if (dpMatch) {
        // Trouver le conteneur du produit
        const productCard = link.closest('.a-carousel-card') || 
                          link.closest('[data-asin]') || 
                          link.parentElement;
        
        let productText = '';
        let imageUrl = '';
        
        // Trouver l'image du produit si elle existe
        const img = link.querySelector('img') || 
                    (productCard && productCard.querySelector('img'));
        
        if (img && img.src) {
          imageUrl = img.src;
        }
        
        if (productCard) {
          productText = productCard.textContent.toLowerCase();
        } else {
          productText = link.textContent.toLowerCase();
        }
        
        // Faire un pré-filtrage des produits non-Pokémon évidents
        if (productText.includes('carte amazon') || 
            productText.includes('gift card') || 
            productText.includes('carte cadeau') || 
            url.includes('/gift-card/')) {
          console.log('Carte cadeau détectée, ignorée:', url);
          continue;
        }
        
        // URL de base du produit
        const baseUrl = `https://www.amazon.fr/dp/${dpMatch[1]}`;
        
        // Ajouter à la liste
        results.push({
          url: baseUrl,
          text: productText,
          image: imageUrl
        });
      }
    }
    
    return results;
  });
  
  console.log(`${productURLs.length} URLs de produits trouvées au total (après pré-filtrage)`);
  
  // Filtrer pour ne garder que les URLs uniques
  const uniqueUrls = [];
  const seenUrls = new Set();
  
  for (const product of productURLs) {
    if (!seenUrls.has(product.url)) {
      seenUrls.add(product.url);
      uniqueUrls.push(product);
    }
  }
  
  console.log(`${uniqueUrls.length} URLs uniques après dédoublonnage`);
  
  // Vérifier chaque URL pour confirmer que c'est bien un produit Pokémon
  console.log('Vérification des URLs...');
  const validatedUrls = await validatePokemonUrls(page, uniqueUrls.map(p => p.url));
  
  return validatedUrls;
}

/**
 * Vérifie que chaque URL mène bien à un produit Pokémon
 * @param {Object} page - L'objet page Puppeteer
 * @param {Array<string>} urls - Liste des URLs à vérifier
 * @returns {Array<string>} - Liste des URLs validées
 */
async function validatePokemonUrls(page, urls) {
  const validUrls = [];
  const invalidUrls = [];
  
  console.log(`Validation de ${urls.length} URLs...`);
  
  for (let i = 0; i < urls.length; i++) {
    const url = urls[i];
    console.log(`Vérification de l'URL ${i+1}/${urls.length}: ${url}`);
    
    try {
      // Naviguer vers l'URL
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      
      // Vérifier si la page contient le mot "Pokemon" ou "Pokémon" ou est un produit pertinent
      const isPokemonProduct = await page.evaluate(() => {
        // Récupérer le titre et la description pour diagnostic
        const title = document.title || '';
        const productTitle = document.querySelector('#productTitle') ? 
                            document.querySelector('#productTitle').textContent : '';
        
        const breadcrumbs = document.querySelector('#wayfinding-breadcrumbs_feature_div') ?
                            document.querySelector('#wayfinding-breadcrumbs_feature_div').textContent : '';
        
        // Exclure les cartes cadeaux explicitement
        if (title.toLowerCase().includes('carte cadeau') || 
            title.toLowerCase().includes('gift card') || 
            productTitle.toLowerCase().includes('carte cadeau') || 
            productTitle.toLowerCase().includes('gift card')) {
          return { 
            valid: false, 
            reason: 'carte-cadeau',
            details: { title, productTitle, breadcrumbs } 
          };
        }
        
        // Chercher dans le titre de la page
        if (title.toLowerCase().includes('pokemon') || title.toLowerCase().includes('pokémon')) {
          return { valid: true, source: 'title', details: { title, productTitle, breadcrumbs } };
        }
        
        // Chercher dans la section du produit
        if (productTitle.toLowerCase().includes('pokemon') || productTitle.toLowerCase().includes('pokémon')) {
          return { valid: true, source: 'productTitle', details: { title, productTitle, breadcrumbs } };
        }
        
        // Vérifier les catégories (breadcrumbs)
        if ((breadcrumbs.toLowerCase().includes('pokemon') || breadcrumbs.toLowerCase().includes('pokémon'))) {
          return { valid: true, source: 'breadcrumbs', details: { title, productTitle, breadcrumbs } };
        }
        
        // Chercher les mots-clés dans le corps de la page
        const description = document.querySelector('#productDescription, #feature-bullets, #aplus');
        const descriptionText = description ? description.textContent.toLowerCase() : '';
        
        if (descriptionText.includes('pokemon') || descriptionText.includes('pokémon')) {
          return { valid: true, source: 'description', details: { title, productTitle, breadcrumbs } };
        }
        
        return { 
          valid: false, 
          reason: 'non-pokemon',
          details: { title, productTitle, breadcrumbs }
        };
      });
      
      if (isPokemonProduct.valid) {
        console.log(`✅ URL valide (${isPokemonProduct.source}): ${url}`);
        validUrls.push({
          url: url,
          validationSource: isPokemonProduct.source,
          title: isPokemonProduct.details.title
        });
      } else {
        console.log(`❌ URL invalide (${isPokemonProduct.reason}): ${url}`);
        console.log(`  Titre: ${isPokemonProduct.details.title}`);
      }
      
      // Petite pause pour ne pas surcharger le serveur
      await delay(1000);
      
    } catch (error) {
      console.error(`Erreur lors de la vérification de ${url}:`, error.message);
    }
  }
  
  console.log('\nRésumé de la validation:');
  console.log(`URLs valides (Pokémon): ${validUrls.length}`);
  console.log(`URLs invalides: ${urls.length - validUrls.length}`);
  
  console.log('\nURLs Pokémon valides:');
  console.table(validUrls.map(item => ({
    url: item.url,
    source: item.validationSource,
    titre: item.title
  })));
  
  // Ne retourner que les URLs validées
  return validUrls.map(item => item.url);
}

/**
 * Mode par défaut : sans connexion, sans scraping
 * 
 * Mode connexion :
 * - Connexion shouldLogin = true
 * - Pas de scraping shouldScrape = false
 * 
 * Mode scraping :
 * - Pas de connexion shouldLogin = false
 * - Scraping shouldScrape = true
 * 
 * Mode connexion + scraping :
 * - Connexion shouldLogin = true
 * - Scraping shouldScrape = true
 */
async function run(options = {}) {
  const { 
    shouldLogin = true,
    shouldScrape = true
  } = options;
  
  // Lancer le navigateur en mode non-headless
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null, // Désactiver le viewport par défaut
    args: ['--start-maximized'], // Démarrer avec une fenêtre maximisée
    executablePath: '/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome'
  });

  // Récupérer les pages existantes au lieu d'en ouvrir une nouvelle
  const pages = await browser.pages();
  const page = pages[0]; // Utiliser le premier onglet déjà ouvert

  // Si on veut scraper sans se connecter
  if (shouldScrape && !shouldLogin) {
    const productURLs = await scrapeProductURLs(page);
    // Si on ne veut pas se connecter, on peut terminer ici
    if (!shouldLogin) {
      // await browser.close();
      return productURLs;
    }
  }

  // Le code de connexion ne s'exécute que si shouldLogin est true
  if (shouldLogin) {
    // Vérifier si on a déjà des cookies sauvegardés
    let hasSavedCookies = false;
    try {
      if (fs.existsSync(COOKIES_PATH)) {
        const cookies = JSON.parse(fs.readFileSync(COOKIES_PATH, 'utf8'));
        await page.setCookie(...cookies);
        hasSavedCookies = true;
        console.log('Cookies chargés avec succès!');
      }
    } catch (error) {
      console.error('Erreur lors du chargement des cookies:', error);
    }

    // Si on a des cookies, aller directement sur Amazon
    if (hasSavedCookies) {
      await page.goto('https://www.amazon.fr/', { waitUntil: 'networkidle2' });
      
      // Vérifier si on est connecté en cherchant l'élément qui indique qu'on est connecté
      const isLoggedIn = await page.evaluate(() => {
        const accountElement = document.querySelector('#nav-link-accountList-nav-line-1');
        return accountElement && !accountElement.textContent.includes('Bonjour, Identifiez-vous');
      });

      if (isLoggedIn) {
        console.log('Connexion réussie avec les cookies!');
        // Si on veut scraper après s'être connecté avec les cookies
        if (shouldScrape) {
          await scrapeProductURLs(page);
        }
        return;
      }
      
      console.log('Les cookies ont expiré, nouvelle connexion nécessaire...');
    }

    // Si les cookies n'existent pas ou sont expirés, faire une connexion normale
    // Page signup
    await page.goto('https://www.amazon.fr/ap/signin?openid.pape.max_auth_age=0&openid.return_to=https%3A%2F%2Fwww.amazon.fr%2F%3Fref_%3Dnav_ya_signin&openid.identity=http%3A%2F%2Fspecs.openid.net%2Fauth%2F2.0%2Fidentifier_select&openid.assoc_handle=frflex&openid.mode=checkid_setup&openid.claimed_id=http%3A%2F%2Fspecs.openid.net%2Fauth%2F2.0%2Fidentifier_select&openid.ns=http%3A%2F%2Fspecs.openid.net%2Fauth%2F2.0');

    // Se connecter à amazon
    await page.type('input[id="ap_email"]', 'kev.aubree@gmail.com');
    await delay(1000);

    // cliquer sur le bouton continue et attendre la navigation
    const navigationPromise1 = page.waitForNavigation({ waitUntil: 'networkidle0' });
    await page.click('input[id="continue"]');
    await navigationPromise1;

    // entrer le mot de passe
    await page.type('input[id="ap_password"]', '@Mplokij1911@!');
    await delay(1000);

    // Cocher "Rester connecté" si disponible
    try {
      const rememberMeCheckbox = await page.$('input[name="rememberMe"]');
      if (rememberMeCheckbox) {
        await rememberMeCheckbox.click();
        console.log('Option "Rester connecté" cochée');
      }
    } catch (error) {
      console.log('Option "Rester connecté" non trouvée');
    }

    // cliquer sur le bouton se connecter et attendre la navigation
    const navigationPromise2 = page.waitForNavigation({ waitUntil: 'networkidle0' });
    await page.click('input[id="signInSubmit"]');
    await navigationPromise2;
    
    // Attendre quelques secondes pour voir si un OTP est demandé
    await delay(3000);
    
    // Vérifier si on est sur la page d'OTP
    const isOtpPage = await page.evaluate(() => {
      return !!document.querySelector('#auth-mfa-otpcode');
    });
    
    if (isOtpPage) {
      console.log('OTP détecté! Veuillez entrer le code manuellement.');
      
      // Attendre que l'utilisateur entre manuellement l'OTP et termine la connexion
      console.log('En attente que la connexion soit terminée...');
      await page.waitForNavigation({ timeout: 120000 }); // 2 minutes d'attente maximum
      
      // Une fois connecté, enregistrer les cookies pour les prochaines fois
      const cookies = await page.cookies();
      fs.writeFileSync(COOKIES_PATH, JSON.stringify(cookies, null, 2));
      console.log('Cookies sauvegardés pour utilisation future!');
    } else {
      console.log('Pas d\'OTP détecté, connexion réussie!');
      
      // Sauvegarder les cookies pour les prochaines connexions
      const cookies = await page.cookies();
      fs.writeFileSync(COOKIES_PATH, JSON.stringify(cookies, null, 2));
      console.log('Cookies sauvegardés pour utilisation future!');
    }
    
    // Si on veut scraper après s'être connecté
    if (shouldScrape) {
      await scrapeProductURLs(page);
    }
  }
  
  // Ne fermez pas le navigateur si vous voulez que la fenêtre reste ouverte
  // await browser.close();
}

// Exécuter la fonction avec les options par défaut (scraper sans se connecter)
run({
  shouldLogin: true, // Mettre à true pour se connecter
  shouldScrape: true  // Mettre à false pour désactiver le scraping
}).catch(console.error);