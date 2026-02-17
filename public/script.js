document.addEventListener('DOMContentLoaded', async () => {
    // Navigation and section elements
    const navAdd = document.getElementById('nav-add');
    const navRaw = document.getElementById('nav-raw');
    const navView = document.getElementById('nav-view');
    const navSplits = document.getElementById('nav-splits');
    const navSettings = document.getElementById('nav-settings');
    const addSection = document.getElementById('add-reading-section');
    const rawSection = document.getElementById('raw-readings-section');
    const viewSection = document.getElementById('view-readings-section');
    const splitsSection = document.getElementById('bill-splits-section');
    const settingsSection = document.getElementById('settings-section');

    // Form and table elements
    const form = document.getElementById('reading-form');
    const rawTableBody = document.getElementById('raw-readings-body');
    const consumptionTableBody = document.getElementById('readings-body');
    const billSplitsBody = document.getElementById('bill-splits-body');
    const yearSelect = document.getElementById('year-select');
    const monthSelect = document.getElementById('month-select');
    const updateStatus = document.getElementById('update-status');
    const submitBtn = form.querySelector('button[type="submit"]');

    // Settings elements
    const languageSelect = document.getElementById('language-select');
    const saveSettingsBtn = document.getElementById('save-settings-btn');

    // --- Translations ---

    let currentLang = 'en';

    const t = (key, params = {}) => {
        let text = translations[currentLang][key] || key;
        Object.keys(params).forEach(p => {
            text = text.replace(`{${p}}`, params[p]);
        });
        return text;
    };

    const updateUI = () => {
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            el.textContent = t(key);
        });

        // Update month names in select
        const months = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];
        const monthKeys = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];

        months.forEach((m, i) => {
            const opt = monthSelect.querySelector(`option[value="${m}"]`);
            if (opt) opt.textContent = t(monthKeys[i]);
        });

        // Update button text based on mode
        const isUpdate = updateStatus.textContent !== '';
        submitBtn.textContent = isUpdate ? t('update_btn') : t('save_btn');
        if (isUpdate) updateStatus.textContent = t('updating_existing');
    };

    // --- Helper Functions ---

    const getPeriodIdFromSelectors = () => {
        const year = yearSelect.value;
        const month = monthSelect.value;
        return `${year}-${month}`;
    };

    const updateFormWithReading = (reading) => {
        const fields = [
            'electricity-total-input', 'electricity-hh1-input', 'electricity-hh2-input', 'electricity-bill-input',
            'gas-total-input', 'gas-hh2-input', 'gas-bill-input',
            'water-total-input', 'water-hh2-input', 'water-bill-input'
        ];

        fields.forEach(fieldId => {
            const input = document.getElementById(fieldId);
            const metricKey = fieldId.replace('-input', '').replace(/-/g, '_');
            if (reading[metricKey]) {
                input.value = reading[metricKey].value;
            } else {
                input.value = '';
            }
        });
    };

    const clearMetricFields = () => {
        const fields = [
            'electricity-total-input', 'electricity-hh1-input', 'electricity-hh2-input', 'electricity-bill-input',
            'gas-total-input', 'gas-hh2-input', 'gas-bill-input',
            'water-total-input', 'water-hh2-input', 'water-bill-input'
        ];
        fields.forEach(fieldId => {
            const el = document.getElementById(fieldId);
            if (el) el.value = '';
        });
    };

    const checkExistingReading = async () => {
        const periodId = getPeriodIdFromSelectors();
        try {
            const response = await fetch(`/api/readings/${periodId}`);
            if (response.ok) {
                const reading = await response.json();
                updateFormWithReading(reading);
                updateStatus.textContent = t('updating_existing');
                updateStatus.className = 'badge update';
                submitBtn.textContent = t('update_btn');
            } else {
                clearMetricFields();
                updateStatus.textContent = '';
                updateStatus.className = 'badge';
                submitBtn.textContent = t('save_btn');
            }
        } catch (error) {
            console.error('Error checking existing reading:', error);
        }
    };

    const renderConsumption = (consumptionData) => {
        consumptionTableBody.innerHTML = '';
        if (consumptionData.length === 0) {
            consumptionTableBody.innerHTML = `<tr><td colspan="12">${t('no_data')}</td></tr>`;
            return;
        }

        const formatVal = (val) => (val === null || val === undefined) ? '-' : Math.round(val).toString();

        const getTooltip = (period, name, subName, unit, calcType) => {
            let text = `${t(name)} - ${t(subName)} (${unit})`;
            text += `\n${t('period')}: ${period}`;
            text += `\n${t('calculation')}: `;

            if (calcType === 'delta') {
                text += t('calc_delta');
            } else if (calcType === 'elec_common') {
                text += t('calc_sub_elec');
            } else if (calcType === 'other_common') { // Using 'other_common' for consistency with i18n key 'calc_sub_other'
                text += t('calc_sub_other');
            }
            return text;
        };

        consumptionData.forEach(data => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td class="sticky-column" data-tooltip="${t('period')}: ${data.period}">${data.period}</td>
                <td class="theme-electricity" data-tooltip="${getTooltip(data.period, 'electricity', 'total', 'kWh', 'delta')}">${formatVal(data.electricity_total)}</td>
                <td class="theme-electricity" data-tooltip="${getTooltip(data.period, 'electricity', 'hh1', 'kWh', 'delta')}">${formatVal(data.electricity_hh1)}</td>
                <td class="theme-electricity" data-tooltip="${getTooltip(data.period, 'electricity', 'hh2', 'kWh', 'delta')}">${formatVal(data.electricity_hh2)}</td>
                <td class="theme-electricity" data-tooltip="${getTooltip(data.period, 'electricity', 'common', 'kWh', 'elec_common')}">${formatVal(data.electricity_common)}</td>
                <td class="theme-gas" data-tooltip="${getTooltip(data.period, 'gas', 'total', 'm³', 'delta')}">${formatVal(data.gas_total)}</td>
                <td class="theme-gas" data-tooltip="${getTooltip(data.period, 'gas', 'hh1', 'm³', 'other_common')}">${formatVal(data.gas_hh1)}</td>
                <td class="theme-gas" data-tooltip="${getTooltip(data.period, 'gas', 'hh2', 'm³', 'delta')}">${formatVal(data.gas_hh2)}</td>
                <td class="theme-water" data-tooltip="${getTooltip(data.period, 'water', 'total', 'm³', 'delta')}">${formatVal(data.water_total)}</td>
                <td class="theme-water" data-tooltip="${getTooltip(data.period, 'water', 'hh1', 'm³', 'other_common')}">${formatVal(data.water_child || data.water_hh1)}</td>
                <td class="theme-water" data-tooltip="${getTooltip(data.period, 'water', 'hh2', 'm³', 'delta')}">${formatVal(data.water_hh2)}</td>
                <td><button class="delete-btn" data-id="${data.period}">${t('delete_btn')}</button></td>
            `;
            consumptionTableBody.appendChild(tr);
        });
    };

    const renderBillSplits = (consumptionData) => {
        billSplitsBody.innerHTML = '';
        if (consumptionData.length === 0) {
            billSplitsBody.innerHTML = `<tr><td colspan="10">${t('no_data')}</td></tr>`;
            return;
        }

        const formatVal = (val) => (val === null || val === undefined) ? '-' : val.toFixed(2);

        const getTooltip = (period, name, subName, calcType) => {
            let text = `${t(name)}`;
            if (subName) text += ` - ${t(subName)}`;
            text += ` (€)`;
            text += `\n${t('period')}: ${period}`;
            text += `\n${t('calculation')}: `;

            if (calcType === 'prev') text += t('calc_share_prev');
            else if (calcType === 'curr') text += t('calc_share_curr');
            else if (calcType === 'sum_hh') text += t('calc_sum_hh');
            else if (calcType === 'sum_grand') text += t('calc_sum_grand');
            else if (calcType === 'sum_sub') text += t('calc_sum_sub');

            return text;
        };

        consumptionData.forEach(data => {
            const tr = document.createElement('tr');

            const elecHH1 = data.electricity_cost_hh1 || 0;
            const elecHH2 = data.electricity_cost_hh2 || 0;
            const elecTotal = elecHH1 + elecHH2;

            const gasHH1 = data.gas_cost_hh1 || 0;
            const gasHH2 = data.gas_cost_hh2 || 0;
            const gasTotal = gasHH1 + gasHH2;

            const waterHH1 = data.water_cost_hh1 || 0;
            const waterHH2 = data.water_cost_hh2 || 0;
            const waterTotal = waterHH1 + waterHH2;

            const totalHH1 = elecHH1 + gasHH1 + waterHH1;
            const totalHH2 = elecHH2 + gasHH2 + waterHH2;
            const grandTotal = totalHH1 + totalHH2;

            tr.innerHTML = `
                <td class="sticky-column" data-tooltip="${t('period')}: ${data.period}">${data.period}</td>
                <td class="theme-electricity" data-tooltip="${getTooltip(data.period, 'electricity', 'hh1', 'prev')}">${formatVal(elecHH1)}</td>
                <td class="theme-electricity" data-tooltip="${getTooltip(data.period, 'electricity', 'hh2', 'prev')}">${formatVal(elecHH2)}</td>
                <td class="theme-electricity" data-tooltip="${getTooltip(data.period, 'electricity', 'total', 'sum_sub')}"><strong>${formatVal(elecTotal)}</strong></td>
                <td class="theme-gas" data-tooltip="${getTooltip(data.period, 'gas', 'hh1', 'curr')}">${formatVal(gasHH1)}</td>
                <td class="theme-gas" data-tooltip="${getTooltip(data.period, 'gas', 'hh2', 'curr')}">${formatVal(gasHH2)}</td>
                <td class="theme-gas" data-tooltip="${getTooltip(data.period, 'gas', 'total', 'sum_sub')}"><strong>${formatVal(gasTotal)}</strong></td>
                <td class="theme-water" data-tooltip="${getTooltip(data.period, 'water', 'hh1', 'prev')}">${formatVal(waterHH1)}</td>
                <td class="theme-water" data-tooltip="${getTooltip(data.period, 'water', 'hh2', 'prev')}">${formatVal(waterHH2)}</td>
                <td class="theme-water" data-tooltip="${getTooltip(data.period, 'water', 'total', 'sum_sub')}"><strong>${formatVal(waterTotal)}</strong></td>
                <td class="hh-total" data-tooltip="${getTooltip(data.period, 'hh1', 'total', 'sum_hh')}"><strong>${formatVal(totalHH1)}</strong></td>
                <td class="hh-total" data-tooltip="${getTooltip(data.period, 'hh2', 'total', 'sum_hh')}"><strong>${formatVal(totalHH2)}</strong></td>
                <td class="grand-total" data-tooltip="${getTooltip(data.period, 'grand_total', '', 'sum_grand')}"><strong>${formatVal(grandTotal)}</strong></td>
            `;
            billSplitsBody.appendChild(tr);
        });
    };

    const renderRawReadings = (rawReadings) => {
        rawTableBody.innerHTML = '';
        if (rawReadings.length === 0) {
            rawTableBody.innerHTML = `<tr><td colspan="9">${t('no_data')}</td></tr>`;
            return;
        }


        rawReadings.forEach(data => {
            const tr = document.createElement('tr');

            // Helper to extract value safely
            const getVal = (obj) => (obj && obj.value !== undefined && obj.value !== null) ? obj.value : null;

            const formatReading = (obj) => {
                const val = getVal(obj);
                return val === null ? '-' : Math.round(val).toString();
            };

            const formatBill = (obj) => {
                const val = getVal(obj);
                return val === null ? '-' : val.toFixed(2);
            };

            const getTooltip = (label, obj) => {
                let text = label;
                text += `\n${t('period')}: ${data.id}`;
                if (obj && obj.updatedAt) {
                    text += `\n${t('updated')}: ${new Date(obj.updatedAt).toISOString().replace('T', ' ').substring(0, 19)}`;
                }
                return text;
            };

            tr.innerHTML = `
                <td class="sticky-column" data-tooltip="${t('period')}: ${data.id}">${data.id}</td>
                <td class="theme-electricity" data-tooltip="${getTooltip(`${t('electricity')} - ${t('total')} (kWh)`, data.electricity_total)}">${formatReading(data.electricity_total)}</td>
                <td class="theme-electricity" data-tooltip="${getTooltip(`${t('electricity')} - ${t('hh1')} (kWh)`, data.electricity_hh1)}">${formatReading(data.electricity_hh1)}</td>
                <td class="theme-electricity" data-tooltip="${getTooltip(`${t('electricity')} - ${t('hh2')} (kWh)`, data.electricity_hh2)}">${formatReading(data.electricity_hh2)}</td>
                <td class="theme-electricity" data-tooltip="${getTooltip(`${t('electricity')} - ${t('bill')} (€)`, data.electricity_bill)}">${formatBill(data.electricity_bill)}</td>
                <td class="theme-gas" data-tooltip="${getTooltip(`${t('gas')} - ${t('total')} (m³)`, data.gas_total)}">${formatReading(data.gas_total)}</td>
                <td class="theme-gas" data-tooltip="${getTooltip(`${t('gas')} - ${t('hh2')} (m³)`, data.gas_hh2)}">${formatReading(data.gas_hh2)}</td>
                <td class="theme-gas" data-tooltip="${getTooltip(`${t('gas')} - ${t('bill')} (€)`, data.gas_bill)}">${formatBill(data.gas_bill)}</td>
                <td class="theme-water" data-tooltip="${getTooltip(`${t('water')} - ${t('total')} (m³)`, data.water_total)}">${formatReading(data.water_total)}</td>
                <td class="theme-water" data-tooltip="${getTooltip(`${t('water')} - ${t('hh2')} (m³)`, data.water_hh2)}">${formatReading(data.water_hh2)}</td>
                <td class="theme-water" data-tooltip="${getTooltip(`${t('water')} - ${t('bill')} (€)`, data.water_bill)}">${formatBill(data.water_bill)}</td>
                <td><button class="delete-btn" data-id="${data.id}">${t('delete_btn')}</button></td>
            `;
            rawTableBody.appendChild(tr);
        });
    };

    const fetchRawReadings = async () => {
        try {
            const response = await fetch('/api/raw-readings');
            if (!response.ok) throw new Error('Failed to fetch raw readings.');
            const data = await response.json();
            renderRawReadings(data);
        } catch (error) {
            console.error('Error fetching raw readings:', error);
            rawTableBody.innerHTML = `<tr><td colspan="9">${t('error_loading')}</td></tr>`;
        }
    };

    const fetchConsumptionData = async () => {
        try {
            const response = await fetch('/api/readings');
            if (!response.ok) throw new Error('Failed to fetch consumption data.');
            const data = await response.json();
            renderConsumption(data);
            renderBillSplits(data);
        } catch (error) {
            console.error('Error fetching consumption data:', error);
            consumptionTableBody.innerHTML = `<tr><td colspan="12">${t('error_loading')}</td></tr>`;
            billSplitsBody.innerHTML = `<tr><td colspan="8">${t('error_loading')}</td></tr>`;
        }
    };

    const fetchSettings = async () => {
        try {
            const response = await fetch('/api/settings');
            const settings = await response.json();
            if (settings.language) {
                currentLang = settings.language;
                languageSelect.value = currentLang;
                updateUI();
            }
        } catch (error) {
            console.error('Error fetching settings:', error);
        }
    };

    // --- Initialize Selectors ---
    const currentYear = new Date().getFullYear();
    const currentMonth = (new Date().getMonth() + 1).toString().padStart(2, '0');

    for (let y = 2024; y <= currentYear + 1; y++) {
        const option = document.createElement('option');
        option.value = y;
        option.textContent = y;
        if (y === currentYear) option.selected = true;
        yearSelect.appendChild(option);
    }
    monthSelect.value = currentMonth;
    checkExistingReading();

    // --- Tooltip Logic ---
    const tooltip = document.createElement('div');
    tooltip.className = 'custom-tooltip';
    document.body.appendChild(tooltip);

    let tooltipTimeout;

    document.addEventListener('mouseover', (e) => {
        const target = e.target.closest('[data-tooltip]');
        if (target) {
            clearTimeout(tooltipTimeout);
            tooltip.textContent = target.getAttribute('data-tooltip');
            tooltip.classList.add('visible');

            const rect = target.getBoundingClientRect();
            // Position above the element, centered horizontally
            tooltip.style.left = `${rect.left + rect.width / 2}px`;
            tooltip.style.top = `${rect.top + window.scrollY}px`; // Adjust if needed based on CSS transform

            // Adjust for edges (optional, simple logic first)
        }
    });

    document.addEventListener('mouseout', (e) => {
        const target = e.target.closest('[data-tooltip]');
        if (target) {
            tooltipTimeout = setTimeout(() => {
                tooltip.classList.remove('visible');
            }, 50);
        }
    });

    // Optional: Follow mouse for smoother feel on large cells? 
    // Or stick to element-based positioning which is cleaner for tables.
    // Let's stick to element-based for now as it's less jumpy.

    // --- Event Listeners ---
    const menuToggle = document.getElementById('menu-toggle');
    const navLinks = document.getElementById('nav-links');

    if (menuToggle && navLinks) {
        menuToggle.addEventListener('click', () => {
            navLinks.classList.toggle('show');
        });
    }

    const showView = (viewId) => {
        document.querySelectorAll('.content-section').forEach(section => {
            section.style.display = 'none';
        });
        document.getElementById(viewId).style.display = 'block';
        navAdd.classList.toggle('active', viewId === 'add-reading-section');
        navRaw.classList.toggle('active', viewId === 'raw-readings-section');
        navView.classList.toggle('active', viewId === 'view-readings-section');
        navSplits.classList.toggle('active', viewId === 'bill-splits-section');
        navSettings.classList.toggle('active', viewId === 'settings-section');

        // Close mobile menu after clicking a link
        if (navLinks) navLinks.classList.remove('show');
    };

    navAdd.addEventListener('click', (e) => { e.preventDefault(); showView('add-reading-section'); });
    navRaw.addEventListener('click', (e) => { e.preventDefault(); showView('raw-readings-section'); fetchRawReadings(); });
    navView.addEventListener('click', (e) => { e.preventDefault(); showView('view-readings-section'); fetchConsumptionData(); });
    navSplits.addEventListener('click', (e) => { e.preventDefault(); showView('bill-splits-section'); fetchConsumptionData(); });
    navSettings.addEventListener('click', (e) => { e.preventDefault(); showView('settings-section'); });

    yearSelect.addEventListener('change', checkExistingReading);
    monthSelect.addEventListener('change', checkExistingReading);

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const periodId = getPeriodIdFromSelectors();
        const metrics = {};

        const addMetric = (id, key) => {
            const val = document.getElementById(id).value;
            if (val) metrics[key] = parseFloat(val);
        };

        addMetric('electricity-total-input', 'electricity_total');
        addMetric('electricity-hh1-input', 'electricity_hh1');
        addMetric('electricity-hh2-input', 'electricity_hh2');
        addMetric('electricity-bill-input', 'electricity_bill');
        addMetric('gas-total-input', 'gas_total');
        addMetric('gas-hh2-input', 'gas_hh2');
        addMetric('gas-bill-input', 'gas_bill');
        addMetric('water-total-input', 'water_total');
        addMetric('water-hh2-input', 'water_hh2');
        addMetric('water-bill-input', 'water_bill');

        if (Object.keys(metrics).length === 0) {
            alert(t('enter_at_least_one'));
            return;
        }

        try {
            const response = await fetch(`/api/readings/${periodId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(metrics),
            });
            if (!response.ok) throw new Error((await response.json()).error);
            alert(t('save_success', { periodId }));
            await checkExistingReading();
        } catch (error) {
            alert(t('save_error', { message: error.message }));
        }
    });

    consumptionTableBody.addEventListener('click', async (e) => {
        if (e.target && e.target.classList.contains('delete-btn')) {
            const periodId = e.target.getAttribute('data-id');
            if (confirm(t('delete_confirm', { periodId }))) {
                try {
                    const response = await fetch(`/api/readings/${periodId}`, { method: 'DELETE' });
                    if (!response.ok) throw new Error('Failed to delete reading.');
                    fetchConsumptionData();
                } catch (error) {
                    alert(t('delete_error', { message: error.message }));
                }
            }
        }
    });

    rawTableBody.addEventListener('click', async (e) => {
        if (e.target && e.target.classList.contains('delete-btn')) {
            const periodId = e.target.getAttribute('data-id');
            if (confirm(t('delete_confirm', { periodId }))) {
                try {
                    const response = await fetch(`/api/readings/${periodId}`, { method: 'DELETE' });
                    if (!response.ok) throw new Error('Failed to delete reading.');
                    fetchRawReadings();
                } catch (error) {
                    alert(t('delete_error', { message: error.message }));
                }
            }
        }
    });

    saveSettingsBtn.addEventListener('click', async () => {
        const lang = languageSelect.value;
        try {
            const response = await fetch('/api/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ language: lang }),
            });
            if (!response.ok) throw new Error('Failed to save settings');
            currentLang = lang;
            updateUI();
            alert(t('settings_saved'));
        } catch (error) {
            alert(t('settings_error', { message: error.message }));
        }
    });

    // Initial check and load
    await fetchSettings();
    showView('add-reading-section');
    checkExistingReading();
});
