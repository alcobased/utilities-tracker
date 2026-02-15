document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('reading-form');
    const readingsBody = document.getElementById('readings-body');
    const dateInput = document.getElementById('date-input');

    // --- Helper Function to Generate Period ID ---
    const getPeriodIdFromDate = (dateString) => {
        const readingDate = new Date(dateString);
        let consumptionDate = new Date(readingDate.valueOf());
        const dayOfMonth = readingDate.getUTCDate();

        const gracePeriodDays = 5;
        if (dayOfMonth <= gracePeriodDays) {
            consumptionDate.setUTCDate(0); // Go to last day of previous month
        }

        const year = consumptionDate.getUTCFullYear();
        const startMonth = consumptionDate.getUTCMonth() + 1;
        let endMonth = startMonth + 1;
        if (endMonth > 12) endMonth = 1;

        const startMonthStr = startMonth.toString().padStart(2, '0');
        const endMonthStr = endMonth.toString().padStart(2, '0');
        return `${year}/${startMonthStr}-${endMonthStr}`;
    };

    // --- Renders data into the table ---
    const renderReadings = (readings) => {
        readingsBody.innerHTML = ''; // Clear table

        // Sort by period ID descending
        readings.sort((a, b) => b.id.localeCompare(a.id));

        readings.forEach(reading => {
            const tr = document.createElement('tr');
            // Use a helper to safely get values, showing 'N/A' if not present
            const getValue = (metric) => metric?.value ?? 'N/A';

            tr.innerHTML = `
                <td>${reading.id}</td>
                <td>${getValue(reading.gas_total)}</td>
                <td>${getValue(reading.gas_household2)}</td>
                <td>${reading.gas_household1.toFixed(2)}</td>
                <td>${getValue(reading.electricity_total)}</td>
                <td><button class="delete-btn" data-id="${reading.id}">Delete</button></td>
            `;
            readingsBody.appendChild(tr);
        });
    };

    // --- Fetch and display existing readings ---
    const fetchReadings = async () => {
        try {
            const response = await fetch('/api/readings');
            const readings = await response.json();
            renderReadings(readings);
        } catch (error) {
            console.error('Failed to fetch readings:', error);
        }
    };

    // --- Handle form submission for upserting readings ---
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const dateString = dateInput.value;
        if (!dateString) {
            alert('Please select a date to define the period.');
            return;
        }

        const periodId = getPeriodIdFromDate(dateString);

        // Collect all metrics that have a value
        const metrics = {};
        const gasTotal = document.getElementById('gas-total-input').value;
        const gasHH2 = document.getElementById('gas-hh2-input').value;
        const elecTotal = document.getElementById('electricity-total-input').value;

        if (gasTotal) metrics.gas_total = parseFloat(gasTotal);
        if (gasHH2) metrics.gas_household2 = parseFloat(gasHH2);
        if (elecTotal) metrics.electricity_total = parseFloat(elecTotal);

        if (Object.keys(metrics).length === 0) {
            alert('Please enter at least one reading value.');
            return;
        }

        try {
            const response = await fetch(`/api/readings/${periodId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(metrics),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error);
            }

            fetchReadings(); // Refresh the table
            form.reset(); // Clear the form inputs
        } catch (error) {
            alert(`Error saving readings: ${error.message}`);
        }
    });

    // --- Handle delete button clicks ---
    readingsBody.addEventListener('click', async (e) => {
        if (e.target && e.target.classList.contains('delete-btn')) {
            const periodId = e.target.getAttribute('data-id');
            if (confirm(`Are you sure you want to delete all readings for period ${periodId}?`)) {
                try {
                    await fetch(`/api/readings/${periodId}`, {
                        method: 'DELETE',
                    });
                    fetchReadings(); // Refresh the table
                } catch (error) {
                    alert('Failed to delete reading.');
                }
            }
        }
    });

    // --- Initial Load ---
    fetchReadings();
});
