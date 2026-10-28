/*
 * Публичная страница статистики.
 * Только читает stats/stats.json и рисует сводку, график и таблицу.
 * Никакой геометрии здесь нет — она считается отдельно.
 */
(function () {
    'use strict';

    var MONTHS_SHORT = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
    var numberFormat = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 1 });
    var chart = null;

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

    function card(label, value, sub, valueClassOverride) {
        var cls = valueClassOverride || valueClass(value);
        return '<article class="stats-card ' + cardClass(value) + '">'
            + '<span class="stats-card-label">' + escapeHtml(label) + '</span>'
            + '<span class="stats-card-value ' + cls + '">' + escapeHtml(signed(value)) + '</span>'
            + '<span class="stats-card-sub">' + sub + '</span>'
            + '</article>';
    }

    function renderCards(data) {
        var periods = data.periods || [];
        if (!periods.length) return;
        var latest = periods[periods.length - 1];
        var fullPeriods = periods.filter(function (period) { return !period.partial; });
        var lastFull = fullPeriods.length ? fullPeriods[fullPeriods.length - 1] : latest;
        var fullDays = fullPeriods.reduce(function (sum, period) { return sum + (Number(period.days) || 0); }, 0);
        var fullNet = fullPeriods.reduce(function (sum, period) { return sum + (Number(period.net) || 0); }, 0);
        var fullTotals = data.fullTotals || data.totals || { gain: 0, loss: 0, net: fullNet };
        var averageRate = fullDays > 0 ? fullNet / fullDays : 0;

        var cards = [];

        if (latest.partial) {
            cards.push(card(
                'Текущий период',
                latest.net,
                formatDate(latest.from) + ' — ' + formatDate(latest.to)
                    + ' · ' + latest.days + ' дн. · темп ' + signed(latest.rate) + ' км²/день'
            ));
        } else {
            cards.push(card(
                'Последний месяц',
                latest.net,
                latest.label + ' · ' + formatDate(latest.from) + ' — ' + formatDate(latest.to)
            ));
        }

        if (latest.partial && lastFull) {
            cards.push(card(
                'Последний полный месяц',
                lastFull.net,
                lastFull.label + ' · прирост +' + formatNumber(lastFull.gain)
                    + ' / уменьшение −' + formatNumber(lastFull.loss)
            ));
        } else {
            cards.push(card(
                'Средний темп',
                averageRate,
                'км²/день за ' + fullPeriods.length + ' полн. мес.'
            ));
        }

        cards.push(card(
            'Суммарно за всё время',
            fullTotals.net,
            fullPeriods.length + ' полн. мес. · прирост +' + formatNumber(fullTotals.gain)
                + ' / уменьшение −' + formatNumber(fullTotals.loss)
        ));

        if (latest.partial) {
            cards.push(card(
                'Средний темп',
                averageRate,
                'км²/день за ' + fullPeriods.length + ' полн. мес.'
            ));
        }

        document.getElementById('stats-cards').innerHTML = cards.join('');
    }

    function renderTable(data) {
        var periods = (data.periods || []).slice().reverse();
        var body = document.getElementById('stats-table-body');
        var rows = periods.map(function (period) {
            var gain = Number(period.gain) || 0;
            var loss = Number(period.loss) || 0;
            var net = Number(period.net) || 0;
            var badge = period.partial ? '<span class="stats-badge">текущий</span>' : '';
            var netClass = net > 0 ? 'net-pos' : net < 0 ? 'net-neg' : 'muted';
            return '<tr class="' + (period.partial ? 'is-partial' : '') + '">'
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
            note.textContent = 'Не вошли в таблицу микрополигоны меньше '
                + formatNumber(data.source ? data.source.thresholdKm2 : 0.5)
                + ' км²: прирост +' + formatNumber(microGain)
                + ', уменьшение −' + formatNumber(microLoss) + ' км².';
        }
    }

    function renderDirections(data) {
        var section = document.getElementById('stats-directions');
        var body = document.getElementById('stats-directions-body');
        var note = document.getElementById('stats-directions-note');
        var directions = data.directions || [];
        if (!section || !body) return;
        if (!directions.length) {
            section.classList.add('hidden');
            return;
        }

        function money(value, sign) {
            var number = Number(value) || 0;
            if (number <= 0) return '0';
            return (sign === 'loss' ? '−' : '+') + formatNumber(number);
        }

        var rows = directions.map(function (direction) {
            var totals = direction.fullTotals || direction.totals || {};
            var net = Number(totals.net) || 0;
            var netClass = net > 0 ? 'net-pos' : net < 0 ? 'net-neg' : 'muted';
            return '<tr>'
                + '<td>' + escapeHtml(direction.name) + '</td>'
                + '<td class="num gain">' + money(totals.gain, 'gain') + '</td>'
                + '<td class="num loss">' + money(totals.loss, 'loss') + '</td>'
                + '<td class="num ' + netClass + '">' + escapeHtml(signed(net)) + '</td>'
                + '</tr>';
        });

        var unassigned = data.unassigned && (data.unassigned.fullTotals || data.unassigned.totals);
        if (unassigned) {
            var unassignedNet = Number(unassigned.net) || 0;
            rows.push('<tr class="is-unassigned">'
                + '<td>Вне направлений</td>'
                + '<td class="num gain">' + money(unassigned.gain, 'gain') + '</td>'
                + '<td class="num loss">' + money(unassigned.loss, 'loss') + '</td>'
                + '<td class="num ' + (unassignedNet > 0 ? 'net-pos' : unassignedNet < 0 ? 'net-neg' : 'muted') + '">'
                + escapeHtml(signed(unassignedNet)) + '</td>'
                + '</tr>');
        }

        body.innerHTML = rows.join('');
        if (note) {
            note.innerHTML = 'Границы направлений: области и секторы вокруг опорных пунктов.'
                + ' Файл: <a href="kml/PermanentObjects/Directions.kml">Directions.kml</a>.'
                + ' Сумма прироста и уменьшения по строкам сходится с общим итогом полных месяцев.';
        }
        section.classList.remove('hidden');
    }

    function renderChart(data) {
        var canvas = document.getElementById('monthly-chart');
        var wrap = canvas ? canvas.closest('.stats-chart-wrap') : null;
        var fallback = document.getElementById('stats-chart-fallback');
        if (typeof Chart === 'undefined') {
            if (wrap) wrap.classList.add('hidden');
            if (fallback) fallback.classList.remove('hidden');
            return;
        }

        var periods = data.periods || [];
        var labels = periods.map(function (period) {
            return shortMonth(period.month) + (period.partial ? '*' : '');
        });
        var gains = periods.map(function (period) { return Number(period.gain) || 0; });
        var losses = periods.map(function (period) { return -(Number(period.loss) || 0); });
        var nets = periods.map(function (period) { return Number(period.net) || 0; });

        var gainColors = periods.map(function (period) {
            return period.partial ? 'rgba(224, 27, 11, 0.35)' : 'rgba(224, 27, 11, 0.82)';
        });
        var lossColors = periods.map(function (period) {
            return period.partial ? 'rgba(47, 99, 184, 0.30)' : 'rgba(47, 99, 184, 0.78)';
        });

        var sub = document.getElementById('stats-chart-sub');
        if (sub) sub.textContent = 'Прирост — выше нуля, уменьшение — ниже нуля, линия — нетто. * — неполный месяц.';

        if (chart) {
            chart.destroy();
            chart = null;
        }

        chart = new Chart(canvas.getContext('2d'), {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    {
                        type: 'line',
                        label: 'Нетто',
                        data: nets,
                        borderColor: '#1f2328',
                        backgroundColor: '#1f2328',
                        borderWidth: 2,
                        pointRadius: 2,
                        pointHoverRadius: 4,
                        tension: 0.25,
                        order: 2
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
                    legend: {
                        display: false
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

    function render(data) {
        var periods = data.periods || [];
        if (!periods.length) throw new Error('В stats.json нет периодов');

        var updated = document.getElementById('stats-updated');
        if (updated) {
            updated.textContent = 'Данные на ' + formatDate(data.lastSnapshot)
                + ' · рассчитано ' + formatDateTime(data.generatedAt);
        }

        var threshold = document.getElementById('stats-threshold');
        if (threshold) {
            var value = data.source && data.source.thresholdKm2 != null ? data.source.thresholdKm2 : 0.5;
            threshold.textContent = formatNumber(value);
        }

        var sourceNote = document.getElementById('stats-source-note');
        if (sourceNote) {
            sourceNote.textContent = 'Срезов: ' + data.snapshotCount
                + ' · ' + formatDate(data.firstSnapshot) + ' — ' + formatDate(data.lastSnapshot)
                + '. Пересчёт выполняется отдельно, страница только читает готовый JSON.';
        }

        renderCards(data);
        renderTable(data);
        renderDirections(data);
        renderChart(data);

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
        loadStats()
            .then(function (data) { render(data); })
            .catch(function (error) {
                console.error('Не удалось загрузить статистику:', error);
                showEmpty(error);
            });
    });
})();
