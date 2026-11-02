const translations = {
    ru: {
        title: "Сливочный каприз dataviewer",
        //logoAlt: "dataviewer - просмотр данных",
        centerLabel: "Центрировать на:",
        coordsPlaceholder: "Координаты/Поиск",
        // selectCity: "Выберите город",
        currentCenter: "Текущий центр: ",
		invalidCoords: "Неверный формат координат",
        undefinedCoords: "не определен",
        copyTooltip: "Копировать координаты",
        copiedText: "✓",
        copyFallback: "Скопируйте координаты вручную",
        copyError: "Ошибка копирования",
        
        firstBtnTitle: "На год назад",
        prevBtnTitle: "Предыдущий",
        nextBtnTitle: "Следующий",
        lastBtnTitle: "Сегодня",
        		
        // Переводы для выпадающего списка диапазонов
        rangeWeek: "1 неделя",
        rangeMonth: "1 месяц",
        range3Months: "3 месяца",
        rangeYear: "1 год",
        rangeAll: "Все",
        customDaysPlaceholder: "Дней",
		
        showEquipment: 'Техника',
        // hideEquipment: 'Скрыть технику',
        
        selectAll: "Все",
        
        showAttacksOnUa: 'Удары по территории Украины',
        // hideAttacksOnUa: 'Скрыть удары по территории Украины',
		
        showFortifications: 'Фортификации (Playfra map) Зеленый - Рвы, Белый - Надолбы, Голубой - Колючая проволока',
        // hideFortifications: 'Скрыть фортификации (Playfra map) Зеленый - Рвы, Белый - Надолбы, Голубой - Колючая проволока',
        
        showUnitsUa: 'Подразделения ВСУ',
        // hideUnitsUa: 'Скрыть подразделения ВСУ',
        
        ruBtnTitle: "Текущий язык: Русский",
        enBtnTitle: "Переключить на Английский",
        
        layersToggleTitle: "Слои карты",
        
        rulerToggleTitle: "Измерить расстояние",
        measureControlTitleOn: "Включить линейку",
        measureControlTitleOff: "Выключить линейку",
        clearControlTitle: "Очистить измерения",
        unitControlTitle: { // Title texts to show on the Unit Control
            text: 'Изменить единицы',
            kilometres: 'километры',
            landmiles: "мили",
            nauticalmiles: 'морские мили'
        },
        units: {
            meters: "Метры",
            kilometres: "Километры",
            landmiles: "Мили",
            nauticalmiles: "Морские мили",
            feet: "Футы"
        },
        
        viewSwitchMap: "Карта",
        viewSwitchSt1: "Статистика",
        viewSwitchSt2: "Потери ВСУ",
        viewSwitchStats: "Статистика",
        
        viewSwitchTlg:  "Гугл-карта",
        viewSwitchDon:  "Сбор на СВО",
        viewSwitchInfo: "Инфо",
        
        dateRangeFilter: "Фильтр по дате",
        showPoints: "Показать боевые действия",
        hidePoints: "Скрыть боевые действия",
        unitsSearchPlaceholder: "Номер/Название",
        clearSearch: "Очистить",
        searchBtn: "Поиск",
        addMarkerTitle: "Маркер",
        fullscreenTitle: "Полноэкранный режим"
    },
    en: {
        title: "Creamy caprice dataviewer",
        //logoAlt: "dataviewer - data visualization",
        centerLabel: "Center on:",
        coordsPlaceholder: "Coordinates/Search",
        // selectCity: "Select city",
        currentCenter: "Current center: ",
		invalidCoords: "Invalid coordinate format",
        undefinedCoords: "undefined",
        copyTooltip: "Copy coordinates",
        copiedText: "✓",
        copyFallback: "Copy coordinates manually",
        copyError: "Copy error",
        
        firstBtnTitle: "Year ago",
        prevBtnTitle: "Previous",
        nextBtnTitle: "Next",
        lastBtnTitle: "Today",
        
		rangeWeek: "1 week",
        rangeMonth: "1 month",
        range3Months: "3 months",
        rangeYear: "1 year",
        rangeAll: "All",
        customDaysPlaceholder: "Days",
		
        showEquipment: 'Equipment',
        // hideEquipment: 'Hide equipment',
        
        selectAll: "All",
        
        showAttacksOnUa: 'Strikes on Ukraine',
        // hideAttacksOnUa: 'Hide strikes on Ukraine',		
		
        showFortifications: 'Fortifications (Playfra map) Green - Ditches, White - Dragons teeth, Blue - Barbed wire',
        // hideFortifications: 'Hide fortifications (Playfra map) Green - Ditches, White - Dragons teeth, Blue - Barbed wire',
        
        showUnitsUa: 'Ukrainian units',
        // hideUnitsUa: 'Hide Ukrainian units',
        
        ruBtnTitle: "Switch to Russian",
        enBtnTitle: "Current language: English",
        
        layersToggleTitle: "Map layers",
        
        rulerToggleTitle: "Measure distance",
        measureControlTitleOn: "Turn on measuring tool",
        measureControlTitleOff: "Turn off measuring tool",
        clearControlTitle: "Clear measurements",
        unitControlTitle: { // Title texts to show on the Unit Control
            text: 'Change Units',
            kilometres: 'kilometres',
            landmiles: "miles",
            nauticalmiles: 'nautical miles'
        },
        units: {
            meters: "Meters",
            kilometres: "Kilometres",
            landmiles: "Miles",
            nauticalmiles: "Nautical miles",
            feet: "Feet"
        },
        
        viewSwitchMap: "Map",
        viewSwitchSt1: "Statistics",
        viewSwitchSt2: "UA Losses",
        viewSwitchStats: "Statistics",
        
        viewSwitchTlg:  "Google-map",
        viewSwitchDon:  "Donate",
        viewSwitchInfo: "Info",
        
        dateRangeFilter: "Date filter",
        showPoints: "Show combat actions",
        hidePoints: "Hide combat actions",
        unitsSearchPlaceholder: "Number/Name",
        clearSearch: "Clear",
        searchBtn: "Search",
        addMarkerTitle: "Marker",
        fullscreenTitle: "Fullscreen mode"
    }
};

