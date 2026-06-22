/**
 * Автоматически загружает и вызывает функции по умолчанию (export default)
 * из всех файлов в указанной директории и её поддиректориях.
 *
 * @param directoryPath Абсолютный путь к папке (например, папка routes, models).
 * @param args          Аргументы, которые будут переданы в каждую функцию при вызове.
 */
export declare function invokeFromDir(
  directoryPath: string,
  ...args: any[]
): Promise<void>;
