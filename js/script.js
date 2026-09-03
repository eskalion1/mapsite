let currentLayer = null;
let permanentLayer = null;
let currentIndex = kmlFiles.length - 1;
let preserveZoom = false;

let lastSelectedCity = null;
citiesDropdown = document.getElementById('cities-dropdown');
coordsInput = document.getElementById('coords-input');
currentCenterCoordsElement = document.getElementById('current-center-coords');
copyCoordsBtn = document.getElementById('copy-coords-btn');

window.selectedDate = null; // Глобальная переменная для хранения текущей даты

// Глобальный флаг для логгирования стилей временных файлов
const LOG_STYLES = true; // Можно менять на false для отключения

let currentDateRange = 'week'; // 'week', 'month', '6months', 'year', 'all'
// let isMilEquipVisible     = false; // Флаг видимости слоя техники
// let isAttacksOnUaVisible  = false; // Флаг видимости слоя атак по территории
// let isFortificationVisible = false; // Флаг видимости слоя фортификаций

const INTERACTIVE = true;

// Получаем массив доступных дат из kmlFiles
const availableDates = kmlFiles.map(file => file.name);

// Функция для преобразования даты из формата DD.MM.YY в объект Date
function parseCustomDate(dateStr) {
    if (!dateStr) {
        console.warn('parseCustomDate: dateStr is null or undefined, returning current date');
        return new Date();
    }
    
    try {
        const [day, month, year] = dateStr.split('.').map(Number);
        // Добавляем проверку на валидность чисел
        if (isNaN(day) || isNaN(month) || isNaN(year)) {
            console.warn('parseCustomDate: invalid date format, returning current date');
            return new Date();
        }
        return new Date(2000 + year, month - 1, day);
    } catch (error) {
        console.error('parseCustomDate: error parsing date', error);
        return new Date();
    }
}

// Функция для получения текущей даты в формате DD.MM.YY
function getCurrentDateFormatted() {
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = String(now.getFullYear()).slice(-2);
    return `${day}.${month}.${year}`;
}

// Функция для нахождения ближайшей доступной даты к указанной (раньше или равной)
function findNearestEarlierDate(targetDateStr) {
    if (!targetDateStr || availableDates.length === 0) {
        return kmlFiles[kmlFiles.length - 1]?.name || null;
    }
    
    const targetDate = parseCustomDate(targetDateStr);
    
    // Сначала проверяем точное совпадение
    for (const dateStr of availableDates) {
        if (dateStr === targetDateStr) {
            return dateStr; // Возвращаем точное совпадение
        }
    }
    
    // Если точного совпадения нет, ищем ближайшую более раннюю дату
    let nearestEarlierDate = null;
    let minDiff = Infinity;
    
    for (const dateStr of availableDates) {
        const date = parseCustomDate(dateStr);
        const diff = targetDate - date;
        
        // diff > 0 означает, что date раньше targetDate
        if (diff >= 0 && diff < minDiff) {
            minDiff = diff;
            nearestEarlierDate = dateStr;
        }
    }
    
    // Если не нашли более раннюю дату, возвращаем самую раннюю доступную
    if (!nearestEarlierDate && availableDates.length > 0) {
        // Находим самую раннюю дату
        let earliestDate = null;
        let earliestTime = Infinity;
        
        for (const dateStr of availableDates) {
            const date = parseCustomDate(dateStr);
            if (date.getTime() < earliestTime) {
                earliestTime = date.getTime();
                earliestDate = dateStr;
            }
        }
        return earliestDate;
    }
    
    return nearestEarlierDate || kmlFiles[kmlFiles.length - 1]?.name;
}

// Обновляем функцию findNearestAvailableDate для обратной совместимости (если она используется в других местах)
function findNearestAvailableDate(targetDateStr) {
    // Делегируем новой функции для поиска ближайшей более ранней даты
    return findNearestEarlierDate(targetDateStr);
}

// Инициализация календаря - теперь позволяет выбирать любую дату
let datePicker;
function initDatePicker() {
    // Используем сохраненную дату или текущую дату
    const defaultDate = window.selectedDate || getCurrentDateFormatted();
    
    datePicker = flatpickr("#date-picker", {
        locale: currentLang === 'ru' ? 'ru' : 'default',
        dateFormat: "d.m.y",
        allowInput: true,
        defaultDate: defaultDate, // Используем сохраненную дату
        disableMobile: true,      // ВАЖНО: Отключаем нативный picker на мобильных
        disableMobile: "true",    // Дополнительно для совместимости
        static: true,             // Статическое отображение календаря
        inline: false,            // Не показываем календарь всегда
        minDate: new Date(2022, 0, 1),      // ограничение от 2022
        maxDate: new Date(2030, 11, 31),    // ограничение до 2030
        // Убираем ограничение, чтобы можно было выбрать любую дату
        onChange: function(selectedDates, dateStr) {
            console.log('Дата выбрана в календаре:', dateStr);
            
            // Обновляем selectedDate на выбранную дату
            window.selectedDate = dateStr;
            
            // Обновляем фильтр точек для новой даты
            updatePointsDateFilterForSelectedDate();
            
            // Перезагружаем точки с новым фильтром
            reloadPointsWithCurrentFilter();
            
            // Ищем ближайшую доступную дату (раньше или равную)
            const nearestDate = findNearestEarlierDate(dateStr);
            const index = kmlFiles.findIndex(file => file.name === nearestDate);
            
            if (index !== -1) {
                // Загружаем KML для найденной даты
                loadKmlForNearestDate(index);
            } else {
                console.log('Не найдено ни одной доступной даты для загрузки KML');
            }
        },
        onDayCreate: function(dObj, dStr, fp, dayElem) {
            const today = new Date();
            const isToday = dayElem.dateObj.getDate() === today.getDate() && 
                           dayElem.dateObj.getMonth() === today.getMonth() && 
                           dayElem.dateObj.getFullYear() === today.getFullYear();
            
            if (isToday) {
                dayElem.classList.add('today');
            }
            
            const dateStr = `${dayElem.dateObj.getDate().toString().padStart(2, '0')}.${(dayElem.dateObj.getMonth()+1).toString().padStart(2, '0')}.${dayElem.dateObj.getFullYear().toString().slice(-2)}`;
            
            // Подсвечиваем даты, для которых есть KML файлы
            if (availableDates.includes(dateStr)) {
                dayElem.classList.add('available');
            }
        }
    });
}

//  функция для загрузки KML по ближайшей доступной дате (теперь она загружает более раннюю или равную дату)
async function loadKmlForNearestDate(index) {
    if (index < 0 || index >= kmlFiles.length) return;
    
    try {
        currentIndex = index;
        const file = kmlFiles[currentIndex];
        
        console.log(`Загрузка KML для даты: ${file.name} (запрошена дата: ${window.selectedDate})`);
        
        // Загружаем KML без изменения масштаба
        await loadKmlFile(file);
        
        // Обновляем кнопки навигации
        updateButtons();
    } catch (error) {
        console.error("Ошибка загрузки KML для найденной даты:", error);
    }
}

// Новая функция для перезагрузки точек с текущим фильтром
async function reloadPointsWithCurrentFilter() {
    // Перезагрузка не нужна — переприменяем фильтр по диапазону дат
    if (window.pointsCanvas && window.pointsDateRange) {
        window.pointsCanvas.setDateRange(window.pointsDateRange.start, window.pointsDateRange.end);
    }
}

// Новая функция для обновления фильтра точек при изменении выбранной даты
function updatePointsDateFilterForSelectedDate() {
    // Получаем выбранную дату из календаря
    const currentDate = parseCustomDate(window.selectedDate);
    // Вычисляем начальную дату на основе выбранного диапазона и выбранной даты
    const startDate = getStartDateByRange(currentDateRange, currentDate);
    // Обновляем диапазон дат и перефильтровываем модель (без перезагрузки KML)
    window.pointsDateRange.start = startDate;
    window.pointsDateRange.end = currentDate;
    if (window.pointsCanvas) window.pointsCanvas.setDateRange(startDate, currentDate);
    // Если слой подразделений активен, обновляем его с новой датой
    if (window.reloadUnitsUaLayer) {
        window.reloadUnitsUaLayer();
    }
}

// Функция для проверки валидности координат
function isValidCoordinate(value, isLatitude) {
    const num = parseFloat(value);
    if (isNaN(num)) return false;
    if (isLatitude) return num >= -90 && num <= 90;
    return num >= -180 && num <= 180;
}

// Функция обновления отображения текущего центра
function updateCurrentCenterDisplay() {
    // Проверка на доступность карты
    if (!map || !map.getCenter || !currentCenterCoordsElement) return;
    
    const center = map.getCenter();
    if (center.lat === 0 && center.lng === 0) return; // Игнорируем нулевые координаты
    
    // обновление лейбла
    currentCenterCoordsElement.textContent =
        `${center.lat.toFixed(6)}, ${center.lng.toFixed(6)}`;
        
    // Обновляем клон лейбла для дартс-меню
    const cloneCoords = document.getElementById('current-center-coords-clone');
    if (cloneCoords) {
        cloneCoords.textContent = `${center.lat.toFixed(6)}, ${center.lng.toFixed(6)}`;
    }
}

// функция заполнения списка городов
function populateCitiesDropdown() {
    // Проверяем, что элемент существует
    if (!citiesDropdown) {
        console.error("Элемент cities-dropdown не найден");
        return;
    }
    
    // Очищаем список, кроме первого элемента
    while (citiesDropdown.options.length > 1) {
        citiesDropdown.remove(1);
    }
    
    // Проверяем наличие данных о городах
    if (!cities || !cities.length) {
        console.error("Данные о городах отсутствуют");
        return;
    }
    
    // Добавляем города на текущем языке
    cities.forEach(city => {
        const option = document.createElement('option');
        option.value = city.name.ru; // Сохраняем русское название как значение
        option.textContent = city.name[currentLang] || city.name.ru;
        citiesDropdown.appendChild(option);
    });
}

