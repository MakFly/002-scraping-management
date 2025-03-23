# Guide d'Utilisation

## Français

Ce guide explique comment utiliser l'API de scraping pour créer, gérer et suivre des tâches d'extraction de données.

### Utilisation de l'API REST

#### Créer une Tâche de Scraping

Pour créer une nouvelle tâche de scraping, vous devez envoyer une requête POST avec les paramètres de la source cible.

**Exemple avec curl pour Leboncoin:**

```bash
curl -X POST http://localhost:3000/api/v1/scraping/jobs \
  -H "Content-Type: application/json" \
  -d '{
    "source": "leboncoin",
    "params": {
      "filters": {
        "category": {
          "id": "9"
        },
        "enums": {
          "ad_type": ["offer"]
        },
        "location": {}
      },
      "limit": 35,
      "limit_alu": 3,
      "sort_by": "time",
      "sort_order": "desc",
      "offset": 0,
      "extend": true,
      "listing_source": "direct_search"
    },
    "pagination": 2
  }'
```

**Exemple avec curl pour Autoscout24:**

```bash
curl -X POST http://localhost:3000/api/v1/scraping/jobs \
  -H "Content-Type: application/json" \
  -d '{
    "source": "autoscout24",
    "query": "bmw serie 3",
    "pageCount": 3,
    "zip": "75000",
    "zipr": "100"
  }'
```

**Exemple avec JavaScript (fetch):**

```javascript
const response = await fetch('http://localhost:3000/api/v1/scraping/jobs', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    source: 'ebay',
    query: 'macbook pro',
    pageCount: 2
  }),
});

const data = await response.json();
console.log('Tâche créée avec ID:', data.jobId);
```

#### Lister les Tâches

Pour récupérer la liste des tâches avec pagination:

```javascript
// Premier appel sans curseur
let response = await fetch('http://localhost:3000/api/v1/scraping/jobs?limit=10');
let data = await response.json();

// Récupérer la page suivante en utilisant le curseur
if (data.pageInfo.hasNextPage) {
  response = await fetch(`http://localhost:3000/api/v1/scraping/jobs?cursor=${data.pageInfo.nextCursor}&limit=10`);
  data = await response.json();
}
```

#### Obtenir les Détails d'une Tâche

```javascript
const jobId = 123;
const response = await fetch(`http://localhost:3000/api/v1/scraping/jobs/${jobId}`);
const data = await response.json();

if (data.success) {
  console.log('Détails de la tâche:', data.job);
  
  // Accéder aux résultats si la tâche est terminée
  if (data.job.status === 'completed' && data.job.history.length > 0) {
    const results = data.job.history[0].results;
    console.log(`Nombre d'éléments scraped: ${results.items.length}`);
  }
}
```

#### Exécuter une Tâche

```javascript
const jobId = 123;
const response = await fetch(`http://localhost:3000/api/v1/scraping/jobs/${jobId}/run`, {
  method: 'POST'
});
const data = await response.json();

if (data.success) {
  console.log('Tâche démarrée avec succès');
}
```

### Utilisation des WebSockets

Pour recevoir des mises à jour en temps réel des tâches de scraping:

```javascript
// Assurez-vous d'inclure socket.io-client dans votre projet
import { io } from 'socket.io-client';

// Établir la connexion
const socket = io('http://localhost:3000');

// Écouter les événements généraux
socket.on('job_created', (data) => {
  console.log('Nouvelle tâche créée:', data.jobId);
});

socket.on('job_started', (data) => {
  console.log('Tâche démarrée:', data.jobId);
});

socket.on('job_progress', (data) => {
  console.log(`Progression de la tâche ${data.jobId}: ${data.data.progress}%`);
  console.log(`Éléments scrapés: ${data.data.itemsScraped}`);
});

socket.on('job_completed', (data) => {
  console.log(`Tâche ${data.jobId} terminée avec ${data.data.itemsScraped} éléments`);
});

socket.on('job_failed', (data) => {
  console.error(`Tâche ${data.jobId} échouée:`, data.data.error);
});

