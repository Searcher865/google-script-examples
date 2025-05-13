/************************************************************************
 * ФУНКЦИЯ: getTestPlanById
 ************************************************************************/
/*
Эта функция получает данные тест-плана по его ID.
Сначала считывает testPlanId из ячейки E16 листа "Тех.страница".
Затем формирует URL запроса и отправляет GET-запрос к API.
Если запрос успешен (код 200), функция возвращает ID тест-плана.
*/
function getTestPlanById() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var techSheet = ss.getSheetByName("Тех.страница");
  // Считываем значение из ячейки E16, где должен быть указан testPlanId.
  var testplanIdfromTable = techSheet.getRange("E16").getValue().toString().trim();
  if (!testplanIdfromTable) {
    logToTechSheet("Id тест плана не обнаружен");
    return;
  }
  var testPlanId = testplanIdfromTable;
  // Формируем URL для GET-запроса к API
  var url = baseUrl + "/api/v2/testPlans/" + encodeURIComponent(testPlanId);
  var options = {
    "method": "get",
    "contentType": "application/json",
    "muteHttpExceptions": true,
    "headers": {
      "Authorization": "PrivateToken " + apiToken
    }
  };
  
  try {
    var response = UrlFetchApp.fetch(url, options);
    var statusCode = response.getResponseCode();
    if (statusCode === 200) {
      var testPlan = JSON.parse(response.getContentText());
      logToTechSheet("Найденный тест план: " + JSON.stringify(testPlan.id));
      return testPlan.id;
    } else {
      logToTechSheet("Ошибка получения тест плана. Код ответа: " + statusCode + ", ответ: " + response.getContentText());
      return null;
    }
  } catch (e) {
    logToTechSheet("Ошибка при выполнении запроса: " + e.toString());
    return null;
  }
}

/************************************************************************
 * ФУНКЦИЯ: getTestPlanAnalytics
 ************************************************************************/
/*
Функция получает аналитику тест-плана по его ID.
Отправляет GET-запрос к /api/v2/testPlans/{id}/analytics и возвращает распарсенный ответ.
*/
function getTestPlanAnalytics(testPlanId) {
  var endpoint = "/api/v2/testPlans/" + encodeURIComponent(testPlanId) + "/analytics";
  try {
    var analyticsData = sendApiRequest(endpoint, "get", {});
    logToTechSheet("Получена аналитика тест-плана");
    return analyticsData;
  } catch (e) {
    logToTechSheet("Ошибка получения аналитики тест-плана: " + e.toString());
    return null;
  }
}


/************************************************************************
 * ФУНКЦИЯ: extractTestSuitesFromAnalytics
 ************************************************************************/
/*
Функция извлекает список тест-сютов из аналитики тест-плана.
Ожидается, что аналитика содержит свойство countGroupByTestSuite – массив объектов,
каждый из которых содержит testSuiteId и testSuiteName.
Возвращает массив объектов: { testSuiteId, testSuiteName }.
*/
function extractTestSuitesFromAnalytics(analyticsData) {
  if (!analyticsData || !analyticsData.countGroupByTestSuite) {
    logToTechSheet("Аналитика не содержит данных по тест-сютам.");
    return [];
  }
  var suites = analyticsData.countGroupByTestSuite;
  var result = [];
  suites.forEach(function(suite) {
    result.push({
      testSuiteId: suite.testSuiteId,
      testSuiteName: suite.testSuiteName
    });
  });
  logToTechSheet("Извлечён список тест-сютов");
  return result;
}


/************************************************************************
 * ФУНКЦИЯ: getTestSuiteConfigurations
 ************************************************************************/
/*
Функция получает конфигурации для заданного тест-сюта.
Отправляет GET-запрос к /api/v2/testSuites/{id}/configurations и возвращает массив объектов конфигураций.
*/
function getTestSuiteConfigurations(testSuiteId) {
  var endpoint = "/api/v2/testSuites/" + encodeURIComponent(testSuiteId) + "/configurations";
  try {
    var configs = sendApiRequest(endpoint, "get", {});
    logToTechSheet("Получены конфигурации для тест-сюта " + testSuiteId);
    return configs && Array.isArray(configs) ? configs : [];
  } catch (e) {
    logToTechSheet("Ошибка получения конфигураций для тест-сюта " + testSuiteId + ": " + e.toString());
    return [];
  }
}


/************************************************************************
 * ФУНКЦИЯ: assembleSuiteData
 ************************************************************************/