function parseCoordinateString(str) {
    if (!str) return null;

    // Нормализуем строку: убираем мусор, приводим к верхнему регистру
    let cleaned = str
        .trim()
        .toUpperCase()
        .replace(/[‘'′]/g, "'")
        .replace(/[“”″]/g, '"')
        .replace(/[°º˚]/g, '°')
        .replace(/\s+/g, ' ')
        .replace(/С(\.|\s)?Ш(\.)?/g, 'N')
        .replace(/Ю(\.|\s)?Ш(\.)?/g, 'S')
        .replace(/З(\.|\s)?Д(\.)?/g, 'W')
        .replace(/В(\.|\s)?Д(\.)?/g, 'E')
        .replace(/[^0-9A-Z°'" .,;\-]/g, '')
        .trim();

    let match;

    // Поддержка дробей с запятой: 47,574318,35,412388
    // Заменим все запятые на точки, но только если есть ровно 2
    const numCommas = (str.match(/,/g) || []).length;
    if (numCommas === 2 && str.indexOf('.') === -1) {
        cleaned = str.replace(/,/g, '.').replace(/\s+/g, ' ');
    }

    // Попробуем распарсить как два десятичных числа с любым разделителем
    const decimalRegex = /^(-?\d{1,2}(?:[.,]\d+))\s*[,;\s]\s*(-?\d{1,3}(?:[.,]\d+))$/;
    if ((match = cleaned.match(decimalRegex))) {
        const lat = parseFloat(match[1].replace(',', '.'));
        const lon = parseFloat(match[2].replace(',', '.'));
        return [lat, lon];
    }

    // Десятичные координаты с полушариями (47.574318° N 35.412388° E)
    const hemisphericalDecimalRegex = /^(\d{1,2}(?:[.,]\d+)?)°?\s*([NS])\s+(\d{1,3}(?:[.,]\d+)?)°?\s*([EW])$/;
    if ((match = cleaned.match(hemisphericalDecimalRegex))) {
        const lat = parseFloat(match[1].replace(',', '.')) * (match[2] === 'S' ? -1 : 1);
        const lon = parseFloat(match[3].replace(',', '.')) * (match[4] === 'W' ? -1 : 1);
        return [lat, lon];
    }

    // DMS координаты (47°56'53"N 36°33'13"E)
    const dmsRegex = /([NS])?\s*(\d{1,2})°\s*(\d{1,2})'?\s*(\d{1,2}(?:[.,]\d+)?)?"?\s*([NS])?\s*([EW])?\s*(\d{1,3})°\s*(\d{1,2})'?\s*(\d{1,2}(?:[.,]\d+)?)?"?\s*([EW])?/;
    if ((match = cleaned.match(dmsRegex))) {
        const latDir = match[1] || match[5] || 'N';
        const lonDir = match[6] || match[10] || 'E';

        const latDeg = parseFloat(match[2]);
        const latMin = parseFloat(match[3]);
        const latSec = parseFloat(match[4].replace(',', '.'));

        const lonDeg = parseFloat(match[7]);
        const lonMin = parseFloat(match[8]);
        const lonSec = parseFloat(match[9].replace(',', '.'));

        const lat = (latDeg + latMin / 60 + latSec / 3600) * (latDir === 'S' ? -1 : 1);
        const lon = (lonDeg + lonMin / 60 + lonSec / 3600) * (lonDir === 'W' ? -1 : 1);

        return [lat, lon];
    }

    // Русские десятичные координаты (N 47,574318 E 35,412388)
    const russianDecimalRegex = /^(\d{1,2}(?:[.,]\d+)?)°?\s*N\s+(\d{1,3}(?:[.,]\d+)?)°?\s*E$/;
    if ((match = cleaned.match(russianDecimalRegex))) {
        const lat = parseFloat(match[1].replace(',', '.'));
        const lon = parseFloat(match[2].replace(',', '.'));
        return [lat, lon];
    }

    return null;
}










// Добавляем функцию для обновления видимости кнопок копирования
function updateCopyButtonsVisibility() {
    const coordsInput = document.getElementById('coords-input');
    const coordsClone = document.getElementById('coords-input-clone');
    
    const externalCopyBtn = document.getElementById('copy-coords-external-btn');
    const externalCopyBtnClone = document.getElementById('copy-coords-external-btn-clone');
    
    // Обновляем состояние для основного поля
    if (coordsInput && externalCopyBtn) {
        const hasValue = coordsInput.value.trim().length > 0;
        externalCopyBtn.disabled = !hasValue;
        externalCopyBtn.style.display = 'inline-flex'; // Всегда показываем
    }
    
    // Обновляем состояние для клона
    if (coordsClone && externalCopyBtnClone) {
        const hasValue = coordsClone.value.trim().length > 0;
        externalCopyBtnClone.disabled = !hasValue;
        externalCopyBtnClone.style.display = 'inline-flex'; // Всегда показываем
    }
}
// Инициализация видимости кнопок при загрузке
document.addEventListener('DOMContentLoaded', function() {
    // Ждем немного для инициализации всех элементов
    setTimeout(() => {
        updateCopyButtonsVisibility();
    }, 100);
});

// Также обновляем видимость при изменении размера окна (на случай перестроения интерфейса)
window.addEventListener('resize', function() {
    updateCopyButtonsVisibility();
});

// Функция центрирования карты по координатам
let highlightMarker = null;
let highlightTimeout = null;
let highlightAnimationInterval = null;
let isProgrammaticChange = false;

function centerMap(lat, lng, zoom = 14) {    
    map.setView([lat, lng], zoom);
    
    // Устанавливаем флаг программного изменения
    isProgrammaticChange = true;
    
    // Обновляем все поля ввода координат
    const coordValue = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    
    // Основное поле ввода
    const coordsInput = document.getElementById('coords-input');
    if (coordsInput) coordsInput.value = coordValue;
    
    // Клон поля ввода для дартс-меню
    const coordsClone = document.getElementById('coords-input-clone');
    if (coordsClone) coordsClone.value = coordValue;
    
    // Обновляем видимость кнопок копирования
    updateCopyButtonsVisibility();
    
    // Сбрасываем флаг после обновления значений
    setTimeout(() => {
        isProgrammaticChange = false;
    }, 100);
    
    // Принудительно обновляем видимость внешних кнопок копирования
    const externalCopyBtn = document.getElementById('copy-coords-external-btn');
    const externalCopyBtnClone = document.getElementById('copy-coords-external-btn-clone');
    
    if (externalCopyBtn) externalCopyBtn.style.display = 'inline-flex';
    if (externalCopyBtnClone) externalCopyBtnClone.style.display = 'inline-flex';

    // Очищаем предыдущие элементы
    if (highlightMarker) {
        map.removeLayer(highlightMarker);
        highlightMarker = null;
    }
    if (highlightTimeout) {
        clearTimeout(highlightTimeout);
        highlightTimeout = null;
    }

    // Создаем кастомную иконку
    const customIcon = L.icon({
        iconUrl: 'img/mapMarker.png',
        iconSize: [100, 100],
        iconAnchor: [50, 50],
        popupAnchor: [0, 0],
        className: 'fixed-marker'
    });

    // Создаем маркер
    highlightMarker = L.marker([lat, lng], {
        icon: customIcon,
        draggable: true,
        autoPan: true
    }).addTo(map);

    // Обработчик события перетаскивания маркера
    highlightMarker.on('drag', function(e) {
        const position = highlightMarker.getLatLng();
        const newLat = position.lat;
        const newLng = position.lng;
        
        // Устанавливаем флаг программного изменения
        isProgrammaticChange = true;
        
        // Обновляем все поля ввода координат
        const coordValue = `${newLat.toFixed(6)}, ${newLng.toFixed(6)}`;
        
        // Основное поле ввода
        const coordsInput = document.getElementById('coords-input');
        if (coordsInput) coordsInput.value = coordValue;
        
        // Клон поля ввода для дартс-меню
        const coordsClone = document.getElementById('coords-input-clone');
        if (coordsClone) coordsClone.value = coordValue;
        
        // Обновляем видимость кнопок копирования
        updateCopyButtonsVisibility();
        
        // Сбрасываем флаг после обновления значений
        setTimeout(() => {
            isProgrammaticChange = false;
        }, 100);
    });
}

// Функция для очистки маркера и полей ввода
function clearMarkerAndInput() {
 if (highlightMarker) {
        highlightMarker.off('drag');
        map.removeLayer(highlightMarker);
        highlightMarker = null;
    }
    if (highlightTimeout) {
        clearTimeout(highlightTimeout);
        highlightTimeout = null;
    }
    
    // Устанавливаем флаг программного изменения
    isProgrammaticChange = true;
    
    // Очищаем оба поля ввода координат
    const coordsInput = document.getElementById('coords-input');
    const coordsClone = document.getElementById('coords-input-clone');
    
    if (coordsInput) coordsInput.value = '';
    if (coordsClone) coordsClone.value = '';
    
    // Обновляем видимость кнопок копирования
    updateCopyButtonsVisibility();
    
    // Сбрасываем флаг после очистки
    setTimeout(() => {
        isProgrammaticChange = false;
    }, 100);
}

///////////////////////////////////////////////////////////////////////////////

// Вспомогательные функции для парсинга (должны быть доступны для постоянных и временных слоев)
function parseLineStyle(style) {
    const lineStyle = style.querySelector('LineStyle');
    if (!lineStyle) return null;
    
    const colorElement = lineStyle.querySelector('color');
    const rawColor = colorElement ? colorElement.textContent : null;
    const width = parseFloat(lineStyle.querySelector('width')?.textContent || '0');
    
    return {
        rawColor: rawColor,
        color: rawColor ? parseColor(rawColor) : '#3388ff',
        weight: width,
        opacity: rawColor ? parseOpacity(rawColor) : 1
    };
}

function parsePolyStyle(style) {
    const polyStyle = style.querySelector('PolyStyle');
    if (!polyStyle) return null;

    const colorElement = polyStyle.querySelector('color');
    const rawColor = colorElement ? colorElement.textContent : null;

    return {
        rawColor: rawColor,
        fillColor: rawColor ? parseColor(rawColor) : '#3388ff',
        fillOpacity: rawColor ? parseOpacity(rawColor) : 0.5
    };
}

function parseCoordinates(element, crs) {
  // Строка из поля — одна пара [lat, lng]
  if (typeof element === 'string') {
    const val = element.trim();
    if (!val) return [];
    if (typeof parseCoordinateString === 'function') {
      const tuple = parseCoordinateString(val);
      return Array.isArray(tuple) && tuple.length >= 2 ? [tuple[0], tuple[1]] : [];
    }
    const m = val.match(/(-?\d+(?:[\.,]\d+)?)[\s,]+(-?\d+(?:[\.,]\d+)?)/);
    if (!m) return [];
    const lat = parseFloat(m[1].replace(',', '.'));
    const lng = parseFloat(m[2].replace(',', '.'));
    return [lat, lng];
  }

  // KML-элемент — массив пар [[lat, lng], ...]
  const coordinates = element?.querySelector('coordinates')?.textContent;
  if (!coordinates) return [];
  return coordinates
    .trim()
    .split(/\s+/)
    .map(coord => {
      const parts = coord.split(',');
      if (parts.length < 2) return null;
      const lng = parseFloat(parts[0]);
      const lat = parseFloat(parts[1]);
      if (Number.isNaN(lat) || Number.isNaN(lng)) return null;
      return [lat, lng];
    })
    .filter(Boolean);
}

function parseColor(kmlColor) {
    if (!kmlColor) return '#3388ff';
    const a = kmlColor.substr(0, 2);
    const b = kmlColor.substr(2, 2);
    const g = kmlColor.substr(4, 2);
    const r = kmlColor.substr(6, 2);
    return `#${r}${g}${b}`;
}

function parseOpacity(kmlColor) {
    if (!kmlColor) return 1;
    const alpha = parseInt(kmlColor.substr(0, 2), 16) / 255;
    return Number(alpha.toFixed(2));
}


window.permanentLayerGroups = []; // Храним группы слоёв

// Конфигурация стилей для KML-файлов
window.kmlStyleModes = {
    // Стиль по умолчанию - из KML файла
    DEFAULT: 'kml',
    
    // Заданные стили
    STYLE_MG:   'styleMG', // Для мультиполигональных файлов
    STYLE_RUAF: 'styleRuAF', // Для файлов из RuAF
    STYLE_AFU:  'styleAFU',  // Для файлов из AFU
    STYLE_CITIES: 'styleCities' // Для городов
};

// Определение стилей
window.kmlStyles = {
    [window.kmlStyleModes.STYLE_MG]: {
        polygon: {
            color: '#ffffff', // Обводка для видимости
            weight: 5, // Толщина линии
            fillColor: '#999999', //Заливка
            fillOpacity: 0.25, //  Непрозрачность
            interactive: INTERACTIVE
        },
        polyline: {
            color: '#ffffff', // Цвет линии
            weight: 5, // Толщина линии
            opacity: 1,
            interactive: INTERACTIVE
        }
    },
    [window.kmlStyleModes.STYLE_RUAF]: {
        polygon: {
            color: '#ff0000',
            weight: 0.1,
            fillColor: '#ff0000',
            fillOpacity: 0.2,
            interactive: INTERACTIVE
        },
        polyline: {
            color: '#ff0000',
            weight: 4,
            opacity: 0.8,
            interactive: INTERACTIVE
        }
    },
    [window.kmlStyleModes.STYLE_AFU]: {
        polygon: {
            color: '#0000ff',
            weight: 0.1,
            fillColor: '#0000ff',
            fillOpacity: 0.2,
            interactive: INTERACTIVE
        },
        polyline: {
            color: '#0000ff',
            weight: 4,
            opacity: 0.8,
            interactive: INTERACTIVE
        }
    },
    [window.kmlStyleModes.STYLE_CITIES]: {
        polygon: {
            color: '#ffffff',      // цвет обводки
            weight: 1,             // толщина обводки
            fillColor: '#999999',   // цвет заливки
            fillOpacity: 0.25,      // прозрачность заливки
            interactive: INTERACTIVE
        },
        polyline: {
            color: '#ffffff',
            weight: 1,
            opacity: 1,
            interactive: INTERACTIVE
        }
    }
};

// Функция для определения режима стиля по пути или содержимому файла
async function getStyleModeForFile(filePath) {
    // Сначала проверяем путь для RuAF/AFU (старый метод)
    if (filePath.includes('/RuAF/'))
        return window.kmlStyleModes.STYLE_RUAF;
    else if (filePath.includes('/AFU/')) 
        return window.kmlStyleModes.STYLE_AFU;
    else if (filePath.includes('/Progress/')) {
        return window.kmlStyleModes.DEFAULT;
    }
        
    if (filePath.includes('CitiesBorders.kml')) {
        return window.kmlStyleModes.STYLE_CITIES;
    }
        
    // Для остальных файлов проверяем содержимое на мультигеометрию
    try {
        const response = await fetch(filePath);
        if (!response.ok) return window.kmlStyleModes.DEFAULT;
        
        const kmlText = await response.text();
        const parser = new DOMParser();
        const kmlDoc = parser.parseFromString(kmlText, "text/xml");
        
        // Проверяем наличие MultiGeometry в файле
        const hasMultiGeometry = kmlDoc.querySelector('MultiGeometry') !== null;
        
        if (hasMultiGeometry) {
            // Для мультигеометрии проверяем, есть ли description с указанием стороны
            const placemarks = kmlDoc.querySelectorAll('Placemark');
            for (const placemark of placemarks) {
                const description = placemark.querySelector('description');
                if (description && (description.textContent.includes('ВС РФ') || 
                                    description.textContent.includes('ВСУ'))) {
                    return window.kmlStyleModes.DEFAULT;
                }
            }
            // Если description нет, но есть мультигеометрия - используем STYLE_MG
            // return window.kmlStyleModes.STYLE_MG;
            return window.kmlStyleModes.DEFAULT;
        }
    } catch (error) {
        console.error(`Ошибка проверки файла на мультигеометрию: ${filePath}`, error);
    }
    
    // Если ничто из этого - берём стиль из файла
    return window.kmlStyleModes.DEFAULT;
}

// Функция для определения стиля на основе description
function getStyleModeFromDescription(descriptionElement) {
    if (!descriptionElement || !descriptionElement.textContent) return null;
    
    const descText = descriptionElement.textContent.trim();
    
    if (descText.includes('ВС РФ') || descText.includes('РФ') || 
        descText.includes('RuAF') || descText.includes('RU')) {
        return window.kmlStyleModes.STYLE_RUAF;
    } else if (descText.includes('ВСУ') || descText.includes('AFU') || 
               descText.includes('УК') || descText.includes('UA')) {
        return window.kmlStyleModes.STYLE_AFU;
    }
    
    return null;
}

// Обрабатываем обычные стили
function parseStyleFromKmlDoc(kmlDoc)
{
    const styles = {};
    kmlDoc.querySelectorAll('Style').forEach(style => {
        const id = style.getAttribute('id');
        styles[id] = {
            line: parseLineStyle(style),
            poly: parsePolyStyle(style)
        };
    });
    return styles;
}

// Обрабатываем StyleMap
function parseStyleMapFromKmlDoc(kmlDoc)
{
    const styleMaps = {};
    kmlDoc.querySelectorAll('StyleMap').forEach(styleMap => {
        const id = styleMap.getAttribute('id');
        const pairs = {};
        styleMap.querySelectorAll('Pair').forEach(pair => {
            const key = pair.querySelector('key').textContent;
            const styleUrl = pair.querySelector('styleUrl').textContent.replace('#', '');
            pairs[key] = styleUrl;
        });
        styleMaps[id] = pairs;
    });
    return styleMaps;
}

// Обработка Placemarks
function parsePlacemarksFromKmlDoc(kmlDoc, styles, styleMaps, layerGroup, styleMode = window.kmlStyleModes.DEFAULT, iconGetter = getPointIcon, isInteractive = true) {
    let bounds = L.latLngBounds(); // Инициализация пустыми границами
    let elementCount = 0;
    
    // Вспомогательная функция для привязки тултипа при наведении
    function bindTooltipOnHover(layer, name) {
	    // Сохраняем исходный стиль для сброса
	    layer._originalStyle = { ...layer.options };
	    
	    // Подсветка при наведении (всегда)
	    layer.on('mouseover', function() {
	        this.setStyle({
	            weight: (this._originalStyle.weight || 0) + 3,
	            color: '#ff0000',
	            fillColor: '#ff0000',
				opacity: 0.15,        // для линий
				fillOpacity: 0.15     // для полигонов
	        });
	    });
	    layer.on('mouseout', function() {
	        this.setStyle(this._originalStyle);
	    });
	    
	    // Если есть имя – добавляем тултип
	    if (name && name.trim() !== '' && !name.includes('Control_')) {
	        let tooltipText = name.replace(/<[^>]*>/g, '');
	        layer.bindTooltip(tooltipText, {
	            sticky: true,
	            direction: 'auto',
	            offset: [0, 0]
	        });
	        
	        layer.on('mouseover', function(ev) {
	            console.log(`mouseover на "${name}"`);
	            this.openTooltip();
	            setTimeout(() => {
	                if (!this.isTooltipOpen()) {
	                    console.warn(`Тултип не открылся для "${name}"`);
	                    this.unbindTooltip();
	                    this.bindTooltip(tooltipText, { sticky: true, direction: 'auto', offset: [0,0] });
	                    this.openTooltip();
	                }
	            }, 10);
	        });
	        layer.on('mouseout', function() {
	            this.closeTooltip();
	        });
	    } else {
	        // Для объектов без имени – просто лог (опционально)
	        layer.on('mouseover', () => console.log(`mouseover on: "${name || 'unnamed'}"`));
	    }
	}
    
    kmlDoc.querySelectorAll('Placemark').forEach(placemark => {
        // Получаем описание для определения стиля
        const descriptionElement = placemark.querySelector('description');
        const descriptionStyleMode = getStyleModeFromDescription(descriptionElement);
        
        // Определяем финальный стиль для этого placemark
        // Приоритет: стиль из description > стиль из файла (styleMode)
        let placemarkStyleMode = descriptionStyleMode || styleMode;
        
        // Если у нас DEFAULT и есть мультигеометрия без description, используем STYLE_MG
        const hasMultiGeometry = placemark.querySelector('MultiGeometry') !== null;
        if (placemarkStyleMode === window.kmlStyleModes.DEFAULT && hasMultiGeometry && !descriptionStyleMode) {
            // placemarkStyleMode = window.kmlStyleModes.STYLE_MG;
        }
        
        // Получаем стиль для Placemark из KML
        const styleUrl = placemark.querySelector('styleUrl')?.textContent.replace('#', '');
        let style = { line: {}, poly: {} };
        
        if (styleUrl) {
            // Проверяем StyleMap
            if (styleMaps[styleUrl]) {
                const normalStyleId = styleMaps[styleUrl].normal;
                if (styles[normalStyleId]) {
                    style.line = styles[normalStyleId].line || {};
                    style.poly = styles[normalStyleId].poly || {};
                }
            }
            else if (styles[styleUrl]) { // Проверяем обычный стиль
                style.line = styles[styleUrl].line || {};
                style.poly = styles[styleUrl].poly || {};
            }
        }
        
        // Получаем название для Placemark
        const name = placemark.querySelector('name')?.textContent;

        // Логирование
        if (LOG_STYLES) {
            console.groupCollapsed(`Placemark styles: ${placemark.querySelector('name')?.textContent || 'unnamed'}`);
            console.log('Name:', name);
            console.log('Description:', descriptionElement?.textContent);
            console.log('Style URL:', styleUrl);
            console.log('Style mode from file:', styleMode);
            console.log('Style mode from description:', descriptionStyleMode);
            console.log('Final style mode:', placemarkStyleMode);
            console.log('Has MultiGeometry:', hasMultiGeometry);
        }

        function parseAndAddPolygon(polygon, useStyleMode = placemarkStyleMode) {
            const coords = parseCoordinates(polygon.querySelector('LinearRing'), map.options.crs);
            if (coords.length < 3) {
                if (LOG_STYLES) console.log(`Polygon skipped - insufficient coordinates: ${coords.length}`);
                return;
            }

            let polyStyle = {};
            
            if (useStyleMode === window.kmlStyleModes.DEFAULT) {
                // Для DEFAULT используем стили из KML или базовые
                polyStyle = {
                    color: style.line.color || '#3388ff',
                    weight: style.line.weight || 0,
                    fillColor: style.poly.fillColor || '#3388ff',
                    fillOpacity: style.poly.fillOpacity || 0.5,
                    interactive: INTERACTIVE
                };
            } else {
                // Для заданных стилей (STYLE_RUAF, STYLE_AFU, STYLE_MG) используем предопределенные
                const styleConfig = window.kmlStyles[useStyleMode];
                if (styleConfig && styleConfig.polygon) {
                    polyStyle = styleConfig.polygon;
                } else {
                    polyStyle = {
                        color: '#3388ff',
                        weight: 0,
                        fillColor: '#3388ff',
                        fillOpacity: 0.5,
                        interactive: INTERACTIVE
                    };
                }
            }

			const finalInteractive = isInteractive && INTERACTIVE;
			polyStyle.interactive = finalInteractive;
			polyStyle.pane = isInteractive ? 'interactive' : 'nonInteractive';

            // Создаем полигон
            const poly = L.polygon(coords, polyStyle).addTo(layerGroup);
                        
            // Обновляем границы                
            if (poly.getBounds().isValid()) {
                bounds.extend(poly.getBounds());
            }
            // Добавляем метку
            bindTooltipOnHover(poly, name);

            // Логирование информации о полигоне
            if (LOG_STYLES) {
                console.log(`Polygon #${++elementCount}:`);
                console.log('- Coordinates count:', coords.length);
                console.log('- Applied styles:', polyStyle);
                console.log('- Style mode:', useStyleMode);
            }
            
            return poly;
        }
        
        function parseAndAddLineString(lineString, useStyleMode = placemarkStyleMode) {
            const coords = parseCoordinates(lineString, map.options.crs);
            if (coords.length < 2) {
                if (LOG_STYLES) console.log(`LineString skipped - insufficient coordinates: ${coords.length}`);
                return;
            }
                
            let lineStyle = {};                
            
            if (useStyleMode === window.kmlStyleModes.DEFAULT) {
                lineStyle = {
                    color: style.line.color || '#3388ff',
                    weight: style.line.weight || 3,
                    opacity: style.line.opacity || 1,
                    interactive: INTERACTIVE
                };
            } else {
                const styleConfig = window.kmlStyles[useStyleMode];
                if (styleConfig && styleConfig.polyline) {
                    lineStyle = styleConfig.polyline;
                } else {
                    lineStyle = {
                        color: '#3388ff',
                        weight: 3,
                        opacity: 1,
                        interactive: INTERACTIVE
                    };
                }
            }

			
			const finalInteractive = isInteractive && INTERACTIVE;
			lineStyle.interactive = finalInteractive;
			lineStyle.pane = isInteractive ? 'interactive' : 'nonInteractive';

            const polyline = L.polyline(coords, lineStyle).addTo(layerGroup);

            // Обновляем границы    
            if (polyline.getBounds().isValid()) {
                bounds.extend(polyline.getBounds());
            }
            // Добавляем метку
            bindTooltipOnHover(polyline, name);

            // Логирование информации о линии
            if (LOG_STYLES) {
                console.log(`LineString #${++elementCount}:`);
                console.log('- Coordinates count:', coords.length);
                console.log('- Applied styles:', lineStyle);
                console.log('- Style mode:', useStyleMode);
            }
            return polyline;
        }


        // Функция для создания HTML-контента popup
        function createPopupContent(params) {
            const {
                formattedName,
                date,
                equipmentType,
                coordsString,
                descriptionUrl,
                isEquipment = false,
                isAttackOnUa = false, // Новый параметр для атак на Украину
                extendedData = {} // Новый параметр для всех данных ExtendedData
            } = params;
            
            // Обрабатываем случай атак на Украину
            if (isAttackOnUa) {
                // Извлекаем данные для атак на Украину
                const objectType = extendedData['Тип объекта'] || extendedData['object_type'] || equipmentType;
                const weaponType = extendedData['Средства поражения'] || extendedData['weapon_type'];
                const attackDate = extendedData['Дата'] || extendedData['date'] || date;
                const description = extendedData['описание'] || extendedData['description'] || '';
                const link = extendedData['Ссылка'] || extendedData['link'] || '';
                
                return `
                    ${formattedName ? `<div class="popup-title" style="white-space: pre-wrap; font-weight: bold; margin-bottom: 8px;">${formattedName}</div>` : ''}
                    ${description ? `<div class="popup-description" style="margin-bottom: 8px; white-space: pre-wrap;">${description}</div>` : ''}
                    <div class="popup-details" style="font-size: 14px; line-height: 1.4;">
                        ${objectType ? `<div><strong>Тип объекта:</strong> ${objectType}</div>` : ''}
                        ${attackDate ? `<div><strong>Дата:</strong> ${attackDate}</div>` : ''}
                        ${weaponType ? `<div><strong>Средство поражения:</strong> ${weaponType}</div>` : ''}
                        <div style="display: flex; align-items: center; gap: 8px; margin-top: 4px;">
                            <strong>Координаты:</strong> 
                            <span style="font-family: monospace;">${coordsString}</span>
                            <button class="copy-coords-popup-btn" data-coords="${coordsString}" 
                                    style="cursor: pointer; background: #007bff; color: white; border: none; border-radius: 3px; padding: 2px 6px; font-size: 12px;">
                                ⎘
                            </button>
                        </div>
                        ${link ? `<div style="margin-top: 6px;"><a href="${link}" target="_blank" style="color: #007bff; text-decoration: none; font-weight: bold;">📝 Подробная информация</a></div>` : ''}
                    </div>
                `;
            }
            // Обрабатываем случай техники (без изменений)
            else if (isEquipment && extendedData && Object.keys(extendedData).length > 0) {
                // Собираем все поля из extendedData, кроме "Тип техники" который уже выводится отдельно
                let extendedInfoHTML = '';
                
                // Обрабатываем каждое поле из extendedData
                for (const [key, value] of Object.entries(extendedData)) {
                    // Пропускаем поля
                    if (['Тип техники', 'equipment_type',
                         'object_type',
                         'описание', 'description', 
                         'дата', 'date', 'Датировано',
                         'позиция', 'position', 'Координаты точки', 'coordinates'].includes(key)) {
                        continue;
                    }
                    
                    // Для поля "Координаты" добавляем кнопку копирования
                    if (key === 'Координаты' || key === 'coordinates') {
                        extendedInfoHTML += `
                            <div style="margin-top: 4px;">
                                <strong>${key}:</strong> 
                                <span style="font-family: monospace;">${value}</span>
                                <button class="copy-coords-popup-btn" data-coords="${value}" 
                                        style="cursor: pointer; background: #007bff; color: white; border: none; border-radius: 3px; padding: 2px 6px; font-size: 12px; margin-left: 8px;">
                                    ⎘
                                </button>
                            </div>`;
                    } 
                    // Для полей с URL выводим как ссылку
                    else if (typeof value === 'string' && (value.startsWith('http://') || value.startsWith('https://'))) {
                        // Извлекаем домен для отображения
                        const url = new URL(value);
                        const domain = url.hostname;
                        extendedInfoHTML += `
                            <div style="margin-top: 4px;">
                                <strong>${key}:</strong> 
                                <a href="${value}" target="_blank" style="color: #007bff; text-decoration: none;">
                                    ${domain}
                                </a>
                            </div>`;
                    }
                    // Для остальных полей просто текст
                    else {
                        extendedInfoHTML += `<div style="margin-top: 4px;"><strong>${key}:</strong> ${value}</div>`;
                    }
                }
                
                return `
                    ${formattedName ? `<div class="popup-title" style="white-space: pre-wrap; font-weight: bold; margin-bottom: 8px;">${formattedName}</div>` : ''}
                    <div class="popup-details" style="font-size: 14px; line-height: 1.4;">
                        ${date ? `<div><strong>Датировано:</strong> ${date}</div>` : ''}
                        ${equipmentType ? `<div><strong>Тип техники:</strong> ${equipmentType}</div>` : ''}
                        ${descriptionUrl ? `<div style="margin-top: 4px;"><strong>Описание:</strong> ${descriptionUrl}</div>` : ''}
                        ${extendedInfoHTML}
                    </div>
                `;
            } 
            // Старый формат для обычных точек
            else {                
                const position = equipmentType;
                return `
                ${formattedName ? `<div class="popup-title" style="white-space: pre-wrap; font-weight: bold; margin-bottom: 8px;">${formattedName}</div>` : ''}
                <div class="popup-details" style="font-size: 14px; line-height: 1.4;">
                    ${date ? `<div><strong>Дата:</strong> ${date}</div>` : ''}
                    ${position ? `<div><strong>Позиция:</strong> ${position}</div>` : ''}
                    <div style="display: flex; align-items: center; gap: 8px; margin-top: 4px;">
                        <strong>Координаты:</strong> 
                        <span style="font-family: monospace;">${coordsString}</span>
                        <button class="copy-coords-popup-btn" data-coords="${coordsString}" 
                                style="cursor: pointer; background: #007bff; color: white; border: none; border-radius: 3px; padding: 2px 6px; font-size: 12px;">
                            ⎘
                        </button>
                    </div>
                    ${descriptionUrl ? `<div style="margin-top: 6px;"><a href="${descriptionUrl}" target="_blank" style="color: #007bff; text-decoration: none; font-weight: bold;">📝 Подробная информация</a></div>` : ''}
                </div>
            `;
            }
        }

        // Формирование модели точки (без DOM) для canvas-слоя
        function buildPointModel(lat, lng, category, date, name, descriptionUrl, extendedData, iconGetter) {
            const layerType = iconGetter === getMilEquipIcon ? 'equipment'
                            : iconGetter === getAttacksOnUaIcon ? 'attacks' : 'points';
            const iconKey = category || 'default';
            const formattedName = formatNameWithLinks(name);
            const coordsString = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
            const isEquipment = iconGetter === getMilEquipIcon;
            const isAttackOnUa = iconGetter === getAttacksOnUaIcon;

            const popupHtml = createPopupContent({
                formattedName,
                date,
                equipmentType: category,
                coordsString,
                descriptionUrl,
                isEquipment,
                isAttackOnUa,
                extendedData: isEquipment || isAttackOnUa ? extendedData : {}
            });

            if (!window.__pointSeq) window.__pointSeq = 0;
            const point = {
                id: `${layerType}-${++window.__pointSeq}`,
                layerType,
                category,
                iconKey,
                lat,
                lng,
                date,
                name,
                formattedName,
                coordsString,
                popupHtml,
                extendedData,
                // Сразу применяем фильтр по диапазону дат: иначе до вызова applyFilter
                // (после загрузки всех файлов) redraw успел бы показать все точки
                visible: (layerType === 'points' && date && window.pointsDateRange &&
                          window.pointsDateRange.start && window.pointsDateRange.end)
                    ? isDateInRange(date, window.pointsDateRange.start, window.pointsDateRange.end)
                    : true
            };

            if (!window.pointsModel[layerType]) window.pointsModel[layerType] = [];
            window.pointsModel[layerType].push(point);

            // Совместимость с фильтрами: массивы { marker, category }
            if (layerType === 'equipment') {
                if (!window.allEquipmentMarkers) window.allEquipmentMarkers = [];
                window.allEquipmentMarkers.push({ marker: point, category: category });
            } else if (layerType === 'attacks') {
                if (!window.allAttacksMarkers) window.allAttacksMarkers = [];
                window.allAttacksMarkers.push({ marker: point, category: category });
            }

            if (LOG_STYLES) {
                console.log(`Point added to model:`, { name, date, category, descriptionUrl, coordinates: [lat, lng], iconGetter: iconGetter.name });
            }
            return point;
        }

        // Точка добавляется в модель без DOM; видимость по дате вычисляет pointsCanvas.applyFilter()
        function parseAndAddPoint(pointElement, date, position, descriptionUrl, name, extendedData, iconGetter) {
            const coordinates = parseCoordinates(pointElement, map.options.crs);
            if (coordinates.length < 1) {
                if (LOG_STYLES) console.log(`Point skipped - insufficient coordinates: ${coordinates.length}`);
                return null;
            }

            const [lat, lng] = coordinates[0];

            // Определяем категорию
            let category;
            if (iconGetter === getMilEquipIcon) {
                category = extendedData['Тип техники'] || extendedData['equipment_type'] || position;
            } else if (iconGetter === getAttacksOnUaIcon) {
                category = extendedData['Тип объекта'] || extendedData['object_type'] || position;
            } else {
                category = position;
            }

            return buildPointModel(lat, lng, category, date, name, descriptionUrl, extendedData, iconGetter);
        }

        // Функция для форматирования названия с заменой ссылок на кликабельные
        function formatNameWithLinks(name) 
        {
            if (!name) return '';
            
            // Простая замена паттернов на гиперссылки
            let formatted = name;
            
            // Заменяем "Источник url" на "Источник" (только слово "Источник" становится ссылкой)
            formatted = formatted.replace(/Источник\s+(https?:\/\/[^\s]+)/g, 
                '<a href="$1" target="_blank" style="color: #007bff; text-decoration: none;">Источник</a>');
            
            // Заменяем "Источник 21+ url" на "Источник 21+" (только слова "Источник 21+" становятся ссылкой)
            formatted = formatted.replace(/Источник\s+21\+\s+(https?:\/\/[^\s]+)/g, 
                '<a href="$1" target="_blank" style="color: #007bff; text-decoration: none;">Источник 21+</a>');
            
            // Заменяем "Геопривязка url" на "Геопривязка" (только слово "Геопривязка" становится ссылкой)
            formatted = formatted.replace(/Геопривязка\s+(https?:\/\/[^\s]+)/g, 
                '<a href="$1" target="_blank" style="color: #007bff; text-decoration: none;">Геопривязка</a>');
            
            // Заменяем "Согласно url" на "Согласно..." (только слово "Согласно" становится ссылкой)
            formatted = formatted.replace(/Согласно\s+(https?:\/\/[^\s]+)/g, 
                '<a href="$1" target="_blank" style="color: #007bff; text-decoration: none;">Согласно...</a>');
            
            return formatted;
        }

        // Обработка MultiGeometry
        const multiGeometry = placemark.querySelector('MultiGeometry');
        if (multiGeometry) {
            // Обработка Polygon в MultiGeometry
            multiGeometry.querySelectorAll('Polygon').forEach(polygon => {                
                const poly = parseAndAddPolygon(polygon);
            });

            // Обработка LineString в MultiGeometry
            multiGeometry.querySelectorAll('LineString').forEach(lineString => {
                const polyline = parseAndAddLineString(lineString);
            });
            
            // Обработка Point в MultiGeometry
            multiGeometry.querySelectorAll('Point').forEach(point => {
                const extendedData = parseExtendedData(placemark);
                const date = extendedData['дата'] || extendedData['date'];
                // Для техники используем категорию из "Тип техники"
                const equipmentType = extendedData['Тип техники'] || extendedData['equipment_type'];
                const descriptionUrl = extendedData['описание'] || extendedData['description'];
                
                // Если это слой техники и есть категория, используем ее
                const position = (iconGetter === getMilEquipIcon && equipmentType) ? 
                    equipmentType : 
                    (extendedData['позиция'] || extendedData['position']);
                    
                const pnt = parseAndAddPoint(point, date, position, descriptionUrl, name, extendedData, iconGetter);
            });
        }
		
        // Обработка Polygon (не в MultiGeometry)
        const polygon = placemark.querySelector('Polygon');
        if (polygon && !multiGeometry) {                
            const poly = parseAndAddPolygon(polygon);
        }

        // Обработка LineString (не в MultiGeometry)
        const lineString = placemark.querySelector('LineString');
        if (lineString && !multiGeometry) {
            const polyline = parseAndAddLineString(lineString);
        }
        
        // Обработка Point (не в MultiGeometry)
		const point = placemark.querySelector('Point');
		if (point && !multiGeometry) {
			const extendedData = parseExtendedData(placemark);
			const date = extendedData['дата'] || extendedData['date'];
			const equipmentType = extendedData['Тип техники'] || extendedData['equipment_type'];
			const descriptionUrl = extendedData['описание'] || extendedData['description'];
			const position = (iconGetter === getMilEquipIcon && equipmentType) ? 
				equipmentType : 
				(extendedData['позиция'] || extendedData['position']);
			
			const pnt = parseAndAddPoint(point, date, position, descriptionUrl, name, extendedData, iconGetter);
		}
        
        if (LOG_STYLES) console.groupEnd(); // Закрываем группу Placemark
    });
    
    if (LOG_STYLES) {
        console.log(`Total elements: ${elementCount}`);
        console.groupEnd(); // Закрываем группу слоя
    }
                
    return bounds;
}

// Универсальная функция загрузки KML
async function loadKmlToLayer(filePath, layerGroup, options = {}) {
    const {
        isPermanent = false,
        preserveZoom = true,
        fitBounds = false,
        styleMode = null,
		interactive = null
    } = options;

    try {
        // Определяем режим стиля для файла (либо из параметров, либо автоматически)
        let finalStyleMode = styleMode;
        if (!finalStyleMode) {
            finalStyleMode = await getStyleModeForFile(filePath);
        }
        
        const response = await fetch(filePath);
        if (!response.ok) {
            console.error(`Ошибка загрузки KML (${filePath}): ${response.status}`);
            return { bounds: L.latLngBounds(), layerGroup };
        }

        const kmlText = await response.text();
        const parser = new DOMParser();
        const kmlDoc = parser.parseFromString(kmlText, "text/xml");

        // Общая логика парсинга
        const styles = parseStyleFromKmlDoc(kmlDoc);
        const styleMaps = parseStyleMapFromKmlDoc(kmlDoc);

		let useInteractive = interactive;
	    if (useInteractive === null) {
	        useInteractive = !(filePath.includes('ControlZones') || filePath.includes('Control_'));
	    }
        
        if (LOG_STYLES) {
            console.groupCollapsed(`${isPermanent ? 'Permanent' : 'Temporary'} layer loaded: ${filePath}`);
            console.log('Style mode:', finalStyleMode);
            console.log('Found styles:', styles);
            console.log('Found styleMaps:', styleMaps);
        }

        const bounds = parsePlacemarksFromKmlDoc(kmlDoc, styles, styleMaps, layerGroup, finalStyleMode, getPointIcon, useInteractive);
        
        if (LOG_STYLES) console.groupEnd();
        
        return { layerGroup };
    } catch (error) {
        console.error(`Ошибка загрузки KML: ${filePath}`, error);
        return { layerGroup };
    }
}

// Вспомогательная функция для применения границ
// Для временных слоев
function applyTemporaryLayerBounds(bounds, currentCenter, currentZoom, preserveZoom) {
    if (bounds && bounds.isValid && bounds.isValid()) {
        const sw = bounds.getSouthWest();
        const ne = bounds.getNorthEast();
        const isNotPoint = sw.lat !== ne.lat || sw.lng !== ne.lng;
        
        if (!preserveZoom && isNotPoint) {
            map.fitBounds(bounds);
        } else {
            map.setView(currentCenter, currentZoom);
        }
    } else {
        map.setView(currentCenter, currentZoom);
    }
}
// Для постоянных слоев  
function applyPermanentLayersBounds(allBounds) {
    if (allBounds && allBounds.isValid && allBounds.isValid()) {
        map.fitBounds(allBounds);
    }
    // Если границы невалидны - ничего не делаем, оставляем текущий вид
}

// Функция загрузки основного KML (с сохранением оригинальных стилей)
async function loadKmlFile(file, targetCRS) {
    // Создаём новый слой, но пока не добавляем на карту
    const newLayer = L.layerGroup();

    try {
        // Загружаем все KML-файлы для этой даты в новый слой
        const loadPromises = file.paths.map(path => 
            loadKmlToLayer(path, newLayer, {
                isPermanent: false,
                preserveZoom: preserveZoom,
                fitBounds: false
            })
        );

        // Ждём полной загрузки всех файлов
        await Promise.all(loadPromises);

        // Теперь новый слой готов – добавляем его на карту
        newLayer.addTo(map);

        // Удаляем старый слой, если он существовал
        if (currentLayer) {
            map.removeLayer(currentLayer);
        }

        // Обновляем ссылку на текущий слой
        currentLayer = newLayer;

        // Применяем границы (если нужно) – оставляем как было
        preserveZoom = true;
    } catch (error) {
        console.error("loadKmlFile: ${file.path} ", error);
        // В случае ошибки удаляем новый слой, если он был создан
        if (newLayer) map.removeLayer(newLayer);
    }
}


// Функция загрузки постоянных KML-слоев
async function loadPermanentKmlLayers() {
    try {
        console.log("Начало загрузки постоянных слоев");
        
        if (!window.permanentLayers || !Array.isArray(window.permanentLayers)) {
            console.error("window.permanentLayers не определен или не является массивом");
            return;
        }
        
        console.log("Найдено постоянных слоев:", window.permanentLayers.length);

        // Удаляем старые постоянные слои
        if (window.permanentLayerGroups && window.permanentLayerGroups.length) {
            window.permanentLayerGroups.forEach(layer => map.removeLayer(layer));
            window.permanentLayerGroups = [];
        }

        // Последовательная загрузка постоянных слоев (чтобы избежать параллельных запросов)
        window.permanentLayerGroups = [];
        
        for (const layerData of window.permanentLayers) {
            if (!layerData.path) {
                console.error("Отсутствует путь для постоянного слоя:", layerData);
                continue;
            }
            
            console.log("Загрузка постоянного слоя:", layerData.path);
            
            try {
                const layerGroup = L.layerGroup();
                // Не передаем styleMode - будет определен автоматически
                const result = await loadKmlToLayer(layerData.path, layerGroup, {
                    isPermanent: true,
                    preserveZoom: true,
                    fitBounds: false
                });

                // Добавляем слой на карту после успешной загрузки
                layerGroup.addTo(map);
                window.permanentLayerGroups.push(layerGroup);
                
            } catch (error) {
                console.error(`Ошибка обработки слоя ${layerData.path}:`, error);
            }
        }
        
    } catch (error) {
        console.error("Ошибка загрузки постоянных KML слоев:", error);
    }
}




async function reloadKmlForCRS(center, zoom) {
    await loadPermanentKmlLayers();
    if (currentLayer){        
        const file = kmlFiles[currentIndex];
        try {
            map.removeLayer(currentLayer);
            await loadKmlFile(file);
        } catch (error) {
            console.error("Ошибка перезагрузки KML:", error);
        }
    }
        
    // Восстанавливаем позицию с проверкой валидности
    if (center && zoom && center.lat !== 0 && center.lng !== 0) {
        map.setView(center, zoom);
    }
    
    map.invalidateSize();
}

// Функция для проверки, попадает ли дата в диапазон
function isDateInRange(dateString, startDate, endDate) {
    try {
        const parts = dateString.split('.');
        if (parts.length !== 3) return false;
        
        const year = parseInt(parts[0]);
        const month = parseInt(parts[1]) - 1;
        const day = parseInt(parts[2]);
        
        const pointDate = new Date(year, month, day);
        return pointDate >= startDate && pointDate <= endDate;
    } catch (error) {
        console.error('Ошибка парсинга даты:', dateString, error);
        return false;
    }
}

// Функция для получения иконки точки на основе позиции
// Карты URL — в window.ICON_MAPS (js/data.js)
function getPointIcon(position) {
    const iconUrls = window.ICON_MAPS.points || {};
    const iconUrl = iconUrls[position] || iconUrls.default || 'img/exclamation.svg';
    
    return L.icon({
        iconUrl: iconUrl,
        iconSize: [20, 14], // размер иконки флага
        iconAnchor: [10, 7], // точка привязки
        popupAnchor: [0, 0] // смещение для popup
    });
}

function getMilEquipIcon(position) {
    const iconUrls = window.ICON_MAPS.equipment || {};
    const iconUrl = iconUrls[position] || iconUrls.default || 'img/logo.png';
    
    return L.icon({
        iconUrl: iconUrl,
        iconSize: [28, 28], // размер иконки
        iconAnchor: [14, 14], // точка привязки
        popupAnchor: [0, 0] // смещение для popup
    });
}


function getAttacksOnUaIcon(position) {
    const iconUrls = window.ICON_MAPS.attacks || {};
    const iconUrl = iconUrls[position] || iconUrls.default || 'img/attack types/Взрывчик.png';
    
    return L.icon({
        iconUrl: iconUrl,
        iconSize: [28, 28], // размер иконки
        iconAnchor: [14, 14], // точка привязки
        popupAnchor: [0, 0] // смещение для popup
    });
}


// Функция для извлечения данных из ExtendedData
function parseExtendedData(placemark) {
    const extendedData = placemark.querySelector('ExtendedData');
    const data = {};
    
    if (extendedData) {
        extendedData.querySelectorAll('Data').forEach(dataElement => {
            const name = dataElement.getAttribute('name');
            const value = dataElement.querySelector('value')?.textContent;
            if (name && value) {
                // Сохраняем с оригинальным именем
                data[name] = value;
                // Также добавляем англоязычные альтернативы для совместимости
                if (name === 'Тип техники') {
                    data['equipment_type'] = value;
                } else if (name === 'Тип объекта') {
                    data['object_type'] = value;
                } else if (name === 'позиция') {
                    data['position'] = value;
                } else if (name === 'дата') {
                    data['date'] = value;
                } else if (name === 'Датировано') {
                    data['date'] = value;
                } else if (name === 'описание') {
                    data['description'] = value;
                } else if (name === 'Координаты') {
                    data['coordinates'] = value;
                }
            }
        });
    }
    
    return data;
}


// Функция для загрузки KML с точками (с поддержкой разных типов иконок)
async function loadPointsFromKml(filePath, layerGroup, options = {}) {
    const {
        iconGetter = getPointIcon, // По умолчанию используем getPointIcon
        isEquipment = false // Флаг для техники
    } = options;

    try {
        const response = await fetch(filePath);
        if (!response.ok) {
            console.error(`Ошибка загрузки KML с точками (${filePath}): ${response.status}`);
            return;
        }

        const kmlText = await response.text();
        const parser = new DOMParser();
        const kmlDoc = parser.parseFromString(kmlText, "text/xml");

        if (LOG_STYLES) {
            console.groupCollapsed(`Points layer loaded: ${filePath} ${isEquipment ? '(техника)' : ''}`);
        }

        // Загружаем только точки с указанной функцией получения иконок
        const bounds = parsePlacemarksFromKmlDoc(kmlDoc, {}, {}, layerGroup, window.kmlStyleModes.DEFAULT, iconGetter);
        
        if (LOG_STYLES) {
            const total = window.pointsModel
                ? Object.keys(window.pointsModel).reduce((sum, k) => sum + window.pointsModel[k].length, 0)
                : 0;
            console.log(`Total points loaded from ${filePath}: ${total}`);
            console.groupEnd();
        }
        
        return bounds;
    } catch (error) {
        console.error(`Ошибка загрузки KML с точками: ${filePath}`, error);
    }
}

// Функция для инициализации слоя с точками из нескольких файлов
async function initPointsLayer(kmlFilePaths) {
    // Если передана строка, преобразуем в массив
    if (typeof kmlFilePaths === 'string') {
        kmlFilePaths = [kmlFilePaths];
    }

    window.pointsModel.points = [];
    if (!window.pointsCanvas && window.CanvasPointsLayer) {
        window.pointsCanvas = new window.CanvasPointsLayer(window.POINTS_CANVAS_OPTIONS || {}).addTo(map);
    }
    // Throwaway layerGroup: линии/полигоны из KML добавляются в группу, не помещённую на карту
    const throwawayGroup = L.layerGroup();
    for (const path of kmlFilePaths) {
        await loadPointsFromKml(path, throwawayGroup);
    }
    if (window.pointsCanvas) window.pointsCanvas.applyFilter();
    return window.pointsCanvas;
}

// Функция для инициализации слоя с техникой
async function initMilequipLayer(kmlFilePaths) {
    window.allEquipmentMarkers = []; // очищаем старые маркеры
    
    // Если передана строка, преобразуем в массив
    if (typeof kmlFilePaths === 'string') {
        kmlFilePaths = [kmlFilePaths];
    }

    window.pointsModel.equipment = [];
    if (!window.pointsCanvas && window.CanvasPointsLayer) {
        window.pointsCanvas = new window.CanvasPointsLayer(window.POINTS_CANVAS_OPTIONS || {}).addTo(map);
    }
    const throwawayGroup = L.layerGroup();
    for (const path of kmlFilePaths) {
        await loadPointsFromKml(path, throwawayGroup, { iconGetter: getMilEquipIcon, isEquipment: true });
    }
    if (window.pointsCanvas) window.pointsCanvas.applyFilter();
    console.log(`Загружено техники (canvas): ${window.pointsModel.equipment.length} точек`);
    return window.pointsCanvas;
}


// Функция для инициализации слоя с атаками на Украину
async function initAttacksOnUaLayer(kmlFilePaths) {
    // Если передана строка, преобразуем в массив
    if (typeof kmlFilePaths === 'string') {
        kmlFilePaths = [kmlFilePaths];
    }

    window.pointsModel.attacks = [];
    if (!window.pointsCanvas && window.CanvasPointsLayer) {
        window.pointsCanvas = new window.CanvasPointsLayer(window.POINTS_CANVAS_OPTIONS || {}).addTo(map);
    }
    const throwawayGroup = L.layerGroup();
    for (const path of kmlFilePaths) {
        await loadPointsFromKml(path, throwawayGroup, { iconGetter: getAttacksOnUaIcon, isEquipment: true });
    }
    if (window.pointsCanvas) window.pointsCanvas.applyFilter();
    console.log(`Загружено атак (canvas): ${window.pointsModel.attacks.length} точек`);
    return window.pointsCanvas;
}
/*
// Функция для инициализации слоя с фортификационными линиями (поддержка .kml и .geojson)
async function initFortificationLayer(kmlFilePaths) {
    // Если передана строка, преобразуем в массив
    if (typeof kmlFilePaths === 'string') {
        kmlFilePaths = [kmlFilePaths];
    }
    
    // Удаляем старые слои фортификаций, если они существуют
    if (window.fortificationLayers && window.fortificationLayers.length) {
        window.fortificationLayers.forEach(layer => {
            if (map.hasLayer(layer)) {
                map.removeLayer(layer);
            }
        });
        window.fortificationLayers = [];
    }
    
    // Создаём новую группу слоёв для фортификаций
    const fortificationLayerGroup = L.layerGroup();
    
    // Загружаем все файлы (KML или GeoJSON) в группу
    for (const path of kmlFilePaths) {
        const ext = path.split('.').pop().toLowerCase();
        
        if (ext === 'geojson' || ext === 'json') {
            // Загрузка GeoJSON
            try {
                const response = await fetch(path);
                if (!response.ok) {
                    console.error(`Ошибка загрузки GeoJSON (${path}): ${response.status}`);
                    continue;
                }
                const geojsonData = await response.json();
                
                // Опции стиля (можно взять из свойств GeoJSON или задать свои)
                const geoJsonLayer = L.geoJSON(geojsonData, {
                    style: function(feature) {
                        // Используем свойства из файла, если есть
                        return {
                            color: feature.properties?.stroke || '#ff0000',
                            weight: feature.properties?.['stroke-width'] || 2,
                            opacity: feature.properties?.['stroke-opacity'] || 1,
                            // можно добавить другие параметры
                        };
                    },
                    onEachFeature: function(feature, layer) {
                        // Если нужно добавить всплывающее окно с именем
                        if (feature.properties && feature.properties.name) {
                            layer.bindPopup(feature.properties.name);
                        }
                    }
                });
                
                geoJsonLayer.addTo(fortificationLayerGroup);
                console.log(`Загружен GeoJSON: ${path}, объектов: ${geoJsonLayer.getLayers().length}`);
                
            } catch (error) {
                console.error(`Ошибка загрузки GeoJSON: ${path}`, error);
            }
        } else {
            // Старая загрузка KML
            await loadKmlToLayer(path, fortificationLayerGroup, {
                isPermanent: false,
                preserveZoom: true,
                fitBounds: false
                // styleMode не указываем — используется DEFAULT
            });
        }
    }
    
    // Сохраняем группу в глобальном массиве
    window.fortificationLayers.push(fortificationLayerGroup);
    
    console.log(`Загружено слоёв фортификаций: ${window.fortificationLayers.length}, объектов: ${fortificationLayerGroup.getLayers().length}`);
    
    return fortificationLayerGroup;
}
*/
// Функция для вычисления даты начала на основе текущей даты и диапазона
function getStartDateByRange(rangeType, baseDate = null) {
    // Используем переданную дату или текущую дату
    const date = baseDate || parseCustomDate(window.selectedDate) || new Date();
    let result = new Date(date);
    
    switch(rangeType) {
        case 'week':
            result.setDate(result.getDate() - 7);
            break;
        case 'month':
            result.setMonth(result.getMonth() - 1);
            break;
        case '3months':
            result.setMonth(result.getMonth() - 3);
            break;
        case 'year':
            result.setFullYear(result.getFullYear() - 1);
            break;
        case 'all':
            result = new Date(2022, 2, 24);
            break;
        default:
            result.setDate(result.getDate() - 7); // По умолчанию 1 неделя
    }
    
    result.setDate(result.getDate() + 1); // включаем сегодня
    
    return result;
}

// Функция для инициализации кнопок фильтров
function initFilterButtons() {
    console.log('Инициализация фильтров...');
    
    const dateRangeBtn = document.getElementById('date-range-btn');
    const dateRangeDropdown = document.getElementById('date-range-dropdown');
    const rangeOptions = document.querySelectorAll('.range-option');
    
    if (!dateRangeBtn || !dateRangeDropdown) {
        console.error('Не найдены элементы фильтра:', {dateRangeBtn, dateRangeDropdown});
        return;
    }
    
    console.log('Элементы фильтра найдены');
    
    // Обработчик клика на кнопку фильтра дат
    dateRangeBtn.addEventListener('click', function(e) {
        console.log('Кнопка фильтра нажата');
        e.stopPropagation();
        e.preventDefault();
        dateRangeDropdown.classList.toggle('show');
        console.log('Класс show:', dateRangeDropdown.classList.contains('show'));
    });
    
    // Обработчик клика на опции диапазона
    rangeOptions.forEach(option => {
        option.addEventListener('click', function() {
            const range = this.getAttribute('data-range');
            
            // Убираем активный класс со всех опций
            rangeOptions.forEach(opt => opt.classList.remove('active'));
            // Добавляем активный класс выбранной опции
            this.classList.add('active');
            
            // Сохраняем выбранный диапазон
            currentDateRange = range;
            
            // Обновляем заголовок кнопки (можно добавить иконку или текст)
            updateDateRangeButtonTitle();
            
            // Применяем фильтр - используем выбранную дату из календаря
            updatePointsDateFilter();
            
            // Закрываем выпадающий список
            dateRangeDropdown.classList.remove('show');
        });
    });
    
    // Устанавливаем активную опцию по умолчанию
    document.querySelector(`.range-option[data-range="${currentDateRange}"]`)?.classList.add('active');
    
    // Обновляем заголовок кнопки
    updateDateRangeButtonTitle();
    
    // Закрытие выпадающего списка при клике вне его
    document.addEventListener('click', function(e) {
        if (!dateRangeBtn.contains(e.target) && !dateRangeDropdown.contains(e.target)) {
            dateRangeDropdown.classList.remove('show');
        }
    });
    
    // Обработчики для неактивных кнопок (для отладки)
    document.querySelectorAll('.filter-btn.disabled').forEach(btn => {
        btn.addEventListener('click', function() {
            console.log('Кнопка фильтра в разработке');
            // Можно добавить временный функционал для отладки
            alert('Эта функция находится в разработке');
        });
    });
    
    // Инициализация состояния кнопки
    updateDateRangeButtonTitle();
    
    // Применяем начальный фильтр
    updatePointsDateFilter();
}

// Функция для инициализации мобильного меню фильтров
function initMobileFilterMenu() {
    console.log('Инициализация мобильного меню фильтров...');
    
    const mobileFilterToggle = document.getElementById('mobile-filter-toggle');
    const filterButtons = document.querySelector('.filter-buttons');
    const dateRangeBtn = document.getElementById('date-range-btn');
    const dateRangeDropdown = document.getElementById('date-range-dropdown');
    
    if (!mobileFilterToggle || !filterButtons || !dateRangeBtn || !dateRangeDropdown) {
        console.error('Не найдены элементы мобильного фильтра');
        return;
    }
    
    console.log('Элементы мобильного фильтра найдены');
    
    // Флаг для отслеживания состояния
    let isDateDropdownOpen = false;
    
    // Функция для открытия/закрытия мобильного меню
    function toggleMobileFilterMenu() {
        const isVisible = filterButtons.classList.contains('show-mobile');
        
        if (isVisible) {
            // Закрываем меню
            mobileFilterToggle.classList.remove('active');
            filterButtons.classList.remove('show-mobile');
            
            // Также закрываем выпадающий список диапазонов
            dateRangeDropdown.classList.remove('show');
            isDateDropdownOpen = false;
        } else {
            // Открываем меню
            mobileFilterToggle.classList.add('active');
            filterButtons.classList.add('show-mobile');
        }
    }
    
    // Функция для открытия/закрытия выпадающего списка диапазонов
    function toggleDateRangeDropdown(e) {
        e.preventDefault();
        e.stopPropagation();
        
        const isVisible = dateRangeDropdown.classList.contains('show');
        
        // if (isVisible) {
            // // Закрываем выпадающий список
            // dateRangeDropdown.classList.remove('show');
            // isDateDropdownOpen = false;
        // } else {
            // Открываем выпадающий список
            dateRangeDropdown.classList.add('show');
            isDateDropdownOpen = true;
            
            // Позиционируем выпадающий список относительно кнопки
            const rect = dateRangeBtn.getBoundingClientRect();
            dateRangeDropdown.style.left = '0';
            dateRangeDropdown.style.top = rect.height + 'px';
        // }
    }
    
    // Обработчик клика на кнопку переключения
    mobileFilterToggle.addEventListener('click', function(e) {
        e.stopPropagation();
        toggleMobileFilterMenu();
    });
    
    // Обработчик клика на date-range-btn
    dateRangeBtn.addEventListener('click', function(e) {
        // Открываем только выпадающий список диапазонов
        toggleDateRangeDropdown(e);
        
        // НЕ закрываем основное меню - позволяем пользователю выбрать диапазон
        // Не вызываем stopImmediatePropagation(), так как можем иметь другие обработчики
    });
    
    // Обработчик для опций диапазона
    dateRangeDropdown.querySelectorAll('.range-option').forEach(option => {
        option.addEventListener('click', function(e) {
            e.stopPropagation();
            
            // Выполняем выбор диапазона (ваш существующий код)
            const range = this.getAttribute('data-range');
            const rangeOptions = dateRangeDropdown.querySelectorAll('.range-option');
            
            // Убираем активный класс со всех опций
            rangeOptions.forEach(opt => opt.classList.remove('active'));
            // Добавляем активный класс выбранной опции
            this.classList.add('active');
            
            // Сохраняем выбранный диапазон
            currentDateRange = range;
            
            // Обновляем заголовок кнопки
            updateDateRangeButtonTitle();
            
            // Применяем фильтр
            updatePointsDateFilter();
            
            // Закрываем выпадающий список
            dateRangeDropdown.classList.remove('show');
            isDateDropdownOpen = false;
            
            // Не закрываем основное меню фильтров
            // (оставляем его открытым, чтобы пользователь мог выполнить другие действия)
        });
    });
    
    // Обработчик клика на другие кнопки фильтров (кроме date-range-btn)
    filterButtons.querySelectorAll('.filter-btn:not(#date-range-btn)').forEach(btn => {
        btn.addEventListener('click', function(e) {
            // Для остальных кнопок закрываем мобильное меню
            toggleMobileFilterMenu();
        });
    });
    
    // Закрытие при клике вне области
    document.addEventListener('click', function(e) {
        const isMobileFilterToggle = mobileFilterToggle.contains(e.target);
        const isFilterButtons = filterButtons.contains(e.target);
        const isDateRangeBtn = dateRangeBtn.contains(e.target);
        const isDateRangeDropdown = dateRangeDropdown.contains(e.target);
        
        // Если выпадающий список диапазонов открыт и клик был вне его
        if (isDateDropdownOpen && !isDateRangeDropdown && !isDateRangeBtn) {
            dateRangeDropdown.classList.remove('show');
            isDateDropdownOpen = false;
        }
        
        // Если клик был вне всех элементов мобильного фильтра
        if (!isMobileFilterToggle && !isFilterButtons && !isDateRangeDropdown && !isDateRangeBtn) {
            if (mobileFilterToggle.classList.contains('active')) {
                toggleMobileFilterMenu();
            }
        }
    });
    
    // Также закрываем при нажатии Escape
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            if (isDateDropdownOpen) {
                dateRangeDropdown.classList.remove('show');
                isDateDropdownOpen = false;
            } else if (mobileFilterToggle.classList.contains('active')) {
                toggleMobileFilterMenu();
            }
        }
    });
    
    // Обработчик изменения размера окна
    window.addEventListener('resize', function() {
        // На широких экранах убеждаемся, что всё закрыто
        if (window.innerWidth > 768) {
            if (mobileFilterToggle.classList.contains('active')) {
                toggleMobileFilterMenu();
            }
        }
    });
    
    console.log('Мобильное меню фильтров инициализировано');
}


// Функция для обновления заголовка кнопки фильтра дат
function updateDateRangeButtonTitle() {
    const dateRangeBtn = document.getElementById('date-range-btn');
    if (!dateRangeBtn) return;
    
    const titles = {
        'week': '1 неделя',
        'month': '1 месяц',
        '3months': '3 месяца',
        'year': '1 год',
        'all': 'Все'
    };
    
    dateRangeBtn.title = titles[currentDateRange] || 'Фильтр по дате';
}

// Функция для обновления фильтра точек по дате
async function updatePointsDateFilter() {
    // Получаем выбранную дату из календаря
    const currentDate = parseCustomDate(window.selectedDate);
    // Вычисляем начальную дату на основе выбранного диапазона и выбранной даты
    const startDate = getStartDateByRange(currentDateRange, currentDate);
    // Обновляем диапазон дат и перефильтровываем модель (без перезагрузки KML)
    window.pointsDateRange.start = startDate;
    window.pointsDateRange.end = currentDate;
    if (window.pointsCanvas) window.pointsCanvas.setDateRange(startDate, currentDate);
}

// Навигация к определенному индексу (для кнопок навигации по KML файлам)
async function navigateTo(index) {
    if (index < 0 || index >= kmlFiles.length) return;
    
    try {        
        currentIndex = index;
        const file = kmlFiles[currentIndex];
        
        // Обновляем selectedDate на дату KML файла
        window.selectedDate = file.name;
        
        if (datePicker) {
            datePicker.setDate(window.selectedDate, false);
        }
        
        // Загружаем KML без изменения масштаба
        await loadKmlFile(file);
        
        // Обновляем фильтр точек для новой даты
        if (window.pointsDateRange) {
            await updatePointsDateFilter();
        }
        
    } catch (error) {
        console.error("Ошибка навигации:", error);
    } finally {
        updateButtons();
        // Обновляем слой подразделений при смене даты
        if (window.reloadUnitsUaLayer) {
            window.reloadUnitsUaLayer();
        }
    }
}

// Обновление состояния кнопок
function updateButtons() {
    console.log(`Updating buttons for index: ${currentIndex} of ${kmlFiles.length - 1}`);
    const firstBtn = document.getElementById('first-btn');
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    const lastBtn = document.getElementById('last-btn');
    
    if (!firstBtn || !prevBtn || !nextBtn || !lastBtn) return;
    
    // Получаем сегодняшнюю дату
    const today = getCurrentDateFormatted();
    
    // Проверяем, выбрана ли в календаре сегодняшняя дата
    const isToday = window.selectedDate === today;
    
    // Проверяем, есть ли более поздние доступные даты
    const hasNextAvailableDate = findNextAvailableDate(kmlFiles[currentIndex]?.name) !== null;
    
    // Проверяем, есть ли более ранние доступные даты
    const hasPreviousAvailableDate = findPreviousAvailableDate(kmlFiles[currentIndex]?.name) !== null;
    
    // Проверяем, самая ли это первая доступная дата
    const isFirstAvailable = currentIndex === 0;
    
    // Определяем состояние кнопок
    firstBtn.disabled = isFirstAvailable;
    prevBtn.disabled = !hasPreviousAvailableDate;
    nextBtn.disabled = isToday;
    lastBtn.disabled = isToday; // Кнопка "сегодня" отключена, если уже сегодня
    
    firstBtn.classList.toggle('disabled', isFirstAvailable);
    prevBtn.classList.toggle('disabled', !hasPreviousAvailableDate);
    nextBtn.classList.toggle('disabled', isToday);
    lastBtn.classList.toggle('disabled', isToday);
    
    console.log(`First: ${firstBtn.disabled}, Prev: ${prevBtn.disabled}, Next: ${nextBtn.disabled}, Last: ${lastBtn.disabled}`);
    console.log(`Today: ${today}, SelectedDate: ${window.selectedDate}, isToday: ${isToday}`);
}

// Обработчики кнопок навигации
document.getElementById('first-btn').addEventListener('click', async () => {
    const currentDateStr = window.selectedDate;
    if (!currentDateStr) return;

    const currentDate = parseCustomDate(currentDateStr);
    const targetDate = new Date(currentDate);
    targetDate.setFullYear(targetDate.getFullYear() - 1);

    // Форматируем целевую дату в DD.MM.YY
    const day = String(targetDate.getDate()).padStart(2, '0');
    const month = String(targetDate.getMonth() + 1).padStart(2, '0');
    const year = String(targetDate.getFullYear()).slice(-2);
    const targetDateStr = `${day}.${month}.${year}`;

    const nearestDate = findNearestEarlierDate(targetDateStr);
    if (!nearestDate) {
        console.warn('Не найдено доступных дат для года назад');
        return;
    }

    const index = kmlFiles.findIndex(file => file.name === nearestDate);
    if (index === -1) {
        console.warn('Не найден индекс для даты', nearestDate);
        return;
    }

    await navigateTo(index);
});

document.getElementById('prev-btn').addEventListener('click', async () => {
    // Находим все доступные даты, которые меньше выбранной даты в календаре
    const selectedDateObj = parseCustomDate(window.selectedDate);
    let previousDate = null;
    let minDiff = Infinity;
    
    // Ищем ближайшую дату слева от выбранной
    for (const dateStr of availableDates) {
        const date = parseCustomDate(dateStr);
        const diff = selectedDateObj - date;
        
        // diff > 0 означает, что date раньше selectedDate
        if (diff > 0 && diff < minDiff) {
            minDiff = diff;
            previousDate = dateStr;
        }
    }
    
    if (previousDate) {
        // Находим индекс предыдущей даты
        const prevIndex = kmlFiles.findIndex(file => file.name === previousDate);
        
        if (prevIndex !== -1) {
            // Обновляем selectedDate на предыдущую дату
            window.selectedDate = previousDate;
            
            // Обновляем календарь
            if (datePicker) {
                datePicker.setDate(window.selectedDate, false);
            }
            
            // Загружаем KML для предыдущей даты
            await navigateTo(prevIndex);
        }
    }
});

document.getElementById('next-btn').addEventListener('click', async () => {
    // Получаем сегодняшнюю дату
    const today = getCurrentDateFormatted();
    
    // Получаем следующую доступную дату
    let nextDate = findNextAvailableDate(window.selectedDate);
    
    // Если следующей доступной даты нет, но мы на последней сводке - переходим на сегодня
    if (!nextDate && currentIndex === kmlFiles.length - 1) {
        nextDate = today;
    }
    
    if (nextDate) {
        // Определяем, нужно ли переходить на сегодняшнюю дату
        if (nextDate === today) {
            // Устанавливаем календарь на сегодня
            window.selectedDate = today;
            
            if (datePicker) {
                datePicker.setDate(today, false);
            }
            
            // Находим ближайшую доступную дату к сегодняшней
            const nearestDate = findNearestAvailableDate(today);
            const index = kmlFiles.findIndex(file => file.name === nearestDate);
            
            if (index !== -1) {
                await loadKmlForNearestDate(index);
            }
        } else {
            // Переходим на следующую доступную дату
            const index = kmlFiles.findIndex(file => file.name === nextDate);
            
            if (index !== -1) {
                // Обновляем selectedDate на следующую дату
                window.selectedDate = nextDate;
                
                if (datePicker) {
                    datePicker.setDate(window.selectedDate, false);
                }
                
                // Загружаем KML для следующей даты
                await loadKmlForNearestDate(index);
            }
        }
        
        // Обновляем фильтр точек
        updatePointsDateFilterForSelectedDate();
        await reloadPointsWithCurrentFilter();
    }
    
    // Обновляем состояние кнопок
    updateButtons();
});


document.getElementById('last-btn').addEventListener('click', async () => {
    // Получаем текущую дату
    const today = getCurrentDateFormatted();
    
    // Находим ближайшую доступную дату к сегодняшней
    const nearestDate = findNearestAvailableDate(today);
    
    // Находим индекс ближайшей доступной даты
    const index = kmlFiles.findIndex(file => file.name === nearestDate);
    
    if (index !== -1) {
        // Обновляем selectedDate на сегодняшнюю дату
        window.selectedDate = today;
        
        // Обновляем календарь на сегодняшнюю дату
        if (datePicker) {
            datePicker.setDate(today, false);
        }
        
        // Загружаем KML для ближайшей доступной даты
        await loadKmlForNearestDate(index);
        
        // Обновляем фильтр точек для новой даты
        updatePointsDateFilterForSelectedDate();
        
        // Перезагружаем точки с новым фильтром
        await reloadPointsWithCurrentFilter();
        
        // Обновляем состояние кнопок
        updateButtons();
    } else {
        console.log('Не найдено доступных дат для загрузки');
        // Если нет доступных дат, переходим на последнюю сводку
        await navigateTo(kmlFiles.length - 1);
    }
});

// Функция для поиска ближайшей доступной даты слева от указанной
function findPreviousAvailableDate(targetDateStr) {
    if (!targetDateStr || availableDates.length === 0) return null;
    
    const targetDate = parseCustomDate(targetDateStr);
    let previousDate = null;
    let minDiff = Infinity;
    
    for (const dateStr of availableDates) {
        const date = parseCustomDate(dateStr);
        const diff = targetDate - date;
        
        // diff > 0 означает, что date раньше targetDate
        if (diff > 0 && diff < minDiff) {
            minDiff = diff;
            previousDate = dateStr;
        }
    }
    
    return previousDate;
}

// Функция для поиска ближайшей доступной даты справа от указанной
function findNextAvailableDate(targetDateStr) {
    if (!targetDateStr || availableDates.length === 0) return null;
    
    const targetDate = parseCustomDate(targetDateStr);
    let nextDate = null;
    let minDiff = Infinity;
    
    for (const dateStr of availableDates) {
        const date = parseCustomDate(dateStr);
        const diff = date - targetDate;
        
        // diff > 0 означает, что date позже targetDate
        if (diff > 0 && diff < minDiff) {
            minDiff = diff;
            nextDate = dateStr;
        }
    }
    
    return nextDate;
}




// Заполнение выпадающего списка городов
// Обработчик выбора города
document.getElementById('cities-dropdown').addEventListener('change', async function() {
    const selectedCityName = this.value;
    if (!selectedCityName) return;
    
    const city = cities.find(c => c.name.ru === selectedCityName);
    if (city) {
        // Обновляем все поля ввода
        const coordsInput = document.getElementById('coords-input');
        const coordsClone = document.getElementById('coords-input-clone');
        
        if (coordsInput) coordsInput.value = `${city.lat}, ${city.lng}`;
        if (coordsClone) coordsClone.value = `${city.lat}, ${city.lng}`;
        
        centerMap(city.lat, city.lng);
        this.value = "";
    }
});

// Обработчик выбора города
citiesDropdown.addEventListener('change', function() {
    const selectedCityName = this.value;
    if (!selectedCityName) return;
    
    const city = cities.find(c => c.name === selectedCityName);
    if (city) {
        // Заполняем поле координат
        coordsInput.value = `${city.lat}, ${city.lng}`;
        centerMap(city.lat, city.lng);
        
        // Сбрасываем выбор
        this.value = "";
    }
});

// обработчик перемещения карты
map.on('moveend', function() {
    updateCurrentCenterDisplay();
});

// Функция для установки обработчика копирования
function setupCopyCoordsButton() {
    function copyHandler(event) {
        // Определяем, из какого контекста вызвано копирование
        const isClone = event.target.id === 'copy-coords-btn-clone';
        
        let coordsElement;
        if (isClone) {
            coordsElement = document.getElementById('current-center-coords-clone');
        } else {
            coordsElement = document.getElementById('current-center-coords');
        }
        
        if (!coordsElement) return;
        
        const coords = coordsElement.textContent;
        if (!coords || coords.includes('не определен') || coords.includes('undefined')) {
            return;
        }
        
        const button = event.target;
        const t = translations[currentLang];
        
        try {
            // Создаем временный элемент для копирования
            const textArea = document.createElement('textarea');
            textArea.value = coords;
            textArea.style.position = 'fixed';
            textArea.style.opacity = 0;
            document.body.appendChild(textArea);
            textArea.select();
            
            const successful = document.execCommand('copy');
            document.body.removeChild(textArea);
            
            // Визуальная обратная связь
            button.textContent = t ? t.copiedText : '✓';
            button.classList.add('copied');
            
            setTimeout(() => {
                if (button.dataset.originalText) {
                    button.textContent = button.dataset.originalText;
                }
                button.classList.remove('copied');
            }, 2000);
            
            if (!successful) {
                throw new Error('Copy command failed');
            }
        } catch (err) {
            console.error('Ошибка копирования:', err);
            button.textContent = t ? t.copyError : 'Ошибка!';
            setTimeout(() => {
                if (button.dataset.originalText) {
                    button.textContent = button.dataset.originalText;
                }
                button.classList.remove('copied');
            }, 2000);
        }
    }

    // Для основной кнопки
    const mainCopyBtn = document.getElementById('copy-coords-btn');
    if (mainCopyBtn) {
        // Сохраняем исходный текст
        mainCopyBtn.dataset.originalText = mainCopyBtn.textContent;
        mainCopyBtn.removeEventListener('click', copyHandler);
        mainCopyBtn.addEventListener('click', copyHandler);
    }
    
    // Для кнопки в дартс-меню
    const cloneCopyBtn = document.getElementById('copy-coords-btn-clone');
    if (cloneCopyBtn) {
        // Сохраняем исходный текст
        cloneCopyBtn.dataset.originalText = cloneCopyBtn.textContent;
        cloneCopyBtn.removeEventListener('click', copyHandler);
        cloneCopyBtn.addEventListener('click', copyHandler);
    }
}

function getDeepLinkViewFromUrl() {
  const params = new URLSearchParams(location.search);
  const lat = parseFloat(params.get('lat'));
  const lng = parseFloat(params.get('lng') ?? params.get('lon'));
  const zoom = parseInt(params.get('zoom') ?? params.get('z'), 10);

  if (Number.isNaN(lat) || Number.isNaN(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;

  return {
    lat,
    lng,
    zoom: Number.isNaN(zoom) ? 14 : zoom,
  };
}

async function init() {
  // const deepLink = getDeepLinkViewFromUrl();

  try {
    // Шаг 1: Загружаем постоянные слои
    await loadPermanentKmlLayers();

    // Проверяем, что kmlFiles сгенерирован правильно
    console.log('KML файлов загружено:', window.kmlFiles.length);

    // Шаг 2: Инициализируем selectedDate текущей датой
    window.selectedDate = getCurrentDateFormatted();
    console.log('Установлена текущая дата:', window.selectedDate);

    // Шаг 3: Инициализируем календарь с текущей датой
    initDatePicker();

    // Шаг 4: Инициализируем точки
    // Инициализируем диапазон дат для точек
    window.pointsDateRange = window.pointsDateRange || { start: null, end: null };
    // Устанавливаем начальный диапазон (1 неделя) на основе текущей даты
    const currentDate = parseCustomDate(window.selectedDate);
    const startDate = getStartDateByRange('week', currentDate);

    window.pointsDateRange.start = startDate;
    window.pointsDateRange.end = currentDate;

    // Загружаем точки с фильтром по дате
    await initPointsLayer(window.pointsKmlPaths);

    // Шаг 5: Инициализация кнопок фильтров
    initFilterButtons();
    initMobileFilterMenu();

    initUnitsUaButton();

    // Кнопка полноэкранного режима
    initFullscreenControl();

    // Шаг 6: Инициализируем другие UI компоненты
    populateCitiesDropdown();
    document.querySelector('.date-navigator-wrapper').style.display = 'block';

    // Шаг 7: Ждем когда все элементы интерфейса будут доступны
    await waitForUIElements();

    // Шаг 8: Находим и загружаем ближайший доступный KML к текущей дате
    const nearestDate = findNearestAvailableDate(window.selectedDate);
    const nearestIndex = kmlFiles.findIndex(file => file.name === nearestDate);

    if (nearestIndex !== -1) {
        currentIndex = nearestIndex;
        console.log(`Загружаем KML для ближайшей доступной даты: ${nearestDate} (индекс: ${nearestIndex})`);

        // Загружаем данные карты
        preserveZoom = true;
        await loadKmlForNearestDate(nearestIndex);
    } else {
        console.log('Не найдено доступных KML файлов для загрузки');
    }
	
	// Маркер при загрузке координат из url
    const urlCoords = getUrlCoords();
    if (urlCoords) {
      centerMap(urlCoords.lat, urlCoords.lng, urlCoords.zoom);
    }

    // Шаг 9: Финализируем инициализацию карты
    setTimeout(() => {
      if (map) map.invalidateSize();
      updateCurrentCenterDisplay();
    }, 50);

    map.options.crs = L.CRS.EPSG3857;

    const flagInterval = setInterval(() => {
    if (document.querySelector('.leaflet-control-attribution')) {
        replaceAttributionFlag();
        clearInterval(flagInterval);
        }
    }, 500);

    // Настройка кнопки после инициализации элементов
    setTimeout(() => {
        setupCopyCoordsButton();
        addCopyButtonsToInputs(); // Добавляем инициализацию кнопок копирования
        updateCopyButtonsVisibility(); // Инициализируем состояние кнопок
    }, 500);

    // Инициализация дартс-меню
    initDartMenu();

    // Для выпадающего списка слоёв (подложек)
    // таймаут при инициализации карты, чтобы убедиться, что все элементы созданы
    setTimeout(() => {
        if (map) map.invalidateSize();
        updateCurrentCenterDisplay();

        // Явно инициализируем обработчик после создания элементов
        const toggleBtn = document.querySelector('.leaflet-control-layers-toggle');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();

                const isVisible = layerControlContainer.style.display === 'block';
                layerControlContainer.style.display = isVisible ? 'none' : 'block';
                layerControlContainer.classList.toggle('leaflet-control-layers-expanded', !isVisible);
            });
        }
    }, 300);


    // Инициализация поиска по названию
    initSearchFunctionality();

    // обработчик для кнопки техники
    const milEquipBtn = document.getElementById('mil-equip-btn');
    if (milEquipBtn) {
        milEquipBtn.addEventListener('click', window.toggleEquipmentMenu);
    }
    const attacksOnUaBtn = document.getElementById('attacks-on-ua-btn');
    if (attacksOnUaBtn) {
        attacksOnUaBtn.addEventListener('click', window.toggleAttacksMenu);
    }
    // Построить меню фильтра техники
    window.initFilters();

    // обработчик для кнопки фортификаций
    const fortificationBtn = document.getElementById('fortification-btn');
    if (fortificationBtn) {
        fortificationBtn.addEventListener('click', window.toggleFortificationMenu);
        window.updateFortificationButtonTitle(); // инициализация заголовка
    }

    window.initialLayerSet = false;
    map.on('load', function() {
        window.osm.addTo(map); // Активируйте OSM слой
        window.initialLayerSet = true;
    });

  } catch (error) {
    console.error('Ошибка инициализации:', error);
  }
}