// S'abonner aux mises à jour d'une tâche spécifique
function subscribeToJob(jobId) {
  socket.emit('subscribe', { jobId });
  
  // Écouter les événements spécifiques à cette tâche
  socket.on(`job:${jobId}:progress`, (data) => {
    console.log(`Mise à jour de la tâche ${jobId}:`, data);
  });
  
  socket.on(`job:${jobId}:log`, (data) => {
    console.log(`Log de la tâche ${jobId}:`, data.message);
  });
}

// Se désabonner
function unsubscribeFromJob(jobId) {
  socket.emit('unsubscribe', { jobId });
}
```

### Utilisation des Server-Sent Events (SSE)

Pour recevoir un stream d'événements en temps réel:

```javascript
// Créer une connexion SSE
const eventSource = new EventSource('http://localhost:3000/api/v1/scraping/events');

// Écouter tous les événements
eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Événement reçu:', data);
};

// Écouter des types d'événements spécifiques
eventSource.addEventListener('job_created', (event) => {
  const data = JSON.parse(event.data);
  console.log('Nouvelle tâche créée:', data);
});

eventSource.addEventListener('job_progress', (event) => {
  const data = JSON.parse(event.data);
  console.log(`Progression: ${data.data.progress}%`);
});

// Gérer les erreurs
eventSource.onerror = (error) => {
  console.error('Erreur SSE:', error);
  eventSource.close();
};

// Fermer la connexion quand plus nécessaire
function closeEventStream() {
  eventSource.close();
}
```

### Exemple Complet: Exécution et Suivi d'une Tâche

Voici un exemple complet montrant comment créer une tâche, la suivre en temps réel, et récupérer ses résultats:

```javascript
async function scrapAndMonitor(source, query, pageCount) {
  // 1. Créer la tâche
  const createResponse = await fetch('http://localhost:3000/api/v1/scraping/jobs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ source, query, pageCount })
  });
  
  const createData = await createResponse.json();
  const jobId = createData.jobId;
  
  console.log(`Tâche créée avec ID: ${jobId}`);
  
  // 2. Établir connexion WebSocket pour monitoring en temps réel
  const socket = io('http://localhost:3000');
  
  // S'abonner à la tâche spécifique
  socket.emit('subscribe', { jobId });
  
  // Monitorer les progrès
  socket.on(`job:${jobId}:progress`, (data) => {
    const progressBar = '█'.repeat(Math.floor(data.progress / 5)) + '░'.repeat(20 - Math.floor(data.progress / 5));
    console.log(`[${progressBar}] ${data.progress}% - ${data.itemsScraped} éléments`);
  });
  
  // 3. Exécuter la tâche
  const runResponse = await fetch(`http://localhost:3000/api/v1/scraping/jobs/${jobId}/run`, {
    method: 'POST'
  });
  
  // 4. Attendre la complétion de la tâche
  return new Promise((resolve) => {
    socket.on(`job:${jobId}:completed`, async (data) => {
      console.log(`\nTâche terminée avec ${data.itemsScraped} éléments`);
      
      // 5. Récupérer les résultats complets
      const detailsResponse = await fetch(`http://localhost:3000/api/v1/scraping/jobs/${jobId}`);
      const detailsData = await detailsResponse.json();
      
      // Nettoyage
      socket.disconnect();
      
      // Retourner les résultats
      resolve(detailsData.job.history[0].results);
    });
    
    // Gérer les erreurs
    socket.on(`job:${jobId}:failed`, (data) => {
      console.error(`\nLa tâche a échoué: ${data.error}`);
      socket.disconnect();
      resolve(null);
    });
  });
}

