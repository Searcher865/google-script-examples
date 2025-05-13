
/************************************************************************
 * ФУНКЦИЯ: fetchTestCases                                         *
 ************************************************************************/
// Функция для поиска тест-кейсов в заданном проекте через POST-запрос.
// В теле запроса задаются фильтры: ID проекта, состояние (Ready) и типы (TestCases, CheckLists).
// Результатом является массив объектов в формате { idtestcase: <ID>, tags: [массив тегов] }.
function fetchTestCases(projectId) {
  // URL для поиска тест-кейсов
  var apiUrl = baseUrl + "/api/v2/workItems/search";

  // Формируем тело запроса с фильтрами
  var payload = {
    filter: {
      projectIds: [projectId],
      states: ["Ready"],
      types: ["TestCases", "CheckLists"]
    }
  };

  // Опции запроса для отправки через UrlFetchApp.fetch
  var options = {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify(payload),
    muteHttpExceptions: true,
    headers: {
      "Authorization": "PrivateToken " + apiToken
    }
  };

  try {
    // Отправляем запрос и получаем ответ
    var response = UrlFetchApp.fetch(apiUrl, options);
    // Парсим ответ из JSON в объект
    var data = JSON.parse(response.getContentText());
    var results = [];

    // Если тест-кейсы не найдены, выводим сообщение и возвращаем пустой массив.
    if (!data || data.length === 0) {
      logToTechSheet("Нет тест‑кейсов по заданным фильтрам.");
      return results;
    }

    // Для каждого найденного тест-кейса формируем объект с ID и массивом тегов.
    data.forEach(function(item) {
      results.push({
        idtestcase: item.id,
        tags: item.tagNames || []
      });
    });
    logToTechSheet("Найдены все тест кейсы и чек листы для тест плана");
    // logToTechSheet("Найденные тест‑кейсы:\n" + JSON.stringify(results, null, 2));
    return results;
  } catch (e) {
    logToTechSheet("Ошибка при получении тест‑кейсов: " + e.toString());
    return [];
  }
}


/************************************************************************
 * ФУНКЦИЯ: groupTestCases                                         *
 ************************************************************************/
// Функция группировки тест-кейсов по комбинации тегов.
// Каждый тест-кейс добавляется в группу, ключ которой сформирован из отсортированного массива тегов.
// Возвращается массив групп, где каждая группа имеет:
//   - name: название группы (например, "Группа 1")
//   - tags: массив тегов группы
//   - idtestcases: массив ID тест-кейсов, входящих в группу
function groupTestCases(testCases) {
  // Если входной параметр не является массивом, выводим сообщение и возвращаем пустой массив.
  if (!Array.isArray(testCases)) {
    logToTechSheet("Входной параметр должен быть массивом.");
    return [];
  }
  
  var groups = {};
  
  // Проходим по каждому тест-кейсу.
  testCases.forEach(function(item) {
    // Если у тест-кейса отсутствуют теги или они не являются массивом, пропускаем его.
    if (!item.tags || !Array.isArray(item.tags)) return;
    // Клонируем массив тегов и сортируем его, чтобы порядок не влиял на группировку.
    var sortedTags = item.tags.slice().sort();
    // Формируем ключ для группировки путём объединения тегов через запятую.
    var key = sortedTags.join(',');
    
    // Если для данного ключа еще не создана группа, создаём новый объект группы.
    if (!groups[key]) {
      groups[key] = {
        tags: sortedTags,
        idtestcases: []
      };
    }
    // Добавляем ID тест-кейса в соответствующую группу.
    groups[key].idtestcases.push(item.idtestcase);
  });
  
  // Преобразуем объект групп в массив, нумеруя группы последовательно.
  var result = [];
  var groupNumber = 1;
  for (var key in groups) {
    result.push({
      name: "Группа " + groupNumber,
      tags: groups[key].tags,
      idtestcases: groups[key].idtestcases
    });
    groupNumber++;
  }
    logToTechSheet("Тест кейсы и чек листы скгруппрованы");
  // logToTechSheet("Сгруппированные тест‑кейсы:\n" + JSON.stringify(result, null, 2));
  return result;
}