let currentLang = localStorage.getItem('preferredLang') || 'ru'; // По умолчанию русский

// Функция для обновления текстов линейки при смене языка
function updateMeasureControlLanguage(lang) {
    const t = translations[lang];
    
    // Гарантируем инициализацию контрола перед обновлением
    if (!window.measureControl && typeof initMeasureControl === 'function') {
        initMeasureControl();
    }
    
    if (window.measureControl) {
        const container = window.measureControl.getContainer();
        
        // Если контейнер не найден, добавляем контрол на карту
        if (!container) {
            window.measureControl.addTo(map);
        } else {
            // Обновление кнопки измерения
            const measureButton = container.querySelector('#polyline-measure-control');
            if (measureButton) {
                const isActive = measureButton.classList.contains('active');
                measureButton.title = isActive ? t.measureControlTitleOff : t.measureControlTitleOn;
            }
            
            // Обновление кнопки очистки
            const clearButton = container.querySelector('.polyline-measure-clearControl');
            if (clearButton) {
                clearButton.title = t.clearControlTitle;
            }
            
            // Обновление кнопки единиц измерения
            const unitButton = container.querySelector('#unitControlId');
            if (unitButton) {
                // unitButton.title = t.unitControlTitle;
                // Получаем текущую единицу измерения
                const currentUnit = window.measureControl._unit || 'kilometres';
                
                // Формируем строку вида "Текст [Единица]"
                let titleText = t.unitControlTitle.text;
                if (t.unitControlTitle[currentUnit]) {
                    titleText += ` [${t.unitControlTitle[currentUnit]}]`;
                }
                
                unitButton.title = titleText;
            }
        }
    }
    
    // Обновляем title нашей кастомной кнопки
    if (rulerToggle) {
        const link = rulerToggle.getContainer().querySelector('a');
        if (link) link.title = t.rulerToggleTitle;
    }
}

// Безопасное обновление элементов (не падаем, если элемента нет в DOM)
function setText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
}

function setTitle(id, title) {
    const el = document.getElementById(id);
    if (el) el.title = title;
}

// Обновляем кнопку-переключатель языка: показываем флаг того языка,
// на который можно переключиться
function updateLangToggle() {
    const isRu = currentLang === 'ru';
    ['lang-toggle', 'lang-toggle-desktop'].forEach(id => {
        const btn = document.getElementById(id);
        if (!btn) return;
        btn.classList.toggle('show-ru', !isRu);
        btn.classList.toggle('show-en', isRu);
        btn.title = isRu ? "Переключить на Английский" : "Switch to Russian";
    });
}

