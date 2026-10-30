#!/usr/bin/env node
/*
 * Проверка движка статистики.
 * Запуск: node tools/test-stats-engine.mjs
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const StatsEngine = require(path.join(ROOT, 'stats/stats-engine.js'));
const clip = require(path.join(ROOT, 'js/vendor/polygon-clipping.umd.min.js'));

function test(name, fn) {
    try {
        fn();
        console.log('ok  ' + name);
    } catch (error) {
        console.error('FAIL ' + name);
        throw error;
    }
}

test('snapshotInfo разбирает имя и дату', () => {
    const info = StatsEngine.snapshotInfo('Control_24_10_01.kml');
    assert.equal(info.iso, '2024-10-01');
    assert.equal(info.year, 2024);
    assert.equal(StatsEngine.snapshotInfo('control_26_10_12.KML').iso, '2026-10-12');
    assert.equal(StatsEngine.snapshotInfo('Progress_26_10_12.kml'), null);
});

test('площадь квадрата 1°×1° у экватора', () => {
    const ring = [[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]];
    const area = StatsEngine.ringAreaKm2(ring);
    assert.ok(area > 12000 && area < 12500, 'area=' + area);
});

test('разность двух квадратов: прирост и уменьшение', () => {
    const prev = [[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]];
    const curr = [[5, 0], [15, 0], [15, 10], [5, 10], [5, 0]];
    const delta = StatsEngine.computeDelta(prev, curr, clip);
    assert.equal(delta.gain.length, 1);
    assert.equal(delta.loss.length, 1);
    const summary = StatsEngine.summarizeDelta(prev, curr, clip, { thresholdKm2: 0.5 });
    assert.ok(summary.gain > 0);
    assert.ok(summary.loss > 0);
    assert.ok(Math.abs(summary.raw.net) < 1e-6);
});

test('микрокомпоненты отбрасываются, но видны в micro', () => {
    const tiny = [[0, 0], [0.005, 0], [0.005, 0.005], [0, 0.005], [0, 0]];
    const split = StatsEngine.splitComponents([[tiny]], 0.5);
    assert.equal(split.keptCount, 0);
    assert.equal(split.droppedCount, 1);
    assert.ok(split.droppedArea > 0.1 && split.droppedArea < 0.5, 'area=' + split.droppedArea);

    const summary = StatsEngine.summarizeDelta(tiny, tiny, clip, { thresholdKm2: 0.5 });
    assert.equal(summary.gain, 0);
    assert.equal(summary.loss, 0);
    assert.equal(summary.micro.gain, 0);
});

test('по умолчанию учитываются все компоненты, включая микрополигоны', () => {
    const tiny = [[0, 0], [0.005, 0], [0.005, 0.005], [0, 0.005], [0, 0]];
    const split = StatsEngine.splitComponents([[tiny]]);
    assert.equal(split.keptCount, 1);
    assert.equal(split.droppedCount, 0);
    assert.ok(split.keptArea > 0.1 && split.keptArea < 0.5, 'area=' + split.keptArea);
});

test('месячные срезы выбираются около 1-го числа', () => {
    const snapshots = [
        StatsEngine.snapshotInfo('Control_26_09_02.kml'),
        StatsEngine.snapshotInfo('Control_26_09_10.kml'),
        StatsEngine.snapshotInfo('Control_26_10_04.kml')
    ];
    const boundaries = StatsEngine.selectMonthlySnapshots(snapshots);
    assert.deepEqual(boundaries.map(x => x.iso), ['2026-09-02', '2026-10-04']);
});

test('buildStats подписывает период месяцем перед конечным срезом', () => {
    const snapshots = [StatsEngine.snapshotInfo('Control_26_09_02.kml'), StatsEngine.snapshotInfo('Control_26_10_04.kml')];
    const ring = [[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]];
    const result = StatsEngine.buildStats(snapshots, { 'Control_26_09_02.kml': ring, 'Control_26_10_04.kml': ring }, clip, {
        thresholdKm2: 0.5
    });
    assert.equal(result.periods.length, 1);
    assert.equal(result.periods[0].month, '2026-09');
    assert.equal(result.periods[0].gain, 0);
});

test('реальные срезы 01.10.2024 → 01.11.2024', () => {
    const controlDir = path.join(ROOT, 'kml/ControlZones');
    const prev = StatsEngine.parseControlKml(fs.readFileSync(path.join(controlDir, 'Control_24_10_01.kml'), 'utf8'));
    const curr = StatsEngine.parseControlKml(fs.readFileSync(path.join(controlDir, 'Control_24_11_01.kml'), 'utf8'));
    assert.ok(prev && prev.length > 20000);
    assert.ok(curr && curr.length > 20000);
    const summary = StatsEngine.summarizeDelta(prev, curr, clip, { thresholdKm2: 0.5 });
    assert.ok(summary.gain > 1020 && summary.gain < 1030, 'gain=' + summary.gain);
    assert.ok(summary.loss > 205 && summary.loss < 211, 'loss=' + summary.loss);
    assert.ok(summary.net > 812 && summary.net < 818, 'net=' + summary.net);

    const all = StatsEngine.summarizeDelta(prev, curr, clip, { thresholdKm2: 0 });
    assert.ok(all.gain > summary.gain, 'gain без порога должен быть больше');
    assert.ok(all.loss > summary.loss, 'loss без порога должен быть больше');
    assert.equal(all.micro.gain, 0);
    assert.equal(all.micro.loss, 0);
});

test('KML направлений: 11 полигонов с id', () => {
    const text = fs.readFileSync(path.join(ROOT, 'kml/PermanentObjects/Directions.kml'), 'utf8');
    const directions = StatsEngine.parseKmlPolygons(text);
    assert.equal(directions.length, 11);
    assert.equal(directions[0].id, 'sumy');
    assert.equal(directions[0].name, 'Сумское');
    assert.equal(directions[0].group, 'Север');
    assert.ok(directions.some(direction => direction.id === 'kharkiv'));
    assert.ok(directions.some(direction => direction.id === 'dnipropetrovsk'));
    assert.ok(directions.some(direction => direction.id === 'herson'));
    assert.equal(directions.find(direction => direction.id === 'orekhiv').group, 'Днепр');
    assert.ok(directions.some(direction => direction.id === 'chernihiv'));
    assert.ok(!directions.some(direction => direction.id === 'krasny_liman'));
    assert.ok(directions.every(direction => direction.polygon.length >= 5));
    assert.ok(directions.find(direction => direction.id === 'dnipropetrovsk').polygon.length > 1000);
    assert.ok(!fs.existsSync(path.join(ROOT, 'kml/PermanentObjects/Directions_fragments.kml')));
});

test('LineString не считается полигоном направления', () => {
    const line = '<Placemark><name>Линия</name><LineString><coordinates>30,45,0 31,46,0</coordinates></LineString></Placemark>';
    assert.equal(StatsEngine.parseKmlPolygons(line).length, 0);
});

test('направления: сумма направлений + unassigned = итог', () => {
    const snapshots = [
        StatsEngine.snapshotInfo('Control_26_09_02.kml'),
        StatsEngine.snapshotInfo('Control_26_10_04.kml')
    ];
    const prev = [[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]];
    const curr = [[5, 0], [15, 0], [15, 10], [5, 10], [5, 0]];
    const east = {
        id: 'east',
        name: 'Восток',
        group: 'Тест',
        polygon: [[10, 0], [20, 0], [20, 10], [10, 10], [10, 0]]
    };
    const result = StatsEngine.buildStats(snapshots, {
        'Control_26_09_02.kml': prev,
        'Control_26_10_04.kml': curr
    }, clip, {
        thresholdKm2: 0.5,
        includePartial: false,
        directions: [east]
    });
    assert.equal(result.directions.length, 1);
    assert.equal(result.directions[0].name, 'Восток');
    assert.equal(result.directions[0].group, 'Тест');
    assert.ok(result.directions[0].fullTotals.gain > 6000, 'gain=' + result.directions[0].fullTotals.gain);
    assert.equal(result.directions[0].fullTotals.loss, 0);
    assert.ok(result.unassigned.fullTotals.loss > 6000, 'loss=' + result.unassigned.fullTotals.loss);
    const assignedGain = result.directions.reduce((sum, direction) => sum + direction.fullTotals.gain, 0);
    const assignedLoss = result.directions.reduce((sum, direction) => sum + direction.fullTotals.loss, 0);
    assert.ok(Math.abs(assignedGain + result.unassigned.fullTotals.gain - result.fullTotals.gain) < 0.02,
        'gain invariant');
    assert.ok(Math.abs(assignedLoss + result.unassigned.fullTotals.loss - result.fullTotals.loss) < 0.02,
        'loss invariant');
});

test('stats.json начинается с октября 2023', () => {
    const data = JSON.parse(fs.readFileSync(path.join(ROOT, 'stats/stats.json'), 'utf8'));
    assert.equal(data.source.minDate, '2023-10-01');
    assert.equal(data.periods[0].month, '2023-10');
    assert.ok(data.periods.every(period => period.month >= '2023-10'));
});

console.log('\nВсе проверки пройдены.');