//async function init() {
//try {
//    // Шаг 1: Загружаем постоянные слои
//    await loadPermanentKmlLayers();
//    
//    // Проверяем, что kmlFiles сгенерирован правильно
//    console.log('KML файлов загружено:', window.kmlFiles.length);
    
//    // Шаг 2: Инициализируем selectedDate текущей датой
//    window.selectedDate = getCurrentDateFormatted();
//    console.log('Установлена текущая дата:', window.selectedDate);
    
//    // Шаг 3: Инициализируем календарь с текущей датой
//    initDatePicker();
    
//   // Шаг 4: Инициализируем точки
//    // Инициализируем диапазон дат для точек
//    window.pointsDateRange = window.pointsDateRange || { start: null, end: null };    
//    // Устанавливаем начальный диапазон (1 неделя) на основе текущей даты
//    const currentDate = parseCustomDate(window.selectedDate);
//    const startDate = getStartDateByRange('week', currentDate);
    
//    window.pointsDateRange.start = startDate;
//    window.pointsDateRange.end = currentDate;
    
//    // Загружаем точки с фильтром по дате
//    await initPointsLayer(window.pointsKmlPaths);
    
//    // Шаг 5: Инициализация кнопок фильтров
//    initFilterButtons();
//    initMobileFilterMenu();
    
