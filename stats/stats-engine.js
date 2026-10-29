/*
 * Движок статистики по полигонам контроля.
 *
 * Работает и в браузере (window.StatsEngine), и в Node (module.exports).
 * Геометрические операции (разность полигонов) выполняет polygon-clipping;
 * его передают снаружи, чтобы движок не тянул зависимости сам.
 *
 * Соглашение: координаты KML — [lon, lat]. Площадь считается по сфере.
 */
(function (root, factory) {
    if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        root.StatsEngine = factory();
    }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
    'use strict';

    var EARTH_RADIUS_KM = 6371.0088;
    var MONTHS_RU = [
        'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
        'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
    ];
    var SNAPSHOT_RE = /^Control_(\d{2})_(\d{2})_(\d{2})\.kml$/i;

    function round2(value) {
        return Math.round((Number(value) || 0) * 100) / 100;
    }

    function pad2(n) {
        return String(n).padStart(2, '0');
    }

    /**
     * Разбирает один KML-файл ControlZones и возвращает кольцо первого
     * (или указанного) Placemark. Для ControlZones это полигон ВС РФ.
     */
    function parseControlKml(text, placemarkIndex) {
        if (typeof text !== 'string' || !text) return null;
        var index = Number.isInteger(placemarkIndex) ? placemarkIndex : 0;
        var re = /<Placemark\b[^>]*>([\s\S]*?)<\/Placemark>/gi;
        var match = null;
        var current = -1;
        while ((match = re.exec(text)) !== null) {
            current += 1;
            if (current !== index) continue;
            var coords = match[1].match(/<coordinates>([\s\S]*?)<\/coordinates>/i);
            if (!coords) return null;
            return parseCoordinateText(coords[1]);
        }
        return null;
    }

    function parseCoordinateText(text) {
        if (typeof text !== 'string' || !text.trim()) return null;
        var tokens = text.trim().split(/\s+/);
        var ring = [];
        for (var i = 0; i < tokens.length; i++) {
            var parts = tokens[i].split(',');
            if (parts.length < 2) continue;
            var lon = Number(parts[0]);
            var lat = Number(parts[1]);
            if (!Number.isFinite(lon) || !Number.isFinite(lat)) continue;
            if (lon < -180 || lon > 180 || lat < -90 || lat > 90) continue;
            var prev = ring.length ? ring[ring.length - 1] : null;
            if (prev && prev[0] === lon && prev[1] === lat) continue;
            ring.push([lon, lat]);
        }
        if (ring.length < 3) return null;
        var first = ring[0];
        var last = ring[ring.length - 1];
        if (first[0] !== last[0] || first[1] !== last[1]) ring.push([first[0], first[1]]);
        return ring;
    }

    function decodeXml(value) {
        return String(value == null ? '' : value)
            .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&apos;/g, "'")
            .replace(/&amp;/g, '&')
            .trim();
    }

    /**
     * Разбирает KML с несколькими Placemark: имя, id (ExtendedData Data name="id")
     * и первое кольцо координат. Для границ направлений.
     */
    function parseKmlPolygons(text) {
        if (typeof text !== 'string' || !text) return [];
        var re = /<Placemark\b[^>]*>([\s\S]*?)<\/Placemark>/gi;
        var result = [];
        var match;
        var index = 0;
        while ((match = re.exec(text)) !== null) {
            index += 1;
            var body = match[1];
            // В KML могут быть отдельные LineString (линия фронта и т.п.) — это не полигон.
            if (!/<Polygon\b/i.test(body)) continue;
            var nameMatch = body.match(/<name[^>]*>([\s\S]*?)<\/name>/i);
            var idMatch = body.match(/<Data\s+name=["']id["'][^>]*>\s*<value>([\s\S]*?)<\/value>/i);
            var groupMatch = body.match(/<Data\s+name=["']group["'][^>]*>\s*<value>([\s\S]*?)<\/value>/i);
            var coords = body.match(/<coordinates>([\s\S]*?)<\/coordinates>/i);
            if (!coords) continue;
            var ring = parseCoordinateText(coords[1]);
            if (!ring) continue;
            var name = decodeXml(nameMatch ? nameMatch[1] : '');
            var id = decodeXml(idMatch ? idMatch[1] : '');
            if (!id) id = 'direction-' + index;
            var group = decodeXml(groupMatch ? groupMatch[1] : '');
            result.push({
                id: id,
                name: name || ('Направление ' + index),
                group: group || null,
                polygon: ring
            });
        }
        return result;
    }

    /** Площадь кольца на сфере, км². */
    function ringAreaKm2(ring) {
        if (!Array.isArray(ring) || ring.length < 3) return 0;
        var rad = Math.PI / 180;
        var sum = 0;
        for (var i = 0; i < ring.length; i++) {
            var p1 = ring[i];
            var p2 = ring[(i + 1) % ring.length];
            sum += (p2[0] - p1[0]) * rad * (2 + Math.sin(p1[1] * rad) + Math.sin(p2[1] * rad));
        }
        return Math.abs(sum * EARTH_RADIUS_KM * EARTH_RADIUS_KM / 2);
    }

    /** Площадь полигона с дырками (polygon-clipping: [outer, hole, ...]). */
    function polygonAreaKm2(polygon) {
        if (!Array.isArray(polygon) || !polygon.length) return 0;
        var area = ringAreaKm2(polygon[0]);
        for (var i = 1; i < polygon.length; i++) area -= ringAreaKm2(polygon[i]);
        return Math.max(0, area);
    }

    /** Площадь MultiPolygon (массив полигонов). */
    function multiPolygonAreaKm2(multiPolygon) {
        if (!Array.isArray(multiPolygon)) return 0;
        var total = 0;
        for (var i = 0; i < multiPolygon.length; i++) total += polygonAreaKm2(multiPolygon[i]);
        return total;
    }

    /**
     * Разность двух состояний: new RU - old RU (прирост) и old RU - new RU
     * (уменьшение). Оба результата — MultiPolygon.
     */
    function computeDelta(prevRing, currRing, clip) {
        if (!clip || typeof clip.difference !== 'function') {
            throw new Error('StatsEngine: не передан polygon-clipping');
        }
        if (!prevRing || !currRing) return { gain: [], loss: [] };
        var prev = [[prevRing]];
        var curr = [[currRing]];
        return {
            gain: clip.difference(curr, prev),
            loss: clip.difference(prev, curr)
        };
    }

    /** Делит MultiPolygon на крупные и микрокомпоненты по порогу, км². */
    function splitComponents(multiPolygon, thresholdKm2) {
        var threshold = Number(thresholdKm2);
        if (!Number.isFinite(threshold) || threshold < 0) threshold = 0;
        var kept = [];
        var dropped = [];
        var keptArea = 0;
        var droppedArea = 0;
        var list = Array.isArray(multiPolygon) ? multiPolygon : [];
        for (var i = 0; i < list.length; i++) {
            var area = polygonAreaKm2(list[i]);
            if (area >= threshold) {
                kept.push(list[i]);
                keptArea += area;
            } else {
                dropped.push(list[i]);
                droppedArea += area;
            }
        }
        return {
            kept: kept,
            dropped: dropped,
            keptArea: keptArea,
            droppedArea: droppedArea,
            keptCount: kept.length,
            droppedCount: dropped.length
        };
    }

    /** Центроид кольца (плоская формула; для классификации этого достаточно). */
    function ringCentroid(ring) {
        if (!Array.isArray(ring) || ring.length < 3) return null;
        var twiceArea = 0;
        var cx = 0;
        var cy = 0;
        var i;
        for (i = 0; i < ring.length - 1; i++) {
            var x1 = ring[i][0];
            var y1 = ring[i][1];
            var x2 = ring[i + 1][0];
            var y2 = ring[i + 1][1];
            var cross = x1 * y2 - x2 * y1;
            twiceArea += cross;
            cx += (x1 + x2) * cross;
            cy += (y1 + y2) * cross;
        }
        if (Math.abs(twiceArea) > 1e-12) {
            return [cx / (3 * twiceArea), cy / (3 * twiceArea)];
        }
        var sx = 0;
        var sy = 0;
        var count = Math.max(1, ring.length - 1);
        for (i = 0; i < ring.length - 1; i++) {
            sx += ring[i][0];
            sy += ring[i][1];
        }
        return [sx / count, sy / count];
    }

    function pointInRing(point, ring) {
        if (!Array.isArray(point) || !Array.isArray(ring) || ring.length < 4) return false;
        var x = point[0];
        var y = point[1];
        var inside = false;
        for (var i = 0, j = ring.length - 1; i < ring.length; j = i++) {
            var xi = ring[i][0];
            var yi = ring[i][1];
            var xj = ring[j][0];
            var yj = ring[j][1];
            var crosses = ((yi > y) !== (yj > y))
                && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
            if (crosses) inside = !inside;
        }
        return inside;
    }

    /** Точка внутри полигона polygon-clipping: [outer, hole...]. */
    function pointInPolygon(point, polygon) {
        if (!Array.isArray(polygon) || !polygon.length) return false;
        if (!pointInRing(point, polygon[0])) return false;
        for (var i = 1; i < polygon.length; i++) {
            if (pointInRing(point, polygon[i])) return false;
        }
        return true;
    }

    function bboxOfRing(ring) {
        var bbox = [Infinity, Infinity, -Infinity, -Infinity];
        for (var i = 0; i < ring.length; i++) {
            var point = ring[i];
            if (point[0] < bbox[0]) bbox[0] = point[0];
            if (point[1] < bbox[1]) bbox[1] = point[1];
            if (point[0] > bbox[2]) bbox[2] = point[0];
            if (point[1] > bbox[3]) bbox[3] = point[1];
        }
        return bbox;
    }

    /**
     * Приводит описания направлений к внутреннему виду.
     * polygon — либо кольцо [[lon,lat],...], либо полигон [outer, hole...].
     */
    function normalizeDirections(directions) {
        var list = Array.isArray(directions) ? directions : [];
        var result = [];
        for (var i = 0; i < list.length; i++) {
            var item = list[i];
            if (!item || !Array.isArray(item.polygon)) continue;
            var rings = null;
            if (Array.isArray(item.polygon[0]) && Array.isArray(item.polygon[0][0])) {
                rings = item.polygon;
            } else if (Array.isArray(item.polygon[0])) {
                rings = [item.polygon];
            }
            if (!rings || !rings.length || rings[0].length < 3) continue;
            var area = polygonAreaKm2(rings);
            if (!(area > 0)) continue;
            result.push({
                id: item.id || ('direction-' + (result.length + 1)),
                name: item.name || item.id || ('Направление ' + (result.length + 1)),
                group: item.group || null,
                polygon: rings,
                area: area,
                bbox: bboxOfRing(rings[0])
            });
        }
        return result;
    }

    /**
     * Относит каждый компонент к одному направлению по центроиду.
     * Если центроид попадает в несколько полигонов — побеждает
     * меньший по площади (более специальный). Иначе — unassigned.
     */
    function classifyComponents(gainComponents, lossComponents, directions) {
        var dirs = (Array.isArray(directions) && directions.length && directions[0].bbox)
            ? directions
            : normalizeDirections(directions);
        var byId = {};
        var unassigned = { gain: 0, loss: 0, net: 0, gainCount: 0, lossCount: 0 };
        var i;
        for (i = 0; i < dirs.length; i++) {
            byId[dirs[i].id] = {
                id: dirs[i].id,
                name: dirs[i].name,
                gain: 0,
                loss: 0,
                net: 0,
                gainCount: 0,
                lossCount: 0
            };
        }

        function pick(component) {
            var ring = component && component[0];
            var centroid = ringCentroid(ring);
            if (!centroid) return null;
            var best = null;
            for (var k = 0; k < dirs.length; k++) {
                var dir = dirs[k];
                var bbox = dir.bbox;
                if (centroid[0] < bbox[0] || centroid[0] > bbox[2]
                    || centroid[1] < bbox[1] || centroid[1] > bbox[3]) continue;
                if (!pointInPolygon(centroid, dir.polygon)) continue;
                if (!best || dir.area < best.area) best = dir;
            }
            return best;
        }

        function add(list, side) {
            var components = Array.isArray(list) ? list : [];
            for (var k = 0; k < components.length; k++) {
                var component = components[k];
                var area = polygonAreaKm2(component);
                var dir = pick(component);
                if (dir) {
                    byId[dir.id][side] += area;
                    byId[dir.id][side + 'Count'] += 1;
                } else {
                    unassigned[side] += area;
                    unassigned[side + 'Count'] += 1;
                }
            }
        }

        add(gainComponents, 'gain');
        add(lossComponents, 'loss');

        for (var key in byId) {
            if (!Object.prototype.hasOwnProperty.call(byId, key)) continue;
            var item = byId[key];
            item.gain = round2(item.gain);
            item.loss = round2(item.loss);
            item.net = round2(item.gain - item.loss);
        }
        unassigned.gain = round2(unassigned.gain);
        unassigned.loss = round2(unassigned.loss);
        unassigned.net = round2(unassigned.gain - unassigned.loss);
        return { byId: byId, unassigned: unassigned };
    }

    /** Сводка по уже разобранным компонентам прироста/уменьшения. */
    function summarizeComponents(gain, loss) {
        var gainArea = gain.keptArea;
        var lossArea = loss.keptArea;
        var rawGain = gain.keptArea + gain.droppedArea;
        var rawLoss = loss.keptArea + loss.droppedArea;
        return {
            gain: round2(gainArea),
            loss: round2(lossArea),
            net: round2(gainArea - lossArea),
            micro: {
                gain: round2(gain.droppedArea),
                loss: round2(loss.droppedArea),
                gainCount: gain.droppedCount,
                lossCount: loss.droppedCount
            },
            components: {
                gain: gain.keptCount,
                loss: loss.keptCount
            },
            raw: {
                gain: round2(rawGain),
                loss: round2(rawLoss),
                net: round2(rawGain - rawLoss)
            }
        };
    }

    /**
     * Считает один период между двумя срезами.
     * gain/loss — только компоненты >= порога; micro — отброшенные.
     */
    function summarizeDelta(prevRing, currRing, clip, options) {
        var opts = options || {};
        var threshold = Number(opts.thresholdKm2);
        if (!Number.isFinite(threshold) || threshold < 0) threshold = 0;
        var delta = computeDelta(prevRing, currRing, clip);
        return summarizeComponents(
            splitComponents(delta.gain, threshold),
            splitComponents(delta.loss, threshold)
        );
    }

    /** Информация о снимке из имени файла Control_YY_MM_DD.kml. */
    function snapshotInfo(filename) {
        if (typeof filename !== 'string') return null;
        var match = filename.match(SNAPSHOT_RE);
        if (!match) return null;
        var year = 2000 + Number(match[1]);
        var month = Number(match[2]);
        var day = Number(match[3]);
        if (month < 1 || month > 12 || day < 1 || day > 31) return null;
        var date = new Date(Date.UTC(year, month - 1, day));
        if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
            return null;
        }
        return {
            name: filename,
            year: year,
            month: month,
            day: day,
            iso: date.toISOString().slice(0, 10),
            date: date
        };
    }

    function monthKey(iso) {
        return String(iso).slice(0, 7);
    }

    /** Предыдущий календарный месяц для YYYY-MM. */
    function previousMonth(month) {
        var parts = String(month).split('-');
        var year = Number(parts[0]);
        var mon = Number(parts[1]);
        if (!Number.isFinite(year) || !Number.isFinite(mon)) return month;
        mon -= 1;
        if (mon < 1) {
            mon = 12;
            year -= 1;
        }
        return year + '-' + pad2(mon);
    }

    function monthLabelRu(month) {
        var parts = String(month).split('-');
        var year = parts[0];
        var index = Number(parts[1]) - 1;
        if (!MONTHS_RU[index]) return String(month);
        return MONTHS_RU[index] + ' ' + year;
    }

    function dateDiffDays(fromIso, toIso) {
        var from = Date.parse(fromIso + 'T00:00:00Z');
        var to = Date.parse(toIso + 'T00:00:00Z');
        if (!Number.isFinite(from) || !Number.isFinite(to)) return 0;
        return Math.max(0, Math.round((to - from) / 86400000));
    }

    /**
     * Один месячный срез на календарный месяц — тот, что ближе всего к 1-му
     * числу. Если в месяце срезов нет, месяц пропускается.
     */
    function selectMonthlySnapshots(snapshots) {
        var byMonth = new Map();
        var list = Array.isArray(snapshots) ? snapshots : [];
        for (var i = 0; i < list.length; i++) {
            var snapshot = list[i];
            if (!snapshot || !snapshot.iso) continue;
            var key = monthKey(snapshot.iso);
            if (!byMonth.has(key)) byMonth.set(key, []);
            byMonth.get(key).push(snapshot);
        }
        var months = Array.from(byMonth.keys()).sort();
        var result = [];
        for (var m = 0; m < months.length; m++) {
            var items = byMonth.get(months[m]).slice().sort(function (a, b) {
                var da = Math.abs(a.day - 1);
                var db = Math.abs(b.day - 1);
                if (da !== db) return da - db;
                if (a.iso !== b.iso) return a.iso < b.iso ? -1 : 1;
                return a.name < b.name ? -1 : 1;
            });
            result.push(items[0]);
        }
        return result;
    }

    /**
     * Собирает месячную статистику.
     *
     * @param snapshots [{name, iso, ...}] — все доступные снимки.
     * @param rings     объект/Map: имя снимка -> кольцо.
     * @param clip      polygon-clipping.
     * @param options   {thresholdKm2, minDate, maxDate, includePartial,
     *                   generator, excludeAreas}
     */
    function buildStats(snapshots, rings, clip, options) {
        var opts = options || {};
        var threshold = Number(opts.thresholdKm2);
        if (!Number.isFinite(threshold) || threshold < 0) threshold = 0;
        var minDate = opts.minDate || null;
        var maxDate = opts.maxDate || null;
        var includePartial = opts.includePartial !== false;
        var getRing = function (name) {
            if (rings instanceof Map) return rings.get(name) || null;
            return rings ? rings[name] || null : null;
        };

        var all = (Array.isArray(snapshots) ? snapshots.slice() : [])
            .filter(function (s) { return s && s.iso; })
            .filter(function (s) { return !minDate || s.iso >= minDate; })
            .filter(function (s) { return !maxDate || s.iso <= maxDate; })
            .sort(function (a, b) {
                if (a.iso !== b.iso) return a.iso < b.iso ? -1 : 1;
                return a.name < b.name ? -1 : 1;
            });

        var directionDefs = normalizeDirections(opts.directions);
        var directionsEnabled = directionDefs.length > 0;
        var boundaries = selectMonthlySnapshots(all);
        var periods = [];
        var warnings = [];

        function directionValues(directionSummary) {
            var list = [];
            for (var d = 0; d < directionDefs.length; d++) {
                var def = directionDefs[d];
                var item = directionSummary.byId[def.id] || { gain: 0, loss: 0 };
                list.push({
                    id: def.id,
                    name: def.name,
                    gain: round2(item.gain),
                    loss: round2(item.loss),
                    net: round2(item.gain - item.loss)
                });
            }
            return list;
        }

        function unassignedValues(directionSummary) {
            var item = directionSummary.unassigned;
            return {
                gain: round2(item.gain),
                loss: round2(item.loss),
                net: round2(item.gain - item.loss)
            };
        }

        function summarizePeriod(from, to, fromRing, toRing, partial) {
            var delta = computeDelta(fromRing, toRing, clip);
            var gainParts = splitComponents(delta.gain, threshold);
            var lossParts = splitComponents(delta.loss, threshold);
            var summary = summarizeComponents(gainParts, lossParts);
            var directionSummary = directionsEnabled
                ? classifyComponents(gainParts.kept, lossParts.kept, directionDefs)
                : null;
            var month = partial ? monthKey(to.iso) : previousMonth(monthKey(to.iso));
            var days = dateDiffDays(from.iso, to.iso);
            var period = Object.assign({
                id: partial ? month + '-partial' : month,
                month: month,
                label: monthLabelRu(month),
                from: from.iso,
                fromName: from.name,
                to: to.iso,
                toName: to.name,
                days: days,
                daysCount: days,
                partial: partial,
                rate: days > 0 ? round2(summary.net / days) : 0
            }, summary);
            if (directionSummary) {
                period.directions = directionValues(directionSummary);
                period.unassigned = unassignedValues(directionSummary);
            }
            return period;
        }

        for (var i = 1; i < boundaries.length; i++) {
            var from = boundaries[i - 1];
            var to = boundaries[i];
            var fromRing = getRing(from.name);
            var toRing = getRing(to.name);
            if (!fromRing || !toRing) {
                warnings.push('Нет геометрии для периода ' + from.name + ' → ' + to.name);
                continue;
            }
            periods.push(summarizePeriod(from, to, fromRing, toRing, false));
        }

        if (includePartial && all.length && boundaries.length) {
            var latest = all[all.length - 1];
            var lastBoundary = boundaries[boundaries.length - 1];
            if (latest.iso > lastBoundary.iso) {
                var partialFromRing = getRing(lastBoundary.name);
                var partialToRing = getRing(latest.name);
                if (partialFromRing && partialToRing) {
                    periods.push(summarizePeriod(lastBoundary, latest, partialFromRing, partialToRing, true));
                }
            }
        }

        var totals = { gain: 0, loss: 0, net: 0 };
        var fullTotals = { gain: 0, loss: 0, net: 0 };
        for (var p = 0; p < periods.length; p++) {
            var period = periods[p];
            totals.gain += period.gain;
            totals.loss += period.loss;
            totals.net += period.net;
            if (!period.partial) {
                fullTotals.gain += period.gain;
                fullTotals.loss += period.loss;
                fullTotals.net += period.net;
            }
        }

        var directions = [];
        var unassigned = null;
        if (directionsEnabled) {
            for (var d = 0; d < directionDefs.length; d++) {
                var def = directionDefs[d];
                var directionPeriods = [];
                var directionTotals = { gain: 0, loss: 0, net: 0 };
                var directionFullTotals = { gain: 0, loss: 0, net: 0 };
                for (var k = 0; k < periods.length; k++) {
                    var current = periods[k];
                    var values = { gain: 0, loss: 0, net: 0 };
                    if (current.directions) {
                        for (var q = 0; q < current.directions.length; q++) {
                            if (current.directions[q].id === def.id) {
                                values = current.directions[q];
                                break;
                            }
                        }
                    }
                    directionPeriods.push({
                        month: current.month,
                        label: current.label,
                        from: current.from,
                        to: current.to,
                        days: current.days,
                        partial: current.partial,
                        gain: values.gain,
                        loss: values.loss,
                        net: values.net,
                        rate: current.days > 0 ? round2(values.net / current.days) : 0
                    });
                    directionTotals.gain += values.gain;
                    directionTotals.loss += values.loss;
                    directionTotals.net += values.net;
                    if (!current.partial) {
                        directionFullTotals.gain += values.gain;
                        directionFullTotals.loss += values.loss;
                        directionFullTotals.net += values.net;
                    }
                }
                directions.push({
                    id: def.id,
                    name: def.name,
                    group: def.group,
                    periods: directionPeriods,
                    totals: {
                        gain: round2(directionTotals.gain),
                        loss: round2(directionTotals.loss),
                        net: round2(directionTotals.net)
                    },
                    fullTotals: {
                        gain: round2(directionFullTotals.gain),
                        loss: round2(directionFullTotals.loss),
                        net: round2(directionFullTotals.net)
                    }
                });
            }

            unassigned = {
                totals: { gain: 0, loss: 0, net: 0 },
                fullTotals: { gain: 0, loss: 0, net: 0 }
            };
            for (var u = 0; u < periods.length; u++) {
                var uPeriod = periods[u];
                if (!uPeriod.unassigned) continue;
                unassigned.totals.gain += uPeriod.unassigned.gain;
                unassigned.totals.loss += uPeriod.unassigned.loss;
                unassigned.totals.net += uPeriod.unassigned.net;
                if (!uPeriod.partial) {
                    unassigned.fullTotals.gain += uPeriod.unassigned.gain;
                    unassigned.fullTotals.loss += uPeriod.unassigned.loss;
                    unassigned.fullTotals.net += uPeriod.unassigned.net;
                }
            }
            unassigned.totals.gain = round2(unassigned.totals.gain);
            unassigned.totals.loss = round2(unassigned.totals.loss);
            unassigned.totals.net = round2(unassigned.totals.net);
            unassigned.fullTotals.gain = round2(unassigned.fullTotals.gain);
            unassigned.fullTotals.loss = round2(unassigned.fullTotals.loss);
            unassigned.fullTotals.net = round2(unassigned.fullTotals.net);
        }

        return {
            schemaVersion: 1,
            generatedAt: opts.generatedAt || new Date().toISOString(),
            generator: opts.generator || 'stats-engine',
            source: {
                dataset: 'ControlZones',
                plusSide: 'RU',
                minusSide: 'UA',
                method: 'difference of consecutive monthly snapshots',
                thresholdKm2: threshold,
                excludedAreas: Array.isArray(opts.excludeAreas) ? opts.excludeAreas : [],
                minDate: minDate,
                note: threshold > 0
                    ? 'Плюс — продвижение ВС РФ. Компоненты меньше порога не учитываются; их сумма приведена в micro.'
                    : 'Плюс — продвижение ВС РФ. Порог отключён: учитываются все компоненты разности.',
                directions: directionsEnabled ? {
                    version: opts.directionsVersion || '1',
                    note: opts.directionsNote || null,
                    method: 'centroid',
                    count: directionDefs.length
                } : null
            },
            snapshotCount: all.length,
            firstSnapshot: all.length ? all[0].iso : null,
            lastSnapshot: all.length ? all[all.length - 1].iso : null,
            periods: periods,
            totals: {
                gain: round2(totals.gain),
                loss: round2(totals.loss),
                net: round2(totals.net)
            },
            fullTotals: {
                gain: round2(fullTotals.gain),
                loss: round2(fullTotals.loss),
                net: round2(fullTotals.net)
            },
            directions: directions,
            unassigned: unassigned,
            groupings: [],
            warnings: warnings
        };
    }

    return {
        EARTH_RADIUS_KM: EARTH_RADIUS_KM,
        MONTHS_RU: MONTHS_RU,
        parseControlKml: parseControlKml,
        parseKmlPolygons: parseKmlPolygons,
        parseCoordinateText: parseCoordinateText,
        ringAreaKm2: ringAreaKm2,
        polygonAreaKm2: polygonAreaKm2,
        multiPolygonAreaKm2: multiPolygonAreaKm2,
        computeDelta: computeDelta,
        splitComponents: splitComponents,
        summarizeComponents: summarizeComponents,
        summarizeDelta: summarizeDelta,
        ringCentroid: ringCentroid,
        pointInRing: pointInRing,
        pointInPolygon: pointInPolygon,
        normalizeDirections: normalizeDirections,
        classifyComponents: classifyComponents,
        snapshotInfo: snapshotInfo,
        selectMonthlySnapshots: selectMonthlySnapshots,
        buildStats: buildStats,
        previousMonth: previousMonth,
        monthLabelRu: monthLabelRu,
        dateDiffDays: dateDiffDays,
        round2: round2
    };
});
