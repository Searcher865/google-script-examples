
// Функция logToSheet записывает сообщение в первую свободную строку столбца D
function logToTechSheet(message) {
  // Получаем активную таблицу (Spreadsheet)
var ss = SpreadsheetApp.getActiveSpreadsheet();

// Получаем лист "Тех.страница"
var techSheet = ss.getSheetByName("Тех.страница");

// Если лист "Тех.страница" не найден, записываем ошибку в Logger
if (!techSheet) {
  Logger.log('Лист "Тех.страница" не найден');
  return;
}
var lastRow = getLastFilledRow(techSheet, 4); // Ищем последнюю заполненную строку в столбце D
  var logRow = lastRow >= 20 ? lastRow + 1 : 20; // Начинаем логирование с 20-й строки

  // Записываем сообщение и временную метку
  techSheet.getRange(logRow, 4).setValue(message); // В столбец D записываем сам лог
}

// Функция для поиска последней заполненной строки в указанном столбце
function getLastFilledRow(sheet, column) {
  var data = sheet.getRange("D:D").getValues(); // Берем весь столбец D
  for (var i = data.length - 1; i >= 19; i--) { // Ищем с конца, начиная с 20-й строки
    if (data[i][0]) return i + 1; // Возвращаем индекс строки, если ячейка не пустая
  }
  return 19; // Если ничего не нашли, возвращаем 19 (чтобы начать с 20)
}


function clearlogToTechSheet() {
    // Получаем активную таблицу (Spreadsheet)
var ss = SpreadsheetApp.getActiveSpreadsheet();
  // Получаем лист "Тех.страница"
var techSheet = ss.getSheetByName("Тех.страница");
    techSheet.getRange("D20:D").clearContent();
}


