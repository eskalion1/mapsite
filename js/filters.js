// filters.js
// ============================================
// Категории техники
const equipmentCategories = [
    { tag: 'Авиация',                   labelRu: 'Авиация',     labelEn: 'Aircraft' },
    { tag: 'Артиллерия',                labelRu: 'Артиллерия',  labelEn: 'Artillery' },
    { tag: 'БПЛА',                      labelRu: 'БПЛА',        labelEn: 'UAV' },
    { tag: 'Бронированный транспорт',   labelRu: 'Бронемашины', labelEn: 'AFV' },
    { tag: 'ПВО',                       labelRu: 'ПВО',         labelEn: 'GBAD' },
    { tag: 'Танк',                      labelRu: 'Танки',       labelEn: 'Tanks' },
    { tag: 'Небронированный транспорт', labelRu: 'Транспорт',   labelEn: 'Vehicles' },
    { tag: 'Другое',                    labelRu: 'Другое',      labelEn: 'Other' },
    { tag: 'Другое/Нет данных',         labelRu: 'Нет данных',  labelEn: 'No data' }
];

// Категории атак (полностью аналогично)
const attackCategories = [
    { tag: 'Объект неустановленного назначения',               labelRu: 'Объект неустановленного назначения', labelEn: 'Unidentified facility' },
    { tag: 'Предприятие ВПК',                                  labelRu: 'Предприятие ВПК',                    labelEn: 'Defense industry facility' },
    { tag: 'ЖД инфраструктура',                                labelRu: 'ЖД инфраструктура',                  labelEn: 'Railway infrastructure' },
    { tag: 'Аэродром',                                         labelRu: 'Аэродром',                           labelEn: 'Airfield' },
    { tag: 'Предприятие гражданского или двойного назначения', labelRu: 'Предприятие гражданского или двойного назначения', labelEn: 'Civil or dual-use facility' },
    { tag: 'ПВО, РЛС и ракетное вооружение',                   labelRu: 'ПВО, РЛС и ракетное вооружение',     labelEn: 'Air defense, radar, missile weapons' },
    { tag: 'Подстанция',                                       labelRu: 'Подстанция',                         labelEn: 'Substation' },
    { tag: 'Склад',                                            labelRu: 'Склад',                              labelEn: 'Warehouse' },
    { tag: 'Склад ГСМ',                                        labelRu: 'Склад ГСМ',                          labelEn: 'Fuel depot' },
    { tag: 'Энергогенерация',                                  labelRu: 'Энергогенерация',                    labelEn: 'Power generation' },
    { tag: 'Тяговая подстанция',                               labelRu: 'Тяговая подстанция',                 labelEn: 'Traction substation' },
    { tag: 'Мост',                                             labelRu: 'Мост',                               labelEn: 'Bridge' },
    { tag: 'Газовая инфраструктура',                           labelRu: 'Газовая инфраструктура',             labelEn: 'Gas infrastructure' },
    { tag: 'Судно',                                            labelRu: 'Судно',                              labelEn: 'Ship' },
    { tag: 'Склад боеприпасов',                                labelRu: 'Склад боеприпасов',                  labelEn: 'Ammunition depot' },
    { tag: 'Стоянка грузового транспорта',                     labelRu: 'Стоянка грузового транспорта',       labelEn: 'Truck parking' },
    { tag: 'ППД',                                              labelRu: 'ППД',                                labelEn: 'Permanent deployment point' },
    { tag: 'Поезда и локомотивы',                              labelRu: 'Поезда и локомотивы',                labelEn: 'Trains and locomotives' }
];

// Группы атак – каждая группа содержит несколько категорий
const attackGroups = [
    {
        tag: 'group1',
        labelRu: 'Аэродромы',
        labelEn: 'Air Bases',
        categories: [
            'Аэродром'
        ]
    },
    {
        tag: 'group2',
        labelRu: 'Военные базы',
        labelEn: 'Military sites',
        categories: [
            'ППД',
            'Склад боеприпасов'
            
         ]
        
    },
    {
        tag: 'group3',
        labelRu: 'ГТС/ГСМ',
        labelEn: 'GTS/POL',
        categories: [
            'Газовая инфраструктура',
			'Склад ГСМ',
			'АЗС'
            
         ]
        
    },
    {
        tag: 'group4',
        labelRu: 'ЖД объекты',
        labelEn: 'Railways',
        categories: [
            'ЖД инфраструктура',
            'Тяговая подстанция',
        ]
    },
    {
        tag: 'group5',
        labelRu: 'Логистика',
        labelEn: 'Logistics',
        categories: [
            'Стоянка грузового транспорта',
            'Мост'
        ]
    },
    {
        tag: 'group6',
        labelRu: 'ПВО/РВ',
        labelEn: 'AD/GMW',
        categories: [
            'ПВО, РЛС и ракетное вооружение'
        ]
    },
    {
        tag: 'group7',
        labelRu: 'Производство',
        labelEn: 'Factories',
        categories: [
            'Предприятие ВПК',
            'Предприятие гражданского или двойного назначения'
        ]
    },
    
    {
        tag: 'group8',
        labelRu: 'Склады',
        labelEn: 'Warehouses',
        categories: [
            'Склад'
        ]
    },
        
    {
        tag: 'group9',
        labelRu: 'Транспорт',
        labelEn: 'Transport',
        categories: [
            'Судно',
            'Поезда и локомотивы'            
        ]
    },
    {
        tag: 'group10',
        labelRu: 'Энергетика',
        labelEn: 'Energy',
        categories: [
            'Энергогенерация',
            'Подстанция',
                   
        ]
    },
    {
        tag: 'group11',
        labelRu: 'Не определено',
        labelEn: 'Undefined',
        categories: [
            'Объект неустановленного назначения',
                       
        ]
    }
];

// Отображение категории -> группа (для быстрой проверки)
const categoryToGroupTag = {};
attackGroups.forEach(group => {
    group.categories.forEach(cat => {
        categoryToGroupTag[cat] = group.tag;
    });
});
// Доступен из CanvasPointsLayer.applyFilter
window.categoryToGroupTag = categoryToGroupTag;


// Глобальные переменные для фильтров
window.allEquipmentMarkers = [];     // { marker, category }
// начальное состояние – ничего не выбрано (пустой массив)
window.selectedEquipmentCategories = [];  // null = все, иначе массив
window.isMilEquipVisible = false;

