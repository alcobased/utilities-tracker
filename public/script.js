document.addEventListener('DOMContentLoaded', () => {
    // Navigation and section elements
    const navAdd = document.getElementById('nav-add');
    const navView = document.getElementById('nav-view');
    const addSection = document.getElementById('add-reading-section');
    const viewSection = document.getElementById('view-readings-section');

    // Form and table elements
    const form = document.getElementById('reading-form');
    const consumptionTableBody = document.getElementById('readings-body');
    const dateInput = document.getElementById('date-input');

    // --- SPA Navigation --- 
    const showView = (viewId) => {
        document.querySelectorAll('.content-section').forEach(section => {
            section.style.display = 'none';
        });
        document.getElementById(viewId).style.display = 'block';
        navAdd.classList.toggle('active', viewId === 'add-reading-section');
        navView.classList.toggle('active', viewId === 'view-readings-section');
    };

    navAdd.addEventListener('click', (e) => { e.preventDefault(); showView('add-reading-section'); });
    navView.addEventListener('click', (e) => { e.preventDefault(); showView('view-readings-section'); fetchConsumptionData(); });

    // --- Date to Period ID Calculation ---
    const getPeriodIdFromDate = (dateString) => {
        const readingDate = new Date(dateString);
        let consumptionDate = new Date(readingDate.valueOf());
        if (readingDate.getUTCDate() <= 5) {
            consumptionDate.setUTCDate(0);
        }
        const year = consumptionDate.getUTCFullYear();
        const startMonth = (consumptionDate.getUTCMonth() + 1).toString().padStart(2, '0');
        let endMonth = (consumptionDate.getUTCMonth() + 2);
        if (endMonth > 12) endMonth = 1;
        const endMonthStr = endMonth.toString().padStart(2, '0');
        return `${year}/${startMonthStr}-${endMonthStr}`;
    };

    // --- Render consumption data into the table ---
    const renderConsumption = (consumptionData) => {
        consumptionTableBody.innerHTML = ''; // Clear table
        if (consumptionData.length === 0) {
            consumptionTableBody.innerHTML = `<tr><td colspan="6">No consumption data to display. You need at least two consecutive meter readings to calculate consumption.</td></tr>`;
            return;
        }

        consumptionData.forEach(data => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${data.period}</td>
                <td>${data.gas_total.toFixed(2)}</td>
                <td>${data.gas_household2.toFixed(2)}</td>
                <td>${data.gas_household1.toFixed(2)}</td>
                <td>${data.electricity_total.toFixed(2)}</td>
                <td><button class="delete-btn" data-id="${data.period}">Delete Reading</button></td>
            `;
            consumptionTableBody.appendChild(tr);
        });
    };

    // --- Fetch and display calculated consumption data ---
    const fetchConsumptionData = async () => {
        try {
            const response = await fetch('/api/readings');
            if (!response.ok) throw new Error('Failed to fetch consumption data.');
            const data = await response.json();
            renderConsumption(data);
        } catch (error) {
            console.error('Error fetching consumption data:', error);
            consumptionTableBody.innerHTML = `<tr><td colspan="6">Error loading data.</td></tr>`;
        }
    };

    // --- Handle form submission for new meter readings ---
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const dateString = dateInput.value;
        if (!dateString) {
            alert('Please select a date for the meter reading.');
            return;
        }

        const periodId = getPeriodIdFromDate(dateString);
        const metrics = {};
        const gasTotal = document.getElementById('gas-total-input').value;
        const gasHH2 = document.getElementById('gas-hh2-input').value;
        const elecTotal = document.getElementById('electricity-total-input').value;

        if (gasTotal) metrics.gas_total = parseFloat(gasTotal);
        if (gasHH2) metrics.gas_household2 = parseFloat(gasHH2);
        if (elecTotal) metrics.electricity_total = parseFloat(elecTotal);

        if (Object.keys(metrics).length === 0) {
            alert('Please enter at least one meter reading.');
            return;
        }

        try {
            const response = await fetch(`/api/readings/${periodId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(metrics),
            });
            if (!response.ok) throw new Error((await response.json()).error);
            alert(`Meter reading for period ${periodId} saved successfully!`);
            form.reset();
        } catch (error) {
            alert(`Error saving meter reading: ${error.message}`);
        }
    });

    // --- Handle delete button clicks ---
    consumptionTableBody.addEventListener('click', async (e) => {
        if (e.target && e.target.classList.contains('delete-btn')) {
            const periodId = e.target.getAttribute('data-id');
            if (confirm(`This will delete the raw meter reading for period ${periodId}. This may affect the consumption calculation for the next period. Are you sure you want to continue?`)) {
                try {
                    const response = await fetch(`/api/readings/${periodId}`, { method: 'DELETE' });
                    if (!response.ok) throw new Error('Failed to delete reading.');
                    fetchConsumptionData(); // Refresh the consumption view
                } catch (error) {
                    alert(`Failed to delete reading: ${error.message}`);
                }
            }
        }
    });

    // --- Initial Load ---
    showView('add-reading-section'); // Default to the add reading view
});
