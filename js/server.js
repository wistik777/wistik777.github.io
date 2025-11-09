// Простой Node.js сервер для записи JSON файлов
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
const DATA_DIR = path.join(__dirname, 'data');

// Создание папки data, если её нет
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Статические файлы
const serveStaticFile = (filePath, res) => {
    const ext = path.extname(filePath);
    const contentType = {
        '.html': 'text/html',
        '.js': 'application/javascript',
        '.css': 'text/css',
        '.json': 'application/json',
        '.svg': 'image/svg+xml'
    }[ext] || 'text/plain';

    fs.readFile(filePath, (err, data) => {
        if (err) {
            res.writeHead(404);
            res.end('File not found');
            return;
        }
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(data);
    });
};

// Сохранение данных в JSON файл
const saveDataToFile = (key, data) => {
    return new Promise((resolve, reject) => {
        const filePath = path.join(DATA_DIR, `${key}.json`);
        fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8', (err) => {
            if (err) {
                reject(err);
            } else {
                resolve();
            }
        });
    });
};

const server = http.createServer((req, res) => {
    // CORS заголовки
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    // API для сохранения данных
    if (req.method === 'POST' && req.url === '/api/save-data') {
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });
        req.on('end', () => {
            try {
                const { key, data } = JSON.parse(body);
                saveDataToFile(key, data)
                    .then(() => {
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ success: true, message: `Данные ${key} успешно сохранены` }));
                    })
                    .catch(err => {
                        res.writeHead(500, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ success: false, error: err.message }));
                    });
            } catch (err) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, error: 'Invalid JSON' }));
            }
        });
        return;
    }

    // Обслуживание статических файлов
    let filePath = path.join(__dirname, req.url === '/' ? 'index.html' : req.url);
    
    // Проверка безопасности (предотвращение выхода за пределы директории)
    if (!filePath.startsWith(__dirname)) {
        res.writeHead(403);
        res.end('Forbidden');
        return;
    }

    // Проверка существования файла
    fs.stat(filePath, (err, stats) => {
        if (err || !stats.isFile()) {
            // Если файл не найден, пробуем index.html
            if (req.url !== '/') {
                filePath = path.join(__dirname, 'index.html');
            } else {
                res.writeHead(404);
                res.end('File not found');
                return;
            }
        }
        serveStaticFile(filePath, res);
    });
});

server.listen(PORT, () => {
    console.log(`Сервер запущен на http://localhost:${PORT}`);
    console.log(`Папка данных: ${DATA_DIR}`);
});