window.allAttacksMarkers = [];
// начальное состояние – ничего не выбрано (пустой массив)
window.selectedAttacksCategories = []; // хранит массив tag групп (или null)
window.isAttacksVisible = false;

// Вспомогательный флаг для предотвращения рекурсии
let isUpdatingFilter = false;

// ========== ОБЩИЕ УТИЛИТЫ ==========
function syncSelectAllState(selectAllId, checkboxClass) {
    const selectAll = document.getElementById(selectAllId);
    if (!selectAll) return;
    const catCheckboxes = document.querySelectorAll(`.${checkboxClass}`);
    const allChecked = Array.from(catCheckboxes).every(cb => cb.checked);
    selectAll.checked = allChecked;
}

// ========== ФИЛЬТР ТЕХНИКИ ==========
function initEquipmentFilter() {
    const container = document.getElementById('equip-category-list');
    if (!container) return;
    container.innerHTML = '';
    equipmentCategories.forEach(cat => {
        const label = currentLang === 'ru' ? cat.labelRu : cat.labelEn;
        const div = document.createElement('div');
        div.innerHTML = `<label><input type="checkbox" class="equip-cat-checkbox" value="${cat.tag}"> ${label}</label>`;
        container.appendChild(div);
    });
    
    const selectAll = document.getElementById('equip-select-all');
    const catCheckboxes = document.querySelectorAll('.equip-cat-checkbox');
    
    // Восстановление состояния – пустой массив означает ничего не выбрано
    if (window.selectedEquipmentCategories === null) {
        // null означает «все», но при инициализации такого быть не должно
        selectAll.checked = true;
        catCheckboxes.forEach(cb => cb.checked = true);
    } else if (window.selectedEquipmentCategories.length === 0) {
        selectAll.checked = false;
        catCheckboxes.forEach(cb => cb.checked = false);
    } else {
        selectAll.checked = false;
        catCheckboxes.forEach(cb => {
            cb.checked = window.selectedEquipmentCategories.includes(cb.value);
        });
    }
    
    selectAll.addEventListener('change', () => {
        const isChecked = selectAll.checked;
        catCheckboxes.forEach(cb => cb.checked = isChecked);
        updateEquipmentFilter();
    });
    
    catCheckboxes.forEach(cb => {
        cb.addEventListener('change', () => {
            syncSelectAllState('equip-select-all', 'equip-cat-checkbox');
            updateEquipmentFilter();
        });
    });
    
    // Применяем начальное состояние фильтра (скрываем всё)
    updateEquipmentFilter();
}

function updateEquipmentFilter() {
    if (isUpdatingFilter) return;
    isUpdatingFilter = true;
    
    const selectAll = document.getElementById('equip-select-all');
    const catCheckboxes = document.querySelectorAll('.equip-cat-checkbox');
    const milEquipBtn = document.getElementById('mil-equip-btn');
    
    if (selectAll.checked) {
        window.selectedEquipmentCategories = null;
        window.isMilEquipVisible = true;
        milEquipBtn.classList.add('active');
        applyEquipmentFilter();
    } else {
        const selected = Array.from(catCheckboxes)
            .filter(cb => cb.checked)
            .map(cb => cb.value);
        window.selectedEquipmentCategories = selected;
        if (selected.length === 0) {
            window.isMilEquipVisible = false;
            milEquipBtn.classList.remove('active');
            hideAllEquipmentMarkers();
        } else {
            window.isMilEquipVisible = true;
            milEquipBtn.classList.add('active');
            applyEquipmentFilter();
        }
    }
    isUpdatingFilter = false;
}

function applyEquipmentFilter() {
    if (!window.isMilEquipVisible) {
        hideAllEquipmentMarkers();
        return;
    }
    if (window.pointsCanvas) window.pointsCanvas.applyFilter();
}

function hideAllEquipmentMarkers() {
    if (window.pointsCanvas) window.pointsCanvas.setLayerTypeVisible('equipment', false);
}

function toggleEquipmentMenu() {
    const menu = document.getElementById('equipment-filter-menu');
    if (!menu) return;
    const isVisible = menu.style.display === 'block';
    if (!isVisible) {
        const btn = document.getElementById('mil-equip-btn');
        const rect = btn.getBoundingClientRect();
        menu.style.top = (rect.bottom + window.scrollY) + 'px';
        menu.style.left = (rect.left + window.scrollX) + 'px';
        menu.style.display = 'block';
        if (window.allEquipmentMarkers.length === 0 && window.milequipKmlPaths) {
            initMilequipLayer(window.milequipKmlPaths).then(() => applyEquipmentFilter());
        } else {
            applyEquipmentFilter();
        }
    } else {
        menu.style.display = 'none';
    }
}

// Функция для обновления заголовка кнопки техники
function updateMilEquipButtonTitle() {
    const btn = document.getElementById('mil-equip-btn');
    if (btn) {
        const t = translations[currentLang];
        btn.title = window.isMilEquipVisible ? (t.hideEquipment || 'Скрыть технику') : (t.showEquipment || 'Показать технику');
    }
}

// ========== ФИЛЬТР АТАК ==========
function initAttacksFilter() {
    const container = document.getElementById('attacks-category-list');
    if (!container) return;
    container.innerHTML = '';
    
    // Строим чекбоксы для групп
    attackGroups.forEach(group => {
        const label = currentLang === 'ru' ? group.labelRu : group.labelEn;
        const div = document.createElement('div');
        div.innerHTML = `<label><input type="checkbox" class="attacks-cat-checkbox" value="${group.tag}"> ${label}</label>`;
        container.appendChild(div);
    });
    
    const selectAll = document.getElementById('attacks-select-all');
    const catCheckboxes = document.querySelectorAll('.attacks-cat-checkbox');
    
    if (window.selectedAttacksCategories === null) {
        selectAll.checked = true;
        catCheckboxes.forEach(cb => cb.checked = true);
    } else if (window.selectedAttacksCategories.length === 0) {
        selectAll.checked = false;
        catCheckboxes.forEach(cb => cb.checked = false);
    } else {
        selectAll.checked = false;
        catCheckboxes.forEach(cb => {
            cb.checked = window.selectedAttacksCategories.includes(cb.value);
        });
    }
    
    selectAll.addEventListener('change', () => {
        const isChecked = selectAll.checked;
        catCheckboxes.forEach(cb => cb.checked = isChecked);
        updateAttacksFilter();
    });
    
    catCheckboxes.forEach(cb => {
        cb.addEventListener('change', () => {
            syncSelectAllState('attacks-select-all', 'attacks-cat-checkbox');
            updateAttacksFilter();
        });
    });
    
    updateAttacksFilter();
}

