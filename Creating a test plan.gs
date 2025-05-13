/************************************************************************
 * ФУНКЦИЯ: createTestPlan                                         *
 ************************************************************************/
// Функция для создания нового тест-плана через POST-запрос.
// Формируется тело запроса с нужными свойствами, затем вызывается универсальная функция sendApiRequest.
// Возвращает ID созданного тест-плана или null, если создание не удалось.
function createTestPlan(projectId, nameTask, taskNumber) {

  // Получаем активную таблицу (Spreadsheet)
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // Получаем лист "Тех.страница" из таблицы
  var techSheet = ss.getSheetByName("Тех.страница");


  // Формируем тело запроса (payload) согласно требованиям API.
  var payload = {
    "tags": [
      { "name": taskNumber }
    ],
    "name": nameTask, // Название тест-плана
    "startDate": new Date().toISOString(), // Дата начала в формате ISO
    "endDate": new Date().toISOString(),   // Дата окончания в формате ISO
    "projectId": projectId, // Актуальный ID проекта
    "hasAutomaticDurationTimer": true, // Флаг автоматического таймера
    "attributes": {} // Дополнительные атрибуты (пустой объект)
  };

  // Отправляем POST-запрос через sendApiRequest и получаем ответ.
  var response = sendApiRequest("/api/v2/testPlans", "post", payload);
  // Если ответ содержит ID, возвращаем его, иначе возвращаем null.
  techSheet.getRange("E16").setValue(response.globalId);
  return response && response.id ? response.id : null;
}

/************************************************************************
 * ФУНКЦИЯ: processGroups                                         *
 ************************************************************************/
// Основная функция для обработки групп:
// 1. Получает тест-кейсы.
// 2. Группирует их по тегам.
// 3. Создаёт тест-сют для каждой группы в рамках заданного тест-плана.
// Результатом является массив групп с добавленным свойством testSuiteId.
function processGroups(testPlanId) {
  // Получаем тест-кейсы с помощью функции fetchTestCases.
  var testCases = fetchTestCases();
  if (!testCases || testCases.length === 0) {
    logToTechSheet("Нет тест‑кейсов для группировки.");
    return;
  }
  
  // Группируем тест-кейсы по комбинации тегов.
  var groups = groupTestCases(testCases);
  
  // Для каждой группы создаём тест-сют и записываем полученный ID в объект группы.
  groups.forEach(function(group) {
    var tsId = createTestSuiteForGroup(testPlanId, group);
    group.testSuiteId = tsId;
  });
 
  logToTechSheet("Итоговый объект групп:\n" + JSON.stringify(groups, null, 2));
  return groups;
}


/************************************************************************
 * ФУНКЦИЯ: processTestPointsForGroups                             *
 ************************************************************************/
// Функция перебирает массив групп и для каждой группы с заданным testSuiteId и непустым массивом idtestcases
// вызывает функцию добавления тест-кейсов в тест-сют.
function processTestPointsForGroups(groups) {
  groups.forEach(function(group) {
    if (group.testSuiteId && group.idtestcases && group.idtestcases.length > 0) {
      addTestPointsToTestSuiteForGroup(group);
    } else {
      logToTechSheet("Для " + group.name + " отсутствует testSuiteId или список idtestcases пуст.");
    }
  });
}


/************************************************************************
 * ФУНКЦИЯ: main                                                  *
 ************************************************************************/
// Основная функция, которая выполняет все шаги по созданию тест-плана, группировке тест-кейсов,
// созданию тест-сютов, добавлению тест-кейсов и установке конфигураций для каждой группы.
// Результаты всех операций выводятся в лог.
function mainCreateTestPlan() {
  
  // Получаем активную таблицу (Spreadsheet)
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // Получаем лист "Тех.страница" из таблицы
  var techSheet = ss.getSheetByName("Тех.страница");
  // Очищаем все ячейки столбца D, начиная с 20-й строки, чтобы удалить старые логи
  techSheet.getRange("D20:D").clearContent();

  // Считываем projectId из ячейки E14
  var projectId = techSheet.getRange("E14").getValue().toString().trim();
  // Если projectId пустой, логируем сообщение и завершаем выполнение
  if (!projectId) {
    logToSheet("projectId не обнаружен");
    return;
  }
 
  // Считываем значение из ячейки E12 листа "Тех.страница" (ссылка на задачу)
  var trackerValue = techSheet.getRange("E12").getValue().toString().trim();
  // Если значение пустое, логируем сообщение и прекращаем выполнение
  if (!trackerValue) {
    logToSheet("Ссылка на задачу не обнаружена");
    return;
  }
  
  // Извлекаем номер задачи в формате "QA-150" (регистронезависимо) из trackerValue
  var match = trackerValue.match(/(QA-\d+)/i);
  // Если номер задачи не найден, логируем сообщение и завершаем функцию
  if (!match) {
    logToSheet("Ссылка на задачу не обнаружена");
    return;
  }
  // Приводим найденный номер задачи к верхнему регистру (например, "QA-150")
  var taskNumber = match[1].toUpperCase();

  // Считываем имя корневого раздела из ячейки E13
  var sectionName = techSheet.getRange("E13").getValue().toString().trim();
  if (!sectionName) {
    logToSheet("Название раздела не обнаружено");
    return;
  }
var nameTask = taskNumber + " " + sectionName;

  try {
    // 1. Создаем тест-план и получаем его ID.
    var testPlanId = createTestPlan(projectId, nameTask, taskNumber);
    if (!testPlanId) {
      logToTechSheet("Не удалось создать тест план.");
      return;
    }
    logToTechSheet("Создан тест план с глобальным ID: " + testPlanId);
    
    // 2. Получаем тест-кейсы из заданного проекта.
    var testCases = fetchTestCases(projectId);
    if (!testCases || testCases.length === 0) {
      logToTechSheet("Нет тест‑кейсов для группировки.");
      return;
    }
    
    // 3. Группируем тест-кейсы по комбинации тегов.
    var groups = groupTestCases(testCases);
    
    // 4. Для каждой группы создаем тест-сют в рамках созданного тест-плана и сохраняем полученный testSuiteId.
    groups.forEach(function(group) {
      var tsId = createTestSuiteForGroup(testPlanId, group);
      group.testSuiteId = tsId;
    });
    
    // logToTechSheet("Итоговый объект групп после создания тест-сютов:\n" + JSON.stringify(groups, null, 2));
    
    // 5. Добавляем тест-кейсы в тест-сюты каждой группы.
    processTestPointsForGroups(groups);
    
    // 6. Для каждой группы обрабатываем конфигурации: для каждого тега (кроме тех, содержащих "qa-")
    // ищем соответствующую конфигурацию и сохраняем её ID.
    var groupsWithConfigurations = processGroupsConfigurations(groups, projectId);
    
    // 7. Устанавливаем найденные конфигурации для тест-сютов каждой группы.
    groupsWithConfigurations.forEach(function(group) {
      addConfigurationsToTestSuiteForGroup(group);
    });
    // 8. Назначаем тестировщика на тест-план (пример: userId из задания).
    assignTesterToTestPlan(testPlanId, userId);
    logToTechSheet("Обработка завершена");
  } catch (e) {
    logToTechSheet("Ошибка в main: " + e.toString());
  }
}