//    initUnitsUaButton();
	  
//    // Кнопка полноэкранного режима
//    initFullscreenControl();
        
//    // Шаг 6: Инициализируем другие UI компоненты
//    populateCitiesDropdown();
//    document.querySelector('.date-navigator-wrapper').style.display = 'block';
        
//    // Шаг 7: Ждем когда все элементы интерфейса будут доступны
//    await waitForUIElements();
    
//    // Шаг 8: Находим и загружаем ближайший доступный KML к текущей дате
//    const nearestDate = findNearestAvailableDate(window.selectedDate);
//    const nearestIndex = kmlFiles.findIndex(file => file.name === nearestDate);
    
//    if (nearestIndex !== -1) {
//        currentIndex = nearestIndex;
//        console.log(`Загружаем KML для ближайшей доступной даты: ${nearestDate} (индекс: ${nearestIndex})`);
        
//        // Загружаем данные карты
//        preserveZoom = true;
//        // Явно устанавливаем вид только один раз
//        map.setView([48.257381, 37.134785], 10);
//        await loadKmlForNearestDate(nearestIndex);
//    } else {
//        console.log('Не найдено доступных KML файлов для загрузки');
//        // Устанавливаем вид по умолчанию
//        map.setView([48.257381, 37.134785], 10);
//    }
    