function updateAttacksFilter() {
    if (isUpdatingFilter) return;
    isUpdatingFilter = true;
    
    const selectAll = document.getElementById('attacks-select-all');
    const catCheckboxes = document.querySelectorAll('.attacks-cat-checkbox');
    const attacksBtn = document.getElementById('attacks-on-ua-btn');
    
    if (selectAll.checked) {
        window.selectedAttacksCategories = null;
        window.isAttacksVisible = true;
        attacksBtn.classList.add('active');
        applyAttacksFilter();
    } else {
        const selected = Array.from(catCheckboxes)
            .filter(cb => cb.checked)
            .map(cb => cb.value);
        window.selectedAttacksCategories = selected;
        if (selected.length === 0) {
            window.isAttacksVisible = false;
            attacksBtn.classList.remove('active');
            hideAllAttacksMarkers();
        } else {
            window.isAttacksVisible = true;
            attacksBtn.classList.add('active');
            applyAttacksFilter();
        }
    }
    isUpdatingFilter = false;
}

function applyAttacksFilter() {
    if (!window.isAttacksVisible) {
        hideAllAttacksMarkers();
        return;
    }
    if (window.pointsCanvas) window.pointsCanvas.applyFilter();
}

function hideAllAttacksMarkers() {
    if (window.pointsCanvas) window.pointsCanvas.setLayerTypeVisible('attacks', false);
}

function toggleAttacksMenu() {
    const menu = document.getElementById('attacks-filter-menu');
    if (!menu) return;
    const isVisible = menu.style.display === 'block';
    if (!isVisible) {
        const btn = document.getElementById('attacks-on-ua-btn');
        const rect = btn.getBoundingClientRect();
        menu.style.top = (rect.bottom + window.scrollY) + 'px';
        menu.style.left = (rect.left + window.scrollX) + 'px';
        menu.style.display = 'block';
        if (window.allAttacksMarkers.length === 0 && window.attacksOnUaKmlPaths) {
            initAttacksOnUaLayer(window.attacksOnUaKmlPaths).then(() => applyAttacksFilter());
        } else {
            applyAttacksFilter();
        }
    } else {
        menu.style.display = 'none';
    }
}

function updateAttacksOnUaButtonTitle() {
    const btn = document.getElementById('attacks-on-ua-btn');
    if (btn) {
        const t = translations[currentLang];
        btn.title = window.isAttacksVisible ? 
            (t.hideAttacksOnUa || 'Скрыть удары по Украине') : 
            (t.showAttacksOnUa || 'Показать удары по Украине');
    }
}

// ========== ФИЛЬТР ФОРТИФИКАЦИЙ ==========
// Глобальные переменные
window.allFortificationLayers = [];    // массив { layerGroup, filePath, displayName }
window.selectedFortificationFiles = []; // пустой массив – ничего не выбрано // null = все, иначе массив выбранных путей
window.isFortificationVisible = false; // переопределим, чтобы управлять через кнопку

// Названия файлов фортификаций на разных языках
const fortificationFileNames = {
    'CK_Trenches':   { ru: 'Траншеи',      en: 'Trenches' },
    'CK_Teeth':      { ru: 'Надолбы',      en: 'Dragon\'s teeth' },
    'CK_Ditches':    { ru: 'Рвы',          en: 'Ditches' },
    'CK_Wire':       { ru: 'Колючка',      en: 'Barbed wire' }
    // 'ditches3':      { ru: 'Рвы (старые)', en: 'Ditches (old)' },
    // 'Barbed_wire':   { ru: 'Колючка (старая)', en: 'Barbed wire (old)' },
    // 'teeth':         { ru: 'Надолбы (старые)', en: 'Dragon\'s teeth (old)' }
};

// Функция для получения отображаемого имени файла
function getFortificationDisplayName(filePath, lang = currentLang) {
    let name = filePath.split('/').pop();
    name = name.replace(/\.(kml|geojson)$/i, '');
    if (fortificationFileNames[name] && fortificationFileNames[name][lang]) {
        return fortificationFileNames[name][lang];
    }
    return null; // файл не поддерживается, не показывать в меню
}

// Инициализация меню фильтра фортификаций
function initFortificationFilter() {
    const container = document.getElementById('fortif-category-list');
    if (!container) return;
    container.innerHTML = '';
    
    if (!window.fortificationKmlPaths || !window.fortificationKmlPaths.length) {
        container.innerHTML = '<div style="color:gray;">Нет данных</div>';
        return;
    }
    
    let hasAny = false;
    window.fortificationKmlPaths.forEach(filePath => {
        const displayName = getFortificationDisplayName(filePath, currentLang);
        if (!displayName) return; // пропускаем файлы без перевода
        hasAny = true;
        const div = document.createElement('div');
        div.innerHTML = `<label><input type="checkbox" class="fortif-cat-checkbox" value="${filePath.replace(/"/g, '&quot;')}"> ${displayName}</label>`;
        container.appendChild(div);
    });
    
    if (!hasAny) {
        container.innerHTML = '<div style="color:gray;">Нет данных</div>';
        return;
    }
    
    const selectAll = document.getElementById('fortif-select-all');
    const catCheckboxes = document.querySelectorAll('.fortif-cat-checkbox');
    
    // Восстановление состояния (по умолчанию ничего не выбрано)
    if (window.selectedFortificationFiles === null) {
        selectAll.checked = true;
        catCheckboxes.forEach(cb => cb.checked = true);
    } else if (window.selectedFortificationFiles.length === 0) {
        selectAll.checked = false;
        catCheckboxes.forEach(cb => cb.checked = false);
    } else {
        selectAll.checked = false;
        catCheckboxes.forEach(cb => {
            cb.checked = window.selectedFortificationFiles.includes(cb.value);
        });
    }
    
    selectAll.addEventListener('change', () => {
        const isChecked = selectAll.checked;
        catCheckboxes.forEach(cb => cb.checked = isChecked);
        updateFortificationFilter();
    });
    
    catCheckboxes.forEach(cb => {
        cb.addEventListener('change', () => {
            syncSelectAllState('fortif-select-all', 'fortif-cat-checkbox');
            updateFortificationFilter();
        });
    });
    
    // Применяем начальное состояние
    updateFortificationFilter();
}