// Utilisation
const results = await scrapAndMonitor('ebay', 'macbook pro', 2);
console.log(`Résultats: ${results.items.length} éléments trouvés`);
```

### Bonnes Pratiques

1. **Gestion des Erreurs**
   - Toujours vérifier le champ `success` dans les réponses
   - Implémenter des retries avec backoff exponentiel pour les opérations importantes
   - Prévoir une gestion des timeouts pour les connexions WebSocket et SSE

2. **Optimisation des Performances**
   - Utiliser la pagination pour récupérer de grandes quantités de données
   - Limiter le nombre de pages pour les requêtes de scraping (`pageCount` <= 10)
   - Fermer les connexions WebSocket et SSE quand plus nécessaires

3. **Considérations Éthiques**
   - Respecter les limitations de taux des sites cibles
   - Considérer l'utilisation d'un délai entre les requêtes (`requestDelay`)
   - Ne pas extraire de données personnelles ou protégées

---

## English

This guide explains how to use the scraping API to create, manage, and track data extraction tasks.

### Using the REST API

#### Create a Scraping Task

To create a new scraping task, you need to send a POST request with the parameters for the target source.

**Example with curl for Leboncoin:**

```bash
curl -X POST http://localhost:3000/api/v1/scraping/jobs \
  -H "Content-Type: application/json" \
  -d '{
    "source": "leboncoin",
    "params": {
      "filters": {
        "category": {
          "id": "9"
        },
        "enums": {
          "ad_type": ["offer"]
        },
        "location": {}
      },
      "limit": 35,
      "limit_alu": 3,
      "sort_by": "time",
      "sort_order": "desc",
      "offset": 0,
      "extend": true,
      "listing_source": "direct_search"
    },
    "pagination": 2
  }'
```

**Example with curl for Autoscout24:**

```bash
curl -X POST http://localhost:3000/api/v1/scraping/jobs \
  -H "Content-Type: application/json" \
  -d '{
    "source": "autoscout24",
    "query": "bmw series 3",
    "pageCount": 3,
    "zip": "75000",
    "zipr": "100"
  }'
```

**Example with JavaScript (fetch):**

```javascript
const response = await fetch('http://localhost:3000/api/v1/scraping/jobs', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    source: 'ebay',
    query: 'macbook pro',
    pageCount: 2
  }),
});

const data = await response.json();
console.log('Task created with ID:', data.jobId);
```

#### List Tasks

To retrieve the list of tasks with pagination:

```javascript
// First call without cursor
let response = await fetch('http://localhost:3000/api/v1/scraping/jobs?limit=10');
let data = await response.json();

// Retrieve the next page using the cursor
if (data.pageInfo.hasNextPage) {
  response = await fetch(`http://localhost:3000/api/v1/scraping/jobs?cursor=${data.pageInfo.nextCursor}&limit=10`);
  data = await response.json();
}
```

#### Get Task Details

```javascript
const jobId = 123;
const response = await fetch(`http://localhost:3000/api/v1/scraping/jobs/${jobId}`);
const data = await response.json();

if (data.success) {
  console.log('Task details:', data.job);
  
  // Access results if the task is completed
  if (data.job.status === 'completed' && data.job.history.length > 0) {
    const results = data.job.history[0].results;
    console.log(`Number of scraped items: ${results.items.length}`);
  }
}
```

#### Execute a Task

```javascript
const jobId = 123;
const response = await fetch(`http://localhost:3000/api/v1/scraping/jobs/${jobId}/run`, {
  method: 'POST'
});
const data = await response.json();

if (data.success) {
  console.log('Task started successfully');
}
```

### Using WebSockets

To receive real-time updates on scraping tasks:

```javascript
// Make sure to include socket.io-client in your project
import { io } from 'socket.io-client';

// Establish connection
const socket = io('http://localhost:3000');

// Listen for general events
socket.on('job_created', (data) => {
  console.log('New task created:', data.jobId);
});

socket.on('job_started', (data) => {
  console.log('Task started:', data.jobId);
});

socket.on('job_progress', (data) => {
  console.log(`Task ${data.jobId} progress: ${data.data.progress}%`);
  console.log(`Items scraped: ${data.data.itemsScraped}`);
});

socket.on('job_completed', (data) => {
  console.log(`Task ${data.jobId} completed with ${data.data.itemsScraped} items`);
});