//    // Шаг 9: Финализируем инициализацию карты
//    setTimeout(() => {
//      if (map) map.invalidateSize();
//      updateCurrentCenterDisplay();
//    }, 50);
    
//    map.options.crs = L.CRS.EPSG3857;
    
//    const flagInterval = setInterval(() => {
//    if (document.querySelector('.leaflet-control-attribution')) {
//        replaceAttributionFlag();
//        clearInterval(flagInterval);
//        }
//    }, 500);
    
//    // Настройка кнопки после инициализации элементов
//    setTimeout(() => {
//        setupCopyCoordsButton();
//        addCopyButtonsToInputs(); // Добавляем инициализацию кнопок копирования
//        updateCopyButtonsVisibility(); // Инициализируем состояние кнопок
//    }, 500);
    
//    // Инициализация дартс-меню
//    initDartMenu(); 
        
//    // Для выпадающего списка слоёв (подложек)
 //   // таймаут при инициализации карты, чтобы убедиться, что все элементы созданы
//    setTimeout(() => {
//        if (map) map.invalidateSize();
//        updateCurrentCenterDisplay();
        
//        // Явно инициализируем обработчик после создания элементов
//        const toggleBtn = document.querySelector('.leaflet-control-layers-toggle');
//        if (toggleBtn) {
//            toggleBtn.addEventListener('click', function(e) {
//                e.preventDefault();
 //               e.stopPropagation();
                
 //               const isVisible = layerControlContainer.style.display === 'block';
 //               layerControlContainer.style.display = isVisible ? 'none' : 'block';
 //               layerControlContainer.classList.toggle('leaflet-control-layers-expanded', !isVisible);
 //           });
