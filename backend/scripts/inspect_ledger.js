const { Client } = require('pg');
(async () => {
  const client = new Client({ connectionString: process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/txsim' });
  await client.connect();
  try {
    const cols = await client.query("SELECT column_name, ordinal_position, data_type, is_nullable, column_default FROM information_schema.columns WHERE table_name='ledger_entries' ORDER BY ordinal_position");
    console.log('COLUMNS:', JSON.stringify(cols.rows, null, 2));
    const cons = await client.query("SELECT conname, pg_get_constraintdef(oid) as def FROM pg_constraint WHERE conrelid = 'ledger_entries'::regclass");
    console.log('CONSTRAINTS:', JSON.stringify(cons.rows, null, 2));
  } catch (err) {
    console.error('ERROR', err);
    process.exitCode = 2;
  } finally {
    await client.end();
  }
})();