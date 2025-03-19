import { Logger } from "tslog";
import * as fs from "fs";
import * as path from "path";

// Création du dossier logs s'il n'existe pas
const logDir = path.join(process.cwd(), "logs");
if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir);
}

// Configuration du transport pour écrire dans un fichier
const logToTransport = (logObj: unknown) => {
    fs.appendFileSync(
        path.join(logDir, "app.log"),
        JSON.stringify(logObj) + "\n"
    );
};

// Création et configuration du logger
export const logger = new Logger({
    name: "ScrapeAPI",
    type: "pretty",
    prettyLogTemplate: "{{yyyy}}.{{mm}}.{{dd}} {{hh}}:{{MM}}:{{ss}}:{{ms}}\t{{logLevelName}}\t[{{name}}]\t",
    prettyLogTimeZone: "local",
    minLevel: 2 // 0 = silly, 1 = trace, 2 = debug, 3 = info, 4 = warn, 5 = error, 6 = fatal
});

// Ajout du transport pour l'écriture dans le fichier
logger.attachTransport(logToTransport);