/*
 * Публичная страница статистики.
 * Только читает stats/stats.json и рисует сводку, графики и таблицы.
 * Никакой геометрии здесь нет — она считается отдельно.
 */
(function () {
    'use strict';

    var MONTHS_SHORT = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
    var MONTHS_FULL = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
        'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
    var numberFormat = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 1 });
    var charts = { main: null, direction: null, groups: null };
    var state = { data: null, range: 'all', direction: null, detail: false };
    var GROUP_FALLBACK = 'Без группы';
    var GROUP_COLORS = ['#c81e0f', '#2f63b8', '#1f8a4c', '#b8860b', '#7a4fb3', '#6c757d'];

    function escapeHtml(value) {
        return String(value == null ? '' : value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function formatNumber(value) {
        var number = Number(value);
        if (!Number.isFinite(number)) return '—';
        return numberFormat.format(number);
    }

    function signed(value) {
        var number = Number(value);
        if (!Number.isFinite(number)) return '—';
        if (number > 0) return '+' + numberFormat.format(number);
        if (number < 0) return '−' + numberFormat.format(Math.abs(number));
        return numberFormat.format(0);
    }

    function formatDate(iso) {
        var match = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
        if (!match) return '—';
        return match[3] + '.' + match[2] + '.' + match[1].slice(2);
    }

    function formatDateTime(iso) {
        var date = new Date(iso);
        if (isNaN(date.getTime())) return '—';
        return date.toLocaleString('ru-RU', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    function shortMonth(month) {
        var parts = String(month || '').split('-');
        var index = Number(parts[1]) - 1;
        if (!MONTHS_SHORT[index]) return String(month || '');
        return MONTHS_SHORT[index] + ' ' + String(parts[0] || '').slice(2);
    }

    function valueClass(value) {
        var number = Number(value);
        if (number > 0) return 'gain';
        if (number < 0) return 'loss';
        return 'neutral';
    }

    function cardClass(value) {
        var number = Number(value);
        if (number > 0) return 'is-gain';
        if (number < 0) return 'is-loss';
        return 'is-total';
    }

    function cardLine(label, value, cls) {
        return '<span class="stats-card-line">'
            + '<span class="stats-card-line-label">' + escapeHtml(label) + '</span>'
            + '<span class="stats-card-line-value ' + (cls || 'neutral') + '">' + escapeHtml(value) + '</span>'
            + '</span>';
    }

    function card(label, value, context, lines) {
        var cls = valueClass(value);
        return '<article class="stats-card ' + cardClass(value) + '">'
            + '<span class="stats-card-label">' + escapeHtml(label) + '</span>'
            + '<span class="stats-card-value ' + cls + '">' + escapeHtml(signed(value)) + '</span>'
            + (context ? '<span class="stats-card-context">' + escapeHtml(context) + '</span>' : '')
            + '<span class="stats-card-lines">' + (lines || []).join('') + '</span>'
            + '</article>';
    }

    function findPeriodByMonth(periods, month) {
        for (var i = 0; i < periods.length; i++) {
            if (periods[i].month === month) return periods[i];
        }
        return null;
    }

    function shiftMonth(month, delta) {
        var parts = String(month || '').split('-');
        var year = Number(parts[0]);
        var mon = Number(parts[1]);
        if (!year || !mon) return '';
        var total = year * 12 + (mon - 1) + delta;
        var nextYear = Math.floor(total / 12);
        var nextMon = (total % 12 + 12) % 12 + 1;
        return nextYear + '-' + String(nextMon).padStart(2, '0');
    }

    function previousCalendarPeriod(data) {
        var periods = data && data.periods ? data.periods : [];
        var latest = latestPeriod(data);
        if (!latest) return null;
        for (var i = periods.length - 1; i >= 0; i--) {
            if (periods[i].month < latest.month) return periods[i];
        }
        return null;
    }

    function previousYearTotals(periods, allPeriods) {
        var priorPeriods = [];
        for (var i = 0; i < periods.length; i++) {
            var prior = findPeriodByMonth(allPeriods, shiftMonth(periods[i].month, -12));
            if (!prior) return null;
            priorPeriods.push(prior);
        }
        if (!priorPeriods.length) return null;
        return { periods: priorPeriods, totals: summarize(priorPeriods) };
    }

    function daysSuffix(days, compareDays) {
        return Number(days) !== Number(compareDays) ? ' (' + formatNumber(days) + ' дн.)' : '';
    }

    function capitalize(value) {
        var text = String(value || '');
        return text ? text.charAt(0).toUpperCase() + text.slice(1) : text;
    }

    function findDirection(data, id) {
        var directions = data && data.directions ? data.directions : [];
        for (var i = 0; i < directions.length; i++) {
            if (directions[i].id === id) return directions[i];
        }
        return null;
    }

    function directionGroup(direction) {
        return direction && direction.group ? direction.group : GROUP_FALLBACK;
    }

    function isYearRange(range) {
        return /^\d{4}$/.test(String(range || ''));
    }

    function isMonthRange(range) {
        return /^\d{4}-\d{2}$/.test(String(range || ''));
    }

    function fullMonthLabel(month) {
        var parts = String(month || '').split('-');
        var index = Number(parts[1]) - 1;
        if (!MONTHS_FULL[index]) return String(month || '');
        return MONTHS_FULL[index] + ' ' + parts[0];
    }

    function filterPeriods(periods, range) {
        var list = Array.isArray(periods) ? periods : [];
        if (!range || range === 'all') return list.slice();
        if (isYearRange(range)) {
            return list.filter(function (period) {
                return String(period.month || '').slice(0, 4) === String(range);
            });
        }
        if (isMonthRange(range)) {
            return list.filter(function (period) {
                return String(period.month || '') === String(range);
            });
        }
        var count = Number(range);
        if (!Number.isFinite(count) || count <= 0 || count >= list.length) return list.slice();
        return list.slice(-count);
    }

    function rangeLabel(range) {
        if (!range || range === 'all') return 'всё время';
        if (isYearRange(range)) return range + ' год';
        if (isMonthRange(range)) return fullMonthLabel(range);
        return 'последние ' + range + ' мес.';
    }

    function fullPeriods(periods) {
        return (Array.isArray(periods) ? periods : []).filter(function (period) {
            return !period.partial;
        });
    }

    function totalsPeriods(periods, range) {
        var filtered = filterPeriods(periods, range);
        return isMonthRange(range) ? filtered : fullPeriods(filtered);
    }

    function periodsCaption(periods) {
        var total = Array.isArray(periods) ? periods.length : 0;
        var full = fullPeriods(periods).length;
        var partial = total - full;
        if (!partial) return full + ' полн. мес.';
        if (!full) return partial + ' неполн. мес.';
        return full + ' полн. + ' + partial + ' неполн.';
    }

    function emptyTotals() {
        return { gain: 0, loss: 0, net: 0, days: 0, count: 0 };
    }

    function summarize(periods) {
        var totals = emptyTotals();
        for (var i = 0; i < periods.length; i++) {
            var period = periods[i];
            totals.gain += Number(period.gain) || 0;
            totals.loss += Number(period.loss) || 0;
            totals.net += Number(period.net) || 0;
            totals.days += Number(period.days) || 0;
            totals.count += 1;
        }
        return totals;
    }

    function latestPeriod(data) {
        var periods = data && data.periods ? data.periods : [];
        return periods.length ? periods[periods.length - 1] : null;
    }

    function latestFullPeriod(data) {
        var full = fullPeriods(data && data.periods ? data.periods : []);
        return full.length ? full[full.length - 1] : null;
    }

    function directionTotals(direction, range) {
        var periods = totalsPeriods(direction && direction.periods ? direction.periods : [], range);
        return summarize(periods);
    }

    function unassignedTotals(data, range) {
        var periods = totalsPeriods(data && data.periods ? data.periods : [], range);
        var totals = emptyTotals();
        for (var i = 0; i < periods.length; i++) {
            var item = periods[i].unassigned;
            if (!item) continue;
            totals.gain += Number(item.gain) || 0;
            totals.loss += Number(item.loss) || 0;
            totals.net += Number(item.net) || 0;
            totals.count += 1;
        }
        return totals;
    }

    function renderCards(data, periods) {
        var latest = latestPeriod(data);
        if (!latest) return;
        var allPeriods = data.periods || [];
        var previous = previousCalendarPeriod(data);
        var totals = summarize(periods);
        var allTotals = summarize(allPeriods);
        var allRate = allTotals.days > 0 ? allTotals.net / allTotals.days : 0;
        var cards = [];

        var latestPrior = findPeriodByMonth(allPeriods, shiftMonth(latest.month, -12));
        cards.push(card(
            'Текущий месяц',
            latest.net,
            formatDate(latest.from) + ' — ' + formatDate(latest.to) + ' · ' + latest.days + ' дн.',
            [
                cardLine('Продвижение', '+' + formatNumber(latest.gain), 'gain'),
                cardLine('Отход', '−' + formatNumber(latest.loss), 'loss'),
                latestPrior
                    ? cardLine(fullMonthLabel(latestPrior.month), signed(latestPrior.net) + daysSuffix(latestPrior.days, latest.days), valueClass(latestPrior.net))
                    : cardLine('Год назад', '—', 'neutral')
            ]
        ));

        if (previous) {
            var previousPrior = findPeriodByMonth(allPeriods, shiftMonth(previous.month, -12));
            cards.push(card(
                'Предыдущий месяц',
                previous.net,
                previous.label + ' · ' + formatDate(previous.from) + ' — ' + formatDate(previous.to) + ' · ' + previous.days + ' дн.',
                [
                    cardLine('Продвижение', '+' + formatNumber(previous.gain), 'gain'),
                    cardLine('Отход', '−' + formatNumber(previous.loss), 'loss'),
                    previousPrior
                        ? cardLine(fullMonthLabel(previousPrior.month), signed(previousPrior.net) + daysSuffix(previousPrior.days, previous.days), valueClass(previousPrior.net))
                        : cardLine('Год назад', '—', 'neutral')
                ]
            ));
        }

        var priorRange = previousYearTotals(periods, allPeriods);
        var priorLabel = priorRange && priorRange.periods.length === 1
            ? fullMonthLabel(priorRange.periods[0].month)
            : 'Год назад';
        cards.push(card(
            'Выбранный период',
            totals.net,
            capitalize(rangeLabel(state.range)) + ' · ' + formatNumber(totals.days) + ' дн.',
            [
                cardLine('Продвижение', '+' + formatNumber(totals.gain), 'gain'),
                cardLine('Отход', '−' + formatNumber(totals.loss), 'loss'),
                priorRange
                    ? cardLine(priorLabel, signed(priorRange.totals.net) + daysSuffix(priorRange.totals.days, totals.days), valueClass(priorRange.totals.net))
                    : cardLine('Год назад', '—', 'neutral')
            ]
        ));

        var fullCount = fullPeriods(allPeriods).length;
        var partialCount = allPeriods.length - fullCount;
        cards.push(card(
            'С начала наступления',
            allTotals.net,
            formatDate(data.firstSnapshot) + ' — ' + formatDate(data.lastSnapshot) + ' · ' + formatNumber(allTotals.days) + ' дн.',
            [
                cardLine('Продвижение', '+' + formatNumber(allTotals.gain), 'gain'),
                cardLine('Отход', '−' + formatNumber(allTotals.loss), 'loss'),
                cardLine('Месяцев', allPeriods.length + (partialCount ? ' (' + fullCount + ' полных)' : ''), 'neutral'),
                cardLine('Темп', signed(allRate) + ' км²/день', 'neutral')
            ]
        ));

        document.getElementById('stats-cards').innerHTML = cards.join('');
    }

    function renderTable(periods) {
        var reversed = periods.slice().reverse();
        var body = document.getElementById('stats-table-body');
        var rows = reversed.map(function (period) {
            var gain = Number(period.gain) || 0;
            var loss = Number(period.loss) || 0;
            var net = Number(period.net) || 0;
            var badge = period.partial ? '<span class="stats-badge">текущий</span>' : '';
            var netClass = net > 0 ? 'net-pos' : net < 0 ? 'net-neg' : 'muted';
            var selected = state.range === period.month;
            return '<tr class="is-clickable' + (period.partial ? ' is-partial' : '')
                + (selected ? ' is-selected' : '') + '" data-month="' + escapeHtml(period.month)
                + '" tabindex="0">'
                + '<td class="month-cell">' + escapeHtml(period.label) + badge + '</td>'
                + '<td class="muted">' + formatDate(period.from) + ' — ' + formatDate(period.to) + '</td>'
                + '<td class="num">' + escapeHtml(String(period.days)) + '</td>'
                + '<td class="num gain">' + (gain > 0 ? '+' + formatNumber(gain) : '0') + '</td>'
                + '<td class="num loss">' + (loss > 0 ? '−' + formatNumber(loss) : '0') + '</td>'
                + '<td class="num ' + netClass + '">' + escapeHtml(signed(net)) + '</td>'
                + '<td class="num">' + escapeHtml(signed(period.rate)) + '</td>'
                + '</tr>';
        });
        body.innerHTML = rows.join('');

        var microGain = 0;
        var microLoss = 0;
        for (var i = 0; i < periods.length; i++) {
            var micro = periods[i].micro || {};
            microGain += Number(micro.gain) || 0;
            microLoss += Number(micro.loss) || 0;
        }
        var note = document.getElementById('stats-table-note');
        if (note) {
            var threshold = state.data && state.data.source && state.data.source.thresholdKm2 != null
                ? Number(state.data.source.thresholdKm2)
                : 0;
            if (!periods.length) {
                note.textContent = 'За выбранный период данных нет.';
            } else if (threshold > 0) {
                note.textContent = 'Показано ' + periods.length + ' периодов. Не вошли микрополигоны меньше '
                    + formatNumber(threshold) + ' км²: прирост +' + formatNumber(microGain)
                    + ', уменьшение −' + formatNumber(microLoss) + ' км².';
            } else {
                note.textContent = 'Показано ' + periods.length
                    + ' периодов. Учитываются все компоненты разности, включая мелкие.';
            }
        }
        var sub = document.getElementById('stats-table-sub');
        if (sub) {
            sub.textContent = 'Фактические даты срезов, между которыми посчитана дельта. Показано '
                + periods.length + ' периодов. Нажмите на строку, чтобы показать только этот месяц.';
        }
    }

    function renderCurrentDirections(data) {
        var section = document.getElementById('stats-current');
        var body = document.getElementById('stats-current-body');
        var latest = latestPeriod(data);
        if (!section || !body || !latest || !latest.partial || !latest.directions || !latest.directions.length) {
            if (section) section.classList.add('hidden');
            return;
        }

        var rows = latest.directions.map(function (direction) {
            var net = Number(direction.net) || 0;
            var rate = latest.days > 0 ? net / latest.days : 0;
            return '<tr>'
                + '<td>' + escapeHtml(direction.name) + '</td>'
                + '<td class="num gain">' + ((Number(direction.gain) || 0) > 0 ? '+' + formatNumber(direction.gain) : '0') + '</td>'
                + '<td class="num loss">' + ((Number(direction.loss) || 0) > 0 ? '−' + formatNumber(direction.loss) : '0') + '</td>'
                + '<td class="num ' + (net > 0 ? 'net-pos' : net < 0 ? 'net-neg' : 'muted') + '">' + signed(net) + '</td>'
                + '<td class="num">' + signed(rate) + '</td>'
                + '</tr>';
        });

        if (latest.unassigned) {
            rows.push('<tr class="is-unassigned">'
                + '<td>Вне направлений</td>'
                + '<td class="num gain">' + (latest.unassigned.gain > 0 ? '+' + formatNumber(latest.unassigned.gain) : '0') + '</td>'
                + '<td class="num loss">' + (latest.unassigned.loss > 0 ? '−' + formatNumber(latest.unassigned.loss) : '0') + '</td>'
                + '<td class="num">' + signed(latest.unassigned.net) + '</td>'
                + '<td class="num">' + signed(latest.unassigned.net / Math.max(1, latest.days)) + '</td>'
                + '</tr>');
        }

        rows.push('<tr class="is-total">'
            + '<td>Итого</td>'
            + '<td class="num gain">+' + formatNumber(latest.gain) + '</td>'
            + '<td class="num loss">−' + formatNumber(latest.loss) + '</td>'
            + '<td class="num">' + signed(latest.net) + '</td>'
            + '<td class="num">' + signed(latest.rate) + '</td>'
            + '</tr>');

        body.innerHTML = rows.join('');
        var sub = document.getElementById('stats-current-sub');
        if (sub) {
            sub.textContent = formatDate(latest.from) + ' — ' + formatDate(latest.to)
                + ' · ' + latest.days + ' дн. · темп ' + signed(latest.rate) + ' км²/день.';
        }
        var note = document.getElementById('stats-current-note');
        if (note) {
            note.textContent = 'Текущий неполный период показан независимо от фильтра. '
                + 'Значения по направлениям и «вне направлений» в сумме дают итог периода.';
        }
        section.classList.remove('hidden');
    }

    function destroyChart(key) {
        if (charts[key]) {
            charts[key].destroy();
            charts[key] = null;
        }
    }

    function chartUnavailable(wrap, fallback) {
        if (wrap) wrap.classList.add('hidden');
        if (fallback) fallback.classList.remove('hidden');
    }

    function chartAvailable(wrap, fallback) {
        if (wrap) wrap.classList.remove('hidden');
        if (fallback) fallback.classList.add('hidden');
    }

    var MAIN_GAIN = '#e01b0b';
    var MAIN_LOSS = '#2f63b8';
    var MAIN_GAIN_LINE = 'rgba(224, 27, 11, 0.78)';
    var MAIN_LOSS_LINE = 'rgba(47, 99, 184, 0.78)';

    var currentLevelPlugin = {
        id: 'currentLevel',
        afterDatasetsDraw: function (chart) {
            var opts = chart.options.plugins.currentLevel;
            if (!opts || !isFinite(opts.value)) return;
            var area = chart.chartArea;
            var y = chart.scales.y.getPixelForValue(opts.value);
            if (!area || !isFinite(y) || y < area.top || y > area.bottom) return;
            var ctx = chart.ctx;
            ctx.save();
            ctx.setLineDash([6, 4]);
            ctx.lineWidth = 1;
            ctx.strokeStyle = 'rgba(31, 35, 40, 0.55)';
            ctx.beginPath();
            ctx.moveTo(area.left, y);
            ctx.lineTo(area.right, y);
            ctx.stroke();
            ctx.restore();
        }
    };

    var yearSeparatorsPlugin = {
        id: 'yearSeparators',
        afterDatasetsDraw: function (chart) {
            var opts = chart.options.plugins.yearSeparators;
            if (!opts || !opts.periods || opts.periods.length < 2) return;
            var meta = chart.getDatasetMeta(0);
            if (!meta || !meta.data || meta.data.length < 2) return;
            var periods = opts.periods;
            var area = chart.chartArea;
            var ctx = chart.ctx;
            var yearOf = function (period) { return String(period.month || '').slice(0, 4); };
            var drawYear = function (x, year) {
                ctx.save();
                ctx.font = '10px Roboto, Arial, sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.lineWidth = 3;
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
                ctx.strokeText(year, x, area.top + 11);
                ctx.fillStyle = 'rgba(31, 35, 40, 0.62)';
                ctx.fillText(year, x, area.top + 11);
                ctx.restore();
            };

            var firstBoundaryX = null;
            ctx.save();
            ctx.setLineDash([4, 4]);
            ctx.lineWidth = 1;
            ctx.strokeStyle = 'rgba(31, 35, 40, 0.22)';
            for (var i = 1; i < periods.length; i++) {
                if (yearOf(periods[i]) === yearOf(periods[i - 1])) continue;
                var x = (meta.data[i - 1].x + meta.data[i].x) / 2;
                if (firstBoundaryX === null) firstBoundaryX = x;
                ctx.beginPath();
                ctx.moveTo(x, area.top);
                ctx.lineTo(x, area.bottom);
                ctx.stroke();
                drawYear(x, yearOf(periods[i]));
            }
            ctx.restore();

            var firstX = Math.max(area.left + 16, meta.data[0].x);
            if (firstBoundaryX === null || firstBoundaryX - firstX >= 28) {
                drawYear(firstX, yearOf(periods[0]));
            }
        }
    };

    var detailLabelsPlugin = {
        id: 'detailLabels',
        afterDatasetsDraw: function (chart) {
            var opts = chart.options.plugins.detailLabels;
            if (!opts || !opts.enabled) return;
            var meta = chart.getDatasetMeta(0);
            if (!meta || !meta.data) return;
            var values = chart.data.datasets[0].data;
            var area = chart.chartArea;
            var ctx = chart.ctx;
            var compact = area && area.width < 500;
            ctx.save();
            ctx.font = (compact ? '8px' : '9px') + ' Roboto, Arial, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.lineWidth = 3;
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.92)';
            ctx.fillStyle = 'rgba(31, 35, 40, 0.82)';
            for (var i = 0; i < meta.data.length; i++) {
                var point = meta.data[i];
                var value = Number(values[i]);
                if (!point || !isFinite(point.x) || !isFinite(point.y) || !isFinite(value)) continue;
                var offset = (i % 2 === 0 ? 9 : 19) * (compact ? 0.85 : 1);
                var labelY = value >= 0 ? point.y - offset : point.y + offset;
                if (labelY < area.top + 7) labelY = point.y + offset;
                if (labelY > area.bottom - 5) labelY = point.y - offset;
                var labelX = Math.min(area.right - 4, Math.max(area.left + 4, point.x));
                ctx.strokeText(signed(value), labelX, labelY);
                ctx.fillText(signed(value), labelX, labelY);
            }
            ctx.restore();
        }
    };

    function renderMainChart(periods) {
        var canvas = document.getElementById('monthly-chart');
        if (!canvas) return;
        var wrap = canvas.closest('.stats-chart-wrap');
        var fallback = document.getElementById('stats-chart-fallback');
        if (typeof Chart === 'undefined') {
            chartUnavailable(wrap, fallback);
            return;
        }
        chartAvailable(wrap, fallback);

        var labels = periods.map(function (period) {
            return shortMonth(period.month) + (period.partial ? '*' : '');
        });
        var gains = periods.map(function (period) { return Number(period.gain) || 0; });
        var losses = periods.map(function (period) { return -(Number(period.loss) || 0); });
        var nets = periods.map(function (period) { return Number(period.net) || 0; });
        var gainColors = periods.map(function (period) {
            return period.partial ? 'rgba(224, 27, 11, 0.24)' : 'rgba(224, 27, 11, 0.45)';
        });
        var lossColors = periods.map(function (period) {
            return period.partial ? 'rgba(47, 99, 184, 0.20)' : 'rgba(47, 99, 184, 0.35)';
        });
        var lastPeriod = periods[periods.length - 1];
        var lastNet = nets[nets.length - 1];

        var sub = document.getElementById('stats-chart-sub');
        if (sub) sub.textContent = 'Прирост — выше нуля, уменьшение — ниже нуля, линия — нетто. * — неполный месяц. Пунктир — уровень последнего периода, вертикальные линии — годы. Показано ' + periods.length + ' периодов.';
        var currentNote = document.getElementById('stats-current-note');
        if (currentNote) {
            currentNote.textContent = 'Пунктир — ' + (lastPeriod && lastPeriod.partial ? 'текущий' : 'последний')
                + ' уровень: ' + signed(lastNet) + ' км².';
        }

        destroyChart('main');
        charts.main = new Chart(canvas.getContext('2d'), {
            type: 'bar',
            plugins: [currentLevelPlugin, yearSeparatorsPlugin, detailLabelsPlugin],
            data: {
                labels: labels,
                datasets: [
                    {
                        type: 'line',
                        label: 'Нетто',
                        data: nets,
                        fill: 'origin',
                        borderColor: MAIN_GAIN,
                        backgroundColor: function (context) {
                            var chart = context.chart;
                            var area = chart.chartArea;
                            if (!area) return 'rgba(224, 27, 11, 0.10)';
                            var zero = chart.scales.y.getPixelForValue(0);
                            var ratio = (zero - area.top) / (area.bottom - area.top);
                            ratio = Math.min(1, Math.max(0, ratio));
                            var gradient = chart.ctx.createLinearGradient(0, area.top, 0, area.bottom);
                            gradient.addColorStop(0, 'rgba(224, 27, 11, 0.10)');
                            gradient.addColorStop(ratio, 'rgba(224, 27, 11, 0.10)');
                            gradient.addColorStop(Math.min(1, ratio + 0.0001), 'rgba(47, 99, 184, 0.10)');
                            gradient.addColorStop(1, 'rgba(47, 99, 184, 0.10)');
                            return gradient;
                        },
                        borderWidth: 2.5,
                        pointRadius: 2,
                        pointHoverRadius: 4,
                        pointBorderWidth: 0,
                        pointBackgroundColor: function (context) {
                            return context.parsed.y >= 0 ? MAIN_GAIN : MAIN_LOSS;
                        },
                        pointHoverBackgroundColor: function (context) {
                            return context.parsed.y >= 0 ? MAIN_GAIN : MAIN_LOSS;
                        },
                        tension: 0.25,
                        order: 2,
                        segment: {
                            borderColor: function (context) {
                                var value = (context.p0.parsed.y + context.p1.parsed.y) / 2;
                                return value >= 0 ? MAIN_GAIN_LINE : MAIN_LOSS_LINE;
                            }
                        }
                    },
                    {
                        type: 'bar',
                        label: 'Прирост',
                        data: gains,
                        backgroundColor: gainColors,
                        borderRadius: 2,
                        maxBarThickness: 24,
                        order: 1
                    },
                    {
                        type: 'bar',
                        label: 'Уменьшение',
                        data: losses,
                        backgroundColor: lossColors,
                        borderRadius: 2,
                        maxBarThickness: 24,
                        order: 1
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: { mode: 'index', intersect: false },
                animation: false,
                plugins: {
                    legend: { display: false },
                    currentLevel: { value: lastNet },
                    yearSeparators: { periods: periods },
                    detailLabels: { enabled: state.detail },
                    tooltip: {
                        backgroundColor: 'rgba(31, 35, 40, 0.94)',
                        titleFont: { family: 'Roboto, Arial, sans-serif', size: 13 },
                        bodyFont: { family: 'Roboto, Arial, sans-serif', size: 12 },
                        padding: 10,
                        callbacks: {
                            title: function (items) {
                                var period = periods[items[0].dataIndex];
                                return period ? period.label : '';
                            },
                            label: function (context) {
                                return context.dataset.label + ': ' + signed(context.parsed.y) + ' км²';
                            },
                            afterBody: function (items) {
                                var period = periods[items[0].dataIndex];
                                if (!period) return '';
                                return [
                                    formatDate(period.from) + ' — ' + formatDate(period.to),
                                    'Дней: ' + period.days + ' · темп: ' + signed(period.rate) + ' км²/день'
                                ];
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: { display: false },
                        ticks: {
                            color: '#6c757d',
                            maxRotation: 0,
                            autoSkip: true,
                            maxTicksLimit: 14,
                            font: { family: 'Roboto, Arial, sans-serif', size: 11 }
                        }
                    },
                    y: {
                        beginAtZero: true,
                        grid: { color: 'rgba(0, 0, 0, 0.07)' },
                        ticks: {
                            color: '#6c757d',
                            callback: function (value) { return numberFormat.format(value); },
                            font: { family: 'Roboto, Arial, sans-serif', size: 11 }
                        },
                        title: {
                            display: true,
                            text: 'км²',
                            color: '#6c757d',
                            font: { family: 'Roboto, Arial, sans-serif', size: 11 }
                        }
                    }
                }
            }
        });
    }

    function renderDirectionChart(direction, periods) {
        var canvas = document.getElementById('direction-chart');
        if (!canvas) return;
        var wrap = canvas.closest('.stats-chart-wrap');
        var fallback = document.getElementById('direction-chart-fallback');
        if (typeof Chart === 'undefined') {
            chartUnavailable(wrap, fallback);
            return;
        }
        if (!periods.length) {
            chartUnavailable(wrap, fallback);
            if (fallback) {
                fallback.textContent = 'За выбранный период данных по направлению нет.';
                fallback.classList.remove('hidden');
            }
            return;
        }
        chartAvailable(wrap, fallback);

        var labels = periods.map(function (period) {
            return shortMonth(period.month) + (period.partial ? '*' : '');
        });
        var net = periods.map(function (period) { return Number(period.net) || 0; });

        destroyChart('direction');
        charts.direction = new Chart(canvas.getContext('2d'), {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Нетто',
                    data: net,
                    borderColor: '#1f2328',
                    backgroundColor: 'rgba(31, 35, 40, 0.10)',
                    borderWidth: 2,
                    pointRadius: 2.5,
                    pointHoverRadius: 4,
                    fill: true,
                    tension: 0.25
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: { mode: 'index', intersect: false },
                animation: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: 'rgba(31, 35, 40, 0.94)',
                        titleFont: { family: 'Roboto, Arial, sans-serif', size: 13 },
                        bodyFont: { family: 'Roboto, Arial, sans-serif', size: 12 },
                        padding: 10,
                        callbacks: {
                            title: function (items) {
                                var period = periods[items[0].dataIndex];
                                return period ? period.label : '';
                            },
                            label: function (context) {
                                return 'Нетто: ' + signed(context.parsed.y) + ' км²';
                            },
                            afterBody: function (items) {
                                var period = periods[items[0].dataIndex];
                                if (!period) return '';
                                return [
                                    'Прирост: +' + formatNumber(period.gain),
                                    'Уменьшение: −' + formatNumber(period.loss),
                                    'Дней: ' + period.days
                                ];
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: { display: false },
                        ticks: {
                            color: '#6c757d',
                            maxRotation: 0,
                            autoSkip: true,
                            maxTicksLimit: 12,
                            font: { family: 'Roboto, Arial, sans-serif', size: 11 }
                        }
                    },
                    y: {
                        beginAtZero: true,
                        grid: { color: 'rgba(0, 0, 0, 0.07)' },
                        ticks: {
                            color: '#6c757d',
                            callback: function (value) { return numberFormat.format(value); },
                            font: { family: 'Roboto, Arial, sans-serif', size: 11 }
                        },
                        title: {
                            display: true,
                            text: 'км²',
                            color: '#6c757d',
                            font: { family: 'Roboto, Arial, sans-serif', size: 11 }
                        }
                    }
                }
            }
        });
    }

    function buildGroupModel(data, periods) {
        var order = [];
        var map = {};
        var idToGroup = {};
        var directions = data.directions || [];
        for (var i = 0; i < directions.length; i++) {
            var group = directionGroup(directions[i]);
            if (!map[group]) {
                map[group] = { name: group, directionIds: [], totals: emptyTotals() };
                order.push(group);
            }
            map[group].directionIds.push(directions[i].id);
            idToGroup[directions[i].id] = group;
        }

        for (var g = 0; g < order.length; g++) {
            var item = map[order[g]];
            var totals = emptyTotals();
            for (var d = 0; d < item.directionIds.length; d++) {
                var direction = findDirection(data, item.directionIds[d]);
                if (!direction) continue;
                var directionSummary = directionTotals(direction, state.range);
                totals.gain += directionSummary.gain;
                totals.loss += directionSummary.loss;
                totals.net += directionSummary.net;
                totals.days += directionSummary.days;
                totals.count += directionSummary.count;
            }
            item.totals = totals;
        }

        var periodGroups = periods.map(function (period) {
            var values = {};
            for (var k = 0; k < order.length; k++) values[order[k]] = 0;
            var periodDirections = period.directions || [];
            for (var j = 0; j < periodDirections.length; j++) {
                var name = idToGroup[periodDirections[j].id];
                if (name && values[name] != null) values[name] += Number(periodDirections[j].net) || 0;
            }
            return {
                period: period,
                values: values,
                unassigned: period.unassigned ? Number(period.unassigned.net) || 0 : 0
            };
        });

        return {
            order: order,
            map: map,
            periodGroups: periodGroups,
            unassigned: unassignedTotals(data, state.range)
        };
    }

    function renderGroupChart(data, periods, model) {
        var canvas = document.getElementById('groups-chart');
        if (!canvas) return;
        var wrap = canvas.closest('.stats-chart-wrap');
        var fallback = document.getElementById('groups-chart-fallback');
        if (typeof Chart === 'undefined') {
            chartUnavailable(wrap, fallback);
            return;
        }
        if (!periods.length || !model.order.length) {
            chartUnavailable(wrap, fallback);
            return;
        }
        chartAvailable(wrap, fallback);

        var labels = periods.map(function (period) {
            return shortMonth(period.month) + (period.partial ? '*' : '');
        });
        var datasets = model.order.map(function (name, index) {
            return {
                label: name,
                data: model.periodGroups.map(function (item) { return item.values[name] || 0; }),
                backgroundColor: GROUP_COLORS[index % GROUP_COLORS.length],
                borderRadius: 2,
                maxBarThickness: 24,
                stack: 'net'
            };
        });
        if (data.unassigned) {
            datasets.push({
                label: 'Вне направлений',
                data: model.periodGroups.map(function (item) { return item.unassigned; }),
                backgroundColor: '#9aa0a6',
                borderRadius: 2,
                maxBarThickness: 24,
                stack: 'net'
            });
        }

        destroyChart('groups');
        charts.groups = new Chart(canvas.getContext('2d'), {
            type: 'bar',
            data: { labels: labels, datasets: datasets },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: { mode: 'index', intersect: false },
                animation: false,
                plugins: {
                    legend: {
                        display: true,
                        position: 'top',
                        align: 'end',
                        labels: {
                            usePointStyle: true,
                            boxWidth: 9,
                            boxHeight: 9,
                            padding: 14,
                            color: '#495057',
                            font: { family: 'Roboto, Arial, sans-serif', size: 11 }
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(31, 35, 40, 0.94)',
                        titleFont: { family: 'Roboto, Arial, sans-serif', size: 13 },
                        bodyFont: { family: 'Roboto, Arial, sans-serif', size: 12 },
                        padding: 10,
                        callbacks: {
                            title: function (items) {
                                var period = periods[items[0].dataIndex];
                                return period ? period.label : '';
                            },
                            label: function (context) {
                                return context.dataset.label + ': ' + signed(context.parsed.y) + ' км²';
                            },
                            afterBody: function (items) {
                                var period = periods[items[0].dataIndex];
                                if (!period) return '';
                                return ['Всего: ' + signed(period.net) + ' км²'];
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        stacked: true,
                        grid: { display: false },
                        ticks: {
                            color: '#6c757d',
                            maxRotation: 0,
                            autoSkip: true,
                            maxTicksLimit: 14,
                            font: { family: 'Roboto, Arial, sans-serif', size: 11 }
                        }
                    },
                    y: {
                        stacked: true,
                        beginAtZero: true,
                        grid: { color: 'rgba(0, 0, 0, 0.07)' },
                        ticks: {
                            color: '#6c757d',
                            callback: function (value) { return numberFormat.format(value); },
                            font: { family: 'Roboto, Arial, sans-serif', size: 11 }
                        },
                        title: {
                            display: true,
                            text: 'км²',
                            color: '#6c757d',
                            font: { family: 'Roboto, Arial, sans-serif', size: 11 }
                        }
                    }
                }
            }
        });
    }

    function renderGroups(data, periods) {
        var section = document.getElementById('groups');
        if (!section) return;
        if (!data.directions || !data.directions.length) {
            section.classList.add('hidden');
            return;
        }

        var model = buildGroupModel(data, periods);
        if (!model.order.length) {
            section.classList.add('hidden');
            return;
        }

        var rows = model.order.map(function (name) {
            var totals = model.map[name].totals;
            return '<tr>'
                + '<td>' + escapeHtml(name) + ' <span class="muted">(' + model.map[name].directionIds.length + ')</span></td>'
                + '<td class="num gain">' + (totals.gain > 0 ? '+' + formatNumber(totals.gain) : '0') + '</td>'
                + '<td class="num loss">' + (totals.loss > 0 ? '−' + formatNumber(totals.loss) : '0') + '</td>'
                + '<td class="num ' + (totals.net > 0 ? 'net-pos' : totals.net < 0 ? 'net-neg' : 'muted') + '">' + signed(totals.net) + '</td>'
                + '</tr>';
        });

        if (data.unassigned) {
            var unassigned = model.unassigned;
            rows.push('<tr class="is-unassigned">'
                + '<td>Вне направлений</td>'
                + '<td class="num gain">' + (unassigned.gain > 0 ? '+' + formatNumber(unassigned.gain) : '0') + '</td>'
                + '<td class="num loss">' + (unassigned.loss > 0 ? '−' + formatNumber(unassigned.loss) : '0') + '</td>'
                + '<td class="num">' + signed(unassigned.net) + '</td>'
                + '</tr>');
        }

        var total = summarize(totalsPeriods(periods, state.range));
        rows.push('<tr class="is-total">'
            + '<td>Итого</td>'
            + '<td class="num gain">+' + formatNumber(total.gain) + '</td>'
            + '<td class="num loss">−' + formatNumber(total.loss) + '</td>'
            + '<td class="num">' + signed(total.net) + '</td>'
            + '</tr>');
        document.getElementById('stats-groups-body').innerHTML = rows.join('');

        var sub = document.getElementById('stats-groups-sub');
        if (sub) {
            sub.textContent = 'Нетто по группам; показано '
                + periodsCaption(totalsPeriods(periods, state.range)) + '. * — неполный месяц.';
        }
        var note = document.getElementById('stats-groups-note');
        if (note) {
            note.textContent = 'Группы заданы в KML границ. В скобках — число направлений в группе. '
                + '«Вне направлений» — компоненты, не попавшие ни в один сектор.';
        }
        section.classList.remove('hidden');
        renderGroupChart(data, periods, model);
    }

    function ensureSelectedDirection(data) {
        var directions = data && data.directions ? data.directions : [];
        var selected = findDirection(data, state.direction);
        if (selected) return selected;
        var best = null;
        for (var i = 0; i < directions.length; i++) {
            var net = directions[i].fullTotals ? Number(directions[i].fullTotals.net) || 0 : 0;
            if (!best || net > best.net) best = { direction: directions[i], net: net };
        }
        selected = best ? best.direction : (directions[0] || null);
        state.direction = selected ? selected.id : null;
        return selected;
    }

    function renderDirectionDetail(data, direction, periods) {
        var title = document.getElementById('stats-direction-title');
        var sub = document.getElementById('stats-direction-sub');
        var totalsBox = document.getElementById('stats-direction-totals');
        if (!direction) {
            if (title) title.textContent = '';
            if (sub) sub.textContent = '';
            if (totalsBox) totalsBox.innerHTML = '';
            return;
        }
        var directionPeriods = filterPeriods(direction.periods, state.range);
        var totals = directionTotals(direction, state.range);
        if (title) title.textContent = direction.name;
        if (sub) {
            sub.textContent = directionGroup(direction) + ' · ' + totals.count
                + ' полн. мес. · ' + rangeLabel(state.range) + ' · * — неполный месяц.';
        }
        if (totalsBox) {
            totalsBox.innerHTML = '<span class="gain">+' + formatNumber(totals.gain) + '</span>'
                + '<span class="loss">−' + formatNumber(totals.loss) + '</span>'
                + '<span class="net">' + signed(totals.net) + ' км²</span>';
        }
        renderDirectionChart(direction, directionPeriods);
    }

    function renderDirections(data, periods) {
        var section = document.getElementById('directions');
        var body = document.getElementById('stats-directions-body');
        var select = document.getElementById('stats-direction-select');
        if (!section || !body) return;
        var directions = data.directions || [];
        if (!directions.length) {
            section.classList.add('hidden');
            return;
        }

        var selected = ensureSelectedDirection(data);
        var rows = directions.map(function (direction) {
            var totals = directionTotals(direction, state.range);
            var isSelected = selected && direction.id === selected.id;
            return '<tr class="is-clickable' + (isSelected ? ' is-selected' : '') + '"'
                + ' data-direction="' + escapeHtml(direction.id) + '" tabindex="0">'
                + '<td>' + escapeHtml(direction.name) + '</td>'
                + '<td class="num gain">' + (totals.gain > 0 ? '+' + formatNumber(totals.gain) : '0') + '</td>'
                + '<td class="num loss">' + (totals.loss > 0 ? '−' + formatNumber(totals.loss) : '0') + '</td>'
                + '<td class="num ' + (totals.net > 0 ? 'net-pos' : totals.net < 0 ? 'net-neg' : 'muted') + '">' + signed(totals.net) + '</td>'
                + '</tr>';
        });

        if (data.unassigned) {
            var unassigned = unassignedTotals(data, state.range);
            rows.push('<tr class="is-unassigned">'
                + '<td>Вне направлений</td>'
                + '<td class="num gain">' + (unassigned.gain > 0 ? '+' + formatNumber(unassigned.gain) : '0') + '</td>'
                + '<td class="num loss">' + (unassigned.loss > 0 ? '−' + formatNumber(unassigned.loss) : '0') + '</td>'
                + '<td class="num">' + signed(unassigned.net) + '</td>'
                + '</tr>');
        }

        var total = summarize(totalsPeriods(periods, state.range));
        rows.push('<tr class="is-total">'
            + '<td>Итого</td>'
            + '<td class="num gain">+' + formatNumber(total.gain) + '</td>'
            + '<td class="num loss">−' + formatNumber(total.loss) + '</td>'
            + '<td class="num">' + signed(total.net) + '</td>'
            + '</tr>');
        body.innerHTML = rows.join('');

        if (select) {
            select.innerHTML = directions.map(function (direction) {
                return '<option value="' + escapeHtml(direction.id) + '">' + escapeHtml(direction.name) + '</option>';
            }).join('');
            select.value = selected ? selected.id : '';
        }

        var sub = document.getElementById('stats-directions-sub');
        if (sub) {
            sub.textContent = 'Показано ' + periodsCaption(totalsPeriods(periods, state.range))
                + ' за выбранный период.';
        }
        var note = document.getElementById('stats-directions-note');
        if (note) {
            note.textContent = 'Нажмите на направление, чтобы открыть его график. '
                + 'Сумма строк и «вне направлений» сходится с итогом полных месяцев.';
        }
        section.classList.remove('hidden');
        renderDirectionDetail(data, selected, periods);
    }

    function updateRangeLabel(data, periods) {
        var label = document.getElementById('stats-range-label');
        if (label) {
            label.textContent = periods.length + ' из ' + data.periods.length
                + ' периодов · ' + rangeLabel(state.range);
        }
    }

    function renderRangeOptions(data) {
        var select = document.getElementById('stats-range-select');
        if (!select) return;
        var presets = [
            { value: 'all', label: 'Всё время' },
            { value: '24', label: 'Последние 24 мес.' },
            { value: '12', label: 'Последние 12 мес.' },
            { value: '6', label: 'Последние 6 мес.' }
        ];
        var years = {};
        var months = {};
        (data.periods || []).forEach(function (period) {
            var month = String(period.month || '');
            if (!month) return;
            years[month.slice(0, 4)] = true;
            if (!months[month]) {
                months[month] = {
                    value: month,
                    label: (period.label || fullMonthLabel(month)) + (period.partial ? ' (текущий)' : '')
                };
            }
        });
        var monthOptions = Object.keys(months).sort().reverse().map(function (month) {
            return months[month];
        });
        var yearOptions = Object.keys(years).sort().reverse().map(function (year) {
            return { value: year, label: year + ' год' };
        });
        var groups = [
            { label: 'Периоды', options: presets },
            { label: 'Месяцы', options: monthOptions },
            { label: 'Годы', options: yearOptions }
        ];
        var allOptions = presets.concat(monthOptions, yearOptions);
        var valid = false;
        for (var i = 0; i < allOptions.length; i++) {
            if (allOptions[i].value === state.range) valid = true;
        }
        if (!valid) state.range = 'all';
        select.innerHTML = groups.filter(function (group) { return group.options.length; }).map(function (group) {
            return '<optgroup label="' + escapeHtml(group.label) + '">'
                + group.options.map(function (option) {
                    return '<option value="' + escapeHtml(option.value) + '">' + escapeHtml(option.label) + '</option>';
                }).join('')
                + '</optgroup>';
        }).join('');
        select.value = state.range;
    }

    function updateRangeControls() {
        var select = document.getElementById('stats-range-select');
        if (select && select.value !== state.range) select.value = state.range;
        var reset = document.getElementById('stats-month-reset');
        if (reset) reset.classList.toggle('hidden', !isMonthRange(state.range));
    }

    function renderAll() {
        var data = state.data;
        if (!data) return;
        var periods = filterPeriods(data.periods, state.range);
        renderCards(data, periods);
        renderCurrentDirections(data);
        renderTable(periods);
        renderMainChart(periods);
        renderDirections(data, periods);
        renderGroups(data, periods);
        updateRangeLabel(data, periods);
        updateRangeControls();
    }

    function syncUrl() {
        if (!window.history || typeof window.history.replaceState !== 'function') return;
        var params = new URLSearchParams(window.location.search);
        if (state.range === 'all') params.delete('range');
        else params.set('range', state.range);
        if (state.direction) params.set('direction', state.direction);
        else params.delete('direction');
        var query = params.toString();
        var next = window.location.pathname + (query ? '?' + query : '');
        window.history.replaceState(null, '', next);
    }

    function readUrlState() {
        var params = new URLSearchParams(window.location.search);
        state.range = params.get('range') || 'all';
        state.direction = params.get('direction') || null;
    }

    function selectMonth(month) {
        if (!state.data) return;
        state.range = month;
        renderAll();
        syncUrl();
    }

    function resetMonth() {
        if (!state.data) return;
        state.range = 'all';
        renderAll();
        syncUrl();
    }

    function selectDirection(id) {
        if (!state.data) return;
        state.direction = id;
        renderDirections(state.data, filterPeriods(state.data.periods, state.range));
        syncUrl();
        var detail = document.getElementById('stats-direction-detail');
        if (detail && typeof detail.scrollIntoView === 'function') {
            detail.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }

    function savePngDataUrl(dataUrl) {
        var link = document.createElement('a');
        link.download = 'territory-months-' + new Date().toISOString().slice(0, 10) + '.png';
        link.href = dataUrl;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    function savePngCanvas(source) {
        var out = document.createElement('canvas');
        out.width = source.width;
        out.height = source.height;
        var ctx = out.getContext('2d');
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, out.width, out.height);
        ctx.drawImage(source, 0, 0);
        savePngDataUrl(out.toDataURL('image/png'));
    }

    function downloadMainChartPng() {
        var frame = document.getElementById('months');
        if (!frame) return;
        var lib = window.modernScreenshot;
        if (lib && typeof lib.domToPng === 'function') {
            lib.domToPng(frame, {
                backgroundColor: '#ffffff',
                scale: Math.min(2, window.devicePixelRatio || 1),
                font: false,
                filter: function (node) {
                    return node.id !== 'stats-chart-png' && node.id !== 'stats-chart-detail';
                },
                onCloneNode: function (node) {
                    if (node.tagName === 'H2') node.style.whiteSpace = 'nowrap';
                }
            }).then(savePngDataUrl).catch(function (error) {
                console.error('Не удалось сохранить PNG:', error);
                if (charts.main && charts.main.canvas) savePngCanvas(charts.main.canvas);
            });
            return;
        }
        if (charts.main && charts.main.canvas) savePngCanvas(charts.main.canvas);
    }

    function bindEvents() {
        var rangeSelect = document.getElementById('stats-range-select');
        if (rangeSelect) {
            rangeSelect.addEventListener('change', function () {
                state.range = rangeSelect.value;
                renderAll();
                syncUrl();
            });
        }

        var monthReset = document.getElementById('stats-month-reset');
        if (monthReset) {
            monthReset.addEventListener('click', resetMonth);
        }

        var pngButton = document.getElementById('stats-chart-png');
        if (pngButton) {
            pngButton.addEventListener('click', downloadMainChartPng);
        }

        var detailButton = document.getElementById('stats-chart-detail');
        if (detailButton) {
            detailButton.addEventListener('click', function () {
                state.detail = !state.detail;
                detailButton.classList.toggle('is-active', state.detail);
                detailButton.setAttribute('aria-pressed', state.detail ? 'true' : 'false');
                if (state.data) renderMainChart(filterPeriods(state.data.periods, state.range));
            });
        }

        var directionSelect = document.getElementById('stats-direction-select');
        if (directionSelect) {
            directionSelect.addEventListener('change', function () {
                selectDirection(directionSelect.value);
            });
        }

        var tableBody = document.getElementById('stats-table-body');
        if (tableBody) {
            tableBody.addEventListener('click', function (event) {
                var row = event.target.closest ? event.target.closest('tr[data-month]') : null;
                if (row) selectMonth(row.getAttribute('data-month'));
            });
            tableBody.addEventListener('keydown', function (event) {
                if (event.key !== 'Enter' && event.key !== ' ') return;
                var row = event.target.closest ? event.target.closest('tr[data-month]') : null;
                if (!row) return;
                event.preventDefault();
                selectMonth(row.getAttribute('data-month'));
            });
        }

        var directionBody = document.getElementById('stats-directions-body');
        if (directionBody) {
            directionBody.addEventListener('click', function (event) {
                var row = event.target.closest ? event.target.closest('tr[data-direction]') : null;
                if (row) selectDirection(row.getAttribute('data-direction'));
            });
            directionBody.addEventListener('keydown', function (event) {
                if (event.key !== 'Enter' && event.key !== ' ') return;
                var row = event.target.closest ? event.target.closest('tr[data-direction]') : null;
                if (!row) return;
                event.preventDefault();
                selectDirection(row.getAttribute('data-direction'));
            });
        }
    }

    function render(data) {
        var periods = data.periods || [];
        if (!periods.length) throw new Error('В stats.json нет периодов');

        state.data = data;
        readUrlState();
        renderRangeOptions(data);

        var updated = document.getElementById('stats-updated');
        if (updated) {
            updated.textContent = 'Данные на ' + formatDate(data.lastSnapshot)
                + ' · рассчитано ' + formatDateTime(data.generatedAt);
        }

        renderAll();

        var content = document.getElementById('stats-content');
        var empty = document.getElementById('stats-empty');
        if (content) content.classList.remove('hidden');
        if (empty) empty.classList.add('hidden');
    }

    function showEmpty(error) {
        var content = document.getElementById('stats-content');
        var empty = document.getElementById('stats-empty');
        var text = document.getElementById('stats-empty-text');
        if (content) content.classList.add('hidden');
        if (empty) empty.classList.remove('hidden');
        if (text) {
            var message = error && error.message ? error.message : String(error || 'неизвестная ошибка');
            text.innerHTML = 'Не удалось загрузить <code>stats/stats.json</code>. '
                + 'Проверьте, что файл сгенерирован и лежит рядом со страницей. '
                + '<span class="stats-note">' + escapeHtml(message) + '</span>';
        }
    }

    async function loadStats() {
        var response = await fetch('stats/stats.json?ts=' + Date.now(), { cache: 'no-store' });
        if (!response.ok) throw new Error('HTTP ' + response.status);
        return response.json();
    }

    document.addEventListener('DOMContentLoaded', function () {
        bindEvents();
        loadStats()
            .then(function (data) { render(data); })
            .catch(function (error) {
                console.error('Не удалось загрузить статистику:', error);
                showEmpty(error);
            });
    });
})();