socket.on('job_failed', (data) => {
  console.error(`Task ${data.jobId} failed:`, data.data.error);
});

// Subscribe to updates for a specific task
function subscribeToJob(jobId) {
  socket.emit('subscribe', { jobId });
  
  // Listen for events specific to this task
  socket.on(`job:${jobId}:progress`, (data) => {
    console.log(`Update for task ${jobId}:`, data);
  });
  
  socket.on(`job:${jobId}:log`, (data) => {
    console.log(`Log for task ${jobId}:`, data.message);
  });
}

// Unsubscribe
function unsubscribeFromJob(jobId) {
  socket.emit('unsubscribe', { jobId });
}
```

### Using Server-Sent Events (SSE)

To receive a stream of real-time events:

```javascript
// Create an SSE connection
const eventSource = new EventSource('http://localhost:3000/api/v1/scraping/events');

// Listen for all events
eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Event received:', data);
};

// Listen for specific event types
eventSource.addEventListener('job_created', (event) => {
  const data = JSON.parse(event.data);
  console.log('New task created:', data);
});

eventSource.addEventListener('job_progress', (event) => {
  const data = JSON.parse(event.data);
  console.log(`Progress: ${data.data.progress}%`);
});

// Handle errors
eventSource.onerror = (error) => {
  console.error('SSE error:', error);
  eventSource.close();
};

// Close the connection when no longer needed
function closeEventStream() {
  eventSource.close();
}
```

### Complete Example: Running and Monitoring a Task

Here's a complete example showing how to create a task, track it in real-time, and retrieve its results:

```javascript
async function scrapAndMonitor(source, query, pageCount) {
  // 1. Create the task
  const createResponse = await fetch('http://localhost:3000/api/v1/scraping/jobs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ source, query, pageCount })
  });
  
  const createData = await createResponse.json();
  const jobId = createData.jobId;
  
  console.log(`Task created with ID: ${jobId}`);
  
  // 2. Establish WebSocket connection for real-time monitoring
  const socket = io('http://localhost:3000');
  
  // Subscribe to the specific task
  socket.emit('subscribe', { jobId });
  
  // Monitor progress
  socket.on(`job:${jobId}:progress`, (data) => {
    const progressBar = '█'.repeat(Math.floor(data.progress / 5)) + '░'.repeat(20 - Math.floor(data.progress / 5));
    console.log(`[${progressBar}] ${data.progress}% - ${data.itemsScraped} items`);
  });
  
  // 3. Execute the task
  const runResponse = await fetch(`http://localhost:3000/api/v1/scraping/jobs/${jobId}/run`, {
    method: 'POST'
  });
  
  // 4. Wait for task completion
  return new Promise((resolve) => {
    socket.on(`job:${jobId}:completed`, async (data) => {
      console.log(`\nTask completed with ${data.itemsScraped} items`);
      
      // 5. Retrieve full results
      const detailsResponse = await fetch(`http://localhost:3000/api/v1/scraping/jobs/${jobId}`);
      const detailsData = await detailsResponse.json();
      
      // Cleanup
      socket.disconnect();
      
      // Return results
      resolve(detailsData.job.history[0].results);
    });
    
    // Handle errors
    socket.on(`job:${jobId}:failed`, (data) => {
      console.error(`\nTask failed: ${data.error}`);
      socket.disconnect();
      resolve(null);
    });
  });
}

// Usage
const results = await scrapAndMonitor('ebay', 'macbook pro', 2);
console.log(`Results: ${results.items.length} items found`);
```

### Best Practices

1. **Error Handling**
   - Always check the `success` field in responses
   - Implement retries with exponential backoff for important operations
   - Plan for timeout handling in WebSocket and SSE connections

2. **Performance Optimization**
   - Use pagination to retrieve large amounts of data
   - Limit the number of pages for scraping requests (`pageCount` <= 10)
   - Close WebSocket and SSE connections when no longer needed

3. **Ethical Considerations**
   - Respect rate limitations of target sites
   - Consider using a delay between requests (`requestDelay`)
   - Do not extract personal or protected data 