// Функция переключения языка
function setLanguage(lang) {
    currentLang = lang;
    const t = translations[lang];
    
    // Сохраняем текущие координаты перед обновлением текста
    const coordsElement = document.getElementById('current-center-coords');
    const currentText = coordsElement ? coordsElement.textContent : '';
    const coordsRegex = /[-]?\d+\.\d+,\s*[-]?\d+\.\d+/;
    const match = currentText.match(coordsRegex);
    const savedCoords = match ? match[0] : null;
    
    updateLangToggle();
    
    // Обновляем текст элементов
    setText('page-title', t.title);
    setText('centerOn-label', t.centerLabel);
    const coordsInput = document.getElementById('coords-input');
    if (coordsInput) coordsInput.placeholder = t.coordsPlaceholder;
    
    setText('currentCenter-label', t.currentCenter);
    // Восстанавливаем координаты после обновления префикса
    if (coordsElement) {
        coordsElement.textContent = savedCoords || t.undefinedCoords;
    }
    
    setTitle('copy-coords-btn', t.copyTooltip);
    
    // Панель поиска подразделений
    const unitsSearchInput = document.getElementById('units-search-input');
    if (unitsSearchInput) unitsSearchInput.placeholder = t.unitsSearchPlaceholder;
    setTitle('units-search-clear', t.clearSearch);
    setTitle('units-search-btn', t.searchBtn);
    
    // Кнопка добавления маркера
    setTitle('add-marker-btn', t.addMarkerTitle);
    setTitle('add-marker-btn-clone', t.addMarkerTitle);
    
    // Кнопка полноэкранного режима
    const fullscreenBtn = document.querySelector('.leaflet-control-fullscreen-toggle-btn');
    if (fullscreenBtn) fullscreenBtn.title = t.fullscreenTitle;
 	
    setText('map-btn'   , t.viewSwitchMap);
    setText('stats-btn' , t.viewSwitchStats);
    setText('stats1-btn', t.viewSwitchSt1);
    setText('stats2-btn', t.viewSwitchSt2);
    setText('tlg-btn'   , t.viewSwitchTlg);
    setText('donate-btn', t.viewSwitchDon);
    setText('info-btn'  , t.viewSwitchInfo);
    setText('map-btn-desktop'   , t.viewSwitchMap);
    setText('stats-btn-desktop' , t.viewSwitchStats);
    setText('stats1-btn-desktop', t.viewSwitchSt1);
    setText('stats2-btn-desktop', t.viewSwitchSt2);
    setText('tlg-btn-desktop'   , t.viewSwitchTlg);
    setText('donate-btn-desktop', t.viewSwitchDon);
    setText('info-btn-desktop'  , t.viewSwitchInfo);
    
    // Обновляем кнопки навигации
    setTitle('first-btn', t.firstBtnTitle);
    setTitle('prev-btn', t.prevBtnTitle);
    setTitle('next-btn', t.nextBtnTitle);
    setTitle('last-btn', t.lastBtnTitle);
	
	// Обновление текста в выпадающем списке диапазонов дат
    const rangeOptions = document.querySelectorAll('#date-range-dropdown .range-option');
	rangeOptions.forEach(option => {
		const range = option.getAttribute('data-range');
		if (range === 'week') option.textContent = t.rangeWeek;
		else if (range === 'month') option.textContent = t.rangeMonth;
		else if (range === '3months') option.textContent = t.range3Months;
		else if (range === 'year') option.textContent = t.rangeYear;
		else if (range === 'all') option.textContent = t.rangeAll;
	});
	
	// Плейсхолдер поля "N дней"
	const customDaysInput = document.getElementById('custom-days-input');
	if (customDaysInput) customDaysInput.placeholder = t.customDaysPlaceholder;
	
	// Обновляем заголовок кнопки фильтра дат
	if (typeof updateDateRangeButtonTitle === 'function') {
		updateDateRangeButtonTitle();
	}
	
    if (typeof updateMilEquipButtonTitle === 'function') updateMilEquipButtonTitle();
    if (typeof updateAttacksOnUaButtonTitle === 'function') updateAttacksOnUaButtonTitle();
    if (typeof updateFortificationButtonTitle === 'function') updateFortificationButtonTitle();
    if (typeof updateUnitsUaButtonTitle === 'function') updateUnitsUaButtonTitle();
    if (typeof updateTogglePointsButtonTitle === 'function') updateTogglePointsButtonTitle();
    
    // Обновляем title кнопки переключения слоев
    const layersToggleLink = document.querySelector('.leaflet-control-layers-toggle a');
    if (layersToggleLink) {
        layersToggleLink.title = t.layersToggleTitle;
    }
    
    updateMeasureControlLanguage(lang); // Обновляем тексты линейки
    
    // Обновляем список городов
    populateCitiesDropdown();
    
    // Пересоздаем календарь с новым языком
    if (datePicker) {
        datePicker.destroy();
    }
    initDatePicker(); // Передаем сохраненную дату
    
    // Обновляем текст чекбокса "Все" в фильтре техники
    const equipSelectAll = document.getElementById('equip-select-all');
    if (equipSelectAll) {
        // Ищем родительский label (обычно чекбокс обёрнут в <label>)
        const label = equipSelectAll.closest('label');
        if (label) {
            // Сохраняем ссылку на сам чекбокс
            const checkbox = label.querySelector('input[type="checkbox"]');
            // Обновляем текст, оставляя чекбокс нетронутым
            label.innerHTML = '';
            if (checkbox) label.appendChild(checkbox);
            label.appendChild(document.createTextNode(' ' + t.selectAll));
        } else {
            // Если label нет, просто меняем следующий текстовый узел
            const nextNode = equipSelectAll.nextSibling;
            if (nextNode && nextNode.nodeType === Node.TEXT_NODE) {
                nextNode.textContent = ' ' + t.selectAll;
            }
        }
    }
    
    // Обновляем текст чекбокса "Все" в фильтре атак
    const attacksSelectAll = document.getElementById('attacks-select-all');
    if (attacksSelectAll) {
        const label = attacksSelectAll.closest('label');
        if (label) {
            const checkbox = label.querySelector('input[type="checkbox"]');
            label.innerHTML = '';
            if (checkbox) label.appendChild(checkbox);
            label.appendChild(document.createTextNode(' ' + t.selectAll));
        }
    }
	
    // Обновляем текст чекбокса "Все" в фильтре фортификаций
    const fortifSelectAll = document.getElementById('fortif-select-all');
    if (fortifSelectAll) {
        const label = fortifSelectAll.closest('label');
        if (label) {
            const checkbox = label.querySelector('input[type="checkbox"]');
            label.innerHTML = '';
            if (checkbox) label.appendChild(checkbox);
            label.appendChild(document.createTextNode(' ' + t.selectAll));
        } else {
            const nextNode = fortifSelectAll.nextSibling;
            if (nextNode && nextNode.nodeType === Node.TEXT_NODE) {
                nextNode.textContent = ' ' + t.selectAll;
            }
        }
    }	
    
    // Сохраняем выбор в localStorage
    localStorage.setItem('preferredLang', lang);
    document.documentElement.lang = lang;
    
    // Инициируем событие, что язык изменён
    const event = new CustomEvent('languageChanged', { detail: lang });
    document.dispatchEvent(event);
    
    // Обновляем состояние кнопок
    // updateButtons();
}