// Обновление фильтра (вызывается при изменении чекбоксов)
function updateFortificationFilter() {
    if (isUpdatingFilter) return;
    isUpdatingFilter = true;
    
    const selectAll = document.getElementById('fortif-select-all');
    const catCheckboxes = document.querySelectorAll('.fortif-cat-checkbox');
    const fortifBtn = document.getElementById('fortification-btn');
    
    if (selectAll.checked) {
        window.selectedFortificationFiles = null;
        window.isFortificationVisible = true;
        fortifBtn.classList.add('active');
        applyFortificationFilter();
    } else {
        const selected = Array.from(catCheckboxes)
            .filter(cb => cb.checked)
            .map(cb => cb.value);
        window.selectedFortificationFiles = selected;
        if (selected.length === 0) {
            window.isFortificationVisible = false;
            fortifBtn.classList.remove('active');
            hideAllFortificationLayers();
        } else {
            window.isFortificationVisible = true;
            fortifBtn.classList.add('active');
            applyFortificationFilter();
        }
    }
    isUpdatingFilter = false;
}

// Применение текущего фильтра к слоям
function applyFortificationFilter() {
    if (!window.allFortificationLayers.length) return;
    
    if (!window.isFortificationVisible) {
        hideAllFortificationLayers();
        return;
    }
    
    // Если выбраны все файлы (null) – показываем все слои
    if (window.selectedFortificationFiles === null) {
        window.allFortificationLayers.forEach(item => {
            if (!map.hasLayer(item.layerGroup)) item.layerGroup.addTo(map);
        });
        return;
    }
    
    // Иначе показываем только выбранные
    const selectedSet = new Set(window.selectedFortificationFiles);
    window.allFortificationLayers.forEach(item => {
        const shouldShow = selectedSet.has(item.filePath);
        if (shouldShow) {
            if (!map.hasLayer(item.layerGroup)) item.layerGroup.addTo(map);
        } else {
            if (map.hasLayer(item.layerGroup)) map.removeLayer(item.layerGroup);
        }
    });
}

function hideAllFortificationLayers() {
    window.allFortificationLayers.forEach(item => {
        if (map.hasLayer(item.layerGroup)) map.removeLayer(item.layerGroup);
    });
}

// Переключение видимости меню фильтра фортификаций
function toggleFortificationMenu() {
    const menu = document.getElementById('fortification-filter-menu');
    if (!menu) return;
    const isVisible = menu.style.display === 'block';
    if (!isVisible) {
        const btn = document.getElementById('fortification-btn');
        const rect = btn.getBoundingClientRect();
        menu.style.top = (rect.bottom + window.scrollY) + 'px';
        menu.style.left = (rect.left + window.scrollX) + 'px';
        menu.style.display = 'block';
        // Если слои ещё не загружены, загружаем их
        if (window.allFortificationLayers.length === 0 && window.fortificationKmlPaths) {
            initFortificationLayerWithFilter(window.fortificationKmlPaths).then(() => applyFortificationFilter());
        } else {
            applyFortificationFilter();
        }
    } else {
        menu.style.display = 'none';
    }
}

// Обновление заголовка кнопки
function updateFortificationButtonTitle() {
    const btn = document.getElementById('fortification-btn');
    if (btn) {
        const t = translations[currentLang];
        btn.title = window.isFortificationVisible ? 
            (t.hideFortifications || 'Скрыть фортификации') : 
            (t.showFortifications || 'Показать фортификации');
    }
}

// Новая функция загрузки фортификаций с поддержкой отдельных слоёв
async function initFortificationLayerWithFilter(kmlFilePaths) {
    // Очищаем старые данные
    if (window.allFortificationLayers.length) {
        window.allFortificationLayers.forEach(item => {
            if (map.hasLayer(item.layerGroup)) map.removeLayer(item.layerGroup);
        });
        window.allFortificationLayers = [];
    }
    
    for (const path of kmlFilePaths) {
        // Проверяем, должен ли этот файл отображаться в меню
        const displayName = getFortificationDisplayName(path, currentLang);
        if (!displayName) continue; // пропускаем
    
        const layerGroup = L.layerGroup();
        const ext = path.split('.').pop().toLowerCase();
        
        try {
            if (ext === 'geojson' || ext === 'json') {
                const response = await fetch(path);
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                const geojsonData = await response.json();
                const geoJsonLayer = L.geoJSON(geojsonData, {
                    style: function(feature) {
                        return {
                            color: feature.properties?.stroke || '#ff0000',
                            weight: feature.properties?.['stroke-width'] || 2,
                            opacity: feature.properties?.['stroke-opacity'] || 1,
                        };
                    },
                    onEachFeature: function(feature, layer) {
                        if (feature.properties && feature.properties.name) {
                            layer.bindPopup(feature.properties.name);
                        }
                    }
                });
                geoJsonLayer.addTo(layerGroup);
            } else {
                // KML
                await loadKmlToLayer(path, layerGroup, {
                    isPermanent: false,
                    preserveZoom: true,
                    fitBounds: false
                });
            }
            window.allFortificationLayers.push({
                layerGroup: layerGroup,
                filePath: path,
                displayName: displayName
            });
            console.log(`Загружен слой фортификации: ${path}`);
        } catch (error) {
            console.error(`Ошибка загрузки фортификации ${path}:`, error);
        }
    }
    
    if (window.isFortificationVisible) applyFortificationFilter();
    else hideAllFortificationLayers();
    
    return window.allFortificationLayers;
}

// ========== СЛОЙ ПОДРАЗДЕЛЕНИЙ ВСУ ==========

// Глобальные переменные для слоя
window.unitsUaMarkers = [];          // массив маркеров
window.isUnitsUaVisible = false;     // флаг видимости
window.unitsUaLayer = null;          // групп-слой
window.unitsUaIconsMap = {};         // словарь id → { photo, title }
window.unitsUaIconsLoaded = false;   // загружен ли result.json
window.unitsUaDetailsMap = {};       // Дополнительный объект для хранения детальной информации о подразделении
window.unitsUaDetailMode = false;    // режим детального просмотра
window.unitsUaDetailProfileId = null; // ID подразделения в режиме деталей
window.unitsUaSavedMarkers = [];     // сохранённые маркеры ПВД для восстановления
window.unitsUaDetailMarkers = [];    // маркеры БД в режиме деталей
window.unitsUaDetailPvdMarkers = []; // маркеры ПВД в режиме деталей

