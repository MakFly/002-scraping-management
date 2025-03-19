import { createServer } from 'node:http';
/**
 * Crée un serveur HTTP Node.js qui sert l'application Hono
 */
export const createHttpServer = (app) => {
    const server = createServer(async (req, res) => {
        try {
            // Convertir la requête Node.js en Request Web
            if (!req.url) {
                req.url = '/';
            }
            const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`).toString();
            // Créer les headers de requête
            const headers = new Headers();
            Object.entries(req.headers).forEach(([key, value]) => {
                if (value)
                    headers.set(key, Array.isArray(value) ? value.join(',') : value);
            });
            // Collecter le body si nécessaire
            let body = null;
            if (req.method !== 'GET' && req.method !== 'HEAD') {
                const chunks = [];
                for await (const chunk of req) {
                    chunks.push(Buffer.from(chunk));
                }
                if (chunks.length > 0) {
                    body = Buffer.concat(chunks);
                }
            }
            // Créer l'objet Request
            const request = new Request(url, {
                method: req.method || 'GET',
                headers,
                body
            });
            // Appeler Hono avec la requête
            const response = await app.fetch(request);
            // Écrire la réponse
            res.statusCode = response.status;
            response.headers.forEach((value, key) => {
                res.setHeader(key, value);
            });
            const buffer = await response.arrayBuffer();
            res.end(Buffer.from(buffer));
        }
        catch (error) {
            console.error('Error processing request:', error);
            res.statusCode = 500;
            res.end('Internal Server Error');
        }
    });
    return server;
};
