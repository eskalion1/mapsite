// OSM tile
const osmUrl = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
const osmAttrib =
'&copy; <a href="https://openstreetmap.org/copyright">' +
"OpenStreetMap</a> contributors";
window.osm = L.tileLayer(osmUrl, {
    attribution: osmAttrib,
    // maxZoom: 18,
    noWrap: true,
    name: 'osm'
});

// CyclOSM
// const cyclosmUrl = "https://{s}.tile-cyclosm.openstreetmap.fr/cyclosm/{z}/{x}/{y}.png";
// const cyclosmAttrib =
// '<a href="https://github.com/cyclosm/cyclosm-cartocss-style/releases" title="CyclOSM - Open Bicycle render">CyclOSM</a> | Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors"';
// window.cyclosm = L.tileLayer(cyclosmUrl, {
    // attribution: cyclosmAttrib,
    // noWrap: true,
    // name: 'cyclosm'
// });

// OpenTopoMap
const topoUrl = "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png";
const topoAttrib =
"Kartendaten: © OpenStreetMap-Mitwirkende, SRTM | Kartendarstellung: © OpenTopoMap (CC-BY-SA) ";
window.topo = L.tileLayer(topoUrl, {
  // maxZoom: 18,
  attribution: topoAttrib,
  noWrap: true,
  name: 'topo'
});

// ESRI
const esriUrl = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
const esriAttrib = 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
window.esri = L.tileLayer(esriUrl, {
  // maxZoom: 18,
  attribution: esriAttrib,
  noWrap: true,
  name: 'esri'
});

// Carto tile Layer
// const cartoUrl = "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"; 
// window.carto = L.tileLayer(cartoUrl, {
  // noWrap: true,
  // name: 'carto',
  // attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
// }); 

// RU tile Layer - https://qms.nextgis.com/geoservices/563/
// const ruUrl = "http://88.99.52.155/cgi-bin/tapp/tilecache.py/1.0.0/topomapper_v2/{z}/{x}/{y}.jpg"; 
// const ruAttriib = 'Tiles &copy; ATLOGIS Geoinformatics oHG';
// window.ru = L.tileLayer(ruUrl, {
    // minZoom: 10,
    // maxZoom: 13,
    // noWrap: true,
    // name: 'ruarmy',
    // attribution: ruAttriib,
// });

// Google maps layer
window.goo = L.tileLayer('http://{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', {
      // maxZoom: 20,
      subdomains:['mt0','mt1','mt2','mt3'],
      name: 'google',
      attribution: 'Map data &copy; Google'
});
 // lyrs =
    // s: Спутник (Satellite)
    // y: Гибрид (не h)
    // m: Схема (Map)
    // p: Террейн (Terrain)
    // r: Некоторый тип схемы (Altered roadmap)

// Яндекс Карты (схема)
const yandexUrl = 'https://core-renderer-tiles.maps.yandex.net/tiles?l=map&x={x}&y={y}&z={z}&scale=1&lang=ru_RU';
const yandexAttrib = '<a http="https://yandex.ru" target="_blank">Yandex</a>';
window.yandexLayer = L.tileLayer(yandexUrl, {
    attribution: yandexAttrib,
    subdomains: ['01','02','03','04'],
    noWrap: true,
    name: 'yandex',
    minZoom: 12
	// crs: L.CRS.EPSG3395,
    //zoomOffset: 0
});




/////////////////////////////////////////////

// === Чтение координат из URL ===
function getUrlCoords() {
    const params = new URLSearchParams(window.location.search);
    let lat = parseFloat(params.get('lat'));
    let lng = parseFloat(params.get('lng') ?? params.get('lon'));
    let zoom = parseInt(params.get('zoom') ?? params.get('z'), 10);
    if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
        return { lat, lng, zoom: isNaN(zoom) ? 14 : zoom };
    }
    return null;
}

// === Начальные координаты ===
const defaultCoords = [48.257381, 37.134785];
const defaultZoom = 10;
const urlCoords = getUrlCoords();
const initialCenter = urlCoords ? [urlCoords.lat, urlCoords.lng] : defaultCoords;
const initialZoom = urlCoords ? urlCoords.zoom : defaultZoom;