/*
Функция собирает итоговые данные для каждого тест-сюта:
 - Получает список тест-поинтов и извлекает уникальные ID тест-кейсов (поле workItemId).
 - Получает список конфигураций и извлекает уникальные имена конфигураций (поле name).
Возвращает массив объектов с полями:
  - name: название тест-сюта,
  - testSuiteId: ID тест-сюта,
  - configuration: массив уникальных имен конфигураций,
  - idtestcases: массив уникальных ID тест-кейсов.
*/
function assembleSuiteData(suites) {
  var result = [];
  suites.forEach(function(suite) {
    // Получаем тест-поинты для данного тест-сюта.
    var testPoints = getTestPointsForSuite(suite.testSuiteId);
    var testCaseIdsSet = {};
    testPoints.forEach(function(tp) {
      if (tp.workItemId) {
        testCaseIdsSet[tp.workItemId] = true;
      }
    });
    var idtestcases = Object.keys(testCaseIdsSet);
    
    // Получаем конфигурации для тест-сюта.
    var configObjects = getTestSuiteConfigurations(suite.testSuiteId);
    var configNamesSet = {};
    configObjects.forEach(function(conf) {
      if (conf.name) {
        configNamesSet[conf.name] = true;
      }
    });
    var configuration = Object.keys(configNamesSet);
    
    result.push({
      name: suite.testSuiteName,
      testSuiteId: suite.testSuiteId,
      tags: configuration,
      idtestcases: idtestcases
    });
  });
  logToTechSheet("Подготовлен итоговый список тест-сютов с конфигурациями и тест-кейсами");
  return result;
}


/************************************************************************
 * ФУНКЦИЯ: compareAndMergeGroups
 ************************************************************************/
/**
 * Функция сравнивает два списка:
 * - groups – сгруппированные тест-кейсы, где для каждой группы есть поля name, tags и idtestcases.
 * - finalResult – существующий список тест-сютов, где для каждой группы есть поля name, testSuiteId, configuration и idtestcases.
 *
 * Функция:
 * 1. Сравнивает массивы тегов из groups и массивы конфигураций из finalResult,
 *    игнорируя теги, содержащие "qa-". Сравнение производится без учета порядка.
 * 2. Если совпадение найдено (полное совпадение по количеству и именам, порядок не важен),
 *    то заменяет поле idtestcases в объекте finalResult на idtestcases из соответствующей группы.
 * 3. Если совпадение не найдено, добавляет новую группу в finalResult с новым именем (следующий порядковый номер),
 *    копируя поля configuration (из groups.tags, без "qa-") и idtestcases из группы, оставляя testSuiteId пустым.
 *
 * Возвращает обновленный массив finalResult.
 *
 * @param {Array} groups - Массив объектов групп с полями name, tags и idtestcases.
 * @param {Array} finalResult - Массив существующих тест-сютов с полями name, testSuiteId, configuration и idtestcases.
 * @return {Array} Обновленный массив finalResult.
 */
function compareAndMergeGroups(groups, finalResult) {
  
  // Функция createKey формирует строковый "ключ" из массива тегов.
  // Сначала фильтрует элементы, удаляя те, что содержат "qa-" (без учета регистра),
  // затем сортирует оставшиеся элементы, объединяет их через запятую и приводит к нижнему регистру.
  function createKey(arr) {
    return arr.filter(function(item) {
      return !/qa-/i.test(item);
    }).sort().join(',').toLowerCase();
  }
  
  // Создаем объект finalMap, где ключ – сформированный ключ конфигурации (из finalResult.configuration),
  // а значение – индекс соответствующей группы в finalResult.
  var finalMap = {};
  finalResult.forEach(function(item, index) {
    // Если configuration отсутствует, используем пустой массив
    var key = createKey(item.tags || []);
    finalMap[key] = index;
  });
  
  // Функция для вычисления следующего порядкового номера группы на основе имен в finalResult.
  function getNextGroupNumber(finalResult) {
    var maxNumber = 0;
    finalResult.forEach(function(item) {
      // Предполагаем, что name имеет формат "Группа X"
      var match = item.name.match(/Группа\s+(\d+)/i);
      if (match) {
        var num = parseInt(match[1], 10);
        if (num > maxNumber) maxNumber = num;
      }
    });
    return maxNumber + 1;
  }
  
  // Перебираем каждую группу из groups.
  groups.forEach(function(group) {
    // Создаем ключ для группы, используя group.tags и удаляя теги, содержащие "qa-".
    var groupKey = createKey(group.tags);
    
    // Если в finalResult уже существует группа с таким ключом, обновляем её.
    if (finalMap.hasOwnProperty(groupKey)) {
      var idx = finalMap[groupKey];
      finalResult[idx].idtestcases = group.idtestcases;
      logToTechSheet("Обновлена группа " + finalResult[idx].name + ": idtestcases заменены.");
    } else {
      // Если совпадения не найдено, создаем новую группу.
      var nextNum = getNextGroupNumber(finalResult);
      // Новая группа получает имя "Группа X", configuration копируются из group.tags (с фильтрацией)
      var newGroup = {
        name: "Группа " + nextNum,
        tags: group.tags.filter(function(tag) {
          return !/qa-/i.test(tag);
        }),
        idtestcases: group.idtestcases,
        testSuiteId: "" // testSuiteId оставляем пустым, так как тест-сют еще не создан
      };
      finalResult.push(newGroup);
      // Обновляем finalMap, добавляя новый ключ.
      finalMap[groupKey] = finalResult.length - 1;
      logToTechSheet("Добавлена новая группа: " + newGroup.name);
    }
  });
  
  logToTechSheet("Существующие тест-сюты обновлены");
  return finalResult;
}


