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
        if (!Number.isFinite(threshold) || threshold < 0) threshold = 0.5;
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

    /**
     * Считает один период между двумя срезами.
     * gain/loss — только компоненты >= порога; micro — отброшенные.
     */
    function summarizeDelta(prevRing, currRing, clip, options) {
        var opts = options || {};
        var threshold = Number(opts.thresholdKm2);
        if (!Number.isFinite(threshold) || threshold < 0) threshold = 0.5;
        var delta = computeDelta(prevRing, currRing, clip);
        var gain = splitComponents(delta.gain, threshold);
        var loss = splitComponents(delta.loss, threshold);
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
        if (!Number.isFinite(threshold) || threshold < 0) threshold = 0.5;
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

        var boundaries = selectMonthlySnapshots(all);
        var periods = [];
        var warnings = [];

        for (var i = 1; i < boundaries.length; i++) {
            var from = boundaries[i - 1];
            var to = boundaries[i];
            var fromRing = getRing(from.name);
            var toRing = getRing(to.name);
            if (!fromRing || !toRing) {
                warnings.push('Нет геометрии для периода ' + from.name + ' → ' + to.name);
                continue;
            }
            var summary = summarizeDelta(fromRing, toRing, clip, { thresholdKm2: threshold });
            var month = previousMonth(monthKey(to.iso));
            var days = dateDiffDays(from.iso, to.iso);
            periods.push(Object.assign({
                id: month,
                month: month,
                label: monthLabelRu(month),
                from: from.iso,
                fromName: from.name,
                to: to.iso,
                toName: to.name,
                days: days,
                daysCount: days,
                partial: false,
                rate: days > 0 ? round2(summary.net / days) : 0
            }, summary));
        }

        if (includePartial && all.length && boundaries.length) {
            var latest = all[all.length - 1];
            var lastBoundary = boundaries[boundaries.length - 1];
            if (latest.iso > lastBoundary.iso) {
                var partialFromRing = getRing(lastBoundary.name);
                var partialToRing = getRing(latest.name);
                if (partialFromRing && partialToRing) {
                    var partialSummary = summarizeDelta(partialFromRing, partialToRing, clip, { thresholdKm2: threshold });
                    var partialMonth = monthKey(latest.iso);
                    var partialDays = dateDiffDays(lastBoundary.iso, latest.iso);
                    periods.push(Object.assign({
                        id: partialMonth + '-partial',
                        month: partialMonth,
                        label: monthLabelRu(partialMonth),
                        from: lastBoundary.iso,
                        fromName: lastBoundary.name,
                        to: latest.iso,
                        toName: latest.name,
                        days: partialDays,
                        daysCount: partialDays,
                        partial: true,
                        rate: partialDays > 0 ? round2(partialSummary.net / partialDays) : 0
                    }, partialSummary));
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
                note: 'Плюс — продвижение ВС РФ. Компоненты меньше порога не учитываются; их сумма приведена в micro.'
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
            directions: [],
            groupings: [],
            warnings: warnings
        };
    }

    return {
        EARTH_RADIUS_KM: EARTH_RADIUS_KM,
        MONTHS_RU: MONTHS_RU,
        parseControlKml: parseControlKml,
        parseCoordinateText: parseCoordinateText,
        ringAreaKm2: ringAreaKm2,
        polygonAreaKm2: polygonAreaKm2,
        multiPolygonAreaKm2: multiPolygonAreaKm2,
        computeDelta: computeDelta,
        splitComponents: splitComponents,
        summarizeDelta: summarizeDelta,
        snapshotInfo: snapshotInfo,
        selectMonthlySnapshots: selectMonthlySnapshots,
        buildStats: buildStats,
        previousMonth: previousMonth,
        monthLabelRu: monthLabelRu,
        dateDiffDays: dateDiffDays,
        round2: round2
    };
});