// === Создание карты с правильным центром ===
const map = L.map('map', { preferCanvas: true, zoomControl: false }).setView(initialCenter, initialZoom);
window.osm.addTo(map);

// === Кнопки масштаба: правый нижний угол на десктопе, левый верхний на мобильных ===
let zoomControlInstance = null;
function positionZoomControl() {
    const isMobile = isMobileViewport();
    const pos = isMobile ? 'topleft' : 'bottomright';
    if (zoomControlInstance) {
        map.removeControl(zoomControlInstance);
        zoomControlInstance = null;
    }
    zoomControlInstance = L.control.zoom({ position: pos });
    zoomControlInstance.addTo(map);
}
positionZoomControl();
let _zoomResizeTimer = null;
window.addEventListener('resize', () => {
    clearTimeout(_zoomResizeTimer);
    _zoomResizeTimer = setTimeout(positionZoomControl, 150);
});


// Добавляем обработчик изменения масштаба
map.on('zoomend', function() {
    console.log('Текущий масштаб карты:', map.getZoom());
});


function replaceAttributionFlag() {
    const newSvgString = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 9 6" width="12" height="8"><rect fill="#fff" width="9" height="3"/><rect fill="#d52b1e" y="3" width="9" height="3"/><rect fill="#0039a6" y="2" width="9" height="2"/></svg>';

    // Находим контейнер атрибуции
    const attributionContainer = document.querySelector('.leaflet-control-attribution');
    if (!attributionContainer) {
        setTimeout(replaceAttributionFlag, 100);
        return;
    }

    // Сохраняем оригинальный текст атрибуции (без флагов)
    const originalText = attributionContainer.textContent;
    
    // Удаляем все существующие флаги
    const existingFlags = attributionContainer.querySelectorAll('svg, .leaflet-attribution-flag');
    existingFlags.forEach(flag => flag.remove());
    
    // Создаем контейнер для российского флага
    const flagContainer = document.createElement('span');
    flagContainer.className = 'russian-flag';
    flagContainer.innerHTML = newSvgString;
    
    // Вставляем флаг в начало контейнера
    attributionContainer.insertBefore(flagContainer, attributionContainer.firstChild);
    
    // Восстанавливаем оригинальный текст
    attributionContainer.textContent = originalText;
    attributionContainer.prepend(flagContainer);
}

// Перехват создания элементов атрибуции
const originalAddTo = L.Control.Attribution.prototype.addTo;
L.Control.Attribution.prototype.addTo = function(map) {
    const result = originalAddTo.call(this, map);
    replaceAttributionFlag();
    return result;
};

// Перехват обновления атрибуции
const originalSetPrefix = L.Control.Attribution.prototype.setPrefix;
L.Control.Attribution.prototype.setPrefix = function(prefix) {
    const result = originalSetPrefix.call(this, prefix);
    replaceAttributionFlag();
    return result;
};

const originalAddAttribution = L.Control.Attribution.prototype.addAttribution;
L.Control.Attribution.prototype.addAttribution = function(text) {
    const result = originalAddAttribution.call(this, text);
    replaceAttributionFlag();
    return result;
};

map.whenReady(replaceAttributionFlag);
map.on('baselayerchange', replaceAttributionFlag);

// map.on('baselayerchange', layer => {
    // const center = map.getCenter();
    // if (layer.name.includes('Yandex')) {
      // map.options.crs = L.CRS.EPSG3395;
    // } else {
      // map.options.crs = L.CRS.EPSG3857;
    // }
    // map.setView(center);
  // });

// Управление слоями карты
const baseLayers = {
    "OpenStreetMap": osm,
    // "CyclOSM": cyclosm,
    "OpenTopoMap": topo,
    "ESRI World Imagery": esri,
    // "CartoDB Voyager": carto,
    // "RU Army": ru,
    "Google Maps": goo
    // "Yandex Maps": yandexLayer
};

// Создаем кастомный контрол слоев
const customLayerControl = L.control.layers(baseLayers, null, {
    collapsed: true,
    position: 'topright'
}).addTo(map);

