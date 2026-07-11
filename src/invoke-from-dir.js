import path from 'node:path';
import fs from 'node:fs/promises';
import {pathToFileURL} from 'node:url';

/**
 * Собирает пути ко всем файлам в указанной директории (без рекурсии).
 *
 * @param   {string} dirPath    Путь к директории.
 * @returns {Promise<string[]>} Массив абсолютных путей к файлам.
 */
async function getFiles(dirPath) {
  const arrayOfFiles = [];
  const entries = await fs.readdir(dirPath, {withFileTypes: true});
  for (const entry of entries) {
    if (entry.isFile()) {
      const fullPath = path.join(dirPath, entry.name);
      arrayOfFiles.push(fullPath);
    }
  }
  return arrayOfFiles;
}

/**
 * Автоматически загружает и вызывает функции по умолчанию (export default)
 * из всех файлов в указанной директории (без поддиректорий).
 *
 * @param   {string} directoryPath Абсолютный путь к папке (например, папка routes, models).
 * @param   {...any} args          Аргументы, которые будут переданы в каждую функцию при вызове.
 * @returns {Promise<void>}
 */
export async function invokeFromDir(directoryPath, ...args) {
  // сбор всех файлов в директории
  const allFiles = await getFiles(directoryPath);
  // фильтрация, остаются только JS файлы,
  // исключаются тесты и маппинги
  const allowedExtensions = ['.js', '.mjs', '.cjs'];
  // *.ts файлы загружать не имеет смысла,
  // node.js все равно не сможет их выполнить
  const validFiles = allFiles.filter(file => {
    const ext = path.extname(file).toLowerCase();
    const isAllowedExt = allowedExtensions.includes(ext);
    const isTestFile = file.endsWith('.test.js') || file.endsWith('.spec.js');
    return isAllowedExt && !isTestFile;
  });
  // сортировка чисел в строках путей по алфавиту
  // для гарантированного порядка выполнения
  // (01-, 02- и т.д.)
  validFiles.sort((a, b) =>
    a.localeCompare(b, undefined, {numeric: true, sensitivity: 'base'}),
  );
  // последовательная загрузка и выполнение файлов
  for (const filePath of validFiles) {
    // преобразование пути в file:// URL
    // (обязательно для работы import() в Windows)
    const fileUrl = pathToFileURL(filePath).href;
    // динамический импорт читает как ESM, так и CJS файлы
    const module = await import(fileUrl);
    // поиск экспорта по умолчанию и проверка, что это функция
    const isFunction = typeof module.default === 'function';
    const isClass = isFunction && /^\s*class\b/.test(module.default.toString());
    if (isFunction && !isClass) {
      // вызов функции и ожидание её завершения (если она асинхронная)
      await module.default(...args);
    }
    // именованные экспорты и файлы
    // без default-функций игнорируются
  }
  // если произошла ошибка (папка не найдена, ошибка внутри файла и т.д.),
  // она пробрасывается выше, чтобы сразу остановить приложение (fail-fast)
}