//        }
//    }, 300);
	
    
//    // Инициализация поиска по названию
//    initSearchFunctionality();
    
//    // обработчик для кнопки техники
//    const milEquipBtn = document.getElementById('mil-equip-btn');
//    if (milEquipBtn) {
//        milEquipBtn.addEventListener('click', window.toggleEquipmentMenu);
//    }    
//    const attacksOnUaBtn = document.getElementById('attacks-on-ua-btn');
//    if (attacksOnUaBtn) {
 //       attacksOnUaBtn.addEventListener('click', window.toggleAttacksMenu);
//    }
//    // Построить меню фильтра техники
 //   window.initFilters();

//    // обработчик для кнопки фортификаций
//    const fortificationBtn = document.getElementById('fortification-btn');
//    if (fortificationBtn) {
//        fortificationBtn.addEventListener('click', window.toggleFortificationMenu);
 //       window.updateFortificationButtonTitle(); // инициализация заголовка
//    }
    
 //   window.initialLayerSet = false;
//    map.on('load', function() {
//        window.osm.addTo(map); // Активируйте OSM слой
//        window.initialLayerSet = true;
//    });
        
//  } catch (error) {
//    console.error('Ошибка инициализации:', error);
//  }
// }

// Новая функция для ожидания готовности UI элементов
function waitForUIElements() {
  return new Promise(resolve => {
    const checkElements = () => {
      // Проверяем наличие всех необходимых элементов
      const elementsReady = 
        document.getElementById('first-btn') &&
        document.getElementById('prev-btn') &&
        document.getElementById('next-btn') &&
        document.getElementById('last-btn') &&
        document.querySelector('.date-navigator-wrapper');
        
      if (elementsReady) {
        resolve();
      } else {
        setTimeout(checkElements, 50);
      }
    };
    
    checkElements();
  });
}

