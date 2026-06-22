import path from 'node:path';
import fs from 'node:fs/promises';
import {pathToFileURL} from 'node:url';

/**
 * Рекурсивно собирает пути ко всем файлам в директории.
 *
 * @param   {string}   dirPath      Путь к директории.
 * @param   {string[]} arrayOfFiles Массив для накопления путей (используется при рекурсии).
 * @returns {Promise<string[]>}     Массив абсолютных путей к файлам.
 */
async function getFilesRecursively(dirPath, arrayOfFiles = []) {
  const entries = await fs.readdir(dirPath, {withFileTypes: true});
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      await getFilesRecursively(fullPath, arrayOfFiles);
    } else {
      arrayOfFiles.push(fullPath);
    }
  }
  return arrayOfFiles;
}

/**
 * Автоматически загружает и вызывает функции по умолчанию (export default)
 * из всех файлов в указанной директории и её поддиректориях.
 *
 * @param   {string} directoryPath Абсолютный путь к папке (например, папка routes, models).
 * @param   {...any} args          Аргументы, которые будут переданы в каждую функцию при вызове.
 * @returns {Promise<void>}
 */
export async function invokeFunctionsFromDir(directoryPath, ...args) {
  // рекурсивный сбор всех файлов в директории
  const allFiles = await getFilesRecursively(directoryPath);
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
    const isClass = isFunction && module.default.toString().startsWith('class');
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