// setTimeout(() => {
    ////////Находим радио-кнопку для активного слоя
    // const activeLayerName = Object.keys(baseLayers).find(name => 
        // map.hasLayer(baseLayers[name])
    // );
    
    // if (activeLayerName) {
        // const inputId = `leaflet-base-layers-${activeLayerName.replace(/\s+/g, '-').toLowerCase()}`;
        // const radioInput = document.querySelector(`#${inputId}`);
        // if (radioInput) {
            // radioInput.checked = true;
        // }
    // }
// }, 100);


// Скрываем стандартный контрол
const layerControlContainer = customLayerControl.getContainer();
layerControlContainer.style.display = 'none';

// Создаем кнопку-иконку
const layersToggle = L.control({position: 'topright'});
layersToggle.onAdd = function(map) {
    this._div = L.DomUtil.create('div', 'leaflet-control-layers-toggle');
    const t = translations[currentLang];
    this._div.innerHTML = `<a href="#" title="${t.layersToggleTitle}"></a>`;
    return this._div;
};
layersToggle.addTo(map);




const layersToggleContainer = layersToggle.getContainer();

// Добавим логирование событий
console.log("Инициализация панели слоев...");

// Флаг для отслеживания нахождения курсора над панелью
let isHoveringPanel = false;

// Флаг для отслеживания состояния панели
let isPanelOpen = false;
let panelHovered = false;
// Флаг для отслеживания открытого состояния панели
let isLayerPanelOpen = false;
// Предотвращаем закрытие при взаимодействии с панелью
// Обработчики для отслеживания состояния наведения
// layerControlContainer.addEventListener('mouseenter', function() {
    // console.log("Курсор вошел в панель слоев");
    // isHoveringPanel = true;
// });

// layerControlContainer.addEventListener('mouseleave', function() {
    // console.log("Курсор вышел из панели слоев");
    // isHoveringPanel = false;
// });

layerControlContainer.addEventListener('mouseenter', () => {
    console.log("Курсор вошел в панель слоев");
    // panelHovered = true;
});

layerControlContainer.addEventListener('mouseleave', () => {
    console.log("Курсор вышел из панели слоев");
    // panelHovered = false;
    
    // Закрываем панель только если она была открыта и курсор ушел
    // setTimeout(() => {
        // if (isPanelOpen && !panelHovered) {
            // console.log("НЕ Автозакрытие панели после задержки");
            // closeLayerPanel();
			openLayerPanel();
        // }
    // }, 300); // Задержка перед закрытием
});

// function toggleLayerPanel() {
    // const isVisible = layerControlContainer.style.display === 'block';
    
    // if (isVisible) {
        // closeLayerPanel();
    // } else {
        // openLayerPanel();
    // }
// }

function openLayerPanel() {
    console.log("Открытие панели слоев");
    layerControlContainer.style.display = 'block';
    layerControlContainer.classList.add('leaflet-control-layers-expanded');
    layersToggleContainer.classList.add('active');
    isLayerPanelOpen = true;
}

function closeLayerPanel() {
    console.log("Закрытие панели слоев");
    layerControlContainer.style.display = 'none';
    layerControlContainer.classList.remove('leaflet-control-layers-expanded');
    layersToggleContainer.classList.remove('active');
    isLayerPanelOpen = false;
}


// Предотвращаем закрытие при клике внутри панели
layerControlContainer.addEventListener('click', function(e) {
    console.log("Клик внутри панели слоев");
    e.stopPropagation();
});

// Обработчик клика
// layersToggle.getContainer().addEventListener('click', function(e) {
    // e.preventDefault();
    // e.stopPropagation();
    
    // const isVisible = layerControlContainer.style.display === 'block';
    // layerControlContainer.style.display = isVisible ? 'none' : 'block';
    // layerControlContainer.classList.toggle('leaflet-control-layers-expanded', !isVisible);
    
    // /////Добавляем/убираем класс активности
    // this.classList.toggle('active', !isVisible);