/************************************************************************
 * ФУНКЦИЯ: updateTestSuiteWorkItems
 ************************************************************************/
/*
Функция обновляет тест-кейсы для тест-сюта.
Для каждого объекта из finalResult отправляется POST-запрос к /api/v2/testSuites/{id}/workItems,
где в теле передается массив idtestcases.
Если запрос прошёл успешно, логируется сообщение.
*/
function updateTestSuiteWorkItems(finalResult) {
  finalResult.forEach(function(suite) {
    var testSuiteId = suite.testSuiteId;
    var workItems = suite.idtestcases;
    if (!testSuiteId || !Array.isArray(workItems)) {
      logToTechSheet(`Пропущен suite "${suite.name}" (нет testSuiteId или idtestcases)`);
      return;
    }
    var endpoint = `/api/v2/testSuites/${encodeURIComponent(testSuiteId)}/workItems`;
    try {
      var response = sendApiRequest(endpoint, "post", workItems);
      logToTechSheet(`Обновлены workItems для "${suite.name}" (ID: ${testSuiteId}) — ${workItems.length} кейсов`);
    } catch (error) {
      logToTechSheet(`Ошибка при обновлении workItems для "${suite.name}" (ID: ${testSuiteId}): ${error}`);
    }
  });
}

/************************************************************************
 * ФУНКЦИЯ: processNewTestSuites
 ************************************************************************/
/*
Функция обрабатывает группы из finalResult, у которых отсутствует testSuiteId.
Для таких групп:
 1. Создается новый тест-сют с помощью createTestSuiteForGroup.
 2. Если тест-сют успешно создан, его testSuiteId записывается в объект группы.
 3. Затем в новый тест-сют добавляются тест-кейсы через addTestPointsToTestSuiteForGroup.
*/
function processNewTestSuites(finalResultforUpdate, testPlanId) {
  finalResultforUpdate.forEach(function(group) {
    if (!group.testSuiteId || group.testSuiteId === "") {
      logToTechSheet(`Новая группа без testSuiteId: ${group.name}`);
      // Создаем новый тест-сют
      var newtestSuiteId = createTestSuiteForGroup(testPlanId, group);
      if (newtestSuiteId) {
        group.testSuiteId = newtestSuiteId;
        // Добавляем тест-кейсы в новый тест-сют
        addTestPointsToTestSuiteForGroup({
          name: group.name,
          idtestcases: group.idtestcases,
          testSuiteId: newtestSuiteId
        });
      }
    }
  });
}

/************************************************************************
 * ФУНКЦИЯ: getTestPointsForSuite
 ************************************************************************/
// Получает список тест-поинтов для заданного тест-сюта.
// Отправляет GET-запрос к /api/v2/testSuites/{id}/testPoints и возвращает массив объектов тест-поинтов.
function getTestPointsForSuite(testSuiteId) {
  var endpoint = "/api/v2/testSuites/" + encodeURIComponent(testSuiteId) + "/testPoints";
  try {
    var testPoints = sendApiRequest(endpoint, "get", {});
    logToTechSheet("Получены тест-поинты для тест-сюта " + testSuiteId);
    // logToTechSheet("Получены тест-поинты для тест-сюта " + testSuiteId + ":\n" + JSON.stringify(testPoints, null, 2));
    return testPoints && Array.isArray(testPoints) ? testPoints : [];
  } catch (e) {
    logToTechSheet("Ошибка получения тест-поинтов для тест-сюта " + testSuiteId + ": " + e.toString());
    return [];
  }
}

/************************************************************************
 * ФУНКЦИЯ: mainForUpdate
 ************************************************************************/
