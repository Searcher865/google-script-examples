// function doGet() {
//   return HtmlService.createHtmlOutput('Index');
// }


// function onOpen() {
//   var ui = SpreadsheetApp.getUi();
//   ui.createMenu('📜 Скрипты test-it')
//     .addItem('Создать тест-кейсы', 'showTokenPrompt')
//     .addToUi();
// }

// function showTokenPrompt() {
//   var html = HtmlService.createHtmlOutput(
//     '<p>Введите ваш токен:</p>' +
//     '<input type="password" id="token" />' +
//     '<br><br>' +
//     '<button onclick="submitAndClose()">Выполнить</button>' +
//     '<script>' +
//     'function submitAndClose() {' +
//     '  google.script.run.createTestCasesWithTag(token);' + // Запуск асинхронной функции
//     '  google.script.host.close();' + // Закрытие окна сразу
//     '}' +
//     '</script>'
//   )
//   .setWidth(300)
//   .setHeight(150);
  
//   SpreadsheetApp.getUi().showModalDialog(html, 'Введите токен');
// }

function createTestCasesWithTag() {
// var apiToken = 'TGs5Z3RzYzFINVhBQlBxYThF';
  
  // Получаем активную таблицу (Spreadsheet)
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // Получаем лист "Тех.страница" из таблицы
  var techSheet = ss.getSheetByName("Тех.страница");
  // Если лист "Тех.страница" не найден, выводим сообщение в лог и завершаем выполнение функции
  if (!techSheet) {
    Logger.log('Лист "Тех.страница" не найден');
    return;
  }
  
  // Очищаем все ячейки столбца D, начиная с 20-й строки, чтобы удалить старые логи
  techSheet.getRange("D20:D").clearContent();
  
  // Устанавливаем начальную строку для логирования (начинаем с 20-й строки, столбец D имеет номер 4)
  var logRow = 20;
  
  // // Функция logToTechSheet записывает переданное сообщение в столбец D, начиная с logRow, и затем увеличивает logRow
  // function logToTechSheet(message) {
  //   techSheet.getRange(logRow, 4).setValue(message); // Записываем сообщение в столбец D текущей строки
  //   logRow++; // Увеличиваем счетчик строк для следующего сообщения
  // }
  
  // Считываем значение из ячейки E12 листа "Тех.страница" (ссылка на задачу)
  var trackerValue = techSheet.getRange("E12").getValue().toString().trim();
  // Если значение пустое, логируем сообщение и прекращаем выполнение
  if (!trackerValue) {
    logToTechSheet("Ссылка на задачу не обнаружена");
    return;
  }
  
  // Извлекаем номер задачи в формате "QA-150" (регистронезависимо) из trackerValue
  var match = trackerValue.match(/(QA-\d+)/i);
  // Если номер задачи не найден, логируем сообщение и завершаем функцию
  if (!match) {
    logToTechSheet("Ссылка на задачу не обнаружена");
    return;
  }
  // Приводим найденный номер задачи к верхнему регистру (например, "QA-150")
  var taskNumber = match[1].toUpperCase();
  
  // Считываем projectId из ячейки E14
  var projectId = techSheet.getRange("E14").getValue().toString().trim();
  // Если projectId пустой, логируем сообщение и завершаем выполнение
  if (!projectId) {
    logToTechSheet("projectId не обнаружен");
    return;
  }
  // Считываем parentId из ячейки E15
  var parentId = techSheet.getRange("E15").getValue().toString().trim();
  if (!parentId) {
    logToTechSheet("parentId не обнаружен");
    return;
  }
  // Считываем имя корневого раздела из ячейки E13
  var sectionName = techSheet.getRange("E13").getValue().toString().trim();
  if (!sectionName) {
    logToTechSheet("Название раздела не обнаружено");
    return;
  }
  
  // Получаем лист "Оценка", где находятся данные тест-кейсов и секций
  var sheet = ss.getSheetByName('Оценка');
  
  // Считываем заголовки из первой строки листа "Оценка" (все столбцы)
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  
  // Ищем индекс столбца с заголовком "Очистить строку" в массиве headers
  var clearColumnIndex = -1;
  for (var i = 0; i < headers.length; i++) {
    if (headers[i] === 'Очистить строку') {
      clearColumnIndex = i;
      break;
    }
  }
  // Если столбец "Очистить строку" не найден, логируем сообщение и завершаем выполнение
  if (clearColumnIndex === -1) {
    logToTechSheet('Столбец "Очистить строку" не найден');
    return;
  }
  
  // Определяем индекс столбца "Тип покрытия" среди заголовков
  var typeColumnIndex = -1;
  for (var i = 0; i < headers.length; i++) {
    if (headers[i] === 'Тип покрытия') {
      typeColumnIndex = i;
      break;
    }
  }
  // Если столбец "Тип покрытия" не найден, логируем и выходим
  if (typeColumnIndex === -1) {
    logToTechSheet('Столбец "Тип покрытия" не найден');
    return;
  }
  
  // Определяем индекс столбца "Подготовка к тесту, (минуты)" в заголовках
  var prepColumnIndex = -1;
  for (var i = 0; i < headers.length; i++) {
    if (headers[i] === 'Подготовка к тесту, (минуты)') {
      prepColumnIndex = i;
      break;
    }
  }
  if (prepColumnIndex === -1) { // Если не найден, логируем и завершаем выполнение
    logToTechSheet('Столбец "Подготовка к тесту, (минуты)" не найден');
    return;
  }
  
  // Определяем индекс столбца "Время на один тест, (минуты)" в заголовках
  var testTimeColumnIndex = -1;
  for (var i = 0; i < headers.length; i++) {
    if (headers[i] === 'Время на один тест, (минуты)') {
      testTimeColumnIndex = i;
      break;
    }
  }
  if (testTimeColumnIndex === -1) { // Если не найден, логируем и выходим
    logToTechSheet('Столбец "Время на один тест, (минуты)" не найден');
    return;
  }
  
  // Получаем значения второй строки (строка с названиями браузерных столбцов)
  var secondRowValues = sheet.getRange(2, 1, 1, sheet.getLastColumn()).getValues()[0];
  // Инициализируем переменные для хранения индексов столбцов для Desktop, Tablet и Mobile браузеров
  var desktopColumnIndex = -1, tabletColumnIndex = -1, mobileColumnIndex = -1;
  for (var i = 0; i < secondRowValues.length; i++) {
    if (secondRowValues[i] === "Desktop Браузеры") {
      desktopColumnIndex = i; // Если найден заголовок "Desktop Браузеры", сохраняем его индекс
    } else if (secondRowValues[i] === "Tablet Браузеры") {
      tabletColumnIndex = i; // Если найден "Tablet Браузеры", сохраняем индекс
    } else if (secondRowValues[i] === "Mobile Браузеры") {
      mobileColumnIndex = i; // Если найден "Mobile Браузеры", сохраняем индекс
    }
  }
  // Если какой-либо из столбцов браузеров не найден, логируем сообщение и выходим
  if (desktopColumnIndex === -1) {
    logToTechSheet('Столбец "Desktop Браузеры" не найден');
    return;
  }
  if (tabletColumnIndex === -1) {
    logToTechSheet('Столбец "Tablet Браузеры" не найден');
    return;
  }
  if (mobileColumnIndex === -1) {
    logToTechSheet('Столбец "Mobile Браузеры" не найден');
    return;
  }
  
  // (Опционально) Формируем массив с буквенными обозначениями столбцов от A до столбца перед "Очистить строку"
  var columns = [];
  for (var i = 0; i < clearColumnIndex; i++) {
    var columnLetter = String.fromCharCode(65 + i); // Преобразуем число в букву (A=65)
    columns.push(columnLetter);
  }
  // Логируем список этих столбцов
  logToTechSheet('Список столбцов до "Очистить строку": ' + columns.join(', '));
  
  // --- Создание корневого раздела в test-it ---
  // Вызываем функцию createSection для создания корневого раздела с именем sectionName,
  // projectId и parentId берутся из листа "Тех.страница".
  var rootSectionId = createSection(sectionName, projectId, parentId);
  // Если корневой раздел не создан, логируем и прекращаем выполнение
  if (!rootSectionId) {
    logToTechSheet("Не удалось создать корневой раздел");
    return;
  }
  // Создаем массив currentSections для хранения созданных разделов по уровням
  var currentSections = [];
  // На уровне 0 (первый уровень) устанавливаем корневой раздел
  currentSections[0] = { id: rootSectionId, name: sectionName };
  
  // Инициализируем счетчик пустых строк (если 10 подряд – прекращаем обработку)
  var emptyRowCount = 0;
  // Массив testCases будет содержать данные для всех тест-кейсов, которые нужно создать через API
  var testCases = [];
  
  /**
   * Функция createSection отправляет запрос на создание раздела через API test-it.
   * Если в ответе содержатся ошибки, то выводится сообщение с номером строки, из которой не удалось создать сущность.
   * @param {string} sectionName - Имя раздела, который нужно создать.
   * @param {string} projectId - Идентификатор проекта.
   * @param {string} parentId - Идентификатор родительского раздела.
   * @param {number} [rowNumber] - (Необязательно) Номер строки из листа "Оценка", для которой создается сущность.
   * @return {string|null} - Если запрос успешен, возвращает id созданного раздела; в противном случае, возвращает null.
   */
  function createSection(sectionName, projectId, parentId, rowNumber) {
    var sectionUrl = baseUrl+"/api/v2/sections"; // URL API для создания раздела
    // Формируем объект payload с данными для создания раздела
    var payload = {
      "name": sectionName,
      "projectId": projectId,
      "attachments": [],
      "parentId": parentId
    };
    // Задаем параметры запроса (метод POST, контент типа JSON, заголовок авторизации и т.д.)
    var options = {
      "method": "post",
      "contentType": "application/json",
      "payload": JSON.stringify(payload),
      "headers": {
        "Authorization": "PrivateToken "+apiToken
      },
      "muteHttpExceptions": true
    };
    // Отправляем запрос на создание раздела
    var response = UrlFetchApp.fetch(sectionUrl, options);
    // Получаем текст ответа от API
    var responseText = response.getContentText();
    // Логируем ответ от создания раздела
    //logToTechSheet("Создание секции: " + responseText);
    try {
      var json = JSON.parse(responseText);
      // Если в ответе присутствует ключ "errors" и передан номер строки, логируем сообщение с номером строки
      if (json.errors && rowNumber) {
        logToTechSheet("Возникли проблемы с созданием сущности из строки " + rowNumber);
        return null;
      }
      // Если успешный ответ, возвращаем id созданного раздела
      return json.id;
    } catch(e) {
      // Если произошла ошибка при разборе JSON, возвращаем null
      return null;
    }
  }
  
  // Обрабатываем каждую строку листа "Оценка", начиная со 3-й строки (индекс 2)
  for (var row = 2; row < sheet.getLastRow(); row++) {
    // Получаем все значения текущей строки от первого столбца до столбца "Очистить строку"
    var rowValues = sheet.getRange(row + 1, 1, 1, clearColumnIndex).getValues()[0];
    
    // Получаем значение из столбца "Тип покрытия" для текущей строки
    var typeValue;
    if (typeColumnIndex < clearColumnIndex) {
      typeValue = rowValues[typeColumnIndex];
    } else {
      typeValue = sheet.getRange(row + 1, typeColumnIndex + 1).getValue();
    }
    
    // Если значение "Тип покрытия" пустое и в строке есть хотя бы одно непустое значение (в столбцах от A до "Очистить строку"),
    // то считаем эту строку строкой-секцией.
    if ((!typeValue || typeValue.toString().trim() === "")) {
      var isSectionRow = false;
      // Перебираем столбцы до "Очистить строку" для проверки наличия непустого значения
      for (var col = 0; col < clearColumnIndex; col++) {
        if (rowValues[col] && rowValues[col].toString().trim() !== "") {
          isSectionRow = true;
          break;
        }
      }
      // Если строка является секцией:
      if (isSectionRow) {
        // Для каждого столбца (уровня) до "Очистить строку" создаем или обновляем раздел
        for (var col = 0; col < clearColumnIndex; col++) {
          // Считываем значение из текущей ячейки
          var cellValue = rowValues[col] ? rowValues[col].toString().trim() : "";
          if (cellValue !== "") {
            // Определяем родительский раздел:
            // Если col == 0, родитель – корневой раздел; иначе, берем раздел предыдущего уровня из currentSections
            var parentSectionId = (col === 0) ? rootSectionId : (currentSections[col - 1] ? currentSections[col - 1].id : rootSectionId);
            // Создаем новый раздел с именем cellValue, передавая projectId, parentSectionId и номер строки (row+1)
            var newSectionId = createSection(cellValue, projectId, parentSectionId, row + 1);
            if (newSectionId) {
              // Сохраняем новый раздел в массив currentSections для текущего уровня
              currentSections[col] = { id: newSectionId, name: cellValue };
              // Очищаем записи разделов для уровней, ниже текущего
              for (var k = col + 1; k < clearColumnIndex; k++) {
                currentSections[k] = null;
              }
            }
          }
        }
        // Так как строка является секцией, переходим к следующей строке
        continue;
      }
    }
    
    // Если строка не является секцией, то обрабатываем её как тест-кейс.
    // Определяем имя тест-кейса как последнее непустое значение в строке.
    var testCaseName = "";
    var lastNonEmptyColumn = -1;
    for (var col = 0; col < rowValues.length; col++) {
      if (rowValues[col] && rowValues[col].toString().trim() !== "") {
        lastNonEmptyColumn = col;
        testCaseName = rowValues[col].toString().trim();
      }
    }
    // Если строка полностью пустая, увеличиваем счетчик пустых строк и, если их 10 подряд, прекращаем обработку
    if (lastNonEmptyColumn === -1) {
      emptyRowCount++;
      if (emptyRowCount >= 10) {
        logToTechSheet('Завершен парсинг таблицы, начато создание сущностей в test-it');
        break;
      }
      continue;
    }
    // Если строка не пустая, сбрасываем счетчик пустых строк
    emptyRowCount = 0;
    
    // Формируем объект baseTag в зависимости от значения "Тип покрытия".
    // Если значение равно "Тест кейс", baseTag будет {name: "тест кейс"};
    // если "Чек лист" – baseTag = {name: "чек лист"}.
    var baseTag;
    if (typeValue.toString().trim() === "Тест кейс") {
      baseTag = { "name": "тест кейс" };
    } else if (typeValue.toString().trim() === "Чек лист") {
      baseTag = { "name": "чек лист" };
    } else {
      // Если значение "Тип покрытия" не соответствует ожидаемым, логируем сообщение с номером строки и переходим к следующей строке
      logToTechSheet('Неверное значение "Тип покрытия" в строке ' + (row + 1) + ': ' + typeValue);
      continue;
    }
    
    // Получаем значение из столбца "Подготовка к тесту, (минуты)" для текущей строки
    var prepValue = (prepColumnIndex < clearColumnIndex) ?
      rowValues[prepColumnIndex] : sheet.getRange(row + 1, prepColumnIndex + 1).getValue();
    // Получаем значение из столбца "Время на один тест, (минуты)" для текущей строки
    var testTimeValue = (testTimeColumnIndex < clearColumnIndex) ?
      rowValues[testTimeColumnIndex] : sheet.getRange(row + 1, testTimeColumnIndex + 1).getValue();
    // Суммируем значения подготовки и времени теста (в минутах)
    var sumMinutes = Number(prepValue) + Number(testTimeValue);
    // Переводим сумму минут в миллисекунды (округляем)
    var duration = Math.round(sumMinutes * 60 * 1000);
    
// Получаем браузерные теги для Desktop:
var desktopValue = sheet.getRange(row + 1, desktopColumnIndex + 1).getValue();
var desktopTags = [];
if (desktopValue && typeof desktopValue === 'string') {
  // Разбиваем строку на отдельные значения по запятой
  var tokens = desktopValue.split(",");
  for (var j = 0; j < tokens.length; j++) {
    // Обрезаем пробелы только с начала и конца строки, оставляем пробелы внутри
    var token = tokens[j].trim();
    if (token) {
      // Формируем тег вида "desktop <token>"
      desktopTags.push({ "name": "desk " + token });
    }
  }
}

// Получаем браузерные теги для Tablet:
var tabletValue = sheet.getRange(row + 1, tabletColumnIndex + 1).getValue();
var tabletTags = [];
if (tabletValue && typeof tabletValue === 'string') {
  var tokens = tabletValue.split(",");
  for (var j = 0; j < tokens.length; j++) {
    var token = tokens[j].trim();
    if (token) {
      tabletTags.push({ "name": "tab " + token });
    }
  }
}

// Получаем браузерные теги для Mobile:
var mobileValue = sheet.getRange(row + 1, mobileColumnIndex + 1).getValue();
var mobileTags = [];
if (mobileValue && typeof mobileValue === 'string') {
  var tokens = mobileValue.split(",");
  for (var j = 0; j < tokens.length; j++) {
    var token = tokens[j].trim();
    if (token) {
      mobileTags.push({ "name": "mob " + token });
    }
  }
}

    
    // Объединяем все браузерные теги (desktop, tablet, mobile) в один массив
    var finalTags = [].concat(desktopTags, tabletTags, mobileTags);
    // Добавляем тег с номером задачи (например, QA-150) к массиву тегов
    var updatedTags = finalTags.concat({ "name": taskNumber });
    
    // Определяем раздел для тест-кейса:
    // Перебираем currentSections (сохраненные разделы по уровням) и берем самый глубокий (последний, если есть)
    var testCaseSectionId = rootSectionId;
    for (var level = 0; level < clearColumnIndex; level++) {
      if (currentSections[level] && currentSections[level].id) {
        testCaseSectionId = currentSections[level].id;
      }
    }
    
    // Добавляем объект тест-кейса в массив testCases для дальнейшей отправки через API,
    // а также сохраняем номер строки (row+1) для логирования ошибок
    testCases.push({
      name: testCaseName,                // Имя тест-кейса
      tags: updatedTags,                 // Массив тегов (браузерные + тег с номером задачи)
      duration: duration,                // Продолжительность теста в миллисекундах
      baseTag: baseTag,                  // Объект baseTag, определяющий тип (тест кейс или чек лист)
      sectionId: testCaseSectionId,      // Идентификатор раздела, в который будет добавлен тест-кейс
      rowNumber: row + 1                 // Номер строки в листе "Оценка", для логирования ошибок
    });
  }
  
  // --- Создание тестовых кейсов через API test-it ---
  // URL API для создания тест-кейсов
  var workItemUrl = baseUrl+"/api/v2/workItems";
  // Перебираем все тест-кейсы из массива testCases
  for (var i = 0; i < testCases.length; i++) {
    // Формируем объект payload для запроса создания тест-кейса
    var testCasePayload = {
      "entityTypeName": "TestCases",       // Тип создаваемой сущности
      "description": "",                   // Описание (пустое)
      "state": "NotReady",                 // Состояние тест-кейса
      "priority": "Medium",                // Приоритет
      "steps": [                           // Шаги тест-кейса (один пустой шаг)
        {
          "action": "",
          "expected": "",
          "testData": "",
          "comments": "",
          "workItemId": ""
        }
      ],
      "preconditionSteps": [],             // Предусловия (пустой массив)
      "postconditionSteps": [              // Постусловия (один пустой шаг)
        {
          "action": "",
          "expected": "",
          "testData": "",
          "comments": "",
          "workItemId": ""
        }
      ],
      "duration": testCases[i].duration,   // Продолжительность теста в миллисекундах
      "attributes": {                      // Атрибуты тест-кейса
        "d4c17098-5dfb-42ca-b012-bb68b0804b5e": testCases[i].baseTag.name
      },
      "tags": testCases[i].tags,           // Массив тегов
      "name": testCases[i].name,           // Имя тест-кейса
      "projectId": projectId,              // Идентификатор проекта
      "sectionId": testCases[i].sectionId   // Идентификатор раздела, в который добавляется тест-кейс
    };
    
    // Задаем параметры запроса для создания тест-кейса через API
    var testCaseOptions = {
      "method": "post",
      "contentType": "application/json",
      "payload": JSON.stringify(testCasePayload),
      "headers": {
        "Authorization": "PrivateToken "+apiToken
      },
      "muteHttpExceptions": true
    };
    
    // Отправляем запрос на создание тест-кейса и получаем ответ
    var testCaseResponse = UrlFetchApp.fetch(workItemUrl, testCaseOptions);
    var testCaseResponseText = testCaseResponse.getContentText();
    
// Пытаемся разобрать ответ как JSON
try {
  var json = JSON.parse(testCaseResponseText);
  // Если успешное создание (есть поле "id" и нет ошибок)
  if (json.id && !json.errors) {
    logToTechSheet("В test-it создана сущность: " + testCases[i].name);
    SpreadsheetApp.flush();  // Обновляем данные в таблице сразу
  } else {
    // Если не удалось создать сущность, логируем с номером строки
    logToTechSheet("Возникли проблемы с созданием сущности из строки " + testCases[i].rowNumber);
  }
} catch(e) {
  // Если не удалось разобрать ответ как JSON, логируем сообщение об ошибке с номером строки
  logToTechSheet("Ошибка разбора ответа из строки " + testCases[i].rowNumber + ": " + testCaseResponseText);
}
  }
   logToTechSheet("Парсинг таблицы завершен");
}
