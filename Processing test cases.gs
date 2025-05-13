
/************************************************************************
 * ФУНКЦИЯ: createTestSuiteForGroup                               *
 ************************************************************************/
// Функция для создания тест-сюта для группы тест-кейсов.
// Используется имя группы как название тест-сюта, а в фильтре запроса передаются теги группы.
// После успешного создания возвращается ID тест-сюта.
function createTestSuiteForGroup(testPlanId, group) {
  // Формируем тело запроса (payload) для создания тест-сюта.
  var payload = {
    "parentId": null,                   // Отсутствие родительского тест-сюта
    "testPlanId": testPlanId,           // ID тест-плана, в котором создается тест-сют
    "name": group.name,                 // Название тест-сюта совпадает с названием группы
    "type": "Dynamic",                  // Тип тест-сюта (можно изменить при необходимости)
    "saveStructure": true,              // Флаг сохранения структуры секций
    "autoRefresh": false,                // Флаг автоматического обновления
    "filter": {
      "types": ["TestCases", "CheckLists"], // Типы рабочих элементов для фильтрации
      "states": ["Ready"],                  // Состояние "Ready" означает, что элемент готов к тестированию
      "tags": group.tags                    // Фильтрация по тегам, принадлежащим группе
    }
  };
  
  // Отправляем запрос на создание тест-сюта через функцию sendApiRequest.
  var response = sendApiRequest("/api/v2/testSuites", "post", payload);
  
  // Если ответ содержит ID, логируем успех и возвращаем этот ID.
  if (response && response.id) {
    logToTechSheet("Создан тест‑сьют для " + group.name + " с ID: " + response.id);
    return response.id;
  } else {
    logToTechSheet("Ошибка при создании тест‑сюта для " + group.name);
    return null;
  }
}



/************************************************************************
 * ФУНКЦИЯ: addTestPointsToTestSuiteForGroup                      *
 ************************************************************************/
// Функция для добавления тест-кейсов (рабочих элементов) в тест-сют группы.
// Используется метод POST с передачей массива ID тест-кейсов (поле "ids").
// Если API возвращает пустой ответ (например, статус 204), считается, что операция успешна.
function addTestPointsToTestSuiteForGroup(group) {
  // logToTechSheet("ОДИНОЧНЫЙ ОБЪЕКТ: " + JSON.stringify(group, null, 2));
  
  // Формируем payload, где в поле "ids" передаются ID тест-кейсов группы.
  var payload = {
    "filter": {
      "ids": group.idtestcases
    }
  };

  // Формируем endpoint, подставляя ID тест-сюта из группы.
  var endpoint = "/api/v2/testSuites/" + group.testSuiteId + "/test-points";
  
  try {
    // Вызываем универсальную функцию для отправки запроса.
    // Функция sendApiRequest возвращает либо распарсенный JSON, либо null, если ответ пустой (например, 204).
    var result = sendApiRequest(endpoint, "post", payload);
    
    // Если результат равен null, считаем, что тест-кейсы успешно добавлены.
    if (result === null) {
      logToTechSheet("Для " + group.name + " тест кейсы успешно добавлены (пустой ответ от API, вероятно 204).");
    } else {
      logToTechSheet("Для " + group.name + " получен ответ: " + JSON.stringify(result));
    }
  } catch (e) {
    logToTechSheet("Ошибка при отправке запроса для группы " + group.name + ": " + e.toString());
  }
}


/************************************************************************
 * ФУНКЦИЯ: processGroupsConfigurations                             *
 ************************************************************************/
// Функция обрабатывает каждую группу и для каждого тега, не содержащего "qa-",
// ищет конфигурацию по имени тега и сохраняет найденный ID в новом свойстве "configurations" группы.
// Результатом является обновленный объект групп с привязанными конфигурационными ID.
function processGroupsConfigurations(groups, projectId) {
  groups.forEach(function(group) {
    // Создаём новое свойство "configurations" для хранения сопоставления:
// ключ – название тега, значение – ID конфигурации.
    group.configurations = {};
    
    // Перебираем все теги группы.
    group.tags.forEach(function(tag) {
      // Пропускаем теги, содержащие "qa-" (они не участвуют в поиске конфигураций).
      if (tag.indexOf("qa-") !== -1) return;
      
      // Ищем конфигурацию по имени тега.
      var configId = searchConfigurationByName(tag, projectId);
      // Сохраняем найденный ID в объекте configurations.
      group.configurations[tag] = configId;
      
      // logToTechSheet("Для тэга \"" + tag + "\" найдена конфигурация: " + configId);
    });
  });
  
  // logToTechSheet("Итоговый объект групп с конфигурациями:\n" + JSON.stringify(groups, null, 2));
  return groups;
}