/*
Основная функция, которая выполняет последовательные шаги:
1. Считывает данные из листа "Тех.страница": projectId, ссылка на задачу, номер задачи.
2. Получает testPlanId, тест-кейсы и группирует их.
3. Получает аналитику тест-плана, извлекает список тест-сютов и собирает итоговые данные.
4. Сравнивает сгруппированные тест-кейсы (groups) с существующими тест-сютами (finalResult)
   и обновляет/добавляет новые группы.
5. Обновляет тест-кейсы в тест-сютах с помощью updateTestSuiteWorkItems.
6. Обрабатывает новые группы (без testSuiteId): создает новые тест-сюты и добавляет тест-кейсы.
7. Обрабатывает конфигурации: на основе тегов ищет конфигурации и устанавливает их.
8. Назначает тестировщика на тест-план.
Все шаги логируются в лист "Тех.страница".
*/
function mainUpdateTestPlan() {
  // Получаем активную таблицу и лист "Тех.страница"
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var techSheet = ss.getSheetByName("Тех.страница");
  
  // Очищаем столбец D, начиная с 20-й строки, чтобы удалить старые логи
  techSheet.getRange("D20:D").clearContent();

  // Считываем projectId из ячейки E14
  var projectId = techSheet.getRange("E14").getValue().toString().trim();
  if (!projectId) {
    logToTechSheet("projectId не обнаружен");
    return;
  }
 
  // Считываем значение из ячейки E12 (ссылка на задачу)
  var trackerValue = techSheet.getRange("E12").getValue().toString().trim();
  if (!trackerValue) {
    logToTechSheet("Ссылка на задачу не обнаружена");
    return;
  }
  
  // Извлекаем номер задачи (например, "QA-150") из trackerValue (без учета регистра)
  var match = trackerValue.match(/(QA-\d+)/i);
  if (!match) {
    logToTechSheet("Ссылка на задачу не обнаружена");
    return;
  }
  var taskNumber = match[1].toUpperCase();

  // Основной процесс:
  try {
    // 1. Получаем testPlanId из таблицы (например, в ячейке E16)
    var testPlanId = getTestPlanById();
    if (!testPlanId) {
      logToTechSheet("Не удалось найти тест план.");
      return;
    }
    
    // 2. Получаем тест-кейсы для заданного проекта.
    var testCases = fetchTestCases(projectId);
    if (!testCases || testCases.length === 0) {
      logToTechSheet("Нет тест‑кейсов для группировки.");
      return;
    }
    
    // 3. Группируем тест-кейсы по комбинации тегов (оставляем только нужные теги: desk, tab, mob).
    var groups = groupTestCases(testCases);
    
    // 4. Получаем аналитику тест-плана.
    var analyticsData = getTestPlanAnalytics(testPlanId);
    if (!analyticsData) {
      logToTechSheet("Не удалось получить аналитику для тест-плана с ID: " + testPlanId);
      return;
    }
    
    // 5. Из аналитики извлекаем список тест-сютов.
    var suites = extractTestSuitesFromAnalytics(analyticsData);
    if (suites.length === 0) {
      logToTechSheet("В аналитике отсутствуют данные по тест-сютам.");
      return;
    }
    
    // 6. Собираем для каждого тест-сюта итоговые данные (название, конфигурации и тест-кейсы).
    var finalResult = assembleSuiteData(suites);
    // 7. Сравниваем сгруппированные тест-кейсы с существующими тест-сютами и обновляем список.
    var finalResultforUpdate = compareAndMergeGroups(groups, finalResult);
    // 8. Обновляем тест-кейсы (workItems) для каждого тест-сюта.
    updateTestSuiteWorkItems(finalResultforUpdate);

    // 9. Для групп без testSuiteId создаем новые тест-сюты и добавляем тест-кейсы.
    processNewTestSuites(finalResultforUpdate, testPlanId);
    
    // 10. Обрабатываем конфигурации: для каждого тест-сюта на основе тегов ищем соответствующие конфигурации.
    var groupsWithConfigurations = processGroupsConfigurations(finalResultforUpdate, projectId);
      //  logToTechSheet("ТЕСТОВЫЙ ВЫВОД groupsWithConfigurations " + ":\n" + JSON.stringify(groupsWithConfigurations, null, 2));
    // 11. Устанавливаем найденные конфигурации для каждого тест-сюта.
    groupsWithConfigurations.forEach(function(group) {
      addConfigurationsToTestSuiteForGroup(group);
    });
    
    // 12. Назначаем тестировщика на тест-план (пример: userId из задания).
    assignTesterToTestPlan(testPlanId, userId);
    
    logToTechSheet("Обработка завершена");
  } catch (e) {
    logToTechSheet("Ошибка в mainForUpdate: " + e.toString());
  }
}