// });
// Обработчик клика по кнопке переключения
layersToggleContainer.addEventListener('click', function(e) {
    e.preventDefault();
    e.stopPropagation();
    console.log("Клик по кнопке слоев");
    
    if (isLayerPanelOpen) {
        closeLayerPanel();
    } else {
        openLayerPanel();
    }
});

// Обработчик закрытия при клике вне панели
document.addEventListener('click', function(e) {
    // Пропускаем события, если панель не видима
    if (layerControlContainer.style.display !== 'block') return;
    
    const isClickOnPanel = layerControlContainer.contains(e.target);
    const isClickOnToggle = layersToggleContainer.contains(e.target);
    
    console.log(`Клик вне панели: panel=${isClickOnPanel}, toggle=${isClickOnToggle}, hover=${isHoveringPanel}`);
    
    if (!isClickOnPanel && !isClickOnToggle && !isHoveringPanel) {
        console.log("Закрытие панели слоев");
        layerControlContainer.style.display = 'none';
        layersToggleContainer.classList.remove('active');
    }
});

// обработчик для закрытия панели при выборе слоя
// layerControlContainer.addEventListener('click', function(e) {
    // e.stopPropagation();
    
    ///////////Закрываем панель при выборе слоя
    // if (e.target.tagName === 'INPUT' && e.target.type === 'radio') {
        // layerControlContainer.style.display = 'none';
        // layersToggle.getContainer().classList.remove('active');
    // }
// });

////// Закрытие при клике вне области
// map.on('click', function() {
    // if (layerControlContainer.style.display === 'block') {
        // layerControlContainer.style.display = 'none';
    // }
// });
// Обработчик клика по документу
document.addEventListener('click', function(e) {
    // Если панель не открыта, ничего не делаем
    if (!isLayerPanelOpen) return;
    
    // Проверяем, был ли клик внутри панели или по кнопке переключения
    const isClickInsidePanel = layerControlContainer.contains(e.target);
    const isClickOnToggle = layersToggleContainer.contains(e.target);
    
    console.log(`Клик вне панели: panel=${isClickInsidePanel}, toggle=${isClickOnToggle}`);
    
    // Если клик был вне панели и не по кнопке, закрываем панель
    if (!isClickInsidePanel && !isClickOnToggle) {
        closeLayerPanel();
    }
});
// Для RU слоя ограничиваем зум
map.on('baselayerchange', function(e) {
    const center = map.getCenter();
    const zoom = map.getZoom();
    
    // Сохраняем текущий CRS перед проверкой
    const oldCRS = map.options.crs;
    
    // Определяем новый CRS
    let newCRS;
    if (e.name.includes("Yandex")) {
        newCRS = L.CRS.EPSG3395;
    } else {
        newCRS = L.CRS.EPSG3857;
    }
    
    // Сравниваем CRS и меняем только при необходимости
    if (oldCRS !== newCRS) {
        map.options.crs = newCRS;
        // Перезагружаем KML только если CRS изменился
        reloadKmlForCRS(center, zoom);
    }
    map.invalidateSize();
});

// Обработчик для выбора слоя (радио-кнопки)
layerControlContainer.addEventListener('click', function(e) {
    if (e.target.tagName === 'INPUT' && e.target.type === 'radio') {
        console.log("Выбран слой, закрываем панель через 500 мс");
        setTimeout(closeLayerPanel, 500);
    }
});
// customLayerControl.addTo(map);

//////Явно выбрать активный слой
// map.on('baselayerchange', function(e) {
//////Убедитесь, что при инициализации выбран правильный слой
// if (!window.initialLayerSet) {
	// window.osm.addTo(map); // Выберите OSM по умолчанию
	// window.initialLayerSet = true;
// }
// });




