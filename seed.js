import { initDatabase, upsertReading } from './db.js';

async function seed() {
    const isIncomplete = process.argv.includes('--incomplete');

    console.log(`🌱 Seeding database with mock utility data... ${isIncomplete ? '(Incomplete Mode)' : ''}`);
    await initDatabase();

    const now = new Date();
    // Start 12 months ago
    const start = new Date(now.getFullYear(), now.getMonth() - 12, 1);

    let elecTotal = 10000;
    let elecHH1 = 6000;
    let elecHH2 = 4000;
    let gasTotal = 5000;
    let gasHH2 = 1200;
    let waterTotal = 500;
    let waterHH2 = 120;

    for (let i = 0; i <= 12; i++) {
        const d = new Date(start.getFullYear(), start.getMonth() + i, 1);
        const year = d.getFullYear();
        const month = (d.getMonth() + 1).toString().padStart(2, '0');
        const periodId = `${year}-${month}`;

        // Generate realistic consumption for the month
        const cElecHH1 = 200 + Math.floor(Math.random() * 150);
        const cElecHH2 = 200 + Math.floor(Math.random() * 150);
        // Common is 1-2% of total, so HH1+HH2 is 98-99% of total
        const commonPercent = 0.01 + (Math.random() * 0.01);
        const cElecTotal = Math.round((cElecHH1 + cElecHH2) / (1 - commonPercent));

        elecTotal += cElecTotal;
        elecHH1 += cElecHH1;
        elecHH2 += cElecHH2;

        gasTotal += 30 + Math.floor(Math.random() * 100);
        gasHH2 += 10 + Math.floor(Math.random() * 50);

        waterTotal += 10 + Math.floor(Math.random() * 10);
        waterHH2 += 2 + Math.floor(Math.random() * 5);

        const metrics = {
            electricity_total: elecTotal,
            electricity_hh1: elecHH1,
            electricity_hh2: elecHH2,
            gas_total: gasTotal,
            gas_hh2: gasHH2,
            water_total: waterTotal,
            water_hh2: waterHH2
        };

        // If incomplete mode is on, randomly omit some metrics (30% chance per metric)
        if (isIncomplete) {
            Object.keys(metrics).forEach(key => {
                if (Math.random() < 0.3) {
                    delete metrics[key];
                }
            });

            // Skip the whole period sometimes (15% chance)
            if (Object.keys(metrics).length === 0 || Math.random() < 0.15) {
                console.log(`⚠️ Skipping period ${periodId} (Incomplete Mode)`);
                continue;
            }
        }

        await upsertReading(periodId, metrics);
        console.log(`✅ Saved readings for ${periodId}`);
    }

    console.log('🚀 Seeding complete!');
    process.exit(0);
}

seed().catch(err => {
    console.error('❌ Seeding failed:', err);
    process.exit(1);
});
