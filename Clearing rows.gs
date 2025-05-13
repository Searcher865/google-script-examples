function onEdit(e) {
  var sheet = e.source.getSheetByName("Оценка"); // Работаем только с листом "Оценка"
  if (!sheet) return;

  var range = e.range;
  var firstRow = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0]; // Заголовки первой строки

  // Ищем столбец с текстом "Тип покрытия"
  var startColumnIndex = firstRow.indexOf("Тип покрытия") + 1; // Ищем индекс столбца "Тип покрытия"
  if (startColumnIndex === 0) return; // Если столбца нет, выходим

  // Проверяем, что изменили чекбокс в нужном столбце и строка не заголовочная
  var clearColumnIndex = firstRow.indexOf("Очистить строку") + 1; // Ищем индекс столбца "Очистить строку"
  if (clearColumnIndex === 0) return; // Если столбца нет, выходим

  if (range.getColumn() == clearColumnIndex && range.getRow() >= 3) {
    var value = range.getValue(); // Чекбокс (true/false)

    if (value === true) {
      var lastColumn = sheet.getLastColumn();
      var targetRange = sheet.getRange(range.getRow(), startColumnIndex, 1, lastColumn - startColumnIndex + 1);

      targetRange.clear(); // Полностью очищаем содержимое и форматирование
      targetRange.clearDataValidations(); // Удаляем выпадающие списки

      range.setValue(false); // Сбрасываем чекбокс обратно в false
    }
  }
}