// Функция парсинга текста сообщения для извлечения состава, вооружения и меток
function parseUnitsUaDetails(text) {
    const details = {
        composition: '',
        armament: '',
        formation: '',
        armyCorps: '?',
        description: ''
    };
    if (!text) return details;

    // Парсинг "Описание" – исключаем строки, начинающиеся с префиксов ссылок
    const descRegex = /Описание:?\s*([\s\S]*?)(?=\n\s*(?:ТГ|ФБ|Ют|Тв|Инст|Тик|X|Facebook|Telegram|Youtube|Instagram|TikTok|Twitter|Link|Сайт|Веб|http|Состав|Вооружение|$))/i;
    const descMatch = text.match(descRegex);
    if (descMatch) {
        details.description = descMatch[1].trim();
    }

    // Ищем секцию "Состав" – от слова "Состав" (с двоеточием или без) до следующего пустого блока или до "Вооружение"
    const compRegex = /Состав:?[\s\n]*([\s\S]*?)Вооружение/i;
    const compMatch = text.match(compRegex);
    if (compMatch) {
        details.composition = compMatch[1].trim();
    }

    // Ищем секцию "Вооружение" – от слова "Вооружение" до следующего пустого блока или до заголовков (РСЗО, Тяжёлая бронетехника, Зенитно-ракетные, #)
    const armRegex = /Вооружение:?[\s\n]*([^#]+)/i;
    const armMatch = text.match(armRegex);
    if (armMatch) {
        details.armament = armMatch[1].trim();
    }

    // Формирование по хэштегу
    const formationTags = ['#ВСУ', '#НГУ', '#ГПСУ', '#МВД'];
    for (const tag of formationTags) {
        if (text.includes(tag)) {
            details.formation = tag.substring(1);
            break;
        }
    }

    // Армейский корпус
    const akMatch = text.match(/#АК_(\d+)/);
    if (akMatch) details.armyCorps = akMatch[1];

    return details;
}

// Загрузка иконок и названий из result.json (поддержка photo и file_name)
async function loadUnitsUaIcons() {
    if (window.unitsUaIconsLoaded) return;

    const jsonPath = window.unitsUaJsonPath;
    if (!jsonPath) {
        console.error('Путь к UnitsUA.json не задан (window.unitsUaJsonPath)');
        return;
    }

    try {
        const response = await fetch(jsonPath);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        window.unitsUaData = data;

        for (const msg of data.messages) {
            if (!msg.file && !msg.file_name) continue;

            let imagePath = null;
            if (msg.file && typeof msg.file === 'string') {
                imagePath = msg.file;
            } else if (msg.file_name && typeof msg.file_name === 'string') {
                imagePath = 'files/' + msg.file_name;
            }
            if (!imagePath) continue;

            const fullText = getMessageText(msg);
            if (!fullText) continue;

            const idMatch = fullText.match(/^ID\s*:\s*(\d+)/m);
            if (!idMatch) continue;

            const profileId = idMatch[1];
            
            // console.log(`Обработка сообщения ID: ${idMatch ? idMatch[1] : 'unknown'}`);
            const details = parseUnitsUaDetails(fullText);
            // console.log(`Детали для ID ${profileId}:`, details);

            // Извлекаем название (первая непустая строка после ID)
            const lines = fullText.split('\n');
            let title = '';
            for (let i = 1; i < lines.length; i++) {
                const line = lines[i].trim();
                if (line && !line.startsWith('http')) {
                    title = line;
                    break;
                }
            }

            // Сохраняем иконку и название
            window.unitsUaIconsMap[profileId] = {
                photo: imagePath,
                title: title || `Подразделение ID:${profileId}`
            };

            // Парсим детали (состав, вооружение, формирование, армейский корпус)
            window.unitsUaDetailsMap[profileId] = parseUnitsUaDetails(fullText);
        }

        window.unitsUaIconsLoaded = true;
        // console.log(`Загружено ${Object.keys(window.unitsUaIconsMap).length} профилей с деталями`);
    } catch (error) {
        console.error('Ошибка загрузки UnitsUA.json:', error);
        window.unitsUaIconsLoaded = true;
    }
}

function getMessageText(msg) {
    if (typeof msg.text === 'string') return msg.text;
    if (Array.isArray(msg.text))
        return msg.text.map(part => (typeof part === 'string' ? part : part.text)).join('');
    return '';
}

// Функция поиска профилей по цифрам
// точное совпадение числа, для обоих тэгов
function getProfileIdsBySearchDigits(digits) {
    const result = new Set();
    if (!window.unitsUaData || !window.unitsUaData.messages) return result;

    const reBr = /#Бр_(\d+)/g;
    const rePk = /#Пк_(\d+)/g;

    for (const msg of window.unitsUaData.messages) {
        const text = getMessageText(msg);
        let found = false;

        // Проверяем все вхождения #Бр_ (не прерываем)
        let match;
        while ((match = reBr.exec(text)) !== null) {
            if (match[1] === digits) {
                found = true;
                // Можно продолжать, но break не ставим, чтобы не прерывать
            }
        }
        // Проверяем все вхождения #Пк_ (всегда, даже если уже found)
        while ((match = rePk.exec(text)) !== null) {
            if (match[1] === digits) {
                found = true;
            }
        }

        if (found) {
            const idMatch = text.match(/^ID\s*:\s*(\d+)/m);
            if (idMatch) result.add(idMatch[1]);
        }
    }
    return result;
}

// Парсинг даты из CSV (формат YYYY.MM.DD)
function parseCsvDate(dateStr) {
    if (!dateStr) return null;
    const parts = dateStr.split('.');
    if (parts.length !== 3) return null;
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1; // месяцы в JS 0-11
    const day = parseInt(parts[2], 10);
    return new Date(year, month, day);
}

// Парсинг строки CSV
function parseUnitsCsvRow(row) {
    const parts = row.split(',');
    if (parts.length < 7) return null; // минимум до столбца "Источник"
    return {
        profileId: parts[1].trim(),
        date: parts[2].trim(),
        lat: parseFloat(parts[3].trim()),
        lng: parseFloat(parts[4].trim()),
        characteristic: parts[5].trim(),
        link: parts[6].trim(),
        details: parts.length > 7 ? parts.slice(7).join(',').trim() : ''
    };
}

// Функция загрузки точек с фильтром по дате (только ПВД, не более одной на ID)
async function loadUnitsUaWithDateFilter(targetDateStr, allowedProfileIds = null) {
    if (!window.unitsUaCsvPath) {
        console.error('Путь к CSV не задан в data.js');
        return;
    }

    try {
        const response = await fetch(window.unitsUaCsvPath);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const csvText = await response.text();
        const lines = csvText.split(/\r?\n/).filter(line => line.trim().length > 0);
        if (lines.length === 0) return;

        const dataLines = lines.slice(1); // без заголовка

        const allRows = [];
        for (const line of dataLines) {
            const data = parseUnitsCsvRow(line);
            if (!data) continue;
            if (isNaN(data.lat) || isNaN(data.lng)) continue;
            if (data.characteristic !== 'ПВД') continue;
            if (allowedProfileIds && !allowedProfileIds.has(data.profileId)) continue;
            allRows.push(data);
        }

        const byProfile = {};
        allRows.forEach(row => {
            if (!byProfile[row.profileId]) byProfile[row.profileId] = [];
            byProfile[row.profileId].push(row);
        });

        const targetDate = parseCustomDate(targetDateStr);
        const selectedRows = [];

        for (const profileId in byProfile) {
            const rows = byProfile[profileId];
            const validRows = rows.filter(row => {
                const rowDate = parseCsvDate(row.date);
                return rowDate <= targetDate;
            });
            if (validRows.length === 0) continue;
            const latestRow = validRows.reduce((a, b) => {
                const dateA = parseCsvDate(a.date);
                const dateB = parseCsvDate(b.date);
                return dateA > dateB ? a : b;
            });
            selectedRows.push(latestRow);
        }

        await loadUnitsUaIcons(); // гарантируем, что детали загружены

        if (window.unitsUaLayer) {
            window.unitsUaLayer.clearLayers();
        } else {
            window.unitsUaLayer = L.layerGroup();
        }
        window.unitsUaMarkers = [];

        const defaultIcon = L.icon({
            iconUrl: 'img/attack types/Взрывчик.png',
            iconSize: [28, 28],
            iconAnchor: [14, 14],
            popupAnchor: [0, 0]
        });

        for (const row of selectedRows) {
            let icon = defaultIcon;
            let unitTitle = '';
            const iconInfo = window.unitsUaIconsMap[row.profileId];
            if (iconInfo) {
                icon = L.icon({
                    iconUrl: `units/ua/${iconInfo.photo}`,
                    iconSize: [28, 32],
                    iconAnchor: [14, 16],
                    popupAnchor: [0, -16]
                });
                unitTitle = iconInfo.title;
            } else {
                unitTitle = `ID:${row.profileId}`;
            }

            const marker = L.marker([row.lat, row.lng], { icon: icon, _profileId: row.profileId });

            // Получаем детали для данного profileId, если нет — создаём с пустыми значениями
			const details = window.unitsUaDetailsMap[row.profileId] || { composition: '', armament: '', formation: '', armyCorps: '?', description: '' };

			// Для единообразия всегда показываем блоки, даже если данные отсутствуют
            const descriptionText = details.description.trim() ? details.description : '?';
			const compositionText = details.composition.trim() ? details.composition : '?';
			const armamentText = details.armament.trim() ? details.armament : '?';
			const formationText = details.formation.trim() ? details.formation : '?';
			const armyCorpsText = details.armyCorps || '?';

			// Формируем HTML popup
			let popupHtml = `<div style="font-size:14px;"><strong>${escapeHtml(unitTitle)}</strong>`;

            // Описание (всегда сворачиваемый блок)
            popupHtml += `
                <details class="collapse-block" style="margin-top:8px;">
                <summary>📄 Описание</summary>
                <div class="collapse-content" style="margin-top: 4px; white-space: pre-wrap;">${escapeHtml(descriptionText).replace(/\n/g, '<br>')}</div>
                </details>`;

			// Состав (всегда сворачиваемый блок)
			popupHtml += `
				<details class="collapse-block" style="margin-top:8px;">
					<summary>📄 Состав</summary>
					<div class="collapse-content" style="margin-top: 4px; white-space: pre-wrap;">${escapeHtml(compositionText).replace(/\n/g, '<br>')}</div>
				</details>`;

			// Вооружение (всегда сворачиваемый блок)
			popupHtml += `
				<details class="collapse-block" style="margin-top:8px;">
					<summary>📄 Вооружение</summary>
					<div class="collapse-content" style="margin-top: 4px; white-space: pre-wrap;">${escapeHtml(armamentText).replace(/\n/g, '<br>')}</div>
				</details>`;

			// Формирование (всегда видимая строка)
			popupHtml += `<div style="margin-top:4px;"><strong>Формирование:</strong> ${escapeHtml(formationText)}</div>`;

			// Армейский корпус (всегда видимая строка)
			popupHtml += `<div style="margin-top:4px;"><strong>Армейский корпус:</strong> ${escapeHtml(armyCorpsText)}</div>`;
			
			//
			popupHtml += `<div style="margin-top:4px;"><strong>Дата:</strong> ${escapeHtml(row.date)}</div>`;

			//
			popupHtml += `<div class="units-ua-details-btn-wrap"><button class="units-ua-details-btn" onclick="window.showUnitDetailsForProfileId('${row.profileId}'); map.closePopup();">Геоданные</button></div>`;
			popupHtml += `</div>`;

			marker.bindPopup(popupHtml, { className: 'units-ua-popup' });
            marker.addTo(window.unitsUaLayer);
            window.unitsUaMarkers.push(marker);
        }

        // console.log(`Загружено ${window.unitsUaMarkers.length} точек ПВД с расширенной информацией для даты ${targetDateStr}`);
    } catch (error) {
        console.error('Ошибка загрузки CSV подразделений ВСУ:', error);
    }
}

// Показывает детали для выбранного подразделения
async function showUnitDetailsForProfileId(profileId) {
    if (window.unitsUaDetailMode && window.unitsUaDetailProfileId === profileId) {
        resetUnitDetails();
        return;
    }

    // Сбрасываем предыдущий режим деталей, если он был
    if (window.unitsUaDetailMode) {
        resetUnitDetails();
    }

    window.unitsUaDetailMode = true;
    window.unitsUaDetailProfileId = profileId;

    // Сохраняем текущие маркеры ПВД для восстановления
    window.unitsUaSavedMarkers = [...window.unitsUaMarkers];

    // Очищаем слой
    if (window.unitsUaLayer) {
        window.unitsUaLayer.clearLayers();
    }
    window.unitsUaMarkers = [];
    window.unitsUaDetailMarkers = [];
    window.unitsUaDetailPvdMarkers = [];

    // Определяем иконку подразделения
    const unitIconInfo = window.unitsUaIconsMap[profileId];
    const unitTitle = unitIconInfo ? unitIconInfo.title : `ID:${profileId}`;
    const unitIcon = unitIconInfo
        ? L.icon({
            iconUrl: `units/ua/${unitIconInfo.photo}`,
            iconSize: [28, 32],
            iconAnchor: [14, 16],
            popupAnchor: [0, -16]
        })
        : L.icon({
            iconUrl: 'img/attack types/Взрывчик.png',
            iconSize: [28, 28],
            iconAnchor: [14, 14],
            popupAnchor: [0, 0]
        });

    // Добавляем обратно актуальный маркер (с оригинальным попапом и кнопкой)
    const currentMarker = window.unitsUaSavedMarkers.find(function(m) {
        return m && m.options && m.options._profileId === profileId;
    });
    if (currentMarker) {
        currentMarker.addTo(window.unitsUaLayer);
        window.unitsUaMarkers.push(currentMarker);
    }

    // Загружаем все геолокации (ПВД и БД) для этого profileId
    try {
        const response = await fetch(window.unitsUaCsvPath);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const csvText = await response.text();
        const lines = csvText.split(/\r?\n/).filter(function(line) { return line.trim().length > 0; });
        if (lines.length === 0) return;

        const dataLines = lines.slice(1);
        for (const line of dataLines) {
            const data = parseUnitsCsvRow(line);
            if (!data) continue;
            if (isNaN(data.lat) || isNaN(data.lng)) continue;
            if (data.profileId !== profileId) continue;

            // Пропускаем запись, которая уже отображена актуальным маркером
            if (currentMarker) {
                const curLatLng = currentMarker.getLatLng();
                if (Math.abs(data.lat - curLatLng.lat) < 0.0001 && Math.abs(data.lng - curLatLng.lng) < 0.0001) {
                    continue;
                }
            }

            if (data.characteristic === 'ПВД') {
                const oldPvdIcon = L.icon({
                    iconUrl: unitIconInfo ? `units/ua/${unitIconInfo.photo}` : 'img/attack types/Взрывчик.png',
                    iconSize: [24, 28],
                    iconAnchor: [10, 12],
                    popupAnchor: [0, -12]
                });
                const pvdMarker = L.marker([data.lat, data.lng], { icon: oldPvdIcon, _profileId: profileId });
                pvdMarker.bindPopup(
                    `<div style="font-size:13px;">
                        <strong>${escapeHtml(unitTitle)}</strong>
                        <div style="margin-top:4px;"><strong>Дата:</strong> ${escapeHtml(data.date)}</div>
                    </div>`,
                    { className: 'units-ua-popup' }
                );
                pvdMarker.addTo(window.unitsUaLayer);
                window.unitsUaDetailPvdMarkers.push(pvdMarker);
            } else if (data.characteristic === 'БД') {
                const bdIcon = L.icon({
                    iconUrl: 'img/attack types/Взрывчик.png',
                    iconSize: [32, 32],
                    iconAnchor: [16, 24],
                    popupAnchor: [0, -24]
                });
                const bdMarker = L.marker([data.lat, data.lng], { icon: bdIcon });
                let bdPopup = `<div style="font-size:13px;"><strong>Боевые действия</strong>`;
                bdPopup += `<div style="margin-top:4px;"><strong>Дата:</strong> ${escapeHtml(data.date)}</div>`;
                if (data.details) {
                    bdPopup += `<div style="margin-top:4px;"><strong>Примечание:</strong> ${escapeHtml(data.details)}</div>`;
                }
                if (data.link) {
                    bdPopup += `<div style="margin-top:4px;"><a href="${escapeHtml(data.link)}" target="_blank" rel="noopener" title="${escapeHtml(data.link)}">Источник</a></div>`;
                }
                bdPopup += `</div>`;
                bdMarker.bindPopup(bdPopup, { className: 'units-ua-popup' });
                bdMarker.addTo(window.unitsUaLayer);
                window.unitsUaDetailMarkers.push(bdMarker);
            }
        }
    } catch (error) {
        console.error('Ошибка загрузки CSV для деталей:', error);
    }
}

// Восстанавливает все маркеры ПВД и убирает БД маркеры
function resetUnitDetails() {
    if (!window.unitsUaDetailMode) return;

    window.unitsUaDetailMode = false;
    window.unitsUaDetailProfileId = null;

    if (window.unitsUaLayer) {
        window.unitsUaLayer.clearLayers();
    }

    window.unitsUaMarkers = [];
    window.unitsUaDetailMarkers = [];
    window.unitsUaDetailPvdMarkers = [];

    window.unitsUaSavedMarkers.forEach(function(m) {
        if (m) {
            m.addTo(window.unitsUaLayer);
            window.unitsUaMarkers.push(m);
        }
    });
    window.unitsUaSavedMarkers = [];
}

// Простая функция экранирования HTML (чтобы избежать XSS)
function escapeHtml(str) {
    if (!str) return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// Перезагрузка слоя с учётом текущей selectedDate
function reloadUnitsUaLayer() {
    if (window.isUnitsUaVisible) {
        resetUnitDetails();
        const currentDate = window.selectedDate || getCurrentDateFormatted();
        let filterSet = null;
        if (window.unitsSearchDigits) {
            filterSet = window.getProfileIdsBySearchDigits(window.unitsSearchDigits);
            if (filterSet.size === 0) filterSet = new Set();
        }
        loadUnitsUaWithDateFilter(currentDate, filterSet).then(() => {
            // Убедимся, что слой существует (защита от null)
            if (!window.unitsUaLayer) {
                window.unitsUaLayer = L.layerGroup();
            }
            if (!map.hasLayer(window.unitsUaLayer)) {
                window.unitsUaLayer.addTo(map);
            }
        });
    }
}

// Функция поиска
function applyUnitsSearch() {
    const input = document.getElementById('units-search-input');
    const raw = input.value.trim();
    if (raw && /^\d{1,3}$/.test(raw)) {
        window.unitsSearchDigits = raw;
    } else {
        window.unitsSearchDigits = null;
        input.value = '';
    }
    reloadUnitsUaLayer();
}

// Переключение видимости слоя
async function toggleUnitsUa() {
    const panel = document.getElementById('units-search-panel');
    const btn = document.getElementById('units-ua-btn');
    
    if (!window.isUnitsUaVisible) {
        // ===== Включение слоя =====
        const currentDate = window.selectedDate || getCurrentDateFormatted();
        if (!window.unitsUaLayer) {
            window.unitsUaLayer = L.layerGroup();
        }
        let filterSet = null;
        if (window.unitsSearchDigits) {
            filterSet = window.getProfileIdsBySearchDigits(window.unitsSearchDigits);
            if (filterSet.size === 0) filterSet = new Set();
        }
        try {
            await loadUnitsUaWithDateFilter(currentDate, filterSet);
        } catch (err) {
            console.error('Ошибка загрузки UnitsUA слоя:', err);
        }
        window.unitsUaLayer.addTo(map);
        
        // Позиционирование панели
        if (panel && btn) {
            if (window.innerWidth <= 768) {
                // мобильные: фиксированный левый верхний угол
                panel.style.position = 'fixed';
                panel.style.top = '0px';
                panel.style.left = '0px';
            } else {
                // десктоп: под кнопкой
                const rect = btn.getBoundingClientRect();
                panel.style.position = 'absolute';
                panel.style.top = (rect.bottom + window.scrollY) + 'px';
                panel.style.left = (rect.left + window.scrollX) + 'px';
            }
            panel.style.display = 'flex';
        }
        
        window.isUnitsUaVisible = true;
        btn.classList.add('active');
    } else {
        // ===== Выключение слоя =====
        resetUnitDetails();
        if (window.unitsUaLayer && map.hasLayer(window.unitsUaLayer)) {
            map.removeLayer(window.unitsUaLayer);
        }
        if (panel) {
            panel.style.display = 'none';
            const input = document.getElementById('units-search-input');
            if (input) input.value = '';
            window.unitsSearchDigits = null;
        }
        window.isUnitsUaVisible = false;
        btn.classList.remove('active');
    }

    // Обновляем title кнопки
    // if (btn) {
        // const t = translations[currentLang];
        // btn.title = window.isUnitsUaVisible ?
            // (t.hideUnitsUa || 'Скрыть подразделения ВСУ') :
            // (t.showUnitsUa || 'Показать подразделения ВСУ');
    // }
}

// Обновление всплывающей подсказки кнопки подразделений ВСУ
function updateUnitsUaButtonTitle() {
    const btn = document.getElementById('units-ua-btn');
    if (!btn) return;
    const t = translations[currentLang];
    btn.title = t.showUnitsUa || 'Подразделения ВСУ';
}

// Инициализация кнопки подразделений
function initUnitsUaButton() {
    const btn = document.getElementById('units-ua-btn');
    if (!btn) return;

    // Создаём панель поиска
    const searchPanel = document.createElement('div');
    searchPanel.id = 'units-search-panel';
    searchPanel.style.display = 'none';
    searchPanel.innerHTML = `
        <span class="units-search-input-wrap">
            <input type="text" id="units-search-input" placeholder="123" maxlength="3"
                   inputmode="numeric" pattern="[0-9]*">
            <button id="units-search-clear" class="units-search-clear-inside" title="Очистить">✕</button>
        </span>
        <button id="units-search-btn" title="Поиск">🔍</button>
    `;
    // btn.parentNode.insertBefore(searchPanel, btn.nextSibling);
    document.body.appendChild(searchPanel);

    const searchInput = document.getElementById('units-search-input');
    const searchClearBtn = document.getElementById('units-search-clear');

    // Управление видимостью крестика
    searchInput.addEventListener('input', function() {
        searchClearBtn.style.display = this.value.trim() ? 'block' : 'none';
    });

    // Обработчики панели
    document.getElementById('units-search-btn').addEventListener('click', applyUnitsSearch);
    searchClearBtn.addEventListener('click', () => {
        searchInput.value = '';
        window.unitsSearchDigits = null;
        // input event автоматически скроет крестик
        reloadUnitsUaLayer();
    });
    searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') applyUnitsSearch();
    });

    // Обработчик самой кнопки
    btn.addEventListener('click', toggleUnitsUa);

    window.isUnitsUaVisible = false;
    btn.classList.remove('active');
    const t = translations[currentLang];
    btn.title = t.showUnitsUa || 'Показать подразделения ВСУ';
}

// Экспортируем новые функции

// ========== ИНИЦИАЛИЗАЦИЯ ВСЕХ ФИЛЬТРОВ ==========
function initFilters() {
    initEquipmentFilter();
    initAttacksFilter();
    initFortificationFilter();
    // Обновим заголовки кнопок
    // updateMilEquipButtonTitle();
    // updateAttacksOnUaButtonTitle();
    // updateFortificationButtonTitle();
}

// Экспортируем функции, которые будут нужны в script.js
window.initFilters = initFilters;
window.initFortificationFilter = initFortificationFilter;
window.initFortificationLayerWithFilter = initFortificationLayerWithFilter;

window.toggleEquipmentMenu = toggleEquipmentMenu;
window.toggleAttacksMenu = toggleAttacksMenu;
window.toggleFortificationMenu = toggleFortificationMenu;

window.updateMilEquipButtonTitle = updateMilEquipButtonTitle;
window.updateAttacksOnUaButtonTitle = updateAttacksOnUaButtonTitle;
window.updateFortificationButtonTitle = updateFortificationButtonTitle;
window.updateUnitsUaButtonTitle = updateUnitsUaButtonTitle;

window.applyEquipmentFilter = applyEquipmentFilter;
window.applyAttacksFilter = applyAttacksFilter;
window.applyFortificationFilter = applyFortificationFilter;

window.hideAllEquipmentMarkers = hideAllEquipmentMarkers;
window.hideAllAttacksMarkers = hideAllAttacksMarkers;
window.hideAllFortificationLayers = hideAllFortificationLayers;

window.reloadUnitsUaLayer = reloadUnitsUaLayer;
window.showUnitDetailsForProfileId = showUnitDetailsForProfileId;


//
document.addEventListener('DOMContentLoaded', function() {
    // Перемещаем меню техники в body
    const equipMenu = document.getElementById('equipment-filter-menu');
    if (equipMenu && equipMenu.parentNode !== document.body) {
        document.body.appendChild(equipMenu);
    }
    
    // Перемещаем меню атак в body
    const attacksMenu = document.getElementById('attacks-filter-menu');
    if (attacksMenu && attacksMenu.parentNode !== document.body) {
        document.body.appendChild(attacksMenu);
    }
    
    // Перемещаем меню фортификаций в body
    const fortificationMenu = document.getElementById('fortification-filter-menu');
    if (fortificationMenu && fortificationMenu.parentNode !== document.body) {
        document.body.appendChild(fortificationMenu);
    }
});