document.addEventListener('DOMContentLoaded', init);

function switchMapStatViewByBtn(mapBtn, stats1Btn, stats2Btn)
{
    const mapContainer = document.getElementById('map-container');
    const stats1Container = document.getElementById('stats1-container');
    const stats2Container = document.getElementById('stats2-container');
    
    function switchView(activeBtn, activeContainer) {
        // Сбрасываем активное состояние у всех кнопок и контейнеров
        [mapBtn, stats1Btn, stats2Btn].forEach(btn => btn.classList.remove('active'));
        [mapContainer, stats1Container, stats2Container].forEach(container => {
            container.classList.remove('active');
            container.style.display = 'none';
        });
        
        // Устанавливаем активное состояние
        activeBtn.classList.add('active');
        activeContainer.classList.add('active');
        activeContainer.style.display = 'block';
        
        // Для контейнера карты используем flex-раскладку
        if (activeContainer === mapContainer) {
            activeContainer.style.display = 'flex';
        }
        
        // Показываем/скрываем date-navigator в зависимости от активной вкладки
        const dateNavigatorWrapper = document.querySelector('.date-navigator-wrapper');
        if (activeContainer === mapContainer) {
            dateNavigatorWrapper.style.display = 'block';
        } else {
            dateNavigatorWrapper.style.display = 'none';
        }
        
        // Перерисовываем карту при возвращении на вкладку
        if (activeContainer === mapContainer && map) {
            setTimeout(() => {
                map.invalidateSize();
            }, 100);
        }
    }
    // Обработчики кнопок
    mapBtn.addEventListener('click', () => switchView(mapBtn, mapContainer));
    stats1Btn.addEventListener('click', () => switchView(stats1Btn, stats1Container));
    stats2Btn.addEventListener('click', () => switchView(stats2Btn, stats2Container));
}

document.addEventListener('DOMContentLoaded', function() {
    const mapBtn = document.getElementById('map-btn');
    const stats1Btn = document.getElementById('stats1-btn');
    const stats2Btn = document.getElementById('stats2-btn');
    
    switchMapStatViewByBtn(mapBtn, stats1Btn, stats2Btn);
    
});
document.addEventListener('DOMContentLoaded', function() {
    const mapBtn = document.getElementById('map-btn-desktop');
    const stats1Btn = document.getElementById('stats1-btn-desktop');
    const stats2Btn = document.getElementById('stats2-btn-desktop');
    
    switchMapStatViewByBtn(mapBtn, stats1Btn, stats2Btn);
    
});

// Закрываем меню при клике на карту
document.getElementById('map').addEventListener('click', function() {
    if (window.innerWidth <= 768) {
        document.querySelector('.nav-wrapper').classList.remove('active');
    }
});

// Добавляем обработчик изменения размера окна
window.addEventListener('resize', function() {
  if (map) {
    setTimeout(() => {
      map.invalidateSize();
    }, 100);
  }
});

// При инициализации карты добавляем обработчик для перерисовки
map.whenReady(function() {
  setTimeout(() => {
    map.invalidateSize();
  }, 100);
});

// обработчик для обновления координат при полной загрузке карты
map.whenReady(function() {
    // Обновляем координаты центра после полной загрузки карты
    updateCurrentCenterDisplay();
    
    // Добавляем периодическую проверку на случай, 
    // если карта полностью инициализируется с небольшой задержкой
    const checkInterval = setInterval(() => {
        if (map.getCenter().lat !== 0) {
            updateCurrentCenterDisplay();
            clearInterval(checkInterval);
        }
    }, 100);
});

// Обработчик для поля ввода координат
function showCoordsError(input, message) {
    // убираем старый
    let old = input.parentNode.querySelector('.coords-error-bubble');
    if (old) old.remove();

    const bubble = document.createElement('div');
    bubble.className = 'coords-error-bubble';
    bubble.textContent = message;
    input.parentNode.appendChild(bubble);

    setTimeout(() => bubble.remove(), 2500);
}

function hideCoordsError(input) {
    let old = input.parentNode.querySelector('.coords-error-bubble');
    if (old) old.remove();
}

function normalizeToTuple(coords) {
  if (!coords) return null;
  if (Array.isArray(coords) && coords.length >= 2) {
    return [coords[0], coords[1]];
  }
  if (typeof coords === 'object') {
    if ('lat' in coords && ('lng' in coords || 'lon' in coords)) {
      return [coords.lat, coords.lng ?? coords.lon];
    }
    if ('y' in coords && 'x' in coords) {
      // иногда приходят как x/y
      return [coords.y, coords.x];
    }
  }
  return null;
}

function centerMapFromInput(input, showAlert = false) {
    // Если изменение программное, не обрабатываем
    if (isProgrammaticChange) return;
    
    const raw = parseCoordinates(input.value.trim());
    const coords = normalizeToTuple(raw);

    if (coords) {
        const [lat, lng] = coords;
        centerMap(lat, lng);
        if (typeof hideCoordsError === 'function') hideCoordsError(input);
    } else if (showAlert) {
        if (typeof showCoordsError === 'function') {
            showCoordsError(input, translations[currentLang].invalidCoords);
        } else {
            alert(translations[currentLang].invalidCoords);
        }
    }
}

function setupInputWithClear(inputEl, clearBtn) {
    function toggleClearButton() {
        if (inputEl.value.trim() !== "") {
            clearBtn.style.display = "inline-flex";
        } else {
            clearBtn.style.display = "none";
        }
        
        // Также управляем видимостью кнопки копирования
        const copyBtn = input.parentNode.querySelector('.copy-input-btn');
        if (copyBtn) {
            copyBtn.style.display = input.value ? 'inline-flex' : 'none';
        }
    }

    // следим за вводом, вставкой и изменениями
    inputEl.addEventListener("input", toggleClearButton);
    inputEl.addEventListener("change", toggleClearButton);

    clearBtn.addEventListener("click", () => {
        inputEl.value = "";
        toggleClearButton();
        hideErrorBubble(inputEl);
    });

    // начальная инициализация
    toggleClearButton();
 }

// Обработчик для ввода
document.querySelectorAll('#coords-input, #coords-input-clone').forEach(input => {
    // Автоматическое центрирование при вставке (без ошибок)
    input.addEventListener('input', function() {
        if (!isProgrammaticChange) {
            centerMapFromInput(this, false);
        }
        // Всегда обновляем видимость кнопок копирования при изменении содержимого
        updateCopyButtonsVisibility();
    });
    
    // Обработка Enter: координаты → центрирование, текст → поиск населённого пункта
    input.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && !isProgrammaticChange) {
            const coords = normalizeToTuple(parseCoordinates(this.value.trim()));
            if (coords) {
                centerMapFromInput(this, true);
            } else if (typeof window.performPlaceSearch === 'function') {
                window.performPlaceSearch(this.value);
            }
            // Обновляем видимость кнопок копирования
            updateCopyButtonsVisibility();
        }
    });
});

// Добавляем обработчики для кнопок очистки (крестиков)
document.addEventListener('click', function(e) {
    if (e.target.classList.contains('clear-input-btn')) {
        // Находим соответствующее поле ввода
        const input = e.target.closest('.input-with-clear').querySelector('input');
        if (input) {
            // Устанавливаем флаг программного изменения
            isProgrammaticChange = true;
            
            // Очищаем поле
            input.value = '';
            
            // Обновляем видимость кнопок копирования
            updateCopyButtonsVisibility();
            
            // Сбрасываем флаг
            setTimeout(() => {
                isProgrammaticChange = false;
            }, 100);
            
            // Синхронизируем второе поле, если оно есть
            const otherInputId = input.id === 'coords-input' ? 'coords-input-clone' : 'coords-input';
            const otherInput = document.getElementById(otherInputId);
            if (otherInput) {
                isProgrammaticChange = true;
                otherInput.value = '';
                setTimeout(() => {
                    isProgrammaticChange = false;
                }, 100);
            }
            
            // Обновляем видимость кнопок копирования для обоих полей
            updateCopyButtonsVisibility();
            
            // Очищаем маркер если это основное поле
            if (input.id === 'coords-input') {
                clearMarkerAndInput();
                if (typeof window.clearSearchMarkers === 'function') {
                    window.clearSearchMarkers();
                }
            }
        }
    }
});

document.querySelectorAll('.view-menu-container').forEach(container => {
    const viewMenuBtn = container.querySelector('.view-menu-btn');
    
    viewMenuBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        container.classList.toggle('active');
    });

    document.addEventListener('click', function(e) {
        if (!container.contains(e.target)) {
            container.classList.remove('active');
        }
    });

    container.querySelectorAll('.view-dropdown .view-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            container.classList.remove('active');
            if (map && this.id.includes('map-btn')) {
                setTimeout(() => map.invalidateSize(), 100);
            }
        });
    });
});

//////////////////////////////////////////////////////////////////////

const navDropdown = document.getElementById('nav-dropdown');
const navMenuToggle = document.getElementById('nav-menu-toggle');
const hideableItems = document.querySelectorAll('.hideable-nav-item');
clonedItems = [];
// Дартс (Лупа)
function initDartMenu() {
    console.log("[initDartMenu] Инициализация дартс-меню...");
    
    if (!navMenuToggle || !navDropdown) return;

    navMenuToggle.style.display = 'flex';
    console.log(`[initDartMenu] Найдено ${hideableItems.length} элементов с классом 'hideable-nav-item'`);
    
    // Очищаем предыдущие клоны
    navDropdown.innerHTML = '';
    clonedItems = [];
    
    // Клонируем только необходимые элементы
    const elementsToClone = [
        'centerOn-label',
        'coords-input',
        'copy-coords-external-btn',
        'cities-dropdown',
        'currentCenter-label',
        'current-center-coords',
        'copy-coords-btn'
    ];
    
    // Создаем контейнер для элементов меню
    const container = document.createElement('div');
    container.className = 'dropdown-items-container';
    
    elementsToClone.forEach(id => {
        const original = document.getElementById(id);
        if (!original) return;
        
        const clone = original.cloneNode(true);
        clone.id = `${id}-clone`;
        clone.classList.add('dropdown-item');
        
        // Удаляем классы, которые могут конфликтовать
        clone.classList.remove('hideable-nav-item');
        
        // Очищаем инлайновые стили
        clone.style.cssText = '';
        
        container.appendChild(clone);
        clonedItems.push(clone);
    });
    
    navDropdown.appendChild(container);
    console.log(`[initDartMenu] В nav-dropdown добавлено ${clonedItems.length} элементов`);

    setupCopyCoordsButton(); // Повторная инициализация обработчиков копирования

    // Добавляем обработчики для клонированных элементов
    setupDropdownListeners();
    
    // Обработчик изменения размера окна
    function handleResize() {
        if (window.innerWidth < 1201) {
            hideableItems.forEach(item => item.style.display = 'none');
            navMenuToggle.style.display = 'flex';
        } else {
            hideableItems.forEach(item => item.style.display = 'flex');
            navMenuToggle.style.display = 'none';
            navDropdown.classList.remove('active');
        }
    }
    
    window.addEventListener('resize', handleResize);
    handleResize();
    
    // Синхронизируем состояние при инициализации
    syncDropdownState();
}

    // Синхронизация состояния
function syncDropdownState() {
    // Координаты
    const originalCoords = document.getElementById('current-center-coords');
    const cloneCoords = document.getElementById('current-center-coords-clone');
    if (originalCoords && cloneCoords) {
        cloneCoords.textContent = originalCoords.textContent;
    }

    // Поле ввода координат
    const originalInput = document.getElementById('coords-input');
    const cloneInput = document.getElementById('coords-input-clone');
    if (originalInput && cloneInput) {
        cloneInput.value = originalInput.value;
        
        // Синхронизация видимости внешних кнопок копирования
        const originalCopyBtn = document.getElementById('copy-coords-external-btn');
        const cloneCopyBtn = document.getElementById('copy-coords-external-btn-clone');
        
        if (originalCopyBtn) {
            originalCopyBtn.style.display = originalInput.value ? 'inline-flex' : 'none';
        }
        if (cloneCopyBtn) {
            cloneCopyBtn.style.display = cloneInput.value ? 'inline-flex' : 'none';
        }
    }

    // Выпадающий список городов
    const originalDropdown = document.getElementById('cities-dropdown');
    const cloneDropdown = document.getElementById('cities-dropdown-clone');
    if (originalDropdown && cloneDropdown) {
        cloneDropdown.value = originalDropdown.value;
    }
}
    

// Обработчики для клонов в выпадающем меню
navDropdown.querySelectorAll('input, select').forEach(clone => {
    clone.addEventListener('change', function() {
        // Находим соответствующий оригинальный элемент по индексу
        const index = Array.from(navDropdown.children).indexOf(this.parentElement);
        if (index === -1) return;
        
        const original = hideableItems[index];
        if (!original) return;
        
        // Обновляем оригинальный элемент
        if (this.tagName === 'INPUT') {
            const origInput = original.querySelector('input');
            if (origInput) {
                origInput.value = this.value;
                
                // Для координат - центрируем карту
                if (origInput.id === 'coords-input') {
                    const coords = this.value.split(',').map(coord => parseFloat(coord.trim()));
                    if (coords.length === 2 && !isNaN(coords[0]) && !isNaN(coords[1])) {
                        centerMap(coords[0], coords[1]);
                    }
                }
            }
        }
        else if (this.tagName === 'SELECT') {
            const origSelect = original.querySelector('select');
            if (origSelect) {
                origSelect.value = this.value;
                
                // Для выпадающего списка городов
                const city = cities.find(c => c.name[currentLang] === this.value);
                if (city) {
                    centerMap(city.lat, city.lng);
                }
            }
        }
    });
});

// Обработчик для кнопки копирования в меню
navDropdown.querySelectorAll('.copy-coords-btn').forEach(btn => {
    btn.addEventListener('click', function() {
        const coordsElement = this.closest('.current-center')?.querySelector('.current-coords-display');
        if (coordsElement) {
            const coords = coordsElement.textContent;
            copyToClipboard(coords, this);
        }
    });
});

// Закрытие меню при клике вне его
document.addEventListener('click', function(e) {
    if (!navDropdown.contains(e.target) && e.target !== navMenuToggle) {
        navDropdown.classList.remove('active');
    }
});


// Обработчик для кнопки меню
navMenuToggle.addEventListener('click', function(e) {
    e.stopPropagation();
    console.log("[navMenuToggle] Кнопка меню нажата");
    // Синхронизируем состояние перед открытием
    syncDropdownState();
    // Открываем/закрываем меню
    navDropdown.classList.toggle('active');
});


