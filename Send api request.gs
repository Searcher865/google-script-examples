
/************************************************************************
 * ФУНКЦИЯ: sendApiRequest
 ************************************************************************/
/*
Эта универсальная функция отправляет HTTP-запросы к API.
Параметры:
 - endpoint: строка, содержащая путь запроса (например, "/api/v2/testPlans")
 - method: HTTP-метод ("get", "post", "patch" и т.д.)
 - payload: объект, который будет сериализован в JSON и отправлен в теле запроса (для GET-запросов не используется)
Функция формирует полный URL, устанавливает заголовки (включая авторизацию) и параметры запроса, отправляет запрос и возвращает результат.
Если тело ответа пустое (например, статус 204), возвращается null.
*/
function sendApiRequest(endpoint, method, payload) {
  // Формируем полный URL, объединяя базовый URL и endpoint.
  var url = baseUrl + endpoint;
  
  // Создаем объект options с параметрами запроса.
  var options = {
    "method": method.toUpperCase(),         // Приводим метод к верхнему регистру, например, "GET" или "POST"
    "contentType": "application/json",        // Тип содержимого – JSON
    "muteHttpExceptions": true,               // Позволяет получить ответ даже при ошибках HTTP
    "headers": {
      "Authorization": "PrivateToken " + apiToken,  // Заголовок для авторизации
      "Accept": "application/json"                   // Запрашиваемый формат ответа
    }
  };
  
  // Если метод не GET, добавляем тело запроса (payload) в формате JSON.
  if (method.toLowerCase() !== "get") {
    options.payload = JSON.stringify(payload);
  }
  
  // // Логируем отправляемый запрос (при необходимости можно раскомментировать)
  // logToTechSheet("Запрос: " + method + " " + url);
  
  try {
    // Отправляем запрос через UrlFetchApp.fetch и получаем ответ.
    var response = UrlFetchApp.fetch(url, options);
    // Получаем HTTP-код ответа (например, 200 или 204)
    var responseCode = response.getResponseCode();
    // Получаем тело ответа в виде строки
    var responseText = response.getContentText();
    // logToTechSheet("Код ответа: " + responseCode);
    
    // Если тело ответа пустое (например, статус 204 "No Content"), возвращаем null.
    if (responseText.trim() === "") {
      return null;
    }
    
    // Если ответ успешный (код 200-299), парсим и возвращаем JSON.
    if (responseCode >= 200 && responseCode < 300) {
      return JSON.parse(responseText);
    } else {
      // Если код ответа не успешный, генерируем ошибку с текстом ответа.
      throw new Error("Ошибка API: " + responseText);
    }
  } catch (e) {
    // Логируем ошибку и пробрасываем её дальше.
    logToTechSheet("Ошибка при выполнении запроса: " + e.toString());
    throw e;
  }
}