// Обработчик изменения языка из script.js
document.addEventListener('languageChanged', function(event) {
    currentLang = event.detail;
    if (datePicker) {
        datePicker.destroy();
    }
        initDatePicker();
    
    populateCitiesDropdown(); // Обновляем основной список
    initDartMenu(); // Перестраиваем дартс-меню	
	
	// фильтр техники
    if (typeof initEquipmentFilter === 'function') {
        initEquipmentFilter();
        if (window.isMilEquipVisible) applyEquipmentFilter();
    }
    
    // фильтр атак
    if (typeof initAttacksFilter === 'function') {
        initAttacksFilter();
        if (window.isAttacksVisible) applyAttacksFilter();
    }
	
	// фильтр фортификаций
    if (typeof initFortificationFilter === 'function') {
        initFortificationFilter();
        if (window.isFortificationVisible) applyFortificationFilter();
    }
	
});

// Обработчик кнопки-переключателя языка: каждый клик меняет язык
['lang-toggle', 'lang-toggle-desktop'].forEach(id => {
    const btn = document.getElementById(id);
    if (btn) {
        btn.addEventListener('click', () => {
            setLanguage(currentLang === 'ru' ? 'en' : 'ru');
        });
    }
});

// Инициализация языка при загрузке
document.addEventListener('DOMContentLoaded', function() {
    setLanguage(currentLang);
});