function copyToClipboard(text, button) {
    // Проверяем, не disabled ли кнопка
    if (button.disabled) {
        return;
    }
    
    if (!text || text.includes('не определен') || text.includes('undefined')) {
        return;
    }
    
    try {
        // Fallback метод копирования
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.opacity = 0;
        document.body.appendChild(textArea);
        textArea.select();
        
        const successful = document.execCommand('copy');
        document.body.removeChild(textArea);
        
        // Сохраняем исходное состояние если еще не сохранено
        if (!button.dataset.originalHtml) {
            button.dataset.originalHtml = button.innerHTML;
            button.dataset.originalClass = button.className;
        }
        
        // Визуальная обратная связь
        const t = translations[currentLang];
        button.innerHTML = t ? t.copiedText : '✓';
        button.className = button.className + ' copied';
        
        // Восстанавливаем исходное состояние после 2 секунд
        setTimeout(() => {
            if (button.dataset.originalHtml) {
                button.innerHTML = button.dataset.originalHtml;
                button.className = button.dataset.originalClass;
            }
        }, 2000);
        
        if (!successful) {
            console.warn('Копирование не удалось, показываем координаты');
            alert(`${translations[currentLang]?.copyFallback || "Скопируйте координаты"}: ${text}`);
        }
    } catch (err) {
        console.error('Ошибка копирования:', err);
        button.innerHTML = translations[currentLang]?.copyError || "Ошибка";
        setTimeout(() => {
            if (button.dataset.originalHtml) {
                button.innerHTML = button.dataset.originalHtml;
                button.className = button.dataset.originalClass;
            }
        }, 2000);
    }
}

function setupDropdownListeners() {
    // Обработчик для поля ввода координат в меню
    const coordsClone = document.getElementById('coords-input-clone');
    if (coordsClone) {
        // Автоматическое центрирование при вставке
        coordsClone.addEventListener('input', function() {
            centerMapFromInput(this, false);
        });
        
        // Обработка Enter: координаты → центрирование + закрытие меню, текст → поиск
        coordsClone.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                const coords = normalizeToTuple(parseCoordinates(this.value.trim()));
                if (coords) {
                    if (centerMapFromInput(this, true)) {
                        navDropdown.classList.remove('active');
                    }
                } else if (typeof window.performPlaceSearch === 'function') {
                    window.performPlaceSearch(this.value);
                }
            }
        });
    }
    
     // Обработчик для клонированной внешней кнопки копирования
    const copyExternalBtnClone = document.getElementById('copy-coords-external-btn-clone');
    if (copyExternalBtnClone) {
        copyExternalBtnClone.addEventListener('click', function() {
            const coordsInputClone = document.getElementById('coords-input-clone');
            if (coordsInputClone && coordsInputClone.value) {
                copyToClipboard(coordsInputClone.value, this);
            }
        });
    }

    // Обработчик для выпадающего списка городов в меню
    const citiesClone = document.getElementById('cities-dropdown-clone');
    if (citiesClone) {
        citiesClone.addEventListener('change', function() {
            const selectedCityName = this.value;
            if (!selectedCityName) return;
            
            const city = cities.find(c => 
                c.name.ru === selectedCityName || 
                c.name.en === selectedCityName
            );
            
            if (city) {
                // Обновляем поле ввода координат
                const coordsInput = document.getElementById('coords-input');
                const coordsClone = document.getElementById('coords-input-clone');
                
                if (coordsInput) coordsInput.value = `${city.lat}, ${city.lng}`;
                if (coordsClone) coordsClone.value = `${city.lat}, ${city.lng}`;
                
                centerMap(city.lat, city.lng);
                // Закрываем меню после выбора города
                navDropdown.classList.remove('active');
                this.value = "";
            }
        });
    }

    // Обработчик для кнопки копирования в меню
    const copyBtnClone = document.getElementById('copy-coords-btn-clone');
    if (copyBtnClone) {
        copyBtnClone.addEventListener('click', function() {
            const coordsElement = document.getElementById('current-center-coords-clone');
            if (coordsElement) {
                const coords = coordsElement.textContent;
                copyToClipboard(coords, this);
            }
        });
    }
}


// Обработчик кнопки tlg-btn

document.addEventListener('DOMContentLoaded', function() {
    document.querySelectorAll('.tlg-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            // Закрываем меню
            this.closest('.view-menu-container').classList.remove('active');
            
            // Открываем ссылку в новом окне
            window.open('https://goo.gl/maps/4eum5C9giNDebgXf7', '_blank');
        });
    });
});

// Функция загрузки контента для модального окна
function loadInfoContent(filename) {
    fetch(filename)
        .then(response => response.text())
        .then(html => {
            document.getElementById('info-content').innerHTML = html;
        })
        .catch(error => {
            console.error('Ошибка загрузки контента:', error);
            const errorText = currentLang === 'ru' ? 
                '<p>Не удалось загрузить информацию</p>' : 
                '<p>Failed to load information</p>';
            document.getElementById('info-content').innerHTML = errorText;
        });
}

// Обработчик кнопки Инфо info-btn и Поддержать donate-btn

document.addEventListener('DOMContentLoaded', function() {
  const modal = document.getElementById('info-modal');
  const closeBtn = modal.querySelector('.close-modal');
  
  // Обработчик для кнопки закрытия
  closeBtn.addEventListener('click', function() {
    modal.style.display = 'none';
  });

  // Обработчики для кнопки "Инфо"
  document.querySelectorAll('.info-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      this.closest('.view-menu-container')?.classList.remove('active');
      modal.style.display = 'block';
      const infoFile = currentLang === 'ru' ? 'content/info_ru.html' : 'content/info_en.html';
      loadInfoContent(infoFile); // Загружаем контент при открытии
    });
  });

  // Обработчики для кнопки "Поддержать"
  document.querySelectorAll('.donate-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      this.closest('.view-menu-container')?.classList.remove('active');
      modal.style.display = 'block';
      const infoFile = currentLang === 'ru' ? 'content/donate_smo_ru.html' : 'content/donate_smo_en.html';
      loadInfoContent(infoFile); // Загружаем контент при открытии
    });
  });

  // Закрытие при клике вне окна
  document.addEventListener('click', function(event) {
    if (event.target === modal) {
      modal.style.display = 'none';
    }
  });

  // Закрытие по клавише Esc
  document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape' && modal.style.display === 'block') {
      modal.style.display = 'none';
    }
  });
});




// === Inline error bubble for coords input ===
(function(){
  function ensureCoordsErrorStyle() {
    if (document.getElementById('coords-error-style')) return;
    const style = document.createElement('style');
    style.id = 'coords-error-style';
    style.textContent = `
      .coords-error-bubble{
        position:absolute;
        left:0;
        top:calc(100% + 4px);
        padding:4px 8px;
        background:#ffeaea;
        color:#b00020;
        border:1px solid #f3b2b2;
        border-radius:4px;
        font-size:12px;
        line-height:1.2;
        white-space:nowrap;
        pointer-events:none;
        box-shadow:0 1px 2px rgba(0,0,0,.05);
        z-index:10;
      }
    `;
    document.head.appendChild(style);
  }
  window._coordsError = {
    show(input, message){
      ensureCoordsErrorStyle();
      if (!input) return;
      let wrapper = input.closest('.input-with-clear');
      if (!wrapper) {
        const w = document.createElement('div');
        w.className = 'input-with-clear';
        input.parentNode.insertBefore(w, input);
        w.appendChild(input);
        wrapper = w;
      }
      let bubble = wrapper.querySelector('.coords-error-bubble');
      if (!bubble) {
        bubble = document.createElement('div');
        bubble.className = 'coords-error-bubble';
        wrapper.appendChild(bubble);
      }
      bubble.textContent = message;
      bubble.style.display = 'block';
      if (bubble._timer) clearTimeout(bubble._timer);
      bubble._timer = setTimeout(()=>{ bubble.style.display='none'; }, 2500);
      const hide = ()=>{ bubble.style.display='none'; };
      input.addEventListener('input', hide, { once:true });
      input.addEventListener('focus', hide, { once:true });
    },
    hide(input){
      if (!input) return;
      const wrapper = input.closest('.input-with-clear');
      const bubble = wrapper && wrapper.querySelector('.coords-error-bubble');
      if (bubble) {
        bubble.style.display = 'none';
        if (bubble._timer) clearTimeout(bubble._timer);
      }
    }
  };
})();

// === Ensure clear button is visible whenever coords input is non-empty (minimal, non-intrusive) ===
(function () {
  const IDS = ['coords-input', 'coords-input-clone'];
  const SEL = '#coords-input, #coords-input-clone';

  function ensureWrappedAndButton(input) {
    if (!input) return;
    // Обёртка с позиционированием (нужна и для баббла, и для кнопки)
    if (!input.parentElement.classList.contains('input-with-clear')) {
      const wrap = document.createElement('span');
      wrap.className = 'input-with-clear';
      input.parentNode.insertBefore(wrap, input);
      wrap.appendChild(input);
    }
    // Кнопка очистки, если ещё нет
    let btn = input.parentElement.querySelector('.clear-input-btn');
    if (!btn) {
      btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'clear-input-btn';
      btn.setAttribute('aria-label', 'Очистить');
      btn.title = 'Очистить';
      btn.textContent = '✕';
      input.parentElement.appendChild(btn);

      btn.addEventListener('click', () => {
        // Очищаем маркер и поля ввода
        clearMarkerAndInput();
        
        // Синхронизируем второе поле, если оно есть
        IDS.forEach(id => {
          const other = document.getElementById(id);
          if (other && other !== input) {
            other.value = '';
            toggle(other);
          }
        });
        
        // Возвращаем фокус на поле ввода
        input.focus();
      });
    }
  }

  function toggle(input) {
    if (!input) return;
    ensureWrappedAndButton(input);
    const btn = input.parentElement.querySelector('.clear-input-btn');
    if (!btn) return;
    btn.style.display = (input.value && input.value.trim()) ? 'inline-flex' : 'none';
  }

  function refreshAll() {
    IDS.forEach(id => toggle(document.getElementById(id)));
  }

  // Инициализация
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', refreshAll, { once: true });
  } else {
    refreshAll();
  }

  // Обновляем видимость на любые текстовые изменения в полях
  ['input', 'change', 'keyup', 'paste'].forEach(evt => {
    document.addEventListener(evt, (e) => {
      const t = e.target;
      if (!t || !t.matches || !t.matches(SEL)) return;
      // задержка для paste, чтобы успело вставиться значение
      if (evt === 'paste') {
        requestAnimationFrame(() => toggle(t));
      } else {
        toggle(t);
      }
      // синхронизируем второй инпут, если он есть
      IDS.forEach(id => {
        const other = document.getElementById(id);
        if (other && other !== t) {
          other.value = t.value;
          toggle(other);
        }
      });
    }, false);
  });

  // При смене ширины/ориентации может появиться/исчезнуть клон → пересчёт
  window.addEventListener('resize', refreshAll);
  window.addEventListener('orientationchange', refreshAll);

  // Если есть «баббл»-функции, оборачиваем их, чтобы после показа/скрытия пересчитывать кнопку
  if (typeof window.showCoordsError === 'function') {
    const _show = window.showCoordsError;
    window.showCoordsError = function (input, msg) {
      const r = _show.call(this, input, msg);
      refreshAll();
      return r;
    };
  }
  if (typeof window.hideCoordsError === 'function') {
    const _hide = window.hideCoordsError;
    window.hideCoordsError = function (input) {
      const r = _hide.call(this, input);
      refreshAll();
      return r;
    };
  }

  // На случай динамического создания/перемещения мобильного поля — наблюдатель
  const mo = new MutationObserver(refreshAll);
  mo.observe(document.documentElement, { childList: true, subtree: true });
})();

// === Patch: don't auto-format coords on Backspace (prevents trailing zeros) ===
(function () {
  const SEL = '#coords-input, #coords-input-clone';

  // На этапе capture перехватываем input, вызванный Backspace,
  // и останавливаем дальнейшие обработчики, которые перезаписывают value (маски/formatters).
  document.addEventListener('input', function (e) {
    const el = e.target;
    if (!el || !el.matches || !el.matches(SEL)) return;

    // Важное: именно для удаления влево не даем форматировать/дописывать нули
    if (e.inputType === 'deleteContentBackward') {
      // Обновим видимость крестика вручную (он должен быть, если поле непустое)
      const btn = el.parentElement && el.parentElement.querySelector('.clear-input-btn');
      if (btn) btn.style.display = el.value.trim() ? 'inline-flex' : 'none';

      // Не даем другим листенерам «подтереть» текст и дописать нули
      e.stopImmediatePropagation();
      return;
    }
  }, true); // capture: перехватываем раньше остальных
})();

// Добавим функцию для добавления маркера в текущий центр карты
function addMarkerAtCurrentCenter() {
    const center = map.getCenter();
    const currentZoom = map.getZoom();
    centerMap(center.lat, center.lng, currentZoom);
    
    // Принудительно показываем кнопки копирования
    const externalCopyBtn = document.getElementById('copy-coords-external-btn');
    const externalCopyBtnClone = document.getElementById('copy-coords-external-btn-clone');
    
    if (externalCopyBtn) externalCopyBtn.style.display = 'inline-flex';
    if (externalCopyBtnClone) externalCopyBtnClone.style.display = 'inline-flex';
}

// Добавим обработчики для кнопок добавления маркера
document.addEventListener('DOMContentLoaded', function() {
    // Для основной кнопки
    const addMarkerBtn = document.getElementById('add-marker-btn');
    if (addMarkerBtn) {
        addMarkerBtn.addEventListener('click', addMarkerAtCurrentCenter);
    }
    
    // Для клона в дартс-меню
    const addMarkerBtnClone = document.getElementById('add-marker-btn-clone');
    if (addMarkerBtnClone) {
        addMarkerBtnClone.addEventListener('click', addMarkerAtCurrentCenter);
    }
});

// Добавляем эту функцию для создания кнопок копирования
function addCopyButtonsToInputs() {
    // Удаляем старые внутренние кнопки копирования
    document.querySelectorAll('.copy-input-btn:not(.external)').forEach(btn => {
        btn.remove();
    });

    // Обработчики для внешних кнопок копирования
        function setupExternalCopyButton(buttonId, inputId) {
        const copyBtn = document.getElementById(buttonId);
        const input = document.getElementById(inputId);
        
        if (copyBtn && input) {
            copyBtn.addEventListener('click', function() {
                if (input.value && !this.disabled) {
                    copyToClipboard(input.value, this);
                }
            });
            
            // Управление активностью на основе содержимого поля
            input.addEventListener('input', function() {
                const hasValue = this.value.trim().length > 0;
                copyBtn.disabled = !hasValue;
                copyBtn.style.display = 'inline-flex'; // Всегда показываем
            });
            
            // Инициализация состояния
            const hasValue = input.value.trim().length > 0;
            copyBtn.disabled = !hasValue;
            copyBtn.style.display = 'inline-flex'; // Всегда показываем
        }
    }

    // Настройка кнопок для основного поля и клона
    setupExternalCopyButton('copy-coords-external-btn', 'coords-input');
    setupExternalCopyButton('copy-coords-external-btn-clone', 'coords-input-clone');
}

// Вызываем функции инициализации
document.addEventListener('DOMContentLoaded', function() {
    addCopyButtonsToInputs();
    
    // Также обновляем видимость кнопок при изменении содержимого полей
    document.querySelectorAll('#coords-input, #coords-input-clone').forEach(input => {
        input.addEventListener('input', function() {
            const copyBtn = this.parentNode.querySelector('.copy-input-btn');
            if (copyBtn) {
                copyBtn.style.display = this.value ? 'inline-flex' : 'none';
            }
        });
    });

});

document.addEventListener('click', function(e) {
    // Проверяем, кликнули ли по кнопке копирования в popup
    if (e.target && e.target.classList.contains('copy-coords-popup-btn')) {
        e.stopPropagation();
        e.preventDefault();
        const coords = e.target.getAttribute('data-coords');
        if (coords) {
            copyToClipboard(coords, e.target);
        }
    }
});