//////////////////////////////////////////////////////
// Линейка
let rulerToggle;
function initRulerControl() {
  // Создаем кнопку переключения как стандартный контрол Leaflet
  rulerToggle = L.control({ position: 'topright' });
  
  rulerToggle.onAdd = function(map) {
    this._div = L.DomUtil.create('div', 'leaflet-bar leaflet-control leaflet-control-ruler-toggle');
    const link = L.DomUtil.create('a', 'leaflet-control-ruler-toggle-btn', this._div);
    link.href = '#';
    link.title = translations[currentLang].rulerToggleTitle;
    link.innerHTML = '📏'; // Или использовать SVG
    return this._div;
  };
  
  rulerToggle.addTo(map);

  // Обработчик клика по кнопке
  rulerToggle.getContainer().querySelector('a').addEventListener('click', function(e) {
    e.preventDefault();
    e.stopPropagation();
    toggleRulerPanel();
  });
}

function toggleRulerPanel() {
  const isActive = rulerToggle.getContainer().classList.contains('active');
  if (isActive) {
    hideRulerPanel();
  } else {
    showRulerPanel();
  }
}

function showRulerPanel() {
    if (rulerToggle && rulerToggle.getContainer) {
        rulerToggle.getContainer().classList.add('active');
    }

    const measureContainer = window.measureControl && window.measureControl.getContainer();
    if (measureContainer) {
        measureContainer.style.display = 'block';
    }
}

function hideRulerPanel() {
    if (rulerToggle && rulerToggle.getContainer) {
        rulerToggle.getContainer().classList.remove('active');
    }

    const measureContainer = window.measureControl && window.measureControl.getContainer();
    if (measureContainer) {
        measureContainer.style.display = 'none';
    }
}

// функция для инициализации контрола измерения
function initMeasureControl() {
    const currentLang = localStorage.getItem('preferredLang') || 'ru';
    const t = translations[currentLang];
    
    const options = {
        position: 'topright',
        unit: 'kilometres',
        clearMeasurementsOnStop: false,
        showUnitControl: true,
        backgroundColor: THEME.colors.rulerBg,
        cursor: 'crosshair',
        showClearControl: true,
        clearControlLabel: '&times;',
        popupFormat: { number: 2 },
        measureControlTitleOn: t.measureControlTitleOn,
        measureControlTitleOff: t.measureControlTitleOff,
        clearControlTitle: t.clearControlTitle,
        unitControlTitle: t.unitControlTitle,
        bearingText: currentLang === 'ru' ? 'Азимут' : 'Bearing',
        units: t.units,
		
		tempLine: {                     // Styling settings for the temporary dashed line
			color: THEME.colors.rulerLine, // Dashed line color
			weight: 2,                  // Dashed line weight
			pane: 'drawPane'
		},
		fixedLine: {                    // Styling settings for the solid line
			color: THEME.colors.rulerLine, // Solid line color
			weight: 2,                  // Solid line weight
			pane: 'drawPane'
        }
    };

    if (!window.measureControl) {
        window.measureControl = L.control.polylineMeasure(options);
        window.measureControl.addTo(map);
    }
}

// Инициализация после создания карты
document.addEventListener('DOMContentLoaded', function() {
    initRulerControl();
    initMeasureControl(); // Инициализация линейки
    hideRulerPanel(); // по умолчанию скрыта
});

//////////////////////////////////////////////////////

let fullscreenToggle;

function initFullscreenControl() {
    fullscreenToggle = L.control({ position: 'topright' });
    fullscreenToggle.onAdd = function(map) {
        this._div = L.DomUtil.create('div', 'leaflet-bar leaflet-control leaflet-control-fullscreen-toggle');
        const link = L.DomUtil.create('a', 'leaflet-control-fullscreen-toggle-btn', this._div);
        link.href = '#';
        link.title = translations[currentLang].fullscreenTitle || 'Полноэкранный режим';
        link.innerHTML = '⛶'; // начальный символ

		// Функция обновления символа в зависимости от состояния fullscreen
		function updateFullscreenIcon() {
			const isFullscreen = document.fullscreenElement ||
								 document.webkitFullscreenElement ||
								 document.mozFullScreenElement ||
								 document.msFullscreenElement;
			link.innerHTML = isFullscreen ? '✕' : '⛶';
		}			

        // Слушаем изменения полноэкранного режима (кросс-браузерно)
        document.addEventListener('fullscreenchange', updateFullscreenIcon);
        document.addEventListener('webkitfullscreenchange', updateFullscreenIcon);
        document.addEventListener('mozfullscreenchange', updateFullscreenIcon);
        document.addEventListener('MSFullscreenChange', updateFullscreenIcon);

		function toggleFullscreen() {
			document.body.classList.toggle('fullscreen');
			// Обновим размер карты после изменения отображения top-bar
			setTimeout(() => {
				map.invalidateSize();
				updateFullscreenIcon();
			}, 100);
		}

        // Обработчик клика — вызывает существующую функцию toggleFullscreen
        L.DomEvent.on(link, 'click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            toggleFullscreen(); // предполагается, что эта функция определена глобально
        });

        return this._div;
    };
    fullscreenToggle.addTo(map);
}

