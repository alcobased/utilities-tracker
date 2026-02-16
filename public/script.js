document.addEventListener('DOMContentLoaded', async () => {
    // Navigation and section elements
    const navAdd = document.getElementById('nav-add');
    const navView = document.getElementById('nav-view');
    const navSettings = document.getElementById('nav-settings');
    const addSection = document.getElementById('add-reading-section');
    const viewSection = document.getElementById('view-readings-section');
    const settingsSection = document.getElementById('settings-section');

    // Form and table elements
    const form = document.getElementById('reading-form');
    const consumptionTableBody = document.getElementById('readings-body');
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
            'electricity-total-input', 'electricity-hh1-input', 'electricity-hh2-input',
            'gas-total-input', 'gas-hh2-input',
            'water-total-input', 'water-hh2-input'
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
            'electricity-total-input', 'electricity-hh1-input', 'electricity-hh2-input',
            'gas-total-input', 'gas-hh2-input',
            'water-total-input', 'water-hh2-input'
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

        const formatVal = (val) => (val === null || val === undefined) ? '-' : val.toFixed(2);

        consumptionData.forEach(data => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${data.period}</td>
                <td>${formatVal(data.electricity_total)}</td>
                <td>${formatVal(data.electricity_hh1)}</td>
                <td>${formatVal(data.electricity_hh2)}</td>
                <td>${formatVal(data.electricity_common)}</td>
                <td>${formatVal(data.gas_total)}</td>
                <td>${formatVal(data.gas_hh1)}</td>
                <td>${formatVal(data.gas_hh2)}</td>
                <td>${formatVal(data.water_total)}</td>
                <td>${formatVal(data.water_hh1)}</td>
                <td>${formatVal(data.water_hh2)}</td>
                <td><button class="delete-btn" data-id="${data.period}">${t('delete_btn')}</button></td>
            `;
            consumptionTableBody.appendChild(tr);
        });
    };

    const fetchConsumptionData = async () => {
        try {
            const response = await fetch('/api/readings');
            if (!response.ok) throw new Error('Failed to fetch consumption data.');
            const data = await response.json();
            renderConsumption(data);
        } catch (error) {
            console.error('Error fetching consumption data:', error);
            consumptionTableBody.innerHTML = `<tr><td colspan="12">${t('error_loading')}</td></tr>`;
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

    // --- Event Listeners ---

    const showView = (viewId) => {
        document.querySelectorAll('.content-section').forEach(section => {
            section.style.display = 'none';
        });
        document.getElementById(viewId).style.display = 'block';
        navAdd.classList.toggle('active', viewId === 'add-reading-section');
        navView.classList.toggle('active', viewId === 'view-readings-section');
        navSettings.classList.toggle('active', viewId === 'settings-section');
    };

    navAdd.addEventListener('click', (e) => { e.preventDefault(); showView('add-reading-section'); });
    navView.addEventListener('click', (e) => { e.preventDefault(); showView('view-readings-section'); fetchConsumptionData(); });
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
        addMetric('gas-total-input', 'gas_total');
        addMetric('gas-hh2-input', 'gas_hh2');
        addMetric('water-total-input', 'water_total');
        addMetric('water-hh2-input', 'water_hh2');

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
