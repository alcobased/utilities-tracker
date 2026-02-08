document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('reading-form');
    const readingsList = document.getElementById('readings-list');

    // Fetch and display existing readings
    const fetchReadings = async () => {
        const response = await fetch('/api/readings');
        const readings = await response.json();

        readingsList.innerHTML = ''; // Clear the list

        readings.forEach(reading => {
            const li = document.createElement('li');
            li.innerHTML = `
                <span>
                    <strong>${reading.type.charAt(0).toUpperCase() + reading.type.slice(1)}:</strong> 
                    ${reading.value} - <em>${new Date(reading.date).toLocaleDateString()}</em>
                </span>
                <button class="delete-btn" data-id="${reading.id}">Delete</button>`;
            readingsList.appendChild(li);
        });
    };

    // Handle form submission
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const newReading = {
            type: form.type.value,
            value: parseFloat(form.value.value),
            date: form.date.value
        };

        await fetch('/api/readings', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(newReading)
        });

        form.reset();
        fetchReadings();
    });

    // Handle delete button clicks
    readingsList.addEventListener('click', async (e) => {
        if (e.target.classList.contains('delete-btn')) {
            const id = e.target.dataset.id;
            await fetch(`/api/readings/${id}`, {
                method: 'DELETE'
            });
            fetchReadings();
        }
    });

    // Initial fetch
    fetchReadings();
});