/************************************************************************
 * ФУНКЦИЯ: addConfigurationsToTestSuiteForGroup
 ************************************************************************/
/*
Функция устанавливает конфигурации для тест-сюта группы.
Из объекта группы извлекаются все ID конфигураций из свойства configurations.
Отправляется POST-запрос к /api/v2/testSuites/{id}/configurations с телом, представляющим массив этих ID.
Если запрос проходит успешно (например, статус 204), операция считается завершенной.
*/
function addConfigurationsToTestSuiteForGroup(group) {
  if (!group.configurations || Object.keys(group.configurations).length === 0) {
    logToTechSheet("Для группы " + group.name + " конфигураций не задано.");
    return;
  }
  
  // Собираем все ID конфигураций в массив
  var configIds = [];
  for (var key in group.configurations) {
    if (group.configurations.hasOwnProperty(key)) {
      configIds.push(group.configurations[key]);
    }
  }
  //  logToTechSheet("ВЫВОД ГРУППЫ" + JSON.stringify(group));
  var endpoint = "/api/v2/testSuites/" + group.testSuiteId + "/configurations";
  var payload = configIds;
  
  try {
    var response = sendApiRequest(endpoint, "post", configIds);
    if (response === null) {
      logToTechSheet("Для группы " + group.name + " конфигурации установлены успешно (пустой ответ от API).");
    } else {
      logToTechSheet("Для группы " + group.name + " получен ответ: " + JSON.stringify(response));
    }
  } catch (e) {
    logToTechSheet("Ошибка при установке конфигураций для группы " + group.name + ": " + e.toString());
  }
}


/************************************************************************
 * ФУНКЦИЯ: assignTesterToTestPlan
 ************************************************************************/
/*
Функция назначает тестировщика на все тест-поинты тест-плана.
Принимает два параметра:
 - testPlanId: ID тест-плана.
 - userId: ID пользователя (тестировщика).
Отправляет POST-запрос к /api/v2/testPlans/{id}/testPoints/tester/{userId} с фильтром,
указывающим на нужный тест-план.
*/
function assignTesterToTestPlan(testPlanId, userId) {
  var endpoint = `/api/v2/testPlans/${encodeURIComponent(testPlanId)}/testPoints/tester/${encodeURIComponent(userId)}`;
  var payload = {
    "filter": {
      "testPlanIds": [testPlanId]
    }
  };

  try {
    var response = sendApiRequest(endpoint, "post", payload);
    if (response != null) {
      logToTechSheet("Тестировщик успешно назначен на тест-план " + testPlanId);
    } else {
      logToTechSheet("Ответ при назначении тестировщика: " + JSON.stringify(response));
    }
  } catch (e) {
    logToTechSheet("Ошибка при назначении тестировщика на тест-план: " + e.toString());
  }
}


/************************************************************************
 * ФУНКЦИЯ: searchConfigurationByName                              *
 ************************************************************************/
// Функция для поиска конфигурации по имени тега.
// Отправляется POST-запрос на поиск конфигураций с фильтром по имени.
// Если найдена хотя бы одна конфигурация, возвращается её ID, иначе - null.
function searchConfigurationByName(tagName, projectId) {
  // Если нужно ограничить поиск конфигураций для определённого проекта, укажите projectIds.
  var projectId = projectId;
  var payload = {
    projectIds: [ projectId ],
    name: tagName,     // Поиск по имени тега (без учета регистра, частичное совпадение)
    isDeleted: false,  // Ищем только существующие (не удаленные) конфигурации
    globalIds: []      // Дополнительный фильтр по глобальным ID (не используется здесь)
  };
  
  // Отправляем запрос на поиск конфигураций.
  var endpoint = "/api/v2/configurations/search";
  var response = sendApiRequest(endpoint, "post", payload);
  
  // Если ответ является массивом и содержит хотя бы один элемент, возвращаем ID первой конфигурации.
  if (Array.isArray(response) && response.length > 0) {
    return response[0].id;
  }
  
  return null;
}