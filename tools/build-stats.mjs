#!/usr/bin/env node
/*
 * Пересчитывает статистику по ControlZones и пишет stats/stats.json.
 *
 * Запуск:
 *   node tools/build-stats.mjs
 *   node tools/build-stats.mjs --threshold 0 --min-date 2023-10-01
 *
 * Скрипт читает только месячные срезы (ближайшие к 1-му числу) и последний
 * срез для текущего месяца. Полные KML-файлы в память целиком не копятся.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const StatsEngine = require(path.join(ROOT, 'stats/stats-engine.js'));
const clip = require(path.join(ROOT, 'js/vendor/polygon-clipping.umd.min.js'));

function arg(name, fallback) {
    const index = process.argv.indexOf(name);
    if (index === -1 || index + 1 >= process.argv.length) return fallback;
    return process.argv[index + 1];
}

const controlDir = path.join(ROOT, 'kml/ControlZones');
const outputPath = path.resolve(ROOT, arg('--out', 'stats/stats.json'));
const thresholdKm2 = Number(arg('--threshold', '0'));
const minDate = arg('--min-date', '2023-10-01');
const includePartial = !process.argv.includes('--no-partial');
const directionsPath = path.resolve(ROOT, arg('--directions', 'kml/PermanentObjects/Directions.kml'));

function fail(message) {
    console.error('Ошибка: ' + message);
    process.exit(1);
}

if (!fs.existsSync(controlDir)) fail('не найдена папка ' + controlDir);
if (!Number.isFinite(thresholdKm2) || thresholdKm2 < 0) fail('неверный --threshold');

const snapshots = fs.readdirSync(controlDir)
    .map(StatsEngine.snapshotInfo)
    .filter(Boolean)
    .filter(snapshot => snapshot.iso >= minDate)
    .sort((a, b) => a.iso < b.iso ? -1 : a.iso > b.iso ? 1 : 0);

if (!snapshots.length) fail('в ' + controlDir + ' нет срезов Control_YY_MM_DD.kml после ' + minDate);

const boundaries = StatsEngine.selectMonthlySnapshots(snapshots);
const needed = new Map();
for (const snapshot of boundaries) needed.set(snapshot.name, snapshot);
if (includePartial) needed.set(snapshots[snapshots.length - 1].name, snapshots[snapshots.length - 1]);

const rings = {};
const started = Date.now();
let loaded = 0;
for (const snapshot of needed.values()) {
    const filePath = path.join(controlDir, snapshot.name);
    if (!fs.existsSync(filePath)) {
        console.warn('Нет файла ' + snapshot.name + ' — период будет пропущен');
        continue;
    }
    const ring = StatsEngine.parseControlKml(fs.readFileSync(filePath, 'utf8'));
    if (!ring) {
        console.warn('Не удалось разобрать ' + snapshot.name);
        continue;
    }
    rings[snapshot.name] = ring;
    loaded += 1;
    process.stdout.write('\rЧитаю срезы: ' + loaded + '/' + needed.size);
}
if (loaded) process.stdout.write('\n');

let directions = [];
if (fs.existsSync(directionsPath)) {
    directions = StatsEngine.parseKmlPolygons(fs.readFileSync(directionsPath, 'utf8'));
    console.log('\nНаправлений: ' + directions.length + ' (' + path.relative(ROOT, directionsPath) + ')');
} else {
    console.warn('Нет файла границ направлений: ' + directionsPath + ' — считаю только общий итог');
}

const result = StatsEngine.buildStats(snapshots, rings, clip, {
    thresholdKm2,
    minDate,
    includePartial,
    directions,
    directionsVersion: '1',
    directionsNote: 'Границы направлений: области и секторы; компонент относится к направлению по центроиду.',
    generator: 'tools/build-stats.mjs',
    generatedAt: new Date().toISOString()
});

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, JSON.stringify(result, null, 2) + '\n');

const fmt = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 1 });
console.log('');
console.log('Периодов: ' + result.periods.length + ', срезов: ' + result.snapshotCount
    + ', ' + result.firstSnapshot + ' → ' + result.lastSnapshot);
console.log('Итого: +' + fmt.format(result.totals.gain) + ' / −' + fmt.format(result.totals.loss)
    + ' = ' + (result.totals.net >= 0 ? '+' : '−') + fmt.format(Math.abs(result.totals.net)) + ' км²');
console.log('');
for (const period of result.periods.slice(-6)) {
    const tag = period.partial ? ' (текущий)' : '';
    console.log('  ' + period.month + tag + ': +' + fmt.format(period.gain)
        + ' / −' + fmt.format(period.loss) + ' = ' + (period.net >= 0 ? '+' : '−')
        + fmt.format(Math.abs(period.net)) + ' км², ' + period.days + ' дн.');
}
if (result.directions.length) {
    console.log('');
    console.log('По направлениям, полные месяцы:');
    for (const direction of result.directions) {
        const totals = direction.fullTotals;
        console.log('  ' + direction.name + ': +' + fmt.format(totals.gain)
            + ' / −' + fmt.format(totals.loss) + ' = ' + (totals.net >= 0 ? '+' : '−')
            + fmt.format(Math.abs(totals.net)) + ' км²');
    }
    if (result.unassigned) {
        const u = result.unassigned.fullTotals;
        console.log('  [вне направлений]: +' + fmt.format(u.gain)
            + ' / −' + fmt.format(u.loss) + ' = ' + (u.net >= 0 ? '+' : '−')
            + fmt.format(Math.abs(u.net)) + ' км²');
    }
}
if (result.warnings.length) {
    console.log('');
    for (const warning of result.warnings) console.warn('! ' + warning);
}
console.log('');
console.log('Записано: ' + path.relative(ROOT, outputPath) + ' (' + (Date.now() - started) + ' мс)');