// Функция, которая скрывает тултипы с "+0" и показывает остальные
function hideZeroTooltips() {
    document.querySelectorAll('.polyline-measure-tooltip').forEach(tooltip => {
        const diffDiv = tooltip.querySelector('.polyline-measure-tooltip-difference');
        if (diffDiv) {
            const diffText = diffDiv.textContent.trim();
            // Если текст содержит "+0" или просто "0" (в зависимости от локализации)
            if (diffText === '+0' || diffText === '0' || diffText === '0 км' || diffText === '0 м') {
                tooltip.style.display = 'none';
            } else {
                // Если расстояние ненулевое, показываем (на случай, если ранее было скрыто)
                tooltip.style.display = '';
            }
        }
    });
}

// Наблюдаем за контейнером, куда плагин добавляет тултипы (обычно .leaflet-marker-pane)
const targetNode = document.querySelector('.leaflet-marker-pane');
if (targetNode) {
    const observer = new MutationObserver(function(mutations) {
        // Запускаем проверку при любых изменениях (добавление, удаление, изменение атрибутов)
        hideZeroTooltips();
    });

    observer.observe(targetNode, {
        childList: true,      // следить за добавлением/удалением элементов
        subtree: true,        // следить за всеми потомками
        characterData: true,  // следить за изменением текста внутри элементов
        attributes: false     // изменение атрибутов не нужно
    });

    // Первоначальный запуск для уже существующих тултипов
    hideZeroTooltips();
}

















window.leafletMap = map;
console.log('Карта доступна как window.leafletMap');


// Создание панелей для управления z-index (интерактивные выше, неинтерактивные ниже)
const interactivePane = map.createPane('interactive');
interactivePane.style.zIndex = 500;  // выше стандартной overlay-pane (400)
const nonInteractivePane = map.createPane('nonInteractive');
nonInteractivePane.style.zIndex = 400; // ниже интерактивной

// Панели KML-векторов (детерминированный порядок, не зависит от момента добавления):
// Control-зоны < линейка (drawPane) < постоянные полигоны < линии < точки (pointsPane, 500)
const vectorControlPane = map.createPane('vectorControl');
vectorControlPane.style.zIndex = 405;
const drawPane = map.createPane('drawPane');
drawPane.style.zIndex = 407;
const vectorPolyPane = map.createPane('vectorPoly');
vectorPolyPane.style.zIndex = 410;
const vectorLinesPane = map.createPane('vectorLines');
vectorLinesPane.style.zIndex = 420;
// canvas'ы векторных панелей не перехватывают pointer-события: иначе верхний canvas
// (vectorLines) забирает все hover'ы и слои ниже не получают mouseover.
// Обработка hover/click по всем трём панелям — в js/vector-hover.js.
vectorControlPane.style.pointerEvents = 'none';
vectorPolyPane.style.pointerEvents = 'none';
vectorLinesPane.style.pointerEvents = 'none';

// Границы направлений по ссылке со страницы статистики (?directions=1).
// Полигоны подписаны названием направления и статистикой за текущий период.
if (new URLSearchParams(window.location.search).has('directions') && typeof omnivore !== 'undefined') {
    const directionNumber = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 1 });
    const directionLabelMinZoom = 8;

    function directionSigned(value) {
        const number = Number(value) || 0;
        if (number > 0) return '+' + directionNumber.format(number);
        if (number < 0) return '−' + directionNumber.format(Math.abs(number));
        return directionNumber.format(0);
    }

    function directionValue(value) {
        return directionNumber.format(Number(value) || 0);
    }

    function directionEscape(value) {
        return String(value == null ? '' : value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    const directionHint = L.control({ position: 'bottomleft' });
    directionHint.onAdd = function () {
        const div = L.DomUtil.create('div', 'direction-hint');
        div.textContent = 'Статистика направлений: приблизьте карту';
        return div;
    };
    directionHint.addTo(map);

    const directionsLayer = omnivore.kml('kml/PermanentObjects/Directions.kml');
    let directionsStats = null;
    let directionsReady = false;

    function updateDirectionLabelVisibility() {
        const show = map.getZoom() >= directionLabelMinZoom;
        directionsLayer.eachLayer(function (layer) {
            const tooltip = layer.getTooltip && layer.getTooltip();
            if (!tooltip) return;
            const element = tooltip.getElement && tooltip.getElement();
            if (element) element.style.display = show ? '' : 'none';
        });
        const hint = document.querySelector('.direction-hint');
        if (hint) hint.style.display = show ? 'none' : '';
    }

    const decorateDirections = function () {
        const periods = directionsStats && Array.isArray(directionsStats.periods)
            ? directionsStats.periods
            : [];
        const period = periods.length ? periods[periods.length - 1] : null;
        const statsDirections = directionsStats && Array.isArray(directionsStats.directions)
            ? directionsStats.directions
            : [];
        const currentByName = {};
        if (period && Array.isArray(period.directions)) {
            period.directions.forEach(function (direction) {
                currentByName[direction.name] = direction;
            });
        }
        if (period) {
            const hint = document.querySelector('.direction-hint');
            if (hint) hint.textContent = 'Статистика направлений за ' + period.label + ': приблизьте карту';
        }

        let index = 0;
        directionsLayer.eachLayer(function (layer) {
            if (typeof layer.setStyle === 'function') {
                layer.setStyle({
                    color: '#1f5f9f',
                    weight: 2,
                    opacity: 0.95,
                    dashArray: '6 4',
                    fillColor: '#1f5f9f',
                    fillOpacity: 0.03
                });
            }

            const properties = layer.feature && layer.feature.properties ? layer.feature.properties : {};
            const fallback = statsDirections[index];
            const name = properties.name || (fallback && fallback.name) || 'Направление';
            const current = currentByName[name] || null;
            let html = '<div class="direction-label-inner"><b>' + directionEscape(name) + '</b>';
            if (current && period) {
                html += '<span class="direction-label-period">' + directionEscape(period.label) + '</span>'
                    + '<span class="direction-label-row">+' + directionValue(current.gain)
                    + ' / −' + directionValue(current.loss) + '</span>'
                    + '<span class="direction-label-net">' + directionSigned(current.net) + ' км²</span>';
            }
            html += '</div>';

            if (typeof layer.unbindTooltip === 'function') layer.unbindTooltip();
            if (typeof layer.bindTooltip === 'function') {
                layer.bindTooltip(html, {
                    permanent: true,
                    direction: 'center',
                    className: 'direction-label',
                    opacity: 0.96
                });
            }
            index += 1;
        });
        updateDirectionLabelVisibility();
    };

    directionsLayer.on('ready', function () {
        directionsReady = true;
        this.addTo(map);
        decorateDirections();
        map.on('zoomend', updateDirectionLabelVisibility);
        if (typeof urlCoords === 'undefined' || !urlCoords) {
            const bounds = this.getBounds && this.getBounds();
            if (bounds && bounds.isValid()) map.fitBounds(bounds, { padding: [20, 20] });
        }
    });

    fetch('stats/stats.json?ts=' + Date.now(), { cache: 'no-store' })
        .then(function (response) { return response.ok ? response.json() : null; })
        .then(function (data) {
            directionsStats = data;
            if (directionsReady) decorateDirections();
        })
        .catch(function (error) {
            console.warn('Не удалось загрузить статистику для подписей направлений:', error);
            if (directionsReady) decorateDirections();
        });
}
